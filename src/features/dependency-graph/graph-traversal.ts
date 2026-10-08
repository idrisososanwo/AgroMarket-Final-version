/**
 * AgroMarket Phase 3.12: Bounded Agricultural Dependency Graph Traversal Engine
 *
 * Implements:
 * - Bounded BFS/DFS traversal with strict depth limits (default 3, max 5)
 * - Deterministic cycle detection preventing infinite recursion
 * - Hard node and edge circuit breakers
 * - Downstream dependency exposure compilation
 * - Strict non-causal advisory language
 */

import {
  DependencyNodeType,
  DependencyRelationship,
  DependencyCascadeResult,
  CascadePathStep,
  DownstreamExposureSummary,
  DependencyStrength,
} from "./types";
import {
  DEFAULT_MAX_TRAVERSAL_DEPTH,
  ABSOLUTE_MAX_TRAVERSAL_DEPTH,
  MAX_TRAVERSAL_NODES,
  DEPENDENCY_ADVISORY_DISCLAIMER,
} from "./constants";

const STRENGTH_SEVERITY_RANK: Record<DependencyStrength, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MODERATE: 3,
  LOW: 2,
  INSUFFICIENT_DATA: 1,
};

/**
 * Compares two dependency strengths and returns the stronger one.
 */
function pickStrongerStrength(a: DependencyStrength, b: DependencyStrength): DependencyStrength {
  return STRENGTH_SEVERITY_RANK[a] >= STRENGTH_SEVERITY_RANK[b] ? a : b;
}

/**
 * Traverses the agricultural dependency graph starting from a root node.
 * Evaluates active relationships and compiles all downstream cascade steps and exposures.
 */
export function traverseDependencyCascade(params: {
  rootNodeType: DependencyNodeType;
  rootNodeId: string;
  relationships: DependencyRelationship[];
  maxDepth?: number;
  commodityFilter?: string | null;
}): DependencyCascadeResult {
  const {
    rootNodeType,
    rootNodeId,
    relationships,
    maxDepth = DEFAULT_MAX_TRAVERSAL_DEPTH,
    commodityFilter = null,
  } = params;

  const effectiveMaxDepth = Math.min(
    Math.max(1, maxDepth),
    ABSOLUTE_MAX_TRAVERSAL_DEPTH
  );

  // Filter only active and temporally valid relationships
  const now = Date.now();
  const validEdges = relationships.filter((rel) => {
    if (!rel.isActive) return false;
    if (rel.validFrom && new Date(rel.validFrom).getTime() > now) return false;
    if (rel.validUntil && new Date(rel.validUntil).getTime() < now) return false;
    if (commodityFilter && rel.commodity) {
      if (rel.commodity.toLowerCase() !== commodityFilter.toLowerCase()) return false;
    }
    return true;
  });

  const steps: CascadePathStep[] = [];
  const visitedNodeKeys = new Set<string>();
  const exposuresMap = new Map<
    string,
    {
      nodeType: DependencyNodeType;
      nodeId: string;
      shortestDepth: number;
      pathCount: number;
      maxStrength: DependencyStrength;
      exposedCommodity: string | null;
      pathways: string[];
    }
  >();

  let cycleDetected = false;
  visitedNodeKeys.add(`${rootNodeType}:${rootNodeId}`);

  // Traversal queue: stores [nodeType, nodeId, currentDepth, currentPathNodeKeys]
  interface QueueItem {
    nodeType: DependencyNodeType;
    nodeId: string;
    depth: number;
    path: string[];
  }

  const queue: QueueItem[] = [
    {
      nodeType: rootNodeType,
      nodeId: rootNodeId,
      depth: 0,
      path: [`${rootNodeType}:${rootNodeId}`],
    },
  ];

  while (queue.length > 0) {
    if (visitedNodeKeys.size >= MAX_TRAVERSAL_NODES) {
      break; // Hard circuit breaker
    }

    const current = queue.shift()!;
    if (current.depth >= effectiveMaxDepth) {
      continue;
    }

    // Find outgoing relationships from current node
    const outgoing = validEdges.filter(
      (e) => e.sourceNodeType === current.nodeType && e.sourceNodeId === current.nodeId
    );

    for (const edge of outgoing) {
      const targetKey = `${edge.targetNodeType}:${edge.targetNodeId}`;

      // Cycle detection: Check if target is already in the current branch path
      if (current.path.includes(targetKey)) {
        cycleDetected = true;
        continue;
      }

      const nextDepth = current.depth + 1;
      const step: CascadePathStep = {
        depth: nextDepth,
        sourceNodeType: edge.sourceNodeType,
        sourceNodeId: edge.sourceNodeId,
        relationshipType: edge.relationshipType,
        targetNodeType: edge.targetNodeType,
        targetNodeId: edge.targetNodeId,
        relationshipNature: edge.relationshipNature,
        dependencyStrength: edge.dependencyStrength,
        confidence: edge.confidence,
        provenance: edge.provenance,
        commodity: edge.commodity ?? null,
        flowShare: edge.flowShare ?? null,
      };
      steps.push(step);

      visitedNodeKeys.add(targetKey);

      // Record / update downstream exposure summary
      const existingExposure = exposuresMap.get(targetKey);
      const pathwayStr = [...current.path, targetKey].join(" -> ");

      if (!existingExposure) {
        exposuresMap.set(targetKey, {
          nodeType: edge.targetNodeType,
          nodeId: edge.targetNodeId,
          shortestDepth: nextDepth,
          pathCount: 1,
          maxStrength: edge.dependencyStrength,
          exposedCommodity: edge.commodity ?? null,
          pathways: [pathwayStr],
        });
      } else {
        existingExposure.pathCount += 1;
        existingExposure.shortestDepth = Math.min(existingExposure.shortestDepth, nextDepth);
        existingExposure.maxStrength = pickStrongerStrength(
          existingExposure.maxStrength,
          edge.dependencyStrength
        );
        if (edge.commodity && !existingExposure.exposedCommodity) {
          existingExposure.exposedCommodity = edge.commodity;
        }
        existingExposure.pathways.push(pathwayStr);
      }

      // Enqueue next step
      queue.push({
        nodeType: edge.targetNodeType,
        nodeId: edge.targetNodeId,
        depth: nextDepth,
        path: [...current.path, targetKey],
      });
    }
  }

  // Format downstream exposures
  const downstreamExposures: DownstreamExposureSummary[] = Array.from(exposuresMap.values()).map(
    (exp) => ({
      nodeType: exp.nodeType,
      nodeId: exp.nodeId,
      shortestDepth: exp.shortestDepth,
      pathCount: exp.pathCount,
      maxStrength: exp.maxStrength,
      exposedCommodity: exp.exposedCommodity,
      exposurePathway: exp.pathways[0] || `${exp.nodeType}:${exp.nodeId}`,
    })
  );

  // Sort exposures: first by highest strength, then shortest depth
  downstreamExposures.sort((a, b) => {
    const strengthDiff =
      STRENGTH_SEVERITY_RANK[b.maxStrength] - STRENGTH_SEVERITY_RANK[a.maxStrength];
    if (strengthDiff !== 0) return strengthDiff;
    return a.shortestDepth - b.shortestDepth;
  });

  return {
    rootNodeType,
    rootNodeId,
    maxDepthEnforced: effectiveMaxDepth,
    traversedNodesCount: visitedNodeKeys.size,
    traversedEdgesCount: steps.length,
    cycleDetected,
    steps,
    downstreamExposures,
    advisoryDisclaimer: DEPENDENCY_ADVISORY_DISCLAIMER,
  };
}
