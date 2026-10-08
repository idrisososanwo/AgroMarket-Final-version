/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Graph Query Interfaces
 * Reusable typed queries consumed by intelligence agents and administrative UI
 */

import {
  KnowledgeConcept,
  KnowledgeRelationship,
  HierarchyNode,
  NeighborhoodStep,
  KnowledgeContextPackage,
  KnowledgeConceptType,
  KnowledgeRelationshipType,
} from "./types";
import {
  getKnowledgeConceptById,
  getKnowledgeConceptByKey,
  getKnowledgeConcepts,
  getKnowledgeRelationships,
  getEntityLinks,
  executeHierarchyQuery,
  executeNeighborhoodQuery,
} from "./data-layer";
import { findKnowledgePathInMemory } from "./graph-traversal";
import { assembleKnowledgeContextPackage } from "./context-assembly";
import { sanitizeKnowledgeContextPackageForViewer } from "./privacy";
import { assertNoProhibitedProduceKnowledge } from "./validation";

// -----------------------------------------------------------------------------
// 1. CONCEPT RESOLUTION QUERIES
// -----------------------------------------------------------------------------

export async function getKnowledgeConcept(
  conceptKeyOrId: string
): Promise<KnowledgeConcept | null> {
  assertNoProhibitedProduceKnowledge(conceptKeyOrId, "Concept Lookup");

  // Try by ID first, then key
  const byId = await getKnowledgeConceptById(conceptKeyOrId);
  if (byId) return byId;

  return getKnowledgeConceptByKey(conceptKeyOrId);
}

export async function getKnowledgeChildren(
  conceptId: string
): Promise<KnowledgeConcept[]> {
  const all = await getKnowledgeConcepts();
  return all.filter((c) => c.parentConceptId === conceptId && c.status !== "REJECTED");
}

export async function getKnowledgeParents(
  conceptId: string
): Promise<KnowledgeConcept[]> {
  const concept = await getKnowledgeConceptById(conceptId);
  if (!concept || !concept.parentConceptId) return [];

  const parent = await getKnowledgeConceptById(concept.parentConceptId);
  return parent ? [parent] : [];
}

export async function getKnowledgeAncestors(
  conceptId: string,
  maxDepth = 3
): Promise<HierarchyNode[]> {
  return executeHierarchyQuery({
    rootConceptId: conceptId,
    direction: "ANCESTORS",
    maxDepth,
  });
}

export async function getKnowledgeDescendants(
  conceptId: string,
  maxDepth = 3
): Promise<HierarchyNode[]> {
  return executeHierarchyQuery({
    rootConceptId: conceptId,
    direction: "DESCENDANTS",
    maxDepth,
  });
}

// -----------------------------------------------------------------------------
// 2. GRAPH TOPOLOGY & PATH QUERIES
// -----------------------------------------------------------------------------

export async function getKnowledgeRelatedConcepts(
  conceptId: string,
  relationshipType?: KnowledgeRelationshipType
): Promise<Array<{ relationship: KnowledgeRelationship; concept: KnowledgeConcept }>> {
  const relationships = await getKnowledgeRelationships({
    conceptId,
    relationshipType,
    status: "PUBLISHED",
  });

  const results: Array<{ relationship: KnowledgeRelationship; concept: KnowledgeConcept }> = [];
  for (const rel of relationships) {
    const otherId = rel.sourceConceptId === conceptId ? rel.targetConceptId : rel.sourceConceptId;
    const otherConcept = await getKnowledgeConceptById(otherId);
    if (otherConcept && otherConcept.status !== "REJECTED") {
      results.push({
        relationship: rel,
        concept: otherConcept,
      });
    }
  }

  return results;
}

export async function getKnowledgeNeighborhood(
  conceptId: string,
  maxDepth = 2,
  limit = 50
): Promise<NeighborhoodStep[]> {
  return executeNeighborhoodQuery({
    conceptId,
    maxDepth,
    limit,
  });
}

export async function getKnowledgePath(
  sourceConceptId: string,
  targetConceptId: string,
  maxDepth = 3
): Promise<KnowledgeRelationship[] | null> {
  const concepts = await getKnowledgeConcepts();
  const relationships = await getKnowledgeRelationships();
  return findKnowledgePathInMemory({
    sourceConceptId,
    targetConceptId,
    concepts,
    relationships,
    maxDepth,
  });
}

// -----------------------------------------------------------------------------
// 3. AGENT CONTEXT ASSEMBLY INTERFACES
// -----------------------------------------------------------------------------

async function buildSanitizedContext(
  conceptKeyOrId: string,
  expectedType?: KnowledgeConceptType
): Promise<KnowledgeContextPackage | null> {
  const root = await getKnowledgeConcept(conceptKeyOrId);
  if (!root) return null;
  if (expectedType && root.conceptType !== expectedType && root.conceptType !== "COMMODITY") {
    // Allows flexible lookup if subtype matches
  }

  const allConcepts = await getKnowledgeConcepts();
  const allRelationships = await getKnowledgeRelationships();
  const allLinks = await getEntityLinks({ conceptId: root.id });

  const rawPackage = assembleKnowledgeContextPackage({
    rootConcept: root,
    allConcepts,
    allRelationships,
    allLinks,
  });

  return sanitizeKnowledgeContextPackageForViewer(rawPackage);
}

export async function getCommodityKnowledgeContext(
  commodityKeyOrId: string
): Promise<KnowledgeContextPackage | null> {
  assertNoProhibitedProduceKnowledge(commodityKeyOrId, "Commodity Context");
  return buildSanitizedContext(commodityKeyOrId, "COMMODITY");
}

export async function getProductionKnowledgeContext(
  productionKeyOrId: string
): Promise<KnowledgeContextPackage | null> {
  assertNoProhibitedProduceKnowledge(productionKeyOrId, "Production Context");
  return buildSanitizedContext(productionKeyOrId, "PRODUCTION_SYSTEM");
}

export async function getDiseaseKnowledgeContext(
  diseaseKeyOrId: string
): Promise<KnowledgeContextPackage | null> {
  assertNoProhibitedProduceKnowledge(diseaseKeyOrId, "Disease Context");
  return buildSanitizedContext(diseaseKeyOrId, "DISEASE");
}

export async function getRegionalKnowledgeContext(
  regionKeyOrId: string
): Promise<KnowledgeContextPackage | null> {
  assertNoProhibitedProduceKnowledge(regionKeyOrId, "Regional Context");
  return buildSanitizedContext(regionKeyOrId, "REGION");
}

export async function getMarketKnowledgeContext(
  marketKeyOrId: string
): Promise<KnowledgeContextPackage | null> {
  assertNoProhibitedProduceKnowledge(marketKeyOrId, "Market Context");
  return buildSanitizedContext(marketKeyOrId, "MARKET");
}

export async function getProcessingKnowledgeContext(
  processKeyOrId: string
): Promise<KnowledgeContextPackage | null> {
  assertNoProhibitedProduceKnowledge(processKeyOrId, "Processing Context");
  return buildSanitizedContext(processKeyOrId, "PROCESS");
}

export async function getFoodSecurityKnowledgeContext(
  conceptKeyOrId: string
): Promise<KnowledgeContextPackage | null> {
  assertNoProhibitedProduceKnowledge(conceptKeyOrId, "Food Security Context");
  return buildSanitizedContext(conceptKeyOrId, "FOOD_SECURITY_CONCEPT");
}

// -----------------------------------------------------------------------------
// 4. OVERVIEW & METRICS FOR OPERATIONAL UI
// -----------------------------------------------------------------------------

export interface KnowledgeOverviewMetrics {
  totalConcepts: number;
  totalRelationships: number;
  totalEntityLinks: number;
  countsByType: Record<string, number>;
  countsByStatus: Record<string, number>;
  recentVerifiedConcepts: KnowledgeConcept[];
  recentRelationships: Array<{
    relationship: KnowledgeRelationship;
    sourceName: string;
    targetName: string;
  }>;
}

export async function getKnowledgeOverviewMetrics(): Promise<KnowledgeOverviewMetrics> {
  const concepts = await getKnowledgeConcepts({ includeHistorical: true });
  const relationships = await getKnowledgeRelationships({ includeHistorical: true });
  const links = await getEntityLinks();

  const countsByType: Record<string, number> = {};
  const countsByStatus: Record<string, number> = {};

  for (const c of concepts) {
    countsByType[c.conceptType] = (countsByType[c.conceptType] || 0) + 1;
    countsByStatus[c.status] = (countsByStatus[c.status] || 0) + 1;
  }

  const conceptMap = new Map<string, KnowledgeConcept>();
  for (const c of concepts) {
    conceptMap.set(c.id, c);
  }

  const verified = concepts
    .filter((c) => c.status === "VERIFIED" || c.status === "PUBLISHED")
    .slice(0, 10);

  const recentRels = relationships.slice(0, 10).map((r) => ({
    relationship: r,
    sourceName: conceptMap.get(r.sourceConceptId)?.displayName || "Unknown Source",
    targetName: conceptMap.get(r.targetConceptId)?.displayName || "Unknown Target",
  }));

  return {
    totalConcepts: concepts.length,
    totalRelationships: relationships.length,
    totalEntityLinks: links.length,
    countsByType,
    countsByStatus,
    recentVerifiedConcepts: verified,
    recentRelationships: recentRels,
  };
}
