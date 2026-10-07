/**
 * AgroMarket Phase 3.6: Deterministic Forecasting Methods & Statistical Engines
 * Pure mathematical, transparent, explainable calculations for multi-horizon predictions.
 */

import {
  ForecastConfidenceLevel,
  ForecastDirection,
} from "./types";
import { HistoricalBaselineSummary } from "@/features/historical-intelligence/types";

export const MIN_FORECAST_SAMPLE_SIZE = 3;

export interface ForecastSamplePoint {
  value: number;
  observedAt: string;
  weight?: number;
}

// -----------------------------------------------------------------------------
// 1. SIMPLE MOVING AVERAGE
// -----------------------------------------------------------------------------

export function calculateMovingAverage(
  samples: ForecastSamplePoint[],
  windowSize?: number
): number | null {
  if (samples.length < MIN_FORECAST_SAMPLE_SIZE) {
    return null;
  }

  const k = windowSize ? Math.min(windowSize, samples.length) : samples.length;
  const recent = samples.slice(-k);
  const sum = recent.reduce((acc, s) => acc + s.value, 0);
  return Number((sum / recent.length).toFixed(2));
}

// -----------------------------------------------------------------------------
// 2. WEIGHTED MOVING AVERAGE (Recency-Weighted)
// -----------------------------------------------------------------------------

export function calculateWeightedMovingAverage(
  samples: ForecastSamplePoint[]
): number | null {
  if (samples.length < MIN_FORECAST_SAMPLE_SIZE) {
    return null;
  }

  // Sort chronologically ascending
  const sorted = [...samples].sort(
    (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
  );

  let totalWeight = 0;
  let weightedSum = 0;

  for (let i = 0; i < sorted.length; i++) {
    const weight = i + 1; // Linear recency weight
    weightedSum += sorted[i].value * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return Number((weightedSum / totalWeight).toFixed(2));
}

// -----------------------------------------------------------------------------
// 3. EXPONENTIALLY WEIGHTED TREND (Smoothing with Alpha)
// -----------------------------------------------------------------------------

export function calculateExponentiallyWeightedTrend(
  samples: ForecastSamplePoint[],
  alpha = 0.3
): number | null {
  if (samples.length < MIN_FORECAST_SAMPLE_SIZE) {
    return null;
  }

  const sorted = [...samples].sort(
    (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
  );

  let s = sorted[0].value;
  for (let i = 1; i < sorted.length; i++) {
    s = alpha * sorted[i].value + (1 - alpha) * s;
  }

  return Number(s.toFixed(2));
}

// -----------------------------------------------------------------------------
// 4. TREND EXTRAPOLATION (Linear Slope Projection)
// -----------------------------------------------------------------------------

export function calculateTrendExtrapolation(
  samples: ForecastSamplePoint[],
  horizonDays: number
): { projectedValue: number; dailySlope: number } | null {
  if (samples.length < MIN_FORECAST_SAMPLE_SIZE) {
    return null;
  }

  const sorted = [...samples].sort(
    (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
  );

  const t0 = new Date(sorted[0].observedAt).getTime();
  const n = sorted.length;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const day = (new Date(sorted[i].observedAt).getTime() - t0) / (24 * 60 * 60 * 1000);
    const y = sorted[i].value;
    sumX += day;
    sumY += y;
    sumXY += day * y;
    sumXX += day * day;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    const avg = sumY / n;
    return { projectedValue: Number(avg.toFixed(2)), dailySlope: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const currentDay = (new Date(sorted[n - 1].observedAt).getTime() - t0) / (24 * 60 * 60 * 1000);
  const targetDay = currentDay + horizonDays;

  const rawProjected = intercept + slope * targetDay;
  const projectedValue = Number(Math.max(0, rawProjected).toFixed(2));

  return {
    projectedValue,
    dailySlope: Number(slope.toFixed(4)),
  };
}

// -----------------------------------------------------------------------------
// 5. HISTORICAL BASELINE COMPARISON
// -----------------------------------------------------------------------------

export function calculateHistoricalBaselineForecast(
  currentValue: number,
  baseline: HistoricalBaselineSummary,
  horizonDays: number
): {
  projectedValue: number;
  expectedDelta: number;
  expectedPercentageDelta: number | null;
  direction: ForecastDirection;
} | null {
  if (baseline.sampleCount < MIN_FORECAST_SAMPLE_SIZE) {
    return null;
  }

  // Mean-reversion factor depending on horizon
  // Shorter horizons retain current momentum; longer horizons pull toward historical baseline mean
  const meanReversionWeight = Math.min(0.7, horizonDays / 90);
  const projectedValue = Number(
    (currentValue * (1 - meanReversionWeight) + baseline.mean * meanReversionWeight).toFixed(2)
  );

  const expectedDelta = Number((projectedValue - currentValue).toFixed(2));
  const expectedPercentageDelta =
    currentValue !== 0
      ? Number(((expectedDelta / currentValue) * 100).toFixed(2))
      : null;

  let direction: ForecastDirection = "STABLE";
  if (expectedPercentageDelta !== null) {
    if (expectedPercentageDelta > 5.0) direction = "INCREASING";
    else if (expectedPercentageDelta < -5.0) direction = "DECREASING";
  }

  return {
    projectedValue,
    expectedDelta,
    expectedPercentageDelta,
    direction,
  };
}

// -----------------------------------------------------------------------------
// 6. DIRECTION CLASSIFICATION
// -----------------------------------------------------------------------------

export function classifyForecastDirection(
  percentageChange: number | null,
  stdDev: number,
  mean: number
): ForecastDirection {
  if (percentageChange === null) return "UNKNOWN";

  // Volatility check: coefficient of variation > 0.35
  if (mean > 0 && stdDev / mean > 0.35) {
    return "VOLATILE";
  }

  if (percentageChange > 5.0) return "INCREASING";
  if (percentageChange < -5.0) return "DECREASING";
  return "STABLE";
}

// -----------------------------------------------------------------------------
// 7. DETERMINISTIC CONFIDENCE CALCULATION
// -----------------------------------------------------------------------------

export function calculateForecastConfidence(params: {
  sampleSize: number;
  dataCompleteness: number;
  timeCoverageDays: number;
  horizonDays: number;
  dataQualityFlags?: string[];
  coefficientOfVariation?: number;
}): { confidence: number; confidenceLevel: ForecastConfidenceLevel } {
  const {
    sampleSize,
    dataCompleteness,
    horizonDays,
    dataQualityFlags = [],
    coefficientOfVariation = 0,
  } = params;

  if (sampleSize < MIN_FORECAST_SAMPLE_SIZE) {
    return { confidence: 0.0, confidenceLevel: "INSUFFICIENT_DATA" };
  }

  let score = 0.5;

  // Sample size scaling
  if (sampleSize >= 15) score += 0.25;
  else if (sampleSize >= 8) score += 0.15;
  else if (sampleSize >= 4) score += 0.05;

  // Completeness contribution
  score += dataCompleteness * 0.15;

  // Horizon penalty (longer horizons inherently have higher analytical uncertainty)
  if (horizonDays > 30) score -= 0.15;
  else if (horizonDays > 7) score -= 0.05;

  // Quality flags penalty
  if (dataQualityFlags.length > 0) {
    score -= Math.min(0.2, dataQualityFlags.length * 0.05);
  }

  // Volatility penalty
  if (coefficientOfVariation > 0.4) {
    score -= 0.1;
  }

  const confidence = Number(Math.max(0.1, Math.min(0.95, score)).toFixed(2));

  let confidenceLevel: ForecastConfidenceLevel = "LOW";
  if (confidence >= 0.75) confidenceLevel = "HIGH";
  else if (confidence >= 0.5) confidenceLevel = "MODERATE";

  return { confidence, confidenceLevel };
}

// -----------------------------------------------------------------------------
// 8. RANGE BOUND CALCULATION
// -----------------------------------------------------------------------------

export function calculateForecastBounds(
  predictedValue: number | null,
  stdDev: number,
  zMultiplier = 1.25
): { low: number | null; high: number | null } {
  if (predictedValue === null || isNaN(predictedValue)) {
    return { low: null, high: null };
  }

  const margin = stdDev > 0 ? stdDev * zMultiplier : predictedValue * 0.1;
  const low = Number(Math.max(0, predictedValue - margin).toFixed(2));
  const high = Number((predictedValue + margin).toFixed(2));

  return { low, high };
}
