/**
 * AgroMarket Phase 3.17: Background Jobs Data Access Layer
 * Supports Supabase database operations via RPC with resilient in-memory stores for unit testing.
 *
 * SAFETY INVARIANTS:
 * - Atomic job claiming with FOR UPDATE SKIP LOCKED.
 * - Recovery of abandoned leases.
 * - Idempotency deduplication by idempotencyKey.
 * - Anti-pork zero tolerance checked upon ingestion and persistence.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  BackgroundJob,
  JobStatus,
  JobType,
  JobErrorCategory,
  QueueJobInput,
  ClaimJobsOptions,
  QueueMetrics,
} from "./types";
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_LEASE_DURATION_SECONDS,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_PRIORITY,
} from "./constants";
import { assertNoProhibitedProduceBackgroundJob, sanitizeErrorMessage } from "./validation";
import { createAdminClient } from "@/lib/supabase/admin";

export function getAdminClientSafely(): ReturnType<typeof createAdminClient> | null {
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "test-service-role-key"
  ) {
    try {
      return createAdminClient();
    } catch {
      return null;
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// 1. IN-MEMORY STORE (TEST SUITES & OFFLINE RESILIENCE)
// -----------------------------------------------------------------------------

const inMemoryJobs = new Map<string, BackgroundJob>();
let lastWorkerRunTimestamp: string | null = null;
let lastWorkerAttemptTimestamp: string | null = null;
let lastWorkerSuccessTimestamp: string | null = null;

export function resetInMemoryJobStore(): void {
  inMemoryJobs.clear();
  lastWorkerRunTimestamp = null;
  lastWorkerAttemptTimestamp = null;
  lastWorkerSuccessTimestamp = null;
}

export function getInMemoryJobs(): BackgroundJob[] {
  return Array.from(inMemoryJobs.values());
}

export function seedInMemoryJobs(jobs: BackgroundJob[]): void {
  for (const job of jobs) {
    inMemoryJobs.set(job.id, job);
  }
}

export function setLastWorkerRunTimestamp(ts: string): void {
  lastWorkerRunTimestamp = ts;
  lastWorkerAttemptTimestamp = ts;
  lastWorkerSuccessTimestamp = ts;
}

export function setLastWorkerAttemptTimestamp(ts: string): void {
  lastWorkerAttemptTimestamp = ts;
  lastWorkerRunTimestamp = ts;
}

export function setLastWorkerSuccessTimestamp(ts: string): void {
  lastWorkerSuccessTimestamp = ts;
}

export function getLastWorkerAttemptTimestamp(): string | null {
  return lastWorkerAttemptTimestamp ?? lastWorkerRunTimestamp;
}

export function getLastWorkerSuccessTimestamp(): string | null {
  return lastWorkerSuccessTimestamp ?? lastWorkerRunTimestamp;
}

// -----------------------------------------------------------------------------
// 2. ENQUEUE JOB
// -----------------------------------------------------------------------------

export async function enqueueJob<TPayload extends Record<string, unknown>>(
  input: QueueJobInput<TPayload>,
  customSupabase?: SupabaseClient | null
): Promise<BackgroundJob<TPayload>> {
  // 1. Anti-Pork Zero Tolerance Verification
  assertNoProhibitedProduceBackgroundJob(input.payload, "Job Ingestion Payload");
  if (input.metadata) {
    assertNoProhibitedProduceBackgroundJob(input.metadata, "Job Ingestion Metadata");
  }

  const now = new Date();
  const runAfterDate = input.runAfter ? new Date(input.runAfter) : now;
  const idempotencyKey = input.idempotencyKey ?? null;

  // 2. Idempotency Check in Memory Store
  if (idempotencyKey) {
    for (const job of inMemoryJobs.values()) {
      if (job.idempotencyKey === idempotencyKey) {
        return job as BackgroundJob<TPayload>;
      }
    }
  }

  let supabase = customSupabase;
  if (supabase === undefined) {
    try {
      supabase = getAdminClientSafely();
    } catch {
      supabase = null;
    }
  }

  // 3. Database Idempotency Check
  if (supabase && idempotencyKey) {
    const { data: existing } = await supabase
      .from("background_jobs")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      return mapDbRowToBackgroundJob(existing) as BackgroundJob<TPayload>;
    }
  }

  const jobId = crypto.randomUUID();
  const jobEntity: BackgroundJob<TPayload> = {
    id: jobId,
    jobType: input.jobType,
    status: "QUEUED",
    priority: input.priority ?? DEFAULT_PRIORITY,
    payload: input.payload,
    result: null,
    attemptCount: 0,
    maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    runAfter: runAfterDate.toISOString(),
    idempotencyKey,
    claimedBy: null,
    leaseExpiresAt: null,
    lastErrorCategory: null,
    lastErrorMessage: null,
    createdAt: now.toISOString(),
    startedAt: null,
    completedAt: null,
    failedAt: null,
    metadata: input.metadata ?? {},
  };

  // Always store in memory for unit test observability
  inMemoryJobs.set(jobId, jobEntity as BackgroundJob);

  // Persist to database if connected
  if (supabase) {
    await supabase.from("background_jobs").insert({
      id: jobId,
      job_type: input.jobType,
      status: "QUEUED",
      priority: jobEntity.priority,
      payload: jobEntity.payload,
      attempt_count: 0,
      max_attempts: jobEntity.maxAttempts,
      run_after: jobEntity.runAfter,
      idempotency_key: idempotencyKey,
      metadata: jobEntity.metadata,
      created_at: jobEntity.createdAt,
    });
  }

  return jobEntity;
}

// -----------------------------------------------------------------------------
// 3. ATOMIC CLAIM JOBS
// -----------------------------------------------------------------------------

export async function claimJobs(
  options: ClaimJobsOptions,
  customSupabase?: SupabaseClient | null
): Promise<BackgroundJob[]> {
  const { workerId } = options;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const leaseDurationSeconds = options.leaseDurationSeconds ?? DEFAULT_LEASE_DURATION_SECONDS;
  const allowedTypes = options.allowedTypes;

  const now = new Date();
  const nowIso = now.toISOString();
  const leaseExpiresIso = new Date(now.getTime() + leaseDurationSeconds * 1000).toISOString();

  let supabase = customSupabase;
  if (supabase === undefined) {
    try {
      supabase = getAdminClientSafely();
    } catch {
      supabase = null;
    }
  }

  // If Supabase RPC is available, use database-enforced FOR UPDATE SKIP LOCKED
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("claim_background_jobs", {
        p_worker_id: workerId,
        p_batch_size: batchSize,
        p_lease_duration_seconds: leaseDurationSeconds,
        p_allowed_types: allowedTypes ?? null,
      });

      if (!error && data && Array.isArray(data) && data.length > 0) {
        const claimed = data.map(mapDbRowToBackgroundJob);
        // Sync to memory store
        for (const c of claimed) {
          inMemoryJobs.set(c.id, c);
        }
        return claimed;
      }
    } catch {
      // Fallback to in-memory claiming if RPC not reachable
    }
  }

  // In-Memory atomic claim with lease recovery
  const eligible: BackgroundJob[] = [];

  for (const job of inMemoryJobs.values()) {
    const isNormalQueued =
      job.status === "QUEUED" && new Date(job.runAfter).getTime() <= now.getTime();
    const isAbandonedRunning =
      job.status === "RUNNING" &&
      job.leaseExpiresAt !== null &&
      new Date(job.leaseExpiresAt).getTime() < now.getTime();

    if (isNormalQueued || isAbandonedRunning) {
      if (!allowedTypes || allowedTypes.includes(job.jobType)) {
        eligible.push(job);
      }
    }
  }

  // Order: priority DESC, runAfter ASC, createdAt ASC
  eligible.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const runDiff = new Date(a.runAfter).getTime() - new Date(b.runAfter).getTime();
    if (runDiff !== 0) return runDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const selected = eligible.slice(0, batchSize);

  for (const job of selected) {
    job.status = "RUNNING";
    job.claimedBy = workerId;
    job.startedAt = nowIso;
    job.leaseExpiresAt = leaseExpiresIso;
    job.attemptCount += 1;
  }

  return selected;
}

// -----------------------------------------------------------------------------
// 4. COMPLETE JOB
// -----------------------------------------------------------------------------

export async function completeJob(
  jobId: string,
  result: Record<string, unknown>,
  customSupabase?: SupabaseClient | null
): Promise<boolean> {
  const nowIso = new Date().toISOString();

  // In-memory update
  const inMem = inMemoryJobs.get(jobId);
  if (inMem) {
    inMem.status = "SUCCEEDED";
    inMem.result = result;
    inMem.completedAt = nowIso;
    inMem.claimedBy = null;
    inMem.leaseExpiresAt = null;
  }

  let supabase = customSupabase;
  if (supabase === undefined) {
    try {
      supabase = getAdminClientSafely();
    } catch {
      supabase = null;
    }
  }

  if (supabase) {
    const { error } = await supabase
      .from("background_jobs")
      .update({
        status: "SUCCEEDED",
        result,
        completed_at: nowIso,
        claimed_by: null,
        lease_expires_at: null,
      })
      .eq("id", jobId);

    if (error) return false;
  }

  return true;
}

// -----------------------------------------------------------------------------
// 5. FAIL OR RETRY JOB
// -----------------------------------------------------------------------------

export async function failJob(
  jobId: string,
  errorCategory: JobErrorCategory,
  errorMessage: string,
  retryable: boolean,
  nextRunAfter?: Date,
  customSupabase?: SupabaseClient | null
): Promise<boolean> {
  const now = new Date();
  const nowIso = now.toISOString();
  const sanitized = sanitizeErrorMessage(errorMessage);

  // In-memory update
  const inMem = inMemoryJobs.get(jobId);
  if (inMem) {
    inMem.lastErrorCategory = errorCategory;
    inMem.lastErrorMessage = sanitized;
    inMem.claimedBy = null;
    inMem.leaseExpiresAt = null;

    if (retryable && nextRunAfter) {
      inMem.status = "QUEUED";
      inMem.runAfter = nextRunAfter.toISOString();
    } else {
      inMem.status = inMem.attemptCount >= inMem.maxAttempts ? "DEAD_LETTER" : "FAILED";
      inMem.failedAt = nowIso;
    }
  }

  let supabase = customSupabase;
  if (supabase === undefined) {
    try {
      supabase = getAdminClientSafely();
    } catch {
      supabase = null;
    }
  }

  if (supabase) {
    const newStatus = retryable && nextRunAfter
      ? "QUEUED"
      : inMem && inMem.attemptCount >= inMem.maxAttempts
        ? "DEAD_LETTER"
        : "FAILED";

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      last_error_category: errorCategory,
      last_error_message: sanitized,
      claimed_by: null,
      lease_expires_at: null,
    };

    if (retryable && nextRunAfter) {
      updatePayload.run_after = nextRunAfter.toISOString();
    } else {
      updatePayload.failed_at = nowIso;
    }

    await supabase.from("background_jobs").update(updatePayload).eq("id", jobId);
  }

  return true;
}

// -----------------------------------------------------------------------------
// 6. RETRY FAILED JOB (ADMIN ACTION)
// -----------------------------------------------------------------------------

export async function retryFailedJob(
  jobId: string,
  customSupabase?: SupabaseClient | null
): Promise<boolean> {
  const nowIso = new Date().toISOString();

  const inMem = inMemoryJobs.get(jobId);
  if (inMem) {
    inMem.status = "QUEUED";
    inMem.runAfter = nowIso;
    inMem.failedAt = null;
    inMem.claimedBy = null;
    inMem.leaseExpiresAt = null;
  }

  let supabase = customSupabase;
  if (supabase === undefined) {
    try {
      supabase = getAdminClientSafely();
    } catch {
      supabase = null;
    }
  }

  if (supabase) {
    const { error } = await supabase
      .from("background_jobs")
      .update({
        status: "QUEUED",
        run_after: nowIso,
        failed_at: null,
        claimed_by: null,
        lease_expires_at: null,
      })
      .eq("id", jobId);

    if (error) return false;
  }

  return true;
}

// -----------------------------------------------------------------------------
// 7. GET JOB BY ID
// -----------------------------------------------------------------------------

export async function getJobById(
  jobId: string,
  customSupabase?: SupabaseClient | null
): Promise<BackgroundJob | null> {
  const inMem = inMemoryJobs.get(jobId);
  if (inMem) return inMem;

  let supabase = customSupabase;
  if (supabase === undefined) {
    try {
      supabase = getAdminClientSafely();
    } catch {
      supabase = null;
    }
  }

  if (supabase) {
    const { data } = await supabase
      .from("background_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (data) return mapDbRowToBackgroundJob(data);
  }

  return null;
}

// -----------------------------------------------------------------------------
// 8. QUEUE METRICS & FAILED JOBS INSPECTION
// -----------------------------------------------------------------------------

export async function getQueueMetrics(
  _customSupabase?: SupabaseClient | null
): Promise<QueueMetrics> {
  const now = new Date();
  const allJobs = Array.from(inMemoryJobs.values());

  let totalQueued = 0;
  let totalRunning = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let totalDeadLetter = 0;
  let oldestQueuedAgeSeconds = 0;

  const countsByType: Record<JobType, number> = {
    DISPATCH_APPROVED_ALERT: 0,
    RETRY_NOTIFICATION_DELIVERY: 0,
    EXPIRE_STALE_ALERTS: 0,
    REFRESH_MARKET_INTELLIGENCE: 0,
    RECONCILE_SUPPLY_FULFILMENT: 0,
  };

  let expiredLeasesCount = 0;
  let maxQueueLagSeconds: number | null = null;

  for (const job of allJobs) {
    if (job.status === "QUEUED") {
      totalQueued++;
      const ageSec = Math.max(0, (now.getTime() - new Date(job.createdAt).getTime()) / 1000);
      if (ageSec > oldestQueuedAgeSeconds) {
        oldestQueuedAgeSeconds = ageSec;
      }

      // Eligible queue lag calculation
      const runAfterTime = new Date(job.runAfter).getTime();
      if (runAfterTime <= now.getTime()) {
        const lagSec = Math.max(0, (now.getTime() - runAfterTime) / 1000);
        if (maxQueueLagSeconds === null || lagSec > maxQueueLagSeconds) {
          maxQueueLagSeconds = lagSec;
        }
      }
    } else if (job.status === "RUNNING") {
      totalRunning++;
      if (job.leaseExpiresAt && new Date(job.leaseExpiresAt).getTime() < now.getTime()) {
        expiredLeasesCount++;
      }
    } else if (job.status === "SUCCEEDED") {
      totalSucceeded++;
    } else if (job.status === "FAILED") {
      totalFailed++;
    } else if (job.status === "DEAD_LETTER") {
      totalDeadLetter++;
    }

    if (countsByType[job.jobType] !== undefined) {
      countsByType[job.jobType]++;
    }
  }

  return {
    totalQueued,
    totalRunning,
    totalSucceeded,
    totalFailed,
    totalDeadLetter,
    countsByType,
    oldestQueuedAgeSeconds: Math.round(oldestQueuedAgeSeconds),
    lastWorkerRunAt: lastWorkerRunTimestamp,
    lastAttemptedWorkerRunAt: getLastWorkerAttemptTimestamp(),
    lastSuccessfulWorkerRunAt: getLastWorkerSuccessTimestamp(),
    expiredLeasesCount,
    queueLagSeconds: maxQueueLagSeconds !== null ? Math.round(maxQueueLagSeconds) : null,
  };
}

export async function getFailedJobs(
  limit = 20,
  offset = 0,
  _customSupabase?: SupabaseClient | null
): Promise<BackgroundJob[]> {
  const allJobs = Array.from(inMemoryJobs.values());
  const failed = allJobs.filter((j) => j.status === "FAILED" || j.status === "DEAD_LETTER");

  failed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return failed.slice(offset, offset + limit);
}

// -----------------------------------------------------------------------------
// 9. ROW MAPPING HELPER
// -----------------------------------------------------------------------------

interface BackgroundJobDbRow {
  id: string;
  job_type: string;
  status: string;
  priority: number;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  attempt_count: number;
  max_attempts: number;
  run_after: string;
  idempotency_key?: string | null;
  claimed_by?: string | null;
  lease_expires_at?: string | null;
  last_error_category?: string | null;
  last_error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  metadata?: Record<string, unknown>;
}

function mapDbRowToBackgroundJob(row: BackgroundJobDbRow): BackgroundJob {
  return {
    id: row.id,
    jobType: row.job_type as JobType,
    status: row.status as JobStatus,
    priority: row.priority,
    payload: row.payload ?? {},
    result: row.result ?? null,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    runAfter: row.run_after,
    idempotencyKey: row.idempotency_key ?? null,
    claimedBy: row.claimed_by ?? null,
    leaseExpiresAt: row.lease_expires_at ?? null,
    lastErrorCategory: (row.last_error_category as JobErrorCategory) ?? null,
    lastErrorMessage: row.last_error_message ?? null,
    createdAt: row.created_at,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    failedAt: row.failed_at ?? null,
    metadata: row.metadata ?? {},
  };
}
