/**
 * AgroMarket Phase 3.17: Background Job Worker Execution Engine
 * Atomically claims, dispatches, handles timeouts, and tracks job lifecycles.
 *
 * SAFETY INVARIANTS:
 * - Leased execution: jobs are leased with explicit expiry.
 * - Distinguishes transient vs permanent failure.
 * - Anti-pork enforcement in every phase.
 * - Audit logging for terminal job failures.
 * - Sanitizes errors to prevent credential or PII leaks.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  ClaimJobsOptions,
  WorkerRunResult,
  JobType,
  JobErrorCategory,
} from "./types";
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_LEASE_DURATION_SECONDS,
  JOB_TIMEOUT_MS,
} from "./constants";
import { claimJobs, completeJob, failJob, setLastWorkerRunTimestamp } from "./data-layer";
import { getJobHandler } from "./handlers/registry";
import { categorizeError } from "./validation";
import { calculateNextRunTime } from "./backoff";
import { recordAuditLog } from "@/lib/audit";

export class BackgroundJobWorker {
  private readonly defaultWorkerId: string;

  constructor(workerId?: string) {
    this.defaultWorkerId = workerId || `worker_${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * Executes a bounded batch of queued or abandoned background jobs.
   */
  async executeBatch(
    options: Partial<ClaimJobsOptions> = {},
    customSupabase?: SupabaseClient | null
  ): Promise<WorkerRunResult> {
    const startTime = Date.now();
    const workerId = options.workerId || this.defaultWorkerId;
    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    const leaseDurationSeconds = options.leaseDurationSeconds ?? DEFAULT_LEASE_DURATION_SECONDS;
    const allowedTypes = options.allowedTypes;

    const claimedJobs = await claimJobs(
      {
        workerId,
        batchSize,
        leaseDurationSeconds,
        allowedTypes,
      },
      customSupabase
    );

    let succeededCount = 0;
    let failedCount = 0;
    let retriedCount = 0;
    let deadLetterCount = 0;
    const errors: Array<{
      jobId: string;
      jobType: JobType;
      errorCategory: JobErrorCategory;
      message: string;
    }> = [];

    const now = new Date();
    setLastWorkerRunTimestamp(now.toISOString());

    for (const job of claimedJobs) {
      const handler = getJobHandler(job.jobType);

      if (!handler) {
        const errorCategory: JobErrorCategory = "PERMANENT";
        const errorMessage = `No registered execution handler found for job type ${job.jobType}`;
        await failJob(job.id, errorCategory, errorMessage, false, undefined, customSupabase);
        failedCount++;
        errors.push({ jobId: job.id, jobType: job.jobType, errorCategory, message: errorMessage });
        continue;
      }

      const executionContext = {
        jobId: job.id,
        workerId,
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
        now: new Date(),
      };

      try {
        // Enforce per-job execution timeout
        const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
          setTimeout(() => resolve({ timeout: true }), JOB_TIMEOUT_MS)
        );

        const executionPromise = handler.execute(job.payload, executionContext);
        const outcome = await Promise.race([executionPromise, timeoutPromise]);

        if ("timeout" in outcome && outcome.timeout === true) {
          const isRetryable = job.attemptCount < job.maxAttempts;
          const nextRun = isRetryable ? calculateNextRunTime(job.attemptCount, executionContext.now) : undefined;
          await failJob(
            job.id,
            "TIMEOUT",
            `Execution exceeded timeout of ${JOB_TIMEOUT_MS}ms`,
            isRetryable,
            nextRun,
            customSupabase
          );

          if (isRetryable) {
            retriedCount++;
          } else {
            deadLetterCount++;
          }
          errors.push({
            jobId: job.id,
            jobType: job.jobType,
            errorCategory: "TIMEOUT",
            message: `Execution exceeded timeout of ${JOB_TIMEOUT_MS}ms`,
          });
          continue;
        }

        const result = outcome as Awaited<typeof executionPromise>;

        if (result.success) {
          await completeJob(job.id, result.result, customSupabase);
          succeededCount++;
        } else {
          const isRetryable =
            result.retryable !== false &&
            result.errorCategory === "TRANSIENT" &&
            job.attemptCount < job.maxAttempts;

          const nextRun = isRetryable
            ? calculateNextRunTime(job.attemptCount, executionContext.now, {
                baseSeconds: result.retryDelaySeconds,
              })
            : undefined;

          await failJob(
            job.id,
            result.errorCategory,
            result.errorMessage,
            isRetryable,
            nextRun,
            customSupabase
          );

          if (isRetryable) {
            retriedCount++;
          } else if (job.attemptCount >= job.maxAttempts) {
            deadLetterCount++;
            await recordAuditLog({
              action: "BACKGROUND_JOB_DEAD_LETTER",
              resourceType: "background_job",
              resourceId: job.id,
              metadata: {
                jobType: job.jobType,
                errorCategory: result.errorCategory,
                errorMessage: result.errorMessage,
                attemptCount: job.attemptCount,
              },
            });
          } else {
            failedCount++;
          }

          errors.push({
            jobId: job.id,
            jobType: job.jobType,
            errorCategory: result.errorCategory,
            message: result.errorMessage,
          });
        }
      } catch (err: unknown) {
        // Unexpected throw during handler execution
        const { category, message, retryable } = categorizeError(err);
        const isRetryable = retryable && job.attemptCount < job.maxAttempts;
        const nextRun = isRetryable ? calculateNextRunTime(job.attemptCount, executionContext.now) : undefined;

        await failJob(job.id, category, message, isRetryable, nextRun, customSupabase);

        if (isRetryable) {
          retriedCount++;
        } else {
          failedCount++;
          if (job.attemptCount >= job.maxAttempts) {
            deadLetterCount++;
          }
        }

        errors.push({
          jobId: job.id,
          jobType: job.jobType,
          errorCategory: category,
          message,
        });
      }
    }

    return {
      workerId,
      claimedCount: claimedJobs.length,
      succeededCount,
      failedCount,
      retriedCount,
      deadLetterCount,
      durationMs: Date.now() - startTime,
      errors,
    };
  }
}
