import { describe, it, expect } from "vitest";
import {
  OUTCOME_TYPES,
  PROVENANCE_NATURES,
  OUTCOME_EVIDENCE_TYPES,
  EVALUATION_STATUSES,
  USEFULNESS_RATINGS,
  TIMELINESS_STATUSES,
  LEARNING_SIGNAL_TYPES,
  DATA_QUALITY_ISSUE_TYPES,
  CANONICAL_AGENT_IDS,
  FeedbackEvaluationItem,
  FeedbackOutcomeRecord,
} from "@/features/intelligence-feedback/types";
import {
  assertNoProhibitedProduce,
  containsProhibitedProduce,
  containsPrivateInformation,
  assertNoPrivateInformation,
  containsTacticalSecurityClaims,
  containsDiagnosticPrescriptionClaims,
  isValidOutcomeTransition,
  isValidEvaluationTransition,
  recordFeedbackOutcomeSchema,
  recordOutcomeEvidenceSchema,
  recordFeedbackEvaluationSchema,
  recordLearningSignalSchema,
  recordDataQualityIssueSchema,
} from "@/features/intelligence-feedback/validation";
import {
  comparePredictionToOutcome,
  calculateTimeliness,
  determineTimeHorizon,
  determineUsefulnessRating,
  synthesizeDomainEvaluation,
} from "@/features/intelligence-feedback/evaluation-engine";
import { generateLearningSignalsFromEvaluation } from "@/features/intelligence-feedback/learning-signals";
import { auditObservationQuality } from "@/features/intelligence-feedback/data-quality";
import {
  computeAgentPerformance,
  getAllAgentsPerformanceBaseline,
  MIN_EVALUATIONS_THRESHOLD,
} from "@/features/intelligence-feedback/agent-performance";
import {
  recordFeedbackOutcome,
  recordOutcomeEvidence,
  recordFeedbackEvaluation,
  recordLearningSignal,
  recordDataQualityIssue,
} from "@/features/intelligence-feedback/data-layer";

describe("Phase 3.4: Backend Intelligence Feedback Loop", () => {
  const validRecommendationId = "123e4567-e89b-12d3-a456-426614174000";
  const validDecisionId = "223e4567-e89b-12d3-a456-426614174001";
  const validActionId = "323e4567-e89b-12d3-a456-426614174002";
  const validUserId = "423e4567-e89b-12d3-a456-426614174003";

  // ---------------------------------------------------------------------------
  // 1. Outcome Taxonomy & Model
  // ---------------------------------------------------------------------------
  describe("Controlled Outcome Taxonomy & Model", () => {
    it("recognizes all standard agricultural outcome types in taxonomy", () => {
      expect(OUTCOME_TYPES).toContain("SUPPLY_SOURCED");
      expect(OUTCOME_TYPES).toContain("PROCUREMENT_COMPLETED");
      expect(OUTCOME_TYPES).toContain("MARKETPLACE_PURCHASE_COMPLETED");
      expect(OUTCOME_TYPES).toContain("PRODUCTION_PLAN_COMPLETED");
      expect(OUTCOME_TYPES).toContain("LOGISTICS_MOVEMENT_COMPLETED");
      expect(OUTCOME_TYPES).toContain("EQUIPMENT_RENTAL_COMPLETED");
      expect(OUTCOME_TYPES).toContain("SERVICE_REQUEST_COMPLETED");
      expect(OUTCOME_TYPES).toContain("SHARED_PURCHASE_COMPLETED");
      expect(OUTCOME_TYPES).toContain("FOOD_SECURITY_RESPONSE_COMPLETED");
      expect(OUTCOME_TYPES).toContain("INTELLIGENCE_CONFIRMED");
      expect(OUTCOME_TYPES).toContain("INTELLIGENCE_DISMISSED");
    });

    it("creates a feedback outcome record with full linkage", async () => {
      const outcome = await recordFeedbackOutcome({
        recommendationId: validRecommendationId,
        decisionId: validDecisionId,
        actionId: validActionId,
        outcomeType: "SUPPLY_SOURCED",
        status: "OUTCOME_OBSERVED",
        decision: "Accepted supply matching recommendation",
        actionTaken: "Contacted aggregated cassava supplier in Ogun",
        observedOutcome: "10 MT of cassava tubers successfully procured at farm-gate",
        expectedOutcome: "Procure 10 MT of tubers",
        variance: "Price was 3% lower than metropolitan terminal market",
        evaluationScore: 92,
        lessonsLearned: "Direct cooperative aggregation reduced transit spoilage",
        actorRole: "BUYER",
        commodity: "Cassava Tubers",
        state: "Ogun",
        lga: "Abeokuta North",
        recordedBy: validUserId,
      });

      expect(outcome.id).toBeDefined();
      expect(outcome.outcomeType).toBe("SUPPLY_SOURCED");
      expect(outcome.status).toBe("OUTCOME_OBSERVED");
      expect(outcome.evaluationScore).toBe(92);
      expect(outcome.recommendationId).toBe(validRecommendationId);
      expect(outcome.decisionId).toBe(validDecisionId);
    });

    it("enforces valid outcome status transitions", () => {
      expect(isValidOutcomeTransition("OUTCOME_OBSERVED", "OUTCOME_EVALUATED")).toBe(true);
      expect(isValidOutcomeTransition("OUTCOME_OBSERVED", "OUTCOME_UNKNOWN")).toBe(true);
      expect(isValidOutcomeTransition("OUTCOME_EVALUATED", "OUTCOME_OBSERVED")).toBe(false); // Terminal
    });

    it("enforces valid evaluation status transitions and time horizons", () => {
      expect(isValidEvaluationTransition("PENDING", "EVALUATED")).toBe(true);
      expect(isValidEvaluationTransition("PENDING", "INSUFFICIENT_DATA")).toBe(true);
      expect(isValidEvaluationTransition("EVALUATED", "PENDING")).toBe(false); // Terminal
      expect(determineTimeHorizon(5)).toBe("SHORT_TERM_0_7D");
      expect(determineTimeHorizon(20)).toBe("MEDIUM_TERM_8_30D");
      expect(determineTimeHorizon(45)).toBe("LONG_TERM_31_90D");
    });

    it("verifies controlled status and taxonomy enumerations", () => {
      expect(EVALUATION_STATUSES).toContain("INSUFFICIENT_DATA");
      expect(USEFULNESS_RATINGS).toContain("VERY_USEFUL");
      expect(TIMELINESS_STATUSES).toContain("ON_TIME");
      expect(LEARNING_SIGNAL_TYPES).toContain("CONFIDENCE_CALIBRATION_SIGNAL");
      expect(DATA_QUALITY_ISSUE_TYPES).toContain("STALE_OBSERVATION");
      expect(MIN_EVALUATIONS_THRESHOLD).toBe(3);
    });

    it("validates runtime schemas for evidence, evaluations, signals, and quality issues", () => {
      const outcomeId = crypto.randomUUID();
      const validEvidence = recordOutcomeEvidenceSchema.parse({
        outcomeId,
        evidenceType: "TRANSACTION_RECEIPT",
        sourceType: "VERIFIED_TRANSACTION",
        provenanceNature: "OBSERVED",
        observedAt: new Date().toISOString(),
        confidence: 0.9,
        description: "Valid receipt at terminal market",
      });
      expect(validEvidence.evidenceType).toBe("TRANSACTION_RECEIPT");

      const validEval = recordFeedbackEvaluationSchema.parse({
        recommendationId: validRecommendationId,
        agentId: "MARKET_INTELLIGENCE_AGENT",
        domain: "MARKET",
        evaluationStatus: "EVALUATED",
        usefulnessRating: "USEFUL",
        timeliness: "ON_TIME",
        timeHorizon: "SHORT_TERM_0_7D",
      });
      expect(validEval.evaluationStatus).toBe("EVALUATED");

      const validSignal = recordLearningSignalSchema.parse({
        agentId: "DEMAND_FORECASTING_AGENT",
        domain: "DEMAND",
        signalType: "DEMAND_FORECAST_ERROR",
        sampleSize: 1,
        confidence: 0.85,
        interpretation: "Demand error metric within threshold",
      });
      expect(validSignal.signalType).toBe("DEMAND_FORECAST_ERROR");

      const validQuality = recordDataQualityIssueSchema.parse({
        issueType: "STALE_OBSERVATION",
        severity: "MEDIUM",
        domain: "MARKET",
        affectedEntityType: "OBSERVATION",
        description: "Observation is older than 72 hours",
      });
      expect(validQuality.issueType).toBe("STALE_OBSERVATION");
    });

    it("records feedback evaluation, learning signal, and data quality issue in data layer", async () => {
      const recordedEval = await recordFeedbackEvaluation({
        recommendationId: validRecommendationId,
        agentId: "LOGISTICS_INTELLIGENCE_AGENT",
        domain: "LOGISTICS",
        evaluationStatus: "EVALUATED",
        accuracyScore: 0.88,
        usefulnessRating: "USEFUL",
        timeliness: "ON_TIME",
        timeHorizon: "SHORT_TERM_0_7D",
        predictedState: "Transit delay on Kano corridor",
        actualState: "Observed 3h delay at checkpoint",
        varianceAnalysis: "Accurate forecast",
      });
      expect(recordedEval.id).toBeDefined();
      expect(recordedEval.accuracyScore).toBe(0.88);

      const recordedSignal = await recordLearningSignal({
        evaluationId: recordedEval.id,
        agentId: "LOGISTICS_INTELLIGENCE_AGENT",
        domain: "LOGISTICS",
        signalType: "LOGISTICS_PREDICTION_ERROR",
        sampleSize: 1,
        metricValue: 0.12,
        confidence: 0.88,
        interpretation: "Logistics prediction error was low",
      });
      expect(recordedSignal.id).toBeDefined();
      expect(recordedSignal.metricValue).toBe(0.12);

      const recordedQuality = await recordDataQualityIssue({
        issueType: "INCONSISTENT_UNITS",
        severity: "LOW",
        domain: "MARKET",
        affectedEntityType: "OBSERVATION",
        description: "Unit was missing in market observation",
      });
      expect(recordedQuality.id).toBeDefined();
      expect(recordedQuality.issueType).toBe("INCONSISTENT_UNITS");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Structured Evidence Provenance
  // ---------------------------------------------------------------------------
  describe("Structured Evidence Provenance", () => {
    it("records outcome evidence with verified provenance nature", async () => {
      const evidence = await recordOutcomeEvidence({
        outcomeId: crypto.randomUUID(),
        evidenceType: "DELIVERY_WAYBILL",
        sourceType: "VERIFIED_TRANSACTION",
        sourceReference: "WAYBILL-OG-2026-098",
        provenanceNature: "OBSERVED",
        observedAt: new Date().toISOString(),
        confidence: 0.95,
        description: "Driver physical receipt signed at Abeokuta aggregation depot",
        quantitativeValue: 10.0,
        unit: "MT",
        createdBy: validUserId,
      });

      expect(evidence.id).toBeDefined();
      expect(evidence.provenanceNature).toBe("OBSERVED");
      expect(evidence.confidence).toBe(0.95);
      expect(evidence.quantitativeValue).toBe(10.0);
    });

    it("supports all provenance natures", () => {
      expect(PROVENANCE_NATURES).toEqual(["OBSERVED", "DERIVED", "CORRELATED", "ESTIMATED", "UNKNOWN"]);
      expect(OUTCOME_EVIDENCE_TYPES).toContain("TRANSACTION_RECEIPT");
      expect(OUTCOME_EVIDENCE_TYPES).toContain("HARVEST_INSPECTION");
      expect(OUTCOME_EVIDENCE_TYPES).toContain("CORRIDOR_SURVEILLANCE");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Evaluation Engine & Prediction Comparison
  // ---------------------------------------------------------------------------
  describe("Deterministic Evaluation Engine", () => {
    it("compares quantitative prediction against outcome accurately", () => {
      const result = comparePredictionToOutcome({
        predictedValue: 50000,
        actualValue: 52000,
        baselineValue: 45000,
        predictedRangeLow: 48000,
        predictedRangeHigh: 54000,
        confidence: 0.85,
        evidenceCount: 5,
      });

      expect(result.evaluationStatus).toBe("EVALUATED");
      expect(result.absoluteError).toBe(2000);
      expect(result.percentageError).toBe(3.85);
      expect(result.directionAccurate).toBe(true);
      expect(result.withinPredictedRange).toBe(true);
      expect(result.accuracyScore).toBeGreaterThan(0.90);
    });

    it("returns INSUFFICIENT_DATA when evidence count is zero or values are invalid", () => {
      const result = comparePredictionToOutcome({
        predictedValue: 50000,
        actualValue: 52000,
        evidenceCount: 0, // Insufficient data
      });

      expect(result.evaluationStatus).toBe("INSUFFICIENT_DATA");
      expect(result.accuracyScore).toBeNull();
      expect(result.notes).toContain("Insufficient empirical evidence");
    });

    it("calculates timeliness accurately for early, on-time, and late outcomes", () => {
      const now = new Date();
      const target = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Target tomorrow

      // Same time (within 48hr tolerance) -> ON_TIME
      expect(calculateTimeliness(target, now.toISOString())).toBe("ON_TIME");

      // 4 days earlier -> EARLY
      const earlyDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();
      expect(calculateTimeliness(target, earlyDate)).toBe("EARLY");

      // 4 days later -> LATE
      const lateDate = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString();
      expect(calculateTimeliness(target, lateDate)).toBe("LATE");
    });

    it("determines usefulness based on user decision and agricultural outcome", () => {
      expect(
        determineUsefulnessRating({
          userDecision: "ACCEPT",
          actionStatus: "ACTION_COMPLETED",
          outcomeType: "SUPPLY_SOURCED",
          evaluationScore: 90,
        })
      ).toBe("VERY_USEFUL");

      expect(
        determineUsefulnessRating({
          userDecision: "REJECT",
          outcomeType: "INTELLIGENCE_DISMISSED",
        })
      ).toBe("NOT_USEFUL");

      expect(
        determineUsefulnessRating({
          userDecision: "DEFER",
          outcomeType: "OTHER",
        })
      ).toBe("NEUTRAL");
    });

    it("synthesizes complete domain evaluation with transparent governance disclaimer", () => {
      const synthesis = synthesizeDomainEvaluation({
        recommendationId: validRecommendationId,
        agentId: "MARKET_INTELLIGENCE_AGENT",
        domain: "MARKET",
        userDecision: "ACCEPT",
        actionStatus: "ACTION_COMPLETED",
        outcomeType: "PROCUREMENT_COMPLETED",
        expectedOutcome: "Procure grain at wholesale parity",
        observedOutcome: "Purchased 50 bags at Dawanau market at parity",
        evidenceConfidence: 0.90,
        evidenceCount: 4,
      });

      expect(synthesis.evaluationStatus).toBe("EVALUATED");
      expect(synthesis.accuracyScore).toBeGreaterThan(0.70);
      expect(synthesis.usefulnessRating).toBe("USEFUL");
      expect(synthesis.governanceNote).toContain("without claiming causal determinism");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Learning Signals Derivation
  // ---------------------------------------------------------------------------
  describe("Learning Signals Derivation", () => {
    it("generates confidence calibration and success signals from completed evaluation", () => {
      const evaluation: FeedbackEvaluationItem = {
        id: crypto.randomUUID(),
        recommendationId: validRecommendationId,
        agentId: "DEMAND_FORECASTING_AGENT",
        domain: "DEMAND",
        evaluationStatus: "EVALUATED",
        accuracyScore: 0.72,
        usefulnessRating: "USEFUL",
        timeliness: "ON_TIME",
        timeHorizon: "SHORT_TERM_0_7D",
        predictedState: "Demand rise by 15%",
        actualState: "Demand rose by 12%",
        varianceAnalysis: "Slight deficit",
        evaluatedBy: validUserId,
        evaluatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const outcome: FeedbackOutcomeRecord = {
        id: crypto.randomUUID(),
        recommendationId: validRecommendationId,
        outcomeType: "PROCUREMENT_COMPLETED",
        status: "OUTCOME_OBSERVED",
        decision: "ACCEPT",
        actionTaken: "Increased stocking",
        actionTime: new Date().toISOString(),
        observedOutcome: "Stock depleted in 5 days",
        expectedOutcome: "Depleted in 7 days",
        variance: "Faster turnover",
        evaluationScore: 85,
        lessonsLearned: "Metropolitan demand was high",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const signals = generateLearningSignalsFromEvaluation({
        evaluation,
        outcome,
        agentId: "DEMAND_FORECASTING_AGENT",
        domain: "DEMAND",
        commodity: "Sorghum",
        state: "Kaduna",
        statedAgentConfidence: 0.90, // 0.90 stated vs 0.72 accuracy -> bias ~0.18
      });

      expect(signals.length).toBeGreaterThanOrEqual(2);

      const calibrationSignal = signals.find((s) => s.signalType === "CONFIDENCE_CALIBRATION_SIGNAL");
      expect(calibrationSignal).toBeDefined();
      expect(calibrationSignal?.metricValue).toBe(0.18);
      expect(calibrationSignal?.interpretation).toContain("overconfidence");

      const successSignal = signals.find((s) => s.signalType === "RECOMMENDATION_SUCCESS_RATE");
      expect(successSignal).toBeDefined();
      expect(successSignal?.metricValue).toBe(1.0);

      const domainErrorSignal = signals.find((s) => s.signalType === "DEMAND_FORECAST_ERROR");
      expect(domainErrorSignal).toBeDefined();
      expect(domainErrorSignal?.metricValue).toBe(0.28);
    });

    it("does not generate learning signals when evaluation has insufficient data", () => {
      const evaluation: FeedbackEvaluationItem = {
        id: crypto.randomUUID(),
        recommendationId: validRecommendationId,
        agentId: "MARKET_INTELLIGENCE_AGENT",
        domain: "MARKET",
        evaluationStatus: "INSUFFICIENT_DATA",
        accuracyScore: null,
        usefulnessRating: "INSUFFICIENT_DATA",
        timeliness: "INSUFFICIENT_DATA",
        timeHorizon: "SHORT_TERM_0_7D",
        evaluatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const signals = generateLearningSignalsFromEvaluation({
        evaluation,
        agentId: "MARKET_INTELLIGENCE_AGENT",
        domain: "MARKET",
      });

      expect(signals).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Data Quality Feedback
  // ---------------------------------------------------------------------------
  describe("Data Quality Feedback & Upstream Flaw Detection", () => {
    it("detects stale observations, missing provenance, and invalid negative values", () => {
      const staleTime = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(); // 100 hours ago
      const observations = [
        {
          id: "obs-1",
          sourceDomain: "MARKET" as const,
          sourceId: "source-1",
          commodity: "Maize",
          state: "Kano",
          observedValue: 45000,
          unit: "bag_100kg",
          observedAt: staleTime,
        },
        {
          id: "obs-2",
          sourceDomain: "LOGISTICS" as const,
          sourceId: null, // Missing provenance
          sourceReferences: [],
          commodity: "Tomatoes",
          state: "Kaduna",
          observedValue: 300,
          unit: "crates",
          observedAt: new Date().toISOString(),
        },
        {
          id: "obs-3",
          sourceDomain: "SUPPLY" as const,
          sourceId: "source-3",
          commodity: "Yam",
          state: "Benue",
          observedValue: -500, // Suspicious negative value
          unit: "tubers",
          observedAt: new Date().toISOString(),
        },
      ];

      const issues = auditObservationQuality(observations);
      expect(issues.length).toBeGreaterThanOrEqual(3);

      expect(issues.some((i) => i.issueType === "STALE_OBSERVATION")).toBe(true);
      expect(issues.some((i) => i.issueType === "MISSING_SOURCE_PROVENANCE")).toBe(true);
      expect(issues.some((i) => i.issueType === "SUSPICIOUS_VALUES")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Agent Performance Evaluation Layer
  // ---------------------------------------------------------------------------
  describe("Unified Agent Performance & Attribution", () => {
    it("returns INSUFFICIENT_DATA when agent evaluations are below threshold", () => {
      const summary = computeAgentPerformance({
        agentId: "LOGISTICS_INTELLIGENCE_AGENT",
        evaluations: [
          {
            id: "eval-1",
            recommendationId: validRecommendationId,
            agentId: "LOGISTICS_INTELLIGENCE_AGENT",
            domain: "LOGISTICS",
            evaluationStatus: "EVALUATED",
            accuracyScore: 0.85,
            usefulnessRating: "USEFUL",
            timeliness: "ON_TIME",
            timeHorizon: "SHORT_TERM_0_7D",
            evaluatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ], // Only 1 evaluation, threshold is 3
      });

      expect(summary.evaluationState).toBe("INSUFFICIENT_DATA");
      expect(summary.meanAccuracyScore).toBeNull();
      expect(summary.answers.wasPredictionCorrect).toContain("INSUFFICIENT_DATA");
    });

    it("evaluates agent performance when sample size meets threshold", () => {
      const evals: FeedbackEvaluationItem[] = [
        {
          id: "eval-1",
          recommendationId: validRecommendationId,
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domain: "MARKET",
          evaluationStatus: "EVALUATED",
          accuracyScore: 0.80,
          usefulnessRating: "USEFUL",
          timeliness: "ON_TIME",
          timeHorizon: "SHORT_TERM_0_7D",
          evaluatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "eval-2",
          recommendationId: validRecommendationId,
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domain: "MARKET",
          evaluationStatus: "EVALUATED",
          accuracyScore: 0.90,
          usefulnessRating: "VERY_USEFUL",
          timeliness: "ON_TIME",
          timeHorizon: "SHORT_TERM_0_7D",
          evaluatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        {
          id: "eval-3",
          recommendationId: validRecommendationId,
          agentId: "MARKET_INTELLIGENCE_AGENT",
          domain: "MARKET",
          evaluationStatus: "EVALUATED",
          accuracyScore: 0.85,
          usefulnessRating: "USEFUL",
          timeliness: "ON_TIME",
          timeHorizon: "SHORT_TERM_0_7D",
          evaluatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      const summary = computeAgentPerformance({
        agentId: "MARKET_INTELLIGENCE_AGENT",
        evaluations: evals,
        statedConfidences: [0.85, 0.90, 0.85],
      });

      expect(summary.evaluationState).toBe("EVALUATED");
      expect(summary.meanAccuracyScore).toBe(0.85);
      expect(summary.usefulnessRate).toBe(1.0);
      expect(summary.timelinessRate).toBe(1.0);
      expect(summary.calibrationBias).toBe(0.017); // ~0.867 stated - 0.850 actual
      expect(summary.answers.wasPredictionCorrect).toContain("Yes");
    });

    it("covers all 9 canonical agents in baseline", () => {
      const baseline = getAllAgentsPerformanceBaseline([]);
      expect(baseline).toHaveLength(CANONICAL_AGENT_IDS.length);
      for (const agent of baseline) {
        expect(agent.evaluationState).toBe("INSUFFICIENT_DATA");
        expect(agent.meanAccuracyScore).toBeNull();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Security, Privacy, and Anti-Pork Invariants
  // ---------------------------------------------------------------------------
  describe("Security, Privacy, and Anti-Pork Invariants", () => {
    it("strictly blocks prohibited produce across all feedback models", () => {
      expect(containsProhibitedProduce("fresh pork chops")).toBe(true);
      expect(containsProhibitedProduce("swine feed supplement")).toBe(true);
      expect(containsProhibitedProduce("bacon processing")).toBe(true);
      expect(containsProhibitedProduce("healthy cassava tubers")).toBe(false);

      expect(() => {
        assertNoProhibitedProduce({ description: "Pork sausages purchased" }, "Test");
      }).toThrow(/Anti-Pork Policy Violation/);

      expect(() => {
        recordFeedbackOutcomeSchema.parse({
          recommendationId: validRecommendationId,
          outcomeType: "SUPPLY_SOURCED",
          decision: "Accept",
          actionTaken: "Purchased pork",
          observedOutcome: "Pork received",
          expectedOutcome: "Expected pork",
          variance: "None",
          evaluationScore: 50,
          lessonsLearned: "None",
          commodity: "Pork",
        });
      }).toThrow();
    });

    it("strictly rejects private farmer coordinates and phone numbers", () => {
      expect(containsPrivateInformation("Contact farmer at +2348012345678")).toBe(true);
      expect(containsPrivateInformation("Private farm at 9.0764785, 7.3985741")).toBe(true);
      expect(containsPrivateInformation("Aggregated at Abeokuta LGA Depot")).toBe(false);

      expect(() => {
        assertNoPrivateInformation({ notes: "Call 08031234567 directly" }, "Test");
      }).toThrow(/Privacy Violation/);
    });

    it("detects and flags tactical military safe-passage guarantees", () => {
      expect(containsTacticalSecurityClaims("The route is 100% secure today")).toBe(true);
      expect(containsTacticalSecurityClaims("Safe-passage guaranteed by system")).toBe(true);
      expect(containsTacticalSecurityClaims("Corridor review recommended due to transit checkpoint delay")).toBe(false);
    });

    it("detects and flags diagnostic veterinary prescription claims", () => {
      expect(containsDiagnosticPrescriptionClaims("Prescribe antibiotic injection twice daily")).toBe(true);
      expect(containsDiagnosticPrescriptionClaims("Referral to local veterinary officer for inspection")).toBe(false);
    });
  });
});
