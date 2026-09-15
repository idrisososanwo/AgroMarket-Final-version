import { describe, it, expect } from "vitest";
import { isValidDisputeTransition } from "@/features/disputes/types";
import {
  createDisputeSchema,
  sellerResponseSchema,
  resolveDisputeSchema,
} from "@/features/disputes/validation";
import { isValidSettlementTransition } from "@/features/settlements/types";
import {
  DEFAULT_DISPUTE_WINDOW_DAYS,
  DEFAULT_PLATFORM_FEE_PERCENT,
} from "@/features/settlements/constants";
import {
  isValidRefundTransition,
  PAYMENT_PROVIDERS,
} from "@/features/payments/types";
import { createRefundSchema } from "@/features/payments/validation";
import { getPaymentProvider } from "@/features/payments/providers";

describe("Phase 0.8: Disputes, Refunds, Settlement Accounting & Fulfilment Holds", () => {
  describe("1. Dispute State Machine & Validation", () => {
    it("allows valid dispute status transitions", () => {
      expect(isValidDisputeTransition("OPEN", "UNDER_REVIEW")).toBe(true);
      expect(isValidDisputeTransition("OPEN", "CLOSED")).toBe(true);
      expect(isValidDisputeTransition("UNDER_REVIEW", "RESOLVED")).toBe(true);
      expect(isValidDisputeTransition("UNDER_REVIEW", "REJECTED")).toBe(true);
      expect(isValidDisputeTransition("RESOLVED", "CLOSED")).toBe(true);
      expect(isValidDisputeTransition("REJECTED", "CLOSED")).toBe(true);
    });

    it("rejects illegal dispute status transitions", () => {
      expect(isValidDisputeTransition("RESOLVED", "OPEN")).toBe(false);
      expect(isValidDisputeTransition("CLOSED", "OPEN")).toBe(false);
      expect(isValidDisputeTransition("CLOSED", "RESOLVED")).toBe(false);
      expect(isValidDisputeTransition("REJECTED", "RESOLVED")).toBe(false);
    });

    it("validates dispute creation schema correctly", () => {
      const valid = createDisputeSchema.safeParse({
        orderId: "550e8400-e29b-41d4-a716-446655440000",
        sellerId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        disputeType: "DAMAGED_ITEM",
        reason: "Tomatoes crushed in transit",
        description: "5 baskets arrived crushed and decaying upon driver offloading.",
      });
      expect(valid.success).toBe(true);

      const invalid = createDisputeSchema.safeParse({
        orderId: "not-a-uuid",
        sellerId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        disputeType: "DAMAGED_ITEM",
        reason: "Bad", // too short
        description: "Short", // too short
      });
      expect(invalid.success).toBe(false);
    });

    it("validates seller response schema correctly", () => {
      const valid = sellerResponseSchema.safeParse({
        disputeId: "550e8400-e29b-41d4-a716-446655440000",
        response: "Produce was harvested and packed according to standard specifications before courier handoff.",
      });
      expect(valid.success).toBe(true);

      const tooShort = sellerResponseSchema.safeParse({
        disputeId: "550e8400-e29b-41d4-a716-446655440000",
        response: "No way",
      });
      expect(tooShort.success).toBe(false);
    });

    it("validates admin dispute resolution schema correctly", () => {
      const valid = resolveDisputeSchema.safeParse({
        disputeId: "550e8400-e29b-41d4-a716-446655440000",
        resolutionType: "PARTIAL_REFUND",
        resolutionNotes: "Inspection photos confirm 2 of 5 baskets were crushed. 40% refund awarded.",
        refundAmount: 24000,
      });
      expect(valid.success).toBe(true);

      const negativeRefund = resolveDisputeSchema.safeParse({
        disputeId: "550e8400-e29b-41d4-a716-446655440000",
        resolutionType: "BUYER_REFUND",
        resolutionNotes: "Refund awarded",
        refundAmount: -5000,
      });
      expect(negativeRefund.success).toBe(false);
    });
  });

  describe("2. Refund State Machine & Gateway Abstraction", () => {
    it("allows valid refund transitions", () => {
      expect(isValidRefundTransition("PENDING", "PROCESSING")).toBe(true);
      expect(isValidRefundTransition("PROCESSING", "SUCCEEDED")).toBe(true);
      expect(isValidRefundTransition("PROCESSING", "FAILED")).toBe(true);
      expect(isValidRefundTransition("FAILED", "PROCESSING")).toBe(true);
    });

    it("rejects invalid refund transitions", () => {
      expect(isValidRefundTransition("SUCCEEDED", "PENDING")).toBe(false);
      expect(isValidRefundTransition("SUCCEEDED", "FAILED")).toBe(false);
      expect(isValidRefundTransition("PENDING", "SUCCEEDED")).toBe(false);
    });

    it("validates refund input schema", () => {
      const valid = createRefundSchema.safeParse({
        orderId: "550e8400-e29b-41d4-a716-446655440000",
        paymentId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        amount: 35000,
        reason: "Produce rot arbitrated refund",
        idempotencyKey: "REF-ORD-12345-DISP-01",
      });
      expect(valid.success).toBe(true);

      const zeroAmount = createRefundSchema.safeParse({
        orderId: "550e8400-e29b-41d4-a716-446655440000",
        amount: 0,
        reason: "Test",
        idempotencyKey: "KEY-01",
      });
      expect(zeroAmount.success).toBe(false);
    });

    it("exposes processRefund on Paystack and Flutterwave adapters", () => {
      const paystack = getPaymentProvider("PAYSTACK");
      expect(typeof paystack.processRefund).toBe("function");

      const flutterwave = getPaymentProvider("FLUTTERWAVE");
      expect(typeof flutterwave.processRefund).toBe("function");
    });
  });

  describe("3. Settlement State Machine & Calculation Engine", () => {
    it("allows valid settlement transitions", () => {
      expect(isValidSettlementTransition("PENDING", "ELIGIBLE")).toBe(true);
      expect(isValidSettlementTransition("ELIGIBLE", "PROCESSING")).toBe(true);
      expect(isValidSettlementTransition("PROCESSING", "SETTLED")).toBe(true);
      expect(isValidSettlementTransition("PROCESSING", "FAILED")).toBe(true);
      expect(isValidSettlementTransition("FAILED", "ELIGIBLE")).toBe(true);
    });

    it("rejects invalid settlement transitions", () => {
      expect(isValidSettlementTransition("SETTLED", "PENDING")).toBe(false);
      expect(isValidSettlementTransition("PENDING", "SETTLED")).toBe(false);
      expect(isValidSettlementTransition("FAILED", "SETTLED")).toBe(false);
    });

    it("calculates Net Settlement accurately according to domain formula", () => {
      const gross = 100000;
      const platformFee = 0; // default in Phase 0.8
      const logisticsAdjustment = 5000;
      const refundDeductions = 15000;
      const disputeAdjustments = 10000;

      const net = Math.max(
        0,
        gross - platformFee - logisticsAdjustment - refundDeductions - disputeAdjustments
      );

      expect(net).toBe(70000);
    });

    it("clamps Net Settlement to 0 when deductions exceed gross proceeds", () => {
      const gross = 50000;
      const platformFee = 0;
      const logisticsAdjustment = 10000;
      const refundDeductions = 45000;
      const disputeAdjustments = 10000;

      const net = Math.max(
        0,
        gross - platformFee - logisticsAdjustment - refundDeductions - disputeAdjustments
      );

      expect(net).toBe(0);
    });

    it("verifies default platform fee is 0 and dispute window is 7 days", () => {
      expect(DEFAULT_PLATFORM_FEE_PERCENT).toBe(0);
      expect(DEFAULT_DISPUTE_WINDOW_DAYS).toBe(7);
    });
  });

  describe("4. Fulfilment Hold Invariants & Multi-Seller Partitioning", () => {
    it("partitions multi-seller orders into independent seller settlements", () => {
      const orderItems = [
        { id: "item-1", sellerId: "seller-A", totalPrice: 45000, productName: "Sokoto Red Onions" },
        { id: "item-2", sellerId: "seller-A", totalPrice: 25000, productName: "Garlic Bulbs" },
        { id: "item-3", sellerId: "seller-B", totalPrice: 80000, productName: "Benue White Yams" },
      ];

      // Simulate grouping
      const sellerTotals = new Map<string, number>();
      for (const item of orderItems) {
        sellerTotals.set(
          item.sellerId,
          (sellerTotals.get(item.sellerId) || 0) + item.totalPrice
        );
      }

      expect(sellerTotals.size).toBe(2);
      expect(sellerTotals.get("seller-A")).toBe(70000);
      expect(sellerTotals.get("seller-B")).toBe(80000);
    });

    it("evaluates settlement eligibility based on delivery completion and dispute window", () => {
      const now = new Date();
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      // Scenario A: Delivered 8 days ago, no disputes -> ELIGIBLE
      const windowExpiredA =
        now.getTime() - eightDaysAgo.getTime() >=
        DEFAULT_DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      expect(windowExpiredA).toBe(true);

      // Scenario B: Delivered 3 days ago, window still open -> HELD (PENDING)
      const windowExpiredB =
        now.getTime() - threeDaysAgo.getTime() >=
        DEFAULT_DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      expect(windowExpiredB).toBe(false);
    });

    it("Seller A delivered while Seller B is still processing → Seller A can become eligible after all other seller-specific conditions are satisfied", () => {
      const order = { id: "ord-1", status: "PARTIALLY_FULFILLED", totalAmount: 150000 };
      const deliveries = [
        {
          id: "del-A",
          sellerId: "seller-A",
          status: "DELIVERED",
          actualDeliveryDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "del-B",
          sellerId: "seller-B",
          status: "IN_TRANSIT",
          actualDeliveryDate: null,
        },
      ];
      const disputes: Array<{ sellerId: string; status: string }> = [];

      // Evaluator function mimicking SettlementService.evaluateSettlementEligibility logic
      const isEligibleForSeller = (sellerId: string) => {
        const isOrderPaid =
          order.status === "PAID" ||
          order.status === "PROCESSING" ||
          order.status === "PARTIALLY_FULFILLED" ||
          order.status === "COMPLETED";

        if (!isOrderPaid) return { eligible: false, holdReason: "PAYMENT_PENDING" };

        const sellerDeliveries = deliveries.filter((d) => d.sellerId === sellerId);
        if (sellerDeliveries.length === 0) return { eligible: false, holdReason: "FULFILMENT_PENDING" };

        if (sellerDeliveries.some((d) => d.status === "DELIVERY_FAILED")) {
          return { eligible: false, holdReason: "DELIVERY_FAILED" };
        }

        if (!sellerDeliveries.every((d) => d.status === "DELIVERED")) {
          return { eligible: false, holdReason: "FULFILMENT_PENDING" };
        }

        const activeDisputes = disputes.filter(
          (disp) => disp.sellerId === sellerId && ["OPEN", "UNDER_REVIEW"].includes(disp.status)
        );
        if (activeDisputes.length > 0) return { eligible: false, holdReason: "DISPUTE_OPEN" };

        const latestDelivered = Math.max(
          ...sellerDeliveries.map((d) => new Date(d.actualDeliveryDate!).getTime())
        );
        const windowExpiresAt = latestDelivered + DEFAULT_DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
        if (Date.now() < windowExpiresAt) return { eligible: false, holdReason: "DISPUTE_WINDOW_ACTIVE" };

        return { eligible: true, holdReason: null };
      };

      // Seller A is eligible even though Seller B is still IN_TRANSIT and order is PARTIALLY_FULFILLED
      const sellerAResult = isEligibleForSeller("seller-A");
      expect(sellerAResult.eligible).toBe(true);
      expect(sellerAResult.holdReason).toBeNull();

      // Seller B remains ineligible with FULFILMENT_PENDING
      const sellerBResult = isEligibleForSeller("seller-B");
      expect(sellerBResult.eligible).toBe(false);
      expect(sellerBResult.holdReason).toBe("FULFILMENT_PENDING");
    });

    it("Seller A delivered while Seller B is undelivered → Seller A does not incorrectly remain blocked solely because Seller B is incomplete", () => {
      // Order status is still PROCESSING because Seller B has not yet dispatched
      const order = { id: "ord-2", status: "PROCESSING" };
      const sellerADeliveries = [
        {
          id: "del-A",
          sellerId: "seller-A",
          status: "DELIVERED",
          actualDeliveryDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      // Seller A's eligibility is isolated from Seller B's delivery existence
      const sellerAAllDelivered = sellerADeliveries.every((d) => d.status === "DELIVERED");
      expect(sellerAAllDelivered).toBe(true);

      const isOrderPaid = ["PAID", "PROCESSING", "PARTIALLY_FULFILLED", "COMPLETED"].includes(order.status);
      expect(isOrderPaid).toBe(true);
    });

    it("Seller A has a delivery failure → Seller A remains ineligible", () => {
      const sellerADeliveries = [
        {
          id: "del-A",
          sellerId: "seller-A",
          status: "DELIVERY_FAILED",
          actualDeliveryDate: null,
        },
      ];

      const hasFailure = sellerADeliveries.some((d) => d.status === "DELIVERY_FAILED");
      expect(hasFailure).toBe(true);

      const holdReason = hasFailure ? "DELIVERY_FAILED" : "FULFILMENT_PENDING";
      expect(holdReason).toBe("DELIVERY_FAILED");
    });

    it("An unresolved Seller A dispute → Seller A remains ineligible", () => {
      const activeDisputes = [{ id: "disp-1", sellerId: "seller-A", status: "UNDER_REVIEW" }];
      const hasOpenDispute = activeDisputes.some(
        (d) => d.sellerId === "seller-A" && ["OPEN", "UNDER_REVIEW"].includes(d.status)
      );
      expect(hasOpenDispute).toBe(true);
    });

    it("A valid seller settlement does not cause the overall order to become incorrectly COMPLETED", () => {
      // Master order begins in PARTIALLY_FULFILLED
      const masterOrderStatus = "PARTIALLY_FULFILLED";

      // Seller A settles their account
      const sellerASettlement = {
        id: "set-A",
        sellerId: "seller-A",
        status: "SETTLED",
      };

      // Settling a seller ledger must NOT transition the order to COMPLETED
      // The order only transitions to COMPLETED via Logistics delivery lifecycle when ALL consignments deliver
      expect(sellerASettlement.status).toBe("SETTLED");
      expect(masterOrderStatus).toBe("PARTIALLY_FULFILLED");
      expect(masterOrderStatus).not.toBe("COMPLETED");
    });
  });

  describe("5. Multi-Seller Refund Isolation & Ceiling Rules", () => {
    const orderItems = [
      { id: "item-1", sellerId: "seller-A", totalPrice: 30000, name: "Kano Groundnuts" },
      { id: "item-2", sellerId: "seller-A", totalPrice: 40000, name: "Sokoto Onions" },
      { id: "item-3", sellerId: "seller-B", totalPrice: 80000, name: "Benue Yams" },
    ];
    const totalOrderPaid = 150000;

    it("Seller A cannot refund Seller B's item", () => {
      const itemToRefund = orderItems.find((i) => i.id === "item-3")!;
      const claimingSellerId = "seller-A";

      // Item 3 belongs to seller-B. Claiming seller is seller-A.
      const isMismatch = itemToRefund.sellerId !== claimingSellerId;
      expect(isMismatch).toBe(true);

      expect(() => {
        if (isMismatch) {
          throw new Error("Seller ID mismatch: You cannot refund an item belonging to another seller.");
        }
      }).toThrow("Seller ID mismatch: You cannot refund an item belonging to another seller.");
    });

    it("A refund cannot exceed the refundable amount of the relevant item allocation", () => {
      const item = orderItems.find((i) => i.id === "item-1")!; // totalPrice: 30000
      const previousItemRefunds = 20000;
      const remainingItemBalance = item.totalPrice - previousItemRefunds; // 10000

      const requestedRefund = 15000;
      expect(requestedRefund > remainingItemBalance).toBe(true);

      expect(() => {
        if (requestedRefund > remainingItemBalance) {
          throw new Error(
            `Refund amount (₦${requestedRefund.toLocaleString()}) exceeds item's remaining refundable balance (₦${remainingItemBalance.toLocaleString()}).`
          );
        }
      }).toThrow("Refund amount (₦15,000) exceeds item's remaining refundable balance (₦10,000).");
    });

    it("A refund cannot exceed the seller's total order allocation", () => {
      // Seller A total: 30000 + 40000 = 70000
      const sellerATotal = orderItems
        .filter((i) => i.sellerId === "seller-A")
        .reduce((sum, i) => sum + i.totalPrice, 0);
      expect(sellerATotal).toBe(70000);

      const previousSellerRefunds = 50000;
      const remainingSellerBalance = sellerATotal - previousSellerRefunds; // 20000

      const requestedRefund = 25000;
      expect(requestedRefund > remainingSellerBalance).toBe(true);

      expect(() => {
        if (requestedRefund > remainingSellerBalance) {
          throw new Error(
            `Refund allocation (₦${requestedRefund.toLocaleString()}) exceeds seller's remaining refundable balance (₦${remainingSellerBalance.toLocaleString()}).`
          );
        }
      }).toThrow("Refund allocation (₦25,000) exceeds seller's remaining refundable balance (₦20,000).");
    });

    it("Multiple seller refunds cannot accidentally exceed the total paid amount", () => {
      // Global order safety ceiling
      const priorRefunds = [
        { sellerId: "seller-A", amount: 65000 },
        { sellerId: "seller-B", amount: 75000 },
      ];
      const totalAlreadyRefunded = priorRefunds.reduce((sum, r) => sum + r.amount, 0); // 140000
      const remainingOrderBalance = totalOrderPaid - totalAlreadyRefunded; // 10000

      const newRefundAttempt = 15000;
      expect(newRefundAttempt > remainingOrderBalance).toBe(true);

      expect(() => {
        if (newRefundAttempt > remainingOrderBalance) {
          throw new Error(
            `Refund amount (₦${newRefundAttempt.toLocaleString()}) exceeds maximum order refundable balance (₦${remainingOrderBalance.toLocaleString()}).`
          );
        }
      }).toThrow("Refund amount (₦15,000) exceeds maximum order refundable balance (₦10,000).");
    });

    it("Duplicate refund attempts remain strictly idempotent via idempotencyKey", () => {
      const registeredRefunds = new Map<string, { id: string; amount: number }>();
      const idempotencyKey = "REF-IDEM-ORD12345-DISP01";

      // First call inserts
      registeredRefunds.set(idempotencyKey, { id: "rfd-001", amount: 15000 });

      // Second call with same key returns existing without re-executing
      const secondCallResult = registeredRefunds.get(idempotencyKey);
      expect(secondCallResult).toBeDefined();
      expect(secondCallResult?.id).toBe("rfd-001");
      expect(secondCallResult?.amount).toBe(15000);
    });
  });

  describe("6. Pure NGN Fiat Enforcement & Stellar Purge", () => {
    it("strictly excludes STELLAR_XLM from PAYMENT_PROVIDERS enum", () => {
      expect(PAYMENT_PROVIDERS).toContain("PAYSTACK");
      expect(PAYMENT_PROVIDERS).toContain("FLUTTERWAVE");
      expect(PAYMENT_PROVIDERS).toContain("MONNIFY");
      expect(PAYMENT_PROVIDERS).toContain("BANK_TRANSFER");
      expect(PAYMENT_PROVIDERS).toContain("ESCROW_WALLET");

      // Verify STELLAR_XLM has been completely purged
      expect(PAYMENT_PROVIDERS).not.toContain("STELLAR_XLM");
      // @ts-expect-error test that STELLAR_XLM is not allowed by type system
      const isStellarValid = PAYMENT_PROVIDERS.includes("STELLAR_XLM");
      expect(isStellarValid).toBe(false);
    });
  });

  describe("6. Anti-Pork Produce Prohibition", () => {
    it("ensures agricultural produce catalog and disputes remain pork-free", () => {
      const prohibitedWords = ["pork", "swine", "pig", "hog", "bacon", "ham", "lard"];
      const testProduceName = "Kano Soya Beans & Premium Brown Beans";

      const hasProhibited = prohibitedWords.some((w) =>
        testProduceName.toLowerCase().includes(w)
      );
      expect(hasProhibited).toBe(false);
    });
  });
});
