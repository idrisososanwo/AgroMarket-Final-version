/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Graph Privacy & Masking Layer
 * Sanitizes metadata and relationships to preserve privacy and commercial confidentiality
 */

import {
  KnowledgeConcept,
  KnowledgeRelationship,
  AgriculturalEntityLink,
  KnowledgeContextPackage,
} from "./types";

/**
 * Strips sensitive PII and confidential operational commercial terms from metadata.
 */
export function sanitizeKnowledgeMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!metadata) return {};

  const clean: Record<string, unknown> = {};
  const prohibitedKeys = [
    "phone",
    "phoneNumber",
    "email",
    "price",
    "cost",
    "buyerPrice",
    "sellerPrice",
    "gps",
    "latitude",
    "longitude",
    "exactAddress",
    "accountNumber",
    "bvn",
    "tin",
  ];

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    const isProhibited = prohibitedKeys.some((p) => lowerKey.includes(p.toLowerCase()));
    if (!isProhibited) {
      clean[key] = value;
    }
  }

  return clean;
}

/**
 * Sanitizes a concept for public presentation.
 */
export function sanitizeKnowledgeConceptForViewer(
  concept: KnowledgeConcept
): KnowledgeConcept {
  return {
    ...concept,
    metadata: sanitizeKnowledgeMetadata(concept.metadata),
  };
}

/**
 * Sanitizes a relationship for public presentation.
 */
export function sanitizeKnowledgeRelationshipForViewer(
  relationship: KnowledgeRelationship
): KnowledgeRelationship {
  return {
    ...relationship,
    metadata: sanitizeKnowledgeMetadata(relationship.metadata),
  };
}

/**
 * Sanitizes an entity link for public presentation.
 */
export function sanitizeEntityLinkForViewer(
  link: AgriculturalEntityLink
): AgriculturalEntityLink {
  return {
    ...link,
    metadata: sanitizeKnowledgeMetadata(link.metadata),
  };
}

/**
 * Sanitizes an entire context package for public or non-admin consumption.
 */
export function sanitizeKnowledgeContextPackageForViewer(
  pkg: KnowledgeContextPackage
): KnowledgeContextPackage {
  return {
    ...pkg,
    concept: sanitizeKnowledgeConceptForViewer(pkg.concept),
    children: pkg.children.map(sanitizeKnowledgeConceptForViewer),
    relatedRelationships: pkg.relatedRelationships.map((rr) => ({
      ...rr,
      relationship: sanitizeKnowledgeRelationshipForViewer(rr.relationship),
      relatedConcept: sanitizeKnowledgeConceptForViewer(rr.relatedConcept),
    })),
    linkedEntities: pkg.linkedEntities.map(sanitizeEntityLinkForViewer),
  };
}
