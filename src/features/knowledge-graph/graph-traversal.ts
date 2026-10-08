/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Graph Traversal Engine
 * Bounded graph neighborhood exploration and semantic pathfinding with cycle protection
 */

import {
  KnowledgeConcept,
  KnowledgeRelationship,
  NeighborhoodStep,
  KnowledgeRelationshipType,
} from "./types";
import {
  DEFAULT_MAX_NEIGHBORHOOD_DEPTH,
  ABSOLUTE_MAX_NEIGHBORHOOD_DEPTH,
  DEFAULT_MAX_NEIGHBORHOOD_NODES,
  ABSOLUTE_MAX_NEIGHBORHOOD_NODES,
} from "./constants";

export function traverseNeighborhoodInMemory(params: {
  conceptId: string;
  concepts: KnowledgeConcept[];
  relationships: KnowledgeRelationship[];
  maxDepth?: number;
  limit?: number;
  relationshipTypeFilter?: KnowledgeRelationshipType[];
  includeHistorical?: boolean;
}): NeighborhoodStep[] {
  const maxDepth = Math.min(
    Math.max(params.maxDepth ?? DEFAULT_MAX_NEIGHBORHOOD_DEPTH, 1),
    ABSOLUTE_MAX_NEIGHBORHOOD_DEPTH
  );
  const limit = Math.min(
    Math.max(params.limit ?? DEFAULT_MAX_NEIGHBORHOOD_NODES, 1),
    ABSOLUTE_MAX_NEIGHBORHOOD_NODES
  );

  const now = new Date().getTime();
  const conceptMap = new Map<string, KnowledgeConcept>();
  for (const c of params.concepts) {
    if (c.status === "REJECTED") continue;
    if (!params.includeHistorical && c.validUntil && new Date(c.validUntil).getTime() < now) {
      continue;
    }
    conceptMap.set(c.id, c);
  }

  // Filter active valid relationships
  const activeRelationships = params.relationships.filter((r) => {
    if (r.status === "REJECTED") return false;
    if (!params.includeHistorical && r.validUntil && new Date(r.validUntil).getTime() < now) {
      return false;
    }
    if (params.relationshipTypeFilter && !params.relationshipTypeFilter.includes(r.relationshipType)) {
      return false;
    }
    return true;
  });

  // Outgoing adjacency index
  const outgoingMap = new Map<string, KnowledgeRelationship[]>();
  for (const r of activeRelationships) {
    const list = outgoingMap.get(r.sourceConceptId) || [];
    list.push(r);
    outgoingMap.set(r.sourceConceptId, list);
  }

  const results: NeighborhoodStep[] = [];
  const visitedEdgeIds = new Set<string>();

  interface QueueItem {
    currentId: string;
    depth: number;
    path: string[];
  }

  const queue: QueueItem[] = [{
    currentId: params.conceptId,
    depth: 0,
    path: [params.conceptId],
  }];

  while (queue.length > 0 && results.length < limit) {
    const { currentId, depth, path } = queue.shift()!;
    if (depth >= maxDepth) continue;

    const edges = outgoingMap.get(currentId) || [];
    for (const edge of edges) {
      if (results.length >= limit) break;
      if (visitedEdgeIds.has(edge.id)) continue;

      const targetConcept = conceptMap.get(edge.targetConceptId);
      if (!targetConcept) continue;

      const cycleDetected = path.includes(edge.targetConceptId);
      visitedEdgeIds.add(edge.id);

      results.push({
        relationshipId: edge.id,
        sourceId: edge.sourceConceptId,
        relationshipType: edge.relationshipType,
        targetId: targetConcept.id,
        targetKey: targetConcept.conceptKey,
        targetName: targetConcept.canonicalName,
        targetType: targetConcept.conceptType,
        relationshipStrength: edge.relationshipStrength,
        confidence: edge.confidence,
        depth: depth + 1,
        path: [...path, edge.targetConceptId],
      });

      if (!cycleDetected && depth + 1 < maxDepth) {
        queue.push({
          currentId: edge.targetConceptId,
          depth: depth + 1,
          path: [...path, edge.targetConceptId],
        });
      }
    }
  }

  return results;
}

/**
 * Finds shortest semantic directed path between two concepts.
 */
export function findKnowledgePathInMemory(params: {
  sourceConceptId: string;
  targetConceptId: string;
  concepts: KnowledgeConcept[];
  relationships: KnowledgeRelationship[];
  maxDepth?: number;
}): KnowledgeRelationship[] | null {
  if (params.sourceConceptId === params.targetConceptId) return [];

  const maxDepth = Math.min(
    Math.max(params.maxDepth ?? DEFAULT_MAX_NEIGHBORHOOD_DEPTH, 1),
    ABSOLUTE_MAX_NEIGHBORHOOD_DEPTH
  );

  const outgoingMap = new Map<string, KnowledgeRelationship[]>();
  for (const r of params.relationships) {
    if (r.status === "REJECTED") continue;
    const list = outgoingMap.get(r.sourceConceptId) || [];
    list.push(r);
    outgoingMap.set(r.sourceConceptId, list);
  }

  interface QueueNode {
    conceptId: string;
    path: KnowledgeRelationship[];
    visitedIds: Set<string>;
  }

  const queue: QueueNode[] = [{
    conceptId: params.sourceConceptId,
    path: [],
    visitedIds: new Set([params.sourceConceptId]),
  }];

  while (queue.length > 0) {
    const { conceptId, path, visitedIds } = queue.shift()!;
    if (path.length >= maxDepth) continue;

    const edges = outgoingMap.get(conceptId) || [];
    for (const edge of edges) {
      if (edge.targetConceptId === params.targetConceptId) {
        return [...path, edge];
      }

      if (!visitedIds.has(edge.targetConceptId)) {
        const nextVisited = new Set(visitedIds);
        nextVisited.add(edge.targetConceptId);
        queue.push({
          conceptId: edge.targetConceptId,
          path: [...path, edge],
          visitedIds: nextVisited,
        });
      }
    }
  }

  return null;
}
