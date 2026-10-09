/**
 * AgroMarket Phase 3.17: Background Job Service
 * High-level domain facade for queueing and managing background operations.
 */

import {
  BackgroundJob,
  QueueJobInput,
  WorkerRunResult,
  QueueMetrics,
  ClaimJobsOptions,
} from "./types";
import {
  enqueueJob,
  getJobById,
  getQueueMetrics,
  getFailedJobs,
  retryFailedJob,
} from "./data-layer";
import { BackgroundJobWorker } from "./worker";
import { DeliveryChannel } from "@/features/notifications/types";

export class BackgroundJobService {
  /**
   * Enqueues a typed job into the background queue.
   */
  static async enqueue<TPayload extends Record<string, unknown>>(
    input: QueueJobInput<TPayload>
  ): Promise<BackgroundJob<TPayload>> {
    return enqueueJob(input);
  }

  /**
   * Enqueues an approved agricultural intelligence alert for asynchronous dispatch.
   */
  static async scheduleAlertDispatch(
    alertId: string,
    priority = 70
  ): Promise<BackgroundJob> {
    return enqueueJob({
      jobType: "DISPATCH_APPROVED_ALERT",
      payload: { alertId },
      priority,
      idempotencyKey: `dispatch_alert_${alertId}`,
    });
  }

  /**
   * Enqueues a failed notification delivery for asynchronous retry.
   */
  static async scheduleNotificationRetry(
    notificationId: string,
    channel?: DeliveryChannel
  ): Promise<BackgroundJob> {
    return enqueueJob({
      jobType: "RETRY_NOTIFICATION_DELIVERY",
      payload: { notificationId, channel },
      priority: 60,
      idempotencyKey: `retry_notif_${notificationId}_${channel || "all"}_${Date.now()}`,
    });
  }

  /**
   * Enqueues an on-demand stale alerts expiry check.
   */
  static async scheduleAlertExpiryCheck(): Promise<BackgroundJob> {
    return enqueueJob({
      jobType: "EXPIRE_STALE_ALERTS",
      payload: { batchLimit: 100 },
      priority: 40,
    });
  }

  /**
   * Enqueues a market intelligence projection refresh.
   */
  static async scheduleMarketIntelligenceRefresh(
    commodity: string,
    state: string,
    lga?: string
  ): Promise<BackgroundJob> {
    return enqueueJob({
      jobType: "REFRESH_MARKET_INTELLIGENCE",
      payload: { commodity, state, lga },
      priority: 50,
      idempotencyKey: `refresh_market_${commodity}_${state}_${new Date().toISOString().slice(0, 10)}`,
    });
  }

  /**
   * Enqueues supply commitment fulfilment reconciliation.
   */
  static async scheduleSupplyFulfilmentReconciliation(
    commitmentId?: string
  ): Promise<BackgroundJob> {
    return enqueueJob({
      jobType: "RECONCILE_SUPPLY_FULFILMENT",
      payload: { commitmentId },
      priority: 50,
      idempotencyKey: commitmentId ? `reconcile_commit_${commitmentId}` : undefined,
    });
  }

  /**
   * Runs an immediate worker execution cycle.
   */
  static async processQueue(
    options: Partial<ClaimJobsOptions> = {}
  ): Promise<WorkerRunResult> {
    const worker = new BackgroundJobWorker(options.workerId);
    return worker.executeBatch(options);
  }

  /**
   * Retrieves operational queue metrics and lag indicators.
   */
  static async getMetrics(): Promise<QueueMetrics> {
    return getQueueMetrics();
  }

  /**
   * Retrieves recent failed or dead-letter jobs for inspection.
   */
  static async getFailed(limit = 20, offset = 0): Promise<BackgroundJob[]> {
    return getFailedJobs(limit, offset);
  }

  /**
   * Retries an eligible failed or dead-letter job (admin action).
   */
  static async retryFailed(jobId: string): Promise<boolean> {
    return retryFailedJob(jobId);
  }

  /**
   * Retrieves a specific background job by ID.
   */
  static async getById(jobId: string): Promise<BackgroundJob | null> {
    return getJobById(jobId);
  }
}
