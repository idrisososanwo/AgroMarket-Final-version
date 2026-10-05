import { describe, it, expect } from "vitest";
import {
  detectPriceTrendSignals,
  detectDemandSignals,
  detectSupplyImbalanceSignals,
  detectProcessingBottleneck,
  detectLogisticsDisruptions,
  detectSecurityDisruptions,
  detectSeasonalDemand,
  detectDiseaseRisk,
} from "@/features/intelligence/engine";
import {
  calculateEvidenceConfidence,
  getConfidenceTier,
} from "@/features/intelligence/confidence";
import {
  generateAdvisoryRecommendation,
  validateRecommendationTransition,
  InvalidStatusTransitionError,
} from "@/features/intelligence/recommendations";
import { evaluatePredictionOutcome } from "@/features/intelligence/evaluations";
import {
  containsProhibitedProduce,
  assertNoProhibitedProduce,
  intelligenceSignalSchema,
  intelligenceObservationSchema,
  intelligenceRecommendationSchema,
  intelligencePredictionSchema,
  recommendationReviewSchema,
} from "@/features/intelligence/validation";
import { IntelligenceSignal, IntelligencePrediction, IntelligenceOutcome } from "@/features/intelligence/types";

describe("Phase 2.1: Agricultural Intelligence Foundation Tests", () => {
  // ----------------------------------------------------------------------------
  // 1. STRICT ANTI-PORK VALIDATION
  // ----------------------------------------------------------------------------
  describe("Anti-Pork Security & Validation Rules", () => {
    it("rejects pork and pig variations across all intelligence terms", () => {
      const prohibitedTerms = [
        "pork",
        "PORK",
        "pig",
        "piglet",
        "swine",
        "hog",
        "boar",
        "bacon",
        "ham",
        "lard",
        "porcine",
      ];

      for (const term of prohibitedTerms) {
        expect(containsProhibitedProduce(term)).toBe(true);
        expect(containsProhibitedProduce(`Organic ${term} wholesale`)).toBe(true);
        expect(() => assertNoProhibitedProduce(term, "Commodity")).toThrow();
      }
    });

    it("accepts halal and valid Nigerian agricultural produce", () => {
      const validProduce = [
        "Broiler Chicken",
        "Beef Cattle",
        "African Catfish (Clarias)",
        "Cassava Tubers",
        "Yellow Maize",
        "Cow Milk",
        "Benue White Yam",
        "Roma Tomatoes",
        "Sokoto Red Goat",
      ];

      for (const item of validProduce) {
        expect(containsProhibitedProduce(item)).toBe(false);
        expect(() => assertNoProhibitedProduce(item, "Commodity")).not.toThrow();
      }
    });

    it("rejects pig/pork signals at Zod schema level", () => {
      const invalidSignal = {
        agentId: "AGRICULTURAL_INTELLIGENCE",
        signalType: "SUPPLY_SHORTAGE",
        commodity: "Fresh Pork Cuts",
        state: "Lagos",
        magnitude: 20,
        confidence: 0.85,
        source: "MARKET_TEST",
        evidence: [
          {
            sourceType: "PRICE_OBSERVATION",
            sourceId: "obs-1",
            description: "Pork prices rising",
            observedAt: new Date().toISOString(),
            relevance: 1.0,
          },
        ],
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      const result = intelligenceSignalSchema.safeParse(invalidSignal);
      expect(result.success).toBe(false);
    });

    it("rejects pig/pork observations and recommendations", () => {
      const invalidObservation = {
        agentId: "AGRICULTURAL_INTELLIGENCE",
        domainSource: "MARKET",
        commodity: "Live Swine",
        state: "Oyo",
        summary: "Live swine price surge",
        confidence: 0.8,
      };
      expect(intelligenceObservationSchema.safeParse(invalidObservation).success).toBe(false);

      const invalidRec = {
        agentId: "AGRICULTURAL_INTELLIGENCE",
        objective: "STABILIZE_SUPPLY",
        title: "Boost Pork Delivery",
        recommendation: "Procure additional pig farm stock",
        evidence: [
          {
            sourceType: "PRICE_OBSERVATION",
            sourceId: "obs-2",
            description: "Surge",
            observedAt: new Date().toISOString(),
            relevance: 1.0,
          },
        ],
        confidence: 0.7,
        expectedImpact: {
          primaryMetric: "PRICE",
          estimatedChange: "-10%",
          timeframeDays: 7,
          qualitativeSummary: "Relief",
        },
        affectedActors: ["FARMER"],
        affectedCommodities: ["Pork Meat"],
        affectedLocations: ["Lagos"],
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      expect(intelligenceRecommendationSchema.safeParse(invalidRec).success).toBe(false);
    });
  });

  // ----------------------------------------------------------------------------
  // 2. DETERMINISTIC ENGINE: SIGNALS DETECTION
  // ----------------------------------------------------------------------------
  describe("Deterministic Engine Signals Detection", () => {
    it("detects PRICE_INCREASE when price rises above threshold", () => {
      const signal = detectPriceTrendSignals({
        commodity: "Broiler Chicken",
        state: "Lagos",
        recentPrice: 4800,
        baselinePrice: 4000, // +20%
        thresholdPercent: 10,
      });

      expect(signal).not.toBeNull();
      expect(signal?.signalType).toBe("PRICE_INCREASE");
      expect(signal?.magnitude).toBe(20);
      expect(signal?.commodity).toBe("Broiler Chicken");
      expect(signal?.state).toBe("Lagos");
      expect(signal?.evidence[0].sourceType).toBe("PRICE_OBSERVATION");
    });

    it("detects PRICE_DECREASE when price drops below threshold", () => {
      const signal = detectPriceTrendSignals({
        commodity: "Cassava Tubers",
        state: "Ogun",
        recentPrice: 1500,
        baselinePrice: 2000, // -25%
        thresholdPercent: 10,
      });

      expect(signal).not.toBeNull();
      expect(signal?.signalType).toBe("PRICE_DECREASE");
      expect(signal?.magnitude).toBe(-25);
    });

    it("returns null when price movement is below threshold", () => {
      const signal = detectPriceTrendSignals({
        commodity: "Yellow Maize",
        state: "Kaduna",
        recentPrice: 2040,
        baselinePrice: 2000, // +2%
        thresholdPercent: 10,
      });

      expect(signal).toBeNull();
    });

    it("detects DEMAND_INCREASE and DEMAND_DECREASE correctly", () => {
      const increaseSignal = detectDemandSignals({
        commodity: "African Catfish (Clarias)",
        state: "Lagos",
        currentDemandVolume: 2500,
        baselineDemandVolume: 2000, // +25%
      });
      expect(increaseSignal?.signalType).toBe("DEMAND_INCREASE");
      expect(increaseSignal?.magnitude).toBe(25);

      const decreaseSignal = detectDemandSignals({
        commodity: "African Catfish (Clarias)",
        state: "Lagos",
        currentDemandVolume: 1500,
        baselineDemandVolume: 2000, // -25%
      });
      expect(decreaseSignal?.signalType).toBe("DEMAND_DECREASE");
      expect(decreaseSignal?.magnitude).toBe(-25);
    });

    it("detects SUPPLY_SHORTAGE when supply covers < 70% of demand", () => {
      const signal = detectSupplyImbalanceSignals({
        commodity: "Beef Cattle",
        state: "Kano",
        totalSupplyAvailable: 500,
        totalDemandExpected: 1000, // 50% coverage
      });

      expect(signal?.signalType).toBe("SUPPLY_SHORTAGE");
      expect(signal?.magnitude).toBe(50); // 50% deficit
    });

    it("detects SUPPLY_SURPLUS when supply exceeds demand by > 35%", () => {
      const signal = detectSupplyImbalanceSignals({
        commodity: "Roma Tomatoes",
        state: "Kano",
        totalSupplyAvailable: 1500,
        totalDemandExpected: 1000, // 150% coverage
      });

      expect(signal?.signalType).toBe("SUPPLY_SURPLUS");
      expect(signal?.magnitude).toBe(50); // 50% surplus
    });

    it("detects PROCESSING_BOTTLENECK when queue backlog exceeds capacity", () => {
      const signal = detectProcessingBottleneck({
        commodity: "Broiler Chicken",
        state: "Oyo",
        queuedSupplyVolume: 5000,
        dailyFacilityCapacity: 1000, // 5 days backlog
      });

      expect(signal?.signalType).toBe("PROCESSING_BOTTLENECK");
      expect(signal?.magnitude).toBeGreaterThanOrEqual(50);
    });

    it("detects LOGISTICS_DISRUPTION when delay rate exceeds threshold", () => {
      const signal = detectLogisticsDisruptions({
        corridor: "Kaduna-Lagos",
        state: "Kaduna",
        commodity: "Yellow Maize",
        activeShipments: 10,
        delayedShipments: 4, // 40% delay rate
      });

      expect(signal?.signalType).toBe("LOGISTICS_DISRUPTION");
      expect(signal?.magnitude).toBe(40);
    });

    it("detects SECURITY_DISRUPTION from published high-severity incident", () => {
      const signal = detectSecurityDisruptions({
        state: "Benue",
        lga: "Guma",
        incidentId: "inc-123",
        incidentTitle: "Logistics Corridor Incident near Farm Belt",
        severity: "CRITICAL",
        affectedCommodity: "Benue White Yam",
        publishedAt: new Date().toISOString(),
        movementImpact: "Transit checkpoint delays on arterial highway.",
      });

      expect(signal?.signalType).toBe("SECURITY_DISRUPTION");
      expect(signal?.magnitude).toBe(100);
      expect(signal?.commodity).toBe("Benue White Yam");
    });

    it("detects SEASONAL_DEMAND for Nigerian staple commodities during peak months", () => {
      // December (Month index 11) is peak for Broiler Chicken
      const decDate = new Date(2026, 11, 15);
      const signal = detectSeasonalDemand({
        commodity: "Broiler Chicken",
        state: "Lagos",
        currentDate: decDate,
      });

      expect(signal?.signalType).toBe("SEASONAL_DEMAND");
      expect(signal?.magnitude).toBe(35);
    });

    it("detects DISEASE_RISK with strict non-diagnostic advisory phrasing", () => {
      const signal = detectDiseaseRisk({
        commodity: "Broiler Chicken",
        state: "Ogun",
        lga: "Sagamu",
        advisoryTitle: "Newcastle Disease Alert in South-West Poultry Belt",
        advisorySource: "State Veterinary Extension Bureau",
        advisoryId: "adv-789",
        reportedAt: new Date().toISOString(),
      });

      expect(signal.signalType).toBe("DISEASE_RISK");
      expect(signal.evidence[0].description).toContain("Reported agricultural disease risk notice");
      expect(signal.evidence[0].description).not.toContain("This animal has disease");
    });
  });

  // ----------------------------------------------------------------------------
  // 3. CONFIDENCE MODEL
  // ----------------------------------------------------------------------------
  describe("Confidence Model", () => {
    it("assigns high confidence to verified platform transactions with multiple samples", () => {
      const score = calculateEvidenceConfidence({
        sourceType: "PLATFORM_TRANSACTION",
        sampleCount: 10,
        recencyDays: 1,
        isVerified: true,
        geographicScope: "EXACT_LGA",
      });

      expect(score).toBeGreaterThanOrEqual(0.85);
      expect(getConfidenceTier(score)).toBe("VERY_HIGH");
    });

    it("decays confidence for stale observations", () => {
      const freshScore = calculateEvidenceConfidence({
        sourceType: "PRICE_OBSERVATION",
        sampleCount: 5,
        recencyDays: 1,
      });

      const staleScore = calculateEvidenceConfidence({
        sourceType: "PRICE_OBSERVATION",
        sampleCount: 5,
        recencyDays: 28,
      });

      expect(staleScore).toBeLessThan(freshScore);
    });

    it("reduces confidence for self-reported and unverified sources", () => {
      const verifiedScore = calculateEvidenceConfidence({
        sourceType: "OFFICIAL_MONITOR",
        isVerified: true,
      });

      const unverifiedScore = calculateEvidenceConfidence({
        sourceType: "SELF_REPORTED",
        isVerified: false,
      });

      expect(unverifiedScore).toBeLessThan(verifiedScore);
    });

    it("penalizes high variance / conflicting multi-source observations", () => {
      const lowVariance = calculateEvidenceConfidence({
        sourceType: "PRICE_OBSERVATION",
        varianceRatio: 0.05,
      });

      const highVariance = calculateEvidenceConfidence({
        sourceType: "PRICE_OBSERVATION",
        varianceRatio: 0.85,
      });

      expect(highVariance).toBeLessThan(lowVariance);
    });
  });

  // ----------------------------------------------------------------------------
  // 4. ADVISORY RECOMMENDATIONS & STATE MACHINE
  // ----------------------------------------------------------------------------
  describe("Advisory Recommendations & State Machine", () => {
    it("generates an advisory recommendation from a supply shortage signal", () => {
      const signal: IntelligenceSignal = {
        id: "sig-test-1",
        agentId: "AGRICULTURAL_INTELLIGENCE",
        signalType: "SUPPLY_SHORTAGE",
        commodity: "Broiler Chicken",
        state: "Lagos",
        magnitude: 40,
        confidence: 0.88,
        source: "ENGINE_TEST",
        evidence: [
          {
            sourceType: "PRODUCTION_OUTPUT",
            sourceId: "out-1",
            description: "Shortage test",
            observedAt: new Date().toISOString(),
            relevance: 1.0,
          },
        ],
        observedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      };

      const rec = generateAdvisoryRecommendation(signal);
      expect(rec.status).toBe("PROPOSED");
      expect(rec.objective).toBe("DEMAND_FULFILLMENT");
      expect(rec.affectedActors).toContain("FARMER");
      expect(rec.affectedCommodities).toContain("Broiler Chicken");
      expect(rec.expectedImpact.timeframeDays).toBe(7);
    });

    it("allows valid transitions in human-in-the-loop state machine", () => {
      // PROPOSED -> REVIEWED
      expect(validateRecommendationTransition("PROPOSED", "REVIEW")).toBe("REVIEWED");

      // REVIEWED -> APPROVED
      expect(validateRecommendationTransition("REVIEWED", "APPROVE")).toBe("APPROVED");

      // PROPOSED -> REJECTED
      expect(validateRecommendationTransition("PROPOSED", "REJECT")).toBe("REJECTED");

      // APPROVED -> EXECUTED
      expect(validateRecommendationTransition("APPROVED", "EXECUTE")).toBe("EXECUTED");
    });

    it("throws error on invalid state transitions", () => {
      expect(() => validateRecommendationTransition("EXECUTED", "APPROVE")).toThrow(
        InvalidStatusTransitionError
      );

      expect(() => validateRecommendationTransition("REJECTED", "REVIEW")).toThrow(
        InvalidStatusTransitionError
      );
    });

    it("validates review inputs using Zod schema", () => {
      const validReview = {
        recommendationId: "123e4567-e89b-12d3-a456-426614174000",
        decision: "APPROVED",
        reviewNotes: "Confirmed with regional coordinator",
      };
      expect(recommendationReviewSchema.safeParse(validReview).success).toBe(true);

      const invalidReview = {
        recommendationId: "not-a-uuid",
        decision: "UNAUTHORIZED_ACTION",
      };
      expect(recommendationReviewSchema.safeParse(invalidReview).success).toBe(false);
    });
  });

  // ----------------------------------------------------------------------------
  // 5. AGENT MEMORY & EVALUATION ENGINE
  // ----------------------------------------------------------------------------
  describe("Agent Memory & Prediction Evaluations", () => {
    const mockPrediction: IntelligencePrediction = {
      id: "pred-100",
      agentId: "AGRICULTURAL_INTELLIGENCE",
      commodity: "Yellow Maize",
      state: "Kaduna",
      metricName: "PRICE_PER_KG",
      baselineValue: 400,
      predictedValue: 450, // Predicted UP from 400 to 450 (+12.5%)
      predictedRangeLow: 430,
      predictedRangeHigh: 470,
      confidence: 0.85,
      targetDate: new Date().toISOString(),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    it("evaluates highly accurate prediction with directional agreement", () => {
      const mockOutcome: IntelligenceOutcome = {
        id: "out-200",
        predictionId: "pred-100",
        actualValue: 455, // Actual moved to 455 (Direction UP, within range [430, 470])
        observedAt: new Date().toISOString(),
        sourceDomain: "MARKET",
        createdAt: new Date().toISOString(),
      };

      const evalResult = evaluatePredictionOutcome({
        prediction: mockPrediction,
        outcome: mockOutcome,
      });

      expect(evalResult.directionAccurate).toBe(true);
      expect(evalResult.withinPredictedRange).toBe(true);
      expect(evalResult.absoluteError).toBe(5);
      expect(evalResult.percentageError).toBeLessThan(2.0);
      expect(evalResult.evaluationScore).toBeGreaterThanOrEqual(0.9);
    });

    it("penalizes prediction when directional trend diverges", () => {
      const divergingOutcome: IntelligenceOutcome = {
        id: "out-201",
        predictionId: "pred-100",
        actualValue: 350, // Dropped to 350 instead of increasing
        observedAt: new Date().toISOString(),
        sourceDomain: "MARKET",
        createdAt: new Date().toISOString(),
      };

      const evalResult = evaluatePredictionOutcome({
        prediction: mockPrediction,
        outcome: divergingOutcome,
      });

      expect(evalResult.directionAccurate).toBe(false);
      expect(evalResult.withinPredictedRange).toBe(false);
      expect(evalResult.evaluationScore).toBeLessThan(0.5);
    });

    it("validates prediction schema with Zod", () => {
      const validPred = {
        agentId: "AGRICULTURAL_INTELLIGENCE",
        commodity: "Cow Milk",
        state: "Kano",
        metricName: "DAILY_COLLECTION_LITERS",
        baselineValue: 2000,
        predictedValue: 2500,
        confidence: 0.8,
        targetDate: new Date(Date.now() + 86400000).toISOString(),
      };
      expect(intelligencePredictionSchema.safeParse(validPred).success).toBe(true);
    });
  });
});
