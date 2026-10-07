/**
 * AgroMarket Phase 3.6: Multi-Horizon Forecasting Engine
 * Deterministic, evidence-grounded predictive engine across all agricultural domains.
 *
 * Implements:
 * HISTORICAL MEMORY -> CURRENT OBSERVATIONS -> FORECAST -> ADVISORY OUTPUT
 *
 * SAFETY INVARIANTS:
 * 1. Strict anti-pork zero-tolerance across all commodity inputs and evidence.
 * 2. Deterministic methods only: moving average, weighted trend, baseline comparison.
 * 3. Never fabricates values: returns INSUFFICIENT_DATA if sample count < 3.
 * 4. Versioning with immutability: increments version and preserves lineage.
 * 5. Domain safety boundaries (analytical indicator disclaimers for biosecurity and logistics).
 */

import {
  ForecastDomain,
  ForecastEvidence,
  ForecastGenerationOptions,
  ForecastTimeHorizon,
  MultiHorizonForecast,
} from "./types";
import {
  assertNoPrivateInformation,
  assertNoProhibitedProduce,
  forecastGenerationOptionsSchema,
  resolveHorizonDates,
} from "./validation";
import {
  calculateForecastBounds,
  calculateForecastConfidence,
  calculateHistoricalBaselineForecast,
  calculateMovingAverage,
  calculateTrendExtrapolation,
  calculateWeightedMovingAverage,
  classifyForecastDirection,
  ForecastSamplePoint,
  MIN_FORECAST_SAMPLE_SIZE,
} from "./deterministic-methods";
import { getHistoricalObservations } from "@/features/historical-intelligence/memory-layer";
import { FeedbackDomain } from "@/features/intelligence-feedback/types";

export function toFeedbackDomain(domain: ForecastDomain): FeedbackDomain {
  if (domain === "PROCUREMENT") {
    return "B2B_PROCUREMENT";
  }
  return domain as FeedbackDomain;
}

// -----------------------------------------------------------------------------
// 1. CANONICAL AGENT MAPPING
// -----------------------------------------------------------------------------

export function getCanonicalAgentForDomain(domain: ForecastDomain): string {
  switch (domain) {
    case "MARKET":
      return "MARKET_INTELLIGENCE_AGENT";
    case "DEMAND":
      return "DEMAND_FORECASTING_AGENT";
    case "SUPPLY":
      return "SUPPLY_MATCHING_AGENT";
    case "PRODUCTION":
      return "PRODUCTION_PLANNING_AGENT";
    case "LOGISTICS":
      return "LOGISTICS_INTELLIGENCE_AGENT";
    case "FOOD_SECURITY":
      return "FOOD_SECURITY_RESILIENCE_AGENT";
    case "DISEASE_BIOSECURITY":
      return "AGRICULTURAL_DISEASE_BIOSECURITY_AGENT";
    case "PROCUREMENT":
      return "PROCUREMENT_INTELLIGENCE_AGENT";
    default:
      return "AGRICULTURAL_INTELLIGENCE_ORCHESTRATION";
  }
}

// -----------------------------------------------------------------------------
// 2. CORE MULTI-HORIZON FORECAST GENERATOR
// -----------------------------------------------------------------------------

export async function generateMultiHorizonForecast(
  options: ForecastGenerationOptions
): Promise<MultiHorizonForecast> {
  // 1. Invariant & Schema Validation
  assertNoProhibitedProduce(options.commodity, "Forecast Generation");
  assertNoPrivateInformation(options, "Forecast Generation");
  forecastGenerationOptionsSchema.parse(options);

  const { startDate, endDate, targetDate, days } = resolveHorizonDates(
    options.timeHorizon,
    undefined,
    options.customHorizonDays
  );

  const agentId = options.agentId || getCanonicalAgentForDomain(options.domain);
  const now = new Date().toISOString();

  // Domain-specific governance disclaimers
  let governanceNote = "Advisory forecast only. Human decision-makers remain authoritative.";
  if (options.domain === "DISEASE_BIOSECURITY") {
    governanceNote =
      "ANALYTICAL EARLY INDICATOR ONLY. Not an official veterinary diagnosis, quarantine order, or regulatory determination.";
  } else if (options.domain === "LOGISTICS") {
    governanceNote =
      "LOGISTICS ADVISORY. Does not issue safe-passage guarantees. Physical dispatchers must verify corridor conditions independently.";
  } else if (options.domain === "FOOD_SECURITY") {
    governanceNote =
      "EARLY-WARNING INDICATOR ONLY. Not an official government food-security declaration. Human review mandatory.";
  }

  // 2. Fetch Historical Observations for Metric & Domain
  const historicalObs = await getHistoricalObservations({
    domain: toFeedbackDomain(options.domain),
    commodity: options.commodity,
    state: options.state,
    timeHorizon: options.timeHorizon === "SHORT_TERM_0_7D" ? "LAST_30_DAYS" : "LAST_90_DAYS",
    limit: 100,
  });

  const samples: ForecastSamplePoint[] = historicalObs
    .filter((o) => o.observedValue !== undefined && o.observedValue !== null)
    .map((o) => ({
      value: Number(o.observedValue),
      observedAt: o.observedAt,
    }))
    .sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());

  const sampleSize = samples.length;
  const currentValue = sampleSize > 0 ? samples[sampleSize - 1].value : null;

  // 3. Insufficient Data Governance Guard
  if (sampleSize < MIN_FORECAST_SAMPLE_SIZE || currentValue === null) {
    return {
      id: crypto.randomUUID(),
      domain: options.domain,
      metricName: options.metricName,
      commodity: options.commodity,
      category: options.category || null,
      state: options.state || "National",
      lga: options.lga || null,
      corridor: options.corridor || null,
      timeHorizon: options.timeHorizon,
      forecastPeriodDays: days,
      forecastStartDate: startDate,
      forecastEndDate: endDate,
      targetDate,

      currentValue,
      baselineValue: null,
      predictedValue: null,
      predictedRangeLow: null,
      predictedRangeHigh: null,
      expectedDelta: null,
      expectedPercentageDelta: null,

      direction: "UNKNOWN",
      confidence: 0.0,
      confidenceLevel: "INSUFFICIENT_DATA",

      sampleSize,
      dataCompleteness: Number((sampleSize / 10).toFixed(2)),
      baselineId: null,
      baselineSummary: null,
      methodName: options.method || "HISTORICAL_BASELINE_COMPARISON",
      evidence: [],

      status: "INSUFFICIENT_DATA",
      version: 1,
      previousForecastId: null,
      evaluationStatus: "NOT_EVALUABLE",
      errorMetrics: null,

      explanation: `INSUFFICIENT_DATA: Observation sample count (N = ${sampleSize}) is below minimum threshold of ${MIN_FORECAST_SAMPLE_SIZE}.`,
      limitations: "Predictive engine strictly halts when empirical observations are insufficient to avoid fabricating false signals.",
      governanceNote,
      agentId,
      createdAt: now,
      updatedAt: now,
    };
  }

  // 4. Baseline Computation
  const values = samples.map((s) => s.value);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / sampleSize;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sampleSize;
  const stdDev = Number(Math.sqrt(variance).toFixed(2));

  // Determine method based on horizon if not explicitly specified
  let selectedMethod = options.method;
  if (!selectedMethod) {
    if (options.timeHorizon === "SHORT_TERM_0_7D") {
      selectedMethod = "WEIGHTED_MOVING_AVERAGE";
    } else if (options.timeHorizon === "MEDIUM_TERM_8_30D") {
      selectedMethod = "TREND_EXTRAPOLATION";
    } else {
      selectedMethod = "HISTORICAL_BASELINE_COMPARISON";
    }
  }

  // 5. Deterministic Prediction Computation
  let predictedValue: number | null = null;
  let direction = classifyForecastDirection(null, stdDev, mean);

  if (selectedMethod === "WEIGHTED_MOVING_AVERAGE") {
    predictedValue = calculateWeightedMovingAverage(samples);
  } else if (selectedMethod === "MOVING_AVERAGE") {
    predictedValue = calculateMovingAverage(samples);
  } else if (selectedMethod === "TREND_EXTRAPOLATION") {
    const trend = calculateTrendExtrapolation(samples, days);
    predictedValue = trend?.projectedValue ?? calculateMovingAverage(samples);
  } else {
    // Baseline Comparison
    const baselineMock = {
      metricName: options.metricName,
      domain: toFeedbackDomain(options.domain),
      commodity: options.commodity,
      state: options.state,
      timeHorizon: "LAST_90_DAYS" as const,
      timeCoverageDays: 90,
      sampleCount: sampleSize,
      dataCompletenessRatio: 0.8,
      baselineConfidence: 0.8,
      mean,
      median: mean,
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev,
      dataQualityFlags: [],
      computedAt: now,
    };

    const res = calculateHistoricalBaselineForecast(currentValue, baselineMock, days);
    predictedValue = res?.projectedValue ?? mean;
    direction = res?.direction ?? "STABLE";
  }

  if (predictedValue === null) {
    predictedValue = Number(mean.toFixed(2));
  }

  // Seasonality factor adjustment if supplied
  if (options.seasonalityFactor && options.seasonalityFactor > 0) {
    predictedValue = Number((predictedValue * options.seasonalityFactor).toFixed(2));
  }

  const expectedDelta = Number((predictedValue - currentValue).toFixed(2));
  const expectedPercentageDelta =
    currentValue !== 0
      ? Number(((expectedDelta / Math.abs(currentValue)) * 100).toFixed(2))
      : null;

  direction = classifyForecastDirection(expectedPercentageDelta, stdDev, mean);

  // Range Bounds
  const { low: predictedRangeLow, high: predictedRangeHigh } = calculateForecastBounds(
    predictedValue,
    stdDev,
    options.timeHorizon === "LONG_TERM_31_90D" ? 1.5 : 1.2
  );

  // Confidence Calculation
  const completeness = Math.min(1.0, sampleSize / 15);
  const cv = mean > 0 ? stdDev / mean : 0;
  const { confidence, confidenceLevel } = calculateForecastConfidence({
    sampleSize,
    dataCompleteness: completeness,
    timeCoverageDays: days,
    horizonDays: days,
    coefficientOfVariation: cv,
  });

  // Evidence references
  const evidence: ForecastEvidence[] = historicalObs.slice(0, 5).map((obs) => ({
    sourceType: "HISTORICAL_OBSERVATION",
    sourceId: obs.id,
    description: obs.summary,
    observedAt: obs.observedAt,
    relevance: obs.confidence,
    provenance: "OBSERVED",
    metadata: { observedValue: obs.observedValue },
  }));

  return {
    id: crypto.randomUUID(),
    domain: options.domain,
    metricName: options.metricName,
    commodity: options.commodity,
    category: options.category || null,
    state: options.state || "National",
    lga: options.lga || null,
    corridor: options.corridor || null,
    timeHorizon: options.timeHorizon,
    forecastPeriodDays: days,
    forecastStartDate: startDate,
    forecastEndDate: endDate,
    targetDate,

    currentValue,
    baselineValue: Number(mean.toFixed(2)),
    predictedValue,
    predictedRangeLow,
    predictedRangeHigh,
    expectedDelta,
    expectedPercentageDelta,

    direction,
    confidence,
    confidenceLevel,

    sampleSize,
    dataCompleteness: completeness,
    baselineId: null,
    baselineSummary: null,
    methodName: selectedMethod,
    evidence,

    status: "ACTIVE",
    version: 1,
    previousForecastId: null,
    evaluationStatus: "PENDING",
    errorMetrics: null,

    explanation: `Deterministic ${options.timeHorizon} forecast computed using ${selectedMethod}. Expected trajectory is ${direction} (${
      expectedPercentageDelta !== null ? `${expectedPercentageDelta > 0 ? "+" : ""}${expectedPercentageDelta}%` : "N/A"
    }) relative to current ${currentValue}.`,
    limitations: `Subject to regional variability. Confidence calibrated at ${confidenceLevel} based on ${sampleSize} empirical sample point(s).`,
    governanceNote,
    agentId,
    createdAt: now,
    updatedAt: now,
  };
}

// -----------------------------------------------------------------------------
// 3. FORECAST VERSIONING (Immutability Preservation)
// -----------------------------------------------------------------------------

export async function createForecastVersion(
  previousForecast: MultiHorizonForecast,
  newOptions?: Partial<ForecastGenerationOptions>
): Promise<MultiHorizonForecast> {
  const mergedOptions: ForecastGenerationOptions = {
    domain: previousForecast.domain,
    metricName: previousForecast.metricName,
    commodity: previousForecast.commodity,
    category: previousForecast.category || undefined,
    state: previousForecast.state,
    lga: previousForecast.lga || undefined,
    corridor: previousForecast.corridor || undefined,
    timeHorizon: previousForecast.timeHorizon,
    method: previousForecast.methodName,
    agentId: previousForecast.agentId,
    ...newOptions,
  };

  const newForecast = await generateMultiHorizonForecast(mergedOptions);

  return {
    ...newForecast,
    version: previousForecast.version + 1,
    previousForecastId: previousForecast.id,
  };
}

// -----------------------------------------------------------------------------
// 4. DOMAIN-SPECIFIC PREDICTIVE HELPERS
// -----------------------------------------------------------------------------

export async function generateMarketForecast(
  commodity: string,
  state?: string,
  timeHorizon: ForecastTimeHorizon = "SHORT_TERM_0_7D"
): Promise<MultiHorizonForecast> {
  assertNoProhibitedProduce(commodity, "Market Forecast");
  return generateMultiHorizonForecast({
    domain: "MARKET",
    metricName: "MARKET_PRICE",
    commodity,
    state: state || "National",
    timeHorizon,
  });
}

export async function generateDemandForecast(
  commodity: string,
  state?: string,
  timeHorizon: ForecastTimeHorizon = "MEDIUM_TERM_8_30D"
): Promise<MultiHorizonForecast> {
  assertNoProhibitedProduce(commodity, "Demand Forecast");
  return generateMultiHorizonForecast({
    domain: "DEMAND",
    metricName: "DEMAND_VOLUME_INDEX",
    commodity,
    state: state || "National",
    timeHorizon,
  });
}

export async function generateSupplyForecast(
  commodity: string,
  state?: string,
  timeHorizon: ForecastTimeHorizon = "MEDIUM_TERM_8_30D"
): Promise<MultiHorizonForecast> {
  assertNoProhibitedProduce(commodity, "Supply Forecast");
  return generateMultiHorizonForecast({
    domain: "SUPPLY",
    metricName: "SUPPLY_VOLUME_INDEX",
    commodity,
    state: state || "National",
    timeHorizon,
  });
}

export async function generateProductionOutlook(
  commodity: string,
  state?: string,
  timeHorizon: ForecastTimeHorizon = "LONG_TERM_31_90D"
): Promise<MultiHorizonForecast> {
  assertNoProhibitedProduce(commodity, "Production Outlook");
  return generateMultiHorizonForecast({
    domain: "PRODUCTION",
    metricName: "PRODUCTION_YIELD_OUTLOOK",
    commodity,
    state: state || "National",
    timeHorizon,
  });
}

export async function generateLogisticsForecast(
  corridorOrState: string,
  timeHorizon: ForecastTimeHorizon = "SHORT_TERM_0_7D"
): Promise<MultiHorizonForecast> {
  return generateMultiHorizonForecast({
    domain: "LOGISTICS",
    metricName: "CORRIDOR_DELAY_HOURS",
    commodity: "General Freight",
    state: corridorOrState,
    timeHorizon,
  });
}

export async function generateFoodSecurityForecast(
  state: string,
  timeHorizon: ForecastTimeHorizon = "LONG_TERM_31_90D"
): Promise<MultiHorizonForecast> {
  return generateMultiHorizonForecast({
    domain: "FOOD_SECURITY",
    metricName: "REGIONAL_VULNERABILITY_INDEX",
    commodity: "Staple Food Basket",
    state,
    timeHorizon,
  });
}

export async function generateDiseaseRiskForecast(
  commodity: string,
  state: string,
  timeHorizon: ForecastTimeHorizon = "SHORT_TERM_0_7D"
): Promise<MultiHorizonForecast> {
  assertNoProhibitedProduce(commodity, "Disease Risk Forecast");
  return generateMultiHorizonForecast({
    domain: "DISEASE_BIOSECURITY",
    metricName: "DISEASE_RISK_INDEX",
    commodity,
    state,
    timeHorizon,
  });
}
