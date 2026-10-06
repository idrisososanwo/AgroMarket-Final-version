/**
 * AgroMarket Phase 3.0: Agricultural Disease & Biosecurity Intelligence Agent
 * Authoritative Deterministic Intelligence Engine
 *
 * Implements:
 * 1. 7-Component Agricultural Disease Risk Index (0 to 100)
 * 2. 8-Dimension Biosecurity Resilience Score (0 to 100)
 * 3. Independent Source Signal Convergence Detector
 * 4. Biosecurity Dependency Detector
 * 5. Value-Chain Impact Evaluator & Causation Disclaimers
 * 6. Zero Pig/Pork Invariant Enforcement
 */

import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  DiseaseRiskComponents,
  DiseaseRiskIndex,
  DiseaseRiskLevel,
  BiosecurityResilienceComponents,
  BiosecurityResilienceAssessment,
  BiosecurityResilienceLevel,
  DiseaseObservationItem,
  SignalConvergenceDetection,
  BiosecurityDependencyItem,
  ValueChainImpactAssessment,
} from "./types";

// -----------------------------------------------------------------------------
// 1. AGRICULTURAL DISEASE RISK INDEX CALCULATION
// -----------------------------------------------------------------------------

export interface DiseaseRiskCalculationParams {
  state: string;
  lga?: string | null;
  commodity?: string | null;
  category?: string | null;
  observations: DiseaseObservationItem[];
  observedMortalityRatePercent?: number;     // 0 to 100
  productionDisruptionObserved?: boolean;
  movementRestrictionReported?: boolean;
  supplyAvailabilityDropPercent?: number;    // 0 to 100
  regionalConcentrationRatio?: number;       // 0.0 to 1.0
}

export function calculateDiseaseRiskIndex(
  params: DiseaseRiskCalculationParams
): DiseaseRiskIndex {
  if (params.commodity) {
    assertNoProhibitedProduce(params.commodity, "Commodity");
  }
  if (params.category) {
    assertNoProhibitedProduce(params.category, "Category");
  }

  const keyDrivers: string[] = [];
  const missingEvidence: string[] = [];

  // Filter out any simulated observations from producing real risk
  const validObservations = params.observations.filter(
    (obs) => obs.verificationStatus !== "SIMULATED"
  );

  // 1. Evidence Strength (max 20)
  let evidenceStrength = 0;
  if (validObservations.length === 0) {
    missingEvidence.push("No verified or secondary disease observations recorded for region");
    evidenceStrength = 0;
  } else {
    const verifiedCount = validObservations.filter(
      (o) => o.verificationStatus === "OFFICIAL" || o.verificationStatus === "VERIFIED"
    ).length;
    const secondaryCount = validObservations.filter(
      (o) => o.verificationStatus === "SECONDARY"
    ).length;
    const unverifiedCount = validObservations.filter(
      (o) => o.verificationStatus === "UNVERIFIED"
    ).length;

    if (verifiedCount >= 2) {
      evidenceStrength = 20;
      keyDrivers.push("Multiple official/verified agricultural health reports confirmed");
    } else if (verifiedCount === 1) {
      evidenceStrength = 15;
      keyDrivers.push("Official advisory or verified institutional report present");
    } else if (secondaryCount >= 2) {
      evidenceStrength = 12;
      keyDrivers.push("Multiple secondary agricultural reports observed across zone");
    } else if (secondaryCount === 1) {
      evidenceStrength = 8;
    } else if (unverifiedCount > 0) {
      evidenceStrength = 4;
      missingEvidence.push("Current reports are unverified; official confirmation pending");
    }
  }

  // 2. Signal Convergence (max 20)
  const convergence = detectSignalConvergence(validObservations);
  const signalConvergence = convergence.convergenceScore;
  if (convergence.isConvergent) {
    keyDrivers.push(
      `Signal convergence detected across ${convergence.independentSourceCount} independent sources`
    );
  } else if (validObservations.length > 0 && convergence.independentSourceCount <= 1) {
    missingEvidence.push("Single-source observation; corroboration from independent sources required");
  }

  // 3. Geographic Concentration (max 15)
  let geographicConcentration = 4;
  if (typeof params.regionalConcentrationRatio === "number" && !isNaN(params.regionalConcentrationRatio)) {
    const ratio = Math.max(0, Math.min(1.0, params.regionalConcentrationRatio));
    geographicConcentration = Math.round(ratio * 15 * 10) / 10;
    if (ratio >= 0.7) {
      keyDrivers.push("High geographic concentration of health signals within local production basin");
    }
  } else {
    missingEvidence.push("Geographic concentration metric not provided; baseline 4/15 assigned");
  }

  // 4. Commodity Exposure (max 15)
  let commodityExposure = 4;
  if (params.commodity && validObservations.length > 0) {
    const matchingObs = validObservations.filter(
      (o) => o.commodity?.toLowerCase() === params.commodity?.toLowerCase()
    );
    if (matchingObs.length >= 2) {
      commodityExposure = 15;
      keyDrivers.push(`High commodity-specific exposure observed for ${params.commodity}`);
    } else if (matchingObs.length === 1) {
      commodityExposure = 10;
      keyDrivers.push(`Targeted health observation recorded specifically for ${params.commodity}`);
    } else {
      commodityExposure = 5;
    }
  } else if (params.category && validObservations.length > 0) {
    commodityExposure = 8;
  } else {
    missingEvidence.push("Specific commodity exposure details limited; baseline 4/15 assigned");
  }

  // 5. Production Impact Evidence (max 10)
  let productionImpactEvidence = 0;
  if (typeof params.observedMortalityRatePercent === "number" && params.observedMortalityRatePercent > 0) {
    if (params.observedMortalityRatePercent >= 15) {
      productionImpactEvidence = 10;
      keyDrivers.push(`Severe mortality/loss rate of ${params.observedMortalityRatePercent}% reported`);
    } else if (params.observedMortalityRatePercent >= 5) {
      productionImpactEvidence = 7;
      keyDrivers.push(`Abnormal mortality/loss rate of ${params.observedMortalityRatePercent}% reported`);
    } else {
      productionImpactEvidence = 3;
    }
  } else if (params.productionDisruptionObserved === true) {
    productionImpactEvidence = 8;
    keyDrivers.push("Observable farm-level production interruption reported in area");
  } else if (params.productionDisruptionObserved === undefined) {
    missingEvidence.push("Direct production impact telemetry not available");
  }

  // 6. Movement / Biosecurity Exposure (max 10)
  let movementBiosecurityExposure = 0;
  if (params.movementRestrictionReported === true) {
    movementBiosecurityExposure = 10;
    keyDrivers.push("Health-related transit restriction or biosecurity checkpoint friction reported");
  } else if (params.movementRestrictionReported === undefined) {
    movementBiosecurityExposure = 2;
    missingEvidence.push("Biosecurity movement restriction status unconfirmed");
  }

  // 7. Supply Impact Evidence (max 10)
  let supplyImpactEvidence = 0;
  if (typeof params.supplyAvailabilityDropPercent === "number" && params.supplyAvailabilityDropPercent > 0) {
    if (params.supplyAvailabilityDropPercent >= 20) {
      supplyImpactEvidence = 10;
      keyDrivers.push(`Observable supply decline of ${params.supplyAvailabilityDropPercent}% in target market`);
    } else if (params.supplyAvailabilityDropPercent >= 10) {
      supplyImpactEvidence = 6;
      keyDrivers.push(`Moderate supply decline of ${params.supplyAvailabilityDropPercent}% reported`);
    } else {
      supplyImpactEvidence = 3;
    }
  } else if (params.supplyAvailabilityDropPercent === undefined) {
    missingEvidence.push("Marketplace supply impact telemetry not available");
  }

  const rawScore =
    evidenceStrength +
    signalConvergence +
    geographicConcentration +
    commodityExposure +
    productionImpactEvidence +
    movementBiosecurityExposure +
    supplyImpactEvidence;

  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  let level: DiseaseRiskLevel = "LOW_RISK";
  if (score >= 75) level = "CRITICAL_RISK";
  else if (score >= 55) level = "HIGH_RISK";
  else if (score >= 40) level = "ELEVATED_RISK";
  else if (score >= 25) level = "MODERATE_RISK";
  else level = "LOW_RISK";

  // Confidence calculation penalizes missing inputs and unverified sources
  const missingPenalty = missingEvidence.length * 0.12;
  const verifiedCount = validObservations.filter(
    (o) => o.verificationStatus === "OFFICIAL" || o.verificationStatus === "VERIFIED"
  ).length;
  const verificationBoost = verifiedCount > 0 ? 0.15 : 0;
  const confidence = Math.max(
    0.2,
    Math.min(1.0, Math.round((0.85 - missingPenalty + verificationBoost) * 100) / 100)
  );

  if (validObservations.length === 0 || missingEvidence.length >= 4 || confidence < 0.4) {
    level = "INSUFFICIENT_DATA";
  }

  const components: DiseaseRiskComponents = {
    evidenceStrength,
    signalConvergence,
    geographicConcentration,
    commodityExposure,
    productionImpactEvidence,
    movementBiosecurityExposure,
    supplyImpactEvidence,
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
// 2. AGRICULTURAL BIOSECURITY RESILIENCE SCORE CALCULATION
// -----------------------------------------------------------------------------

export interface BiosecurityResilienceCalculationParams {
  state: string;
  commodity?: string | null;
  activeProducersCount?: number;
  regionalSourcesCount?: number;
  supplierDiversityRatio?: number;         // 0.0 to 1.0
  movementAlternativesCount?: number;
  aggregationPointsCount?: number;
  processingFacilitiesCount?: number;
  marketDestinationsCount?: number;
  extensionSupportPresent?: boolean;
}

export function calculateBiosecurityResilienceScore(
  params: BiosecurityResilienceCalculationParams
): BiosecurityResilienceAssessment {
  if (params.commodity) {
    assertNoProhibitedProduce(params.commodity, "Commodity");
  }

  const vulnerabilityFactors: string[] = [];
  const adaptiveCapacities: string[] = [];
  const missingInputs: string[] = [];

  // 1. Production Diversification (max 15)
  let productionDiversification = 5;
  if (typeof params.activeProducersCount === "number") {
    if (params.activeProducersCount >= 20) {
      productionDiversification = 15;
      adaptiveCapacities.push("Decentralized producer base provides strong disease containment buffer");
    } else if (params.activeProducersCount >= 8) {
      productionDiversification = 10;
      adaptiveCapacities.push("Moderate producer dispersion across local farming clusters");
    } else if (params.activeProducersCount >= 2) {
      productionDiversification = 5;
    } else {
      productionDiversification = 2;
      vulnerabilityFactors.push("High producer concentration creates vulnerability to local disease spread");
    }
  } else {
    missingInputs.push("Producer count unavailable; baseline 5/15 assigned");
  }

  // 2. Regional Diversification (max 15)
  let regionalDiversification = 5;
  if (typeof params.regionalSourcesCount === "number") {
    if (params.regionalSourcesCount >= 4) {
      regionalDiversification = 15;
      adaptiveCapacities.push("Multi-state sourcing corridors mitigate local quarantine shocks");
    } else if (params.regionalSourcesCount >= 2) {
      regionalDiversification = 10;
    } else {
      regionalDiversification = 3;
      vulnerabilityFactors.push("Single-region reliance increases systemic vulnerability");
    }
  } else {
    missingInputs.push("Regional source count unavailable; baseline 5/15 assigned");
  }

  // 3. Supplier / Source Diversity (max 10)
  let supplierSourceDiversity = 3;
  if (typeof params.supplierDiversityRatio === "number" && !isNaN(params.supplierDiversityRatio)) {
    const ratio = Math.max(0, Math.min(1.0, params.supplierDiversityRatio));
    supplierSourceDiversity = Math.round(ratio * 10 * 10) / 10;
    if (ratio >= 0.7) {
      adaptiveCapacities.push("Broad supplier mix prevents individual farm quarantine bottlenecks");
    } else if (ratio < 0.4) {
      vulnerabilityFactors.push("Concentrated supply relationships with limited alternative farms");
    }
  } else {
    missingInputs.push("Supplier diversity ratio unavailable; baseline 3/10 assigned");
  }

  // 4. Movement Flexibility (max 15)
  let movementFlexibility = 5;
  if (typeof params.movementAlternativesCount === "number") {
    if (params.movementAlternativesCount >= 3) {
      movementFlexibility = 15;
      adaptiveCapacities.push("Multiple transit corridors permit rerouting around health restrictions");
    } else if (params.movementAlternativesCount >= 1) {
      movementFlexibility = 9;
    } else {
      movementFlexibility = 2;
      vulnerabilityFactors.push("Single-corridor transit reliance limits biosecurity rerouting options");
    }
  } else {
    missingInputs.push("Movement alternatives count unavailable; baseline 5/15 assigned");
  }

  // 5. Aggregation Flexibility (max 10)
  let aggregationFlexibility = 3;
  if (typeof params.aggregationPointsCount === "number") {
    if (params.aggregationPointsCount >= 4) {
      aggregationFlexibility = 10;
      adaptiveCapacities.push("Multiple aggregation hubs enable local isolation and staging");
    } else if (params.aggregationPointsCount >= 2) {
      aggregationFlexibility = 7;
    } else {
      aggregationFlexibility = 2;
      vulnerabilityFactors.push("Single aggregation center creates single-point-of-failure contamination risk");
    }
  } else {
    missingInputs.push("Aggregation points count unavailable; baseline 3/10 assigned");
  }

  // 6. Processing Redundancy (max 10)
  let processingRedundancy = 3;
  if (typeof params.processingFacilitiesCount === "number") {
    if (params.processingFacilitiesCount >= 3) {
      processingRedundancy = 10;
      adaptiveCapacities.push("Redundant processing facilities accommodate supply reallocation");
    } else if (params.processingFacilitiesCount >= 1) {
      processingRedundancy = 6;
    } else {
      processingRedundancy = 2;
    }
  } else {
    missingInputs.push("Processing facilities count unavailable; baseline 3/10 assigned");
  }

  // 7. Market Diversification (max 10)
  let marketDiversification = 3;
  if (typeof params.marketDestinationsCount === "number") {
    if (params.marketDestinationsCount >= 4) {
      marketDiversification = 10;
      adaptiveCapacities.push("Diverse buyer channels absorb redirected safe agricultural volumes");
    } else if (params.marketDestinationsCount >= 2) {
      marketDiversification = 6;
    } else {
      marketDiversification = 2;
    }
  } else {
    missingInputs.push("Market destinations count unavailable; baseline 3/10 assigned");
  }

  // 8. Observed Response Capacity (max 15)
  let observedResponseCapacity = 4;
  if (params.extensionSupportPresent === true) {
    observedResponseCapacity = 15;
    adaptiveCapacities.push("Active agricultural extension and veterinary advisory support present");
  } else if (params.extensionSupportPresent === false) {
    observedResponseCapacity = 3;
    vulnerabilityFactors.push("Limited agricultural extension presence slows advisory dissemination");
  } else {
    missingInputs.push("Extension support status unconfirmed; baseline 4/15 assigned");
  }

  const rawScore =
    productionDiversification +
    regionalDiversification +
    supplierSourceDiversity +
    movementFlexibility +
    aggregationFlexibility +
    processingRedundancy +
    marketDiversification +
    observedResponseCapacity;

  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  let level: BiosecurityResilienceLevel = "MODERATE_RESILIENCE";
  if (score >= 75) level = "HIGH_RESILIENCE";
  else if (score >= 50) level = "MODERATE_RESILIENCE";
  else if (score >= 25) level = "VULNERABLE";
  else level = "CRITICALLY_VULNERABLE";

  const confidence = missingInputs.length > 3 ? 0.35 : 0.85;
  if (confidence < 0.4) {
    level = "INSUFFICIENT_DATA";
  }

  const components: BiosecurityResilienceComponents = {
    productionDiversification,
    regionalDiversification,
    supplierSourceDiversity,
    movementFlexibility,
    aggregationFlexibility,
    processingRedundancy,
    marketDiversification,
    observedResponseCapacity,
  };

  return {
    score,
    level,
    components,
    vulnerabilityFactors,
    adaptiveCapacities,
    confidence,
  };
}

// -----------------------------------------------------------------------------
// 3. SIGNAL CONVERGENCE DETECTION
// -----------------------------------------------------------------------------

export function detectSignalConvergence(
  observations: DiseaseObservationItem[]
): SignalConvergenceDetection {
  // Deduplicate by source name to prevent repeated reports from inflating convergence
  const uniqueSourcesMap = new Map<string, DiseaseObservationItem>();
  for (const obs of observations) {
    if (obs.verificationStatus === "SIMULATED") continue;
    const key = `${obs.sourceName.trim().toLowerCase()}_${obs.sourceType}`;
    if (!uniqueSourcesMap.has(key)) {
      uniqueSourcesMap.set(key, obs);
    }
  }

  const uniqueObservations = Array.from(uniqueSourcesMap.values());
  const independentSourceCount = uniqueObservations.length;
  const distinctSourceTypes = Array.from(
    new Set(uniqueObservations.map((o) => o.sourceType))
  );
  const verifiedSourcesCount = uniqueObservations.filter(
    (o) => o.verificationStatus === "OFFICIAL" || o.verificationStatus === "VERIFIED"
  ).length;

  let convergenceScore = 0;
  let isConvergent = false;
  let convergenceNotes = "Insufficient independent reports to evaluate signal convergence.";

  if (independentSourceCount >= 3 && distinctSourceTypes.length >= 2) {
    isConvergent = true;
    convergenceScore = 20;
    convergenceNotes = `Strong signal convergence observed across ${independentSourceCount} independent sources spanning ${distinctSourceTypes.length} distinct source types.`;
  } else if (independentSourceCount >= 2 && verifiedSourcesCount >= 1) {
    isConvergent = true;
    convergenceScore = 14;
    convergenceNotes = `Moderate convergence confirmed between official notices and field observations.`;
  } else if (independentSourceCount >= 2) {
    isConvergent = false;
    convergenceScore = 8;
    convergenceNotes = `Multiple reports observed, but official institutional verification is still pending.`;
  } else if (independentSourceCount === 1) {
    isConvergent = false;
    convergenceScore = 3;
    convergenceNotes = `Single source observation recorded. Corroborating signals needed to establish convergence.`;
  }

  return {
    isConvergent,
    independentSourceCount,
    distinctSourceTypes,
    verifiedSourcesCount,
    convergenceScore,
    convergenceNotes,
  };
}

// -----------------------------------------------------------------------------
// 4. BIOSECURITY DEPENDENCIES DETECTION
// -----------------------------------------------------------------------------

export interface BiosecurityDependencyInput {
  state: string;
  commodity?: string | null;
  productionConcentrationPercent?: number;  // 0 to 100
  dominantProducerEntity?: string;
  corridorConcentrationPercent?: number;    // 0 to 100
  dominantCorridorName?: string;
  supplierConcentrationPercent?: number;    // 0 to 100
  dominantSupplierName?: string;
  singleProcessingFacilityPercent?: number; // 0 to 100
  dominantProcessingFacility?: string;
}

export function detectBiosecurityDependencies(
  input: BiosecurityDependencyInput
): BiosecurityDependencyItem[] {
  if (input.commodity) {
    assertNoProhibitedProduce(input.commodity, "Commodity");
  }

  const dependencies: BiosecurityDependencyItem[] = [];

  // 1. Regional Production Concentration (>= 75%)
  if (
    typeof input.productionConcentrationPercent === "number" &&
    input.productionConcentrationPercent >= 75
  ) {
    dependencies.push({
      state: input.state,
      commodity: input.commodity || null,
      dependencyType: "REGIONAL_PRODUCTION_CONCENTRATION",
      dominantEntity: input.dominantProducerEntity || `${input.state} Production Cluster`,
      concentrationPercentage: input.productionConcentrationPercent,
      severity: input.productionConcentrationPercent >= 90 ? "CRITICAL" : "HIGH",
      status: "ACTIVE",
      riskAssessment: `Single production cluster accounts for ${input.productionConcentrationPercent}% of monitored regional output. Any local disease event directly threatens broad commodity availability.`,
      evidence: `Observed production share: ${input.productionConcentrationPercent}% in cluster.`,
      confidence: 0.9,
    });
  }

  // 2. Movement Dependency (>= 75%)
  if (
    typeof input.corridorConcentrationPercent === "number" &&
    input.corridorConcentrationPercent >= 75
  ) {
    dependencies.push({
      state: input.state,
      commodity: input.commodity || null,
      dependencyType: "MOVEMENT_DEPENDENCY",
      dominantEntity: input.dominantCorridorName || `${input.state} Primary Arterial Route`,
      concentrationPercentage: input.corridorConcentrationPercent,
      severity: "HIGH",
      status: "ACTIVE",
      riskAssessment: `Movement of agricultural goods depends ${input.corridorConcentrationPercent}% on a single transit route. Health-related checkpoints or quarantine closures would halt outward distribution.`,
      evidence: `Corridor dependency share: ${input.corridorConcentrationPercent}%.`,
      confidence: 0.88,
    });
  }

  // 3. Source Supplier Dependency (>= 80%)
  if (
    typeof input.supplierConcentrationPercent === "number" &&
    input.supplierConcentrationPercent >= 80
  ) {
    dependencies.push({
      state: input.state,
      commodity: input.commodity || null,
      dependencyType: "SOURCE_SUPPLIER_DEPENDENCY",
      dominantEntity: input.dominantSupplierName || "Dominant Supplier Hub",
      concentrationPercentage: input.supplierConcentrationPercent,
      severity: "ELEVATED",
      status: "ACTIVE",
      riskAssessment: `Single supplier hub handles ${input.supplierConcentrationPercent}% of sourcing. A health-related disruption at this facility creates direct counterparty exposure.`,
      evidence: `Supplier concentration: ${input.supplierConcentrationPercent}%.`,
      confidence: 0.85,
    });
  }

  // 4. Processing Dependency (>= 80%)
  if (
    typeof input.singleProcessingFacilityPercent === "number" &&
    input.singleProcessingFacilityPercent >= 80
  ) {
    dependencies.push({
      state: input.state,
      commodity: input.commodity || null,
      dependencyType: "PROCESSING_DEPENDENCY",
      dominantEntity: input.dominantProcessingFacility || "Primary Processing Plant",
      concentrationPercentage: input.singleProcessingFacilityPercent,
      severity: "HIGH",
      status: "ACTIVE",
      riskAssessment: `Downstream processing depends ${input.singleProcessingFacilityPercent}% on a single processing unit. Facility contamination or sanitary shutdown halts regional value-addition.`,
      evidence: `Processing concentration: ${input.singleProcessingFacilityPercent}%.`,
      confidence: 0.86,
    });
  }

  return dependencies;
}

// -----------------------------------------------------------------------------
// 5. VALUE-CHAIN IMPACT EVALUATION
// -----------------------------------------------------------------------------

export function evaluateValueChainImpact(
  riskIndex: DiseaseRiskIndex,
  dependencies: BiosecurityDependencyItem[]
): ValueChainImpactAssessment {
  const isHighRisk = riskIndex.score >= 55;
  const isCriticalRisk = riskIndex.score >= 75;

  let productionDisruptionLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
  if (isCriticalRisk) productionDisruptionLevel = "CRITICAL";
  else if (isHighRisk) productionDisruptionLevel = "HIGH";
  else if (riskIndex.score >= 35) productionDisruptionLevel = "MODERATE";

  const hasMovementDep = dependencies.some((d) => d.dependencyType === "MOVEMENT_DEPENDENCY");
  const movementRestrictionPotential: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" =
    isCriticalRisk && hasMovementDep
      ? "CRITICAL"
      : isHighRisk || hasMovementDep
      ? "HIGH"
      : "LOW";

  const hasProcessingDep = dependencies.some((d) => d.dependencyType === "PROCESSING_DEPENDENCY");
  const processingRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" =
    isHighRisk && hasProcessingDep ? "HIGH" : isHighRisk ? "MODERATE" : "LOW";

  const aggregationRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" =
    isCriticalRisk ? "HIGH" : isHighRisk ? "MODERATE" : "LOW";

  const supplyAvailabilityImpact: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" =
    isCriticalRisk ? "CRITICAL" : isHighRisk ? "HIGH" : "LOW";

  let foodSecurityImplication =
    "Nominal health observations. Supply volumes stable across monitored trade basins.";
  if (isCriticalRisk) {
    foodSecurityImplication =
      "Critical disease risk signals combined with value-chain dependencies may amplify regional food-availability and affordability pressure. Human operators should prioritize supply buffer coordination.";
  } else if (isHighRisk) {
    foodSecurityImplication =
      "Elevated disease risk signals may introduce secondary supply friction in target urban consumption markets. Continuous monitoring advised.";
  }

  const causationDisclaimer =
    "Correlation is not causation. Disease-risk indicators represent early-warning decision support and require verification by official agricultural and veterinary authorities.";

  return {
    productionDisruptionLevel,
    aggregationRisk,
    processingRisk,
    movementRestrictionPotential,
    supplyAvailabilityImpact,
    foodSecurityImplication,
    causationDisclaimer,
  };
}
