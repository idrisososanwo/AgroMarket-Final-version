/**
 * AgroMarket Phase 3.6: Forecast Evaluation Engine
 * Deterministic error calculation and feedback loop integration with Phase 3.4.
 *
 * Evaluates:
 * - Absolute error
 * - Percentage error (with divide-by-zero protection)
 * - Directional alignment
 * - Range compliance
 * - Timeliness and evaluation score
 */

import {
  ForecastErrorMetrics,
  ForecastEvaluationResult,
  MultiHorizonForecast,
} from "./types";

export function evaluateForecast(
  forecast: MultiHorizonForecast,
  actualValue: number,
  outcomeId?: string
): ForecastEvaluationResult {
  const evaluatedAt = new Date().toISOString();

  // If forecast had insufficient data or no predicted value
  if (
    forecast.status === "INSUFFICIENT_DATA" ||
    forecast.predictedValue === null ||
    isNaN(actualValue)
  ) {
    return {
      forecastId: forecast.id,
      outcomeId,
      status: "NOT_EVALUABLE",
      actualValue: isNaN(actualValue) ? null : actualValue,
      predictedValue: forecast.predictedValue,
      errorMetrics: null,
      varianceAnalysis: "Forecast could not be evaluated due to missing predicted or observed value.",
      evaluationNotes: "INSUFFICIENT_DATA or non-numeric observation.",
      learningSignalSuggested: false,
      evaluatedAt,
    };
  }

  const pred = forecast.predictedValue;
  const absError = Number(Math.abs(pred - actualValue).toFixed(2));

  // Percentage error with divide-by-zero guard
  let pctError: number | null = null;
  if (actualValue !== 0) {
    pctError = Number(((absError / Math.abs(actualValue)) * 100).toFixed(2));
  }

  // Directional check: did actual value move in predicted direction from baseline/current?
  const reference = forecast.currentValue ?? forecast.baselineValue ?? pred;
  const actualDelta = actualValue - reference;
  let actualDirection = "STABLE";
  if (reference !== 0) {
    const actualPctChange = (actualDelta / Math.abs(reference)) * 100;
    if (actualPctChange > 5.0) actualDirection = "INCREASING";
    else if (actualPctChange < -5.0) actualDirection = "DECREASING";
  }

  const directionAccurate =
    forecast.direction === "STABLE"
      ? actualDirection === "STABLE"
      : forecast.direction === actualDirection;

  // Range compliance check
  const withinRange =
    forecast.predictedRangeLow !== null && forecast.predictedRangeHigh !== null
      ? actualValue >= forecast.predictedRangeLow && actualValue <= forecast.predictedRangeHigh
      : absError <= (forecast.predictedValue * 0.15); // Fallback to 15% tolerance

  // Evaluation score (0.0 to 1.0)
  // 40% directional accuracy + 30% range compliance + 30% error boundedness
  let score = 0;
  if (directionAccurate) score += 0.4;
  if (withinRange) score += 0.3;

  if (pctError !== null) {
    if (pctError <= 10.0) score += 0.3;
    else if (pctError <= 25.0) score += 0.15;
  } else {
    // If actual was 0, evaluate based on absolute deviation
    if (absError <= 5.0) score += 0.3;
  }

  const evaluationScore = Number(score.toFixed(2));

  const errorMetrics: ForecastErrorMetrics = {
    actualValue,
    absoluteError: absError,
    percentageError: pctError,
    directionAccurate,
    withinRange,
    evaluationScore,
    evaluatedAt,
  };

  const varianceAnalysis = `Predicted: ${pred}, Actual: ${actualValue}. Absolute Error: ${absError}${
    pctError !== null ? ` (${pctError}%)` : ""
  }. Direction: ${directionAccurate ? "MATCHED" : "MISMATCHED"} (${forecast.direction} vs observed ${actualDirection}). Range: ${
    withinRange ? "COMPLIANT" : "OUT_OF_BOUNDS"
  }.`;

  const learningSignalSuggested = evaluationScore < 0.6 || !directionAccurate;

  return {
    forecastId: forecast.id,
    outcomeId,
    status: "EVALUATED",
    actualValue,
    predictedValue: pred,
    errorMetrics,
    varianceAnalysis,
    evaluationNotes: learningSignalSuggested
      ? "Underperformed evaluation benchmark; learning signal recommended to calibrate baseline/weights."
      : "Met predictive precision criteria within tolerance window.",
    learningSignalSuggested,
    evaluatedAt,
  };
}
