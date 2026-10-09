/**
 * AgroMarket Phase 3.18: Queue & Notification Reliability Metrics Aggregation
 *
 * SAFETY INVARIANTS:
 * - Distinguishes missing metrics (null) from zero.
 * - Uses bounded queries to avoid loading entire tables into memory.
 * - Pending review alerts are exposed as an operational queue, not system errors.
 * - External delivery channels report truthfully (never faked).
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  QueueReliabilityMetrics,
  NotificationReliabilityMetrics,
} from "./types";
import {
  getAdminClientSafely,
  getInMemoryJobs,
  getLastWorkerAttemptTimestamp,
  getLastWorkerSuccessTimestamp,
} from "@/features/background-jobs/data-layer";
import { JobStatus, JobType } from "@/features/background-jobs/types";
import { getInMemoryNotificationStore } from "@/features/notifications/data-layer";
import { DELIVERY_CHANNELS, DeliveryChannel } from "@/features/notifications/types";
import { getDeliveryProvider } from "@/features/notifications/delivery-providers";

/**
 * Aggregates Queue Reliability Metrics.
 */
export async function getQueueReliabilityMetrics(
  customSupabase?: SupabaseClient | null
): Promise<{ metrics: QueueReliabilityMetrics; unmeasured: string[] }> {
  const unmeasured: string[] = [];
  const now = new Date();
  const dbClient = customSupabase !== undefined ? customSupabase : getAdminClientSafely();

  const countsByStatus: Record<JobStatus, number> = {
    QUEUED: 0,
    RUNNING: 0,
    SUCCEEDED: 0,
    FAILED: 0,
    DEAD_LETTER: 0,
  };

  const countsByType: Record<JobType, number> = {
    DISPATCH_APPROVED_ALERT: 0,
    RETRY_NOTIFICATION_DELIVERY: 0,
    EXPIRE_STALE_ALERTS: 0,
    REFRESH_MARKET_INTELLIGENCE: 0,
    RECONCILE_SUPPLY_FULFILMENT: 0,
  };

  let oldestEligibleQueuedAgeSeconds: number | null = null;
  let expiredLeasesCount = 0;
  let queueLagSeconds: number | null = null;
  let retryableFailuresCount = 0;
  let terminalDeadLetterCount = 0;

  // In-memory fallback / unit-test evaluation
  if (!dbClient) {
    const jobs = getInMemoryJobs();

    for (const job of jobs) {
      if (countsByStatus[job.status] !== undefined) {
        countsByStatus[job.status]++;
      }
      if (countsByType[job.jobType] !== undefined) {
        countsByType[job.jobType]++;
      }

      if (job.status === "QUEUED") {
        const runAfterTime = new Date(job.runAfter).getTime();
        if (runAfterTime <= now.getTime()) {
          const ageSec = Math.max(0, (now.getTime() - new Date(job.createdAt).getTime()) / 1000);
          if (oldestEligibleQueuedAgeSeconds === null || ageSec > oldestEligibleQueuedAgeSeconds) {
            oldestEligibleQueuedAgeSeconds = Math.round(ageSec);
          }

          const lagSec = Math.max(0, (now.getTime() - runAfterTime) / 1000);
          if (queueLagSeconds === null || lagSec > queueLagSeconds) {
            queueLagSeconds = Math.round(lagSec);
          }
        }
      } else if (job.status === "RUNNING") {
        if (job.leaseExpiresAt && new Date(job.leaseExpiresAt).getTime() < now.getTime()) {
          expiredLeasesCount++;
        }
      } else if (job.status === "FAILED") {
        if (job.attemptCount < job.maxAttempts && job.lastErrorCategory === "TRANSIENT") {
          retryableFailuresCount++;
        }
      } else if (job.status === "DEAD_LETTER") {
        terminalDeadLetterCount++;
      }
    }
  } else {
    // Live Supabase bounded queries
    try {
      const { data: jobs, error } = await dbClient
        .from("background_jobs")
        .select("job_type, status, created_at, run_after, lease_expires_at, attempt_count, max_attempts, last_error_category")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        unmeasured.push("background_jobs_query_error");
      } else if (jobs) {
        for (const j of jobs) {
          const status = j.status as JobStatus;
          const type = j.job_type as JobType;

          if (countsByStatus[status] !== undefined) countsByStatus[status]++;
          if (countsByType[type] !== undefined) countsByType[type]++;

          if (status === "QUEUED") {
            const runAfterTime = new Date(j.run_after).getTime();
            if (runAfterTime <= now.getTime()) {
              const ageSec = Math.max(0, (now.getTime() - new Date(j.created_at).getTime()) / 1000);
              if (oldestEligibleQueuedAgeSeconds === null || ageSec > oldestEligibleQueuedAgeSeconds) {
                oldestEligibleQueuedAgeSeconds = Math.round(ageSec);
              }

              const lagSec = Math.max(0, (now.getTime() - runAfterTime) / 1000);
              if (queueLagSeconds === null || lagSec > queueLagSeconds) {
                queueLagSeconds = Math.round(lagSec);
              }
            }
          } else if (status === "RUNNING") {
            if (j.lease_expires_at && new Date(j.lease_expires_at).getTime() < now.getTime()) {
              expiredLeasesCount++;
            }
          } else if (status === "FAILED") {
            if (j.attempt_count < j.max_attempts && j.last_error_category === "TRANSIENT") {
              retryableFailuresCount++;
            }
          } else if (status === "DEAD_LETTER") {
            terminalDeadLetterCount++;
          }
        }
      }
    } catch {
      unmeasured.push("background_jobs_exception");
    }
  }

  const lastAttemptedWorkerCycle = getLastWorkerAttemptTimestamp();
  const lastSuccessfulWorkerCycle = getLastWorkerSuccessTimestamp();

  return {
    metrics: {
      countsByStatus,
      countsByType,
      oldestEligibleQueuedAgeSeconds,
      expiredLeasesCount,
      recoverableAbandonedJobsCount: expiredLeasesCount,
      retryableFailuresCount,
      terminalDeadLetterCount,
      lastSuccessfulWorkerCycle,
      lastAttemptedWorkerCycle,
      queueLagSeconds,
      batchLimitReached: countsByStatus.RUNNING >= 50,
      retryLimitReached: terminalDeadLetterCount > 0,
    },
    unmeasured,
  };
}

/**
 * Aggregates Notification & Alert Reliability Metrics.
 */
export async function getNotificationReliabilityMetrics(
  customSupabase?: SupabaseClient | null
): Promise<{ metrics: NotificationReliabilityMetrics; unmeasured: string[] }> {
  const unmeasured: string[] = [];
  const now = new Date();
  const dbClient = customSupabase !== undefined ? customSupabase : getAdminClientSafely();

  let publishedAlertsAwaitingDispatch = 0;
  let pendingReviewAlertsCount = 0;
  let expiredAlertsEligibleCount = 0;
  let invalidMetadataAlertsCount = 0;
  let repeatedDeliveryFailuresCount = 0;
  const deliveryCountsByChannelAndStatus: Record<string, number> = {};

  // Check which delivery providers are unavailable
  const unavailableProviders: DeliveryChannel[] = [];
  for (const channel of DELIVERY_CHANNELS) {
    const provider = getDeliveryProvider(channel);
    if (!provider.isAvailable()) {
      unavailableProviders.push(channel);
    }
  }

  if (!dbClient) {
    // In-memory test store evaluation
    const store = getInMemoryNotificationStore();

    for (const alert of store.alerts) {
      const pubStatus =
        alert.publicationStatus ||
        (alert as unknown as { status?: string }).status;

      if (pubStatus === "PENDING_REVIEW") {
        pendingReviewAlertsCount++;
      } else if (pubStatus === "PUBLISHED") {
        const expiresAt = alert.expiresAt ? new Date(alert.expiresAt).getTime() : Infinity;
        if (expiresAt <= now.getTime()) {
          expiredAlertsEligibleCount++;
        } else {
          publishedAlertsAwaitingDispatch++;
        }
      }

      // Check metadata integrity
      const hasProvenance = Boolean(
        alert.sourceProvenance ||
        (alert as unknown as { provenance?: unknown }).provenance
      );
      const hasConfidence = Boolean(
        alert.confidenceLevel ||
        (alert as unknown as { confidence?: unknown }).confidence
      );

      if (!hasProvenance || !hasConfidence) {
        invalidMetadataAlertsCount++;
      }
    }

    for (const delivery of store.deliveries) {
      const key = `${delivery.channel}_${delivery.deliveryStatus}`;
      deliveryCountsByChannelAndStatus[key] = (deliveryCountsByChannelAndStatus[key] || 0) + 1;

      if (delivery.deliveryStatus === "FAILED" && delivery.attemptCount >= 3) {
        repeatedDeliveryFailuresCount++;
      }
    }
  } else {
    // Live Supabase bounded queries
    try {
      const { data: alerts } = await dbClient
        .from("agricultural_alerts")
        .select("status, expires_at, provenance, confidence")
        .limit(100);

      if (alerts) {
        for (const a of alerts) {
          if (a.status === "PENDING_REVIEW") {
            pendingReviewAlertsCount++;
          } else if (a.status === "PUBLISHED") {
            const expiresAt = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
            if (expiresAt <= now.getTime()) {
              expiredAlertsEligibleCount++;
            } else {
              publishedAlertsAwaitingDispatch++;
            }
          }

          if (!a.provenance || !a.confidence) {
            invalidMetadataAlertsCount++;
          }
        }
      }
    } catch {
      unmeasured.push("agricultural_alerts_query_error");
    }

    try {
      const { data: deliveries } = await dbClient
        .from("notification_deliveries")
        .select("channel, status, attempt_count")
        .limit(200);

      if (deliveries) {
        for (const d of deliveries) {
          const key = `${d.channel}_${d.status}`;
          deliveryCountsByChannelAndStatus[key] = (deliveryCountsByChannelAndStatus[key] || 0) + 1;

          if (d.status === "FAILED" && d.attempt_count >= 3) {
            repeatedDeliveryFailuresCount++;
          }
        }
      }
    } catch {
      unmeasured.push("notification_deliveries_query_error");
    }
  }

  return {
    metrics: {
      publishedAlertsAwaitingDispatch,
      pendingReviewAlertsCount,
      expiredAlertsEligibleCount,
      deliveryCountsByChannelAndStatus,
      unavailableProviders,
      repeatedDeliveryFailuresCount,
      invalidMetadataAlertsCount,
      staleNotificationProcessing: expiredAlertsEligibleCount > 0,
    },
    unmeasured,
  };
}
