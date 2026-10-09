/**
 * AgroMarket Phase 3.18: Platform Observability, Health Checks & Reliability Monitoring Test Suite
 *
 * COVERAGE REQUIREMENTS:
 * 1. Liveness independent of dependency status
 * 2. Readiness with healthy, unhealthy, and timed-out dependencies
 * 3. Safe error responses and bounded health-check execution
 * 4. Authorization for operational metrics and dashboard access
 * 5. Queue metrics, lag, retries, expired leases, and dead-letter counts
 * 6. Missing metrics reported as unknown/null rather than zero
 * 7. Notification status aggregation and provider unavailability
 * 8. Pending-review alerts distinguished from failures (operational queue)
 * 9. Scheduler configured versus actually active
 * 10. Warning threshold behavior
 * 11. Bounded database queries & safe execution wrapper
 * 12. Privacy sanitization, secret redaction & anti-pork invariant preservation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkLiveness,
  checkReadiness,
  checkCapabilities,
} from "../features/observability/health";
import {
  evaluateReliabilityThresholds,
} from "../features/observability/thresholds";
import {
  getQueueReliabilityMetrics,
  getNotificationReliabilityMetrics,
} from "../features/observability/metrics";
import {
  logOperationalEvent,
  safeExecuteMonitored,
} from "../features/observability/logger";
import { ObservabilityService } from "../features/observability/service";
import { getOperationalDashboardAction } from "../features/observability/actions";
import {
  resetInMemoryJobStore,
  seedInMemoryJobs,
  setLastWorkerAttemptTimestamp,
  setLastWorkerSuccessTimestamp,
} from "../features/background-jobs/data-layer";
import {
  resetInMemoryNotificationStore,
  insertDeliveryRecord,
  insertAlertRecord,
} from "../features/notifications/data-layer";
import { BackgroundJob } from "../features/background-jobs/types";
import { AgriculturalIntelligenceAlert } from "../features/notifications/types";

describe("Phase 3.18: Platform Observability, Health Checks & Reliability Monitoring", () => {
  beforeEach(() => {
    resetInMemoryJobStore();
    resetInMemoryNotificationStore();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. LIVENESS INDEPENDENT OF DEPENDENCIES
  // ===========================================================================
  describe("1. Liveness Probes", () => {
    it("reports HEALTHY independent of external dependencies or databases", () => {
      const result = checkLiveness();
      expect(result.status).toBe("HEALTHY");
      expect(typeof result.uptimeSeconds).toBe("number");
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(result.service).toBe("agromarket-core");
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 2. READINESS PROBES & TIMEOUTS
  // ===========================================================================
  describe("2. Readiness Probes & Dependency Verification", () => {
    it("reports readiness when configuration and database are available", async () => {
      const readiness = await checkReadiness();
      expect(readiness.status).toBe("HEALTHY");
      expect(readiness.checks.environment.status).toBe("HEALTHY");
      expect(readiness.checks.database.status).toBe("HEALTHY");
      expect(typeof readiness.latencyMs).toBe("number");
    });

    it("fails readiness safely when required environment configuration is missing", async () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      try {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        const readiness = await checkReadiness();
        expect(readiness.status).toBe("UNAVAILABLE");
        expect(readiness.checks.environment.status).toBe("UNAVAILABLE");
        expect(readiness.checks.environment.message).toContain("missing");
      } finally {
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      }
    });

    it("handles database timeout boundedly without leaking sensitive errors", async () => {
      // Mock a hanging supabase query that exceeds timeout
      const mockHangingSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue(
              new Promise((resolve) => setTimeout(resolve, 5000))
            ),
          }),
        }),
      } as unknown as import("@supabase/supabase-js").SupabaseClient;

      // We use a small timeout test or verify timeout handling logic
      const readinessPromise = checkReadiness(mockHangingSupabase);
      const result = await readinessPromise;
      expect(result.status).toBe("UNAVAILABLE");
      expect(result.checks.database.status).toBe("UNAVAILABLE");
      expect(result.checks.database.error).toBe("Connection timeout");
    });
  });

  // ===========================================================================
  // 3. CAPABILITY ASSESSMENT & SCHEDULER ACTIVITY
  // ===========================================================================
  describe("3. System Capabilities & Scheduler Status", () => {
    const originalCronSecret = process.env.CRON_SECRET;
    const originalSchedulerSecret = process.env.SCHEDULER_SECRET;

    afterEach(() => {
      process.env.CRON_SECRET = originalCronSecret;
      process.env.SCHEDULER_SECRET = originalSchedulerSecret;
    });

    it("reports scheduler UNAVAILABLE when secret is missing from environment", async () => {
      delete process.env.CRON_SECRET;
      delete process.env.SCHEDULER_SECRET;

      const capabilities = await checkCapabilities();
      expect(capabilities.scheduler.configured).toBe(false);
      expect(capabilities.scheduler.observedActive).toBe(false);
      expect(capabilities.scheduler.status).toBe("UNAVAILABLE");
    });

    it("reports scheduler DEGRADED when configured but no worker activity observed yet", async () => {
      process.env.CRON_SECRET = "secret_12345";
      // No worker run set

      const capabilities = await checkCapabilities();
      expect(capabilities.scheduler.configured).toBe(true);
      expect(capabilities.scheduler.observedActive).toBe(false);
      expect(capabilities.scheduler.status).toBe("DEGRADED");
      expect(capabilities.scheduler.notes).toContain("no worker invocations have been observed");
    });

    it("reports scheduler HEALTHY when configured and recent worker cycle observed", async () => {
      process.env.CRON_SECRET = "secret_12345";
      setLastWorkerAttemptTimestamp(new Date().toISOString());

      const capabilities = await checkCapabilities();
      expect(capabilities.scheduler.configured).toBe(true);
      expect(capabilities.scheduler.observedActive).toBe(true);
      expect(capabilities.scheduler.status).toBe("HEALTHY");
    });

    it("reports external delivery channels truthfully as UNAVAILABLE", async () => {
      const capabilities = await checkCapabilities();
      expect(capabilities.inAppNotifications.available).toBe(true);
      expect(capabilities.externalDeliveryProviders.SMS.status).toBe("UNAVAILABLE");
      expect(capabilities.externalDeliveryProviders.WHATSAPP.status).toBe("UNAVAILABLE");
      expect(capabilities.externalDeliveryProviders.EMAIL.status).toBe("UNAVAILABLE");
      expect(capabilities.externalDeliveryProviders.PUSH.status).toBe("UNAVAILABLE");
    });
  });

  // ===========================================================================
  // 4. QUEUE RELIABILITY METRICS & UNKNOWN DISTINCTION
  // ===========================================================================
  describe("4. Queue Metrics & Precision", () => {
    it("reports null rather than zero when no eligible queued jobs exist", async () => {
      const { metrics } = await getQueueReliabilityMetrics();
      expect(metrics.countsByStatus.QUEUED).toBe(0);
      expect(metrics.oldestEligibleQueuedAgeSeconds).toBeNull();
      expect(metrics.queueLagSeconds).toBeNull();
    });

    it("measures queue processing lag and oldest job age accurately for eligible jobs", async () => {
      const now = Date.now();
      const past200s = new Date(now - 200 * 1000).toISOString();
      const past100s = new Date(now - 100 * 1000).toISOString();

      const job: BackgroundJob = {
        id: "job_lag_test",
        jobType: "DISPATCH_APPROVED_ALERT",
        status: "QUEUED",
        priority: 100,
        payload: { alertId: "alert_1" },
        result: null,
        attemptCount: 0,
        maxAttempts: 3,
        runAfter: past100s, // was eligible 100s ago
        idempotencyKey: "key_lag",
        claimedBy: null,
        leaseExpiresAt: null,
        lastErrorCategory: null,
        lastErrorMessage: null,
        createdAt: past200s, // created 200s ago
        startedAt: null,
        completedAt: null,
        failedAt: null,
        metadata: {},
      };

      seedInMemoryJobs([job]);

      const { metrics } = await getQueueReliabilityMetrics();
      expect(metrics.countsByStatus.QUEUED).toBe(1);
      expect(metrics.oldestEligibleQueuedAgeSeconds).toBeGreaterThanOrEqual(195);
      expect(metrics.queueLagSeconds).toBeGreaterThanOrEqual(95);
    });

    it("accurately counts expired leases on running jobs", async () => {
      const pastLease = new Date(Date.now() - 60 * 1000).toISOString();
      const job: BackgroundJob = {
        id: "job_expired_lease",
        jobType: "RETRY_NOTIFICATION_DELIVERY",
        status: "RUNNING",
        priority: 50,
        payload: { notificationId: "notif_1" },
        result: null,
        attemptCount: 1,
        maxAttempts: 3,
        runAfter: new Date().toISOString(),
        idempotencyKey: null,
        claimedBy: "crashed_worker",
        leaseExpiresAt: pastLease,
        lastErrorCategory: null,
        lastErrorMessage: null,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: null,
        failedAt: null,
        metadata: {},
      };

      seedInMemoryJobs([job]);

      const { metrics } = await getQueueReliabilityMetrics();
      expect(metrics.countsByStatus.RUNNING).toBe(1);
      expect(metrics.expiredLeasesCount).toBe(1);
      expect(metrics.recoverableAbandonedJobsCount).toBe(1);
    });

    it("tracks retryable versus terminal dead letter failures", async () => {
      const failedRetryable: BackgroundJob = {
        id: "job_failed_transient",
        jobType: "DISPATCH_APPROVED_ALERT",
        status: "FAILED",
        priority: 100,
        payload: { alertId: "alert_1" },
        result: null,
        attemptCount: 1,
        maxAttempts: 3,
        runAfter: new Date().toISOString(),
        idempotencyKey: null,
        claimedBy: null,
        leaseExpiresAt: null,
        lastErrorCategory: "TRANSIENT",
        lastErrorMessage: "Temporary connection error",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        failedAt: new Date().toISOString(),
        metadata: {},
      };

      const deadLetterJob: BackgroundJob = {
        id: "job_dead_letter",
        jobType: "REFRESH_MARKET_INTELLIGENCE",
        status: "DEAD_LETTER",
        priority: 10,
        payload: { commodity: "MAIZE", state: "Kano" },
        result: null,
        attemptCount: 3,
        maxAttempts: 3,
        runAfter: new Date().toISOString(),
        idempotencyKey: null,
        claimedBy: null,
        leaseExpiresAt: null,
        lastErrorCategory: "PERMANENT",
        lastErrorMessage: "Exhausted retries",
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        failedAt: new Date().toISOString(),
        metadata: {},
      };

      seedInMemoryJobs([failedRetryable, deadLetterJob]);

      const { metrics } = await getQueueReliabilityMetrics();
      expect(metrics.retryableFailuresCount).toBe(1);
      expect(metrics.terminalDeadLetterCount).toBe(1);
    });
  });

  // ===========================================================================
  // 5. NOTIFICATION & ALERT MONITORING
  // ===========================================================================
  describe("5. Notification Monitoring & Human Review Queues", () => {
    it("distinguishes pending-review alerts as operational queue, not system error", async () => {
      const pendingAlert = {
        id: "alert_pending_1",
        title: "High Price Alert",
        summary: "Maize prices increasing in Dawanau market",
        category: "PRICE_CHANGE",
        severity: "HIGH",
        publicationStatus: "PENDING_REVIEW", // Requires human action
        channels: ["IN_APP"],
        targetAudience: {},
        sourceEntityType: "OBSERVATION",
        sourceReference: "ref_1",
        sourceProvenance: { sourceType: "COMMUNITY_SURVEY", observationCount: 10 },
        confidenceLevel: "HIGH",
        confidenceScore: 0.9,
        isHistorical: false,
        hasConflicts: false,
        requiresHumanReview: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      } as unknown as AgriculturalIntelligenceAlert;

      await insertAlertRecord(null, pendingAlert);

      const { metrics } = await getNotificationReliabilityMetrics();
      expect(metrics.pendingReviewAlertsCount).toBe(1);

      // Verify threshold evaluation does NOT treat pending human review as a failure
      const queueMetrics = (await getQueueReliabilityMetrics()).metrics;
      const evaluation = evaluateReliabilityThresholds(queueMetrics, metrics);
      expect(evaluation.overallStatus).toBe("HEALTHY");
      expect(evaluation.diagnostics.some((d) => d.severity === "CRITICAL")).toBe(false);
    });

    it("flags expired alerts remaining in PUBLISHED state for cleanup", async () => {
      const expiredAlert = {
        id: "alert_expired_1",
        title: "Stale Price Notice",
        summary: "Notice past valid date",
        category: "PRICE_CHANGE",
        severity: "INFO",
        publicationStatus: "PUBLISHED",
        channels: ["IN_APP"],
        targetAudience: {},
        sourceEntityType: "OBSERVATION",
        sourceReference: "ref_2",
        sourceProvenance: { sourceType: "HISTORICAL_RECORD", observationCount: 5 },
        confidenceLevel: "MEDIUM",
        confidenceScore: 0.7,
        isHistorical: true,
        hasConflicts: false,
        requiresHumanReview: false,
        createdAt: new Date(Date.now() - 100000).toISOString(),
        updatedAt: new Date(Date.now() - 100000).toISOString(),
        expiresAt: new Date(Date.now() - 10000).toISOString(), // expired 10s ago
      } as unknown as AgriculturalIntelligenceAlert;

      await insertAlertRecord(null, expiredAlert);

      const { metrics } = await getNotificationReliabilityMetrics();
      expect(metrics.expiredAlertsEligibleCount).toBe(1);
      expect(metrics.staleNotificationProcessing).toBe(true);

      const queueMetrics = (await getQueueReliabilityMetrics()).metrics;
      const evaluation = evaluateReliabilityThresholds(queueMetrics, metrics);
      expect(evaluation.diagnostics.some((d) => d.rule === "EXPIRED_ALERTS_REMAIN_ELIGIBLE")).toBe(true);
    });

    it("tracks repeated delivery failures with >= 3 attempts", async () => {
      await insertDeliveryRecord(null, {
        id: "del_failed_repeated",
        notificationId: "notif_failed",
        userId: "user_1",
        channel: "SMS",
        deliveryStatus: "FAILED",
        attemptCount: 3,
        errorCode: "PROVIDER_UNAVAILABLE",
        errorMessage: "SMS provider not configured",
        createdAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
      });

      const { metrics } = await getNotificationReliabilityMetrics();
      expect(metrics.repeatedDeliveryFailuresCount).toBe(1);
    });
  });

  // ===========================================================================
  // 6. RELIABILITY THRESHOLDS & STATUS SYNTHESIS
  // ===========================================================================
  describe("6. Reliability Thresholds & Diagnostic Warnings", () => {
    it("degrades status when dead letters exceed warning threshold", () => {
      const queueMetrics: import("../features/observability/types").QueueReliabilityMetrics = {
        countsByStatus: { QUEUED: 0, RUNNING: 0, SUCCEEDED: 10, FAILED: 1, DEAD_LETTER: 2 },
        countsByType: {
          DISPATCH_APPROVED_ALERT: 0,
          RETRY_NOTIFICATION_DELIVERY: 0,
          EXPIRE_STALE_ALERTS: 0,
          REFRESH_MARKET_INTELLIGENCE: 0,
          RECONCILE_SUPPLY_FULFILMENT: 0,
        },
        oldestEligibleQueuedAgeSeconds: null,
        expiredLeasesCount: 0,
        recoverableAbandonedJobsCount: 0,
        retryableFailuresCount: 0,
        terminalDeadLetterCount: 2,
        lastSuccessfulWorkerCycle: new Date().toISOString(),
        lastAttemptedWorkerCycle: new Date().toISOString(),
        queueLagSeconds: null,
        batchLimitReached: false,
        retryLimitReached: true,
      };

      const notifMetrics: import("../features/observability/types").NotificationReliabilityMetrics = {
        publishedAlertsAwaitingDispatch: 0,
        pendingReviewAlertsCount: 0,
        expiredAlertsEligibleCount: 0,
        deliveryCountsByChannelAndStatus: {},
        unavailableProviders: [],
        repeatedDeliveryFailuresCount: 0,
        invalidMetadataAlertsCount: 0,
        staleNotificationProcessing: false,
      };

      const evalResult = evaluateReliabilityThresholds(queueMetrics, notifMetrics);
      expect(evalResult.overallStatus).toBe("DEGRADED");
      expect(evalResult.diagnostics.some((d) => d.rule === "DEAD_LETTER_WARNING")).toBe(true);
    });

    it("triggers critical diagnostic when queue lag exceeds 900 seconds", () => {
      const queueMetrics: import("../features/observability/types").QueueReliabilityMetrics = {
        countsByStatus: { QUEUED: 5, RUNNING: 0, SUCCEEDED: 10, FAILED: 0, DEAD_LETTER: 0 },
        countsByType: {
          DISPATCH_APPROVED_ALERT: 5,
          RETRY_NOTIFICATION_DELIVERY: 0,
          EXPIRE_STALE_ALERTS: 0,
          REFRESH_MARKET_INTELLIGENCE: 0,
          RECONCILE_SUPPLY_FULFILMENT: 0,
        },
        oldestEligibleQueuedAgeSeconds: 1200,
        expiredLeasesCount: 0,
        recoverableAbandonedJobsCount: 0,
        retryableFailuresCount: 0,
        terminalDeadLetterCount: 0,
        lastSuccessfulWorkerCycle: new Date().toISOString(),
        lastAttemptedWorkerCycle: new Date().toISOString(),
        queueLagSeconds: 1200, // 20 minutes
        batchLimitReached: false,
        retryLimitReached: false,
      };

      const notifMetrics: import("../features/observability/types").NotificationReliabilityMetrics = {
        publishedAlertsAwaitingDispatch: 0,
        pendingReviewAlertsCount: 0,
        expiredAlertsEligibleCount: 0,
        deliveryCountsByChannelAndStatus: {},
        unavailableProviders: [],
        repeatedDeliveryFailuresCount: 0,
        invalidMetadataAlertsCount: 0,
        staleNotificationProcessing: false,
      };

      const evalResult = evaluateReliabilityThresholds(queueMetrics, notifMetrics);
      expect(evalResult.overallStatus).toBe("DEGRADED");
      expect(evalResult.diagnostics.some((d) => d.rule === "QUEUE_LAG_CRITICAL")).toBe(true);
    });
  });

  // ===========================================================================
  // 7. PRIVACY SANITIZATION, ANTI-PORK & FAILSAFE LOGGING
  // ===========================================================================
  describe("7. Security, Privacy & Failsafe Logging", () => {
    it("sanitizes API keys, secrets, and JWT tokens from operational log summaries", () => {
      const entry = logOperationalEvent({
        category: "TRANSIENT",
        safeSummary: "Connection failed with apiKey=AIzaSyA87384728 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        retryable: true,
      });

      expect(entry.safeSummary).not.toContain("AIzaSyA87384728");
      expect(entry.safeSummary).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(entry.safeSummary).toContain("[REDACTED]");
    });

    it("rejects prohibited porcine terms in operational log summaries", () => {
      const entry = logOperationalEvent({
        category: "PERMANENT",
        safeSummary: "Attempted to process pork commodity update",
        retryable: false,
      });

      expect(entry.category).toBe("INVARIANT_VIOLATION");
      expect(entry.safeSummary).toContain("[ANTI_PORK_VIOLATION]");
    });

    it("safeExecuteMonitored guarantees monitoring errors never crash underlying business operations", async () => {
      const buggyMonitoringOperation = async () => {
        throw new Error("Monitoring database disconnect");
      };

      const fallback = { safe: true };
      const result = await safeExecuteMonitored("testOperation", buggyMonitoringOperation, fallback);

      expect(result).toEqual({ safe: true });
    });
  });

  // ===========================================================================
  // 8. OBSERVABILITY SERVICE & DASHBOARD INTEGRATION
  // ===========================================================================
  describe("8. Observability Service Facade", () => {
    it("assembles complete, read-only operational dashboard data", async () => {
      setLastWorkerAttemptTimestamp(new Date().toISOString());
      setLastWorkerSuccessTimestamp(new Date().toISOString());

      const data = await ObservabilityService.getOperationalDashboardData();

      expect(data).toBeDefined();
      expect(data.liveness.status).toBe("HEALTHY");
      expect(data.readiness.status).toBe("HEALTHY");
      expect(data.capabilities.inAppNotifications.available).toBe(true);
      expect(data.queueMetrics).toBeDefined();
      expect(data.notificationMetrics).toBeDefined();
      expect(data.thresholdEvaluation).toBeDefined();
      expect(Array.isArray(data.unmeasuredMetrics)).toBe(true);
    });

    it("restricts operational dashboard server action strictly to authenticated administrators", async () => {
      // Unauthenticated caller simulation
      const result = await getOperationalDashboardAction();
      // Since current test runner is unauthenticated, requireRole fails closed
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
