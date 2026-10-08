/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Hierarchy Engine
 * Handles parent-child taxonomy traversal (Ancestors / Descendants) with cycle detection
 */

import { KnowledgeConcept, HierarchyNode } from "./types";
import { ABSOLUTE_MAX_HIERARCHY_DEPTH, DEFAULT_MAX_HIERARCHY_DEPTH } from "./constants";

/**
 * Validates whether setting `parentConceptId` on `conceptId` would form a cycle.
 */
export function detectHierarchyCycle(
  conceptId: string,
  proposedParentId: string,
  conceptsMap: Map<string, KnowledgeConcept>
): boolean {
  if (conceptId === proposedParentId) return true;

  let currentId: string | null = proposedParentId;
  const visited = new Set<string>([conceptId]);

  while (currentId) {
    if (visited.has(currentId)) {
      return true;
    }
    visited.add(currentId);
    const parent = conceptsMap.get(currentId);
    currentId = parent?.parentConceptId ?? null;
  }

  return false;
}

/**
 * Traverses parent-child hierarchy in a specified direction with cycle protection.
 */
export function traverseHierarchyInMemory(params: {
  rootConceptId: string;
  direction: "ANCESTORS" | "DESCENDANTS";
  concepts: KnowledgeConcept[];
  maxDepth?: number;
  includeHistorical?: boolean;
}): HierarchyNode[] {
  const maxDepth = Math.min(
    Math.max(params.maxDepth ?? DEFAULT_MAX_HIERARCHY_DEPTH, 1),
    ABSOLUTE_MAX_HIERARCHY_DEPTH
  );

  const now = new Date().getTime();
  const validConcepts = params.concepts.filter((c) => {
    if (c.status === "REJECTED") return false;
    if (!params.includeHistorical && c.validUntil) {
      return new Date(c.validUntil).getTime() >= now;
    }
    return true;
  });

  const conceptMap = new Map<string, KnowledgeConcept>();
  for (const c of validConcepts) {
    conceptMap.set(c.id, c);
  }

  const root = conceptMap.get(params.rootConceptId);
  if (!root) return [];

  const results: HierarchyNode[] = [];

  if (params.direction === "ANCESTORS") {
    let current: KnowledgeConcept | undefined = root;
    let depth = 0;
    const path: string[] = [];

    while (current && depth <= maxDepth) {
      const cycleDetected = path.includes(current.id);
      path.push(current.id);

      results.push({
        conceptId: current.id,
        conceptKey: current.conceptKey,
        canonicalName: current.canonicalName,
        displayName: current.displayName,
        conceptType: current.conceptType,
        parentConceptId: current.parentConceptId,
        depth,
        path: [...path],
        cycleDetected,
      });

      if (cycleDetected || !current.parentConceptId) break;

      current = conceptMap.get(current.parentConceptId);
      depth++;
    }
  } else {
    // DESCENDANTS (BFS traversal)
    // Build parent-to-children index
    const childrenMap = new Map<string, KnowledgeConcept[]>();
    for (const c of validConcepts) {
      if (c.parentConceptId) {
        const list = childrenMap.get(c.parentConceptId) || [];
        list.push(c);
        childrenMap.set(c.parentConceptId, list);
      }
    }

    interface QueueItem {
      concept: KnowledgeConcept;
      depth: number;
      path: string[];
    }

    const queue: QueueItem[] = [{
      concept: root,
      depth: 0,
      path: [root.id],
    }];

    while (queue.length > 0) {
      const item = queue.shift()!;
      const { concept, depth, path } = item;

      const isRoot = depth === 0;
      const cycleDetected = !isRoot && path.slice(0, -1).includes(concept.id);

      results.push({
        conceptId: concept.id,
        conceptKey: concept.conceptKey,
        canonicalName: concept.canonicalName,
        displayName: concept.displayName,
        conceptType: concept.conceptType,
        parentConceptId: concept.parentConceptId,
        depth,
        path: [...path],
        cycleDetected,
      });

      if (cycleDetected || depth >= maxDepth) continue;

      const children = childrenMap.get(concept.id) || [];
      for (const child of children) {
        queue.push({
          concept: child,
          depth: depth + 1,
          path: [...path, child.id],
        });
      }
    }
  }

  return results;
}
