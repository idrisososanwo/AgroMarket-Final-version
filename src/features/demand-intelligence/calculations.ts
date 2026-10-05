/**
 * AgroMarket Phase 2.5: Demand Forecasting & Demand Intelligence Agent
 * Pure Deterministic Calculations & Statistical Engines
 *
 * All mathematical, aggregation, normalization, trend, volatility, concentration,
 * and pressure calculations are 100% deterministic and testable in isolation.
 */

import {
  DemandTrendResult,
  DemandTrendDirection,
  DemandTrendClassification,
  DemandPressureScore,
  DemandPressureLevel,
  DemandVolatilityResult,
  DemandConcentrationResult,
  UnmetDemandResult,
  DemandForecastResult,
} from "./types";
import { normalizeDemandQuantity, resolveCanonicalDemandUnit } from "@/features/demand/units";
import { calculateBaselineDemandForecast } from "@/features/demand/forecasting";

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Deterministically aggregates transaction quantities into a canonical unit.
 * Excludes incompatible units safely without guessing conversion factors.
 */
export function aggregateDemandVolume(
  items: Array<{ quantity: number; unit?: string }>,
  targetUnit: string
): { totalVolume: number; validCount: number; incompatibleCount: number } {
  const canonicalUnit = resolveCanonicalDemandUnit(targetUnit);
  let totalVolume = 0;
  let validCount = 0;
  let incompatibleCount = 0;

  for (const item of items) {
    if (item.unit) {
      const norm = normalizeDemandQuantity(Number(item.quantity), item.unit, canonicalUnit);
      if (norm.isCompatible && norm.normalizedQuantity !== null) {
        totalVolume += norm.normalizedQuantity;
        validCount++;
      } else {
        incompatibleCount++;
      }
    } else {
      totalVolume += Number(item.quantity);
      validCount++;
    }
  }

  return {
    totalVolume: Number(totalVolume.toFixed(2)),
    validCount,
    incompatibleCount,
  };
}

/**
 * Detects demand trend direction, percentage changes, and classifications
 * over 7d, 30d, and 90d observation windows.
 */
export function detectDemandTrend(params: {
  commodity: string;
  state: string;
  targetUnit: string;
  currentPeriodVolume30d: number;
  previousPeriodVolume30d: number;
  volume7d: number;
  volume90d: number;
  observationCount: number;
  b2bVolume30d: number;
  consumerVolume30d: number;
}): DemandTrendResult {
  const {
    commodity,
    state,
    targetUnit,
    currentPeriodVolume30d,
    previousPeriodVolume30d,
    volume7d,
    volume90d,
    observationCount,
    b2bVolume30d,
    consumerVolume30d,
  } = params;

  const canonicalUnit = resolveCanonicalDemandUnit(targetUnit);

  let percentageChange30d: number | null = null;
  if (previousPeriodVolume30d > 0) {
    percentageChange30d = Number(
      (((currentPeriodVolume30d - previousPeriodVolume30d) / previousPeriodVolume30d) * 100).toFixed(1)
    );
  } else if (currentPeriodVolume30d > 0 && previousPeriodVolume30d === 0) {
    percentageChange30d = 100.0;
  }

  let percentageChange7d: number | null = null;
  const expected7dFrom30d = currentPeriodVolume30d * (7 / 30);
  if (expected7dFrom30d > 0) {
    percentageChange7d = Number(
      (((volume7d - expected7dFrom30d) / expected7dFrom30d) * 100).toFixed(1)
    );
  }

  let direction: DemandTrendDirection = "INSUFFICIENT_DATA";
  let classification: DemandTrendClassification = "INSUFFICIENT_EVIDENCE";
  let confidence = 0.2;

  if (observationCount < 2 || (currentPeriodVolume30d === 0 && previousPeriodVolume30d === 0)) {
    direction = "INSUFFICIENT_DATA";
    classification = "INSUFFICIENT_EVIDENCE";
    confidence = 0.2;
  } else {
    // Determine direction
    const pct = percentageChange30d ?? 0;
    if (pct >= 25) {
      direction = "SHARP_INCREASE";
    } else if (pct >= 8) {
      direction = "MODERATE_INCREASE";
    } else if (pct <= -25) {
      direction = "SHARP_DECREASE";
    } else if (pct <= -8) {
      direction = "MODERATE_DECREASE";
    } else {
      direction = "STABLE";
    }

    // Determine classification
    if (direction === "STABLE") {
      classification = "STABLE";
    } else if (direction === "SHARP_DECREASE" || direction === "MODERATE_DECREASE") {
      classification = "DECLINING";
    } else {
      // It's an increase
      const totalVolume = currentPeriodVolume30d || 1;
      const b2bShare = b2bVolume30d / totalVolume;
      const consumerShare = consumerVolume30d / totalVolume;

      if (b2bShare >= 0.6) {
        classification = "B2B_DRIVEN_INCREASE";
      } else if (consumerShare >= 0.6) {
        classification = "CONSUMER_DRIVEN_INCREASE";
      } else if (volume7d >= 0.65 * currentPeriodVolume30d && observationCount <= 3) {
        classification = "ISOLATED_SPIKE";
      } else if (percentageChange7d !== null && percentageChange7d >= 40) {
        classification = "SHORT_TERM_INCREASE";
      } else {
        classification = "SUSTAINED_INCREASE";
      }
    }

    // Assess statistical confidence
    if (observationCount >= 10 && previousPeriodVolume30d > 0) {
      confidence = 0.85;
    } else if (observationCount >= 4) {
      confidence = 0.65;
    } else {
      confidence = 0.45;
    }
  }

  // Calibrated statement adhering strictly to non-speculative language
  let calibratedObservation: string;
  if (direction === "INSUFFICIENT_DATA") {
    calibratedObservation = `Insufficient historical demand transactions observed for ${commodity} in ${state} to verify a trend.`;
  } else {
    const sign = (percentageChange30d ?? 0) >= 0 ? "+" : "";
    const pctStr = percentageChange30d !== null ? ` (${sign}${percentageChange30d}%)` : "";
    calibratedObservation = `Observed demand for ${commodity} in ${state} is exhibiting ${direction.toLowerCase().replace(/_/g, " ")}${pctStr} over the 30-day observation window. Classification: ${classification.toLowerCase().replace(/_/g, " ")}.`;
  }

  return {
    commodity,
    state,
    canonicalUnit,
    currentPeriodVolume30d,
    previousPeriodVolume30d,
    volume7d,
    volume90d,
    percentageChange30d,
    percentageChange7d,
    direction,
    classification,
    observationCount,
    confidence,
    calibratedObservation,
  };
}

/**
 * Deterministic Demand Pressure Score (0 to 100)
 *
 * Formula:
 * DemandPressure = 0.35 * GrowthFactor + 0.30 * B2BVolumeFactor + 0.20 * OrderFrequencyFactor + 0.15 * UnmetDemandFactor
 *
 * Bounded strictly between 0.0 and 100.0.
 * Never represents probability of future sales.
 */
export function calculateDemandPressure(params: {
  commodity: string;
  state: string;
  growthDelta: number | null; // e.g. +20%
  b2bVolume: number;
  totalVolume: number;
  orderCount30d: number;
  unmetDeficit: number | null;
  observationCount: number;
}): DemandPressureScore {
  const {
    commodity,
    state,
    growthDelta,
    b2bVolume,
    totalVolume,
    orderCount30d,
    unmetDeficit,
    observationCount,
  } = params;

  // 1. Growth Factor: base 50, modified by growth delta (-50 to +50)
  const growthFactor = clamp(50 + (growthDelta !== null ? growthDelta * 0.8 : 0), 0, 100);

  // 2. B2B Volume Factor: intensity of bulk commercial demand
  const b2bShare = totalVolume + b2bVolume > 0 ? b2bVolume / (totalVolume + b2bVolume) : 0;
  const b2bVolumeFactor = clamp(b2bShare * 100, 0, 100);

  // 3. Order Frequency Factor: density of distinct orders in 30 days
  const orderFrequencyFactor = clamp(orderCount30d * 8, 0, 100);

  // 4. Unmet Demand Factor: pressure from demand exceeding available listings
  let unmetDemandFactor = 0;
  if (unmetDeficit !== null && unmetDeficit > 0) {
    const deficitRatio = totalVolume > 0 ? unmetDeficit / totalVolume : 1;
    unmetDemandFactor = clamp(deficitRatio * 60 + 30, 0, 100);
  }

  // Composite calculation
  const compositeScore = Number(
    (
      0.35 * growthFactor +
      0.30 * b2bVolumeFactor +
      0.20 * orderFrequencyFactor +
      0.15 * unmetDemandFactor
    ).toFixed(2)
  );

  let level: DemandPressureLevel = "LOW";
  if (compositeScore >= 85) {
    level = "CRITICAL";
  } else if (compositeScore >= 70) {
    level = "ACUTE";
  } else if (compositeScore >= 50) {
    level = "ELEVATED";
  } else if (compositeScore >= 30) {
    level = "MODERATE";
  } else {
    level = "LOW";
  }

  const drivers: string[] = [];
  const risks: string[] = [];

  if (growthDelta && growthDelta >= 15) {
    drivers.push(`30-day demand expansion of +${growthDelta.toFixed(1)}%`);
  }
  if (b2bVolume > 0) {
    drivers.push(`Active institutional B2B procurement demand (${b2bVolume.toLocaleString()} units)`);
  }
  if (orderCount30d >= 10) {
    drivers.push(`High consumer purchase frequency (${orderCount30d} orders in 30d)`);
  }
  if (unmetDeficit && unmetDeficit > 0) {
    drivers.push(`Unfulfilled buyer demand exceeding active listed supply (${unmetDeficit.toLocaleString()} units)`);
    risks.push("Unmet demand may lead to buyer churn or off-platform diversion if supply is not mobilized.");
  }
  if (orderCount30d < 3 && observationCount < 3) {
    risks.push("Sparse historical transaction density limits forecast robustness.");
  }

  const confidence = observationCount >= 8 ? 0.85 : observationCount >= 3 ? 0.65 : 0.35;

  return {
    commodity,
    state,
    score: compositeScore,
    level,
    growthFactor: Number(growthFactor.toFixed(2)),
    b2bVolumeFactor: Number(b2bVolumeFactor.toFixed(2)),
    orderFrequencyFactor: Number(orderFrequencyFactor.toFixed(2)),
    unmetDemandFactor: Number(unmetDemandFactor.toFixed(2)),
    confidence,
    drivers,
    risks,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calculates demand volatility based on variance and coefficient of variation (CV)
 * across historical observation buckets.
 */
export function calculateDemandVolatility(dailyVolumes: number[]): DemandVolatilityResult {
  if (dailyVolumes.length < 3) {
    return {
      level: "INSUFFICIENT_DATA",
      coefficientOfVariation: null,
      explanation: "Insufficient data points across the observation window to evaluate volatility.",
    };
  }

  const mean = dailyVolumes.reduce((acc, v) => acc + v, 0) / dailyVolumes.length;
  if (mean <= 0) {
    return {
      level: "LOW",
      coefficientOfVariation: 0,
      explanation: "Observed demand volume is zero or near zero, indicating minimal activity variance.",
    };
  }

  const variance =
    dailyVolumes.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / dailyVolumes.length;
  const standardDeviation = Math.sqrt(variance);
  const cv = Number((standardDeviation / mean).toFixed(3));

  let level: DemandVolatilityResult["level"] = "MODERATE";
  let explanation = "";

  if (cv < 0.35) {
    level = "LOW";
    explanation = `Demand volume exhibits consistent day-to-day stability (coefficient of variation: ${cv}).`;
  } else if (cv < 0.75) {
    level = "MODERATE";
    explanation = `Demand volume exhibits normal commercial fluctuations (coefficient of variation: ${cv}).`;
  } else {
    level = "HIGH";
    explanation = `Demand volume exhibits high volatility with pronounced periodic spikes or pauses (coefficient of variation: ${cv}).`;
  }

  return {
    level,
    coefficientOfVariation: cv,
    explanation,
  };
}

/**
 * Evaluates whether demand is excessively concentrated in a single region or buyer segment.
 */
export function evaluateDemandConcentration(params: {
  stateVolumes: Record<string, number>;
  targetState: string;
  b2bVolume: number;
  totalVolume: number;
}): DemandConcentrationResult {
  const { stateVolumes, targetState, b2bVolume, totalVolume } = params;

  if (totalVolume <= 0) {
    return {
      level: "INSUFFICIENT_DATA",
      topSegmentSharePercent: null,
      calibratedStatement: "Insufficient volume to assess demand concentration.",
    };
  }

  const targetStateVol = stateVolumes[targetState] || 0;
  const stateShare = Number(((targetStateVol / totalVolume) * 100).toFixed(1));
  const b2bShare = Number(((b2bVolume / totalVolume) * 100).toFixed(1));

  if (b2bShare >= 75) {
    return {
      level: "CONCENTRATED_B2B",
      topSegmentSharePercent: b2bShare,
      calibratedStatement: `Observed demand is heavily concentrated in commercial B2B procurement (${b2bShare}% of total recorded volume).`,
    };
  }

  if (stateShare >= 65) {
    return {
      level: "CONCENTRATED_REGIONAL",
      topSegmentSharePercent: stateShare,
      calibratedStatement: `Observed demand is regionally concentrated in ${targetState} (${stateShare}% of national platform volume).`,
    };
  }

  return {
    level: "BALANCED",
    topSegmentSharePercent: Math.max(stateShare, b2bShare),
    calibratedStatement: `Observed demand is distributed across channels and regions without extreme single-point concentration.`,
  };
}

/**
 * Detects unmet demand when confirmed demand signals (active B2B or cart intent)
 * exceed available listed inventory in the specified state.
 */
export function detectUnmetDemand(params: {
  commodity: string;
  state: string;
  activeB2BQuantity: number;
  activeCartInterestQuantity: number;
  activeSupplyQuantity: number;
  unit: string;
}): UnmetDemandResult {
  const {
    activeB2BQuantity,
    activeCartInterestQuantity,
    activeSupplyQuantity,
    unit,
  } = params;

  const totalDemandIntent = activeB2BQuantity + activeCartInterestQuantity;
  const deficit = totalDemandIntent - activeSupplyQuantity;

  if (deficit > 0 && totalDemandIntent > 0) {
    return {
      unmetDemandDetected: true,
      activeB2BQuantity,
      activeCartInterestQuantity,
      activeSupplyQuantity,
      deficitQuantity: Number(deficit.toFixed(2)),
      unit,
      calibratedNote: `Observed buyer demand (${totalDemandIntent.toLocaleString()} ${unit}) exceeds currently available listed supply (${activeSupplyQuantity.toLocaleString()} ${unit}) in ${params.state}, indicating potential supply tightness.`,
    };
  }

  return {
    unmetDemandDetected: false,
    activeB2BQuantity,
    activeCartInterestQuantity,
    activeSupplyQuantity,
    deficitQuantity: null,
    unit,
    calibratedNote: `Currently listed supply (${activeSupplyQuantity.toLocaleString()} ${unit}) is sufficient to cover observed open demand requirements.`,
  };
}

/**
 * Deterministic demand forecast bridging to existing baseline forecasting module.
 */
export function calculateDeterministicDemandForecast(params: {
  commodity: string;
  productId?: string;
  state: string;
  historicalOrders: Array<{ quantity: number; unit?: string; createdAt: string }>;
  forecastHorizonDays: number;
  dataWindowDays: number;
  volumeUnit: string;
}): DemandForecastResult {
  const {
    commodity,
    productId = "00000000-0000-0000-0000-000000000000",
    state,
    historicalOrders,
    forecastHorizonDays,
    dataWindowDays,
    volumeUnit,
  } = params;

  const baseline = calculateBaselineDemandForecast({
    productId,
    regionState: state,
    historicalOrders,
    dataWindowDays,
    forecastHorizonDays,
    volumeUnit,
  });

  let forecastDirection: DemandTrendDirection = "INSUFFICIENT_DATA";
  if (baseline.confidenceLevel !== "INSUFFICIENT_DATA") {
    // If daily average is positive and orders exist
    forecastDirection = "STABLE";
  }

  return {
    commodity,
    state,
    forecastHorizonDays,
    predictedDemandVolume: baseline.predictedDemandVolume,
    volumeUnit: baseline.metadata.canonicalUnit,
    confidenceScore: baseline.confidenceScore,
    confidenceLevel: baseline.confidenceLevel,
    forecastDirection,
    method: baseline.method,
    dailyAverageVolume: baseline.metadata.dailyAverageVolume,
    sampleOrderCount: baseline.metadata.sampleOrderCount,
    explanation: baseline.metadata.methodExplanation,
    limitations: baseline.metadata.limitationsNote,
  };
}
