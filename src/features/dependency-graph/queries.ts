/**
 * AgroMarket Phase 3.12: Agricultural Dependency Graph Queries
 *
 * Reusable query interfaces exposed for consumption by:
 * - Market Intelligence Agent
 * - Production Planning Agent
 * - Demand Forecasting Agent
 * - Supply Matching Agent
 * - Procurement Intelligence Agent
 * - Food Security Resilience Agent
 * - Logistics Intelligence Agent
 * - Disease & Biosecurity Agent
 * - Agricultural Intelligence Orchestrator
 */

import {
  DependencyNodeType,
  DependencyCascadeResult,
  ConcentrationAnalysisResult,
  PotentialAlternativesResult,
  DependencyAssessment,
  DependencyNode,
} from "./types";
import {
  getDependencyRelationships,
  getDependencyAssessments,
  executeDependencyCascadeQuery,
} from "./data-layer";
import {
  calculateConcentrationRisk,
  ConcentrationObservation,
} from "./concentration-engine";
import { identifyPotentialAlternatives } from "./alternative-paths";

/**
 * Retrieves the full dependency cascade propagating downstream from a root entity.
 */
export async function getDependencyCascade(
  rootNodeType: DependencyNodeType,
  rootNodeId: string,
  maxDepth: number = 3,
  commodityFilter?: string | null
): Promise<DependencyCascadeResult> {
  return executeDependencyCascadeQuery({
    rootNodeType,
    rootNodeId,
    maxDepth,
    commodityFilter,
  });
}

/**
 * Returns downstream dependency exposure summary for an entity.
 */
export async function getDependencyExposure(
  nodeType: DependencyNodeType,
  nodeId: string,
  commodityFilter?: string | null
) {
  const cascade = await executeDependencyCascadeQuery({
    rootNodeType: nodeType,
    rootNodeId: nodeId,
    maxDepth: 3,
    commodityFilter,
  });

  return {
    subjectType: nodeType,
    subjectId: nodeId,
    totalDownstreamExposures: cascade.downstreamExposures.length,
    criticalExposures: cascade.downstreamExposures.filter(
      (e) => e.maxStrength === "CRITICAL"
    ),
    highExposures: cascade.downstreamExposures.filter(
      (e) => e.maxStrength === "HIGH"
    ),
    exposures: cascade.downstreamExposures,
    advisoryDisclaimer: cascade.advisoryDisclaimer,
  };
}

/**
 * Computes supplier concentration risk for an off-taker, buyer, or commodity pool.
 */
export function getSupplierConcentration(params: {
  subjectId: string;
  observations: ConcentrationObservation[];
}): ConcentrationAnalysisResult {
  return calculateConcentrationRisk({
    subjectType: "B2B_DEMAND",
    subjectId: params.subjectId,
    concentrationType: "SUPPLIER",
    observations: params.observations,
  });
}

/**
 * Computes processing throughput bottleneck concentration for a region or commodity.
 */
export function getProcessingConcentration(params: {
  subjectId: string;
  observations: ConcentrationObservation[];
}): ConcentrationAnalysisResult {
  return calculateConcentrationRisk({
    subjectType: "PROCESSING_FACILITY",
    subjectId: params.subjectId,
    concentrationType: "PROCESSING",
    observations: params.observations,
  });
}

/**
 * Computes logistics corridor dependency for a transit route.
 */
export function getCorridorDependency(params: {
  corridorName: string;
  observations: ConcentrationObservation[];
}): ConcentrationAnalysisResult {
  return calculateConcentrationRisk({
    subjectType: "LOGISTICS_CORRIDOR",
    subjectId: params.corridorName,
    concentrationType: "CORRIDOR",
    observations: params.observations,
  });
}

/**
 * Computes regional origin concentration for a commodity.
 */
export function getRegionalDependency(params: {
  commodity: string;
  observations: ConcentrationObservation[];
}): ConcentrationAnalysisResult {
  return calculateConcentrationRisk({
    subjectType: "COMMODITY",
    subjectId: params.commodity,
    concentrationType: "REGIONAL",
    observations: params.observations,
  });
}

/**
 * Discovers potential alternative facilities, corridors, or suppliers for an exposed node.
 */
export async function getPotentialAlternativePaths(params: {
  targetNodeType: DependencyNodeType;
  targetNodeId: string;
  targetLabel?: string;
  commodity?: string | null;
  state?: string | null;
  availableNodes?: DependencyNode[];
}): Promise<PotentialAlternativesResult> {
  const relationships = await getDependencyRelationships({
    isActiveOnly: true,
  });

  return identifyPotentialAlternatives({
    targetNodeType: params.targetNodeType,
    targetNodeId: params.targetNodeId,
    targetLabel: params.targetLabel,
    relationships,
    availableNodes: params.availableNodes,
    commodityFilter: params.commodity,
    stateFilter: params.state,
  });
}

/**
 * Retrieves high and critical dependency assessments recorded in the system.
 */
export async function getCriticalDependencies(filters?: {
  commodity?: string | null;
  locationState?: string | null;
}): Promise<DependencyAssessment[]> {
  const critical = await getDependencyAssessments({
    classification: "CRITICAL_DEPENDENCY",
  });
  const high = await getDependencyAssessments({
    classification: "HIGH_DEPENDENCY",
  });

  const combined = [...critical, ...high];
  if (!filters?.commodity && !filters?.locationState) {
    return combined;
  }

  return combined.filter((a) => {
    if (
      filters.commodity &&
      a.affectedCommodity?.toLowerCase() !== filters.commodity.toLowerCase()
    ) {
      return false;
    }
    if (
      filters.locationState &&
      a.locationState?.toLowerCase() !== filters.locationState.toLowerCase()
    ) {
      return false;
    }
    return true;
  });
}
