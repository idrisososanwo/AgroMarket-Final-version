import { describe, it, expect } from "vitest";
import {
  calculateCommodityPriceTrend,
  calculateDemandAnalysis,
  calculateSupplyAnalysis,
  calculateRegionalComparison,
  calculateMarketPressure,
  RawPriceObservationItem,
  RawDemandObservationItem,
  RawSupplyObservationItem,
} from "@/features/market-intelligence/calculations";
import { runMarketIntelligenceAgent } from "@/features/market-intelligence/agent";
import { MockTestingProvider } from "@/features/intelligence/ai-provider";

describe("Phase 2.3: Market Intelligence Agent Deterministic Calculations", () => {
  const now = new Date();
  const dayMs = 86400000;

  it("calculates 7d, 30d, 90d price trends with normalized units", () => {
    const observations: RawPriceObservationItem[] = [
      // Current window (< 7 days ago): ₦600/kg
      {
        price: 600,
        unit: "kg",
        normalizedPrice: 600,
        normalizedUnit: "KG",
        state: "Kano",
        observedAt: new Date(now.getTime() - 2 * dayMs).toISOString(),
      },
      // 30-day window (15 days ago): ₦500/kg
      {
        price: 500,
        unit: "kg",
        normalizedPrice: 500,
        normalizedUnit: "KG",
        state: "Kano",
        observedAt: new Date(now.getTime() - 40 * dayMs).toISOString(),
      },
    ];

    const trend = calculateCommodityPriceTrend({
      commodity: "Yellow Maize",
      state: "Kano",
      observations,
    });

    expect(trend.commodity).toBe("Yellow Maize");
    expect(trend.state).toBe("Kano");
    expect(trend.currentPrice).toBe(600);
    expect(trend.previousPrice30d).toBe(500);
    expect(trend.percentageChange30d).toBe(20.0); // +20%
    expect(trend.trendDirection).toBe("SHARP_INCREASE");
    expect(trend.isNormalized).toBe(true);
  });

  it("handles insufficient price observations gracefully", () => {
    const observations: RawPriceObservationItem[] = [
      {
        price: 850,
        unit: "kg",
        state: "Oyo",
        observedAt: new Date().toISOString(),
      },
    ];

    const trend = calculateCommodityPriceTrend({
      commodity: "Cassava Tubers",
      state: "Oyo",
      observations,
    });

    expect(trend.trendDirection).toBe("INSUFFICIENT_DATA");
    expect(trend.percentageChange30d).toBeNull();
    expect(trend.confidence).toBeLessThanOrEqual(0.3);
  });

  it("calculates demand volume, status, and growth", () => {
    const demandItems: RawDemandObservationItem[] = [
      {
        quantity: 500,
        unit: "kg",
        sourceType: "B2B_DEMAND",
        state: "Lagos",
        observedAt: new Date().toISOString(),
      },
      {
        quantity: 1,
        unit: "ORDER",
        sourceType: "ORDER",
        state: "Lagos",
        observedAt: new Date().toISOString(),
      },
    ];

    const demand = calculateDemandAnalysis({
      commodity: "Broiler Chicken",
      state: "Lagos",
      demandItems,
      baselineDemandIndex: 400,
    });

    expect(demand.commodity).toBe("Broiler Chicken");
    expect(demand.totalDemandIndex).toBe(525); // 500 + 25 from order
    expect(demand.status).toBe("SURGING"); // (525-400)/400 = 31.25% > 25%
    expect(demand.confidence).toBeGreaterThan(0.5);
  });

  it("calculates supply balance and identifies shortage/surplus", () => {
    const shortageItems: RawSupplyObservationItem[] = [
      {
        quantity: 100,
        unit: "kg",
        sourceType: "HARVEST_OUTPUT",
        state: "Benue",
        observedAt: new Date().toISOString(),
      },
    ];

    const shortageResult = calculateSupplyAnalysis({
      commodity: "Benue White Yam",
      state: "Benue",
      supplyItems: shortageItems,
      expectedDemandQuantity: 300, // Supply ratio = 100 / 300 = 0.33 < 0.75
    });

    expect(shortageResult.status).toBe("SHORTAGE");
    expect(shortageResult.estimatedDeficitOrSurplusPercent).toBeLessThan(0);

    const surplusItems: RawSupplyObservationItem[] = [
      {
        quantity: 1500,
        unit: "kg",
        sourceType: "AGGREGATION_POOL",
        state: "Benue",
        observedAt: new Date().toISOString(),
      },
    ];

    const surplusResult = calculateSupplyAnalysis({
      commodity: "Benue White Yam",
      state: "Benue",
      supplyItems: surplusItems,
      expectedDemandQuantity: 500, // Supply ratio = 1500 / 500 = 3.0 > 1.3
    });

    expect(surplusResult.status).toBe("SURPLUS");
    expect(surplusResult.estimatedDeficitOrSurplusPercent).toBe(200.0);
  });

  it("computes regional price differential using calibrated non-speculative language", () => {
    const baseObs: RawPriceObservationItem[] = [
      { price: 400, unit: "kg", state: "Kano", observedAt: new Date().toISOString() },
      { price: 420, unit: "kg", state: "Kano", observedAt: new Date().toISOString() },
    ];

    const compObs: RawPriceObservationItem[] = [
      { price: 500, unit: "kg", state: "Lagos", observedAt: new Date().toISOString() },
      { price: 520, unit: "kg", state: "Lagos", observedAt: new Date().toISOString() },
    ];

    const comp = calculateRegionalComparison({
      commodity: "Yellow Maize",
      baseState: "Kano",
      comparisonState: "Lagos",
      baseObservations: baseObs,
      comparisonObservations: compObs,
    });

    expect(comp).not.toBeNull();
    expect(comp!.basePriceNormalized).toBe(410);
    expect(comp!.comparisonPriceNormalized).toBe(510);
    expect(comp!.priceDifferentialNGN).toBe(100);
    expect(comp!.percentageDifferential).toBe(24.4);
    expect(comp!.calibratedObservation).toContain("Price differential observed");
    expect(comp!.calibratedObservation).not.toContain("guaranteed");
    expect(comp!.calibratedObservation).not.toContain("profit");
  });

  it("calculates composite market pressure index with calibrated score boundaries", () => {
    const priceTrend = calculateCommodityPriceTrend({
      commodity: "Yellow Maize",
      state: "Kaduna",
      observations: [
        { price: 650, unit: "kg", state: "Kaduna", observedAt: new Date().toISOString() },
        { price: 450, unit: "kg", state: "Kaduna", observedAt: new Date(now.getTime() - 40 * dayMs).toISOString() },
      ],
    });

    const supplyAnalysis = calculateSupplyAnalysis({
      commodity: "Yellow Maize",
      state: "Kaduna",
      supplyItems: [{ quantity: 50, unit: "kg", sourceType: "HARVEST_OUTPUT", state: "Kaduna", observedAt: new Date().toISOString() }],
      expectedDemandQuantity: 200, // acute deficit
    });

    const demandAnalysis = calculateDemandAnalysis({
      commodity: "Yellow Maize",
      state: "Kaduna",
      demandItems: [{ quantity: 500, unit: "kg", sourceType: "B2B_DEMAND", state: "Kaduna", observedAt: new Date().toISOString() }],
      baselineDemandIndex: 300, // surge
    });

    const pressure = calculateMarketPressure({
      commodity: "Yellow Maize",
      state: "Kaduna",
      priceTrend,
      supplyAnalysis,
      demandAnalysis,
      disruptions: [
        { severity: "HIGH", type: "SECURITY", state: "Kaduna", description: "Corridor check delay" },
      ],
    });

    expect(pressure.pressureScore).toBeGreaterThanOrEqual(70);
    expect(["ACUTE", "CRITICAL"]).toContain(pressure.pressureLevel);
    expect(pressure.drivers.length).toBeGreaterThan(0);
    expect(pressure.risks.length).toBeGreaterThan(0);
  });

  it("strictly enforces anti-pork prohibition across all calculations", () => {
    expect(() =>
      calculateCommodityPriceTrend({
        commodity: "Pork Meat",
        state: "Plateau",
        observations: [],
      })
    ).toThrow(/prohibited/i);

    expect(() =>
      calculateDemandAnalysis({
        commodity: "Live Swine",
        state: "Plateau",
        demandItems: [],
      })
    ).toThrow(/prohibited/i);

    expect(() =>
      calculateMarketPressure({
        commodity: "Bacon Chunks",
        state: "Plateau",
      })
    ).toThrow(/prohibited/i);
  });
});

describe("Phase 2.3: Market Intelligence Agent Orchestrator & Safety Loop", () => {
  it("executes the pipeline with mock AI provider and proposes advisory recommendation", async () => {
    const mockProvider = new MockTestingProvider();

    // Chainable mock builder that safely resolves any chain to empty array { data: [], error: null }
    type MockChain = {
      [key: string]: (...args: unknown[]) => MockChain;
    } & {
      then: (resolve: (val: { data: unknown[]; error: null }) => void) => void;
    };

    const createChainableMock = (): MockChain => {
      const mockObj = {
        then: (resolve: (val: { data: unknown[]; error: null }) => void) =>
          resolve({ data: [], error: null }),
      } as MockChain;

      const methods = [
        "select", "insert", "update", "delete", "eq", "neq", "ilike", "like",
        "in", "contains", "order", "limit", "gte", "lte", "gt", "lt", "range", "single"
      ];
      for (const m of methods) {
        mockObj[m] = () => mockObj;
      }
      return mockObj;
    };

    const mockSupabase = {
      from: () => createChainableMock(),
    };

    const result = await runMarketIntelligenceAgent({
      commodity: "Yellow Maize",
      state: "Kano",
      aiProvider: mockProvider,
      supabaseClient: mockSupabase,
    });

    expect(result.commodity).toBe("Yellow Maize");
    expect(result.state).toBe("Kano");
    expect(result.requiresHumanReview).toBe(true);
    // Even with empty empirical data, returns safe deterministic fallback
    expect(["INSUFFICIENT_EVIDENCE", "COMPLETED", "DETERMINISTIC_ONLY"]).toContain(result.status);
  });

  it("refuses to run for prohibited pork produce", async () => {
    await expect(
      runMarketIntelligenceAgent({
        commodity: "Pork Ribs",
        state: "Lagos",
      })
    ).rejects.toThrow(/prohibited/i);
  });
});
