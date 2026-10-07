import { describe, it, expect, beforeEach } from "vitest";
import {
  HISTORICAL_TIME_HORIZONS,
  TEMPORAL_RECORD_TYPES,
  HISTORICAL_DATA_STATES,
  BASELINE_COMPARISON_DIRECTIONS,
} from "@/features/historical-intelligence/types";
import {
  assertNoProhibitedProduce,
  containsProhibitedProduce,
  containsPrivateInformation,
  assertNoPrivateInformation,
  resolveTimeWindowDates,
  historicalQueryFiltersSchema,
} from "@/features/historical-intelligence/validation";
import {
  calculateHistoricalBaselineSummary,
  compareValueToHistoricalBaseline,
  MIN_BASELINE_SAMPLE_SIZE,
} from "@/features/historical-intelligence/baseline-calculator";
import {
  getHistoricalObservations,
  getHistoricalSignals,
  getHistoricalMarketPressure,
  getHistoricalDemand,
  getHistoricalSupply,
  getHistoricalLogisticsPressure,
  getHistoricalFoodSecurityPressure,
  getHistoricalSignalPatterns,
  getHistoricalRecommendationTrackRecord,
  seedInMemoryObservations,
  seedInMemorySignals,
  clearInMemoryHistoricalStores,
} from "@/features/historical-intelligence/memory-layer";
import { IntelligenceObservation, IntelligenceSignal } from "@/features/intelligence/types";

describe("Phase 3.5: Agricultural Memory & Historical Intelligence Layer", () => {
  beforeEach(() => {
    clearInMemoryHistoricalStores();
  });

  // ---------------------------------------------------------------------------
  // 1. Conceptual Distinction: EVENT vs SNAPSHOT vs CURRENT STATE
  // ---------------------------------------------------------------------------
  describe("Temporal Discipline (EVENT vs SNAPSHOT vs CURRENT STATE)", () => {
    it("distinguishes discrete events from periodic snapshots and mutable current state", () => {
      expect(TEMPORAL_RECORD_TYPES).toContain("EVENT");
      expect(TEMPORAL_RECORD_TYPES).toContain("SNAPSHOT");
      expect(TEMPORAL_RECORD_TYPES).toContain("CURRENT_STATE");
    });

    it("verifies time horizons and query enumerations", () => {
      expect(HISTORICAL_TIME_HORIZONS).toContain("LAST_7_DAYS");
      expect(HISTORICAL_TIME_HORIZONS).toContain("LAST_30_DAYS");
      expect(HISTORICAL_TIME_HORIZONS).toContain("LAST_90_DAYS");
      expect(HISTORICAL_TIME_HORIZONS).toContain("LAST_365_DAYS");
      expect(HISTORICAL_DATA_STATES).toContain("EVALUATED");
      expect(HISTORICAL_DATA_STATES).toContain("INSUFFICIENT_DATA");
      expect(HISTORICAL_DATA_STATES).toContain("NO_DATA");
      expect(BASELINE_COMPARISON_DIRECTIONS).toContain("ELEVATED");
      expect(BASELINE_COMPARISON_DIRECTIONS).toContain("NORMAL");
      expect(BASELINE_COMPARISON_DIRECTIONS).toContain("DEPRESSED");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Deterministic Baseline Calculations & Statistical Comparisons
  // ---------------------------------------------------------------------------
  describe("Historical Baseline Calculations & Comparison", () => {
    it("computes accurate baseline summary stats with mean, median, and std dev", () => {
      const now = new Date();
      const samples = [
        { value: 40000, observedAt: new Date(now.getTime() - 2 * 86400000) },
        { value: 42000, observedAt: new Date(now.getTime() - 5 * 86400000) },
        { value: 44000, observedAt: new Date(now.getTime() - 8 * 86400000) },
        { value: 41000, observedAt: new Date(now.getTime() - 12 * 86400000) },
      ];

      const baseline = calculateHistoricalBaselineSummary({
        metricName: "WHOLESALE_PRICE",
        domain: "MARKET",
        commodity: "Yellow Maize",
        state: "Kano",
        timeHorizon: "LAST_30_DAYS",
        expectedDaysInWindow: 30,
        samples,
      });

      expect(baseline.sampleCount).toBe(4);
      expect(baseline.mean).toBe(41750);
      expect(baseline.median).toBe(41500);
      expect(baseline.min).toBe(40000);
      expect(baseline.max).toBe(44000);
      expect(baseline.stdDev).toBeGreaterThan(0);
      expect(baseline.baselineConfidence).toBeGreaterThan(0);
    });

    it("compares current live value against historical baseline and determines z-score and direction", () => {
      const samples = [
        { value: 100, observedAt: new Date() },
        { value: 110, observedAt: new Date() },
        { value: 105, observedAt: new Date() },
        { value: 95, observedAt: new Date() },
      ];

      const baseline = calculateHistoricalBaselineSummary({
        metricName: "DEMAND_INDEX",
        domain: "DEMAND",
        commodity: "Soybeans",
        state: "Benue",
        timeHorizon: "LAST_30_DAYS",
        samples,
      });

      // Elevated current value: 130
      const comparisonElevated = compareValueToHistoricalBaseline(130, baseline);
      expect(comparisonElevated.dataState).toBe("EVALUATED");
      expect(comparisonElevated.direction).toBe("ELEVATED");
      expect(comparisonElevated.zScore).toBeGreaterThan(1.0);
      expect(comparisonElevated.interpretation).toContain("higher than historical mean");

      // Depressed current value: 75
      const comparisonDepressed = compareValueToHistoricalBaseline(75, baseline);
      expect(comparisonDepressed.direction).toBe("DEPRESSED");
      expect(comparisonDepressed.zScore).toBeLessThan(-1.0);
    });

    it("returns INSUFFICIENT_DATA when sample count is below minimum threshold", () => {
      const samples = [
        { value: 500, observedAt: new Date() }, // Only 1 sample point (threshold is 3)
      ];

      const baseline = calculateHistoricalBaselineSummary({
        metricName: "LOGISTICS_DELAY",
        domain: "LOGISTICS",
        commodity: "Tomatoes",
        state: "Kaduna",
        timeHorizon: "LAST_7_DAYS",
        samples,
      });

      expect(baseline.sampleCount).toBe(1);
      expect(MIN_BASELINE_SAMPLE_SIZE).toBe(3);

      const comparison = compareValueToHistoricalBaseline(520, baseline);
      expect(comparison.dataState).toBe("INSUFFICIENT_DATA");
      expect(comparison.baselineValue).toBeNull();
      expect(comparison.zScore).toBeNull();
      expect(comparison.direction).toBe("UNKNOWN");
      expect(comparison.interpretation).toContain("Insufficient historical baseline observations");
    });

    it("returns NO_DATA when samples array is completely empty", () => {
      const baseline = calculateHistoricalBaselineSummary({
        metricName: "PRICE",
        domain: "MARKET",
        timeHorizon: "LAST_30_DAYS",
        samples: [],
      });

      expect(baseline.sampleCount).toBe(0);
      const comparison = compareValueToHistoricalBaseline(200, baseline);
      expect(comparison.dataState).toBe("NO_DATA");
      expect(comparison.direction).toBe("UNKNOWN");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Historical Memory Retrieval & Domain Comparisons
  // ---------------------------------------------------------------------------
  describe("Historical Memory Retrieval & Domain Slices", () => {
    it("retrieves historical observations by commodity, domain, and state slice", async () => {
      const sampleObs: IntelligenceObservation = {
        id: "obs-hist-1",
        agentId: "MARKET_INTELLIGENCE_AGENT",
        domainSource: "MARKET",
        commodity: "White Cowpea",
        category: "Legumes & Pulses",
        state: "Gombe",
        summary: "Wholesale price observation at Gombe grain market",
        details: {},
        observedValue: 38000,
        baselineValue: 35000,
        unit: "bag_100kg",
        confidence: 0.90,
        evidence: [],
        observedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      seedInMemoryObservations([sampleObs]);

      const retrieved = await getHistoricalObservations({
        commodity: "White Cowpea",
        domain: "MARKET",
        state: "Gombe",
        timeHorizon: "LAST_30_DAYS",
      });

      expect(retrieved.length).toBeGreaterThanOrEqual(1);
      expect(retrieved[0].commodity).toBe("White Cowpea");
      expect(retrieved[0].state).toBe("Gombe");
      expect(retrieved[0].observedValue).toBe(38000);
    });

    it("queries historical market, demand, supply, and logistics pressure with baselines", async () => {
      const now = new Date();
      const cowpeaObs: IntelligenceObservation[] = [
        {
          id: "obs-1",
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domainSource: "MARKET",
          commodity: "Sorghum",
          state: "Kano",
          summary: "Market observation 1",
          details: {},
          observedValue: 30000,
          confidence: 0.85,
          evidence: [],
          observedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "obs-2",
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domainSource: "MARKET",
          commodity: "Sorghum",
          state: "Kano",
          summary: "Market observation 2",
          details: {},
          observedValue: 31000,
          confidence: 0.88,
          evidence: [],
          observedAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "obs-3",
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domainSource: "MARKET",
          commodity: "Sorghum",
          state: "Kano",
          summary: "Market observation 3",
          details: {},
          observedValue: 30500,
          confidence: 0.90,
          evidence: [],
          observedAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      seedInMemoryObservations(cowpeaObs);

      const marketPressure = await getHistoricalMarketPressure("Sorghum", "Kano", "LAST_30_DAYS");
      expect(marketPressure.dataState).toBe("EVALUATED");
      expect(marketPressure.baselineValue).toBe(30500);

      // Supply & Demand queries for empty commodities return appropriate NO_DATA state
      const emptyDemand = await getHistoricalDemand("NonexistentCommodity", "Oyo", "LAST_7_DAYS");
      expect(emptyDemand.dataState).toBe("NO_DATA");

      const emptySupply = await getHistoricalSupply("NonexistentCommodity", "Oyo", "LAST_7_DAYS");
      expect(emptySupply.dataState).toBe("NO_DATA");

      const emptyLogistics = await getHistoricalLogisticsPressure("Lagos-Ibadan Expressway", "LAST_7_DAYS");
      expect(emptyLogistics.dataState).toBe("NO_DATA");

      const emptyFoodSecurity = await getHistoricalFoodSecurityPressure("Borno", "LAST_7_DAYS");
      expect(emptyFoodSecurity.dataState).toBe("NO_DATA");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Historical Signal Patterns & Recurrence Analysis
  // ---------------------------------------------------------------------------
  describe("Historical Signal Patterns & Recurrence Analysis", () => {
    it("analyzes recurrence frequency, affected regions, and historical confirmation rate", async () => {
      const now = new Date();
      const signals: IntelligenceSignal[] = [
        {
          id: "sig-1",
          agentId: "LOGISTICS_INTELLIGENCE_AGENT",
          signalType: "LOGISTICS_DISRUPTION",
          commodity: "Roma Tomatoes",
          category: "Vegetables",
          state: "Kaduna",
          magnitude: 65,
          confidence: 0.85,
          source: "Checkpoint transit logs",
          evidence: [],
          observedAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
          expiresAt: new Date(now.getTime() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "sig-2",
          agentId: "LOGISTICS_INTELLIGENCE_AGENT",
          signalType: "LOGISTICS_DISRUPTION",
          commodity: "Roma Tomatoes",
          category: "Vegetables",
          state: "Kaduna",
          magnitude: 70,
          confidence: 0.88,
          source: "Checkpoint transit logs",
          evidence: [],
          observedAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
          expiresAt: new Date(now.getTime() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "sig-3",
          agentId: "LOGISTICS_INTELLIGENCE_AGENT",
          signalType: "LOGISTICS_DISRUPTION",
          commodity: "Roma Tomatoes",
          category: "Vegetables",
          state: "Kano",
          magnitude: 60,
          confidence: 0.82,
          source: "Highway corridor report",
          evidence: [],
          observedAt: new Date(now.getTime() - 15 * 86400000).toISOString(),
          expiresAt: new Date(now.getTime() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      seedInMemorySignals(signals);

      const retrievedSignals = await getHistoricalSignals({
        commodity: "Roma Tomatoes",
        timeHorizon: "LAST_90_DAYS",
      });
      expect(retrievedSignals.length).toBe(3);

      const patterns = await getHistoricalSignalPatterns(
        "LOGISTICS_DISRUPTION",
        "Roma Tomatoes",
        undefined,
        "LAST_90_DAYS"
      );

      expect(patterns.signalType).toBe("LOGISTICS_DISRUPTION");
      expect(patterns.frequencyCount).toBe(3);
      expect(patterns.dataState).toBe("EVALUATED");
      expect(patterns.meanMagnitude).toBe(65);
      expect(patterns.recurringLocations.length).toBe(2);
      expect(patterns.recurringLocations[0].state).toBe("Kaduna");
      expect(patterns.recurringLocations[0].count).toBe(2);
      expect(patterns.summary).toContain("occurred 3 time(s)");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Historical Recommendation Track Record
  // ---------------------------------------------------------------------------
  describe("Historical Recommendation Track Record", () => {
    it("handles historical track record query cleanly with valid empty fallback", async () => {
      const trackRecord = await getHistoricalRecommendationTrackRecord(
        "REVIEW_LOGISTICS_OPTIONS",
        "LAST_90_DAYS"
      );

      expect(trackRecord.recommendationType).toBe("REVIEW_LOGISTICS_OPTIONS");
      expect(trackRecord.timeHorizon).toBe("LAST_90_DAYS");
      expect(trackRecord.disclaimer).toContain("without claiming causal determinism");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Security, Privacy & Anti-Pork Invariants
  // ---------------------------------------------------------------------------
  describe("Security, Privacy, and Anti-Pork Invariants", () => {
    it("strictly blocks prohibited produce across all historical queries", async () => {
      expect(containsProhibitedProduce("smoked pork")).toBe(true);
      expect(containsProhibitedProduce("swine husbandry")).toBe(true);
      expect(containsProhibitedProduce("white yam tubers")).toBe(false);

      expect(() => {
        assertNoProhibitedProduce("pork ribs", "Historical Memory Query");
      }).toThrow(/Anti-Pork Policy Violation/);

      await expect(async () => {
        await getHistoricalMarketPressure("pork", "Lagos");
      }).rejects.toThrow();
    });

    it("strictly forbids private coordinates and phone numbers in queries", () => {
      expect(containsPrivateInformation("+2348039876543")).toBe(true);
      expect(containsPrivateInformation("Farm at 9.0764785, 7.3985741")).toBe(true);
      expect(containsPrivateInformation("Dawanau Wholesale Market, Kano")).toBe(false);

      expect(() => {
        assertNoPrivateInformation("Call 08123456789", "Privacy check");
      }).toThrow(/Privacy Violation/);
    });

    it("resolves date ranges correctly and prevents fromDate > toDate", () => {
      const resolved30 = resolveTimeWindowDates("LAST_30_DAYS");
      expect(resolved30.days).toBe(30);
      expect(resolved30.from.getTime()).toBeLessThan(resolved30.to.getTime());

      const customFrom = "2026-08-01T00:00:00Z";
      const customTo = "2026-08-15T00:00:00Z";
      const customResolved = resolveTimeWindowDates("CUSTOM", customFrom, customTo);
      expect(customResolved.days).toBe(14);

      expect(() => {
        resolveTimeWindowDates("CUSTOM", customTo, customFrom); // Inverted dates
      }).toThrow(/fromDate cannot be after toDate/);
    });

    it("validates runtime historical query schema", () => {
      const validQuery = historicalQueryFiltersSchema.parse({
        commodity: "Millet",
        state: "Sokoto",
        timeHorizon: "LAST_30_DAYS",
        excludeLowQuality: true,
      });

      expect(validQuery.commodity).toBe("Millet");
      expect(validQuery.timeHorizon).toBe("LAST_30_DAYS");
    });
  });
});
