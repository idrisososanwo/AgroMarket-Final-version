/**
 * AgroMarket Phase 3.17: Scheduler Authentication & Execution Coordinator
 * Enforces cryptographic / secret authentication for cron triggers and manages scheduled cycles.
 *
 * SAFETY INVARIANTS:
 * - FAILS CLOSED: Rejects invocation if secret is missing, unconfigured, or invalid.
 * - Prevents public unauthenticated callers from triggering worker runs.
 * - Idempotent cycle scheduling.
 */

import { BackgroundJobWorker } from "./worker";
import { WorkerRunResult, JobType } from "./types";
import { enqueueJob } from "./data-layer";

/**
 * Validates that the request bears the required shared secret token.
 * Accepts:
 * - "Bearer <token>"
 * - Raw token matching CRON_SECRET or SCHEDULER_SECRET
 */
export function validateSchedulerAuthentication(
  authHeaderOrSecret: string | null | undefined
): { authorized: boolean; reason?: string } {
  const expectedSecret = process.env.CRON_SECRET || process.env.SCHEDULER_SECRET;

  if (!expectedSecret || expectedSecret.trim().length === 0) {
    return {
      authorized: false,
      reason: "Scheduler secret is not configured in server environment variables. Failing closed.",
    };
  }

  if (!authHeaderOrSecret) {
    return {
      authorized: false,
      reason: "Missing scheduler authentication credentials.",
    };
  }

  let token = authHeaderOrSecret.trim();
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  if (token !== expectedSecret) {
    return {
      authorized: false,
      reason: "Invalid scheduler authentication secret.",
    };
  }

  return { authorized: true };
}

export interface RunScheduledCycleOptions {
  authHeaderOrSecret?: string | null;
  batchSize?: number;
  allowedTypes?: JobType[];
  workerId?: string;
  skipAuthCheck?: boolean; // strictly for unit test environments
}

/**
 * Executes a governed background processing cycle.
 */
export async function runScheduledJobCycle(
  options: RunScheduledCycleOptions = {}
): Promise<WorkerRunResult> {
  // 1. Authenticate Request
  if (!options.skipAuthCheck) {
    const auth = validateSchedulerAuthentication(options.authHeaderOrSecret);
    if (!auth.authorized) {
      throw new Error(`[SCHEDULER_AUTH_FAILED] ${auth.reason}`);
    }
  }

  // 2. Enqueue periodic baseline maintenance jobs with hourly idempotency
  const currentHourKey = new Date().toISOString().slice(0, 13); // e.g., "2026-10-09T10"
  try {
    await enqueueJob({
      jobType: "EXPIRE_STALE_ALERTS",
      payload: { batchLimit: 100 },
      priority: 30,
      idempotencyKey: `cron_expire_stale_alerts_${currentHourKey}`,
    });
  } catch {
    // Non-fatal if maintenance job is already queued
  }

  // 3. Execute Worker Batch
  const worker = new BackgroundJobWorker(options.workerId || "scheduler_cron_worker");
  return worker.executeBatch({
    batchSize: options.batchSize ?? 20,
    allowedTypes: options.allowedTypes,
  });
}
