/**
 * AgroMarket Phase 3.17: Background Processing, Scheduled Jobs & Retry Foundation
 * Domain Contracts, Enums, State Machines, and Payload Interfaces
 *
 * SAFETY INVARIANTS:
 * - Strict server-side job allowlists.
 * - Atomic job claiming with leases (prevents duplicate execution).
 * - Distinguishes transient vs permanent failures.
 * - Bounded deterministic backoff.
 * - Anti-Pork Zero Tolerance across job types, payloads, and persistence.
 * - Prohibits autonomous financial, veterinary, culling, or quarantine execution.
 */

import { DeliveryChannel } from "@/features/notifications/types";

// -----------------------------------------------------------------------------
// 1. JOB TYPES & ALLOWLIST
// -----------------------------------------------------------------------------

export const BACKGROUND_JOB_TYPES = [
  "DISPATCH_APPROVED_ALERT",
  "RETRY_NOTIFICATION_DELIVERY",
  "EXPIRE_STALE_ALERTS",
  "REFRESH_MARKET_INTELLIGENCE",
  "RECONCILE_SUPPLY_FULFILMENT",
] as const;

export type JobType = (typeof BACKGROUND_JOB_TYPES)[number];

// -----------------------------------------------------------------------------
// 2. LIFECYCLE STATUSES
// -----------------------------------------------------------------------------

export const BACKGROUND_JOB_STATUSES = [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "DEAD_LETTER",
] as const;

export type JobStatus = (typeof BACKGROUND_JOB_STATUSES)[number];

// -----------------------------------------------------------------------------
// 3. ERROR CATEGORIES & RETRYABILITY
// -----------------------------------------------------------------------------

export const JOB_ERROR_CATEGORIES = [
  "TRANSIENT",            // Network glitched, DB contention -> Retry eligible with backoff
  "PERMANENT",            // Unrecoverable business rule failure -> FAILED / DEAD_LETTER immediately
  "VALIDATION_FAILED",    // Payload schema mismatch -> Never retried
  "INVARIANT_VIOLATION",  // Anti-pork or policy violation -> Never retried, alert security
  "CANCELLED",            // Manually revoked by administrator -> Terminal
  "TIMEOUT",              // Execution exceeded max duration -> Retry if attempts remain
] as const;

export type JobErrorCategory = (typeof JOB_ERROR_CATEGORIES)[number];

// -----------------------------------------------------------------------------
// 4. JOB PAYLOAD CONTRACTS
// -----------------------------------------------------------------------------

export interface DispatchApprovedAlertPayload {
  alertId: string;
  batchSize?: number;
  dryRun?: boolean;
}

export interface RetryNotificationDeliveryPayload {
  notificationId?: string;
  deliveryId?: string;
  channel?: DeliveryChannel;
  maxAttempts?: number;
}

export interface ExpireStaleAlertsPayload {
  dryRun?: boolean;
  batchLimit?: number;
}

export interface RefreshMarketIntelligencePayload {
  commodity: string;
  state: string;
  lga?: string;
}

export interface ReconcileSupplyFulfilmentPayload {
  commitmentId?: string;
  coordinationPlanId?: string;
}

export type JobPayloadMap = {
  DISPATCH_APPROVED_ALERT: DispatchApprovedAlertPayload;
  RETRY_NOTIFICATION_DELIVERY: RetryNotificationDeliveryPayload;
  EXPIRE_STALE_ALERTS: ExpireStaleAlertsPayload;
  REFRESH_MARKET_INTELLIGENCE: RefreshMarketIntelligencePayload;
  RECONCILE_SUPPLY_FULFILMENT: ReconcileSupplyFulfilmentPayload;
};

// -----------------------------------------------------------------------------
// 5. CANONICAL BACKGROUND JOB ENTITY
// -----------------------------------------------------------------------------

export interface BackgroundJob<TPayload = Record<string, unknown>, TResult = Record<string, unknown>> {
  id: string;
  jobType: JobType;
  status: JobStatus;
  priority: number;
  payload: TPayload;
  result: TResult | null;
  attemptCount: number;
  maxAttempts: number;
  runAfter: string;
  idempotencyKey: string | null;
  claimedBy: string | null;
  leaseExpiresAt: string | null;
  lastErrorCategory: JobErrorCategory | null;
  lastErrorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  metadata: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// 6. HANDLER EXECUTION INTERFACES
// -----------------------------------------------------------------------------

export interface JobExecutionContext {
  jobId: string;
  workerId: string;
  attemptCount: number;
  maxAttempts: number;
  now: Date;
}

export interface JobExecutionSuccess<TResult = Record<string, unknown>> {
  success: true;
  result: TResult;
  metadata?: Record<string, unknown>;
}

export interface JobExecutionFailure {
  success: false;
  errorCategory: JobErrorCategory;
  errorMessage: string;
  retryable?: boolean;
  retryDelaySeconds?: number;
  metadata?: Record<string, unknown>;
}

export type JobExecutionResult<TResult = Record<string, unknown>> =
  | JobExecutionSuccess<TResult>
  | JobExecutionFailure;

export interface JobHandler<TPayload = Record<string, unknown>, TResult = Record<string, unknown>> {
  jobType: JobType;
  execute(payload: TPayload, context: JobExecutionContext): Promise<JobExecutionResult<TResult>>;
}

// -----------------------------------------------------------------------------
// 7. QUEUE INGESTION & WORKER PARAMS
// -----------------------------------------------------------------------------

export interface QueueJobInput<TPayload = Record<string, unknown>> {
  jobType: JobType;
  payload: TPayload;
  priority?: number;
  runAfter?: string | Date;
  maxAttempts?: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ClaimJobsOptions {
  workerId: string;
  batchSize?: number;
  leaseDurationSeconds?: number;
  allowedTypes?: JobType[];
}

export interface WorkerRunResult {
  workerId: string;
  claimedCount: number;
  succeededCount: number;
  failedCount: number;
  retriedCount: number;
  deadLetterCount: number;
  durationMs: number;
  errors: Array<{
    jobId: string;
    jobType: JobType;
    errorCategory: JobErrorCategory;
    message: string;
  }>;
}

// -----------------------------------------------------------------------------
// 8. OBSERVABILITY & OPERATIONAL METRICS
// -----------------------------------------------------------------------------

export interface QueueMetrics {
  totalQueued: number;
  totalRunning: number;
  totalSucceeded: number;
  totalFailed: number;
  totalDeadLetter: number;
  countsByType: Record<JobType, number>;
  oldestQueuedAgeSeconds: number;
  lastWorkerRunAt: string | null;
}
