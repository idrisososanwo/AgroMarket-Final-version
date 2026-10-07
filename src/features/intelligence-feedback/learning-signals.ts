/**
 * AgroMarket Phase 3.4: Learning Signals Synthesizer
 * Derives structured learning signals from completed evaluations to feed evidence back into intelligence.
 *
 * SAFETY INVARIANTS:
 * 1. NO AUTOMATIC REWRITES: Learning signals are structured analytical evidence, not autonomous code/model rewrites.
 * 2. EVIDENCE GROUNDED: Signals require valid evaluations and ground-truth outcomes.
 * 3. CALIBRATION SIGNALS: Detects overconfidence and underconfidence objectively.
 * 4. ANTI-PORK ZERO TOLERANCE: Rejects any prohibited produce terms.
 */

import {
  FeedbackDomain,
  FeedbackEvaluationItem,
  FeedbackOutcomeRecord,
  LearningSignalItem,
  LearningSignalType,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";

export interface GenerateLearningSignalsParams {
  evaluation: FeedbackEvaluationItem;
  outcome?: FeedbackOutcomeRecord | null;
  agentId: string;
  domain: FeedbackDomain;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  statedAgentConfidence?: number;
}

/**
 * Derives structured learning signals from an evaluation record
 */
export function generateLearningSignalsFromEvaluation(
  params: GenerateLearningSignalsParams
): LearningSignalItem[] {
  assertNoProhibitedProduce(params, "Generate Learning Signals");

  const {
    evaluation,
    outcome,
    agentId,
    domain,
    commodity = null,
    state = null,
    lga = null,
    statedAgentConfidence = 0.8,
  } = params;

  // If evaluation has insufficient data, do not manufacture learning signals
  if (
    evaluation.evaluationStatus === "INSUFFICIENT_DATA" ||
    evaluation.accuracyScore === null ||
    evaluation.accuracyScore === undefined
  ) {
    return [];
  }

  const signals: LearningSignalItem[] = [];
  const now = new Date().toISOString();

  // 1. Confidence Calibration Signal
  // Compares stated confidence vs actual observed accuracy
  const accuracy = evaluation.accuracyScore;
  const calibrationBias = Number((statedAgentConfidence - accuracy).toFixed(3)); // > 0 means overconfident
  const calibrationInterpretation =
    calibrationBias > 0.15
      ? `Agent ${agentId} exhibited overconfidence (${(statedAgentConfidence * 100).toFixed(1)}% stated vs ${(accuracy * 100).toFixed(1)}% verified accuracy) in ${domain}. Suggest downward calibration.`
      : calibrationBias < -0.15
      ? `Agent ${agentId} was conservatively underconfident (${(statedAgentConfidence * 100).toFixed(1)}% stated vs ${(accuracy * 100).toFixed(1)}% verified accuracy) in ${domain}.`
      : `Agent ${agentId} confidence was well-calibrated (bias ${calibrationBias}) in ${domain}.`;

  signals.push({
    id: crypto.randomUUID(),
    evaluationId: evaluation.id,
    agentId,
    domain,
    signalType: "CONFIDENCE_CALIBRATION_SIGNAL",
    commodity,
    state,
    lga,
    sampleSize: 1,
    metricValue: calibrationBias,
    confidence: Number(accuracy.toFixed(3)),
    interpretation: calibrationInterpretation,
    metadata: {
      statedConfidence: statedAgentConfidence,
      verifiedAccuracy: accuracy,
      calibrationBias,
    },
    generatedAt: now,
    createdAt: now,
  });

  // 2. Recommendation Success Rate / False Alarm Signals
  if (outcome) {
    const isSuccess =
      evaluation.usefulnessRating === "USEFUL" ||
      evaluation.usefulnessRating === "VERY_USEFUL" ||
      outcome.outcomeType.includes("COMPLETED") ||
      outcome.outcomeType.includes("SOURCED");

    signals.push({
      id: crypto.randomUUID(),
      evaluationId: evaluation.id,
      agentId,
      domain,
      signalType: "RECOMMENDATION_SUCCESS_RATE",
      commodity,
      state,
      lga,
      sampleSize: 1,
      metricValue: isSuccess ? 1.0 : 0.0,
      confidence: Number(accuracy.toFixed(3)),
      interpretation: `Recommendation resulted in ${outcome.outcomeType} with usefulness rating ${evaluation.usefulnessRating}.`,
      metadata: {
        outcomeType: outcome.outcomeType,
        usefulnessRating: evaluation.usefulnessRating,
        timeliness: evaluation.timeliness,
      },
      generatedAt: now,
      createdAt: now,
    });

    // False Positive Detection (e.g. Risk/Shortage predicted but dismissed/refuted)
    if (
      (outcome.outcomeType === "INTELLIGENCE_DISMISSED" || outcome.outcomeType === "PROCUREMENT_FAILED") &&
      accuracy < 0.40
    ) {
      signals.push({
        id: crypto.randomUUID(),
        evaluationId: evaluation.id,
        agentId,
        domain,
        signalType: "FALSE_POSITIVE_SIGNAL",
        commodity,
        state,
        lga,
        sampleSize: 1,
        metricValue: Number((1.0 - accuracy).toFixed(3)),
        confidence: 0.85,
        interpretation: `Potential false positive signal detected in ${domain} for ${commodity || "commodity"} in ${state || "region"}. Advisory alert was refuted by observed conditions.`,
        metadata: {
          outcomeType: outcome.outcomeType,
          usefulness: evaluation.usefulnessRating,
        },
        generatedAt: now,
        createdAt: now,
      });
    }
  }

  // 3. Domain-Specific Errors
  let domainSpecificSignalType: LearningSignalType | null = null;
  if (domain === "DEMAND") {
    domainSpecificSignalType = "DEMAND_FORECAST_ERROR";
  } else if (domain === "LOGISTICS") {
    domainSpecificSignalType = "LOGISTICS_PREDICTION_ERROR";
  } else if (domain === "SUPPLY") {
    domainSpecificSignalType = "SUPPLY_MATCH_EFFECTIVENESS";
  } else if (domain === "B2B_PROCUREMENT") {
    domainSpecificSignalType = "PROCUREMENT_MATCH_EFFECTIVENESS";
  }

  if (domainSpecificSignalType) {
    const errorMetric = Number((1.0 - accuracy).toFixed(3));
    signals.push({
      id: crypto.randomUUID(),
      evaluationId: evaluation.id,
      agentId,
      domain,
      signalType: domainSpecificSignalType,
      commodity,
      state,
      lga,
      sampleSize: 1,
      metricValue: errorMetric,
      confidence: Number(accuracy.toFixed(3)),
      interpretation: `Domain error metric for ${domainSpecificSignalType}: error ${errorMetric} with accuracy ${(accuracy * 100).toFixed(1)}%.`,
      metadata: {
        domain,
        timeliness: evaluation.timeliness,
      },
      generatedAt: now,
      createdAt: now,
    });
  }

  return signals;
}
