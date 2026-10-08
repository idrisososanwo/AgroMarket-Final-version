/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Graph & Ontology Foundation
 * Domain Contracts, Types, and Interfaces
 */

import { NigerianState } from "@/features/marketplace/constants";

// -----------------------------------------------------------------------------
// 1. CONCEPT TAXONOMY ENUMS
// -----------------------------------------------------------------------------

export const KNOWLEDGE_CONCEPT_TYPES = [
  "COMMODITY",
  "CROP",
  "LIVESTOCK",
  "POULTRY",
  "AQUACULTURE",
  "INPUT",
  "DISEASE",
  "BIOSECURITY_CONCEPT",
  "PROCESS",
  "PRODUCTION_SYSTEM",
  "VALUE_CHAIN_STAGE",
  "PROCESSING_OUTPUT",
  "MARKET",
  "REGION",
  "STATE",
  "LGA",
  "LOGISTICS_CONCEPT",
  "LOGISTICS_CORRIDOR",
  "EQUIPMENT",
  "SERVICE",
  "FOOD_SECURITY_CONCEPT",
  "FOOD_HEALTH_CONCEPT",
  "AGRICULTURAL_PRACTICE",
  "KNOWLEDGE_TOPIC",
  "KNOWLEDGE_CONTENT",
  "ORGANIZATION_TYPE",
] as const;

export type KnowledgeConceptType = (typeof KNOWLEDGE_CONCEPT_TYPES)[number];

// -----------------------------------------------------------------------------
// 2. RELATIONSHIP VOCABULARY ENUMS
// -----------------------------------------------------------------------------

export const KNOWLEDGE_RELATIONSHIP_TYPES = [
  "IS_A",
  "PART_OF",
  "RELATED_TO",
  "PRODUCES",
  "REQUIRES",
  "USED_FOR",
  "GROWS_IN",
  "COMMON_IN",
  "PROCESSED_INTO",
  "PROCESSED_BY",
  "SOLD_IN",
  "DEMANDED_BY",
  "TRANSPORTED_THROUGH",
  "AFFECTED_BY",
  "AT_RISK_FROM",
  "HAS_INPUT",
  "HAS_PROCESS",
  "HAS_MARKET",
  "HAS_VALUE_CHAIN_STAGE",
  "HAS_OUTPUT",
  "ALTERNATIVE_TO",
  "SIMILAR_TO",
  "PRECEDES",
  "FOLLOWS",
  "ASSOCIATED_WITH",
  "HAS_KNOWLEDGE",
  "HAS_FOOD_HEALTH_CONTEXT",
] as const;

export type KnowledgeRelationshipType = (typeof KNOWLEDGE_RELATIONSHIP_TYPES)[number];

// -----------------------------------------------------------------------------
// 3. QUALITY, PROVENANCE, CONFIDENCE & SCOPE
// -----------------------------------------------------------------------------

export const KNOWLEDGE_QUALITY_STATUSES = [
  "DRAFT",
  "REVIEW",
  "VERIFIED",
  "PUBLISHED",
  "ARCHIVED",
  "REJECTED",
] as const;

export type KnowledgeQualityStatus = (typeof KNOWLEDGE_QUALITY_STATUSES)[number];

export const KNOWLEDGE_PROVENANCES = [
  "OBSERVED",
  "DERIVED",
  "CORRELATED",
  "ESTIMATED",
  "EXTERNAL_SOURCE",
  "EDITORIAL",
  "SYSTEM_IMPORTED",
  "INSUFFICIENT_DATA",
] as const;

export type KnowledgeProvenance = (typeof KNOWLEDGE_PROVENANCES)[number];

export const KNOWLEDGE_CONFIDENCES = [
  "HIGH",
  "MODERATE",
  "LOW",
  "INSUFFICIENT_DATA",
] as const;

export type KnowledgeConfidence = (typeof KNOWLEDGE_CONFIDENCES)[number];

export const KNOWLEDGE_GEOGRAPHIC_SCOPES = [
  "NATIONAL",
  "REGIONAL_CORRIDOR",
  "STATE",
  "LGA",
  "GLOBAL",
] as const;

export type KnowledgeGeographicScope = (typeof KNOWLEDGE_GEOGRAPHIC_SCOPES)[number];

export const RELATIONSHIP_STRENGTHS = [
  "WEAK",
  "MODERATE",
  "STRONG",
  "CRITICAL",
  "INSUFFICIENT_DATA",
] as const;

export type RelationshipStrength = (typeof RELATIONSHIP_STRENGTHS)[number];

// -----------------------------------------------------------------------------
// 4. ENTITY LINKING ENUMS
// -----------------------------------------------------------------------------

export const LINKED_ENTITY_TYPES = [
  "PRODUCT",
  "LISTING",
  "FARM",
  "PRODUCTION_UNIT",
  "PRODUCTION_OUTPUT",
  "AGGREGATION_POOL",
  "PROCESSING_FACILITY",
  "PROCESSING_EVENT",
  "B2B_DEMAND",
  "LOGISTICS_PROVIDER",
  "LOGISTICS_CORRIDOR",
  "EQUIPMENT",
  "SERVICE",
  "KNOWLEDGE_CONTENT",
] as const;

export type LinkedEntityType = (typeof LINKED_ENTITY_TYPES)[number];

export const ENTITY_LINK_NATURES = [
  "CANONICAL",
  "INSTANCE_OF",
  "EXEMPLAR",
  "RELATED_OPERATIONAL",
] as const;

export type EntityLinkNature = (typeof ENTITY_LINK_NATURES)[number];

// -----------------------------------------------------------------------------
// 5. DOMAIN INTERFACES
// -----------------------------------------------------------------------------

export interface KnowledgeConcept {
  id: string;
  conceptKey: string;
  canonicalName: string;
  displayName: string;
  conceptType: KnowledgeConceptType;
  description: string | null;
  parentConceptId: string | null;
  status: KnowledgeQualityStatus;
  provenance: KnowledgeProvenance;
  confidence: KnowledgeConfidence;
  geographicScope: KnowledgeGeographicScope;
  sourceReference: string | null;
  metadata: Record<string, unknown>;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeRelationship {
  id: string;
  sourceConceptId: string;
  relationshipType: KnowledgeRelationshipType;
  targetConceptId: string;
  inverseRelationshipType: string | null;
  relationshipStrength: RelationshipStrength;
  confidence: KnowledgeConfidence;
  provenance: KnowledgeProvenance;
  geographicScope: KnowledgeGeographicScope;
  locationState: NigerianState | string | null;
  locationLga: string | null;
  status: KnowledgeQualityStatus;
  validFrom: string;
  validUntil: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgriculturalEntityLink {
  id: string;
  conceptId: string;
  entityType: LinkedEntityType;
  entityId: string;
  linkNature: EntityLinkNature;
  confidence: KnowledgeConfidence;
  provenance: KnowledgeProvenance;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 6. TRAVERSAL & CONTEXT INTERFACES
// -----------------------------------------------------------------------------

export interface HierarchyNode {
  conceptId: string;
  conceptKey: string;
  canonicalName: string;
  displayName: string;
  conceptType: KnowledgeConceptType;
  parentConceptId: string | null;
  depth: number;
  path: string[];
  cycleDetected: boolean;
}

export interface NeighborhoodStep {
  relationshipId: string;
  sourceId: string;
  relationshipType: KnowledgeRelationshipType;
  targetId: string;
  targetKey: string;
  targetName: string;
  targetType: KnowledgeConceptType;
  relationshipStrength: RelationshipStrength;
  confidence: KnowledgeConfidence;
  depth: number;
  path: string[];
}

export interface KnowledgeContextPackage {
  concept: KnowledgeConcept;
  ancestors: HierarchyNode[];
  children: KnowledgeConcept[];
  relatedRelationships: Array<{
    relationship: KnowledgeRelationship;
    relatedConcept: KnowledgeConcept;
    direction: "OUTGOING" | "INCOMING";
  }>;
  linkedEntities: AgriculturalEntityLink[];
  contextMetadata: {
    totalRelationships: number;
    hasFoodHealthContext: boolean;
    hasBiosecurityRisk: boolean;
    isGeographicallyScoped: boolean;
    advisoryNotice: string;
  };
}

// -----------------------------------------------------------------------------
// 7. INPUT CONTRACTS
// -----------------------------------------------------------------------------

export interface CreateKnowledgeConceptInput {
  conceptKey: string;
  canonicalName: string;
  displayName: string;
  conceptType: KnowledgeConceptType;
  description?: string | null;
  parentConceptId?: string | null;
  status?: KnowledgeQualityStatus;
  provenance?: KnowledgeProvenance;
  confidence?: KnowledgeConfidence;
  geographicScope?: KnowledgeGeographicScope;
  sourceReference?: string | null;
  metadata?: Record<string, unknown>;
  validFrom?: string;
  validUntil?: string | null;
}

export interface CreateKnowledgeRelationshipInput {
  sourceConceptId: string;
  relationshipType: KnowledgeRelationshipType;
  targetConceptId: string;
  inverseRelationshipType?: string | null;
  relationshipStrength?: RelationshipStrength;
  confidence?: KnowledgeConfidence;
  provenance?: KnowledgeProvenance;
  geographicScope?: KnowledgeGeographicScope;
  locationState?: NigerianState | string | null;
  locationLga?: string | null;
  status?: KnowledgeQualityStatus;
  validFrom?: string;
  validUntil?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateEntityLinkInput {
  conceptId: string;
  entityType: LinkedEntityType;
  entityId: string;
  linkNature?: EntityLinkNature;
  confidence?: KnowledgeConfidence;
  provenance?: KnowledgeProvenance;
  metadata?: Record<string, unknown>;
}

export interface TraverseHierarchyInput {
  rootConceptId: string;
  direction?: "ANCESTORS" | "DESCENDANTS";
  maxDepth?: number;
  includeHistorical?: boolean;
}

export interface TraverseNeighborhoodInput {
  conceptId: string;
  maxDepth?: number;
  limit?: number;
  relationshipTypeFilter?: KnowledgeRelationshipType[];
  includeHistorical?: boolean;
}
