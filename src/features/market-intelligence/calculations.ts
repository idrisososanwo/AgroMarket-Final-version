/**
 * AgroMarket Phase 2.3: Deterministic Market Intelligence Calculations
 *
 * Implements pure, authoritative mathematical evaluations:
 * 1. Normalized price trend analysis (7d, 30d, 90d).
 * 2. Supply balance & deficit/surplus calculations.
 * 3. Demand pressure & trend classification.
 * 4. Regional price differential analysis using calibrated non-speculative language.
 * 5. Composite market pressure indexing (0-100).
 *
 * SAFETY & INTEGRITY:
 * - Anti-pork enforcement.
 * - Nigeria-first context (NGN, Nigerian states).
 * - No fabricated data. Returns INSUFFICIENT_DATA when evidence is weak.
 * - Strict unit normalization (via canonical KG/LITRE base units).
 */

import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { normalizePrice } from "@/features/prices/normalization";
import {
  CommodityPriceTrend,
  DemandAnalysisResult,
  SupplyAnalysisResult,
  RegionalPriceComparison,
  MarketPressureScore,
  MarketPressureLevel,
  TrendDirection,
} from "./types";

export interface RawPriceObservationItem {
  price: number;
  unit: string;
  normalizedPrice?: number | null;
  normalizedUnit?: string | null;
  state: string;
  observedAt: string;
  verificationStatus?: string;
}

export interface RawDemandObservationItem {
  quantity: number;
  unit: string;
  sourceType: "B2B_DEMAND" | "ORDER" | "SHARED_PURCHASE";
  state: string;
  observedAt: string;
}

export interface RawSupplyObservationItem {
  quantity: number;
  unit: string;
  sourceType: "HARVEST_OUTPUT" | "AGGREGATION_POOL" | "ACTIVE_LISTING";
  state: string;
  observedAt: string;
}

export interface RawDisruptionItem {
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  type: "SECURITY" | "LOGISTICS" | "PROCESSING";
  state: string;
  description: string;
}

// -----------------------------------------------------------------------------
// 1. PRICE TREND CALCULATION
// -----------------------------------------------------------------------------
export function calculateCommodityPriceTrend(params: {
  commodity: string;
  state?: string;
  observations: RawPriceObservationItem[];
  targetUnit?: string; // defaults to "KG"
}): CommodityPriceTrend {
  assertNoProhibitedProduce(params.commodity, "Commodity");
  const targetUnit = params.targetUnit || "KG";

  // Filter and normalize observations
  const validObservations: { price: number; observedAt: string; timestamp: number }[] = [];

  for (const obs of params.observations) {
    if (params.state && obs.state.toLowerCase() !== params.state.toLowerCase()) {
      continue;
    }

    let effectivePrice: number | null = null;

    if (obs.normalizedPrice !== undefined && obs.normalizedPrice !== null && obs.normalizedUnit === targetUnit) {
      effectivePrice = obs.normalizedPrice;
    } else {
      const norm = normalizePrice(obs.price, obs.unit);
      if (norm.status !== "UNAVAILABLE" && norm.normalizedPrice !== null && norm.normalizedUnit === targetUnit) {
        effectivePrice = norm.normalizedPrice;
      }
    }

    if (effectivePrice !== null && effectivePrice > 0) {
      validObservations.push({
        price: effectivePrice,
        observedAt: obs.observedAt,
        timestamp: new Date(obs.observedAt).getTime(),
      });
    }
  }

  // Sort descending by timestamp
  validObservations.sort((a, b) => b.timestamp - a.timestamp);

  const observationCount = validObservations.length;
  const lastObservedAt = validObservations[0]?.observedAt || null;

  if (observationCount < 2) {
    return {
      commodity: params.commodity,
      state: params.state,
      unit: targetUnit,
      currency: "NGN",
      currentPrice: validObservations[0]?.price ?? null,
      previousPrice7d: null,
      previousPrice30d: null,
      previousPrice90d: null,
      percentageChange7d: null,
      percentageChange30d: null,
      percentageChange90d: null,
      trendDirection: "INSUFFICIENT_DATA",
      observationCount,
      lastObservedAt,
      confidence: observationCount === 1 ? 0.3 : 0.0,
      isNormalized: true,
      notes: "Insufficient comparable price observations for trend computation.",
    };
  }

  const now = Date.now();
  const dayMs = 86400000;

  // Window definitions
  const currentPrices = validObservations
    .filter((o) => o.timestamp >= now - 7 * dayMs)
    .map((o) => o.price);

  const currentAvg =
    currentPrices.length > 0
      ? currentPrices.reduce((a, b) => a + b, 0) / currentPrices.length
      : validObservations[0].price;

  // Helper to compute average within a historical window
  const getWindowAvg = (startDaysAgo: number, endDaysAgo: number): number | null => {
    const startMs = now - startDaysAgo * dayMs;
    const endMs = now - endDaysAgo * dayMs;
    const inWindow = validObservations
      .filter((o) => o.timestamp >= startMs && o.timestamp < endMs)
      .map((o) => o.price);
    if (inWindow.length === 0) return null;
    return inWindow.reduce((a, b) => a + b, 0) / inWindow.length;
  };

  const prevAvg7d = getWindowAvg(14, 7);
  const prevAvg30d = getWindowAvg(60, 30);
  const prevAvg90d = getWindowAvg(180, 90);

  const calcDelta = (curr: number, prev: number | null): number | null => {
    if (prev === null || prev <= 0) return null;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  };

  const delta7d = calcDelta(currentAvg, prevAvg7d);
  const delta30d = calcDelta(currentAvg, prevAvg30d);
  const delta90d = calcDelta(currentAvg, prevAvg90d);

  // Determine trend direction primarily on 30d or 7d
  const primaryDelta = delta30d !== null ? delta30d : delta7d;
  let trendDirection: TrendDirection = "STABLE";

  if (primaryDelta === null) {
    trendDirection = "INSUFFICIENT_DATA";
  } else if (primaryDelta >= 15) {
    trendDirection = "SHARP_INCREASE";
  } else if (primaryDelta >= 5) {
    trendDirection = "MODERATE_INCREASE";
  } else if (primaryDelta <= -15) {
    trendDirection = "SHARP_DECREASE";
  } else if (primaryDelta <= -5) {
    trendDirection = "MODERATE_DECREASE";
  } else {
    trendDirection = "STABLE";
  }

  // Confidence based on count and spread
  let confidence = 0.4;
  if (observationCount >= 10) confidence = 0.9;
  else if (observationCount >= 5) confidence = 0.75;
  else if (observationCount >= 3) confidence = 0.6;

  return {
    commodity: params.commodity,
    state: params.state,
    unit: targetUnit,
    currency: "NGN",
    currentPrice: Number(currentAvg.toFixed(2)),
    previousPrice7d: prevAvg7d !== null ? Number(prevAvg7d.toFixed(2)) : null,
    previousPrice30d: prevAvg30d !== null ? Number(prevAvg30d.toFixed(2)) : null,
    previousPrice90d: prevAvg90d !== null ? Number(prevAvg90d.toFixed(2)) : null,
    percentageChange7d: delta7d,
    percentageChange30d: delta30d,
    percentageChange90d: delta90d,
    trendDirection,
    observationCount,
    lastObservedAt,
    confidence,
    isNormalized: true,
  };
}

// -----------------------------------------------------------------------------
// 2. DEMAND ANALYSIS CALCULATION
// -----------------------------------------------------------------------------
export function calculateDemandAnalysis(params: {
  commodity: string;
  state?: string;
  demandItems: RawDemandObservationItem[];
  baselineDemandIndex?: number;
}): DemandAnalysisResult {
  assertNoProhibitedProduce(params.commodity, "Commodity");

  const relevant = params.demandItems.filter(
    (d) => !params.state || d.state.toLowerCase() === params.state.toLowerCase()
  );

  let b2bDemandVolume = 0;
  let completedOrdersCount = 0;
  let sharedPurchaseDemandVolume = 0;

  for (const item of relevant) {
    if (item.sourceType === "B2B_DEMAND") {
      b2bDemandVolume += item.quantity;
    } else if (item.sourceType === "ORDER") {
      completedOrdersCount += 1;
    } else if (item.sourceType === "SHARED_PURCHASE") {
      sharedPurchaseDemandVolume += item.quantity;
    }
  }

  // Composite demand index = b2bVolume + (orders * 25kg standard basket) + sharedPurchaseVolume
  const totalDemandIndex = b2bDemandVolume + completedOrdersCount * 25 + sharedPurchaseDemandVolume;
  const baseline = params.baselineDemandIndex || 0;

  let percentageChange: number | null = null;
  if (baseline > 0) {
    percentageChange = Number((((totalDemandIndex - baseline) / baseline) * 100).toFixed(1));
  }

  let status: DemandAnalysisResult["status"] = "INSUFFICIENT_DATA";
  let demandType: DemandAnalysisResult["demandType"] = "INSUFFICIENT_DATA";

  if (relevant.length === 0) {
    status = "INSUFFICIENT_DATA";
    demandType = "INSUFFICIENT_DATA";
  } else if (percentageChange !== null) {
    if (percentageChange >= 25) {
      status = "SURGING";
      demandType = "SUSTAINED_INCREASE";
    } else if (percentageChange >= 10) {
      status = "ELEVATED";
      demandType = "STEADY";
    } else if (percentageChange <= -15) {
      status = "DECLINING";
      demandType = "WEAK";
    } else {
      status = "NORMAL";
      demandType = "STEADY";
    }
  } else {
    status = totalDemandIndex > 0 ? "NORMAL" : "INSUFFICIENT_DATA";
    demandType = totalDemandIndex > 0 ? "STEADY" : "INSUFFICIENT_DATA";
  }

  const confidence = relevant.length >= 5 ? 0.85 : relevant.length >= 2 ? 0.6 : 0.3;

  return {
    commodity: params.commodity,
    state: params.state,
    b2bDemandVolume,
    completedOrdersCount,
    sharedPurchaseDemandVolume,
    totalDemandIndex,
    baselineDemandIndex: baseline,
    percentageChange,
    status,
    demandType,
    confidence,
    observationCount: relevant.length,
    lastObservedAt: relevant[0]?.observedAt || null,
  };
}

// -----------------------------------------------------------------------------
// 3. SUPPLY ANALYSIS CALCULATION
// -----------------------------------------------------------------------------
export function calculateSupplyAnalysis(params: {
  commodity: string;
  state?: string;
  supplyItems: RawSupplyObservationItem[];
  expectedDemandQuantity?: number;
}): SupplyAnalysisResult {
  assertNoProhibitedProduce(params.commodity, "Commodity");

  const relevant = params.supplyItems.filter(
    (s) => !params.state || s.state.toLowerCase() === params.state.toLowerCase()
  );

  let activeListingsCount = 0;
  let availableHarvestQuantity = 0;
  let aggregationPoolQuantity = 0;

  for (const item of relevant) {
    if (item.sourceType === "ACTIVE_LISTING") {
      activeListingsCount += 1;
    } else if (item.sourceType === "HARVEST_OUTPUT") {
      availableHarvestQuantity += item.quantity;
    } else if (item.sourceType === "AGGREGATION_POOL") {
      aggregationPoolQuantity += item.quantity;
    }
  }

  const totalSupplyQuantity = availableHarvestQuantity + aggregationPoolQuantity;
  const demand = params.expectedDemandQuantity || 0;

  let status: SupplyAnalysisResult["status"] = "INSUFFICIENT_DATA";
  let deficitOrSurplus: number | null = null;

  if (relevant.length === 0) {
    status = "INSUFFICIENT_DATA";
  } else if (demand > 0) {
    const ratio = totalSupplyQuantity / demand;
    deficitOrSurplus = Number(((ratio - 1) * 100).toFixed(1));

    if (ratio < 0.75) {
      status = "SHORTAGE";
    } else if (ratio > 1.3) {
      status = "SURPLUS";
    } else {
      status = "BALANCED";
    }
  } else {
    status = totalSupplyQuantity > 0 ? "BALANCED" : "INSUFFICIENT_DATA";
  }

  const confidence = relevant.length >= 5 ? 0.85 : relevant.length >= 2 ? 0.6 : 0.3;

  return {
    commodity: params.commodity,
    state: params.state,
    activeListingsCount,
    availableHarvestQuantity,
    aggregationPoolQuantity,
    totalSupplyQuantity,
    unit: relevant[0]?.unit || "KG",
    status,
    estimatedDeficitOrSurplusPercent: deficitOrSurplus,
    confidence,
    observationCount: relevant.length,
    lastObservedAt: relevant[0]?.observedAt || null,
  };
}

// -----------------------------------------------------------------------------
// 4. REGIONAL PRICE COMPARISON CALCULATION
// -----------------------------------------------------------------------------
export function calculateRegionalComparison(params: {
  commodity: string;
  baseState: string;
  comparisonState: string;
  baseObservations: RawPriceObservationItem[];
  comparisonObservations: RawPriceObservationItem[];
  targetUnit?: string;
}): RegionalPriceComparison | null {
  assertNoProhibitedProduce(params.commodity, "Commodity");
  const targetUnit = params.targetUnit || "KG";

  const getAvg = (list: RawPriceObservationItem[]): { avg: number | null; count: number } => {
    const valid: number[] = [];
    for (const obs of list) {
      let p: number | null = null;
      if (obs.normalizedPrice && obs.normalizedUnit === targetUnit) {
        p = obs.normalizedPrice;
      } else {
        const norm = normalizePrice(obs.price, obs.unit);
        if (norm.status !== "UNAVAILABLE" && norm.normalizedPrice !== null && norm.normalizedUnit === targetUnit) {
          p = norm.normalizedPrice;
        }
      }
      if (p !== null && p > 0) valid.push(p);
    }
    if (valid.length === 0) return { avg: null, count: 0 };
    return { avg: valid.reduce((a, b) => a + b, 0) / valid.length, count: valid.length };
  };

  const base = getAvg(params.baseObservations);
  const comp = getAvg(params.comparisonObservations);

  if (base.avg === null || comp.avg === null) {
    return null;
  }

  const diffNGN = Number((comp.avg - base.avg).toFixed(2));
  const pctDiff = Number((((comp.avg - base.avg) / base.avg) * 100).toFixed(1));

  // Calibrated language: NEVER use "guaranteed profit" or speculative arbitrage promises
  const directionText =
    pctDiff > 0
      ? `${pctDiff}% higher in ${params.comparisonState} compared to ${params.baseState}`
      : `${Math.abs(pctDiff)}% lower in ${params.comparisonState} compared to ${params.baseState}`;

  const calibratedObservation = `Price differential observed: ${directionText}. Potential transport and handling costs must be verified before considering commercial redistribution.`;

  const minCount = Math.min(base.count, comp.count);
  const confidence = minCount >= 5 ? 0.9 : minCount >= 2 ? 0.65 : 0.4;

  return {
    commodity: params.commodity,
    baseState: params.baseState,
    comparisonState: params.comparisonState,
    basePriceNormalized: Number(base.avg.toFixed(2)),
    comparisonPriceNormalized: Number(comp.avg.toFixed(2)),
    unit: targetUnit,
    priceDifferentialNGN: diffNGN,
    percentageDifferential: pctDiff,
    calibratedObservation,
    baseObservationCount: base.count,
    comparisonObservationCount: comp.count,
    confidence,
  };
}

// -----------------------------------------------------------------------------
// 5. DETERMINISTIC MARKET PRESSURE INDEX
// -----------------------------------------------------------------------------
/**
 * Market Pressure Index Formula:
 * MarketPressure = 0.35 * PricePressure + 0.30 * SupplyPressure + 0.25 * DemandPressure + 0.10 * DisruptionPressure
 *
 * All inputs are normalized into [0.0, 100.0].
 * Levels:
 * - LOW: < 30.0
 * - MODERATE: 30.0 - 49.9
 * - ELEVATED: 50.0 - 69.9
 * - ACUTE: 70.0 - 84.9
 * - CRITICAL: >= 85.0
 */
export function calculateMarketPressure(params: {
  commodity: string;
  state: string;
  priceTrend?: CommodityPriceTrend;
  supplyAnalysis?: SupplyAnalysisResult;
  demandAnalysis?: DemandAnalysisResult;
  disruptions?: RawDisruptionItem[];
}): MarketPressureScore {
  assertNoProhibitedProduce(params.commodity, "Commodity");

  const drivers: string[] = [];
  const risks: string[] = [];

  // A. Price Pressure (0 - 100, weight: 35%)
  let pricePressure = 20.0; // Baseline stable
  if (params.priceTrend) {
    const delta = params.priceTrend.percentageChange30d ?? params.priceTrend.percentageChange7d ?? 0;
    if (delta > 25) {
      pricePressure = 90.0;
      drivers.push(`Sharply rising wholesale prices (+${delta}% vs historical baseline)`);
      risks.push("Terminal consumer price inflation and affordability resistance");
    } else if (delta > 10) {
      pricePressure = 65.0;
      drivers.push(`Moderate price appreciation (+${delta}%)`);
    } else if (delta < -15) {
      pricePressure = 10.0;
      drivers.push(`Price deflation detected (${delta}%)`);
      risks.push("Farm gate margin compression for primary producers");
    } else {
      pricePressure = 30.0;
    }
  }

  // B. Supply Pressure (0 - 100, weight: 30%)
  let supplyPressure = 30.0;
  if (params.supplyAnalysis) {
    if (params.supplyAnalysis.status === "SHORTAGE") {
      const deficit = Math.abs(params.supplyAnalysis.estimatedDeficitOrSurplusPercent || 30);
      supplyPressure = Math.min(100, 60 + deficit * 0.5);
      drivers.push(`Constrained harvest and aggregator stock levels (~${deficit}% deficit)`);
      risks.push("Immediate stockouts and procurement rationing across terminal markets");
    } else if (params.supplyAnalysis.status === "SURPLUS") {
      supplyPressure = 15.0;
      drivers.push("Ample harvest availability across local aggregation clusters");
      risks.push("Post-harvest spoilage risk if storage buffers are saturated");
    } else if (params.supplyAnalysis.status === "BALANCED") {
      supplyPressure = 35.0;
    }
  }

  // C. Demand Pressure (0 - 100, weight: 25%)
  let demandPressure = 25.0;
  if (params.demandAnalysis) {
    if (params.demandAnalysis.status === "SURGING") {
      demandPressure = 85.0;
      drivers.push("Surge in institutional B2B procurement and wholesale offtake");
    } else if (params.demandAnalysis.status === "ELEVATED") {
      demandPressure = 60.0;
      drivers.push("Firm and rising buyer orders relative to seasonal baseline");
    } else if (params.demandAnalysis.status === "DECLINING") {
      demandPressure = 15.0;
      drivers.push("Softened buyer inquiry and subdued market clearing volume");
    } else {
      demandPressure = 35.0;
    }
  }

  // D. Disruption Pressure (0 - 100, weight: 10%)
  let disruptionPressure = 10.0;
  if (params.disruptions && params.disruptions.length > 0) {
    let maxDisruption = 10;
    for (const d of params.disruptions) {
      let val = 20;
      if (d.severity === "CRITICAL") val = 95;
      else if (d.severity === "HIGH") val = 75;
      else if (d.severity === "MODERATE") val = 45;
      maxDisruption = Math.max(maxDisruption, val);
      drivers.push(`${d.type} disruption: ${d.description}`);
    }
    disruptionPressure = maxDisruption;
    risks.push("Transport delays and corridor transit bottlenecks");
  }

  // Composite Calculation
  const rawScore =
    0.35 * pricePressure +
    0.30 * supplyPressure +
    0.25 * demandPressure +
    0.10 * disruptionPressure;

  const score = Number(Math.max(0, Math.min(100, rawScore)).toFixed(1));

  let pressureLevel: MarketPressureLevel = "LOW";
  if (score >= 85) pressureLevel = "CRITICAL";
  else if (score >= 70) pressureLevel = "ACUTE";
  else if (score >= 50) pressureLevel = "ELEVATED";
  else if (score >= 30) pressureLevel = "MODERATE";
  else pressureLevel = "LOW";

  // Calculate evidence confidence
  const confidences = [
    params.priceTrend?.confidence,
    params.supplyAnalysis?.confidence,
    params.demandAnalysis?.confidence,
  ].filter((c): c is number => typeof c === "number");

  const overallConfidence =
    confidences.length > 0
      ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2))
      : 0.3;

  const evidenceCount =
    (params.priceTrend?.observationCount || 0) +
    (params.supplyAnalysis?.observationCount || 0) +
    (params.demandAnalysis?.observationCount || 0) +
    (params.disruptions?.length || 0);

  return {
    commodity: params.commodity,
    state: params.state,
    pressureScore: score,
    pressureLevel,
    pricePressure: Number(pricePressure.toFixed(1)),
    supplyPressure: Number(supplyPressure.toFixed(1)),
    demandPressure: Number(demandPressure.toFixed(1)),
    disruptionPressure: Number(disruptionPressure.toFixed(1)),
    confidence: overallConfidence,
    drivers: Array.from(new Set(drivers)),
    risks: Array.from(new Set(risks)),
    evidenceCount,
    calculatedAt: new Date().toISOString(),
  };
}
