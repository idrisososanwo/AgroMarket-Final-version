import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { inspectEnvironmentReadiness } from "@/config/env";
import { ObservabilityService } from "@/features/observability/service";
import { PaystackProvider } from "@/features/payments/providers/paystack";
import { FlutterwaveProvider } from "@/features/payments/providers/flutterwave";
import { resetPaymentProviders } from "@/features/payments/providers";
import { PaymentService } from "@/features/payments/service";
import { POST as paystackWebhookHandler } from "@/app/api/webhooks/paystack/route";
import { POST as flutterwaveWebhookHandler } from "@/app/api/webhooks/flutterwave/route";
import { POST as cronJobHandler, GET as cronJobGetHandler } from "@/app/api/cron/process-jobs/route";
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Mocks & Test Fixtures
// ---------------------------------------------------------------------------

const mockAdminFrom = vi.fn();
const mockAdminAuth = {
  admin: {
    getUserById: vi.fn().mockResolvedValue({ data: { user: { email: "test@buyer.ng" } } }),
  },
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
    auth: mockAdminAuth,
  }),
}));

vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn().mockResolvedValue({ id: "audit_123" }),
}));

describe("AgroMarket Phase 3.19: Production Readiness & Security Hardening", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    resetPaymentProviders();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    resetPaymentProviders();
  });

  // =========================================================================
  // 1. ENVIRONMENT CONFIGURATION & SAFE INSPECTION
  // =========================================================================
  describe("1. Environment Configuration Validation", () => {
    it("distinguishes required variables from optional integrations", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-123";
      delete process.env.PAYSTACK_SECRET_KEY;
      delete process.env.FLUTTERWAVE_SECRET_KEY;
      delete process.env.GEMINI_API_KEY;

      const inspection = inspectEnvironmentReadiness();

      expect(inspection.coreDatabaseConfigured).toBe(true);
      expect(inspection.missingRequired).not.toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(inspection.missingRequired).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      expect(inspection.paystackConfigured).toBe(false);
      expect(inspection.flutterwaveConfigured).toBe(false);
      expect(inspection.aiConfigured).toBe(false);
    });

    it("flags missing required variables safely", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const inspection = inspectEnvironmentReadiness();

      expect(inspection.coreDatabaseConfigured).toBe(false);
      expect(inspection.missingRequired).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(inspection.missingRequired).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    });

    it("requires SUPABASE_SERVICE_ROLE_KEY when running in production mode", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://prod.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const inspection = inspectEnvironmentReadiness();

      expect(inspection.isProduction).toBe(true);
      expect(inspection.missingRequired).toContain("SUPABASE_SERVICE_ROLE_KEY");
    });

    it("never leaks secret values in environment inspection output", () => {
      process.env.PAYSTACK_SECRET_KEY = "sk_live_super_secret_paystack_token";
      process.env.CRON_SECRET = "super_secret_cron_token";
      process.env.GEMINI_API_KEY = "super_secret_ai_token";

      const inspection = inspectEnvironmentReadiness();
      const stringified = JSON.stringify(inspection);

      expect(stringified).not.toContain("sk_live_super_secret_paystack_token");
      expect(stringified).not.toContain("super_secret_cron_token");
      expect(stringified).not.toContain("super_secret_ai_token");
      // But tracks the key name safely in present list
      expect(inspection.present).toContain("PAYSTACK_SECRET_KEY");
      expect(inspection.present).toContain("CRON_SECRET");
      expect(inspection.present).toContain("GEMINI_API_KEY");
    });
  });

  // =========================================================================
  // 2. AUTHENTICATION, AUTHORIZATION & RESOURCE OWNERSHIP
  // =========================================================================
  describe("2. Authentication & Server-Side Authorization Boundaries", () => {
    it("prevents cross-user payment verification when caller is not the buyer", async () => {
      // Mock payment owned by buyer-1
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "payments") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "pay_100",
                    buyer_id: "buyer-user-1",
                    order_id: "order-100",
                    provider: "PAYSTACK",
                    status: "PENDING",
                    amount: 5000,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      // Attacker buyer-user-2 attempts to verify buyer-user-1's payment
      await expect(
        PaymentService.verifyAndProcessPayment("REF-TEST-123", "PAYSTACK", "buyer-user-2")
      ).rejects.toThrow("Unauthorized: You do not have permission to verify or access this payment.");
    });

    it("allows admin or matching buyer to verify payment", async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "payments") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "pay_100",
                    buyer_id: "buyer-user-1",
                    order_id: "order-100",
                    provider: "PAYSTACK",
                    status: "PENDING",
                    amount: 5000,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === "orders") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "order-100",
                    order_number: "ORD-100",
                    buyer_id: "buyer-user-1",
                    status: "PENDING",
                    payment_status: "PENDING",
                    total_amount: 5000,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {
          update: () => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      // Mock Paystack verification call
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            status: "success",
            reference: "REF-TEST-123",
            amount: 500000, // 5000 Naira in Kobo
            currency: "NGN",
            paid_at: new Date().toISOString(),
          },
        }),
      } as unknown as Response);

      process.env.PAYSTACK_SECRET_KEY = "sk_test_paystack_secret_12345";
      try {
        // Matching buyer succeeds
        const result = await PaymentService.verifyAndProcessPayment(
          "REF-TEST-123",
          "PAYSTACK",
          "buyer-user-1"
        );
        expect(result.status).toBe("SUCCESSFUL");
        expect(result.orderId).toBe("order-100");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("prevents initiating payment for an order owned by another user", async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "orders") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "order-100",
                    order_number: "ORD-100",
                    buyer_id: "legitimate-buyer-id",
                    status: "PENDING",
                    currency: "NGN",
                    total_amount: 15000,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await expect(
        PaymentService.initializeOrderPayment({
          orderId: "order-100",
          buyerId: "fraudulent-attacker-id",
          provider: "PAYSTACK",
        })
      ).rejects.toThrow("Unauthorized: You do not own this order.");
    });
  });

  // =========================================================================
  // 3. PAYMENT & WEBHOOK RELIABILITY
  // =========================================================================
  describe("3. Payment Webhook Security & Idempotency", () => {
    const paystackSecret = "sk_test_paystack_secret_12345";
    const flutterwaveSecret = "flw_webhook_secret_hash_98765";

    it("verifies Paystack HMAC-SHA512 signature in constant time", () => {
      const provider = new PaystackProvider(paystackSecret, paystackSecret);
      const rawBody = JSON.stringify({ event: "charge.success", data: { reference: "ref_1" } });
      const validSignature = crypto.createHmac("sha512", paystackSecret).update(rawBody).digest("hex");
      const invalidSignature = "invalid_hex_signature_value";

      expect(provider.verifyWebhookSignature(rawBody, validSignature)).toBe(true);
      expect(provider.verifyWebhookSignature(rawBody, invalidSignature)).toBe(false);
      expect(provider.verifyWebhookSignature(rawBody, "")).toBe(false);
    });

    it("verifies Flutterwave verif-hash in constant time", () => {
      const provider = new FlutterwaveProvider("flw_key", flutterwaveSecret);
      const rawBody = JSON.stringify({ event: "charge.completed", data: { tx_ref: "tx_1" } });

      expect(provider.verifyWebhookSignature(rawBody, flutterwaveSecret)).toBe(true);
      expect(provider.verifyWebhookSignature(rawBody, "wrong_hash")).toBe(false);
      expect(provider.verifyWebhookSignature(rawBody, "")).toBe(false);
    });

    it("rejects Paystack webhook requests with invalid signatures (401)", async () => {
      process.env.PAYSTACK_SECRET_KEY = paystackSecret;
      process.env.PAYSTACK_WEBHOOK_SECRET = paystackSecret;

      const req = new NextRequest("http://localhost:3000/api/webhooks/paystack", {
        method: "POST",
        headers: {
          "x-paystack-signature": "bogus_signature",
          "content-type": "application/json",
        },
        body: JSON.stringify({ event: "charge.success" }),
      });

      const response = await paystackWebhookHandler(req);
      expect(response.status).toBe(401);
      const text = await response.text();
      expect(text).toBe("Invalid signature");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("rejects Flutterwave webhook requests with invalid signatures (401)", async () => {
      process.env.FLUTTERWAVE_SECRET_KEY = "flw_sec";
      process.env.FLUTTERWAVE_WEBHOOK_SECRET = flutterwaveSecret;

      const req = new NextRequest("http://localhost:3000/api/webhooks/flutterwave", {
        method: "POST",
        headers: {
          "verif-hash": "bogus_secret_hash",
          "content-type": "application/json",
        },
        body: JSON.stringify({ event: "charge.completed" }),
      });

      const response = await flutterwaveWebhookHandler(req);
      expect(response.status).toBe(401);
      const text = await response.text();
      expect(text).toBe("Invalid signature");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("rejects oversized webhook payloads (>1MB) with 400", async () => {
      const hugePayload = "x".repeat(1024 * 1024 + 10);
      const req = new NextRequest("http://localhost:3000/api/webhooks/paystack", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: hugePayload,
      });

      const response = await paystackWebhookHandler(req);
      expect(response.status).toBe(400);
      expect(await response.text()).toContain("Payload invalid or exceeds 1MB limit");
    });

    it("handles duplicate Paystack webhook events idempotently without double-processing", async () => {
      process.env.PAYSTACK_SECRET_KEY = paystackSecret;
      process.env.PAYSTACK_WEBHOOK_SECRET = paystackSecret;
      resetPaymentProviders();

      const rawBody = JSON.stringify({
        event: "charge.success",
        data: {
          id: 99991,
          reference: "REF-DUPLICATE-1",
          status: "success",
          amount: 250000,
        },
      });
      const validSignature = crypto.createHmac("sha512", paystackSecret).update(rawBody).digest("hex");

      // Mock database insertion to return 23505 unique constraint violation
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "payment_webhook_events") {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { code: "23505", message: "duplicate key value violates unique constraint" },
            }),
          };
        }
        return {};
      });

      const req = new NextRequest("http://localhost:3000/api/webhooks/paystack", {
        method: "POST",
        headers: {
          "x-paystack-signature": validSignature,
          "content-type": "application/json",
        },
        body: rawBody,
      });

      const response = await paystackWebhookHandler(req);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("Event already processed");
    });
  });

  // =========================================================================
  // 4. BACKGROUND SCHEDULER & CRON AUTHENTICATION
  // =========================================================================
  describe("4. Background Scheduler & Cron Route Security", () => {
    it("fails closed (401) when CRON_SECRET is unconfigured", async () => {
      delete process.env.CRON_SECRET;
      delete process.env.SCHEDULER_SECRET;

      const req = new NextRequest("http://localhost:3000/api/cron/process-jobs", {
        method: "POST",
        headers: {
          authorization: "Bearer some_token",
        },
      });

      const res = await cronJobHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
    });

    it("fails closed (401) when invalid token is provided", async () => {
      process.env.CRON_SECRET = "production_cron_secret_abc123";

      const req = new NextRequest("http://localhost:3000/api/cron/process-jobs", {
        method: "POST",
        headers: {
          authorization: "Bearer wrong_token_xyz",
        },
      });

      const res = await cronJobHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHORIZED");
    });

    it("fails closed for public GET request without valid credentials", async () => {
      process.env.CRON_SECRET = "production_cron_secret_abc123";

      const req = new NextRequest("http://localhost:3000/api/cron/process-jobs", {
        method: "GET",
      });

      const res = await cronJobGetHandler(req);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 5. PRODUCTION SECURITY DEFAULTS & MIDDLEWARE
  // =========================================================================
  describe("5. Production Security Headers & Cache Controls", () => {
    it("attaches defensive security headers to all responses", async () => {
      const req = new NextRequest("http://localhost:3000/marketplace");
      const res = await middleware(req);

      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(res.headers.get("Permissions-Policy")).toContain("camera=()");
      expect(res.headers.get("X-DNS-Prefetch-Control")).toBe("on");
    });

    it("enforces Cache-Control: no-store on sensitive endpoints", async () => {
      const sensitiveEndpoints = [
        "http://localhost:3000/api/cron/process-jobs",
        "http://localhost:3000/api/webhooks/paystack",
        "http://localhost:3000/admin/operations",
        "http://localhost:3000/api/health",
      ];

      for (const url of sensitiveEndpoints) {
        const req = new NextRequest(url);
        const res = await middleware(req);
        expect(res.headers.get("Cache-Control")).toBe("no-store, max-age=0, must-revalidate");
        expect(res.headers.get("Pragma")).toBe("no-cache");
      }
    });
  });

  // =========================================================================
  // 6. OPERATIONAL READINESS & EVIDENCE REPORTING
  // =========================================================================
  describe("6. Operational Readiness Evidence Assessment", () => {
    it("reports capability evidence with clear status categorization", async () => {
      const report = await ObservabilityService.getProductionReadinessReport();

      expect(report.timestamp).toBeDefined();
      expect(["VERIFIED", "CONFIGURED", "UNAVAILABLE", "UNKNOWN", "DEGRADED"]).toContain(report.overallState);
      expect(Array.isArray(report.capabilities)).toBe(true);
      expect(report.capabilities.length).toBeGreaterThanOrEqual(10);

      // Check essential categories
      const categories = report.capabilities.map((c) => c.category);
      expect(categories).toContain("INFRASTRUCTURE");
      expect(categories).toContain("AUTH_RBAC");
      expect(categories).toContain("PROCESSING");
      expect(categories).toContain("INTEGRATIONS");
      expect(categories).toContain("SECURITY");
      expect(categories).toContain("DISASTER_RECOVERY");

      // Verify external carrier gateways are truthfully UNAVAILABLE
      const carrierGateway = report.capabilities.find(
        (c) => c.capability === "External Carrier Gateways (SMS, WhatsApp, Push)"
      );
      expect(carrierGateway).toBeDefined();
      expect(carrierGateway?.status).toBe("UNAVAILABLE");

      // Verify remote disaster recovery is marked as UNKNOWN (cloud managed)
      const disasterRecovery = report.capabilities.find(
        (c) => c.capability === "Disaster Recovery & Point-in-Time Recovery (PITR)"
      );
      expect(disasterRecovery).toBeDefined();
      expect(disasterRecovery?.status).toBe("UNKNOWN");
    });

    it("accurately reports counts matching capability statuses", async () => {
      const report = await ObservabilityService.getProductionReadinessReport();
      const calculatedTotal =
        report.counts.verified +
        report.counts.configured +
        report.counts.unavailable +
        report.counts.unknown +
        report.counts.degraded;

      expect(calculatedTotal).toBe(report.capabilities.length);
      expect(report.summary).toContain(`${report.counts.verified} verified capabilities`);
    });
  });

  // =========================================================================
  // 7. DATABASE MIGRATION INTEGRITY
  // =========================================================================
  describe("7. Database Migration & Schema Sequence Integrity", () => {
    it("verifies sequential order and unique timestamps across migrations", () => {
      const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
      const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

      expect(files.length).toBeGreaterThanOrEqual(45);

      const timestamps: string[] = [];
      for (const file of files) {
        // Standard convention: YYYYMMDDHHMMSS_name.sql
        const match = file.match(/^(\d{14})_(.+)\.sql$/);
        expect(match, `Migration ${file} must follow YYYYMMDDHHMMSS_name.sql`).not.toBeNull();
        if (match) {
          timestamps.push(match[1]);
        }
      }

      // Check timestamps are strictly unique
      const uniqueTimestamps = new Set(timestamps);
      expect(uniqueTimestamps.size).toBe(timestamps.length);

      // Check migrations are sorted chronologically
      const sortedTimestamps = [...timestamps].sort();
      expect(timestamps).toEqual(sortedTimestamps);
    });
  });
});
