/**
 * AgroMarket Phase 3.7: Scenario Evaluation & Learning Loop Integration
 *
 * Compares:
 * SCENARIO EXPECTATION vs OBSERVED OUTCOME
 *
 * Implements:
 * 1. Directional alignment & impact assessment.
 * 2. Timing compliance (within predicted horizon window).
 * 3. False Positive / False Negative classification.
 * 4. Learning signal emission directly into Phase 3.4 (recordLearningSignal).
 *
 * SAFETY INVARIANTS:
 * - Deterministic arithmetic only; divide-by-zero and null guards.
 * - Anti-pork verification across evaluation metadata.
 * - Does not claim a scenario was correct unless supported by verifiable evidence.
 */

import {
  AgriculturalScenario,
  ScenarioEvaluationResult,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";
import { recordLearningSignal } from "@/features/intelligence-feedback/data-layer";
import { FeedbackDomain } from "@/features/intelligence-feedback/types";

export interface ObservedScenarioOutcome {
  actualDirection: "INCREASING" | "DECREASING" | "STABLE" | "VOLATILE" | "UNKNOWN";
  actualImpactSummary: string;
  actualDisruptionOccurred: boolean;
  observedAt: string;
  sourceDomain: string;
  evidenceSourceRef?: string;
}

/**
 * Deterministically evaluates a completed scenario against ground truth outcome
 */
export async function evaluateScenarioAgainstOutcome(
  scenario: AgriculturalScenario,
  outcome: ObservedScenarioOutcome
): Promise<ScenarioEvaluationResult> {
  assertNoProhibitedProduce(scenario.commodity, "Evaluate Scenario");

  // Insufficient data guard
  if (
    scenario.probabilityClass === "INSUFFICIENT_DATA" ||
    scenario.confidenceLevel === "INSUFFICIENT_DATA" ||
    outcome.actualDirection === "UNKNOWN"
  ) {
    return {
      scenarioId: scenario.id,
      evaluationStatus: "INSUFFICIENT_DATA",
      directionalAccuracy: false,
      impactAccuracy: "NOT_EVALUABLE",
      timingAccuracy: "NOT_EVALUABLE",
      isFalsePositive: false,
      isFalseNegative: false,
      score: 0.0,
      evidenceUsefulness: "UNKNOWN",
      summary: "Scenario could not be evaluated due to insufficient data or unknown outcome direction.",
      learningSignalsFlagged: false,
    };
  }

  // 1. Directional Alignment
  const directionalAccuracy =
    scenario.expectedDirection === outcome.actualDirection ||
    (scenario.expectedDirection === "VOLATILE" && outcome.actualDirection !== "STABLE");

  // 2. Timing Accuracy
  const obsDate = new Date(outcome.observedAt).getTime();
  const startDate = new Date(scenario.startDate).getTime();
  const endDate = new Date(scenario.endDate).getTime();

  let timingAccuracy: "ON_TIME" | "EARLY" | "LATE" | "NOT_EVALUABLE" = "NOT_EVALUABLE";
  if (!isNaN(obsDate) && !isNaN(startDate) && !isNaN(endDate)) {
    if (obsDate < startDate) {
      timingAccuracy = "EARLY";
    } else if (obsDate > endDate) {
      timingAccuracy = "LATE";
    } else {
      timingAccuracy = "ON_TIME";
    }
  }

  // 3. False Positive / False Negative Classification
  const scenarioAnticipatedDisruption =
    scenario.scenarioType !== "BALANCED_NOMINAL_SCENARIO" &&
    scenario.probabilityClass !== "LOW_LIKELIHOOD";

  let isFalsePositive = false;
  let isFalseNegative = false;

  if (scenarioAnticipatedDisruption && !outcome.actualDisruptionOccurred) {
    isFalsePositive = true;
  } else if (!scenarioAnticipatedDisruption && outcome.actualDisruptionOccurred) {
    isFalseNegative = true;
  }

  // 4. Impact Accuracy
  let impactAccuracy: "ACCURATE" | "PARTIALLY_ACCURATE" | "INACCURATE" | "NOT_EVALUABLE" = "INACCURATE";
  if (directionalAccuracy && !isFalsePositive && !isFalseNegative) {
    impactAccuracy = "ACCURATE";
  } else if (directionalAccuracy || (scenarioAnticipatedDisruption && outcome.actualDisruptionOccurred)) {
    impactAccuracy = "PARTIALLY_ACCURATE";
  }

  // 5. Score Calculation (0.0 to 100.0)
  let score = 50.0;
  if (directionalAccuracy) score += 30.0;
  if (timingAccuracy === "ON_TIME") score += 20.0;
  if (isFalsePositive) score = Math.max(10.0, score - 40.0);
  if (isFalseNegative) score = Math.max(5.0, score - 45.0);
  score = Math.min(100.0, Math.max(0.0, Number(score.toFixed(1))));

  const evidenceUsefulness =
    score >= 75.0 ? "HIGH" : score >= 50.0 ? "MODERATE" : "LOW";

  const summary = `Scenario [${scenario.scenarioType}] evaluated with score ${score}%. Directional alignment: ${directionalAccuracy}. False positive: ${isFalsePositive}, False negative: ${isFalseNegative}.`;

  // 6. Record Learning Signal into Phase 3.4
  let learningSignalsFlagged = false;
  try {
    if (isFalsePositive) {
      await recordLearningSignal({
        agentId: "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
        signalType: "FALSE_POSITIVE_SIGNAL",
        domain: (scenario.domain === "CROSS_DOMAIN" ? "ORCHESTRATION" : scenario.domain) as FeedbackDomain,
        commodity: scenario.commodity,
        state: scenario.state,
        lga: scenario.lga,
        sampleSize: 1,
        confidence: scenario.confidence,
        metricValue: score,
        interpretation: `Scenario false positive detected for ${scenario.commodity} in ${scenario.state}: anticipated ${scenario.scenarioType} but disruption did not materialize.`,
      });
      learningSignalsFlagged = true;
    } else if (isFalseNegative) {
      await recordLearningSignal({
        agentId: "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
        signalType: "FALSE_NEGATIVE_SIGNAL",
        domain: (scenario.domain === "CROSS_DOMAIN" ? "ORCHESTRATION" : scenario.domain) as FeedbackDomain,
        commodity: scenario.commodity,
        state: scenario.state,
        lga: scenario.lga,
        sampleSize: 1,
        confidence: scenario.confidence,
        metricValue: score,
        interpretation: `Scenario false negative detected for ${scenario.commodity} in ${scenario.state}: nominal outlook missed actual disruption.`,
      });
      learningSignalsFlagged = true;
    }
  } catch (err) {
    // Safe degradation if learning signal store is unavailable
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("Could not record scenario learning signal:", msg);
  }

  return {
    scenarioId: scenario.id,
    evaluationStatus: "EVALUATED",
    directionalAccuracy,
    impactAccuracy,
    timingAccuracy,
    isFalsePositive,
    isFalseNegative,
    score,
    evidenceUsefulness,
    summary,
    learningSignalsFlagged,
  };
}
