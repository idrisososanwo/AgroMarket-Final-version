/**
 * AgroMarket Phase 3.12: Alternative Dependency Paths Engine
 *
 * Discovers candidate alternative facilities, corridors, and suppliers:
 * - Direct alternatives linked via ALTERNATIVE_TO relationships
 * - Capable peers matching entity type, commodity, and geographic area
 *
 * Core Invariant:
 * ALTERNATIVE != GUARANTEED_CAPACITY
 * All structural alternatives carry explicit unverified capacity warnings
 * until verified operational evidence is attached.
 */

import {
  DependencyNodeType,
  DependencyRelationship,
  DependencyNode,
  PotentialAlternativesResult,
  PotentialAlternativeCandidate,
} from "./types";
import { ALTERNATIVE_PATH_CAVEAT } from "./constants";

/**
 * Discovers potential structural alternative paths for a constrained node.
 */
export function identifyPotentialAlternatives(params: {
  targetNodeType: DependencyNodeType;
  targetNodeId: string;
  targetLabel?: string;
  relationships: DependencyRelationship[];
  availableNodes?: DependencyNode[];
  commodityFilter?: string | null;
  stateFilter?: string | null;
}): PotentialAlternativesResult {
  const {
    targetNodeType,
    targetNodeId,
    targetLabel,
    relationships,
    availableNodes = [],
    commodityFilter = null,
    stateFilter = null,
  } = params;

  const candidates: PotentialAlternativeCandidate[] = [];
  const candidateIds = new Set<string>();

  // 1. Direct alternatives from ALTERNATIVE_TO relationships
  const directEdges = relationships.filter(
    (r) =>
      r.relationshipType === "ALTERNATIVE_TO" &&
      r.isActive &&
      ((r.sourceNodeType === targetNodeType && r.sourceNodeId === targetNodeId) ||
        (r.targetNodeType === targetNodeType && r.targetNodeId === targetNodeId))
  );

  for (const edge of directEdges) {
    const isSource = edge.sourceNodeId === targetNodeId;
    const altNodeType = isSource ? edge.targetNodeType : edge.sourceNodeType;
    const altNodeId = isSource ? edge.targetNodeId : edge.sourceNodeId;

    if (altNodeId === targetNodeId || candidateIds.has(altNodeId)) continue;
    candidateIds.add(altNodeId);

    const verified = Boolean(edge.metadata && edge.metadata.capacityVerified === true);

    candidates.push({
      nodeType: altNodeType,
      nodeId: altNodeId,
      label: (isSource ? edge.targetLabel : edge.sourceLabel) || `${altNodeType}:${altNodeId}`,
      state: edge.locationState || null,
      lga: edge.locationLga || null,
      commodity: edge.commodity || null,
      capacityEvidenceStatus: verified ? "VERIFIED" : "UNVERIFIED_CAPACITY",
      relationshipNature: "DIRECT_ALTERNATIVE",
      notes: "Linked via explicit ALTERNATIVE_TO edge.",
    });
  }

  // 2. Capable peers among available nodes
  for (const node of availableNodes) {
    if (node.id === targetNodeId || node.type !== targetNodeType) continue;
    if (candidateIds.has(node.id)) continue;

    // Match commodity if filter supplied
    if (commodityFilter && node.commodity) {
      if (node.commodity.toLowerCase() !== commodityFilter.toLowerCase()) continue;
    }

    // Match state if filter supplied
    if (stateFilter && node.state) {
      if (node.state.toLowerCase() !== stateFilter.toLowerCase()) continue;
    }

    candidateIds.add(node.id);
    const verified = Boolean(node.metadata && node.metadata.capacityVerified === true);

    candidates.push({
      nodeType: node.type,
      nodeId: node.id,
      label: node.label,
      state: node.state || null,
      lga: node.lga || null,
      commodity: node.commodity || null,
      capacityEvidenceStatus: verified ? "VERIFIED" : "UNVERIFIED_CAPACITY",
      relationshipNature: "CAPABLE_PEER",
      notes: "Structural peer matching commodity profile and geographic area.",
    });
  }

  return {
    targetNodeType,
    targetNodeId,
    targetLabel,
    commodity: commodityFilter,
    state: stateFilter,
    alternatives: candidates,
    caveat: ALTERNATIVE_PATH_CAVEAT,
  };
}
