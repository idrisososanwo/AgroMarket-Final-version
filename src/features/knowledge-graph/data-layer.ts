/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Graph Data Layer
 * Handles Supabase persistence with in-memory fallback for testing
 */

import { createClient } from "@/lib/supabase/server";
import {
  KnowledgeConcept,
  KnowledgeRelationship,
  AgriculturalEntityLink,
  HierarchyNode,
  NeighborhoodStep,
  KnowledgeConceptType,
  KnowledgeRelationshipType,
  KnowledgeQualityStatus,
  KnowledgeProvenance,
  KnowledgeConfidence,
  KnowledgeGeographicScope,
  RelationshipStrength,
  LinkedEntityType,
  EntityLinkNature,
} from "./types";
import { traverseHierarchyInMemory } from "./hierarchy-engine";
import { traverseNeighborhoodInMemory } from "./graph-traversal";

// -----------------------------------------------------------------------------
// IN-MEMORY STORE (Fallback & Test Environment)
// -----------------------------------------------------------------------------

const inMemoryConcepts = new Map<string, KnowledgeConcept>();
const inMemoryRelationships = new Map<string, KnowledgeRelationship>();
const inMemoryLinks = new Map<string, AgriculturalEntityLink>();

export function resetInMemoryKnowledgeGraph(): void {
  inMemoryConcepts.clear();
  inMemoryRelationships.clear();
  inMemoryLinks.clear();
}

// -----------------------------------------------------------------------------
// ROW MAPPERS
// -----------------------------------------------------------------------------

interface DbConceptRow {
  id: string;
  concept_key: string;
  canonical_name: string;
  display_name: string;
  concept_type: string;
  description: string | null;
  parent_concept_id: string | null;
  status: string;
  provenance: string;
  confidence: string;
  geographic_scope: string;
  source_reference: string | null;
  metadata: Record<string, unknown>;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

interface DbRelationshipRow {
  id: string;
  source_concept_id: string;
  relationship_type: string;
  target_concept_id: string;
  inverse_relationship_type: string | null;
  relationship_strength: string;
  confidence: string;
  provenance: string;
  geographic_scope: string;
  location_state: string | null;
  location_lga: string | null;
  status: string;
  valid_from: string;
  valid_until: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface DbEntityLinkRow {
  id: string;
  concept_id: string;
  entity_type: string;
  entity_id: string;
  link_nature: string;
  confidence: string;
  provenance: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function mapDbConceptToDomain(row: DbConceptRow): KnowledgeConcept {
  return {
    id: row.id,
    conceptKey: row.concept_key,
    canonicalName: row.canonical_name,
    displayName: row.display_name,
    conceptType: row.concept_type as KnowledgeConceptType,
    description: row.description,
    parentConceptId: row.parent_concept_id,
    status: row.status as KnowledgeQualityStatus,
    provenance: row.provenance as KnowledgeProvenance,
    confidence: row.confidence as KnowledgeConfidence,
    geographicScope: row.geographic_scope as KnowledgeGeographicScope,
    sourceReference: row.source_reference,
    metadata: row.metadata || {},
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbRelationshipToDomain(row: DbRelationshipRow): KnowledgeRelationship {
  return {
    id: row.id,
    sourceConceptId: row.source_concept_id,
    relationshipType: row.relationship_type as KnowledgeRelationshipType,
    targetConceptId: row.target_concept_id,
    inverseRelationshipType: row.inverse_relationship_type,
    relationshipStrength: row.relationship_strength as RelationshipStrength,
    confidence: row.confidence as KnowledgeConfidence,
    provenance: row.provenance as KnowledgeProvenance,
    geographicScope: row.geographic_scope as KnowledgeGeographicScope,
    locationState: row.location_state,
    locationLga: row.location_lga,
    status: row.status as KnowledgeQualityStatus,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbLinkToDomain(row: DbEntityLinkRow): AgriculturalEntityLink {
  return {
    id: row.id,
    conceptId: row.concept_id,
    entityType: row.entity_type as LinkedEntityType,
    entityId: row.entity_id,
    linkNature: row.link_nature as EntityLinkNature,
    confidence: row.confidence as KnowledgeConfidence,
    provenance: row.provenance as KnowledgeProvenance,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// -----------------------------------------------------------------------------
// REPOSITORY METHODS: CONCEPTS
// -----------------------------------------------------------------------------

export async function saveKnowledgeConcept(
  concept: KnowledgeConcept
): Promise<KnowledgeConcept> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_knowledge_concepts")
      .upsert({
        id: concept.id,
        concept_key: concept.conceptKey,
        canonical_name: concept.canonicalName,
        display_name: concept.displayName,
        concept_type: concept.conceptType,
        description: concept.description,
        parent_concept_id: concept.parentConceptId,
        status: concept.status,
        provenance: concept.provenance,
        confidence: concept.confidence,
        geographic_scope: concept.geographicScope,
        source_reference: concept.sourceReference,
        metadata: concept.metadata,
        valid_from: concept.validFrom,
        valid_until: concept.validUntil,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw error || new Error("Failed to persist knowledge concept in DB");
    }

    const saved = mapDbConceptToDomain(data as DbConceptRow);
    inMemoryConcepts.set(saved.id, saved);
    return saved;
  } catch {
    inMemoryConcepts.set(concept.id, concept);
    return concept;
  }
}

export async function getKnowledgeConceptById(
  id: string
): Promise<KnowledgeConcept | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_knowledge_concepts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return inMemoryConcepts.get(id) ?? null;
    }

    return mapDbConceptToDomain(data as DbConceptRow);
  } catch {
    return inMemoryConcepts.get(id) ?? null;
  }
}

export async function getKnowledgeConceptByKey(
  conceptKey: string
): Promise<KnowledgeConcept | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_knowledge_concepts")
      .select("*")
      .eq("concept_key", conceptKey)
      .maybeSingle();

    if (error || !data) {
      for (const c of inMemoryConcepts.values()) {
        if (c.conceptKey === conceptKey) return c;
      }
      return null;
    }

    return mapDbConceptToDomain(data as DbConceptRow);
  } catch {
    for (const c of inMemoryConcepts.values()) {
      if (c.conceptKey === conceptKey) return c;
    }
    return null;
  }
}

export async function getKnowledgeConcepts(filter?: {
  conceptType?: KnowledgeConceptType;
  status?: KnowledgeQualityStatus;
  includeHistorical?: boolean;
}): Promise<KnowledgeConcept[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_knowledge_concepts").select("*");

    if (filter?.conceptType) {
      query = query.eq("concept_type", filter.conceptType);
    }
    if (filter?.status) {
      query = query.eq("status", filter.status);
    }
    if (!filter?.includeHistorical) {
      query = query.or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return getFilteredInMemoryConcepts(filter);
    }

    return (data as DbConceptRow[]).map(mapDbConceptToDomain);
  } catch {
    return getFilteredInMemoryConcepts(filter);
  }
}

function getFilteredInMemoryConcepts(filter?: {
  conceptType?: KnowledgeConceptType;
  status?: KnowledgeQualityStatus;
  includeHistorical?: boolean;
}): KnowledgeConcept[] {
  const now = new Date().getTime();
  return Array.from(inMemoryConcepts.values()).filter((c) => {
    if (filter?.conceptType && c.conceptType !== filter.conceptType) return false;
    if (filter?.status && c.status !== filter.status) return false;
    if (!filter?.includeHistorical && c.validUntil && new Date(c.validUntil).getTime() < now) {
      return false;
    }
    return true;
  });
}

// -----------------------------------------------------------------------------
// REPOSITORY METHODS: RELATIONSHIPS
// -----------------------------------------------------------------------------

export async function saveKnowledgeRelationship(
  rel: KnowledgeRelationship
): Promise<KnowledgeRelationship> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_knowledge_relationships")
      .upsert({
        id: rel.id,
        source_concept_id: rel.sourceConceptId,
        relationship_type: rel.relationshipType,
        target_concept_id: rel.targetConceptId,
        inverse_relationship_type: rel.inverseRelationshipType,
        relationship_strength: rel.relationshipStrength,
        confidence: rel.confidence,
        provenance: rel.provenance,
        geographic_scope: rel.geographicScope,
        location_state: rel.locationState,
        location_lga: rel.locationLga,
        status: rel.status,
        valid_from: rel.validFrom,
        valid_until: rel.validUntil,
        metadata: rel.metadata,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw error || new Error("Failed to persist relationship in DB");
    }

    const saved = mapDbRelationshipToDomain(data as DbRelationshipRow);
    inMemoryRelationships.set(saved.id, saved);
    return saved;
  } catch {
    inMemoryRelationships.set(rel.id, rel);
    return rel;
  }
}

export async function getKnowledgeRelationships(filter?: {
  conceptId?: string;
  relationshipType?: KnowledgeRelationshipType;
  status?: KnowledgeQualityStatus;
  includeHistorical?: boolean;
}): Promise<KnowledgeRelationship[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_knowledge_relationships").select("*");

    if (filter?.conceptId) {
      query = query.or(`source_concept_id.eq.${filter.conceptId},target_concept_id.eq.${filter.conceptId}`);
    }
    if (filter?.relationshipType) {
      query = query.eq("relationship_type", filter.relationshipType);
    }
    if (filter?.status) {
      query = query.eq("status", filter.status);
    }
    if (!filter?.includeHistorical) {
      query = query.or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return getFilteredInMemoryRelationships(filter);
    }

    return (data as DbRelationshipRow[]).map(mapDbRelationshipToDomain);
  } catch {
    return getFilteredInMemoryRelationships(filter);
  }
}

function getFilteredInMemoryRelationships(filter?: {
  conceptId?: string;
  relationshipType?: KnowledgeRelationshipType;
  status?: KnowledgeQualityStatus;
  includeHistorical?: boolean;
}): KnowledgeRelationship[] {
  const now = new Date().getTime();
  return Array.from(inMemoryRelationships.values()).filter((r) => {
    if (filter?.conceptId && r.sourceConceptId !== filter.conceptId && r.targetConceptId !== filter.conceptId) {
      return false;
    }
    if (filter?.relationshipType && r.relationshipType !== filter.relationshipType) return false;
    if (filter?.status && r.status !== filter.status) return false;
    if (!filter?.includeHistorical && r.validUntil && new Date(r.validUntil).getTime() < now) {
      return false;
    }
    return true;
  });
}

// -----------------------------------------------------------------------------
// REPOSITORY METHODS: ENTITY LINKS
// -----------------------------------------------------------------------------

export async function saveEntityLink(
  link: AgriculturalEntityLink
): Promise<AgriculturalEntityLink> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_entity_links")
      .upsert({
        id: link.id,
        concept_id: link.conceptId,
        entity_type: link.entityType,
        entity_id: link.entityId,
        link_nature: link.linkNature,
        confidence: link.confidence,
        provenance: link.provenance,
        metadata: link.metadata,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw error || new Error("Failed to persist entity link in DB");
    }

    const saved = mapDbLinkToDomain(data as DbEntityLinkRow);
    inMemoryLinks.set(saved.id, saved);
    return saved;
  } catch {
    inMemoryLinks.set(link.id, link);
    return link;
  }
}

export async function getEntityLinks(filter?: {
  conceptId?: string;
  entityType?: LinkedEntityType;
  entityId?: string;
}): Promise<AgriculturalEntityLink[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_entity_links").select("*");

    if (filter?.conceptId) {
      query = query.eq("concept_id", filter.conceptId);
    }
    if (filter?.entityType) {
      query = query.eq("entity_type", filter.entityType);
    }
    if (filter?.entityId) {
      query = query.eq("entity_id", filter.entityId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return getFilteredInMemoryLinks(filter);
    }

    return (data as DbEntityLinkRow[]).map(mapDbLinkToDomain);
  } catch {
    return getFilteredInMemoryLinks(filter);
  }
}

function getFilteredInMemoryLinks(filter?: {
  conceptId?: string;
  entityType?: LinkedEntityType;
  entityId?: string;
}): AgriculturalEntityLink[] {
  return Array.from(inMemoryLinks.values()).filter((l) => {
    if (filter?.conceptId && l.conceptId !== filter.conceptId) return false;
    if (filter?.entityType && l.entityType !== filter.entityType) return false;
    if (filter?.entityId && l.entityId !== filter.entityId) return false;
    return true;
  });
}

// -----------------------------------------------------------------------------
// RECURSIVE QUERIES
// -----------------------------------------------------------------------------

export async function executeHierarchyQuery(params: {
  rootConceptId: string;
  direction?: "ANCESTORS" | "DESCENDANTS";
  maxDepth?: number;
  includeHistorical?: boolean;
}): Promise<HierarchyNode[]> {
  const concepts = await getKnowledgeConcepts({ includeHistorical: params.includeHistorical });
  return traverseHierarchyInMemory({
    rootConceptId: params.rootConceptId,
    direction: params.direction ?? "DESCENDANTS",
    concepts,
    maxDepth: params.maxDepth,
    includeHistorical: params.includeHistorical,
  });
}

export async function executeNeighborhoodQuery(params: {
  conceptId: string;
  maxDepth?: number;
  limit?: number;
  relationshipTypeFilter?: KnowledgeRelationshipType[];
  includeHistorical?: boolean;
}): Promise<NeighborhoodStep[]> {
  const concepts = await getKnowledgeConcepts({ includeHistorical: params.includeHistorical });
  const relationships = await getKnowledgeRelationships({ includeHistorical: params.includeHistorical });
  return traverseNeighborhoodInMemory({
    conceptId: params.conceptId,
    concepts,
    relationships,
    maxDepth: params.maxDepth,
    limit: params.limit,
    relationshipTypeFilter: params.relationshipTypeFilter,
    includeHistorical: params.includeHistorical,
  });
}
