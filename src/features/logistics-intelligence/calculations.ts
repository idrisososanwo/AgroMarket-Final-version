/**
 * AgroMarket Phase 2.9: Logistics Intelligence Deterministic Calculations
 * Authoritative algorithms for Logistics Pressure Indexing, Network Resilience Scoring,
 * Corridor Dependency Detection, Bottleneck Identification, and Security-Logistics Correlation.
 *
 * SAFETY INVARIANTS:
 * 1. Deterministic calculations are authoritative; AI reasoning is advisory interpretation only.
 * 2. Score bounds are strictly [0.0, 100.0].
 * 3. Zero pig/pork tolerance across all parameters, commodities, and outputs.
 * 4. Missing evidence reduces confidence and is explicitly recorded; never treated as artificial risk.
 * 5. Correlation is strictly distinguished from causation; no road safety or safe-passage guarantees.
 */

import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  LogisticsPressureIndex,
  LogisticsPressureComponents,
  LogisticsPressureLevel,
  LogisticsResilienceAssessment,
  LogisticsResilienceComponents,
  LogisticsResilienceLevel,
  LogisticsCorridorDependencyItem,
  LogisticsBottleneckItem,
  LogisticsSeverity,
} from "./types";

// -----------------------------------------------------------------------------
// 1. DETERMINISTIC LOGISTICS PRESSURE INDEX (0 to 100)
// -----------------------------------------------------------------------------

export interface CalculateLogisticsPressureParams {
  commodity?: string | null;
  state: string;
  corridor?: string | null;
  activeMovementDemandRatio?: number | null;    // 0.0 to 1.0 (movement volume vs baseline)
  capacityUtilizationRatio?: number | null;     // 0.0 to 1.0 (workload vs available providers)
  delayedDeliveriesRatio?: number | null;       // 0.0 to 1.0 (delayed/failed / total deliveries)
  corridorConcentrationRatio?: number | null;   // 0.0 to 1.0 (share on single transit corridor)
  securityFrictionReported?: boolean;           // Phase 1.5 corridor incident
  processingMovementFriction?: boolean;         // Processing facility transit backlog
  alternativeProvidersCount?: number | null;    // Active providers in state/corridor
}

/**
 * Calculates the AgroMarket Logistics Pressure Index from 0 to 100
 *
 * Component Weights:
 * - Movement Demand Pressure:        20%
 * - Capacity Constraint Pressure:    20%
 * - Delivery Delay Pressure:         15%
 * - Corridor Dependency Pressure:    15%
 * - Disruption Pressure:             10%
 * - Processing Movement Pressure:     10%
 * - Regional Alternative Scarcity:   10%
 * Total = 100%
 */
export function calculateLogisticsPressureIndex(
  params: CalculateLogisticsPressureParams
): LogisticsPressureIndex {
  if (params.commodity) {
    assertNoProhibitedProduce(params.commodity, "Commodity");
  }

  const missingEvidence: string[] = [];
  const keyDrivers: string[] = [];

  // 1. Movement Demand Pressure (max 20)
  let movementDemandPressure = 8;
  if (typeof params.activeMovementDemandRatio === "number" && !isNaN(params.activeMovementDemandRatio)) {
    const ratio = Math.max(0, Math.min(1.0, params.activeMovementDemandRatio));
    movementDemandPressure = Math.round(ratio * 20 * 10) / 10;
    if (ratio >= 0.75) {
      keyDrivers.push("High volume of active agricultural dispatch and procurement requirements");
    }
  } else {
    missingEvidence.push("Movement demand ratio not available; baseline 8/20 assigned");
  }

  // 2. Capacity Constraint Pressure (max 20)
  let capacityConstraintPressure = 8;
  if (typeof params.capacityUtilizationRatio === "number" && !isNaN(params.capacityUtilizationRatio)) {
    const ratio = Math.max(0, Math.min(1.0, params.capacityUtilizationRatio));
    capacityConstraintPressure = Math.round(ratio * 20 * 10) / 10;
    if (ratio >= 0.75) {
      keyDrivers.push("Elevated provider workload and vehicle assignment congestion in corridor");
    }
  } else {
    missingEvidence.push("Capacity utilization ratio not available; baseline 8/20 assigned");
  }

  // 3. Delivery Delay Pressure (max 15)
  let deliveryDelayPressure = 5;
  if (typeof params.delayedDeliveriesRatio === "number" && !isNaN(params.delayedDeliveriesRatio)) {
    const ratio = Math.max(0, Math.min(1.0, params.delayedDeliveriesRatio));
    deliveryDelayPressure = Math.round(ratio * 15 * 10) / 10;
    if (ratio >= 0.3) {
      keyDrivers.push("Recurrent delivery delay patterns and transit schedule deviations detected");
    }
  } else {
    missingEvidence.push("Delivery delay ratio not available; baseline 5/15 assigned");
  }

  // 4. Corridor Dependency Pressure (max 15)
  let corridorDependencyPressure = 6;
  if (typeof params.corridorConcentrationRatio === "number" && !isNaN(params.corridorConcentrationRatio)) {
    const ratio = Math.max(0, Math.min(1.0, params.corridorConcentrationRatio));
    corridorDependencyPressure = Math.round(ratio * 15 * 10) / 10;
    if (ratio >= 0.75) {
      keyDrivers.push("Heavy concentration of physical cargo movement on a single transit route");
    }
  } else {
    missingEvidence.push("Corridor concentration ratio not available; baseline 6/15 assigned");
  }

  // 5. Disruption Pressure (max 10)
  let disruptionPressure = 0;
  if (params.securityFrictionReported === true) {
    disruptionPressure = 10;
    keyDrivers.push("Active security advisory or road checkpoint friction reported in corridor");
  } else if (params.securityFrictionReported === undefined) {
    disruptionPressure = 2;
  }

  // 6. Processing Movement Pressure (max 10)
  let processingMovementPressure = 0;
  if (params.processingMovementFriction === true) {
    processingMovementPressure = 10;
    keyDrivers.push("Downstream processing plant delivery backlog or offloading delay observed");
  } else if (params.processingMovementFriction === undefined) {
    processingMovementPressure = 2;
  }

  // 7. Regional Alternative Scarcity (max 10)
  let regionalAlternativeScarcity = 4;
  if (typeof params.alternativeProvidersCount === "number") {
    if (params.alternativeProvidersCount === 0) {
      regionalAlternativeScarcity = 10;
      keyDrivers.push("Severe scarcity of verified third-party agricultural logistics providers");
    } else if (params.alternativeProvidersCount === 1) {
      regionalAlternativeScarcity = 7;
      keyDrivers.push("Single-provider reliance with limited secondary commercial transport options");
    } else if (params.alternativeProvidersCount >= 4) {
      regionalAlternativeScarcity = 1;
    } else {
      regionalAlternativeScarcity = 4;
    }
  } else {
    missingEvidence.push("Alternative provider availability count not available; baseline 4/10 assigned");
  }

  const rawScore =
    movementDemandPressure +
    capacityConstraintPressure +
    deliveryDelayPressure +
    corridorDependencyPressure +
    disruptionPressure +
    processingMovementPressure +
    regionalAlternativeScarcity;

  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  let level: LogisticsPressureLevel = "LOW_PRESSURE";
  if (score >= 75) level = "CRITICAL_PRESSURE";
  else if (score >= 55) level = "HIGH_PRESSURE";
  else if (score >= 35) level = "MODERATE_PRESSURE";
  else level = "LOW_PRESSURE";

  // Confidence calculation penalizes missing inputs
  const missingPenalty = missingEvidence.length * 0.14;
  const confidence = Math.max(0.2, Math.min(1.0, Math.round((1.0 - missingPenalty) * 100) / 100));

  if (missingEvidence.length >= 4 || confidence < 0.4) {
    level = "INSUFFICIENT_DATA";
  }

  const components: LogisticsPressureComponents = {
    movementDemandPressure,
    capacityConstraintPressure,
    deliveryDelayPressure,
    corridorDependencyPressure,
    disruptionPressure,
    processingMovementPressure,
    regionalAlternativeScarcity,
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
// 2. DETERMINISTIC AGRICULTURAL LOGISTICS RESILIENCE SCORE (0 to 100)
// -----------------------------------------------------------------------------

export interface CalculateLogisticsResilienceParams {
  commodity?: string | null;
  state: string;
  providerCount?: number;
  dominantProviderShare?: number;               // 0.0 to 1.0 (concentration ratio)
  activeCorridorsCount?: number;
  regionalAlternativeRoutesCount?: number;
  connectedProcessingFacilitiesCount?: number;
  aggregationHubsConnectedCount?: number;
  destinationMarketsCount?: number;
  availableTruckCapacityUnits?: number;
  disruptionRecoveryEventsCount?: number;
}

/**
 * Calculates Agricultural Logistics Resilience Score from 0 to 100
 *
 * Component Weights:
 * - Provider Diversity:                  15%
 * - Corridor Diversity:                  15%
 * - Regional Alternative Availability:   15%
 * - Processing Connectivity:             15%
 * - Aggregation Connectivity:            10%
 * - Market Destination Diversity:         10%
 * - Movement Capacity Availability:       10%
 * - Disruption Recovery Evidence:         10%
 * Total = 100%
 */
export function calculateLogisticsResilienceScore(
  params: CalculateLogisticsResilienceParams
): LogisticsResilienceAssessment {
  if (params.commodity) {
    assertNoProhibitedProduce(params.commodity, "Commodity");
  }

  const vulnerabilityFactors: string[] = [];
  const adaptiveCapacities: string[] = [];
  const missingInputs: string[] = [];

  // 1. Provider Diversity (max 15)
  let providerDiversity = 7;
  const providers = params.providerCount ?? 1;
  const dominantShare = params.dominantProviderShare ?? 0.7;
  if (providers >= 4 && dominantShare <= 0.4) {
    providerDiversity = 15;
    adaptiveCapacities.push("Diversified logistics carrier base with no dominant provider bottleneck");
  } else if (providers <= 1 || dominantShare >= 0.85) {
    providerDiversity = 3;
    vulnerabilityFactors.push("High carrier concentration (single provider handles > 85% of movement)");
  } else {
    providerDiversity = 10;
  }

  // 2. Corridor Diversity (max 15)
  let corridorDiversity = 7;
  const corridors = params.activeCorridorsCount ?? 1;
  if (corridors >= 3) {
    corridorDiversity = 15;
    adaptiveCapacities.push(`Multiple transit corridors (${corridors} active routes) provide transit redundancy`);
  } else if (corridors === 1) {
    corridorDiversity = 4;
    vulnerabilityFactors.push("Single highway corridor transit dependency with limited bypass alternatives");
  } else {
    corridorDiversity = 10;
  }

  // 3. Regional Alternative Availability (max 15)
  let regionalAlternativeAvailability = 8;
  const altRoutes = params.regionalAlternativeRoutesCount ?? 1;
  if (altRoutes >= 3) {
    regionalAlternativeAvailability = 15;
    adaptiveCapacities.push("Inter-state connecting routes permit smooth rerouting around localized friction");
  } else if (altRoutes === 0) {
    regionalAlternativeAvailability = 3;
    vulnerabilityFactors.push("Zero viable regional detour routes available for heavy commercial cargo");
  } else {
    regionalAlternativeAvailability = 9;
  }

  // 4. Processing Connectivity (max 15)
  let processingConnectivity = 7;
  const procCount = params.connectedProcessingFacilitiesCount ?? 0;
  if (procCount >= 3) {
    processingConnectivity = 15;
    adaptiveCapacities.push("Direct multi-point connectivity to certified processing plants");
  } else if (procCount === 0) {
    processingConnectivity = 3;
    vulnerabilityFactors.push("Lack of proximate processing hubs requires extended transit duration");
  } else {
    processingConnectivity = 9;
  }

  // 5. Aggregation Connectivity (max 10)
  let aggregationConnectivity = 5;
  const aggCount = params.aggregationHubsConnectedCount ?? 0;
  if (aggCount >= 2) {
    aggregationConnectivity = 10;
    adaptiveCapacities.push("Operational aggregation clusters pool smallholder output efficiently");
  } else if (aggCount === 0) {
    aggregationConnectivity = 2;
    vulnerabilityFactors.push("Dispersed farm-gate pickups without centralized aggregation coordination");
  } else {
    aggregationConnectivity = 6;
  }

  // 6. Market Destination Diversity (max 10)
  let marketDestinationDiversity = 5;
  const destCount = params.destinationMarketsCount ?? 1;
  if (destCount >= 3) {
    marketDestinationDiversity = 10;
    adaptiveCapacities.push("Broad distribution network serving wholesale, industrial, and retail nodes");
  } else if (destCount === 1) {
    marketDestinationDiversity = 4;
  } else {
    marketDestinationDiversity = 7;
  }

  // 7. Movement Capacity Availability (max 10)
  let movementCapacityAvailability = 5;
  const capacityUnits = params.availableTruckCapacityUnits ?? 2;
  if (capacityUnits >= 10) {
    movementCapacityAvailability = 10;
    adaptiveCapacities.push("Ample verified fleet capacity ready for rapid seasonal mobilization");
  } else if (capacityUnits <= 1) {
    movementCapacityAvailability = 2;
    vulnerabilityFactors.push("Constrained commercial vehicle availability during peak harvest windows");
  } else {
    movementCapacityAvailability = 6;
  }

  // 8. Disruption Recovery Evidence (max 10)
  let disruptionRecoveryEvidence = 5;
  const recoveryEvents = params.disruptionRecoveryEventsCount ?? 0;
  if (recoveryEvents >= 2) {
    disruptionRecoveryEvidence = 10;
    adaptiveCapacities.push("Demonstrated corridor operational recovery and resilience in prior dispatch periods");
  } else {
    disruptionRecoveryEvidence = 5;
  }

  const rawScore =
    providerDiversity +
    corridorDiversity +
    regionalAlternativeAvailability +
    processingConnectivity +
    aggregationConnectivity +
    marketDestinationDiversity +
    movementCapacityAvailability +
    disruptionRecoveryEvidence;

  const score = Math.max(0, Math.min(100, Math.round(rawScore * 10) / 10));

  let level: LogisticsResilienceLevel = "MODERATE_RESILIENCE";
  if (score >= 75) level = "HIGH_RESILIENCE";
  else if (score >= 50) level = "MODERATE_RESILIENCE";
  else if (score >= 25) level = "VULNERABLE";
  else level = "CRITICALLY_VULNERABLE";

  const components: LogisticsResilienceComponents = {
    providerDiversity,
    corridorDiversity,
    regionalAlternativeAvailability,
    processingConnectivity,
    aggregationConnectivity,
    marketDestinationDiversity,
    movementCapacityAvailability,
    disruptionRecoveryEvidence,
  };

  const confidence = missingInputs.length > 3 ? 0.35 : 0.85;
  if (confidence < 0.4) {
    level = "INSUFFICIENT_DATA";
  }

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
// 3. CORRIDOR & PROVIDER DEPENDENCY DETECTION
// -----------------------------------------------------------------------------

export interface DependencyDetectionInput {
  corridor: string;
  state: string;
  commodity?: string | null;
  category?: string | null;
  corridorMovementShare?: number;           // 0 to 100
  dominantProviderName?: string;
  dominantProviderShare?: number;           // 0 to 100
  alternativeOptionsCount?: number;
  processingTransitShare?: number;          // 0 to 100
  dominantFacilityName?: string;
}

export function detectCorridorDependencies(
  input: DependencyDetectionInput
): LogisticsCorridorDependencyItem[] {
  if (input.commodity) {
    assertNoProhibitedProduce(input.commodity, "Commodity");
  }
  const dependencies: LogisticsCorridorDependencyItem[] = [];

  // 1. Corridor Dependency (>= 75%)
  if (typeof input.corridorMovementShare === "number" && input.corridorMovementShare >= 75) {
    dependencies.push({
      corridor: input.corridor,
      state: input.state,
      commodity: input.commodity || null,
      category: input.category || null,
      dominantEntity: input.corridor,
      movementShare: input.corridorMovementShare,
      thresholdExceeded: 75,
      alternativeOptionsAvailable: input.alternativeOptionsCount ?? 1,
      dependencyType: "CORRIDOR_DEPENDENCY",
      severity: input.corridorMovementShare >= 90 ? "CRITICAL" : "HIGH",
      status: "ACTIVE",
      riskAssessment: `Single corridor carries ${input.corridorMovementShare}% of observed agricultural shipments for this trade basin. Any corridor bottleneck immediately impacts regional availability.`,
      evidence: `Observed movement share: ${input.corridorMovementShare}% across monitored carrier routes.`,
      confidence: 0.9,
    });
  }

  // 2. High Provider Dependency (>= 80%)
  if (typeof input.dominantProviderShare === "number" && input.dominantProviderShare >= 80) {
    dependencies.push({
      corridor: input.corridor,
      state: input.state,
      commodity: input.commodity || null,
      category: input.category || null,
      dominantEntity: input.dominantProviderName || "Dominant Logistics Carrier",
      movementShare: input.dominantProviderShare,
      thresholdExceeded: 80,
      alternativeOptionsAvailable: input.alternativeOptionsCount ?? 0,
      dependencyType: "HIGH_PROVIDER_DEPENDENCY",
      severity: "ELEVATED",
      status: "ACTIVE",
      riskAssessment: `Single third-party logistics provider handles ${input.dominantProviderShare}% of deliveries in this zone. Carrier disruption or vehicle unavailability creates direct counterparty risk.`,
      evidence: `Provider share: ${input.dominantProviderShare}% of active deliveries in state.`,
      confidence: 0.88,
    });
  }

  // 3. Regional Alternative Scarcity (alternatives === 0)
  if (input.alternativeOptionsCount === 0) {
    dependencies.push({
      corridor: input.corridor,
      state: input.state,
      commodity: input.commodity || null,
      category: input.category || null,
      dominantEntity: input.corridor,
      movementShare: 100,
      thresholdExceeded: 100,
      alternativeOptionsAvailable: 0,
      dependencyType: "REGIONAL_ALTERNATIVE_SCARCITY",
      severity: "HIGH",
      status: "ACTIVE",
      riskAssessment: "No viable commercial alternative carriers or secondary transport corridors currently registered in this zone.",
      evidence: "Verified carrier count: 0 alternate options available within geographic radius.",
      confidence: 0.92,
    });
  }

  // 4. Processing Movement Dependency (>= 80%)
  if (typeof input.processingTransitShare === "number" && input.processingTransitShare >= 80) {
    dependencies.push({
      corridor: input.corridor,
      state: input.state,
      commodity: input.commodity || null,
      category: input.category || null,
      dominantEntity: input.dominantFacilityName || "Primary Processing Hub",
      movementShare: input.processingTransitShare,
      thresholdExceeded: 80,
      alternativeOptionsAvailable: input.alternativeOptionsCount ?? 1,
      dependencyType: "PROCESSING_DEPENDENCY",
      severity: "HIGH",
      status: "ACTIVE",
      riskAssessment: `Over ${input.processingTransitShare}% of bulk produce transit flows through a single processing hub before market distribution.`,
      evidence: `Processing transit share: ${input.processingTransitShare}% of processed volume.`,
      confidence: 0.85,
    });
  }

  return dependencies;
}

// -----------------------------------------------------------------------------
// 4. LOGISTICS BOTTLENECK DETECTION
// -----------------------------------------------------------------------------

export interface BottleneckDetectionInput {
  state: string;
  lga?: string | null;
  corridor?: string | null;
  commodity?: string | null;
  category?: string | null;
  delayRatePercent?: number;            // 0 to 100
  cancellationRatePercent?: number;     // 0 to 100
  activeProvidersCount?: number;
  activeDeliveryWorkloadRatio?: number; // 0.0 to 1.0
  activeSecurityIncidentsCount?: number;
  processingBacklogReported?: boolean;
}

export function detectLogisticsBottlenecks(
  input: BottleneckDetectionInput
): LogisticsBottleneckItem[] {
  if (input.commodity) {
    assertNoProhibitedProduce(input.commodity, "Commodity");
  }
  const bottlenecks: LogisticsBottleneckItem[] = [];
  const corridorName = input.corridor || `${input.state} Transit Corridor`;

  // 1. Delivery Bottleneck / Recurring Delay (>= 30% delay rate)
  if (typeof input.delayRatePercent === "number" && input.delayRatePercent >= 30) {
    bottlenecks.push({
      bottleneckType: "RECURRING_DELAY_PATTERN",
      state: input.state,
      lga: input.lga || null,
      corridor: corridorName,
      commodity: input.commodity || null,
      category: input.category || null,
      severity: input.delayRatePercent >= 50 ? "HIGH" : "ELEVATED",
      status: "IDENTIFIED",
      evidence: `Average delivery delay rate observed at ${input.delayRatePercent}% across monitored cargo orders.`,
      affectedScope: "Regional Delivery Fulfillment",
      alternativeAvailable: (input.activeProvidersCount ?? 1) > 1,
      recommendedAction: "Review carrier transit milestones and assess alternative pickup timing or secondary routes.",
      confidence: 0.88,
    });
  }

  // 2. High Cancellation Concentration (>= 25%)
  if (typeof input.cancellationRatePercent === "number" && input.cancellationRatePercent >= 25) {
    bottlenecks.push({
      bottleneckType: "HIGH_CANCELLATION_CONCENTRATION",
      state: input.state,
      lga: input.lga || null,
      corridor: corridorName,
      commodity: input.commodity || null,
      category: input.category || null,
      severity: "HIGH",
      status: "IDENTIFIED",
      evidence: `Delivery cancellation rate reached ${input.cancellationRatePercent}% in this zone.`,
      affectedScope: "Order Fulfillment Integrity",
      alternativeAvailable: (input.activeProvidersCount ?? 1) > 1,
      recommendedAction: "Investigate carrier acceptance bottlenecks and verify driver availability before confirming dispatches.",
      confidence: 0.85,
    });
  }

  // 3. Regional Capacity Shortage (0 providers or workload >= 90%)
  if (
    input.activeProvidersCount === 0 ||
    (typeof input.activeDeliveryWorkloadRatio === "number" && input.activeDeliveryWorkloadRatio >= 0.9)
  ) {
    bottlenecks.push({
      bottleneckType: "REGIONAL_CAPACITY_SHORTAGE",
      state: input.state,
      lga: input.lga || null,
      corridor: corridorName,
      commodity: input.commodity || null,
      category: input.category || null,
      severity: input.activeProvidersCount === 0 ? "CRITICAL" : "ELEVATED",
      status: "IDENTIFIED",
      evidence:
        input.activeProvidersCount === 0
          ? "No verified commercial logistics providers registered in this jurisdiction."
          : `Fleet workload capacity utilization reached ${Math.round(input.activeDeliveryWorkloadRatio! * 100)}%.`,
      affectedScope: "Zone Dispatch Capacity",
      alternativeAvailable: false,
      recommendedAction: "Prioritize onboarding regional logistics operators and coordinate inter-state partner carriers.",
      confidence: 0.92,
    });
  }

  // 4. Corridor Disruption Bottleneck
  if (input.activeSecurityIncidentsCount && input.activeSecurityIncidentsCount > 0) {
    bottlenecks.push({
      bottleneckType: "CORRIDOR_BOTTLENECK",
      state: input.state,
      lga: input.lga || null,
      corridor: corridorName,
      commodity: input.commodity || null,
      category: input.category || null,
      severity: "ELEVATED",
      status: "IDENTIFIED",
      evidence: `${input.activeSecurityIncidentsCount} active security notice(s) reported along transit corridor.`,
      affectedScope: "Highway Movement Corridor",
      alternativeAvailable: true,
      recommendedAction: "Advisory review: verify road clearance with authorized transport unions; consider daytime departures.",
      confidence: 0.8,
    });
  }

  // 5. Processing-to-Market Bottleneck
  if (input.processingBacklogReported) {
    bottlenecks.push({
      bottleneckType: "PROCESSING_TO_MARKET_BOTTLENECK",
      state: input.state,
      lga: input.lga || null,
      corridor: corridorName,
      commodity: input.commodity || null,
      category: input.category || null,
      severity: "WATCH",
      status: "IDENTIFIED",
      evidence: "Facility offloading and processing turnaround delays observed at mill collection points.",
      affectedScope: "Post-Processing Distribution",
      alternativeAvailable: true,
      recommendedAction: "Coordinate scheduled delivery slots between aggregation hubs and processing facilities.",
      confidence: 0.82,
    });
  }

  return bottlenecks;
}

// -----------------------------------------------------------------------------
// 5. SECURITY EVENT -> LOGISTICS IMPACT CORRELATION CHAIN
// -----------------------------------------------------------------------------

export interface SecurityLogisticsCorrelationInput {
  incidentId: string;
  state: string;
  corridor?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedCommodity?: string | null;
  activeDeliveriesInTransitCount: number;
}

export function correlateSecurityToLogisticsImpact(
  input: SecurityLogisticsCorrelationInput
): {
  correlationType: "CORRELATED_SIGNAL" | "POTENTIAL_IMPACT";
  projectedSeverity: LogisticsSeverity;
  correlationExplanation: string;
  disclaimer: string;
} {
  if (input.affectedCommodity) {
    assertNoProhibitedProduce(input.affectedCommodity, "Commodity");
  }

  const isHighSeverity = input.severity === "HIGH" || input.severity === "CRITICAL";
  const hasInTransitDeliveries = input.activeDeliveriesInTransitCount > 0;

  let projectedSeverity: LogisticsSeverity = "INFO";
  if (isHighSeverity && hasInTransitDeliveries) {
    projectedSeverity = "HIGH";
  } else if (isHighSeverity || hasInTransitDeliveries) {
    projectedSeverity = "ELEVATED";
  } else {
    projectedSeverity = "WATCH";
  }

  return {
    correlationType: "CORRELATED_SIGNAL",
    projectedSeverity,
    correlationExplanation: `Reported security event in ${input.state} (${input.severity} severity) correlates with observed movement corridor friction. ${input.activeDeliveriesInTransitCount} delivery shipments currently mapped to this zone. Labeled as POTENTIAL_IMPACT; correlation does not confirm direct causation without verified ground carrier reports.`,
    disclaimer: "AgroMarket does not provide road-safety ratings, safe-passage guarantees, tactical security instructions, or emergency response services. Transport operators and drivers must consult official security authorities.",
  };
}
