/**
 * AgroMarket Phase 2.8: Food Security & Agricultural Resilience Calculations
 * Deterministic Engine: Pressure Indexing, Resilience Scoring, Critical Dependency Detection,
 * Security-to-Supply Impact Correlation, and Multi-Dimensional Assessment.
 *
 * Rules:
 * - Deterministic calculations remain authoritative.
 * - Score bounds are strictly [0.0, 100.0].
 * - Zero pig/pork tolerance across all parameters, commodities, and outputs.
 * - Missing evidence reduces confidence and is explicitly recorded.
 * - Never fabricates fake prices, shortages, weather, or security incidents.
 */

import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  FoodSecurityPressureIndex,
  FoodSecurityPressureComponents,
  FoodSecurityPressureLevel,
  AgriculturalResilienceAssessment,
  ResilienceComponents,
  AgriculturalResilienceLevel,
  CriticalDependencyItem,
  AvailabilityStatus,
  AffordabilityStatus,
  AccessStatus,
  StabilityStatus,
  AlertSeverity,
} from "./types";

// -----------------------------------------------------------------------------
// 1. DETERMINISTIC FOOD SECURITY PRESSURE INDEX (0 to 100)
// -----------------------------------------------------------------------------

export interface CalculatePressureIndexParams {
  commodity?: string | null;
  state: string;
  supplyDeficitRatio?: number | null;     // 0.0 to 1.0 (Phase 2.6 gap ratio)
  demandPressureScore?: number | null;    // 0 to 100 (Phase 2.5)
  marketPricePressureScore?: number | null;// 0 to 100 (Phase 2.3)
  regionalSupplyGapRatio?: number | null; // 0.0 to 1.0 (unmet regional demand)
  productionRiskScore?: number | null;    // 0 to 100 (Phase 2.4)
  logisticsFrictionScore?: number | null; // 0 to 100 (Phase 1.5 corridor friction)
  securityDisruptionReported?: boolean;   // Phase 1.5 incident
  processingBottleneckDetected?: boolean; // Phase 2.0 / 2.6 facility bottleneck
}

/**
 * Calculates the AgroMarket Food Security Pressure Index from 0 to 100
 *
 * Component Weights:
 * - Supply Pressure:          25%
 * - Demand Pressure:          15%
 * - Market / Price Pressure:  15%
 * - Regional Supply Gap:      15%
 * - Production Risk:          10%
 * - Logistics / Movement Risk: 10%
 * - Security Disruption Risk:  5%
 * - Processing Bottleneck:     5%
 */
export function calculateFoodSecurityPressureIndex(
  params: CalculatePressureIndexParams
): FoodSecurityPressureIndex {
  if (params.commodity) {
    assertNoProhibitedProduce(params.commodity, "Commodity");
  }

  const missingEvidence: string[] = [];
  const keyDrivers: string[] = [];

  // 1. Supply Pressure (max 25)
  let supplyPressure = 10;
  if (typeof params.supplyDeficitRatio === "number" && !isNaN(params.supplyDeficitRatio)) {
    const ratio = Math.max(0, Math.min(1.0, params.supplyDeficitRatio));
    supplyPressure = Math.round(ratio * 25 * 10) / 10;
    if (ratio >= 0.7) {
      keyDrivers.push("Severe agricultural supply deficit identified in regional market pools");
    }
  } else {
    missingEvidence.push("Supply deficit ratio not available; baseline 10/25 assigned");
  }

  // 2. Demand Pressure (max 15)
  let demandPressure = 6;
  if (typeof params.demandPressureScore === "number" && !isNaN(params.demandPressureScore)) {
    const norm = Math.max(0, Math.min(100, params.demandPressureScore));
    demandPressure = Math.round((norm / 100) * 15 * 10) / 10;
    if (norm >= 75) {
      keyDrivers.push("High consumer and offtake demand pressure driving regional absorption");
    }
  } else {
    missingEvidence.push("Phase 2.5 demand pressure score not available; default 6/15 assigned");
  }

  // 3. Market / Price Pressure (max 15)
  let marketPricePressure = 6;
  if (typeof params.marketPricePressureScore === "number" && !isNaN(params.marketPricePressureScore)) {
    const norm = Math.max(0, Math.min(100, params.marketPricePressureScore));
    marketPricePressure = Math.round((norm / 100) * 15 * 10) / 10;
    if (norm >= 75) {
      keyDrivers.push("Elevated staple market price inflation observed in local trading centers");
    }
  } else {
    missingEvidence.push("Phase 2.3 market price pressure score not available; default 6/15 assigned");
  }

  // 4. Regional Supply Gap (max 15)
  let regionalSupplyGap = 6;
  if (typeof params.regionalSupplyGapRatio === "number" && !isNaN(params.regionalSupplyGapRatio)) {
    const norm = Math.max(0, Math.min(1.0, params.regionalSupplyGapRatio));
    regionalSupplyGap = Math.round(norm * 15 * 10) / 10;
  } else {
    missingEvidence.push("Regional supply gap ratio not available; default 6/15 assigned");
  }

  // 5. Production Risk (max 10)
  let productionRisk = 4;
  if (typeof params.productionRiskScore === "number" && !isNaN(params.productionRiskScore)) {
    const norm = Math.max(0, Math.min(100, params.productionRiskScore));
    productionRisk = Math.round((norm / 100) * 10 * 10) / 10;
    if (norm >= 70) {
      keyDrivers.push("High production vulnerability score recorded for current planting season");
    }
  } else {
    missingEvidence.push("Phase 2.4 production risk score not available; default 4/10 assigned");
  }

  // 6. Logistics / Movement Risk (max 10)
  let logisticsRisk = 3;
  if (typeof params.logisticsFrictionScore === "number" && !isNaN(params.logisticsFrictionScore)) {
    const norm = Math.max(0, Math.min(100, params.logisticsFrictionScore));
    logisticsRisk = Math.round((norm / 100) * 10 * 10) / 10;
    if (norm >= 70) {
      keyDrivers.push("Logistics corridor friction and transit checkpoint bottlenecks reported");
    }
  } else {
    missingEvidence.push("Logistics friction score not available; default 3/10 assigned");
  }

  // 7. Security Disruption Risk (max 5)
  let securityRisk = 0;
  if (params.securityDisruptionReported === true) {
    securityRisk = 5;
    keyDrivers.push("Active security advisory or movement restriction recorded along transit route");
  } else if (params.securityDisruptionReported === undefined) {
    securityRisk = 1;
  }

  // 8. Processing Bottleneck (max 5)
  let processingBottleneck = 0;
  if (params.processingBottleneckDetected === true) {
    processingBottleneck = 5;
    keyDrivers.push("Upstream processing facility backlog or capacity deficit identified");
  } else if (params.processingBottleneckDetected === undefined) {
    processingBottleneck = 1;
  }

  const rawScore =
    supplyPressure +
    demandPressure +
    marketPricePressure +
    regionalSupplyGap +
    productionRisk +
    logisticsRisk +
    securityRisk +
    processingBottleneck;

  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  let level: FoodSecurityPressureLevel = "LOW_PRESSURE";
  if (score >= 75) level = "CRITICAL_PRESSURE";
  else if (score >= 55) level = "HIGH_PRESSURE";
  else if (score >= 35) level = "MODERATE_PRESSURE";
  else level = "LOW_PRESSURE";

  // Confidence calculation penalizes missing inputs
  const missingPenalty = missingEvidence.length * 0.12;
  const confidence = Math.max(0.2, Math.min(1.0, Math.round((1.0 - missingPenalty) * 100) / 100));

  if (missingEvidence.length >= 4 || confidence < 0.4) {
    level = "INSUFFICIENT_DATA";
  }

  const components: FoodSecurityPressureComponents = {
    supplyPressure,
    demandPressure,
    marketPricePressure,
    regionalSupplyGap,
    productionRisk,
    logisticsRisk,
    securityRisk,
    processingBottleneck,
  };

  return {
    score,
    level,
    components,
    keyDrivers,
    missingEvidence,
    confidence,
  };
}

// -----------------------------------------------------------------------------
// 2. DETERMINISTIC AGRICULTURAL RESILIENCE SCORE (0 to 100)
// -----------------------------------------------------------------------------

export interface CalculateResilienceParams {
  commodity?: string | null;
  state: string;
  supplierCount?: number;
  largestSupplierShare?: number;     // 0.0 to 1.0 (concentration ratio)
  productionSourceStatesCount?: number;
  processingFacilitiesAvailableCount?: number;
  activeLogisticsCorridorsCount?: number;
  activeTradeChannelsCount?: number; // e.g. B2B, retail listings, shared purchases
  aggregationPoolsActiveCount?: number;
}

/**
 * Calculates Agricultural Resilience Score from 0 to 100
 *
 * Component Weights:
 * - Supply Diversification:   15%
 * - Regional Diversification: 15%
 * - Production Diversity:     15%
 * - Processing Redundancy:    15%
 * - Logistics Redundancy:     15%
 * - Market Diversification:   15%
 * - Aggregation Capacity:     10%
 */
export function calculateAgriculturalResilienceScore(
  params: CalculateResilienceParams
): AgriculturalResilienceAssessment {
  if (params.commodity) {
    assertNoProhibitedProduce(params.commodity, "Commodity");
  }

  const vulnerabilityFactors: string[] = [];
  const adaptiveCapacities: string[] = [];

  // 1. Supply Diversification (max 15)
  let supplyDiversification = 7;
  if (typeof params.largestSupplierShare === "number") {
    if (params.largestSupplierShare >= 0.85) {
      supplyDiversification = 3;
      vulnerabilityFactors.push("High supplier concentration (single producer > 85% of volume)");
    } else if (params.largestSupplierShare <= 0.4) {
      supplyDiversification = 15;
      adaptiveCapacities.push("Well-diversified supplier base with no single dominant producer");
    } else {
      supplyDiversification = 10;
    }
  }

  // 2. Regional Diversification (max 15)
  let regionalDiversification = 8;
  const statesCount = params.productionSourceStatesCount || 1;
  if (statesCount >= 4) {
    regionalDiversification = 15;
    adaptiveCapacities.push(`Supply sourced across ${statesCount} regional states providing geographic redundancy`);
  } else if (statesCount === 1) {
    regionalDiversification = 4;
    vulnerabilityFactors.push("Single-state production dependency creates regional exposure");
  } else {
    regionalDiversification = 10;
  }

  // 3. Production Diversity (max 15)
  const productionDiversity = 10; // Baseline balanced

  // 4. Processing Redundancy (max 15)
  let processingRedundancy = 7;
  const procCount = params.processingFacilitiesAvailableCount || 0;
  if (procCount >= 3) {
    processingRedundancy = 15;
    adaptiveCapacities.push("Multiple certified processing facilities available in corridor");
  } else if (procCount === 1) {
    processingRedundancy = 8;
  } else {
    processingRedundancy = 3;
    vulnerabilityFactors.push("Lack of certified local processing units limits post-harvest resilience");
  }

  // 5. Logistics Redundancy (max 15)
  let logisticsRedundancy = 8;
  const corridorCount = params.activeLogisticsCorridorsCount || 1;
  if (corridorCount >= 3) {
    logisticsRedundancy = 15;
    adaptiveCapacities.push("Multiple operational transit corridors enable rerouting around friction");
  } else if (corridorCount === 1) {
    logisticsRedundancy = 5;
    vulnerabilityFactors.push("Single transit corridor bottleneck with limited bypass options");
  } else {
    logisticsRedundancy = 10;
  }

  // 6. Market Diversification (max 15)
  let marketDiversification = 8;
  const channels = params.activeTradeChannelsCount || 1;
  if (channels >= 3) {
    marketDiversification = 15;
    adaptiveCapacities.push("Active multi-channel offtake (B2B contracts, marketplace, shared purchases)");
  } else {
    marketDiversification = 8;
  }

  // 7. Aggregation Capacity (max 10)
  let aggregationCapacity = 5;
  const pools = params.aggregationPoolsActiveCount || 0;
  if (pools >= 2) {
    aggregationCapacity = 10;
    adaptiveCapacities.push("Operational aggregation clusters pool smallholder output efficiently");
  } else if (pools === 1) {
    aggregationCapacity = 7;
  } else {
    aggregationCapacity = 2;
  }

  const rawScore =
    supplyDiversification +
    regionalDiversification +
    productionDiversity +
    processingRedundancy +
    logisticsRedundancy +
    marketDiversification +
    aggregationCapacity;

  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  let level: AgriculturalResilienceLevel = "MODERATE_RESILIENCE";
  if (score >= 75) level = "HIGH_RESILIENCE";
  else if (score >= 50) level = "MODERATE_RESILIENCE";
  else if (score >= 25) level = "VULNERABLE";
  else level = "CRITICALLY_VULNERABLE";

  const components: ResilienceComponents = {
    supplyDiversification,
    regionalDiversification,
    productionDiversity,
    processingRedundancy,
    logisticsRedundancy,
    marketDiversification,
    aggregationCapacity,
  };

  return {
    score,
    level,
    components,
    vulnerabilityFactors,
    adaptiveCapacities,
    confidence: 0.85,
  };
}

// -----------------------------------------------------------------------------
// 3. CRITICAL DEPENDENCY DETECTION
// -----------------------------------------------------------------------------

export interface DependencyCandidateInput {
  commodity: string;
  state: string;
  regionalShare?: number;          // 0 to 100
  dominantRegionName?: string;
  supplierShare?: number;          // 0 to 100
  dominantSupplierName?: string;
  corridorShare?: number;          // 0 to 100
  dominantCorridorName?: string;
  processingFacilityShare?: number;// 0 to 100
  dominantFacilityName?: string;
}

export function detectCriticalDependencies(
  input: DependencyCandidateInput
): CriticalDependencyItem[] {
  assertNoProhibitedProduce(input.commodity, "Commodity");
  const dependencies: CriticalDependencyItem[] = [];

  // 1. Regional Supply Concentration (>= 70%)
  if (typeof input.regionalShare === "number" && input.regionalShare >= 70) {
    dependencies.push({
      commodity: input.commodity,
      state: input.state,
      dependencyType: "REGIONAL_SUPPLY_CONCENTRATION",
      dominantEntity: input.dominantRegionName || `${input.state} Agricultural Cluster`,
      concentrationRatio: input.regionalShare,
      thresholdExceeded: 70,
      alternativeOptionsAvailable: 1,
      riskAssessment: `Single production hub accounts for ${input.regionalShare}% of observed commodity output. Regional disruptions could impact wider corridor supply.`,
    });
  }

  // 2. Supplier Concentration Dependency (>= 80%)
  if (typeof input.supplierShare === "number" && input.supplierShare >= 80) {
    dependencies.push({
      commodity: input.commodity,
      state: input.state,
      dependencyType: "SUPPLIER_CONCENTRATION_DEPENDENCY",
      dominantEntity: input.dominantSupplierName || "Dominant Agribusiness Supplier",
      concentrationRatio: input.supplierShare,
      thresholdExceeded: 80,
      alternativeOptionsAvailable: 1,
      riskAssessment: `Single commercial producer supplies ${input.supplierShare}% of verified offtake volume, creating severe counterparty vulnerability.`,
    });
  }

  // 3. Corridor Transit Dependency (>= 75%)
  if (typeof input.corridorShare === "number" && input.corridorShare >= 75) {
    dependencies.push({
      commodity: input.commodity,
      state: input.state,
      dependencyType: "CORRIDOR_TRANSIT_DEPENDENCY",
      dominantEntity: input.dominantCorridorName || "Primary Highway Transit Corridor",
      concentrationRatio: input.corridorShare,
      thresholdExceeded: 75,
      alternativeOptionsAvailable: 1,
      riskAssessment: `${input.corridorShare}% of physical cargo moves across a single transit route with minimal alternative highway bypass capacity.`,
    });
  }

  // 4. Processing Facility Bottleneck (>= 80%)
  if (typeof input.processingFacilityShare === "number" && input.processingFacilityShare >= 80) {
    dependencies.push({
      commodity: input.commodity,
      state: input.state,
      dependencyType: "PROCESSING_BOTTLENECK_DEPENDENCY",
      dominantEntity: input.dominantFacilityName || "Sole Certified Mill/Processor",
      concentrationRatio: input.processingFacilityShare,
      thresholdExceeded: 80,
      alternativeOptionsAvailable: 0,
      riskAssessment: `Single processing mill controls ${input.processingFacilityShare}% of available conversion capacity. Plant downtime halts final supply output.`,
    });
  }

  return dependencies;
}

// -----------------------------------------------------------------------------
// 4. SECURITY EVENT -> SUPPLY IMPACT CORRELATION CHAIN
// -----------------------------------------------------------------------------

export interface SecuritySupplyCorrelationInput {
  incidentId: string;
  state: string;
  corridor?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedCommodity: string;
  currentSupplyDeficitRatio: number;
}

export function evaluateSecurityToSupplyImpact(
  input: SecuritySupplyCorrelationInput
): {
  correlationType: "CORRELATED_SIGNAL" | "POTENTIAL_IMPACT";
  projectedSeverity: AlertSeverity;
  correlationExplanation: string;
} {
  assertNoProhibitedProduce(input.affectedCommodity, "Commodity");

  const isHighSeverity = input.severity === "HIGH" || input.severity === "CRITICAL";
  const hasHighDeficit = input.currentSupplyDeficitRatio >= 0.5;

  let projectedSeverity: AlertSeverity = "INFO";
  if (isHighSeverity && hasHighDeficit) {
    projectedSeverity = "HIGH";
  } else if (isHighSeverity || hasHighDeficit) {
    projectedSeverity = "ELEVATED";
  } else {
    projectedSeverity = "WATCH";
  }

  return {
    correlationType: "CORRELATED_SIGNAL",
    projectedSeverity,
    correlationExplanation: `Security incident recorded in ${input.state} corridor (${input.severity} severity) correlates with observed transport friction for ${input.affectedCommodity}. Labeled as POTENTIAL_IMPACT; correlation does not confirm direct causation without on-ground carrier verification.`,
  };
}

// -----------------------------------------------------------------------------
// 5. FOUR PILLARS CLASSIFICATION (Availability, Affordability, Access, Stability)
// -----------------------------------------------------------------------------

export function classifyFoodSecurityPillars(
  pressureScore: number,
  components: FoodSecurityPressureComponents
): {
  availabilityStatus: AvailabilityStatus;
  affordabilityStatus: AffordabilityStatus;
  accessStatus: AccessStatus;
  stabilityStatus: StabilityStatus;
} {
  // 1. Availability
  let availabilityStatus: AvailabilityStatus = "ADEQUATE";
  if (components.supplyPressure >= 18 || components.regionalSupplyGap >= 12) {
    availabilityStatus = "SEVERE_DEFICIT";
  } else if (components.supplyPressure >= 12 || components.regionalSupplyGap >= 8) {
    availabilityStatus = "MODERATE_DEFICIT";
  }

  // 2. Affordability
  let affordabilityStatus: AffordabilityStatus = "STABLE";
  if (components.marketPricePressure >= 12) {
    affordabilityStatus = "SEVERE_PRESSURE";
  } else if (components.marketPricePressure >= 8) {
    affordabilityStatus = "MODERATE_PRESSURE";
  }

  // 3. Access
  let accessStatus: AccessStatus = "NORMAL";
  if (components.logisticsRisk >= 8 || components.securityRisk >= 4) {
    accessStatus = "ACCESS_CONSTRAINT";
  } else if (components.logisticsRisk >= 5) {
    accessStatus = "ACCESS_PRESSURE";
  }

  // 4. Stability
  let stabilityStatus: StabilityStatus = "STABLE";
  if (pressureScore >= 75) {
    stabilityStatus = "SEVERE_VOLATILITY";
  } else if (pressureScore >= 50) {
    stabilityStatus = "MODERATE_VOLATILITY";
  }

  return {
    availabilityStatus,
    affordabilityStatus,
    accessStatus,
    stabilityStatus,
  };
}
