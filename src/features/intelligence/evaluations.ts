/**
 * AgroMarket Phase 2.1: Deterministic Prediction Evaluation Engine
 *
 * Implements the learning loop:
 * PREDICTION / RECOMMENDATION -> EXPECTED OUTCOME -> ACTUAL OUTCOME -> ERROR / DIFFERENCE -> EVALUATION
 *
 * Computes deterministic evaluation metrics:
 * - Absolute Error (MAE)
 * - Percentage Error (MAPE)
 * - Directional Accuracy
 * - Range Compliance
 * - Bounded Evaluation Score [0.0, 1.0]
 */

import {
  IntelligencePrediction,
  IntelligenceOutcome,
  IntelligenceEvaluation,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";

export interface EvaluationInput {
  prediction: IntelligencePrediction;
  outcome: IntelligenceOutcome;
}

export function evaluatePredictionOutcome(input: EvaluationInput): IntelligenceEvaluation {
  const { prediction, outcome } = input;
  assertNoProhibitedProduce(prediction.commodity, "Prediction commodity");

  const predicted = prediction.predictedValue;
  const actual = outcome.actualValue;
  const baseline = prediction.baselineValue;

  const absoluteError = Math.round(Math.abs(actual - predicted) * 100) / 100;
  const percentageError =
    actual !== 0
      ? Math.round((Math.abs(actual - predicted) / Math.abs(actual)) * 1000) / 10
      : 0;

  // Directional accuracy check: did actual trend in the same direction relative to baseline?
  const predictedDiff = predicted - baseline;
  const actualDiff = actual - baseline;

  let directionAccurate = false;
  if (Math.abs(predictedDiff) < 1e-4) {
    directionAccurate = Math.abs(actualDiff) < 1e-4;
  } else if (predictedDiff > 0) {
    directionAccurate = actualDiff > 0;
  } else {
    directionAccurate = actualDiff < 0;
  }

  // Within range check
  let withinPredictedRange = false;
  if (prediction.predictedRangeLow != null && prediction.predictedRangeHigh != null) {
    withinPredictedRange =
      actual >= prediction.predictedRangeLow && actual <= prediction.predictedRangeHigh;
  } else {
    // Default tolerance margin: within +/- 10%
    withinPredictedRange = percentageError <= 10.0;
  }

  // Evaluation accuracy score [0.0 - 1.0]
  // 1. Accuracy component from percentage error: 100% error = 0, 0% error = 1.0
  const errorComponent = Math.max(0.0, 1.0 - Math.min(1.0, percentageError / 100));

  // 2. Directional component: 0.3 weight
  const directionComponent = directionAccurate ? 0.3 : 0.0;

  // 3. Range component: 0.2 weight
  const rangeComponent = withinPredictedRange ? 0.2 : 0.0;

  // Weighted composite score
  const rawScore = errorComponent * 0.5 + directionComponent + rangeComponent;
  const evaluationScore = Math.max(0.0, Math.min(1.0, Math.round(rawScore * 1000) / 1000));

  return {
    id: `eval-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    predictionId: prediction.id,
    outcomeId: outcome.id,
    predictedValue: predicted,
    actualValue: actual,
    absoluteError,
    percentageError,
    directionAccurate,
    withinPredictedRange,
    evaluationScore,
    evaluatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}
