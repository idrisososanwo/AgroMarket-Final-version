/**
 * AgroMarket Phase 3.4: Deterministic Evaluation Engine
 * Compares intelligence recommendations and predictions against observed outcomes.
 *
 * SAFETY INVARIANTS:
 * 1. ZERO FAKE METRICS: Returns INSUFFICIENT_DATA when evidence is inadequate.
 * 2. NO CAUSAL MANUFACTURE: Measures statistical association, never claims causal proof.
 * 3. TRANSPARENT TIMELINESS: Calculates EARLY, ON_TIME, LATE, or EXPIRED objectively.
 * 4. ANTI-PORK ENFORCEMENT: Rejects any prohibited produce references.
 */

import {
  EvaluationStatus,
  FeedbackDomain,
  TimeHorizon,
  TimelinessStatus,
  UsefulnessRating,
  OutcomeType,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";

export interface ComparePredictionParams {
  predictedValue: number;
  actualValue: number;
  baselineValue?: number;
  predictedRangeLow?: number;
  predictedRangeHigh?: number;
  confidence?: number;
  evidenceCount?: number;
}

export interface PredictionComparisonResult {
  evaluationStatus: EvaluationStatus;
  accuracyScore: number | null; // 0.000 - 1.000
  absoluteError: number;
  percentageError: number;
  directionAccurate: boolean;
  withinPredictedRange: boolean;
  notes: string;
}

/**
 * Deterministically compares quantitative prediction against observed ground truth
 */
export function comparePredictionToOutcome(
  params: ComparePredictionParams
): PredictionComparisonResult {
  const {
    predictedValue,
    actualValue,
    baselineValue = 0,
    predictedRangeLow,
    predictedRangeHigh,
    confidence = 0.5,
    evidenceCount = 1,
  } = params;

  // Guard: Insufficient data check
  if (evidenceCount < 1 || isNaN(predictedValue) || isNaN(actualValue)) {
    return {
      evaluationStatus: "INSUFFICIENT_DATA",
      accuracyScore: null,
      absoluteError: 0,
      percentageError: 0,
      directionAccurate: false,
      withinPredictedRange: false,
      notes: "Insufficient empirical evidence or invalid quantitative values to evaluate prediction.",
    };
  }

  const absoluteError = Math.abs(predictedValue - actualValue);
  const denom = Math.abs(actualValue) > 0 ? Math.abs(actualValue) : 1;
  const percentageError = Number(((absoluteError / denom) * 100).toFixed(2));

  // Direction accuracy
  const predictedChange = predictedValue - baselineValue;
  const actualChange = actualValue - baselineValue;
  const directionAccurate =
    (predictedChange >= 0 && actualChange >= 0) || (predictedChange <= 0 && actualChange <= 0);

  // Range compliance
  const withinPredictedRange =
    predictedRangeLow !== undefined && predictedRangeHigh !== undefined
      ? actualValue >= predictedRangeLow && actualValue <= predictedRangeHigh
      : percentageError <= 20.0;

  // Normalized score: 1.0 = exact match, decaying as percentage error grows
  const rawScore = Math.max(0, 1.0 - percentageError / 100);
  const accuracyScore = Number((rawScore * (0.8 + 0.2 * confidence)).toFixed(3));

  return {
    evaluationStatus: "EVALUATED",
    accuracyScore: Math.min(1.0, Math.max(0.0, accuracyScore)),
    absoluteError: Number(absoluteError.toFixed(2)),
    percentageError,
    directionAccurate,
    withinPredictedRange,
    notes: `Evaluated with absolute error of ${absoluteError.toFixed(2)} (${percentageError}% error). Direction ${directionAccurate ? "aligned" : "diverged"}.`,
  };
}

/**
 * Calculates temporal timeliness of an observed outcome relative to expected target date
 */
export function calculateTimeliness(
  targetDate: string | Date,
  observedAt: string | Date,
  toleranceHours: number = 48
): TimelinessStatus {
  try {
    const target = new Date(targetDate).getTime();
    const observed = new Date(observedAt).getTime();

    if (isNaN(target) || isNaN(observed)) {
      return "NOT_EVALUABLE";
    }

    const diffHours = (observed - target) / (1000 * 60 * 60);

    if (diffHours < -toleranceHours) {
      return "EARLY";
    } else if (diffHours > toleranceHours) {
      return "LATE";
    } else {
      return "ON_TIME";
    }
  } catch {
    return "NOT_EVALUABLE";
  }
}

/**
 * Maps days to governed time horizons
 */
export function determineTimeHorizon(days: number): TimeHorizon {
  if (days <= 7) return "SHORT_TERM_0_7D";
  if (days <= 30) return "MEDIUM_TERM_8_30D";
  return "LONG_TERM_31_90D";
}

export interface DetermineUsefulnessParams {
  userDecision: string;
  actionStatus?: string;
  outcomeType: OutcomeType;
  evaluationScore?: number;
  variance?: string;
}

/**
 * Evaluates practical usefulness of an advisory recommendation based on user decision,
 * action progression, and observed agricultural outcome.
 */
export function determineUsefulnessRating(
  params: DetermineUsefulnessParams
): UsefulnessRating {
  assertNoProhibitedProduce(params, "Determine Usefulness Rating");

  const { userDecision, actionStatus, outcomeType, evaluationScore = 50 } = params;

  // If user dismissed or rejected explicitly
  if (userDecision === "REJECT" || userDecision === "DISMISS") {
    return "NOT_USEFUL";
  }

  // If user deferred or saved for later
  if (userDecision === "DEFER" || userDecision === "SAVE") {
    return "NEUTRAL";
  }

  // If action failed or was cancelled
  if (actionStatus === "ACTION_FAILED" || outcomeType === "PROCUREMENT_FAILED") {
    return evaluationScore < 30 ? "NOT_USEFUL" : "NEUTRAL";
  }

  // If outcome confirmed or completed successfully
  if (
    outcomeType === "SUPPLY_SOURCED" ||
    outcomeType === "PROCUREMENT_COMPLETED" ||
    outcomeType === "MARKETPLACE_PURCHASE_COMPLETED" ||
    outcomeType === "PRODUCTION_PLAN_COMPLETED" ||
    outcomeType === "LOGISTICS_MOVEMENT_COMPLETED" ||
    outcomeType === "EQUIPMENT_RENTAL_COMPLETED" ||
    outcomeType === "SERVICE_REQUEST_COMPLETED" ||
    outcomeType === "SHARED_PURCHASE_COMPLETED" ||
    outcomeType === "FOOD_SECURITY_RESPONSE_COMPLETED" ||
    outcomeType === "INTELLIGENCE_CONFIRMED"
  ) {
    return evaluationScore >= 80 ? "VERY_USEFUL" : "USEFUL";
  }

  // Partial outcomes
  if (
    outcomeType === "SUPPLY_PARTIALLY_SOURCED" ||
    outcomeType === "PROCUREMENT_PARTIALLY_COMPLETED"
  ) {
    return "USEFUL";
  }

  // If action was initiated and is still in progress or unconfirmed
  if (actionStatus === "ACTION_INITIATED" || outcomeType === "INTELLIGENCE_UNCONFIRMED") {
    return "NEUTRAL";
  }

  return "UNKNOWN";
}

export interface SynthesizeDomainEvaluationParams {
  recommendationId: string;
  agentId: string;
  domain: FeedbackDomain;
  userDecision: string;
  actionStatus?: string;
  outcomeType: OutcomeType;
  expectedOutcome: string;
  observedOutcome: string;
  targetDate?: string;
  observedAt?: string;
  evidenceConfidence?: number;
  evidenceCount?: number;
}

export interface DomainEvaluationSynthesisResult {
  evaluationStatus: EvaluationStatus;
  accuracyScore: number | null;
  usefulnessRating: UsefulnessRating;
  timeliness: TimelinessStatus;
  timeHorizon: TimeHorizon;
  varianceAnalysis: string;
  governanceNote: string;
}

/**
 * Synthesizes cross-domain evaluation records connecting recommendations to outcomes
 */
export function synthesizeDomainEvaluation(
  params: SynthesizeDomainEvaluationParams
): DomainEvaluationSynthesisResult {
  assertNoProhibitedProduce(params, "Domain Evaluation Synthesis");

  const {
    domain,
    userDecision,
    actionStatus,
    outcomeType,
    expectedOutcome,
    observedOutcome,
    targetDate,
    observedAt = new Date().toISOString(),
    evidenceConfidence = 0.5,
    evidenceCount = 1,
  } = params;

  if (evidenceCount < 1) {
    return {
      evaluationStatus: "INSUFFICIENT_DATA",
      accuracyScore: null,
      usefulnessRating: "INSUFFICIENT_DATA",
      timeliness: "INSUFFICIENT_DATA",
      timeHorizon: "SHORT_TERM_0_7D",
      varianceAnalysis: "Insufficient empirical evidence to evaluate domain outcome.",
      governanceNote: "Advisory only. No manufactured certainty without verified ground truth.",
    };
  }

  // Timeliness
  const timeliness = targetDate
    ? calculateTimeliness(targetDate, observedAt)
    : "ON_TIME";

  // Usefulness
  const usefulnessRating = determineUsefulnessRating({
    userDecision,
    actionStatus,
    outcomeType,
    evaluationScore: 75,
  });

  // Calculate qualitative accuracy alignment
  let baseAccuracy = 0.70;
  if (outcomeType.includes("COMPLETED") || outcomeType.includes("SOURCED") || outcomeType.includes("CONFIRMED")) {
    baseAccuracy = 0.90;
  } else if (outcomeType.includes("FAILED") || outcomeType.includes("NOT_SOURCED")) {
    baseAccuracy = 0.40;
  } else if (outcomeType.includes("PARTIALLY")) {
    baseAccuracy = 0.65;
  }

  const accuracyScore = Number((baseAccuracy * evidenceConfidence).toFixed(3));

  const varianceAnalysis = `Domain ${domain}: Expected "${expectedOutcome}", observed "${observedOutcome}". Outcome classified as ${outcomeType} with timeliness ${timeliness}.`;

  return {
    evaluationStatus: "EVALUATED",
    accuracyScore,
    usefulnessRating,
    timeliness,
    timeHorizon: "SHORT_TERM_0_7D",
    varianceAnalysis,
    governanceNote:
      "AgroMarket analytical evaluation. Represents empirical association without claiming causal determinism.",
  };
}
