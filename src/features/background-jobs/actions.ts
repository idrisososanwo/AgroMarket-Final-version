"use server";

/**
 * AgroMarket Phase 3.17: Background Jobs Server Actions
 * Governed administrative controls for queue inspection and manual execution.
 */

import { getCurrentUser } from "@/lib/auth/server";
import { BackgroundJobService } from "./service";
import { QueueMetrics, BackgroundJob, WorkerRunResult } from "./types";
import { recordAuditLog } from "@/lib/audit";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Retrieves queue operational health metrics. Requires ADMIN role.
 */
export async function getQueueMetricsAction(): Promise<ActionResult<QueueMetrics>> {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ADMIN")) {
    return { success: false, error: "Unauthorized: Admin access required.", code: "UNAUTHORIZED" };
  }

  try {
    const metrics = await BackgroundJobService.getMetrics();
    return { success: true, data: metrics };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch queue metrics.";
    return { success: false, error: msg, code: "METRICS_FAILED" };
  }
}

/**
 * Retrieves failed and dead-letter jobs for admin inspection. Requires ADMIN role.
 */
export async function getFailedJobsAction(
  limit = 20,
  offset = 0
): Promise<ActionResult<BackgroundJob[]>> {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ADMIN")) {
    return { success: false, error: "Unauthorized: Admin access required.", code: "UNAUTHORIZED" };
  }

  try {
    const jobs = await BackgroundJobService.getFailed(limit, offset);
    return { success: true, data: jobs };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch failed jobs.";
    return { success: false, error: msg, code: "QUERY_FAILED" };
  }
}

/**
 * Manually retries a failed or dead-letter background job. Requires ADMIN role.
 */
export async function retryFailedJobAction(jobId: string): Promise<ActionResult<boolean>> {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ADMIN")) {
    return { success: false, error: "Unauthorized: Admin access required.", code: "UNAUTHORIZED" };
  }

  try {
    const success = await BackgroundJobService.retryFailed(jobId);
    if (success) {
      await recordAuditLog({
        actorId: user.id,
        action: "RETRY_FAILED_BACKGROUND_JOB",
        resourceType: "background_job",
        resourceId: jobId,
        metadata: { adminUserId: user.id },
      });
    }
    return { success, data: success };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retry job.";
    return { success: false, error: msg, code: "RETRY_FAILED" };
  }
}

/**
 * Triggers an immediate worker cycle for pending background jobs. Requires ADMIN role.
 */
export async function triggerWorkerCycleAction(): Promise<ActionResult<WorkerRunResult>> {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ADMIN")) {
    return { success: false, error: "Unauthorized: Admin access required.", code: "UNAUTHORIZED" };
  }

  try {
    const result = await BackgroundJobService.processQueue({
      workerId: `admin_triggered_${user.id.slice(0, 8)}`,
      batchSize: 20,
    });

    await recordAuditLog({
      actorId: user.id,
      action: "MANUAL_WORKER_CYCLE_TRIGGERED",
      resourceType: "background_queue",
      resourceId: "system",
      metadata: {
        claimedCount: result.claimedCount,
        succeededCount: result.succeededCount,
        failedCount: result.failedCount,
      },
    });

    return { success: true, data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Worker cycle failed.";
    return { success: false, error: msg, code: "EXECUTION_FAILED" };
  }
}
