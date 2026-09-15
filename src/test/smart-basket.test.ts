import { describe, it, expect } from "vitest";
import { DeterministicRecommendationProvider } from "@/features/smart-basket/provider";
import {
  CandidateListing,
  PriceBenchmark,
  RecommendationContext,
} from "@/features/smart-basket/types";
import {
  generateBasketSchema,
  updateUserPreferencesSchema,
  addSmartBasketToCartSchema,
} from "@/features/smart-basket/validation";

describe("Phase 1.0 Smart Basket Recommendation Engine", () => {
  const mockCandidates: CandidateListing[] = [
    {
      id: "listing-rice-1",
      productId: "b0000000-0000-0000-0000-000000000004",
      productName: "Milled Parboiled Rice",
      categoryName: "Grains & Cereals",
      categoryId: "a0000000-0000-0000-0000-000000000001",
      sellerId: "seller-1",
      sellerName: "Eko Agro Mills",
      title: "50kg Premium Parboiled Rice",
      description: "Clean destoned parboiled rice",
      pricePerUnit: 85000,
      unit: "50kg Bag",
      minimumOrderQuantity: 1,
      quantityAvailable: 20,
      state: "Lagos",
      lga: "Kosofe",
    },
    {
      id: "listing-beans-1",
      productId: "b0000000-0000-0000-0000-000000000011",
      productName: "Brown Beans (Cowpea)",
      categoryName: "Legumes & Pulses",
      categoryId: "a0000000-0000-0000-0000-000000000005",
      sellerId: "seller-2",
      sellerName: "Kano Grains Depot",
      title: "50kg Drum Beans Bag",
      description: "Weevil-free dry brown beans",
      pricePerUnit: 60000,
      unit: "50kg Bag",
      minimumOrderQuantity: 1,
      quantityAvailable: 15,
      state: "Kano",
      lga: "Dawakin Tofa",
    },
    {
      id: "listing-garri-1",
      productId: "b0000000-0000-0000-0000-000000000007",
      productName: "White Garri",
      categoryName: "Roots & Tubers",
      categoryId: "a0000000-0000-0000-0000-000000000002",
      sellerId: "seller-3",
      sellerName: "Oyo Cassava Hub",
      title: "50kg White Garri",
      description: "Dry coarse fermented cassava flakes",
      pricePerUnit: 42000,
      unit: "50kg Bag",
      minimumOrderQuantity: 1,
      quantityAvailable: 30,
      state: "Lagos",
      lga: "Ikeja",
    },
    {
      id: "listing-tomatoes-1",
      productId: "b0000000-0000-0000-0000-000000000008",
      productName: "Roma Tomatoes",
      categoryName: "Vegetables",
      categoryId: "a0000000-0000-0000-0000-000000000003",
      sellerId: "seller-4",
      sellerName: "Jos Fresh Farms",
      title: "Fresh Roma Tomatoes Crate",
      description: "Firm ripe tomatoes",
      pricePerUnit: 25000,
      unit: "Crate",
      minimumOrderQuantity: 1,
      quantityAvailable: 50,
      state: "Lagos",
      lga: "Kosofe",
    },
  ];

  const mockBenchmarks = new Map<string, PriceBenchmark>([
    [
      "b0000000-0000-0000-0000-000000000004",
      {
        productId: "b0000000-0000-0000-0000-000000000004",
        benchmarkPrice: 88000,
        unit: "50kg Bag",
        dataQualityLabel: "VERIFIED",
      },
    ],
    [
      "b0000000-0000-0000-0000-000000000007",
      {
        productId: "b0000000-0000-0000-0000-000000000007",
        benchmarkPrice: 45000,
        unit: "50kg Bag",
        dataQualityLabel: "OBSERVED",
      },
    ],
  ]);

  describe("1. Buyer Preferences Validation Schema", () => {
    it("accepts valid preferences payload with budget and Nigerian state", () => {
      const parsed = updateUserPreferencesSchema.safeParse({
        budgetTargetBasket: 150000,
        budgetTargetMonthly: 400000,
        state: "Lagos",
        lga: "Kosofe",
        familySize: 5,
        dietaryPreferences: ["HALAL", "LOCAL_STAPLES"],
        preferredStaples: ["Rice", "Beans"],
        purchasingFrequency: "BIWEEKLY",
        basketPurpose: "HOUSEHOLD",
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.budgetTargetBasket).toBe(150000);
        expect(parsed.data.state).toBe("Lagos");
        expect(parsed.data.familySize).toBe(5);
      }
    });

    it("rejects non-positive budgets and invalid Nigerian states", () => {
      const invalidBudget = updateUserPreferencesSchema.safeParse({
        budgetTargetBasket: -5000,
        state: "Lagos",
      });
      expect(invalidBudget.success).toBe(false);

      const invalidState = updateUserPreferencesSchema.safeParse({
        budgetTargetBasket: 50000,
        state: "Atlantis",
      });
      expect(invalidState.success).toBe(false);

      const invalidFamily = updateUserPreferencesSchema.safeParse({
        familySize: 0,
      });
      expect(invalidFamily.success).toBe(false);
    });

    it("applies secure defaults for household size and purchasing frequency", () => {
      const parsed = updateUserPreferencesSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.familySize).toBe(4);
        expect(parsed.data.purchasingFrequency).toBe("BIWEEKLY");
        expect(parsed.data.basketPurpose).toBe("HOUSEHOLD");
      }
    });

    it("validates generateBasketSchema input correctly", () => {
      const valid = generateBasketSchema.safeParse({
        budget: 100000,
        state: "Lagos",
        familySize: 4,
        basketPurpose: "HOUSEHOLD",
      });
      expect(valid.success).toBe(true);

      const invalid = generateBasketSchema.safeParse({
        budget: -100,
        state: "InvalidState",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("2. Deterministic Recommendation Engine & Ranking", () => {
    const provider = new DeterministicRecommendationProvider();

    it("identifies matching staple preferences and scores them highest", async () => {
      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: 200000,
          state: "Lagos",
          preferredStaples: ["Rice"],
        },
        candidates: mockCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      expect(result.items.length).toBeGreaterThan(0);
      const riceItem = result.items.find((i) => i.productName.includes("Rice"));
      expect(riceItem).toBeDefined();
      expect(riceItem?.score).toBeGreaterThan(60);
      expect(riceItem?.explanations.some((e) => e.includes("preferred staple"))).toBe(true);
    });

    it("awards location proximity score for listings in buyer's target state", async () => {
      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: 200000,
          state: "Lagos",
        },
        candidates: mockCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      const lagosItem = result.items.find((i) => i.state === "Lagos");
      const kanoItem = result.items.find((i) => i.state === "Kano");

      expect(lagosItem?.explanations.some((e) => e.includes("Lagos"))).toBe(true);
      expect(lagosItem?.score).toBeGreaterThan(kanoItem?.score || 0);
    });

    it("calculates estimated savings when listing price is below benchmark", async () => {
      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: 200000,
          state: "Lagos",
        },
        candidates: mockCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      // Rice: listing ₦85,000 vs benchmark ₦88,000 -> ₦3,000 savings
      const riceItem = result.items.find((i) => i.productId === "b0000000-0000-0000-0000-000000000004");
      expect(riceItem?.estimatedSavings).toBe(3000);
      expect(result.estimatedSavings).toBeGreaterThanOrEqual(3000);
    });

    it("generates honest, data-grounded explanations for every item", async () => {
      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: 150000,
          state: "Lagos",
        },
        candidates: mockCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      for (const item of result.items) {
        expect(item.explanations.length).toBeGreaterThan(0);
        // Explanation must not contain fake AI claims
        for (const exp of item.explanations) {
          expect(exp.toLowerCase()).not.toContain("neural");
          expect(exp.toLowerCase()).not.toContain("gpt");
          expect(exp.toLowerCase()).not.toContain("machine learning");
        }
      }
    });
  });

  describe("3. Budget Constraint & Knapsack Mechanics", () => {
    const provider = new DeterministicRecommendationProvider();

    it("strictly never exceeds the stated buyer budget", async () => {
      const tightBudget = 100000;
      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: tightBudget,
          state: "Lagos",
        },
        candidates: mockCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      expect(result.estimatedTotalCost).toBeLessThanOrEqual(tightBudget);
      expect(result.budgetRemaining).toBeGreaterThanOrEqual(0);
      expect(result.budgetRemaining).toBe(tightBudget - result.estimatedTotalCost);
    });

    it("returns transparent empty basket explanation if budget cannot afford any single item MOQ", async () => {
      const tooLowBudget = 15000; // Lowest candidate is tomatoes at ₦25,000
      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: tooLowBudget,
          state: "Lagos",
        },
        candidates: mockCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      expect(result.items).toHaveLength(0);
      expect(result.estimatedTotalCost).toBe(0);
      expect(result.rationale).toContain("No complete produce bundle could be created within your stated budget");
    });
  });

  describe("4. Candidate Filtering & Exclusions", () => {
    const provider = new DeterministicRecommendationProvider();

    it("excludes user-excluded products and categories", async () => {
      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: 300000,
          state: "Lagos",
          excludedProducts: ["b0000000-0000-0000-0000-000000000004"], // Exclude Rice
          excludedCategories: ["a0000000-0000-0000-0000-000000000005"], // Exclude Legumes
        },
        candidates: mockCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      const productIds = result.items.map((i) => i.productId);
      expect(productIds).not.toContain("b0000000-0000-0000-0000-000000000004");
      expect(result.items.some((i) => i.categoryName.includes("Legumes"))).toBe(false);
    });

    it("excludes out-of-stock listings or listings with available quantity below MOQ", async () => {
      const outOfStockCandidates: CandidateListing[] = [
        ...mockCandidates,
        {
          id: "listing-yam-oos",
          productId: "prod-yam",
          productName: "White Yam (Tubers)",
          categoryName: "Roots & Tubers",
          categoryId: "cat-tubers",
          sellerId: "seller-5",
          title: "100 Tubers Bundle",
          pricePerUnit: 120000,
          unit: "TUBER_100",
          minimumOrderQuantity: 1,
          quantityAvailable: 0, // OUT OF STOCK
          state: "Lagos",
        },
        {
          id: "listing-maize-below-moq",
          productId: "prod-maize",
          productName: "White Maize",
          categoryName: "Grains & Cereals",
          categoryId: "cat-grains",
          sellerId: "seller-6",
          title: "100kg Maize",
          pricePerUnit: 64000,
          unit: "100kg Bag",
          minimumOrderQuantity: 5, // MOQ = 5
          quantityAvailable: 2,   // Only 2 available (< MOQ)
          state: "Lagos",
        },
      ];

      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: 500000,
          state: "Lagos",
        },
        candidates: outOfStockCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      const listingIds = result.items.map((i) => i.listingId);
      expect(listingIds).not.toContain("listing-yam-oos");
      expect(listingIds).not.toContain("listing-maize-below-moq");
    });
  });

  describe("5. Strict Anti-Pork Policy Compliance", () => {
    const provider = new DeterministicRecommendationProvider();

    it("strictly forbids any pork/pig/swine product from entering recommendations", async () => {
      const porkTaintedCandidates: CandidateListing[] = [
        ...mockCandidates,
        {
          id: "listing-pork-1",
          productId: "prod-pork-forbidden",
          productName: "Fresh Pork Chops",
          categoryName: "Meat & Livestock",
          categoryId: "cat-meat",
          sellerId: "seller-rogue",
          title: "Fresh Farm Pork Meat",
          description: "Prime pork ribs",
          pricePerUnit: 45000,
          unit: "KG",
          minimumOrderQuantity: 1,
          quantityAvailable: 100,
          state: "Lagos",
        },
        {
          id: "listing-swine-feed",
          productId: "prod-swine-feed",
          productName: "Commercial Swine Feed",
          categoryName: "Feeds",
          categoryId: "cat-feeds",
          sellerId: "seller-rogue-2",
          title: "Swine Grower Pellets",
          pricePerUnit: 18000,
          unit: "50kg Bag",
          minimumOrderQuantity: 1,
          quantityAvailable: 50,
          state: "Lagos",
        },
      ];

      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: 500000,
          state: "Lagos",
        },
        candidates: porkTaintedCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      const names = result.items.map((i) => i.productName.toLowerCase());
      const titles = result.items.map((i) => (i.sellerName || "").toLowerCase());

      expect(names.some((n) => n.includes("pork") || n.includes("swine"))).toBe(false);
      expect(titles.some((t) => t.includes("pork") || t.includes("swine"))).toBe(false);
      expect(result.items.find((i) => i.listingId === "listing-pork-1")).toBeUndefined();
      expect(result.items.find((i) => i.listingId === "listing-swine-feed")).toBeUndefined();
    });
  });

  describe("6. Cart Integration Validation Schema", () => {
    it("validates payload for committing smart basket items into the cart", () => {
      const valid = addSmartBasketToCartSchema.safeParse({
        recommendationId: "550e8400-e29b-41d4-a716-446655440000",
        items: [
          { listingId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", quantity: 2 },
          { listingId: "7ba7b810-9dad-11d1-80b4-00c04fd430c9", quantity: 1 },
        ],
      });

      expect(valid.success).toBe(true);
    });

    it("rejects empty items array and non-uuid recommendation IDs", () => {
      const emptyItems = addSmartBasketToCartSchema.safeParse({
        recommendationId: "550e8400-e29b-41d4-a716-446655440000",
        items: [],
      });
      expect(emptyItems.success).toBe(false);

      const invalidUuid = addSmartBasketToCartSchema.safeParse({
        recommendationId: "not-a-uuid",
        items: [{ listingId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", quantity: 1 }],
      });
      expect(invalidUuid.success).toBe(false);
    });
  });

  describe("7. Safe Units and Quantity Constraints", () => {
    const provider = new DeterministicRecommendationProvider();

    it("respects minimum order quantity (MOQ) and never recommends less than MOQ", async () => {
      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: 200000,
          state: "Lagos",
        },
        candidates: mockCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      for (const item of result.items) {
        expect(item.recommendedQuantity).toBeGreaterThanOrEqual(item.moq);
        expect(item.recommendedQuantity).toBeLessThanOrEqual(item.quantityAvailable);
      }
    });

    it("preserves discrete units (Crate, Basket, Bunch) without inventing synthetic weights", async () => {
      const context: RecommendationContext = {
        userId: "user-123",
        input: {
          budget: 200000,
          state: "Lagos",
        },
        candidates: mockCandidates,
        benchmarks: mockBenchmarks,
      };

      const result = await provider.generateRecommendations(context);

      const crateItem = result.items.find((i) => i.unit === "Crate");
      expect(crateItem).toBeDefined();
      expect(crateItem?.unit).toBe("Crate");
      // Must not convert Crate to KG
      expect(crateItem?.unit).not.toBe("KG");
    });
  });
});
