/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Context Assembly Engine
 * Assembles deterministic semantic knowledge context packages for intelligence agents
 */

import {
  KnowledgeConcept,
  KnowledgeRelationship,
  AgriculturalEntityLink,
  KnowledgeContextPackage,
} from "./types";
import { traverseHierarchyInMemory } from "./hierarchy-engine";
import {
  KNOWLEDGE_ADVISORY_DISCLAIMER,
  FOOD_HEALTH_DISCLAIMER,
  BIOSECURITY_DISCLAIMER,
} from "./constants";

export function assembleKnowledgeContextPackage(params: {
  rootConcept: KnowledgeConcept;
  allConcepts: KnowledgeConcept[];
  allRelationships: KnowledgeRelationship[];
  allLinks: AgriculturalEntityLink[];
  includeHistorical?: boolean;
}): KnowledgeContextPackage {
  const { rootConcept, allConcepts, allRelationships, allLinks, includeHistorical } = params;

  // 1. Ancestors
  const ancestors = traverseHierarchyInMemory({
    rootConceptId: rootConcept.id,
    direction: "ANCESTORS",
    concepts: allConcepts,
    maxDepth: 3,
    includeHistorical,
  });

  // 2. Direct children
  const now = new Date().getTime();
  const children = allConcepts.filter((c) => {
    if (c.parentConceptId !== rootConcept.id) return false;
    if (c.status === "REJECTED") return false;
    if (!includeHistorical && c.validUntil && new Date(c.validUntil).getTime() < now) {
      return false;
    }
    return true;
  });

  // 3. Map for fast concept lookup
  const conceptMap = new Map<string, KnowledgeConcept>();
  for (const c of allConcepts) {
    conceptMap.set(c.id, c);
  }

  // 4. Related relationships (both incoming and outgoing)
  const relatedRelationships: KnowledgeContextPackage["relatedRelationships"] = [];

  for (const rel of allRelationships) {
    if (rel.status === "REJECTED") continue;
    if (!includeHistorical && rel.validUntil && new Date(rel.validUntil).getTime() < now) {
      continue;
    }

    if (rel.sourceConceptId === rootConcept.id) {
      const target = conceptMap.get(rel.targetConceptId);
      if (target) {
        relatedRelationships.push({
          relationship: rel,
          relatedConcept: target,
          direction: "OUTGOING",
        });
      }
    } else if (rel.targetConceptId === rootConcept.id) {
      const source = conceptMap.get(rel.sourceConceptId);
      if (source) {
        relatedRelationships.push({
          relationship: rel,
          relatedConcept: source,
          direction: "INCOMING",
        });
      }
    }
  }

  // 5. Linked entities
  const linkedEntities = allLinks.filter((l) => l.conceptId === rootConcept.id);

  // 6. Context flags
  const hasFoodHealth =
    rootConcept.conceptType === "FOOD_HEALTH_CONCEPT" ||
    relatedRelationships.some(
      (rr) =>
        rr.relationship.relationshipType === "HAS_FOOD_HEALTH_CONTEXT" ||
        rr.relatedConcept.conceptType === "FOOD_HEALTH_CONCEPT"
    );

  const hasBiosecurity =
    rootConcept.conceptType === "DISEASE" ||
    rootConcept.conceptType === "BIOSECURITY_CONCEPT" ||
    relatedRelationships.some(
      (rr) =>
        rr.relationship.relationshipType === "AFFECTED_BY" ||
        rr.relationship.relationshipType === "AT_RISK_FROM" ||
        rr.relatedConcept.conceptType === "DISEASE"
    );

  const isGeographicallyScoped =
    rootConcept.conceptType === "REGION" ||
    rootConcept.conceptType === "STATE" ||
    rootConcept.conceptType === "LGA" ||
    rootConcept.geographicScope !== "NATIONAL";

  let advisoryNotice = KNOWLEDGE_ADVISORY_DISCLAIMER;
  if (hasFoodHealth) {
    advisoryNotice += ` ${FOOD_HEALTH_DISCLAIMER}`;
  }
  if (hasBiosecurity) {
    advisoryNotice += ` ${BIOSECURITY_DISCLAIMER}`;
  }

  return {
    concept: rootConcept,
    ancestors,
    children,
    relatedRelationships,
    linkedEntities,
    contextMetadata: {
      totalRelationships: relatedRelationships.length,
      hasFoodHealthContext: hasFoodHealth,
      hasBiosecurityRisk: hasBiosecurity,
      isGeographicallyScoped,
      advisoryNotice,
    },
  };
}
