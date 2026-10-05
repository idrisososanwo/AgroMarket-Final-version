import { describe, it, expect } from "vitest";
import {
  inferProductionDomain,
  evaluateSeasonalAlignment,
  calculateProductionOpportunityScore,
  calculateProductionRiskScore,
} from "@/features/production-planning/calculations";
import { runProductionPlanningAgent } from "@/features/production-planning/agent";
import { MockTestingProvider } from "@/features/intelligence/ai-provider";
import { MarketIntelligenceSnapshot } from "@/features/market-intelligence/types";

describe("Phase 2.4: Production Planning Deterministic Calculations", () => {
  it("infers agricultural domain correctly across crops, livestock, poultry, and aquaculture", () => {
    expect(inferProductionDomain("Broiler Chicken")).toBe("POULTRY");
    expect(inferProductionDomain("Layer Eggs")).toBe("POULTRY");
    expect(inferProductionDomain("Beef Cattle")).toBe("LIVESTOCK");
    expect(inferProductionDomain("African Catfish (Clarias)")).toBe("AQUACULTURE");
    expect(inferProductionDomain("Yellow Maize")).toBe("CROPS");
    expect(inferProductionDomain("Roma Tomatoes")).toBe("CROPS");
  });

  it("evaluates seasonal alignment using verified Nigerian calendars", () => {
    // January is month 0: Roma tomatoes peak harvest
    const janDate = new Date(2026, 0, 15);
    const tomatoSeasonal = evaluateSeasonalAlignment("Roma Tomatoes", janDate);
    expect(tomatoSeasonal.alignment).toBe("PEAK_WINDOW");
    expect(tomatoSeasonal.rationale).toContain("Peak northern irrigation harvest");

    // Unmapped commodity returns INSUFFICIENT_DATA
    const unknownSeasonal = evaluateSeasonalAlignment("Exotic Passionfruit", janDate);
    expect(unknownSeasonal.alignment).toBe("INSUFFICIENT_DATA");
  });

  it("calculates production opportunity score with calibrated non-speculative notice", () => {
    const mockMarketSnapshot: MarketIntelligenceSnapshot = {
      commodity: "Roma Tomatoes",
      state: "Kano",
      priceTrend: {
        commodity: "Roma Tomatoes",
        state: "Kano",
        unit: "KG",
        currency: "NGN",
        currentPrice: 750,
        previousPrice7d: 650,
        previousPrice30d: 600,
        previousPrice90d: 550,
        percentageChange7d: 15.4,
        percentageChange30d: 25.0,
        percentageChange90d: 36.4,
        trendDirection: "SHARP_INCREASE",
        observationCount: 12,
        lastObservedAt: new Date().toISOString(),
        confidence: 0.9,
        isNormalized: true,
      },
      demandAnalysis: {
        commodity: "Roma Tomatoes",
        state: "Kano",
        b2bDemandVolume: 800,
        completedOrdersCount: 20,
        sharedPurchaseDemandVolume: 200,
        totalDemandIndex: 1500,
        baselineDemandIndex: 1000,
        percentageChange: 50.0,
        status: "SURGING",
        demandType: "SUSTAINED_INCREASE",
        confidence: 0.85,
        observationCount: 25,
        lastObservedAt: new Date().toISOString(),
      },
      supplyAnalysis: {
        commodity: "Roma Tomatoes",
        state: "Kano",
        activeListingsCount: 5,
        availableHarvestQuantity: 400,
        aggregationPoolQuantity: 200,
        totalSupplyQuantity: 600,
        unit: "KG",
        status: "SHORTAGE",
        estimatedDeficitOrSurplusPercent: -60.0,
        confidence: 0.85,
        observationCount: 15,
        lastObservedAt: new Date().toISOString(),
      },
      regionalComparisons: [],
      marketPressure: {
        commodity: "Roma Tomatoes",
        state: "Kano",
        pressureScore: 82.5,
        pressureLevel: "ACUTE",
        pricePressure: 85,
        supplyPressure: 80,
        demandPressure: 85,
        disruptionPressure: 20,
        confidence: 0.88,
        drivers: ["Price inflation", "Supply deficit"],
        risks: ["Procurement rationing"],
        evidenceCount: 30,
        calculatedAt: new Date().toISOString(),
      },
      signals: [],
      evidenceCount: 45,
      hasSufficientEvidence: true,
      generatedAt: new Date().toISOString(),
    };

    const opportunity = calculateProductionOpportunityScore({
      commodity: "Roma Tomatoes",
      state: "Kano",
      domain: "CROPS",
      marketSnapshot: mockMarketSnapshot,
      seasonalAlignment: "PEAK_WINDOW",
      productionContext: {
        commodity: "Roma Tomatoes",
        state: "Kano",
        domain: "CROPS",
        activeProductionUnitsCount: 4,
        totalCapacityReported: 25,
        capacityUnit: "HA",
        availableHarvestQuantity: 600,
        harvestUnit: "KG",
        outputBatchesCount: 6,
        lastHarvestDate: new Date().toISOString(),
        hasSufficientProductionRecords: true,
      },
      constraints: {
        commodity: "Roma Tomatoes",
        state: "Kano",
        inputConstraintLevel: "NONE",
        processingConstraintLevel: "NONE",
        processingFacilityCount: 2,
        totalDailyProcessingCapacity: 2000,
        logisticsDelayEventsCount: 0,
        securityIncidentsCount: 0,
        diseaseSignalsCount: 0,
        seasonalAlignment: "PEAK_WINDOW",
      },
    });

    expect(opportunity.opportunityScore).toBeGreaterThanOrEqual(80);
    expect(opportunity.opportunityLevel).toBe("HIGH_OPPORTUNITY");
    expect(opportunity.calibratedNotice).toContain("favorable market conditions");
    expect(opportunity.calibratedNotice).not.toContain("guaranteed");
    expect(opportunity.calibratedNotice).not.toContain("profit");
  });

  it("calculates production risk score incorporating downstream bottlenecks and disruptions", () => {
    const risk = calculateProductionRiskScore({
      commodity: "Yellow Maize",
      state: "Kaduna",
      domain: "CROPS",
      constraints: {
        commodity: "Yellow Maize",
        state: "Kaduna",
        inputConstraintLevel: "SEVERE",
        processingConstraintLevel: "BOTTLENECK",
        processingFacilityCount: 1,
        totalDailyProcessingCapacity: 100,
        logisticsDelayEventsCount: 3,
        securityIncidentsCount: 2,
        diseaseSignalsCount: 1,
        seasonalAlignment: "OFF_SEASON",
      },
    });

    expect(risk.riskScore).toBeGreaterThanOrEqual(70);
    expect(["ELEVATED", "HIGH_RISK"]).toContain(risk.riskLevel);
    expect(risk.riskDrivers.length).toBeGreaterThan(0);
    expect(risk.mitigations.length).toBeGreaterThan(0);
  });

  it("strictly enforces anti-pork prohibition across all calculations", () => {
    expect(() => inferProductionDomain("Pork Chops")).toThrow(/prohibited/i);
    expect(() => evaluateSeasonalAlignment("Live Swine")).toThrow(/prohibited/i);
    expect(() =>
      calculateProductionOpportunityScore({
        commodity: "Bacon Strips",
        state: "Benue",
        domain: "LIVESTOCK",
        seasonalAlignment: "OFF_SEASON",
        productionContext: {
          commodity: "Bacon Strips",
          state: "Benue",
          domain: "LIVESTOCK",
          activeProductionUnitsCount: 0,
          totalCapacityReported: 0,
          capacityUnit: "HEAD",
          availableHarvestQuantity: 0,
          harvestUnit: "KG",
          outputBatchesCount: 0,
          lastHarvestDate: null,
          hasSufficientProductionRecords: false,
        },
        constraints: {
          commodity: "Bacon Strips",
          state: "Benue",
          inputConstraintLevel: "NONE",
          processingConstraintLevel: "NONE",
          processingFacilityCount: 0,
          totalDailyProcessingCapacity: 0,
          logisticsDelayEventsCount: 0,
          securityIncidentsCount: 0,
          diseaseSignalsCount: 0,
          seasonalAlignment: "OFF_SEASON",
        },
      })
    ).toThrow(/prohibited/i);
  });
});

describe("Phase 2.4: Production Planning Agent Orchestrator & Safety Loop", () => {
  it("executes the pipeline with mock AI provider and proposes advisory recommendation", async () => {
    const mockProvider = new MockTestingProvider();

    // Type-safe recursive mock client
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

    const result = await runProductionPlanningAgent({
      commodity: "Roma Tomatoes",
      state: "Kano",
      aiProvider: mockProvider,
      supabaseClient: mockSupabase,
    });

    expect(result.commodity).toBe("Roma Tomatoes");
    expect(result.state).toBe("Kano");
    expect(result.domain).toBe("CROPS");
    expect(result.requiresHumanReview).toBe(true);
    expect(["INSUFFICIENT_EVIDENCE", "COMPLETED", "DETERMINISTIC_ONLY"]).toContain(result.status);
  });

  it("refuses to run for prohibited pork produce", async () => {
    await expect(
      runProductionPlanningAgent({
        commodity: "Pork Sausages",
        state: "Plateau",
      })
    ).rejects.toThrow(/prohibited/i);
  });
});
