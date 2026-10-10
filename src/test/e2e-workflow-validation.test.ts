import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PaymentService } from "@/features/payments/service";
import { resetPaymentProviders } from "@/features/payments/providers";
import { containsProhibitedProduce } from "@/features/marketplace/validation";
import { isValidStatusTransition } from "@/features/marketplace/types";
import { isValidOrderStatusTransition } from "@/features/orders/types";
import { assertNoProhibitedProduceRag, ragQueryInputSchema } from "@/features/agricultural-rag/validation";
import { evaluateDomainSafety } from "@/features/agricultural-rag/safety";
import { assertNoProhibitedProduceSearch, searchQueryInputSchema } from "@/features/semantic-search/validation";
import { assertNoProhibitedProduceNotification } from "@/features/notifications/validation";
import { ObservabilityService } from "@/features/observability/service";
import { SharedPurchaseService } from "@/features/shared-purchase/service";
import { POST as paystackWebhookHandler } from "@/app/api/webhooks/paystack/route";
import { NextRequest } from "next/server";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Mocks & Test Fixtures
// ---------------------------------------------------------------------------

const mockAdminFrom = vi.fn();
const mockAdminAuth = {
  admin: {
    getUserById: vi.fn().mockResolvedValue({ data: { user: { email: "test@farmer.ng" } } }),
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
  requireAnyRole: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn().mockResolvedValue({ id: "audit_123" }),
}));

describe("AgroMarket Phase 3.20: Deployment Verification & End-to-End Workflow Validation", () => {
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
  // 1. IDENTITY & ACCESS BOUNDARIES (CROSS-FEATURE ISOLATION)
  // =========================================================================
  describe("1. Identity & Access Boundaries", () => {
    it("blocks cross-user payment verification when caller does not match buyer_id", async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "payments") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "pay-101",
                    buyer_id: "genuine-buyer-uuid",
                    order_id: "order-101",
                    provider: "PAYSTACK",
                    status: "PENDING",
                    amount: 25000,
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
        PaymentService.verifyAndProcessPayment("REF-PSTK-001", "PAYSTACK", "malicious-user-uuid")
      ).rejects.toThrow("Unauthorized: You do not have permission to verify or access this payment.");
    });

    it("blocks cross-user order payment initialization when caller is not the order buyer", async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "orders") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "order-555",
                    order_number: "ORD-555",
                    buyer_id: "legitimate-buyer-uuid",
                    status: "PENDING",
                    currency: "NGN",
                    total_amount: 12000,
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
          orderId: "order-555",
          buyerId: "adversary-uuid",
          provider: "PAYSTACK",
        })
      ).rejects.toThrow("Unauthorized: You do not own this order.");
    });

    it("blocks cross-user shared purchase payment initialization", async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "shared_purchase_participants") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "sp-part-1",
                    order_id: "order-sp-1",
                    user_id: "pledge-creator-uuid",
                    status: "COMMITTED",
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
        SharedPurchaseService.initializeParticipantPayment({
          participantId: "sp-part-1",
          buyerId: "stranger-uuid",
        })
      ).rejects.toThrow("Unauthorized: You do not own this participation record.");
    });
  });

  // =========================================================================
  // 2. LISTINGS, INVENTORY & ANTI-PORK DOMAIN INVARIANTS
  // =========================================================================
  describe("2. Listings, Inventory & Domain Compliance", () => {
    it("strictly rejects prohibited pig/pork terms in listing titles and descriptions", () => {
      expect(containsProhibitedProduce("Fresh Organic Tomatoes")).toBe(false);
      expect(containsProhibitedProduce("Sweet Yellow Maize 50kg")).toBe(false);

      expect(containsProhibitedProduce("Farm Fresh Pork Chops")).toBe(true);
      expect(containsProhibitedProduce("Smoked Bacon 5kg Pack")).toBe(true);
      expect(containsProhibitedProduce("Swine Livestock Feed")).toBe(true);
      expect(containsProhibitedProduce("Refined Pork Lard")).toBe(true);
      expect(containsProhibitedProduce("Wild Boar Carcass")).toBe(true);
    });

    it("enforces listing status state machine transitions correctly", () => {
      // Valid transitions
      expect(isValidStatusTransition("DRAFT", "ACTIVE")).toBe(true);
      expect(isValidStatusTransition("ACTIVE", "PAUSED")).toBe(true);
      expect(isValidStatusTransition("ACTIVE", "OUT_OF_STOCK")).toBe(true);
      expect(isValidStatusTransition("PAUSED", "ACTIVE")).toBe(true);
      expect(isValidStatusTransition("ACTIVE", "ARCHIVED")).toBe(true);

      // Terminal and invalid transitions
      expect(isValidStatusTransition("ARCHIVED", "ACTIVE")).toBe(false);
      expect(isValidStatusTransition("ARCHIVED", "DRAFT")).toBe(false);
      expect(isValidStatusTransition("DRAFT", "OUT_OF_STOCK")).toBe(false);
    });

    it("enforces order status state machine transitions correctly", () => {
      expect(isValidOrderStatusTransition("PENDING", "PAID")).toBe(true);
      expect(isValidOrderStatusTransition("PENDING", "CANCELLED")).toBe(true);
      expect(isValidOrderStatusTransition("PAID", "PROCESSING")).toBe(true);
      expect(isValidOrderStatusTransition("PROCESSING", "PARTIALLY_FULFILLED")).toBe(true);
      expect(isValidOrderStatusTransition("PROCESSING", "COMPLETED")).toBe(true);
      expect(isValidOrderStatusTransition("PARTIALLY_FULFILLED", "COMPLETED")).toBe(true);
      expect(isValidOrderStatusTransition("COMPLETED", "DISPUTED")).toBe(true);

      // Invalid reverse transitions
      expect(isValidOrderStatusTransition("COMPLETED", "PENDING")).toBe(false);
      expect(isValidOrderStatusTransition("CANCELLED", "PAID")).toBe(false);
      expect(isValidOrderStatusTransition("PAID", "PENDING")).toBe(false);
    });
  });

  // =========================================================================
  // 3. ORDERS & PAYMENTS AUTHORITATIVE LIFECYCLE
  // =========================================================================
  describe("3. Authoritative Order & Payment State Transitions", () => {
    const testSecret = "sk_test_paystack_workflow_key";

    it("rejects payment verification when provider reported amount does not match order total", async () => {
      process.env.PAYSTACK_SECRET_KEY = testSecret;
      resetPaymentProviders();

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "payments") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "pay-mismatch",
                    buyer_id: "buyer-123",
                    order_id: "order-mismatch",
                    provider: "PAYSTACK",
                    status: "PENDING",
                    amount: 50000,
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
                    id: "order-mismatch",
                    order_number: "ORD-MISMATCH",
                    buyer_id: "buyer-123",
                    status: "PENDING",
                    payment_status: "PENDING",
                    total_amount: 50000,
                    currency: "NGN",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      // Provider returns 20,000 NGN instead of expected 50,000 NGN
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            status: "success",
            reference: "REF-AMOUNT-MISMATCH",
            amount: 2000000, // 20,000 NGN in Kobo
            currency: "NGN",
          },
        }),
      } as unknown as Response);

      try {
        await expect(
          PaymentService.verifyAndProcessPayment("REF-AMOUNT-MISMATCH", "PAYSTACK", "buyer-123")
        ).rejects.toThrow("Payment verification failed: Amount mismatch");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("handles failed provider status by marking payment FAILED while keeping order PENDING", async () => {
      process.env.PAYSTACK_SECRET_KEY = testSecret;
      resetPaymentProviders();

      const updatePaymentSpy = vi.fn().mockResolvedValue({ data: null, error: null });
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "payments") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "pay-failed",
                    buyer_id: "buyer-retry",
                    order_id: "order-retry",
                    provider: "PAYSTACK",
                    status: "PENDING",
                    amount: 15000,
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: updatePaymentSpy,
            }),
          };
        }
        if (table === "orders") {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "order-retry",
                    order_number: "ORD-RETRY",
                    buyer_id: "buyer-retry",
                    status: "PENDING",
                    payment_status: "PENDING",
                    total_amount: 15000,
                    currency: "NGN",
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      // Provider returns failed transaction (e.g. card declined)
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            status: "failed",
            reference: "REF-CARD-DECLINED",
            amount: 1500000,
            currency: "NGN",
          },
        }),
      } as unknown as Response);

      try {
        const result = await PaymentService.verifyAndProcessPayment("REF-CARD-DECLINED", "PAYSTACK", "buyer-retry");
        expect(result.status).toBe("FAILED");
        expect(result.orderStatus).toBe("PENDING"); // Order remains PENDING so buyer can retry
        expect(updatePaymentSpy).toHaveBeenCalled();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("verifies webhook duplicate event handling is strictly idempotent", async () => {
      process.env.PAYSTACK_SECRET_KEY = testSecret;
      process.env.PAYSTACK_WEBHOOK_SECRET = testSecret;
      resetPaymentProviders();

      const rawBody = JSON.stringify({
        event: "charge.success",
        data: {
          id: 887766,
          reference: "REF-IDEMPOTENT-CHECK",
          status: "success",
          amount: 450000,
        },
      });
      const validSignature = crypto.createHmac("sha512", testSecret).update(rawBody).digest("hex");

      // Mock duplicate key constraint error (code 23505)
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
  // 4. AGRICULTURAL INTELLIGENCE, SAFETY & PROVENANCE
  // =========================================================================
  describe("4. Agricultural Intelligence & Domain Safety Invariants", () => {
    it("rejects prohibited porcine terms in semantic search input", () => {
      expect(() => {
        assertNoProhibitedProduceSearch("Where to buy pork meat in Ibadan?");
      }).toThrow(/Zero-tolerance policy violation/);

      const parsed = searchQueryInputSchema.safeParse({ query: "swine breeding prices in lagos" });
      expect(parsed.success).toBe(false);
    });

    it("rejects prohibited porcine terms in agricultural RAG inquiries", () => {
      expect(() => {
        assertNoProhibitedProduceRag("Where can I source swine feed?");
      }).toThrow(/Zero-tolerance policy violation/);

      const parsed = ragQueryInputSchema.safeParse({
        question: "How to cure swine disease in livestock?",
        category: "LIVESTOCK_MANAGEMENT",
      });
      expect(parsed.success).toBe(false);
    });

    it("injects veterinary disclaimers when questions involve clinical diagnostics", () => {
      const evaluation = evaluateDomainSafety(
        "What dosage of antibiotic should I inject into my sick goat?",
        "Consult your local animal health worker before administering any drugs."
      );

      expect(evaluation.needsProfessionalReview).toBe(true);
      expect(evaluation.safetyFlags).toContain("VETERINARY_BIOSECURITY_INQUIRY");
      expect(evaluation.professionalReviewNotice).toBeDefined();
    });

    it("redacts commercial profit or yield guarantees in AI responses", () => {
      const evaluation = evaluateDomainSafety(
        "Will cassava farming give guaranteed yield?",
        "Cassava farming provides guaranteed profit and 100% risk-free returns."
      );

      expect(evaluation.safetyFlags).toContain("PROFIT_GUARANTEE_REDACTED");
      expect(evaluation.sanitizedAnswer).toContain("[Projected agronomic outcome subject to weather and market variability]");
      expect(evaluation.sanitizedAnswer).not.toContain("guaranteed profit");
    });

    it("rejects prohibited porcine produce in notification alerts", () => {
      expect(() => {
        assertNoProhibitedProduceNotification("Swine Flu Outbreak Alert", "Alert Title");
      }).toThrow(/Zero-tolerance policy violation/);
    });
  });

  // =========================================================================
  // 5. PRODUCTION READINESS EVIDENCE ASSESSMENT
  // =========================================================================
  describe("5. Operational Evidence & Capability Assessment", () => {
    it("promotes payment gateway status from CONFIGURED to VERIFIED when journaled events exist", async () => {
      process.env.PAYSTACK_SECRET_KEY = "sk_live_sample";

      // Mock database returning 1 journaled Paystack event
      const mockClientWithEvents = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === "payment_webhook_events") {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  limit: vi.fn().mockResolvedValue({
                    data: val === "PAYSTACK" ? [{ id: "evt_1" }] : [],
                  }),
                }),
              }),
            };
          }
          if (table === "background_jobs") {
            return {
              select: () => ({
                limit: vi.fn().mockResolvedValue({ data: [{ id: "job_1" }] }),
              }),
            };
          }
          return {
            select: () => ({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            }),
          };
        }),
      };

      const report = await ObservabilityService.getProductionReadinessReport({
        customSupabase: mockClientWithEvents as unknown as import("@supabase/supabase-js").SupabaseClient,
      });

      const paystackCap = report.capabilities.find((c) => c.capability === "Payment Gateway: Paystack");
      expect(paystackCap).toBeDefined();
      expect(paystackCap?.status).toBe("VERIFIED");
      expect(paystackCap?.evidence).toContain("Verified webhook event(s) recorded");
    });

    it("truthfully marks unobserved integrations as CONFIGURED or UNAVAILABLE", async () => {
      delete process.env.FLUTTERWAVE_SECRET_KEY;

      const report = await ObservabilityService.getProductionReadinessReport();
      const flwCap = report.capabilities.find((c) => c.capability === "Payment Gateway: Flutterwave");
      expect(flwCap).toBeDefined();
      expect(flwCap?.status).toBe("UNAVAILABLE");

      const carrierCap = report.capabilities.find(
        (c) => c.capability === "External Carrier Gateways (SMS, WhatsApp, Push)"
      );
      expect(carrierCap?.status).toBe("UNAVAILABLE");
    });
  });
});
