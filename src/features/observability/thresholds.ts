/**
 * AgroMarket Phase 3.18: Reliability Rules & Threshold Evaluation
 * Evaluates queue lag, dead letters, worker staleness, and delivery metrics.
 *
 * SAFETY INVARIANTS:
 * - A warning threshold NEVER silently mutates job state or triggers actions.
 * - Pending human review is treated as an operational queue, NOT a system error.
 */

import {
  QueueReliabilityMetrics,
  NotificationReliabilityMetrics,
  ReliabilityThresholds,
  ThresholdEvaluationResult,
  ThresholdDiagnostic,
  HealthStatus,
} from "./types";
import { DEFAULT_RELIABILITY_THRESHOLDS } from "./constants";

export function evaluateReliabilityThresholds(
  queueMetrics: QueueReliabilityMetrics,
  notificationMetrics: NotificationReliabilityMetrics,
  customThresholds?: Partial<ReliabilityThresholds>
): ThresholdEvaluationResult {
  const thresholds: ReliabilityThresholds = {
    ...DEFAULT_RELIABILITY_THRESHOLDS,
    ...customThresholds,
  };

  const diagnostics: ThresholdDiagnostic[] = [];
  let hasCritical = false;
  let hasWarning = false;

  // 1. Dead-Letter Count Check
  if (queueMetrics.terminalDeadLetterCount >= thresholds.maxDeadLetterCritical) {
    hasCritical = true;
    diagnostics.push({
      rule: "DEAD_LETTER_CRITICAL",
      severity: "CRITICAL",
      message: `Dead letter count (${queueMetrics.terminalDeadLetterCount}) reached or exceeded critical threshold of ${thresholds.maxDeadLetterCritical}.`,
    });
  } else if (queueMetrics.terminalDeadLetterCount >= thresholds.maxDeadLetterWarning) {
    hasWarning = true;
    diagnostics.push({
      rule: "DEAD_LETTER_WARNING",
      severity: "WARNING",
      message: `Dead letter count (${queueMetrics.terminalDeadLetterCount}) exceeds warning threshold of ${thresholds.maxDeadLetterWarning}.`,
    });
  }

  // 2. Queue Processing Lag Check
  if (queueMetrics.queueLagSeconds !== null) {
    if (queueMetrics.queueLagSeconds >= thresholds.maxQueueLagCriticalSeconds) {
      hasCritical = true;
      diagnostics.push({
        rule: "QUEUE_LAG_CRITICAL",
        severity: "CRITICAL",
        message: `Queue lag (${queueMetrics.queueLagSeconds}s) reached or exceeded critical threshold of ${thresholds.maxQueueLagCriticalSeconds}s.`,
      });
    } else if (queueMetrics.queueLagSeconds >= thresholds.maxQueueLagWarningSeconds) {
      hasWarning = true;
      diagnostics.push({
        rule: "QUEUE_LAG_WARNING",
        severity: "WARNING",
        message: `Queue lag (${queueMetrics.queueLagSeconds}s) exceeds warning threshold of ${thresholds.maxQueueLagWarningSeconds}s.`,
      });
    }
  }

  // 3. Oldest Eligible Job Age Check
  if (queueMetrics.oldestEligibleQueuedAgeSeconds !== null) {
    if (queueMetrics.oldestEligibleQueuedAgeSeconds >= thresholds.oldestJobAgeCriticalSeconds) {
      hasCritical = true;
      diagnostics.push({
        rule: "OLDEST_JOB_AGE_CRITICAL",
        severity: "CRITICAL",
        message: `Oldest queued job age (${queueMetrics.oldestEligibleQueuedAgeSeconds}s) reached critical threshold of ${thresholds.oldestJobAgeCriticalSeconds}s.`,
      });
    } else if (queueMetrics.oldestEligibleQueuedAgeSeconds >= thresholds.oldestJobAgeWarningSeconds) {
      hasWarning = true;
      diagnostics.push({
        rule: "OLDEST_JOB_AGE_WARNING",
        severity: "WARNING",
        message: `Oldest queued job age (${queueMetrics.oldestEligibleQueuedAgeSeconds}s) exceeds warning threshold of ${thresholds.oldestJobAgeWarningSeconds}s.`,
      });
    }
  }

  // 4. Stale Worker Activity Check (only triggers if queued jobs exist)
  if (queueMetrics.countsByStatus.QUEUED > 0) {
    if (!queueMetrics.lastAttemptedWorkerCycle) {
      hasWarning = true;
      diagnostics.push({
        rule: "NO_OBSERVED_WORKER_CYCLE",
        severity: "WARNING",
        message: `There are ${queueMetrics.countsByStatus.QUEUED} queued jobs, but no worker cycles have been observed.`,
      });
    } else {
      const elapsedSinceWorkerSec = Math.max(
        0,
        (Date.now() - new Date(queueMetrics.lastAttemptedWorkerCycle).getTime()) / 1000
      );

      if (elapsedSinceWorkerSec >= thresholds.staleWorkerCriticalSeconds) {
        hasCritical = true;
        diagnostics.push({
          rule: "STALE_WORKER_CRITICAL",
          severity: "CRITICAL",
          message: `Worker activity is stale (${Math.round(elapsedSinceWorkerSec)}s since last cycle) while ${queueMetrics.countsByStatus.QUEUED} jobs are queued.`,
        });
      } else if (elapsedSinceWorkerSec >= thresholds.staleWorkerWarningSeconds) {
        hasWarning = true;
        diagnostics.push({
          rule: "STALE_WORKER_WARNING",
          severity: "WARNING",
          message: `Worker activity has been idle for ${Math.round(elapsedSinceWorkerSec)}s while jobs remain queued.`,
        });
      }
    }
  }

  // 5. Expired Leases / Abandoned Jobs Check
  if (queueMetrics.expiredLeasesCount > 0) {
    hasWarning = true;
    diagnostics.push({
      rule: "EXPIRED_LEASES_DETECTED",
      severity: "WARNING",
      message: `${queueMetrics.expiredLeasesCount} jobs have expired leases and are awaiting reclamation by the next worker cycle.`,
    });
  }

  // 6. Expired Alerts Still Eligible
  if (notificationMetrics.expiredAlertsEligibleCount > 0) {
    hasWarning = true;
    diagnostics.push({
      rule: "EXPIRED_ALERTS_REMAIN_ELIGIBLE",
      severity: "WARNING",
      message: `${notificationMetrics.expiredAlertsEligibleCount} alerts have passed their expiration timestamp and require EXPIRE_STALE_ALERTS job processing.`,
    });
  }

  // 7. Repeated Delivery Failures
  if (notificationMetrics.repeatedDeliveryFailuresCount > 0) {
    hasWarning = true;
    diagnostics.push({
      rule: "REPEATED_DELIVERY_FAILURES",
      severity: "WARNING",
      message: `${notificationMetrics.repeatedDeliveryFailuresCount} notification deliveries have encountered repeated failures.`,
    });
  }

  // Determine overall status
  let overallStatus: HealthStatus = "HEALTHY";
  if (hasCritical) {
    overallStatus = "DEGRADED";
  } else if (hasWarning) {
    overallStatus = "DEGRADED";
  }

  return {
    overallStatus,
    diagnostics,
  };
}
