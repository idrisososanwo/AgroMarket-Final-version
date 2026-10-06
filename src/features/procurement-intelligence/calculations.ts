/**
 * AgroMarket Phase 2.7: Procurement Intelligence & B2B Procurement Calculations
 * Deterministic Engine: Priority Scoring, Strategy Classification, Supplier
 * Diversification Analysis, Procurement Risk Assessment, and Cost Intelligence.
 *
 * Rules:
 * - Deterministic calculations remain authoritative.
 * - Score bounds are strictly [0.0, 100.0].
 * - Zero pig/pork tolerance across all parameters, commodities, and outputs.
 * - Handles data sparsity gracefully (INSUFFICIENT_DATA, UNKNOWN).
 * - Price estimations strictly require real observations; never fabricated.
 */

import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  ProcurementPriorityScore,
  ProcurementPriorityComponents,
  PriorityLevel,
  ProcurementStrategy,
  ProcurementRiskLevel,
  SupplierDiversificationAnalysis,
  ProcurementCostIntelligence,
  OpportunityStatus,
} from "./types";

// -----------------------------------------------------------------------------
// 1. DETERMINISTIC PRIORITY SCORING (0 to 100)
// -----------------------------------------------------------------------------

export interface CalculatePriorityParams {
  targetQuantity: number;
  matchedQuantity: number;
  desiredDeliveryDate?: string | null;
  demandPressureScore?: number | null; // Phase 2.5 (0 to 100)
  marketPressureScore?: number | null; // Phase 2.3 (0 to 100)
  matchScore?: number | null;          // Phase 2.6 (0 to 100)
  leadTimeDays?: number | null;
  securityDisruptionReported?: boolean;
  corridorDisruptionReported?: boolean;
  processingBottleneckDetected?: boolean;
  currentDate?: Date;
}

/**
 * Calculates deterministic procurement priority from 0 to 100
 *
 * Component allocation:
 * - Demand Urgency:           25%
 * - Supply Gap:               20%
 * - Demand Pressure:          15%
 * - Market Pressure:          15%
 * - Match Quality:            10%
 * - Lead-Time / Availability: 10%
 * - Risk / Disruption:         5%
 */
export function calculateProcurementPriority(
  params: CalculatePriorityParams
): ProcurementPriorityScore {
  const missingEvidence: string[] = [];
  const constraints: string[] = [];

  const targetQuantity = Math.max(0, params.targetQuantity || 0);
  const matchedQuantity = Math.max(0, params.matchedQuantity || 0);
  const remainingGap = Math.max(0, targetQuantity - matchedQuantity);

  // 1. Demand Urgency (max 25)
  let demandUrgency = 12; // default neutral
  if (params.desiredDeliveryDate) {
    const delivery = new Date(params.desiredDeliveryDate);
    const now = params.currentDate || new Date();
    if (!isNaN(delivery.getTime())) {
      const diffDays = Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) {
        demandUrgency = 25; // Imminent deadline
      } else if (diffDays <= 7) {
        demandUrgency = 20;
      } else if (diffDays <= 14) {
        demandUrgency = 15;
      } else if (diffDays <= 30) {
        demandUrgency = 10;
      } else {
        demandUrgency = 5;
      }
    } else {
      missingEvidence.push("Invalid desired delivery date format");
    }
  } else {
    missingEvidence.push("No explicit desired delivery date provided; using neutral urgency baseline");
  }

  // 2. Supply Gap (max 20)
  let supplyGap = 10;
  if (targetQuantity > 0) {
    const gapRatio = Math.min(1.0, remainingGap / targetQuantity);
    if (gapRatio >= 1.0) {
      supplyGap = 20; // 100% unmet
    } else if (gapRatio >= 0.75) {
      supplyGap = 16;
    } else if (gapRatio >= 0.50) {
      supplyGap = 12;
    } else if (gapRatio >= 0.25) {
      supplyGap = 8;
    } else if (gapRatio > 0.0) {
      supplyGap = 4;
    } else {
      supplyGap = 2; // Fully sourced
    }
  } else {
    supplyGap = 0;
    missingEvidence.push("Zero target quantity specified");
  }

  // 3. Demand Pressure (max 15)
  let demandPressure = 6;
  if (typeof params.demandPressureScore === "number" && !isNaN(params.demandPressureScore)) {
    const normalized = Math.max(0, Math.min(100, params.demandPressureScore));
    demandPressure = Math.round((normalized / 100) * 15 * 10) / 10;
  } else {
    missingEvidence.push("Phase 2.5 demand pressure score not available; default 6/15 assigned");
  }

  // 4. Market Pressure (max 15)
  let marketPressure = 6;
  if (typeof params.marketPressureScore === "number" && !isNaN(params.marketPressureScore)) {
    const normalized = Math.max(0, Math.min(100, params.marketPressureScore));
    marketPressure = Math.round((normalized / 100) * 15 * 10) / 10;
  } else {
    missingEvidence.push("Phase 2.3 market pressure score not available; default 6/15 assigned");
  }

  // 5. Match Quality (max 10)
  let matchQuality = 5;
  if (typeof params.matchScore === "number" && !isNaN(params.matchScore)) {
    const normalized = Math.max(0, Math.min(100, params.matchScore));
    matchQuality = Math.round((normalized / 100) * 10 * 10) / 10;
  } else {
    missingEvidence.push("Phase 2.6 match score not provided; default 5/10 assigned");
  }

  // 6. Lead-Time / Availability (max 10)
  let leadTimeAvailability = 6;
  if (typeof params.leadTimeDays === "number") {
    if (params.leadTimeDays <= 1) {
      leadTimeAvailability = 10; // In stock / ready immediately
    } else if (params.leadTimeDays <= 3) {
      leadTimeAvailability = 8;
    } else if (params.leadTimeDays <= 7) {
      leadTimeAvailability = 6;
    } else {
      leadTimeAvailability = 3;
    }
  }

  // 7. Risk / Disruption (max 5)
  let riskDisruption = 1;
  if (params.securityDisruptionReported || params.corridorDisruptionReported) {
    riskDisruption = 5;
    constraints.push("Security disruption or corridor constraint reported along transit route");
  } else if (params.processingBottleneckDetected) {
    riskDisruption = 4;
    constraints.push("Processing facility bottleneck detected upstream");
  } else {
    riskDisruption = 1;
  }

  const rawScore =
    demandUrgency +
    supplyGap +
    demandPressure +
    marketPressure +
    matchQuality +
    leadTimeAvailability +
    riskDisruption;

  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  let level: PriorityLevel = "LOW";
  if (score >= 80) level = "CRITICAL";
  else if (score >= 60) level = "HIGH";
  else if (score >= 40) level = "MEDIUM";
  else level = "LOW";

  // Confidence calculation
  const missingPenalty = missingEvidence.length * 0.12;
  const confidence = Math.max(0.2, Math.min(1.0, Math.round((1.0 - missingPenalty) * 100) / 100));

  const components: ProcurementPriorityComponents = {
    demandUrgency,
    supplyGap,
    demandPressure,
    marketPressure,
    matchQuality,
    leadTimeAvailability,
    riskDisruption,
  };

  return {
    score,
    level,
    components,
    missingEvidence,
    constraints,
    confidence,
  };
}

// -----------------------------------------------------------------------------
// 2. STRATEGY CLASSIFICATION
// -----------------------------------------------------------------------------

export interface ClassifyStrategyParams {
  commodity: string;
  targetQuantity: number;
  matchedQuantity: number;
  candidateCount: number;
  maxSingleSupplierQuantity: number;
  requiresProcessing?: boolean;
  processingFacilityAvailable?: boolean;
  isAggregatedPoolPresent?: boolean;
  alternativeRegionalSupplyAvailable?: boolean;
  upcomingHarvestForecastQuantity?: number;
}

/**
 * Deterministically classifies the optimal procurement strategy
 */
export function classifyProcurementStrategy(
  params: ClassifyStrategyParams
): ProcurementStrategy {
  assertNoProhibitedProduce(params.commodity, "Commodity");

  if (params.targetQuantity <= 0) {
    return "INSUFFICIENT_DATA";
  }

  // 1. Processing Required
  if (params.requiresProcessing) {
    return "PROCESSING_REQUIRED";
  }

  // 2. Direct Single Supplier (one supplier can satisfy >= 95% of demand)
  if (params.maxSingleSupplierQuantity >= params.targetQuantity * 0.95) {
    return "DIRECT_SUPPLIER";
  }

  // 3. Cooperative Aggregation (aggregation pool present or many micro-suppliers)
  if (params.isAggregatedPoolPresent || (params.candidateCount >= 3 && params.matchedQuantity >= params.targetQuantity * 0.6)) {
    return "AGGREGATED_PROCUREMENT";
  }

  // 4. Multi-Supplier Split
  if (params.candidateCount > 1 && params.matchedQuantity >= params.targetQuantity * 0.7) {
    return "MULTI_SUPPLIER";
  }

  // 5. Regional Alternative (local supply < 30%, but neighboring corridor has supply)
  if (params.matchedQuantity < params.targetQuantity * 0.3 && params.alternativeRegionalSupplyAvailable) {
    return "REGIONAL_ALTERNATIVE";
  }

  // 6. Wait & Monitor (upcoming harvest forecast can cover the shortfall)
  if (
    params.matchedQuantity < params.targetQuantity * 0.4 &&
    (params.upcomingHarvestForecastQuantity || 0) >= params.targetQuantity * 0.5
  ) {
    return "WAIT_AND_MONITOR";
  }

  // 7. Partial Multi-Supplier if some candidates exist
  if (params.candidateCount > 0 && params.matchedQuantity > 0) {
    return "MULTI_SUPPLIER";
  }

  // 8. If nothing matched and no forecast/alternatives
  return "INSUFFICIENT_DATA";
}

// -----------------------------------------------------------------------------
// 3. SUPPLIER DIVERSIFICATION & CONCENTRATION ANALYSIS
// -----------------------------------------------------------------------------

export interface SupplierCandidateAllocation {
  supplierId: string;
  supplierName: string;
  allocatedQuantity: number;
}

export function analyzeSupplierDiversification(
  allocations: SupplierCandidateAllocation[]
): SupplierDiversificationAnalysis {
  const notes: string[] = [];
  const supplierCount = allocations.length;
  const totalMatchedQuantity = allocations.reduce((sum, a) => sum + (a.allocatedQuantity || 0), 0);

  if (supplierCount === 0 || totalMatchedQuantity <= 0) {
    return {
      totalMatchedQuantity: 0,
      supplierCount: 0,
      largestSupplierQuantity: 0,
      concentrationRatio: 0,
      concentrationDetected: false,
      notes: ["No supplier allocations available for diversification evaluation."],
    };
  }

  let largestSupplierQuantity = 0;
  for (const alloc of allocations) {
    if (alloc.allocatedQuantity > largestSupplierQuantity) {
      largestSupplierQuantity = alloc.allocatedQuantity;
    }
  }

  const concentrationRatio = Math.round((largestSupplierQuantity / totalMatchedQuantity) * 1000) / 10;
  const concentrationDetected = concentrationRatio >= 80 && supplierCount > 1;

  if (concentrationDetected) {
    notes.push(
      `SUPPLY_CONCENTRATION_RISK: Dominant supplier represents ${concentrationRatio}% of matched allocation. Review secondary verified suppliers to prevent single-point fulfillment disruption.`
    );
  } else if (supplierCount === 1) {
    notes.push("Single source procurement. Sole supplier dependency exists.");
  } else {
    notes.push(`Healthy allocation spread across ${supplierCount} suppliers (highest supplier: ${concentrationRatio}%).`);
  }

  return {
    totalMatchedQuantity,
    supplierCount,
    largestSupplierQuantity,
    concentrationRatio,
    concentrationDetected,
    notes,
  };
}

// -----------------------------------------------------------------------------
// 4. PROCUREMENT RISK ASSESSMENT
// -----------------------------------------------------------------------------

export interface AssessProcurementRiskParams {
  commodity: string;
  targetQuantity: number;
  matchedQuantity: number;
  concentrationDetected: boolean;
  securityDisruptionReported: boolean;
  corridorDisruptionReported: boolean;
  processingBottleneckDetected: boolean;
  marketPressureLevel?: string | null;
  demandVolatilityLevel?: string | null;
  confidence: number;
}

export function assessProcurementRisk(
  params: AssessProcurementRiskParams
): {
  riskLevel: ProcurementRiskLevel;
  riskScore: number;
  riskFactors: string[];
  notes: string[];
} {
  assertNoProhibitedProduce(params.commodity, "Commodity");

  const riskFactors: string[] = [];
  const notes: string[] = [];
  let riskScore = 15; // baseline

  // 1. Supply Gap Risk
  if (params.targetQuantity > 0) {
    const gapRatio = Math.max(0, params.targetQuantity - params.matchedQuantity) / params.targetQuantity;
    if (gapRatio >= 0.75) {
      riskScore += 25;
      riskFactors.push("SEVERE_SUPPLY_DEFICIT");
      notes.push("Over 75% of requested commodity remains unfulfilled in active supply pools.");
    } else if (gapRatio >= 0.35) {
      riskScore += 15;
      riskFactors.push("PARTIAL_SUPPLY_DEFICIT");
      notes.push("Substantial supply gap remaining (35% to 75% unfulfilled).");
    }
  }

  // 2. Supplier Concentration Risk
  if (params.concentrationDetected) {
    riskScore += 15;
    riskFactors.push("SUPPLIER_CONCENTRATION_RISK");
    notes.push("Dominant supplier allocation increases fulfillment vulnerability.");
  }

  // 3. Security & Movement Constraints
  if (params.securityDisruptionReported) {
    riskScore += 25;
    riskFactors.push("SECURITY_DISRUPTION_REPORTED");
    notes.push("Security incidents recorded within production LGA or along primary transit corridor.");
  } else if (params.corridorDisruptionReported) {
    riskScore += 15;
    riskFactors.push("CORRIDOR_REVIEW_REQUIRED");
    notes.push("Logistics friction or checkpoint delays reported on transit route.");
  }

  // 4. Processing Bottlenecks
  if (params.processingBottleneckDetected) {
    riskScore += 15;
    riskFactors.push("PROCESSING_BOTTLENECK_DETECTED");
    notes.push("Offtake processing facility capacity is constrained or backlogged.");
  }

  // 5. Market Pressure
  if (params.marketPressureLevel === "ACUTE" || params.marketPressureLevel === "CRITICAL") {
    riskScore += 15;
    riskFactors.push("ACUTE_MARKET_PRICE_PRESSURE");
    notes.push("High price inflation and supply squeeze observed in local commodity markets.");
  }

  // 6. Low Confidence / Sparse Data
  if (params.confidence < 0.4) {
    riskScore += 10;
    riskFactors.push("LOW_CONFIDENCE_DATA");
    notes.push("Sparse historical observations elevate operational uncertainty.");
  }

  const finalScore = Math.max(0, Math.min(100, riskScore));

  let riskLevel: ProcurementRiskLevel = "LOW";
  if (finalScore >= 75) {
    riskLevel = "CRITICAL";
  } else if (finalScore >= 50) {
    riskLevel = "HIGH";
  } else if (finalScore >= 25) {
    riskLevel = "MEDIUM";
  } else {
    riskLevel = "LOW";
  }

  if (params.confidence <= 0.25 && riskFactors.length === 0) {
    riskLevel = "UNKNOWN";
  }

  return {
    riskLevel,
    riskScore: finalScore,
    riskFactors,
    notes,
  };
}

// -----------------------------------------------------------------------------
// 5. PROCUREMENT COST INTELLIGENCE
// -----------------------------------------------------------------------------

export interface RawPriceObservation {
  pricePerUnit: number;
  observedAt: string;
}

export interface CalculateCostIntelligenceParams {
  commodity: string;
  state: string;
  unit: string;
  targetQuantity: number;
  observations: RawPriceObservation[];
  marketPressure?: string | null;
  currentDate?: Date;
}

export function calculateCostIntelligence(
  params: CalculateCostIntelligenceParams
): ProcurementCostIntelligence {
  assertNoProhibitedProduce(params.commodity, "Commodity");

  const notes: string[] = [];
  const validObservations = params.observations.filter(
    (o) => typeof o.pricePerUnit === "number" && o.pricePerUnit > 0
  );

  if (validObservations.length === 0) {
    notes.push(
      "No real price observations found in target region. Estimated procurement cost withheld to prevent hallucination."
    );
    return {
      commodity: params.commodity,
      state: params.state,
      unit: params.unit,
      observedPriceMin: null,
      observedPriceMax: null,
      observedPriceMedian: null,
      priceTrend: "INSUFFICIENT_DATA",
      marketPressure: (params.marketPressure as "LOW" | "MODERATE" | "ELEVATED" | "ACUTE") || "INSUFFICIENT_DATA",
      recencyDays: null,
      observationCount: 0,
      estimatedProcurementCost: null,
      confidence: 0.2,
      notes,
    };
  }

  const prices = validObservations.map((o) => o.pricePerUnit).sort((a, b) => a - b);
  const observedPriceMin = prices[0];
  const observedPriceMax = prices[prices.length - 1];

  // Median calculation
  const mid = Math.floor(prices.length / 2);
  const observedPriceMedian =
    prices.length % 2 !== 0 ? prices[mid] : Math.round(((prices[mid - 1] + prices[mid]) / 2) * 100) / 100;

  // Trend detection if multiple observations exist
  let priceTrend: "INCREASING" | "DECREASING" | "STABLE" | "INSUFFICIENT_DATA" = "STABLE";
  if (validObservations.length >= 2) {
    const sortedByDate = [...validObservations].sort(
      (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
    );
    const firstPrice = sortedByDate[0].pricePerUnit;
    const lastPrice = sortedByDate[sortedByDate.length - 1].pricePerUnit;
    const pctChange = ((lastPrice - firstPrice) / firstPrice) * 100;

    if (pctChange >= 7) priceTrend = "INCREASING";
    else if (pctChange <= -7) priceTrend = "DECREASING";
    else priceTrend = "STABLE";
  }

  // Recency
  const now = params.currentDate || new Date();
  const latestDate = new Date(
    Math.max(...validObservations.map((o) => new Date(o.observedAt).getTime()))
  );
  const recencyDays = Math.max(0, Math.ceil((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Estimated procurement cost based strictly on real observed median price
  const estimatedProcurementCost =
    params.targetQuantity > 0 ? Math.round(params.targetQuantity * observedPriceMedian * 100) / 100 : null;

  notes.push(
    `Observed price range across ${validObservations.length} platform observations: ₦${observedPriceMin.toLocaleString()} - ₦${observedPriceMax.toLocaleString()} / ${params.unit}.`
  );
  if (estimatedProcurementCost !== null) {
    notes.push(
      `Deterministic estimate based on real observed median price (₦${observedPriceMedian.toLocaleString()} / ${params.unit}). Not an authoritative quote or price guarantee.`
    );
  }

  const confidence = Math.min(1.0, 0.4 + validObservations.length * 0.1);

  return {
    commodity: params.commodity,
    state: params.state,
    unit: params.unit,
    observedPriceMin,
    observedPriceMax,
    observedPriceMedian,
    priceTrend,
    marketPressure: (params.marketPressure as "LOW" | "MODERATE" | "ELEVATED" | "ACUTE") || "MODERATE",
    recencyDays,
    observationCount: validObservations.length,
    estimatedProcurementCost,
    confidence,
    notes,
  };
}

// -----------------------------------------------------------------------------
// 6. OPPORTUNITY STATUS DETERMINATION
// -----------------------------------------------------------------------------

export function determineOpportunityStatus(
  targetQuantity: number,
  matchedQuantity: number,
  constraints: string[]
): OpportunityStatus {
  if (targetQuantity <= 0) return "OPEN";
  if (matchedQuantity >= targetQuantity * 0.98) return "SOURCED";
  if (constraints.some((c) => c.includes("SECURITY") || c.includes("DISRUPTION"))) {
    return "CONSTRAINED";
  }
  if (matchedQuantity > 0) return "PARTIALLY_SOURCED";
  return "OPEN";
}
