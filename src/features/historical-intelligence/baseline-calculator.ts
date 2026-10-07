/**
 * AgroMarket Phase 3.5: Deterministic Historical Baseline Calculator
 * Pure mathematical functions for empirical distribution calculations, z-scores,
 * data completeness, and statistical comparison.
 *
 * SAFETY INVARIANTS:
 * 1. ZERO FABRICATED DATA: Returns INSUFFICIENT_DATA if sample size < MIN_BASELINE_SAMPLE_SIZE.
 * 2. NO CAUSAL CLAIMS: Expresses statistical association and delta, not causal certainty.
 * 3. TRANSPARENT UNCERTAINTY: Explicitly measures standard deviation, completeness, and confidence.
 */

import {
  BaselineComparisonDirection,
  CurrentVsBaselineComparison,
  HistoricalBaselineSummary,
  HistoricalDataState,
  HistoricalTimeHorizon,
} from "./types";
import { FeedbackDomain } from "@/features/intelligence-feedback/types";

export const MIN_BASELINE_SAMPLE_SIZE = 3;

export interface SamplePoint {
  value: number;
  observedAt: string | Date;
}

export interface CalculateBaselineParams {
  metricName: string;
  domain: FeedbackDomain;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  timeHorizon: HistoricalTimeHorizon;
  expectedDaysInWindow?: number;
  samples: SamplePoint[];
  dataQualityFlags?: string[];
}

/**
 * Deterministically computes baseline summary statistics across historical sample points
 */
export function calculateHistoricalBaselineSummary(
  params: CalculateBaselineParams
): HistoricalBaselineSummary {
  const {
    metricName,
    domain,
    commodity = null,
    state = null,
    lga = null,
    timeHorizon,
    expectedDaysInWindow = 30,
    samples,
    dataQualityFlags = [],
  } = params;

  const validValues = samples
    .map((s) => s.value)
    .filter((v) => !isNaN(v) && isFinite(v));

  const sampleCount = validValues.length;

  if (sampleCount === 0) {
    return {
      metricName,
      domain,
      commodity,
      state,
      lga,
      timeHorizon,
      timeCoverageDays: 0,
      sampleCount: 0,
      dataCompletenessRatio: 0,
      baselineConfidence: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      dataQualityFlags: [...dataQualityFlags, "NO_DATA_AVAILABLE"],
      computedAt: new Date().toISOString(),
    };
  }

  // Sort values for median and percentiles
  const sorted = [...validValues].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = Number((sum / sampleCount).toFixed(2));

  // Median
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
      : sorted[mid];

  // Percentiles
  const p25Index = Math.floor(sorted.length * 0.25);
  const p75Index = Math.floor(sorted.length * 0.75);
  const p25 = sorted[p25Index];
  const p75 = sorted[p75Index];

  // Standard deviation
  const variance =
    sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sampleCount;
  const stdDev = Number(Math.sqrt(variance).toFixed(2));

  // Time coverage and completeness ratio
  const uniqueDays = new Set(
    samples.map((s) => new Date(s.observedAt).toISOString().split("T")[0])
  ).size;

  const dataCompletenessRatio = Number(
    Math.min(1.0, uniqueDays / Math.max(1, expectedDaysInWindow)).toFixed(3)
  );

  // Confidence is a function of sample count and temporal completeness
  const sampleSufficiencyFactor = Math.min(1.0, sampleCount / (MIN_BASELINE_SAMPLE_SIZE * 3));
  const baselineConfidence = Number(
    (0.4 * sampleSufficiencyFactor + 0.6 * dataCompletenessRatio).toFixed(3)
  );

  return {
    metricName,
    domain,
    commodity,
    state,
    lga,
    timeHorizon,
    timeCoverageDays: uniqueDays,
    sampleCount,
    dataCompletenessRatio,
    baselineConfidence,
    mean,
    median,
    min,
    max,
    stdDev,
    p25,
    p75,
    dataQualityFlags,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Compares a current live metric value against a historical baseline summary
 */
export function compareValueToHistoricalBaseline(
  currentValue: number,
  baseline: HistoricalBaselineSummary
): CurrentVsBaselineComparison {
  const { metricName, domain, commodity, state } = baseline;

  // Guard: If sample size is below minimum threshold
  if (baseline.sampleCount < MIN_BASELINE_SAMPLE_SIZE) {
    const dataState: HistoricalDataState =
      baseline.sampleCount === 0 ? "NO_DATA" : "INSUFFICIENT_DATA";

    return {
      metricName,
      domain,
      commodity,
      state,
      currentValue,
      baselineValue: null,
      baselineSummary: baseline,
      dataState,
      absoluteDelta: null,
      percentageDelta: null,
      zScore: null,
      direction: "UNKNOWN",
      interpretation:
        dataState === "NO_DATA"
          ? `No historical data exists for ${metricName} in this timeframe.`
          : `Insufficient historical baseline observations (sample count: ${baseline.sampleCount} < threshold ${MIN_BASELINE_SAMPLE_SIZE}) to determine deviation.`,
      confidence: baseline.baselineConfidence,
      governanceNote:
        "Baseline comparison withheld due to insufficient historical sample. AgroMarket does not fabricate historical averages.",
    };
  }

  const absoluteDelta = Number((currentValue - baseline.mean).toFixed(2));
  const denom = Math.abs(baseline.mean) > 0 ? Math.abs(baseline.mean) : 1;
  const percentageDelta = Number(((absoluteDelta / denom) * 100).toFixed(2));

  // Z-Score distance from mean
  const zScore =
    baseline.stdDev > 0 ? Number(((currentValue - baseline.mean) / baseline.stdDev).toFixed(2)) : 0;

  // Direction classification
  let direction: BaselineComparisonDirection = "NORMAL";
  if (zScore > 1.0) {
    direction = "ELEVATED";
  } else if (zScore < -1.0) {
    direction = "DEPRESSED";
  }

  // If high variance relative to mean
  if (baseline.stdDev / denom > 0.40) {
    direction = "VOLATILE";
  }

  const interpretation = `Current ${metricName} (${currentValue}) is ${
    direction === "ELEVATED"
      ? `${percentageDelta}% higher than`
      : direction === "DEPRESSED"
      ? `${Math.abs(percentageDelta)}% lower than`
      : "in line with"
  } historical mean (${baseline.mean}, z-score: ${zScore}).`;

  return {
    metricName,
    domain,
    commodity,
    state,
    currentValue,
    baselineValue: baseline.mean,
    baselineSummary: baseline,
    dataState: "EVALUATED",
    absoluteDelta,
    percentageDelta,
    zScore,
    direction,
    interpretation,
    confidence: baseline.baselineConfidence,
    governanceNote:
      "Deterministic historical baseline comparison. Represents empirical delta without claiming causal determinism.",
  };
}
