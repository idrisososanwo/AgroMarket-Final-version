import { describe, it, expect } from "vitest";
import {
  aggregateDemandVolume,
  detectDemandTrend,
  calculateDemandPressure,
  calculateDemandVolatility,
  evaluateDemandConcentration,
  detectUnmetDemand,
  calculateDeterministicDemandForecast,
} from "@/features/demand-intelligence/calculations";
import { runDemandForecastingAgent } from "@/features/demand-intelligence/agent";
import { MockTestingProvider } from "@/features/intelligence/ai-provider";

describe("Phase 2.5: Demand Forecasting & Intelligence Pure Calculations", () => {
  it("A. Demand Normalization: converts compatible units and safely excludes incompatible packaging", () => {
    const rawOrders = [
      { quantity: 20, unit: "50kg bag" }, // 1000 kg
      { quantity: 500, unit: "kg" },       // 500 kg
      { quantity: 10, unit: "25kg bag" },  // 250 kg
      { quantity: 5, unit: "crate" },      // Incompatible discrete packaging
    ];

    const result = aggregateDemandVolume(rawOrders, "KG");
    expect(result.totalVolume).toBe(1750);
    expect(result.validCount).toBe(3);
    expect(result.incompatibleCount).toBe(1);
  });

  it("B. Demand Trend Detection: detects SHARP_INCREASE and B2B_DRIVEN_INCREASE", () => {
    const trend = detectDemandTrend({
      commodity: "Roma Tomatoes",
      state: "Lagos",
      targetUnit: "KG",
      currentPeriodVolume30d: 5000,
      previousPeriodVolume30d: 3000, // +66.7%
      volume7d: 1200,
      volume90d: 9000,
      observationCount: 15,
      b2bVolume30d: 3500, // 70% B2B
      consumerVolume30d: 1500,
    });

    expect(trend.direction).toBe("SHARP_INCREASE");
    expect(trend.classification).toBe("B2B_DRIVEN_INCREASE");
    expect(trend.percentageChange30d).toBeGreaterThanOrEqual(25);
    expect(trend.confidence).toBeGreaterThan(0.7);
    expect(trend.calibratedObservation).toContain("sharp increase");
  });

  it("C. Demand Trend Detection: detects MODERATE_DECREASE and DECLINING", () => {
    const trend = detectDemandTrend({
      commodity: "Yellow Maize",
      state: "Kano",
      targetUnit: "KG",
      currentPeriodVolume30d: 8200,
      previousPeriodVolume30d: 10000, // -18%
      volume7d: 1800,
      volume90d: 28000,
      observationCount: 12,
      b2bVolume30d: 4000,
      consumerVolume30d: 4200,
    });

    expect(trend.direction).toBe("MODERATE_DECREASE");
    expect(trend.classification).toBe("DECLINING");
    expect(trend.percentageChange30d).toBeLessThan(0);
  });

  it("D. Stable Demand Detection", () => {
    const trend = detectDemandTrend({
      commodity: "Cassava Tubers",
      state: "Oyo",
      targetUnit: "KG",
      currentPeriodVolume30d: 5100,
      previousPeriodVolume30d: 5000, // +2%
      volume7d: 1200,
      volume90d: 15000,
      observationCount: 8,
      b2bVolume30d: 2000,
      consumerVolume30d: 3100,
    });

    expect(trend.direction).toBe("STABLE");
    expect(trend.classification).toBe("STABLE");
  });

  it("E. Sparse Data Handling: flags insufficient data when observations are sparse", () => {
    const trend = detectDemandTrend({
      commodity: "Soybeans",
      state: "Benue",
      targetUnit: "KG",
      currentPeriodVolume30d: 200,
      previousPeriodVolume30d: 0,
      volume7d: 0,
      volume90d: 200,
      observationCount: 1, // Only 1 order
      b2bVolume30d: 0,
      consumerVolume30d: 200,
    });

    expect(trend.direction).toBe("INSUFFICIENT_DATA");
    expect(trend.classification).toBe("INSUFFICIENT_EVIDENCE");
    expect(trend.confidence).toBeLessThanOrEqual(0.3);
  });

  it("F. Demand Pressure Calculation: computes explainable bounded score (0-100)", () => {
    const pressure = calculateDemandPressure({
      commodity: "Roma Tomatoes",
      state: "Lagos",
      growthDelta: 30, // 30% growth
      b2bVolume: 5000,
      totalVolume: 8000,
      orderCount30d: 12,
      unmetDeficit: 2000,
      observationCount: 15,
    });

    expect(pressure.score).toBeGreaterThanOrEqual(0);
    expect(pressure.score).toBeLessThanOrEqual(100);
    expect(["MODERATE", "ELEVATED", "ACUTE", "CRITICAL"]).toContain(pressure.level);
    expect(pressure.drivers.length).toBeGreaterThan(0);
    expect(pressure.growthFactor).toBeGreaterThan(50);
  });

  it("G. Demand Volatility: computes coefficient of variation and volatility level", () => {
    // Highly volatile daily demand
    const volatileDaily = [100, 2500, 50, 4200, 80, 3100];
    const volResult = calculateDemandVolatility(volatileDaily);
    expect(volResult.level).toBe("HIGH");
    expect(volResult.coefficientOfVariation).toBeGreaterThanOrEqual(0.75);

    // Stable daily demand
    const stableDaily = [500, 520, 490, 510, 505, 495];
    const stableResult = calculateDemandVolatility(stableDaily);
    expect(stableResult.level).toBe("LOW");
    expect(stableResult.coefficientOfVariation).toBeLessThan(0.35);

    // Insufficient data points
    const sparseResult = calculateDemandVolatility([500, 600]);
    expect(sparseResult.level).toBe("INSUFFICIENT_DATA");
  });

  it("H. Demand Concentration: detects regional vs commercial B2B concentration", () => {
    // Heavily B2B concentrated
    const b2bConcentrated = evaluateDemandConcentration({
      stateVolumes: { Lagos: 10000 },
      targetState: "Lagos",
      b2bVolume: 8500, // 85% B2B
      totalVolume: 10000,
    });
    expect(b2bConcentrated.level).toBe("CONCENTRATED_B2B");
    expect(b2bConcentrated.calibratedStatement).toContain("B2B procurement");

    // Regionally concentrated
    const regionalConcentrated = evaluateDemandConcentration({
      stateVolumes: { Lagos: 7000, Kano: 1500, Oyo: 1500 },
      targetState: "Lagos", // 70% in Lagos
      b2bVolume: 2000,
      totalVolume: 10000,
    });
    expect(regionalConcentrated.level).toBe("CONCENTRATED_REGIONAL");
  });

  it("I. Unmet Demand Detection: identifies when buyer demand exceeds available listed inventory", () => {
    const unmet = detectUnmetDemand({
      commodity: "Roma Tomatoes",
      state: "Lagos",
      activeB2BQuantity: 4000,
      activeCartInterestQuantity: 1500,
      activeSupplyQuantity: 2000, // Supply is only 2,000 against 5,500 demand
      unit: "KG",
    });

    expect(unmet.unmetDemandDetected).toBe(true);
    expect(unmet.deficitQuantity).toBe(3500);
    expect(unmet.calibratedNote).toContain("exceeds currently available");

    const balanced = detectUnmetDemand({
      commodity: "Roma Tomatoes",
      state: "Lagos",
      activeB2BQuantity: 1000,
      activeCartInterestQuantity: 500,
      activeSupplyQuantity: 3000, // Supply is 3,000 against 1,500 demand
      unit: "KG",
    });

    expect(balanced.unmetDemandDetected).toBe(false);
    expect(balanced.deficitQuantity).toBeNull();
  });

  it("J. Deterministic Demand Forecast: uses 30-day moving average and scales with horizon", () => {
    const historicalOrders = [
      { quantity: 300, unit: "kg", createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { quantity: 600, unit: "kg", createdAt: new Date(Date.now() - 12 * 86400000).toISOString() },
      { quantity: 900, unit: "kg", createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    ];

    const forecast7d = calculateDeterministicDemandForecast({
      commodity: "Roma Tomatoes",
      state: "Kano",
      historicalOrders,
      forecastHorizonDays: 7,
      dataWindowDays: 30,
      volumeUnit: "KG",
    });

    expect(forecast7d.predictedDemandVolume).toBeGreaterThan(0);
    expect(forecast7d.volumeUnit).toBe("KG");
    expect(forecast7d.confidenceScore).toBeGreaterThan(0.5);
    expect(forecast7d.limitations).toBeDefined();
  });
});

describe("Phase 2.5: Demand Forecasting Agent Orchestration & Safety", () => {
  it("K. Anti-Pork Prohibition: strictly rejects pig/pork terms across all boundaries", async () => {
    await expect(
      runDemandForecastingAgent({
        commodity: "Pork Ribs",
        state: "Lagos",
        skipAIEvaluation: true,
      })
    ).rejects.toThrow(/prohibited produce/i);

    await expect(
      runDemandForecastingAgent({
        commodity: "Swine Meat",
        state: "Kano",
        skipAIEvaluation: true,
      })
    ).rejects.toThrow(/prohibited produce/i);
  });

  it("L. Graceful Fallback: executes deterministic demand pipeline when AI provider is skipped", async () => {
    // Mock Supabase client returning sample real data
    const mockSupabase = {
      from: (table: string) => {
        if (table === "products") {
          return {
            select: () => ({
              ilike: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: { id: "prod-1", name: "Roma Tomatoes", default_unit: "KG" },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "order_items") {
          return {
            select: () => ({
              gte: () => ({
                not: () => ({
                  eq: async () => ({
                    data: [
                      {
                        id: "oi-1",
                        quantity: 400,
                        unit_snapshot: "KG",
                        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
                        orders: { id: "o-1", status: "COMPLETED", delivery_state: "Lagos", shared_purchase_id: null },
                      },
                      {
                        id: "oi-2",
                        quantity: 600,
                        unit_snapshot: "KG",
                        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
                        orders: { id: "o-2", status: "COMPLETED", delivery_state: "Lagos", shared_purchase_id: null },
                      },
                    ],
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "b2b_demands") {
          return {
            select: () => ({
              ilike: () => ({
                in: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [
                        {
                          id: "b2b-1",
                          title: "Tomatoes for Canning",
                          quantity: 2000,
                          unit: "KG",
                          state: "Lagos",
                          status: "ACTIVE",
                          created_at: new Date().toISOString(),
                          desired_delivery_date: "2026-11-01",
                        },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "cart_items") {
          return {
            select: () => ({
              eq: async () => ({
                data: [{ id: "ci-1", quantity: 50, listings: { product_id: "prod-1", state: "Lagos" } }],
              }),
            }),
          };
        }
        if (table === "shared_purchases") {
          return {
            select: () => ({
              ilike: () => ({
                in: () => ({
                  limit: async () => ({ data: [] }),
                }),
              }),
            }),
          };
        }
        if (table === "listings") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const builder: any = {
            eq: () => builder,
            ilike: () => builder,
            limit: async () => ({
              data: [{ id: "l-1", title: "Fresh Tomatoes", quantity: 800, unit: "KG", state: "Lagos" }],
            }),
          };
          return {
            select: () => builder,
          };
        }
        if (table === "agricultural_intelligence_signals") {
          return {
            select: () => ({
              or: () => ({
                order: () => ({
                  limit: async () => ({ data: [] }),
                }),
              }),
            }),
          };
        }
        if (table === "demand_intelligence_snapshots") {
          return {
            insert: async () => ({ data: null, error: null }),
          };
        }
        return {
          select: () => ({
            limit: async () => ({ data: [] }),
          }),
        };
      },
    };

    const res = await runDemandForecastingAgent({
      commodity: "Roma Tomatoes",
      state: "Lagos",
      skipAIEvaluation: true,
      supabaseClient: mockSupabase,
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe("DETERMINISTIC_ONLY");
    expect(res.snapshot.channels.consumer.volume).toBe(1000);
    expect(res.snapshot.channels.b2b.requestedVolume).toBe(2000);
    expect(res.snapshot.unmetDemand.unmetDemandDetected).toBe(true);
    expect(res.snapshot.signals.length).toBeGreaterThan(0);
    expect(res.requiresHumanReview).toBe(true);
  });

  it("M. Full Pipeline with AI Reasoning: verifies non-autonomous advisory recommendation", async () => {
    const mockSupabase = {
      from: (table: string) => {
        if (table === "products") {
          return {
            select: () => ({
              ilike: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: { id: "prod-1", name: "Roma Tomatoes", default_unit: "KG" },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "order_items") {
          return {
            select: () => ({
              gte: () => ({
                not: () => ({
                  eq: async () => ({
                    data: [
                      {
                        id: "oi-1",
                        quantity: 500,
                        unit_snapshot: "KG",
                        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
                        orders: { id: "o-1", status: "COMPLETED", delivery_state: "Lagos", shared_purchase_id: null },
                      },
                      {
                        id: "oi-2",
                        quantity: 700,
                        unit_snapshot: "KG",
                        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
                        orders: { id: "o-2", status: "COMPLETED", delivery_state: "Lagos", shared_purchase_id: null },
                      },
                    ],
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "b2b_demands") {
          return {
            select: () => ({
              ilike: () => ({
                in: () => ({
                  order: () => ({
                    limit: async () => ({ data: [] }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "cart_items") {
          return {
            select: () => ({
              eq: async () => ({ data: [] }),
            }),
          };
        }
        if (table === "shared_purchases") {
          return {
            select: () => ({
              ilike: () => ({
                in: () => ({
                  limit: async () => ({ data: [] }),
                }),
              }),
            }),
          };
        }
        if (table === "listings") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const builder: any = {
            eq: () => builder,
            ilike: () => builder,
            limit: async () => ({ data: [] }),
          };
          return {
            select: () => builder,
          };
        }
        if (table === "agricultural_intelligence_signals") {
          return {
            select: () => ({
              or: () => ({
                order: () => ({
                  limit: async () => ({ data: [] }),
                }),
              }),
            }),
          };
        }
        if (table === "demand_intelligence_snapshots" || table === "ai_reasoning_runs" || table === "agricultural_intelligence_recommendations") {
          return {
            insert: async () => ({ data: null, error: null }),
          };
        }
        return {
          select: () => ({ limit: async () => ({ data: [] }) }),
        };
      },
    };

    const mockAiProvider = new MockTestingProvider();

    const res = await runDemandForecastingAgent({
      commodity: "Roma Tomatoes",
      state: "Lagos",
      aiProvider: mockAiProvider,
      skipAIEvaluation: false,
      supabaseClient: mockSupabase,
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe("COMPLETED");
    expect(res.aiInterpretation).toBeDefined();
    expect(res.proposedRecommendation).toBeDefined();
    expect(res.proposedRecommendation?.status).toBe("PROPOSED");
    expect(res.proposedRecommendation?.objective).toBe("DEMAND_FULFILLMENT");
    expect(res.requiresHumanReview).toBe(true);
  });
});
