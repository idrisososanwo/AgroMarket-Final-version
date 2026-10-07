/**
 * AgroMarket Phase 3.6: Multi-Horizon Forecasting & Predictive Intelligence Layer Tests
 * Tests covering:
 * 1. Multi-horizon forecast generation (0–7d, 8–30d, 31–90d)
 * 2. Insufficient data governance (N < 3 threshold, zero fabrication)
 * 3. Deterministic methods (moving average, weighted moving average, trend extrapolation, baseline)
 * 4. Confidence calibration and range bound calculations
 * 5. Forecast versioning and immutability preservation
 * 6. Phase 3.4 evaluation integration (absolute error, percentage error with zero-divide guard, direction match)
 * 7. Security, Privacy, and Anti-Pork invariants
 * 8. Domain safety boundaries (biosecurity and logistics disclaimers)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateMultiHorizonForecast,
  createForecastVersion,
  generateMarketForecast,
  generateDemandForecast,
  generateSupplyForecast,
  generateProductionOutlook,
  generateLogisticsForecast,
  generateFoodSecurityForecast,
  generateDiseaseRiskForecast,
} from "@/features/forecasting/engine";
import {
  calculateMovingAverage,
  calculateWeightedMovingAverage,
  calculateExponentiallyWeightedTrend,
  calculateTrendExtrapolation,
  calculateForecastConfidence,
  calculateForecastBounds,
  classifyForecastDirection,
  MIN_FORECAST_SAMPLE_SIZE,
} from "@/features/forecasting/deterministic-methods";
import { evaluateForecast } from "@/features/forecasting/evaluation";
import {
  assertNoPrivateInformation,
  assertNoProhibitedProduce,
  containsPrivateInformation,
  containsProhibitedProduce,
  forecastGenerationOptionsSchema,
  resolveHorizonDates,
} from "@/features/forecasting/validation";
import {
  saveForecast,
  getForecastById,
  getForecastsByCommodity,
  getForecastsByDomain,
  getForecastHistory,
  updateForecastStatus,
  seedInMemoryForecasts,
  clearInMemoryForecasts,
} from "@/features/forecasting/data-layer";
import {
  seedInMemoryObservations,
  clearInMemoryHistoricalStores,
} from "@/features/historical-intelligence/memory-layer";
import { IntelligenceObservation } from "@/features/intelligence/types";

describe("Phase 3.6: Multi-Horizon Forecasting & Predictive Intelligence Layer", () => {
  beforeEach(() => {
    clearInMemoryHistoricalStores();
    clearInMemoryForecasts();
  });

  // ---------------------------------------------------------------------------
  // 1. Multi-Horizon Time Windows & Deterministic Engines
  // ---------------------------------------------------------------------------
  describe("Multi-Horizon Time Windows & Deterministic Methods", () => {
    it("resolves correct days and dates for short, medium, and long-term horizons", () => {
      const short = resolveHorizonDates("SHORT_TERM_0_7D");
      expect(short.days).toBe(7);
      expect(new Date(short.endDate).getTime()).toBeGreaterThan(new Date(short.startDate).getTime());

      const med = resolveHorizonDates("MEDIUM_TERM_8_30D");
      expect(med.days).toBe(30);

      const long = resolveHorizonDates("LONG_TERM_31_90D");
      expect(long.days).toBe(90);

      const custom = resolveHorizonDates("CUSTOM", undefined, 14);
      expect(custom.days).toBe(14);
    });

    it("calculates moving average and weighted moving average deterministically", () => {
      const samples = [
        { value: 100, observedAt: "2026-09-01T00:00:00Z" },
        { value: 110, observedAt: "2026-09-02T00:00:00Z" },
        { value: 120, observedAt: "2026-09-03T00:00:00Z" },
      ];

      const ma = calculateMovingAverage(samples);
      expect(ma).toBe(110);

      // Weighted moving average: (100*1 + 110*2 + 120*3) / (1+2+3) = (100 + 220 + 360) / 6 = 680 / 6 = 113.33
      const wma = calculateWeightedMovingAverage(samples);
      expect(wma).toBe(113.33);

      const exp = calculateExponentiallyWeightedTrend(samples, 0.5);
      expect(exp).toBeDefined();
      expect(exp).toBeGreaterThan(100);
    });

    it("projects linear trend extrapolation over horizon windows", () => {
      const samples = [
        { value: 50, observedAt: "2026-09-01T00:00:00Z" },
        { value: 60, observedAt: "2026-09-02T00:00:00Z" },
        { value: 70, observedAt: "2026-09-03T00:00:00Z" },
      ];

      const projection = calculateTrendExtrapolation(samples, 7);
      expect(projection).not.toBeNull();
      expect(projection!.dailySlope).toBe(10);
      expect(projection!.projectedValue).toBeGreaterThan(70);
    });

    it("classifies directional trends and detects high volatility", () => {
      expect(classifyForecastDirection(12.5, 5, 100)).toBe("INCREASING");
      expect(classifyForecastDirection(-8.2, 5, 100)).toBe("DECREASING");
      expect(classifyForecastDirection(1.5, 5, 100)).toBe("STABLE");
      // Volatility triggered when stdDev / mean > 0.35
      expect(classifyForecastDirection(2.0, 40, 100)).toBe("VOLATILE");

      expect(MIN_FORECAST_SAMPLE_SIZE).toBe(3);

      const bounds = calculateForecastBounds(100, 10, 1.5);
      expect(bounds.low).toBe(85);
      expect(bounds.high).toBe(115);

      const conf = calculateForecastConfidence({
        sampleSize: 10,
        dataCompleteness: 0.9,
        timeCoverageDays: 30,
        horizonDays: 7,
      });
      expect(conf.confidenceLevel).toBe("HIGH");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Insufficient Data Governance (Zero Fake Data)
  // ---------------------------------------------------------------------------
  describe("Insufficient Data Governance", () => {
    it("strictly returns INSUFFICIENT_DATA when sample count is below minimum threshold (N < 3)", async () => {
      // 0 observations in memory
      const forecast = await generateMultiHorizonForecast({
        domain: "MARKET",
        metricName: "MARKET_PRICE",
        commodity: "Soybeans",
        state: "Benue",
        timeHorizon: "SHORT_TERM_0_7D",
      });

      expect(forecast.status).toBe("INSUFFICIENT_DATA");
      expect(forecast.predictedValue).toBeNull();
      expect(forecast.predictedRangeLow).toBeNull();
      expect(forecast.predictedRangeHigh).toBeNull();
      expect(forecast.direction).toBe("UNKNOWN");
      expect(forecast.confidence).toBe(0.0);
      expect(forecast.confidenceLevel).toBe("INSUFFICIENT_DATA");
      expect(forecast.explanation).toContain("INSUFFICIENT_DATA");
    });

    it("returns valid forecast when empirical sample size meets threshold (N >= 3)", async () => {
      const now = new Date();
      const obs: IntelligenceObservation[] = [
        {
          id: "obs-1",
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domainSource: "MARKET",
          commodity: "Soybeans",
          state: "Benue",
          summary: "Market price point 1",
          details: {},
          observedValue: 45000,
          confidence: 0.85,
          evidence: [],
          observedAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "obs-2",
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domainSource: "MARKET",
          commodity: "Soybeans",
          state: "Benue",
          summary: "Market price point 2",
          details: {},
          observedValue: 46500,
          confidence: 0.9,
          evidence: [],
          observedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "obs-3",
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domainSource: "MARKET",
          commodity: "Soybeans",
          state: "Benue",
          summary: "Market price point 3",
          details: {},
          observedValue: 48000,
          confidence: 0.88,
          evidence: [],
          observedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      seedInMemoryObservations(obs);

      const forecast = await generateMultiHorizonForecast({
        domain: "MARKET",
        metricName: "MARKET_PRICE",
        commodity: "Soybeans",
        state: "Benue",
        timeHorizon: "SHORT_TERM_0_7D",
      });

      expect(forecast.status).toBe("ACTIVE");
      expect(forecast.predictedValue).not.toBeNull();
      expect(forecast.predictedValue).toBeGreaterThan(40000);
      expect(forecast.sampleSize).toBe(3);
      expect(forecast.confidence).toBeGreaterThan(0.0);
      expect(forecast.confidenceLevel).not.toBe("INSUFFICIENT_DATA");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Domain-Specific Forecast Helpers & Safety Disclaimers
  // ---------------------------------------------------------------------------
  describe("Domain-Specific Predictive Helpers & Safety Boundaries", () => {
    it("generates domain forecasts with accurate canonical agent attribution", async () => {
      const now = new Date();
      const obs: IntelligenceObservation[] = [
        {
          id: "obs-d1",
          agentId: "DEMAND_FORECASTING_AGENT",
          domainSource: "DEMAND",
          commodity: "White Garri",
          state: "Oyo",
          summary: "Demand volume point 1",
          details: {},
          observedValue: 1200,
          confidence: 0.85,
          evidence: [],
          observedAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "obs-d2",
          agentId: "DEMAND_FORECASTING_AGENT",
          domainSource: "DEMAND",
          commodity: "White Garri",
          state: "Oyo",
          summary: "Demand volume point 2",
          details: {},
          observedValue: 1350,
          confidence: 0.88,
          evidence: [],
          observedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "obs-d3",
          agentId: "DEMAND_FORECASTING_AGENT",
          domainSource: "DEMAND",
          commodity: "White Garri",
          state: "Oyo",
          summary: "Demand volume point 3",
          details: {},
          observedValue: 1400,
          confidence: 0.9,
          evidence: [],
          observedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      seedInMemoryObservations(obs);

      const demandForecast = await generateDemandForecast("White Garri", "Oyo", "MEDIUM_TERM_8_30D");
      expect(demandForecast.agentId).toBe("DEMAND_FORECASTING_AGENT");
      expect(demandForecast.domain).toBe("DEMAND");
      expect(demandForecast.timeHorizon).toBe("MEDIUM_TERM_8_30D");

      const supplyForecast = await generateSupplyForecast("White Garri", "Oyo", "MEDIUM_TERM_8_30D");
      expect(supplyForecast.domain).toBe("SUPPLY");
      expect(supplyForecast.agentId).toBe("SUPPLY_MATCHING_AGENT");

      const prodOutlook = await generateProductionOutlook("White Garri", "Oyo", "LONG_TERM_31_90D");
      expect(prodOutlook.domain).toBe("PRODUCTION");
      expect(prodOutlook.agentId).toBe("PRODUCTION_PLANNING_AGENT");
    });

    it("enforces non-veterinary analytical indicator disclaimer on disease forecasts", async () => {
      const diseaseForecast = await generateDiseaseRiskForecast("Maize", "Kaduna", "SHORT_TERM_0_7D");
      expect(diseaseForecast.governanceNote).toContain("ANALYTICAL EARLY INDICATOR ONLY");
      expect(diseaseForecast.governanceNote).toContain("Not an official veterinary diagnosis");
    });

    it("enforces corridor advisory disclaimer on logistics forecasts", async () => {
      const logisticsForecast = await generateLogisticsForecast("Lagos-Ibadan Expressway", "SHORT_TERM_0_7D");
      expect(logisticsForecast.governanceNote).toContain("LOGISTICS ADVISORY");
      expect(logisticsForecast.governanceNote).toContain("Does not issue safe-passage guarantees");
    });

    it("enforces human review mandatory disclaimer on food security forecasts", async () => {
      const foodSecForecast = await generateFoodSecurityForecast("Borno", "LONG_TERM_31_90D");
      expect(foodSecForecast.governanceNote).toContain("EARLY-WARNING INDICATOR ONLY");
      expect(foodSecForecast.governanceNote).toContain("Human review mandatory");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Forecast Versioning & Lineage Immutability
  // ---------------------------------------------------------------------------
  describe("Forecast Versioning & Lineage Immutability", () => {
    it("increments version number and preserves lineage without overwriting previous forecast", async () => {
      const now = new Date();
      const obs: IntelligenceObservation[] = [
        {
          id: "obs-v1",
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domainSource: "MARKET",
          commodity: "Sorghum",
          state: "Kano",
          summary: "Price point 1",
          details: {},
          observedValue: 32000,
          confidence: 0.85,
          evidence: [],
          observedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "obs-v2",
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domainSource: "MARKET",
          commodity: "Sorghum",
          state: "Kano",
          summary: "Price point 2",
          details: {},
          observedValue: 33000,
          confidence: 0.88,
          evidence: [],
          observedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "obs-v3",
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domainSource: "MARKET",
          commodity: "Sorghum",
          state: "Kano",
          summary: "Price point 3",
          details: {},
          observedValue: 34000,
          confidence: 0.9,
          evidence: [],
          observedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      seedInMemoryObservations(obs);

      const v1 = await generateMarketForecast("Sorghum", "Kano", "SHORT_TERM_0_7D");
      expect(v1.version).toBe(1);
      expect(v1.previousForecastId).toBeNull();

      await saveForecast(v1);

      // Create v2 with new horizon or updated parameters
      const v2 = await createForecastVersion(v1, { timeHorizon: "MEDIUM_TERM_8_30D" });
      expect(v2.version).toBe(2);
      expect(v2.previousForecastId).toBe(v1.id);
      expect(v2.id).not.toBe(v1.id);

      await saveForecast(v2);

      const history = await getForecastHistory("Sorghum", "Kano");
      expect(history.length).toBe(2);
      expect(history[0].version).toBe(2);
      expect(history[1].version).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Phase 3.4 Evaluation Integration & Error Calculations
  // ---------------------------------------------------------------------------
  describe("Phase 3.4 Evaluation Integration & Error Calculations", () => {
    it("evaluates a forecast accurately against an observed real-world value", () => {
      const mockForecast = {
        id: "fc-test-1",
        domain: "MARKET" as const,
        metricName: "MARKET_PRICE",
        commodity: "Maize",
        state: "Kaduna",
        timeHorizon: "SHORT_TERM_0_7D" as const,
        forecastPeriodDays: 7,
        forecastStartDate: new Date().toISOString(),
        forecastEndDate: new Date().toISOString(),
        targetDate: new Date().toISOString(),
        currentValue: 50000,
        baselineValue: 50000,
        predictedValue: 55000,
        predictedRangeLow: 52000,
        predictedRangeHigh: 58000,
        expectedDelta: 5000,
        expectedPercentageDelta: 10,
        direction: "INCREASING" as const,
        confidence: 0.85,
        confidenceLevel: "HIGH" as const,
        sampleSize: 10,
        dataCompleteness: 0.9,
        methodName: "TREND_EXTRAPOLATION" as const,
        evidence: [],
        status: "ACTIVE" as const,
        version: 1,
        evaluationStatus: "PENDING" as const,
        explanation: "Test",
        limitations: "Test",
        governanceNote: "Advisory",
        agentId: "MARKET_INTELLIGENCE_AGENT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Scenario A: Accurate outcome inside predicted range
      const evaluationAccurate = evaluateForecast(mockForecast, 54500, "out-1");
      expect(evaluationAccurate.status).toBe("EVALUATED");
      expect(evaluationAccurate.errorMetrics).not.toBeNull();
      expect(evaluationAccurate.errorMetrics!.absoluteError).toBe(500);
      expect(evaluationAccurate.errorMetrics!.directionAccurate).toBe(true);
      expect(evaluationAccurate.errorMetrics!.withinRange).toBe(true);
      expect(evaluationAccurate.errorMetrics!.evaluationScore).toBeGreaterThanOrEqual(0.7);

      // Scenario B: Divide-by-zero guard when actualValue is 0
      const evaluationZero = evaluateForecast(mockForecast, 0, "out-2");
      expect(evaluationZero.errorMetrics!.percentageError).toBeNull(); // protected against /0
      expect(evaluationZero.errorMetrics!.absoluteError).toBe(55000);
    });

    it("handles non-evaluable state cleanly when forecast had insufficient data", () => {
      const mockInsufficientForecast = {
        id: "fc-test-empty",
        domain: "MARKET" as const,
        metricName: "MARKET_PRICE",
        commodity: "Maize",
        state: "Kaduna",
        timeHorizon: "SHORT_TERM_0_7D" as const,
        forecastPeriodDays: 7,
        forecastStartDate: new Date().toISOString(),
        forecastEndDate: new Date().toISOString(),
        targetDate: new Date().toISOString(),
        currentValue: null,
        baselineValue: null,
        predictedValue: null,
        predictedRangeLow: null,
        predictedRangeHigh: null,
        expectedDelta: null,
        expectedPercentageDelta: null,
        direction: "UNKNOWN" as const,
        confidence: 0.0,
        confidenceLevel: "INSUFFICIENT_DATA" as const,
        sampleSize: 0,
        dataCompleteness: 0.0,
        methodName: "HISTORICAL_BASELINE_COMPARISON" as const,
        evidence: [],
        status: "INSUFFICIENT_DATA" as const,
        version: 1,
        evaluationStatus: "NOT_EVALUABLE" as const,
        explanation: "Test",
        limitations: "Test",
        governanceNote: "Advisory",
        agentId: "MARKET_INTELLIGENCE_AGENT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = evaluateForecast(mockInsufficientForecast, 45000);
      expect(result.status).toBe("NOT_EVALUABLE");
      expect(result.errorMetrics).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Security, Privacy, and Anti-Pork Invariants
  // ---------------------------------------------------------------------------
  describe("Security, Privacy, and Anti-Pork Invariants", () => {
    it("strictly blocks prohibited produce across all forecasting methods and queries", async () => {
      expect(containsProhibitedProduce("smoked pork")).toBe(true);
      expect(containsProhibitedProduce("swine feed")).toBe(true);
      expect(containsProhibitedProduce("pure lard")).toBe(true);
      expect(containsProhibitedProduce("millet grains")).toBe(false);

      expect(() => {
        assertNoProhibitedProduce("pork chops", "Forecast Generation");
      }).toThrow(/Anti-Pork Policy Violation/);

      await expect(async () => {
        await generateMarketForecast("pork belly", "Lagos");
      }).rejects.toThrow();

      await expect(async () => {
        await getForecastsByCommodity("pork");
      }).rejects.toThrow();
    });

    it("strictly rejects private coordinates and phone numbers in forecast options", () => {
      expect(containsPrivateInformation("+2348021234567")).toBe(true);
      expect(containsPrivateInformation("Coordinate at 9.0820, 8.6753")).toBe(true);
      expect(containsPrivateInformation("Bodija Market, Ibadan, Oyo")).toBe(false);

      expect(() => {
        assertNoPrivateInformation({ phone: "08034567890" }, "Forecast validation");
      }).toThrow(/Privacy Violation/);
    });

    it("validates runtime forecast options with Zod schema", () => {
      const valid = forecastGenerationOptionsSchema.parse({
        domain: "MARKET",
        metricName: "PRICE",
        commodity: "Sesame Seeds",
        timeHorizon: "SHORT_TERM_0_7D",
        state: "Nasarawa",
      });
      expect(valid.commodity).toBe("Sesame Seeds");

      expect(() => {
        forecastGenerationOptionsSchema.parse({
          domain: "MARKET",
          metricName: "PRICE",
          commodity: "pork", // Prohibited produce
          timeHorizon: "SHORT_TERM_0_7D",
        });
      }).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Data Layer Persistence & Queries
  // ---------------------------------------------------------------------------
  describe("Data Layer Persistence & Queries", () => {
    it("saves and retrieves forecasts by ID, commodity, and domain", async () => {
      const forecast = {
        id: "fc-persisted-1",
        domain: "LOGISTICS" as const,
        metricName: "CORRIDOR_DELAY_HOURS",
        commodity: "General Freight",
        state: "Kogi",
        timeHorizon: "SHORT_TERM_0_7D" as const,
        forecastPeriodDays: 7,
        forecastStartDate: new Date().toISOString(),
        forecastEndDate: new Date().toISOString(),
        targetDate: new Date().toISOString(),
        currentValue: 4.5,
        baselineValue: 4.0,
        predictedValue: 5.2,
        predictedRangeLow: 4.0,
        predictedRangeHigh: 6.5,
        expectedDelta: 0.7,
        expectedPercentageDelta: 15.5,
        direction: "INCREASING" as const,
        confidence: 0.75,
        confidenceLevel: "HIGH" as const,
        sampleSize: 8,
        dataCompleteness: 0.8,
        methodName: "TREND_EXTRAPOLATION" as const,
        evidence: [],
        status: "ACTIVE" as const,
        version: 1,
        evaluationStatus: "PENDING" as const,
        explanation: "Test",
        limitations: "Test",
        governanceNote: "Advisory",
        agentId: "LOGISTICS_INTELLIGENCE_AGENT",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveForecast(forecast);

      const byId = await getForecastById("fc-persisted-1");
      expect(byId).not.toBeNull();
      expect(byId!.metricName).toBe("CORRIDOR_DELAY_HOURS");

      const byCommodity = await getForecastsByCommodity("General Freight");
      expect(byCommodity.length).toBeGreaterThanOrEqual(1);

      const byDomain = await getForecastsByDomain("LOGISTICS");
      expect(byDomain.length).toBeGreaterThanOrEqual(1);

      const updated = await updateForecastStatus("fc-persisted-1", "EXPIRED");
      expect(updated).toBe(true);

      const afterUpdate = await getForecastById("fc-persisted-1");
      expect(afterUpdate!.status).toBe("EXPIRED");

      // Verify seeding and history query
      seedInMemoryForecasts([
        {
          ...forecast,
          id: "fc-persisted-2",
          version: 2,
          previousForecastId: "fc-persisted-1",
        },
      ]);
      const history = await getForecastHistory("General Freight", "Kogi");
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });
});
