import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeterministicRecommendationProvider } from "@/features/smart-basket/provider";
import {
  CandidateListing,
  PriceBenchmark,
  RecommendationContext,
} from "@/features/smart-basket/types";
import { SmartBasketService } from "@/features/smart-basket/service";
import { PaymentService } from "@/features/payments/service";
import { LogisticsService } from "@/features/logistics/service";
import { resetPaymentProviders } from "@/features/payments/providers";

// ---------------------------------------------------------------------------
// Controlled Test Candidates & Mock Benchmarks
// ---------------------------------------------------------------------------

const mockListings: CandidateListing[] = [
  {
    id: "listing-rice-lagos",
    productId: "prod-rice-01",
    productName: "Milled Parboiled Rice",
    categoryName: "Grains & Cereals",
    categoryId: "cat-grains",
    sellerId: "seller-lagos-01",
    sellerName: "Eko Agro Mills",
    title: "50kg Premium Parboiled Long Grain Rice",
    description: "Destoned clean Nigerian parboiled rice",
    pricePerUnit: 85000,
    unit: "50kg Bag",
    minimumOrderQuantity: 1,
    quantityAvailable: 50,
    state: "Lagos",
    lga: "Kosofe",
    pickupAddress: "Mile 12 Agro Terminal, Kosofe, Lagos",
  },
  {
    id: "listing-garri-lagos",
    productId: "prod-garri-01",
    productName: "White Garri",
    categoryName: "Roots & Tubers",
    categoryId: "cat-tubers",
    sellerId: "seller-lagos-01",
    sellerName: "Eko Agro Mills",
    title: "50kg Clean Fermented White Garri (Ijebu Style)",
    description: "Crisp dry fermented cassava flakes",
    pricePerUnit: 42000,
    unit: "50kg Bag",
    minimumOrderQuantity: 1,
    quantityAvailable: 60,
    state: "Lagos",
    lga: "Ikorodu",
    pickupAddress: "Ikorodu Central Market, Lagos",
  },
  {
    id: "listing-tomatoes-lagos",
    productId: "prod-tomatoes-01",
    productName: "Roma Tomatoes",
    categoryName: "Vegetables",
    categoryId: "cat-veg",
    sellerId: "seller-lagos-01",
    sellerName: "Eko Agro Mills",
    title: "Fresh Farm Roma Tomatoes Standard Crate",
    description: "Firm ripe farm-harvested Roma tomatoes",
    pricePerUnit: 26000,
    unit: "Crate",
    minimumOrderQuantity: 1,
    quantityAvailable: 40,
    state: "Lagos",
    lga: "Kosofe",
    pickupAddress: "Mile 12 Market Depot, Kosofe, Lagos",
  },
  {
    id: "listing-beans-kano",
    productId: "prod-beans-01",
    productName: "Brown Beans (Cowpea)",
    categoryName: "Legumes & Pulses",
    categoryId: "cat-legumes",
    sellerId: "seller-kano-01",
    sellerName: "Kano Grains Depot",
    title: "100kg Clean Destoned Brown Beans (Drum)",
    description: "Dry weevil-free brown beans",
    pricePerUnit: 110000,
    unit: "100kg Bag",
    minimumOrderQuantity: 1,
    quantityAvailable: 20,
    state: "Kano",
    lga: "Dawakin Tofa",
    pickupAddress: "Dawanau Market, Kano",
  },
];

const mockBenchmarks = new Map<string, PriceBenchmark>([
  [
    "prod-rice-01",
    {
      productId: "prod-rice-01",
      benchmarkPrice: 88000,
      unit: "50kg Bag",
      dataQualityLabel: "VERIFIED",
    },
  ],
  [
    "prod-garri-01",
    {
      productId: "prod-garri-01",
      benchmarkPrice: 45000,
      unit: "50kg Bag",
      dataQualityLabel: "VERIFIED",
    },
  ],
]);

describe("AGROMARKET V1 — PHASE 1: Real Inventory & Buyer Journey Suite", () => {
  const provider = new DeterministicRecommendationProvider();

  beforeEach(() => {
    vi.clearAllMocks();
    resetPaymentProviders();
  });

  // =========================================================================
  // 1. PHASE A & B: Inventory & Location-Aware Recommendation
  // =========================================================================
  describe("Phase A & B: Inventory and Smart Basket Recommendations", () => {
    it("ranks items in the buyer's preferred LGA and state higher than distant listings", async () => {
      const context: RecommendationContext = {
        userId: "buyer-01",
        input: {
          budget: 200000,
          state: "Lagos",
          lga: "Kosofe",
        },
        candidates: mockListings,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      expect(result.items.length).toBeGreaterThan(0);
      const kosofeItem = result.items.find((i) => i.lga === "Kosofe");
      const kanoItem = result.items.find((i) => i.state === "Kano");

      expect(kosofeItem).toBeDefined();
      expect(kosofeItem?.explanations.some((e) => e.includes("local LGA (Kosofe, Lagos)"))).toBe(true);
      if (kanoItem) {
        expect(kosofeItem!.score).toBeGreaterThan(kanoItem.score);
        expect(kanoItem.explanations.some((e) => e.includes("outside your primary location"))).toBe(true);
      }
    });

    it("transparently explains regional fallback when state matches but LGA differs", async () => {
      const context: RecommendationContext = {
        userId: "buyer-01",
        input: {
          budget: 200000,
          state: "Lagos",
          lga: "Epe", // Requested Epe, but garri is in Ikorodu
        },
        candidates: mockListings,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);
      const garriItem = result.items.find((i) => i.productId === "prod-garri-01");

      expect(garriItem).toBeDefined();
      expect(
        garriItem?.explanations.some((e) => e.includes("Regional fallback: Sourced from Lagos (Ikorodu)"))
      ).toBe(true);
    });

    it("enforces budget strictly as an unyielding spending ceiling", async () => {
      const smallBudget = 90000;
      const context: RecommendationContext = {
        userId: "buyer-01",
        input: {
          budget: smallBudget,
          state: "Lagos",
        },
        candidates: mockListings,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      expect(result.estimatedTotalCost).toBeLessThanOrEqual(smallBudget);
      expect(result.budgetRemaining).toBeGreaterThanOrEqual(0);
      expect(result.budgetAllocated).toBe(smallBudget);
    });

    it("excludes out-of-stock listings and listings where quantity < MOQ", async () => {
      const candidatesWithOOS: CandidateListing[] = [
        ...mockListings,
        {
          id: "listing-yam-oos",
          productId: "prod-yam-01",
          productName: "White Yam (Tubers)",
          categoryName: "Roots & Tubers",
          categoryId: "cat-tubers",
          sellerId: "seller-lagos-01",
          sellerName: "Eko Agro Mills",
          title: "100 Tubers White Yam",
          description: "Fresh yams",
          pricePerUnit: 70000,
          unit: "100 Tubers",
          minimumOrderQuantity: 5,
          quantityAvailable: 0, // Zero stock
          state: "Lagos",
          lga: "Kosofe",
        },
      ];

      const context: RecommendationContext = {
        userId: "buyer-01",
        input: {
          budget: 200000,
          state: "Lagos",
        },
        candidates: candidatesWithOOS,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);
      const yamItem = result.items.find((i) => i.productId === "prod-yam-01");
      expect(yamItem).toBeUndefined();
    });

    it("distinguishes zero market inventory from out-of-budget or allergy exclusions", async () => {
      // 1. Genuinely empty marketplace
      const emptyMarketContext: RecommendationContext = {
        userId: "buyer-01",
        input: { budget: 100000, state: "Lagos" },
        candidates: [],
        benchmarks: new Map(),
      };
      const emptyResult = await provider.generateRecommendations(emptyMarketContext);
      expect(emptyResult.items).toHaveLength(0);
      expect(emptyResult.rationale).toContain("no active marketplace listings with available stock match");

      // 2. Candidates exist but budget is ₦5,000 (all candidates > ₦20,000)
      const lowBudgetContext: RecommendationContext = {
        userId: "buyer-01",
        input: { budget: 5000, state: "Lagos" },
        candidates: mockListings,
        benchmarks: mockBenchmarks,
      };
      const lowBudgetResult = await provider.generateRecommendations(lowBudgetContext);
      expect(lowBudgetResult.items).toHaveLength(0);
      expect(lowBudgetResult.rationale).toContain("No complete produce bundle could be created within your stated budget");
    });
  });

  // =========================================================================
  // 2. PHASE C & D: Smart Basket to Cart Integration & Validation
  // =========================================================================
  describe("Phase C & D: Cart Integration and Revalidation", () => {
    it("re-validates active status and stock on server before adding to cart", async () => {
      // Mock admin Supabase client for SmartBasketService
      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === "basket_recommendations") {
            return {
              select: () => ({
                eq: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "rec-001",
                      user_id: "user-123",
                      recommended_items: [],
                    },
                    error: null,
                  }),
                }),
              }),
              update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === "carts") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: "cart-001" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "listings") {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  single: vi.fn().mockImplementation(() => {
                    if (val === "listing-archived") {
                      return Promise.resolve({
                        data: {
                          id: "listing-archived",
                          title: "Archived Corn",
                          status: "ARCHIVED",
                          price_per_unit: 40000,
                          minimum_order_quantity: 1,
                          products: { id: "p1", name: "Corn" },
                          inventory: { quantity_available: 10 },
                        },
                        error: null,
                      });
                    }
                    return Promise.resolve({
                      data: {
                        id: "listing-active",
                        title: "Active Rice",
                        status: "ACTIVE",
                        price_per_unit: 85000,
                        minimum_order_quantity: 1,
                        products: { id: "p2", name: "Rice" },
                        inventory: { quantity_available: 50 },
                      },
                      error: null,
                    });
                  }),
                }),
              }),
            };
          }
          if (table === "cart_items") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  }),
                }),
              }),
              insert: vi.fn().mockResolvedValue({ error: null }),
            };
          }
          if (table === "audit_logs") {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      vi.spyOn(await import("@/lib/supabase/admin"), "createAdminClient").mockReturnValue(
        mockAdmin as unknown as ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
      );

      const res = await SmartBasketService.addSmartBasketToCart("user-123", "rec-001", [
        { listingId: "listing-archived", quantity: 1 },
        { listingId: "listing-active", quantity: 2 },
      ]);

      expect(res.addedCount).toBe(1);
      expect(res.skippedCount).toBe(1);
      expect(res.messages.some((m) => m.includes("no longer active"))).toBe(true);
    });
  });

  // =========================================================================
  // 3. PHASE E: Paystack Payment & Order State Verification
  // =========================================================================
  describe("Phase E: Paystack Verification and Idempotent Transitions", () => {
    it("transitions order PENDING -> PAID atomically upon verified provider payment", async () => {
      const mockOrder = {
        id: "order-999",
        order_number: "AGRO-20261013-ABC123",
        buyer_id: "buyer-123",
        status: "PENDING",
        total_amount: 85000,
        currency: "NGN",
      };

      const mockPayment = {
        id: "pay-999",
        order_id: "order-999",
        buyer_id: "buyer-123",
        amount: 85000,
        currency: "NGN",
        provider: "PAYSTACK",
        status: "PENDING",
        provider_reference: "REF-TEST-999",
      };

      let orderStatus = "PENDING";
      let paymentStatus = "PENDING";

      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === "payments") {
            return {
              select: () => ({
                eq: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockPayment, status: paymentStatus },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockImplementation((updates: { status: string }) => {
                paymentStatus = updates.status;
                return { eq: vi.fn().mockResolvedValue({ error: null }) };
              }),
            };
          }
          if (table === "orders") {
            return {
              select: () => ({
                eq: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockOrder, status: orderStatus },
                    error: null,
                  }),
                }),
              }),
              update: vi.fn().mockImplementation((updates: { status: string }) => {
                orderStatus = updates.status;
                return { eq: vi.fn().mockResolvedValue({ error: null }) };
              }),
            };
          }
          if (table === "order_items") {
            return {
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === "audit_logs") {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      vi.spyOn(await import("@/lib/supabase/admin"), "createAdminClient").mockReturnValue(
        mockAdmin as unknown as ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
      );

      process.env.PAYSTACK_SECRET_KEY = "sk_test_dummy_secret_key";
      const { PaystackProvider } = await import("@/features/payments/providers/paystack");
      vi.spyOn(PaystackProvider.prototype, "verifyPayment").mockResolvedValueOnce({
        status: "SUCCESSFUL",
        providerReference: "REF-TEST-999",
        amount: 85000,
        currency: "NGN",
        paidAt: new Date().toISOString(),
        rawResponse: {},
      });

      // Verify payment with Paystack provider
      const result = await PaymentService.verifyAndProcessPayment(
        "REF-TEST-999",
        "PAYSTACK",
        "buyer-123"
      );

      expect(result.status).toBe("SUCCESSFUL");
      expect(result.orderStatus).toBe("PAID");
      expect(orderStatus).toBe("PAID");
      expect(paymentStatus).toBe("SUCCESSFUL");
    });

    it("rejects payments when client tampers with amount (anti-fraud check)", async () => {
      process.env.PAYSTACK_SECRET_KEY = "sk_test_dummy_secret_key";
      const mockOrder = {
        id: "order-fraud",
        order_number: "AGRO-20261013-FRAUD",
        buyer_id: "buyer-123",
        status: "PENDING",
        total_amount: 85000, // Authoritative price: 85,000 NGN
        currency: "NGN",
      };

      const mockPayment = {
        id: "pay-fraud",
        order_id: "order-fraud",
        buyer_id: "buyer-123",
        amount: 85000,
        currency: "NGN",
        provider: "PAYSTACK",
        status: "PENDING",
        provider_reference: "REF-TAMPERED-001",
      };

      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === "payments") {
            return {
              select: () => ({
                eq: () => ({
                  single: vi.fn().mockResolvedValue({ data: mockPayment, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            };
          }
          if (table === "orders") {
            return {
              select: () => ({
                eq: () => ({
                  single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
                }),
              }),
            };
          }
          if (table === "audit_logs") {
            return { insert: vi.fn().mockResolvedValue({ error: null }) };
          }
          return {};
        }),
      };

      vi.spyOn(await import("@/lib/supabase/admin"), "createAdminClient").mockReturnValue(
        mockAdmin as unknown as ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
      );

      // Force provider verification to return ₦5,000 instead of ₦85,000
      const { PaystackProvider } = await import("@/features/payments/providers/paystack");
      vi.spyOn(PaystackProvider.prototype, "verifyPayment").mockResolvedValueOnce({
        status: "SUCCESSFUL",
        providerReference: "REF-TAMPERED-001",
        amount: 5000, // Tampered down!
        currency: "NGN",
        paidAt: new Date().toISOString(),
        rawResponse: {},
      });

      await expect(
        PaymentService.verifyAndProcessPayment("REF-TAMPERED-001", "PAYSTACK", "buyer-123")
      ).rejects.toThrow("Amount mismatch");
    });
  });

  // =========================================================================
  // 4. PHASE F: Logistics Fulfilment & Tracking Reference
  // =========================================================================
  describe("Phase F: 3PL Logistics Fulfilment Coordination", () => {
    it("generates a valid AgroMarket delivery tracking reference format", () => {
      const tracking = LogisticsService.generateTrackingNumber();
      expect(tracking).toMatch(/^AM-DLV-\d{8}-[A-F0-9]{6}$/);
    });

    it("rejects delivery coordination for unpaid PENDING orders", async () => {
      const mockAdmin = {
        from: vi.fn((table: string) => {
          if (table === "orders") {
            return {
              select: () => ({
                eq: () => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "order-unpaid",
                      status: "PENDING", // Not paid!
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(await import("@/lib/supabase/admin"), "createAdminClient").mockReturnValue(
        mockAdmin as unknown as ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>
      );

      await expect(
        LogisticsService.createOrderDeliveries("order-unpaid", "buyer-123")
      ).rejects.toThrow("Cannot coordinate delivery for an unpaid order");
    });
  });
});
