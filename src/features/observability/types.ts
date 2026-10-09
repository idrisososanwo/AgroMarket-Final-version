/**
 * AgroMarket Phase 3.18: Platform Observability, Health Checks & Reliability Monitoring
 * Core Domain Types, Enums, Contracts, and Interfaces
 */

import { JobType, JobStatus } from "@/features/background-jobs/types";
import { DeliveryChannel } from "@/features/notifications/types";

// -----------------------------------------------------------------------------
// 1. HEALTH AND STATUS DEFINITIONS
// -----------------------------------------------------------------------------

export const HEALTH_STATUSES = [
  "HEALTHY",
  "DEGRADED",
  "UNAVAILABLE",
  "UNKNOWN",
] as const;

export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export const DEPENDENCY_STATUSES = [
  "HEALTHY",
  "DEGRADED",
  "UNAVAILABLE",
  "UNKNOWN",
] as const;

export type DependencyStatus = (typeof DEPENDENCY_STATUSES)[number];

// -----------------------------------------------------------------------------
// 2. HEALTH CHECK RESULTS
// -----------------------------------------------------------------------------

export interface LivenessCheckResult {
  status: "HEALTHY";
  uptimeSeconds: number;
  timestamp: string;
  service: string;
}

export interface DependencyCheckDetail {
  status: DependencyStatus;
  latencyMs?: number;
  message?: string;
  error?: string;
}

export interface ReadinessCheckResult {
  status: HealthStatus;
  timestamp: string;
  latencyMs: number;
  checks: {
    database: DependencyCheckDetail;
    environment: DependencyCheckDetail;
  };
}

// -----------------------------------------------------------------------------
// 3. CAPABILITIES AND INTEGRATIONS STATUS
// -----------------------------------------------------------------------------

export interface SchedulerCapabilityStatus {
  configured: boolean;
  observedActive: boolean;
  lastObservedRunAt: string | null;
  status: DependencyStatus;
  notes?: string;
}

export interface ExternalProviderStatus {
  channel: DeliveryChannel;
  available: boolean;
  status: "AVAILABLE" | "UNAVAILABLE";
  reason: string;
}

export interface AICapabilityStatus {
  configured: boolean;
  model: string;
  status: "AVAILABLE" | "UNCONFIGURED";
}

export interface SystemCapabilityStatus {
  database: DependencyCheckDetail;
  backgroundWorker: {
    status: DependencyStatus;
    canClaim: boolean;
    lastAttemptedRunAt: string | null;
    lastSuccessfulRunAt: string | null;
  };
  scheduler: SchedulerCapabilityStatus;
  inAppNotifications: {
    status: DependencyStatus;
    available: boolean;
  };
  externalDeliveryProviders: Record<DeliveryChannel, ExternalProviderStatus>;
  aiProvider: AICapabilityStatus;
}

// -----------------------------------------------------------------------------
// 4. QUEUE RELIABILITY METRICS
// -----------------------------------------------------------------------------

export interface QueueReliabilityMetrics {
  countsByStatus: Record<JobStatus, number>;
  countsByType: Record<JobType, number>;
  oldestEligibleQueuedAgeSeconds: number | null; // null if 0 eligible queued jobs
  expiredLeasesCount: number;
  recoverableAbandonedJobsCount: number;
  retryableFailuresCount: number;
  terminalDeadLetterCount: number;
  lastSuccessfulWorkerCycle: string | null;
  lastAttemptedWorkerCycle: string | null;
  queueLagSeconds: number | null; // null if no eligible queued jobs
  batchLimitReached: boolean;
  retryLimitReached: boolean;
}

// -----------------------------------------------------------------------------
// 5. NOTIFICATION & INTELLIGENCE MONITORING METRICS
// -----------------------------------------------------------------------------

export interface NotificationReliabilityMetrics {
  publishedAlertsAwaitingDispatch: number;
  pendingReviewAlertsCount: number; // Operational queue requiring human attention
  expiredAlertsEligibleCount: number; // Alerts requiring expiry transition
  deliveryCountsByChannelAndStatus: Record<string, number>;
  unavailableProviders: DeliveryChannel[];
  repeatedDeliveryFailuresCount: number; // Deliveries with >= 3 attempts that failed
  invalidMetadataAlertsCount: number; // Alerts with invalid provenance/temporal metadata
  staleNotificationProcessing: boolean;
}

// -----------------------------------------------------------------------------
// 6. RELIABILITY THRESHOLDS & EVALUATION
// -----------------------------------------------------------------------------

export interface ReliabilityThresholds {
  maxQueueLagWarningSeconds: number;
  maxQueueLagCriticalSeconds: number;
  oldestJobAgeWarningSeconds: number;
  oldestJobAgeCriticalSeconds: number;
  maxDeadLetterWarning: number;
  maxDeadLetterCritical: number;
  staleWorkerWarningSeconds: number;
  staleWorkerCriticalSeconds: number;
  maxNotificationFailureRate: number;
}

export interface ThresholdDiagnostic {
  rule: string;
  severity: "WARNING" | "CRITICAL";
  message: string;
}

export interface ThresholdEvaluationResult {
  overallStatus: HealthStatus;
  diagnostics: ThresholdDiagnostic[];
}

// -----------------------------------------------------------------------------
// 7. OPERATIONAL DASHBOARD COMPREHENSIVE CONTRACT
// -----------------------------------------------------------------------------

export interface OperationalDashboardData {
  timestamp: string;
  overallStatus: HealthStatus;
  liveness: LivenessCheckResult;
  readiness: ReadinessCheckResult;
  capabilities: SystemCapabilityStatus;
  queueMetrics: QueueReliabilityMetrics;
  notificationMetrics: NotificationReliabilityMetrics;
  thresholdEvaluation: ThresholdEvaluationResult;
  unmeasuredMetrics: string[];
}

// -----------------------------------------------------------------------------
// 8. LOGGING & ERROR CATEGORIZATION
// -----------------------------------------------------------------------------

export const OPERATIONAL_ERROR_CATEGORIES = [
  "TRANSIENT",
  "PERMANENT",
  "DEPENDENCY_UNAVAILABLE",
  "TIMEOUT",
  "INVARIANT_VIOLATION",
  "AUTHORIZATION_FAILURE",
  "CONFIGURATION_MISSING",
] as const;

export type OperationalErrorCategory = (typeof OPERATIONAL_ERROR_CATEGORIES)[number];

export interface OperationalLogEntry {
  traceId: string;
  category: OperationalErrorCategory;
  safeSummary: string;
  workerId?: string;
  jobId?: string;
  timestamp: string;
  durationMs?: number;
  retryable: boolean;
  metadata?: Record<string, unknown>;
}
