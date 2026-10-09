/**
 * AgroMarket Phase 3.18: Observability Constants & Default Thresholds
 */

import { ReliabilityThresholds } from "./types";

export const HEALTH_CHECK_TIMEOUT_MS = 3000;
export const METRICS_QUERY_TIMEOUT_MS = 5000;
export const BOUNDED_METRICS_QUERY_LIMIT = 100;

export const DEFAULT_RELIABILITY_THRESHOLDS: ReliabilityThresholds = {
  maxQueueLagWarningSeconds: 300,       // 5 minutes
  maxQueueLagCriticalSeconds: 900,      // 15 minutes
  oldestJobAgeWarningSeconds: 600,      // 10 minutes
  oldestJobAgeCriticalSeconds: 1800,    // 30 minutes
  maxDeadLetterWarning: 1,              // > 0 dead letters triggers warning
  maxDeadLetterCritical: 10,            // >= 10 dead letters triggers critical
  staleWorkerWarningSeconds: 900,       // 15 minutes with no worker execution while queued
  staleWorkerCriticalSeconds: 3600,     // 1 hour with no worker execution while queued
  maxNotificationFailureRate: 0.10,     // 10% delivery failure rate
};
