/**
 * AgroMarket Phase 3.17: Background Processing, Scheduled Jobs & Retry Foundation Tests
 * Comprehensive Verification Suite
 *
 * 1. Payload Schema & Job-Type Allowlists
 * 2. Zero-Tolerance Anti-Pork Invariant
 * 3. Atomic Claiming, Leases & Abandoned Job Recovery
 * 4. Idempotency & Duplicate Prevention
 * 5. State Machine Lifecycle & Transitions
 * 6. Retry Mechanics, Bounded Backoff & Max Attempts
 * 7. Approved vs Unapproved Alert Dispatch (Phase 3.16 Integration)
 * 8. Notification Retry & Stale Alerts Expiry
 * 9. Scheduler Authentication & Fail-Closed Guard
 * 10. Privacy, Safe Error Sanitization & Governance Guardrails
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  BACKGROUND_JOB_TYPES,
  QueueJobInput,
} from "../features/background-jobs/types";
import {
  queueJobInputSchema,
  assertNoProhibitedProduceBackgroundJob,
  categorizeError,
  sanitizeErrorMessage,
} from "../features/background-jobs/validation";
import {
  calculateBackoffDelaySeconds,
} from "../features/background-jobs/backoff";
import {
  resetInMemoryJobStore,
  getInMemoryJobs,
  enqueueJob,
  claimJobs,
  failJob,
  retryFailedJob,
} from "../features/background-jobs/data-layer";
import {
  validateSchedulerAuthentication,
  runScheduledJobCycle,
} from "../features/background-jobs/scheduler";
import { BackgroundJobService } from "../features/background-jobs/service";
import {
  isValidJobStatusTransition,
} from "../features/background-jobs/constants";
import {
  resetInMemoryNotificationStore,
  seedInMemoryCandidateUsers,
  getInMemoryNotificationStore,
  insertDeliveryRecord,
} from "../features/notifications/data-layer";
import { resetDeliveryProviders } from "../features/notifications/delivery-providers";
import { ingestAlertEvent } from "../features/notifications/alert-pipeline";
import { IngestAlertEventInput, CandidateUser } from "../features/notifications/types";

describe("AgroMarket Phase 3.17: Background Processing & Retry Foundation", () => {
  const sampleUsers: CandidateUser[] = [
    {
      userId: "user-farmer-kaduna",
      role: "FARMER",
      state: "Kaduna",
      lga: "Zaria",
      preferences: {
        userId: "user-farmer-kaduna",
        enabledCategories: ["PRICE_CHANGE", "PRODUCTION_GUIDANCE"],
        monitoredCommodities: ["Maize", "Sorghum"],
        monitoredStates: ["Kaduna", "Kano"],
        minimumSeverity: "LOW",
        preferredChannels: ["IN_APP", "SMS"],
        quietHoursEnabled: false,
      },
    },
    {
      userId: "user-trader-kano",
      role: "BUYER",
      state: "Kano",
      lga: "Dambatta",
      preferences: {
        userId: "user-trader-kano",
        enabledCategories: ["PRICE_CHANGE"],
        monitoredCommodities: ["Maize"],
        monitoredStates: ["Kano"],
        minimumSeverity: "MEDIUM",
        preferredChannels: ["IN_APP"],
        quietHoursEnabled: true,
        quietHoursStartUtc: "21:00",
        quietHoursEndUtc: "05:00",
      },
    },
  ];

  beforeEach(() => {
    resetInMemoryJobStore();
    resetInMemoryNotificationStore();
    resetDeliveryProviders();
    seedInMemoryCandidateUsers(sampleUsers);
  });

  // ===========================================================================
  // 1. PAYLOAD SCHEMA & JOB-TYPE ALLOWLISTS
  // ===========================================================================
  describe("1. Payload Schema & Job-Type Allowlists", () => {
    it("accepts valid job enqueueing requests for all allowed job types", () => {
      for (const jobType of BACKGROUND_JOB_TYPES) {
        const input: QueueJobInput = {
          jobType,
          payload: { testKey: "testValue" },
          priority: 50,
          maxAttempts: 3,
        };
        const parsed = queueJobInputSchema.safeParse(input);
        expect(parsed.success).toBe(true);
      }
    });

    it("rejects unlisted or fabricated job types", () => {
      const input = {
        jobType: "AUTONOMOUS_BANK_TRANSFER",
        payload: { amount: 10000 },
      };
      const parsed = queueJobInputSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });

    it("rejects jobs exceeding maximum allowed attempts ceiling", () => {
      const input: QueueJobInput = {
        jobType: "EXPIRE_STALE_ALERTS",
        payload: {},
        maxAttempts: 99, // Exceeds ABSOLUTE_MAX_ATTEMPTS (10)
      };
      const parsed = queueJobInputSchema.safeParse(input);
      expect(parsed.success).toBe(false);
    });
  });

  // ===========================================================================
  // 2. ZERO-TOLERANCE ANTI-PORK INVARIANT
  // ===========================================================================
  describe("2. Zero-Tolerance Anti-Pork Invariant", () => {
    it("rejects jobs with prohibited pork/swine terms in payload", () => {
      expect(() => {
        assertNoProhibitedProduceBackgroundJob({
          commodity: "Pork sausages",
        });
      }).toThrow(/\[ANTI_PORK_VIOLATION\]/);
    });

    it("rejects jobs with swine or bacon in nested metadata", () => {
      expect(() => {
        assertNoProhibitedProduceBackgroundJob({
          tags: ["livestock", "bacon", "processing"],
        });
      }).toThrow(/\[ANTI_PORK_VIOLATION\]/);
    });

    it("refuses to enqueue jobs containing prohibited pork produce", async () => {
      await expect(
        enqueueJob({
          jobType: "REFRESH_MARKET_INTELLIGENCE",
          payload: { commodity: "pig feed", state: "Oyo" },
        })
      ).rejects.toThrow(/\[ANTI_PORK_VIOLATION\]/);
    });

    it("categorizes anti-pork violations as unretryable INVARIANT_VIOLATION", () => {
      const error = new Error("[ANTI_PORK_VIOLATION] Prohibited swine detected");
      const result = categorizeError(error);
      expect(result.category).toBe("INVARIANT_VIOLATION");
      expect(result.retryable).toBe(false);
    });
  });

  // ===========================================================================
  // 3. ATOMIC CLAIMING, LEASES & RECOVERY
  // ===========================================================================
  describe("3. Atomic Claiming, Leases & Recovery", () => {
    it("claims queued jobs up to requested batch size in priority order", async () => {
      await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: {},
        priority: 20,
      });
      await enqueueJob({
        jobType: "DISPATCH_APPROVED_ALERT",
        payload: { alertId: crypto.randomUUID() },
        priority: 80,
      });

      const claimed = await claimJobs({
        workerId: "worker-1",
        batchSize: 5,
      });

      expect(claimed.length).toBe(2);
      expect(claimed[0].jobType).toBe("DISPATCH_APPROVED_ALERT"); // Priority 80 first
      expect(claimed[1].jobType).toBe("EXPIRE_STALE_ALERTS"); // Priority 20 second
      expect(claimed[0].status).toBe("RUNNING");
      expect(claimed[0].claimedBy).toBe("worker-1");
      expect(claimed[0].leaseExpiresAt).toBeDefined();
    });

    it("prevents second worker from claiming currently leased running jobs", async () => {
      await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: {},
      });

      const worker1Claimed = await claimJobs({ workerId: "worker-1", batchSize: 10 });
      expect(worker1Claimed.length).toBe(1);

      // Worker 2 attempts to claim
      const worker2Claimed = await claimJobs({ workerId: "worker-2", batchSize: 10 });
      expect(worker2Claimed.length).toBe(0); // Nothing available
    });

    it("reclaims abandoned running jobs whose lease has expired", async () => {
      const job = await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: {},
      });

      // Claim job with worker 1
      await claimJobs({ workerId: "worker-1", batchSize: 1 });

      // Simulate lease expiration (abandoned worker)
      job.leaseExpiresAt = new Date(Date.now() - 5000).toISOString(); // 5s in past

      // Worker 2 should now safely reclaim the abandoned job
      const recovered = await claimJobs({ workerId: "worker-2", batchSize: 1 });
      expect(recovered.length).toBe(1);
      expect(recovered[0].id).toBe(job.id);
      expect(recovered[0].claimedBy).toBe("worker-2");
      expect(recovered[0].attemptCount).toBe(2);
    });

    it("does not claim future scheduled jobs until runAfter time has passed", async () => {
      const futureTime = new Date(Date.now() + 3600000); // 1 hour ahead
      await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: {},
        runAfter: futureTime,
      });

      const claimed = await claimJobs({ workerId: "worker-1", batchSize: 10 });
      expect(claimed.length).toBe(0);
    });
  });

  // ===========================================================================
  // 4. IDEMPOTENCY & DUPLICATE PREVENTION
  // ===========================================================================
  describe("4. Idempotency & Duplicate Prevention", () => {
    it("returns existing job without duplicate insertion on duplicate idempotency key", async () => {
      const job1 = await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: { batchLimit: 50 },
        idempotencyKey: "unique-key-101",
      });

      const job2 = await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: { batchLimit: 100 },
        idempotencyKey: "unique-key-101",
      });

      expect(job2.id).toBe(job1.id);
      expect(getInMemoryJobs().length).toBe(1);
    });
  });

  // ===========================================================================
  // 5. LIFECYCLE & STATE TRANSITIONS
  // ===========================================================================
  describe("5. Lifecycle & State Transitions", () => {
    it("validates permissible lifecycle status transitions", () => {
      expect(isValidJobStatusTransition("QUEUED", "RUNNING")).toBe(true);
      expect(isValidJobStatusTransition("RUNNING", "SUCCEEDED")).toBe(true);
      expect(isValidJobStatusTransition("RUNNING", "FAILED")).toBe(true);
      expect(isValidJobStatusTransition("RUNNING", "DEAD_LETTER")).toBe(true);
      expect(isValidJobStatusTransition("FAILED", "QUEUED")).toBe(true); // Admin retry
      expect(isValidJobStatusTransition("SUCCEEDED", "RUNNING")).toBe(false); // Terminal
    });

    it("allows administrators to retry a failed job", async () => {
      const job = await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: {},
      });

      await failJob(job.id, "PERMANENT", "Fatal error", false);
      expect(job.status).toBe("FAILED");

      const retried = await retryFailedJob(job.id);
      expect(retried).toBe(true);
      expect(job.status).toBe("QUEUED");
      expect(job.failedAt).toBeNull();
    });
  });

  // ===========================================================================
  // 6. RETRY MECHANICS & BOUNDED BACKOFF
  // ===========================================================================
  describe("6. Retry Mechanics & Bounded Backoff", () => {
    it("calculates exponential backoff within configured bounds", () => {
      const delay1 = calculateBackoffDelaySeconds(1, { baseSeconds: 5, disableJitter: true });
      const delay2 = calculateBackoffDelaySeconds(2, { baseSeconds: 5, disableJitter: true });
      const delay3 = calculateBackoffDelaySeconds(3, { baseSeconds: 5, disableJitter: true });

      expect(delay1).toBe(5); // 5 * 2^0
      expect(delay2).toBe(10); // 5 * 2^1
      expect(delay3).toBe(20); // 5 * 2^2
    });

    it("caps backoff delay at maxSeconds ceiling", () => {
      const delay = calculateBackoffDelaySeconds(15, {
        baseSeconds: 5,
        maxSeconds: 300,
        disableJitter: true,
      });
      expect(delay).toBe(300);
    });

    it("transitions to DEAD_LETTER when maximum attempts ceiling is reached", async () => {
      const job = await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: {},
        maxAttempts: 2,
      });

      job.attemptCount = 2; // Second attempt
      await failJob(job.id, "TRANSIENT", "Network blip", false);

      expect(job.status).toBe("DEAD_LETTER");
    });
  });

  // ===========================================================================
  // 7. APPROVED ALERT DISPATCH (PHASE 3.16 INTEGRATION)
  // ===========================================================================
  describe("7. Approved Alert Dispatch (Phase 3.16 Integration)", () => {
    it("successfully dispatches an approved PUBLISHED alert to matching recipients", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "LOW",
        title: "Maize price drop in Kaduna",
        message: "Wholesale grain market down 5%.",
        idempotencyKey: "bg-alert-001",
      };

      const ingestResult = await ingestAlertEvent(alertInput);
      expect(ingestResult.success).toBe(true);
      expect(ingestResult.publicationStatus).toBe("PUBLISHED");

      const job = await BackgroundJobService.scheduleAlertDispatch(ingestResult.alertId);
      expect(job.jobType).toBe("DISPATCH_APPROVED_ALERT");

      const workerResult = await BackgroundJobService.processQueue({ batchSize: 5 });
      expect(workerResult.succeededCount).toBe(1);

      const store = getInMemoryNotificationStore();
      const userNotifs = store.notifications.filter((n) => n.alertId === ingestResult.alertId);
      expect(userNotifs.length).toBeGreaterThan(0);
      expect(userNotifs[0].title).toBe("Maize price drop in Kaduna");
    });

    it("refuses to dispatch PENDING_REVIEW alert and fails permanently", async () => {
      // Create high-severity biosecurity alert (requires review)
      const alertInput: IngestAlertEventInput = {
        category: "DISEASE_BIOSECURITY_ADVISORY",
        severity: "HIGH",
        title: "Suspected Newcastle disease advisory",
        message: "Report respiratory symptoms in poultry to local desk.",
        idempotencyKey: "bg-alert-002",
      };

      const ingestResult = await ingestAlertEvent(alertInput);
      expect(ingestResult.publicationStatus).toBe("PENDING_REVIEW");

      await BackgroundJobService.scheduleAlertDispatch(ingestResult.alertId);
      const workerResult = await BackgroundJobService.processQueue({ batchSize: 5 });

      expect(workerResult.failedCount).toBe(1);
      expect(workerResult.errors[0].message).toContain("Only PUBLISHED alerts may be dispatched");
    });

    it("refuses to dispatch an alert that has already expired", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "LOW",
        title: "Historic flash update",
        message: "Old pricing update.",
        idempotencyKey: "bg-alert-003",
      };

      const ingestResult = await ingestAlertEvent(alertInput);
      ingestResult.alert.expiresAt = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

      await BackgroundJobService.scheduleAlertDispatch(ingestResult.alertId);
      const workerResult = await BackgroundJobService.processQueue({ batchSize: 5 });

      expect(workerResult.failedCount).toBe(1);
      expect(workerResult.errors[0].message).toContain("expired");
    });

    it("honors honest UNAVAILABLE status on external channels during alert dispatch", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "LOW",
        title: "Grain price bulletin",
        message: "Regional index published.",
        idempotencyKey: "bg-alert-004",
      };

      const ingestResult = await ingestAlertEvent(alertInput);
      await BackgroundJobService.scheduleAlertDispatch(ingestResult.alertId);
      await BackgroundJobService.processQueue();

      const store = getInMemoryNotificationStore();
      const smsDelivery = store.deliveries.find((d) => d.channel === "SMS");
      if (smsDelivery) {
        expect(smsDelivery.deliveryStatus).toBe("UNAVAILABLE");
        expect(smsDelivery.errorCode).toBe("PROVIDER_UNAVAILABLE");
      }
    });
  });

  // ===========================================================================
  // 8. NOTIFICATION RETRY & STALE ALERTS EXPIRY
  // ===========================================================================
  describe("8. Notification Retry & Stale Alerts Expiry", () => {
    it("transitions past-expiry alerts to EXPIRED without altering observations", async () => {
      const alertInput: IngestAlertEventInput = {
        category: "PRICE_CHANGE",
        severity: "LOW",
        title: "Short-lived promotion alert",
        message: "Special pricing today.",
        idempotencyKey: "bg-alert-005",
      };

      const ingestResult = await ingestAlertEvent(alertInput);
      // Simulate alert expiring
      ingestResult.alert.expiresAt = new Date(Date.now() - 10000).toISOString();

      await BackgroundJobService.scheduleAlertExpiryCheck();
      const workerResult = await BackgroundJobService.processQueue();

      expect(workerResult.succeededCount).toBe(1);
      expect(ingestResult.alert.publicationStatus).toBe("EXPIRED");
    });

    it("retries a transient notification delivery", async () => {
      const notifId = crypto.randomUUID();
      await insertDeliveryRecord(null, {
        id: crypto.randomUUID(),
        notificationId: notifId,
        userId: "user-farmer-kaduna",
        channel: "IN_APP",
        deliveryStatus: "FAILED",
        attemptCount: 1,
        lastAttemptAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      await BackgroundJobService.scheduleNotificationRetry(notifId, "IN_APP");
      const workerResult = await BackgroundJobService.processQueue();

      expect(workerResult.succeededCount).toBe(1);
      const store = getInMemoryNotificationStore();
      const delivery = store.deliveries.find((d) => d.notificationId === notifId);
      expect(delivery?.deliveryStatus).toBe("DELIVERED");
      expect(delivery?.attemptCount).toBe(2);
    });
  });

  // ===========================================================================
  // 9. SCHEDULER AUTHENTICATION & SECURITY
  // ===========================================================================
  describe("9. Scheduler Authentication & Security", () => {
    const originalSecret = process.env.CRON_SECRET;

    beforeEach(() => {
      process.env.CRON_SECRET = "test-secret-key-12345";
    });

    afterEach(() => {
      process.env.CRON_SECRET = originalSecret;
    });

    it("authorizes valid Bearer cron secret header", () => {
      const validation = validateSchedulerAuthentication("Bearer test-secret-key-12345");
      expect(validation.authorized).toBe(true);
    });

    it("authorizes direct matching raw secret header", () => {
      const validation = validateSchedulerAuthentication("test-secret-key-12345");
      expect(validation.authorized).toBe(true);
    });

    it("fails closed on missing authentication header", () => {
      const validation = validateSchedulerAuthentication(null);
      expect(validation.authorized).toBe(false);
      expect(validation.reason).toContain("Missing");
    });

    it("fails closed on mismatched authentication secret", () => {
      const validation = validateSchedulerAuthentication("Bearer wrong-token");
      expect(validation.authorized).toBe(false);
      expect(validation.reason).toContain("Invalid");
    });

    it("fails closed if server secret is unconfigured in environment", () => {
      delete process.env.CRON_SECRET;
      delete process.env.SCHEDULER_SECRET;

      const validation = validateSchedulerAuthentication("Bearer some-token");
      expect(validation.authorized).toBe(false);
      expect(validation.reason).toContain("not configured");
    });

    it("rejects unauthenticated scheduled cycle invocation", async () => {
      process.env.CRON_SECRET = "test-secret-key-12345";
      await expect(
        runScheduledJobCycle({ authHeaderOrSecret: "wrong-token" })
      ).rejects.toThrow(/\[SCHEDULER_AUTH_FAILED\]/);
    });
  });

  // ===========================================================================
  // 10. PRIVACY, SANITIZATION & METRICS
  // ===========================================================================
  describe("10. Privacy, Sanitization & Operational Metrics", () => {
    it("redacts sensitive bearer tokens and passwords in error messages", () => {
      const raw = "Connection failed with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and secret=supersecretpassword";
      const sanitized = sanitizeErrorMessage(raw);
      expect(sanitized).toContain("Bearer [REDACTED]");
      expect(sanitized).toContain("secret=[REDACTED]");
      expect(sanitized).not.toContain("supersecretpassword");
    });

    it("accurately reports queue operational metrics", async () => {
      await enqueueJob({ jobType: "EXPIRE_STALE_ALERTS", payload: {} });
      await enqueueJob({ jobType: "REFRESH_MARKET_INTELLIGENCE", payload: { commodity: "Maize", state: "Kano" } });

      const metrics = await BackgroundJobService.getMetrics();
      expect(metrics.totalQueued).toBe(2);
      expect(metrics.totalRunning).toBe(0);
      expect(metrics.countsByType.EXPIRE_STALE_ALERTS).toBe(1);
      expect(metrics.countsByType.REFRESH_MARKET_INTELLIGENCE).toBe(1);
    });
  });
});
