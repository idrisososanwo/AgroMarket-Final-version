/**
 * AgroMarket Phase 3.21: Production Integration & Operational Activation Tests
 * 
 * Validates:
 * 1. Queue Backend Selection, Concurrency Leases & Idempotency
 * 2. Worker Lifecycle, Bounded Retries & Dead-Letter Observability
 * 3. Scheduler Authentication & Invocation Tracking
 * 4. Readiness Evidence Timestamps & Provider Environment Modes
 * 5. Payment Webhook Security & Idempotency Journaling
 * 6. Notification Provider Truthfulness (In-App vs External Gateways)
 * 7. Privacy, Secret Redaction & Safe Missing Credential Handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  enqueueJob,
  claimJobs,
  resetInMemoryJobStore,
  getInMemoryJobs,
  getLastWorkerAttemptTimestamp,
  getLastWorkerSuccessTimestamp,
} from "@/features/background-jobs/data-layer";
import { BackgroundJobWorker } from "@/features/background-jobs/worker";
import {
  validateSchedulerAuthentication,
  runScheduledJobCycle,
} from "@/features/background-jobs/scheduler";
import { sanitizeErrorMessage } from "@/features/background-jobs/validation";
import { generateProductionReadinessReport } from "@/features/observability/readiness-report";
import { inspectEnvironmentReadiness } from "@/config/env";
import {
  getDeliveryProvider,
  InAppDeliveryProvider,
  UnavailableDeliveryProvider,
} from "@/features/notifications/delivery-providers";
import { POST as paystackWebhookHandler } from "@/app/api/webhooks/paystack/route";
import { POST as flutterwaveWebhookHandler } from "@/app/api/webhooks/flutterwave/route";
import { resetPaymentProviders } from "@/features/payments/providers";
import { PaymentService } from "@/features/payments/service";

// Mock Supabase admin client for isolated tests
const mockAdminFrom = vi.fn();
const mockAdminRpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => mockAdminFrom(table),
    rpc: (fn: string, args: unknown) => mockAdminRpc(fn, args),
  }),
}));

// Mock Audit Logger
const mockRecordAuditLog = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/audit", () => ({
  recordAuditLog: (entry: unknown) => mockRecordAuditLog(entry),
}));

describe("AgroMarket Phase 3.21: Production Integration & Operational Activation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    resetInMemoryJobStore();
    resetPaymentProviders();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetPaymentProviders();
  });

  // =========================================================================
  // 1. QUEUE BACKEND SELECTION, LEASE LOCKING & IDEMPOTENCY
  // =========================================================================
  describe("1. Queue Backend, Concurrency Leases & Idempotency", () => {
    it("falls back to in-memory store when Supabase client is not available", async () => {
      // In test environment without DB credentials, enqueue and claim use in-memory store
      const job = await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: { batchLimit: 50 },
        priority: 10,
      });

      expect(job.id).toBeDefined();
      expect(job.status).toBe("QUEUED");

      const inMem = getInMemoryJobs();
      expect(inMem.length).toBe(1);
      expect(inMem[0].id).toBe(job.id);
    });

    it("prevents duplicate job creation when enqueueing with an identical idempotencyKey", async () => {
      const key = "unique_hourly_sync_key_12345";

      const job1 = await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: { batchLimit: 25 },
        idempotencyKey: key,
      });

      const job2 = await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: { batchLimit: 50 }, // different payload
        idempotencyKey: key,
      });

      expect(job1.id).toBe(job2.id);
      expect(getInMemoryJobs().length).toBe(1);
    });

    it("prevents concurrent workers from claiming the same leased job", async () => {
      await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: { batchLimit: 10 },
      });

      // Worker 1 claims job
      const worker1Claims = await claimJobs({
        workerId: "worker_node_1",
        batchSize: 5,
        leaseDurationSeconds: 120,
      });
      expect(worker1Claims.length).toBe(1);
      expect(worker1Claims[0].claimedBy).toBe("worker_node_1");
      expect(worker1Claims[0].status).toBe("RUNNING");

      // Worker 2 attempts concurrent claim while lease is unexpired
      const worker2Claims = await claimJobs({
        workerId: "worker_node_2",
        batchSize: 5,
        leaseDurationSeconds: 120,
      });
      // Worker 2 receives 0 jobs because job is locked by worker 1's active lease
      expect(worker2Claims.length).toBe(0);
    });

    it("allows a subsequent worker to reclaim an abandoned job after lease expiration", async () => {
      const job = await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: { batchLimit: 10 },
      });

      // Claim with 1-second lease
      await claimJobs({
        workerId: "crashed_worker",
        batchSize: 1,
        leaseDurationSeconds: -1, // Expired in past
      });

      // Reclaim by recovery worker
      const recoveredClaims = await claimJobs({
        workerId: "recovery_worker",
        batchSize: 1,
        leaseDurationSeconds: 300,
      });

      expect(recoveredClaims.length).toBe(1);
      expect(recoveredClaims[0].id).toBe(job.id);
      expect(recoveredClaims[0].claimedBy).toBe("recovery_worker");
      expect(recoveredClaims[0].attemptCount).toBe(2);
    });
  });

  // =========================================================================
  // 2. WORKER LIFECYCLE, RETRIES & DEAD-LETTER OBSERVABILITY
  // =========================================================================
  describe("2. Worker Lifecycle, Bounded Retries & Dead-Letter Observability", () => {
    it("executes a batch, handles success, and records worker execution timestamps", async () => {
      await enqueueJob({
        jobType: "EXPIRE_STALE_ALERTS",
        payload: { batchLimit: 10 },
      });

      const worker = new BackgroundJobWorker("test_active_worker");
      const result = await worker.executeBatch({ batchSize: 5 });

      expect(result.claimedCount).toBe(1);
      expect(result.succeededCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // Verify activity timestamps updated
      expect(getLastWorkerAttemptTimestamp()).not.toBeNull();
      expect(getLastWorkerSuccessTimestamp()).not.toBeNull();
    });

    it("observably logs dead letter event when max retry attempts are exhausted", async () => {
      // Seed a job that has already failed 4 times (maxAttempts = 5)
      const job = await enqueueJob({
        jobType: "DISPATCH_APPROVED_ALERT",
        // Valid alertId UUID with invalid non-existent alert
        payload: { alertId: "00000000-0000-0000-0000-000000000001", batchSize: 10 },
        maxAttempts: 5,
      });

      // Simulate 4 prior attempts
      const inMem = getInMemoryJobs().find((j) => j.id === job.id)!;
      inMem.attemptCount = 4;

      const worker = new BackgroundJobWorker("terminal_worker");
      const result = await worker.executeBatch({ batchSize: 1 });

      expect(result.claimedCount).toBe(1);
      expect(result.deadLetterCount).toBe(1);

      // Verify audit logging of dead letter
      expect(mockRecordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "BACKGROUND_JOB_DEAD_LETTER",
          resourceType: "background_job",
        })
      );
    });
  });

  // =========================================================================
  // 3. SCHEDULER AUTHENTICATION & INVOCATION TRACKING
  // =========================================================================
  describe("3. Scheduler Authentication & Invocation", () => {
    it("fails closed when CRON_SECRET is missing from server environment", () => {
      delete process.env.CRON_SECRET;
      delete process.env.SCHEDULER_SECRET;

      const auth = validateSchedulerAuthentication("Bearer any-token");
      expect(auth.authorized).toBe(false);
      expect(auth.reason).toContain("Scheduler secret is not configured");
    });

    it("fails closed when caller provides an incorrect secret", () => {
      process.env.CRON_SECRET = "super_secure_cron_token_12345";

      const auth = validateSchedulerAuthentication("Bearer wrong-token");
      expect(auth.authorized).toBe(false);
      expect(auth.reason).toContain("Invalid scheduler authentication secret");
    });

    it("authenticates successfully with Bearer prefix or raw token", () => {
      process.env.CRON_SECRET = "super_secure_cron_token_12345";

      const authBearer = validateSchedulerAuthentication("Bearer super_secure_cron_token_12345");
      expect(authBearer.authorized).toBe(true);

      const authRaw = validateSchedulerAuthentication("super_secure_cron_token_12345");
      expect(authRaw.authorized).toBe(true);
    });

    it("runs scheduled cycle and enqueues hourly maintenance task idempotently", async () => {
      process.env.CRON_SECRET = "super_secure_cron_token_12345";

      const result = await runScheduledJobCycle({
        authHeaderOrSecret: "Bearer super_secure_cron_token_12345",
        batchSize: 10,
      });

      expect(result.workerId).toBe("scheduler_cron_worker");
      // Maintenance job was enqueued and executed
      expect(result.claimedCount).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 4. READINESS EVIDENCE TIMESTAMPS & PROVIDER MODES
  // =========================================================================
  describe("4. Readiness Evidence Timestamps & Provider Environment Modes", () => {
    it("includes evidenceTimestamp for verified core capabilities", async () => {
      const report = await generateProductionReadinessReport(null);

      expect(report.timestamp).toBeDefined();
      const coreDb = report.capabilities.find((c) => c.capability.includes("Core Database"));
      expect(coreDb).toBeDefined();
      expect(coreDb?.evidenceTimestamp).toBeDefined();

      const rbac = report.capabilities.find((c) => c.capability.includes("Authentication"));
      expect(rbac?.evidenceTimestamp).toBeDefined();

      const antiPork = report.capabilities.find((c) => c.capability.includes("Anti-Pork"));
      expect(antiPork?.evidenceTimestamp).toBeDefined();
    });

    it("annotates sandbox mode when test keys are configured", async () => {
      process.env.PAYSTACK_SECRET_KEY = "sk_test_paystack_sandbox_mock";
      process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST_mock_sandbox_key";
      process.env.FLUTTERWAVE_WEBHOOK_SECRET = "test_webhook_hash";

      const report = await generateProductionReadinessReport(null);

      const paystack = report.capabilities.find((c) => c.capability.includes("Paystack"));
      expect(paystack?.evidence).toContain("Sandbox/Test mode");

      const flutterwave = report.capabilities.find((c) => c.capability.includes("Flutterwave"));
      expect(flutterwave?.evidence).toContain("Sandbox/Test mode");
    });

    it("attaches evidenceTimestamp when journaled webhook events exist", async () => {
      process.env.PAYSTACK_SECRET_KEY = "sk_test_paystack_12345";

      const mockDb = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "payment_webhook_events") {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: vi.fn().mockResolvedValue({
                      data: [{ id: "evt-123", created_at: "2026-10-10T08:30:00Z" }],
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) }),
          };
        }),
      };

      const report = await generateProductionReadinessReport(mockDb as unknown as never);
      const paystack = report.capabilities.find((c) => c.capability.includes("Paystack"));

      expect(paystack?.status).toBe("VERIFIED");
      expect(paystack?.evidenceTimestamp).toBe("2026-10-10T08:30:00Z");
    });

    it("truthfully leaves disaster recovery / PITR status as UNKNOWN", async () => {
      const report = await generateProductionReadinessReport(null);
      const dr = report.capabilities.find((c) => c.category === "DISASTER_RECOVERY");

      expect(dr).toBeDefined();
      expect(dr?.status).toBe("UNKNOWN");
      expect(dr?.evidence).toContain("Supabase cloud infrastructure");
      expect(dr?.evidenceTimestamp).toBeUndefined();
    });
  });

  // =========================================================================
  // 5. PAYMENT WEBHOOK SECURITY & JOURNAL IDEMPOTENCY
  // =========================================================================
  describe("5. Payment Webhook Security & Journal Idempotency", () => {
    const testSecret = "sk_test_paystack_secret_mock_77";

    it("rejects unauthorized webhook payloads with HTTP 401", async () => {
      process.env.PAYSTACK_SECRET_KEY = testSecret;
      resetPaymentProviders();

      const req = new NextRequest("http://localhost:3000/api/webhooks/paystack", {
        method: "POST",
        headers: {
          "x-paystack-signature": "invalid_forged_signature_hex",
          "content-type": "application/json",
        },
        body: JSON.stringify({ event: "charge.success" }),
      });

      const res = await paystackWebhookHandler(req);
      expect(res.status).toBe(401);
      expect(await res.text()).toBe("Invalid signature");
    });

    it("rejects oversized webhook payloads exceeding 1MB", async () => {
      const hugeBody = "x".repeat(1024 * 1024 + 10);
      const req = new NextRequest("http://localhost:3000/api/webhooks/paystack", {
        method: "POST",
        body: hugeBody,
      });

      const res = await paystackWebhookHandler(req);
      expect(res.status).toBe(400);
      expect(await res.text()).toContain("exceeds 1MB limit");
    });

    it("handles Flutterwave webhook signature using timing-safe secret hash comparison", async () => {
      const flwSecret = "test_flutterwave_secret_hash_99";
      process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST_99";
      process.env.FLUTTERWAVE_WEBHOOK_SECRET = flwSecret;
      resetPaymentProviders();

      const validPayload = JSON.stringify({
        event: "charge.completed",
        data: {
          id: 554433,
          tx_ref: "TX-REF-FLW-123",
          status: "successful",
          amount: 25000,
        },
      });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "payment_webhook_events") {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const verifySpy = vi
        .spyOn(PaymentService, "verifyAndProcessPayment")
        .mockResolvedValue({
          paymentId: "pay-flw-1",
          orderId: "ord-flw-1",
          status: "SUCCESSFUL",
          amount: 25000,
          currency: "NGN",
          orderStatus: "PAID",
          reference: "TX-REF-FLW-123",
          message: "Payment verified successfully",
        });

      const req = new NextRequest("http://localhost:3000/api/webhooks/flutterwave", {
        method: "POST",
        headers: {
          "verif-hash": flwSecret,
          "content-type": "application/json",
        },
        body: validPayload,
      });

      const res = await flutterwaveWebhookHandler(req);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("Webhook processed successfully");
      expect(verifySpy).toHaveBeenCalledWith("TX-REF-FLW-123", "FLUTTERWAVE");
      verifySpy.mockRestore();
    });
  });

  // =========================================================================
  // 6. NOTIFICATION PROVIDER TRUTHFULNESS
  // =========================================================================
  describe("6. Notification Provider Truthfulness", () => {
    it("reports in-app notification provider as natively available", () => {
      const provider = getDeliveryProvider("IN_APP");
      expect(provider.isAvailable()).toBe(true);
      expect(provider).toBeInstanceOf(InAppDeliveryProvider);
    });

    it("reports external SMS, WhatsApp, and Push providers as truthfully unavailable", async () => {
      const smsProvider = getDeliveryProvider("SMS");
      expect(smsProvider.isAvailable()).toBe(false);
      expect(smsProvider).toBeInstanceOf(UnavailableDeliveryProvider);

      const result = await smsProvider.send({
        notificationId: "notif-1",
        userId: "user-1",
        channel: "SMS",
        title: "Test SMS",
      });

      expect(result.status).toBe("UNAVAILABLE");
      expect(result.deliveredAt).toBeNull();
      expect(result.errorMessage).toContain("delivery provider is not configured");
    });
  });

  // =========================================================================
  // 7. PRIVACY, SECRET REDACTION & SAFE MISSING CREDENTIALS
  // =========================================================================
  describe("7. Privacy, Secret Redaction & Safe Missing Credentials", () => {
    it("inspects environment readiness without exposing secret values", () => {
      process.env.PAYSTACK_SECRET_KEY = "sk_live_super_secret_paystack_key";
      process.env.CRON_SECRET = "super_secret_cron_token";

      const inspection = inspectEnvironmentReadiness();

      expect(inspection.present).toContain("PAYSTACK_SECRET_KEY");
      expect(inspection.present).toContain("CRON_SECRET");

      // Verify serialized result contains NO secret values
      const json = JSON.stringify(inspection);
      expect(json).not.toContain("sk_live_super_secret_paystack_key");
      expect(json).not.toContain("super_secret_cron_token");
    });

    it("redacts bearer tokens and secrets from error messages", () => {
      const rawError = "Request failed with Authorization: Bearer secret_token_xyz123 and token='super_secret_token'";
      const sanitized = sanitizeErrorMessage(rawError);

      expect(sanitized).not.toContain("secret_token_xyz123");
      expect(sanitized).not.toContain("super_secret_token");
      expect(sanitized).toContain("Bearer [REDACTED]");
      expect(sanitized).toContain("token=[REDACTED]");
    });

    it("truncates error messages exceeding 500 characters", () => {
      const longMessage = "A".repeat(800);
      const sanitized = sanitizeErrorMessage(longMessage);

      expect(sanitized.length).toBe(500);
      expect(sanitized.endsWith("...")).toBe(true);
    });
  });
});
