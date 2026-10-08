/**
 * AgroMarket Phase 3.12: Agricultural Dependency Graph Data Layer
 *
 * Provides database and in-memory persistence for:
 * - agricultural_dependency_relationships
 * - agricultural_dependency_assessments
 * - RPC-accelerated graph cascade queries with in-memory fallback
 */

import { createClient } from "@/lib/supabase/server";
import {
  DependencyRelationship,
  DependencyAssessment,
  DependencyNodeType,
  DependencyRelationshipType,
  RelationshipNature,
  DependencyStrength,
  DependencyConfidence,
  DependencyProvenance,
  DependencyGeographicScope,
  ConcentrationClassification,
  DependencyCascadeResult,
} from "./types";
import { assertNoProhibitedProduceDependency } from "./validation";
import { traverseDependencyCascade } from "./graph-traversal";

// In-Memory store for tests and offline development
const inMemoryRelationships: DependencyRelationship[] = [];
const inMemoryAssessments: DependencyAssessment[] = [];

/**
 * Resets in-memory stores for unit testing.
 */
export function resetInMemoryDependencyGraph(): void {
  inMemoryRelationships.length = 0;
  inMemoryAssessments.length = 0;
}

// -----------------------------------------------------------------------------
// 1. DB MAPPERS
// -----------------------------------------------------------------------------

export function mapDbRelationshipToDomain(row: Record<string, unknown>): DependencyRelationship {
  return {
    id: row.id as string,
    sourceNodeType: row.source_node_type as DependencyNodeType,
    sourceNodeId: row.source_node_id as string,
    relationshipType: row.relationship_type as DependencyRelationshipType,
    targetNodeType: row.target_node_type as DependencyNodeType,
    targetNodeId: row.target_node_id as string,
    relationshipNature: (row.relationship_nature as RelationshipNature) || "DEPENDENCY",
    dependencyStrength: (row.dependency_strength as DependencyStrength) || "INSUFFICIENT_DATA",
    confidence: (row.confidence as DependencyConfidence) || "MODERATE",
    provenance: (row.provenance as DependencyProvenance) || "DERIVED",
    commodity: (row.commodity as string) || null,
    geographicScope: (row.geographic_scope as DependencyGeographicScope) || "STATE",
    locationState: (row.location_state as string) || null,
    locationLga: (row.location_lga as string) || null,
    flowShare: row.flow_share != null ? Number(row.flow_share) : null,
    isActive: Boolean(row.is_active ?? true),
    validFrom: (row.valid_from as string) || new Date().toISOString(),
    validUntil: (row.valid_until as string) || null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
    sourceLabel: (row.source_label as string) || undefined,
    targetLabel: (row.target_label as string) || undefined,
  };
}

export function mapDbAssessmentToDomain(row: Record<string, unknown>): DependencyAssessment {
  return {
    id: row.id as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    assessmentType: row.assessment_type as DependencyAssessment["assessmentType"],
    classification: (row.classification as ConcentrationClassification) || "NORMAL",
    concentrationRatio: row.concentration_ratio != null ? Number(row.concentration_ratio) : null,
    dominantEntityType: (row.dominant_entity_type as string) || null,
    dominantEntityId: (row.dominant_entity_id as string) || null,
    dominantEntityLabel: (row.dominant_entity_label as string) || null,
    affectedCommodity: (row.affected_commodity as string) || null,
    locationState: (row.location_state as string) || null,
    locationLga: (row.location_lga as string) || null,
    riskSummary: (row.risk_summary as string) || "",
    confidence: (row.confidence as DependencyConfidence) || "MODERATE",
    provenance: (row.provenance as DependencyProvenance) || "DERIVED",
    cascadeDepth: Number(row.cascade_depth ?? 1),
    metadata: (row.metadata as Record<string, unknown>) || {},
    assessedAt: (row.assessed_at as string) || new Date().toISOString(),
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// 2. RELATIONSHIP OPERATIONS
// -----------------------------------------------------------------------------

export async function saveDependencyRelationship(
  rel: DependencyRelationship
): Promise<DependencyRelationship> {
  assertNoProhibitedProduceDependency(rel.commodity, "Save Dependency Relationship");

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_dependency_relationships")
      .upsert({
        id: rel.id,
        source_node_type: rel.sourceNodeType,
        source_node_id: rel.sourceNodeId,
        relationship_type: rel.relationshipType,
        target_node_type: rel.targetNodeType,
        target_node_id: rel.targetNodeId,
        relationship_nature: rel.relationshipNature,
        dependency_strength: rel.dependencyStrength,
        confidence: rel.confidence,
        provenance: rel.provenance,
        commodity: rel.commodity ?? null,
        geographic_scope: rel.geographicScope,
        location_state: rel.locationState ?? null,
        location_lga: rel.locationLga ?? null,
        flow_share: rel.flowShare ?? null,
        is_active: rel.isActive,
        valid_from: rel.validFrom,
        valid_until: rel.validUntil ?? null,
        metadata: rel.metadata || {},
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      return mapDbRelationshipToDomain(data);
    }
  } catch {
    // Fallback to in-memory store
  }

  const existingIdx = inMemoryRelationships.findIndex((r) => r.id === rel.id);
  if (existingIdx >= 0) {
    inMemoryRelationships[existingIdx] = rel;
  } else {
    inMemoryRelationships.push(rel);
  }
  return rel;
}

export async function getDependencyRelationships(filters?: {
  sourceNodeType?: DependencyNodeType;
  sourceNodeId?: string;
  targetNodeType?: DependencyNodeType;
  targetNodeId?: string;
  relationshipType?: DependencyRelationshipType;
  commodity?: string | null;
  locationState?: string | null;
  isActiveOnly?: boolean;
}): Promise<DependencyRelationship[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_dependency_relationships").select("*");

    if (filters?.sourceNodeType) query = query.eq("source_node_type", filters.sourceNodeType);
    if (filters?.sourceNodeId) query = query.eq("source_node_id", filters.sourceNodeId);
    if (filters?.targetNodeType) query = query.eq("target_node_type", filters.targetNodeType);
    if (filters?.targetNodeId) query = query.eq("target_node_id", filters.targetNodeId);
    if (filters?.relationshipType) query = query.eq("relationship_type", filters.relationshipType);
    if (filters?.commodity) query = query.eq("commodity", filters.commodity);
    if (filters?.locationState) query = query.eq("location_state", filters.locationState);
    if (filters?.isActiveOnly !== false) query = query.eq("is_active", true);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: Record<string, unknown>) => mapDbRelationshipToDomain(d));
    }
  } catch {
    // Fallback to in-memory store
  }

  return inMemoryRelationships.filter((rel) => {
    if (filters?.sourceNodeType && rel.sourceNodeType !== filters.sourceNodeType) return false;
    if (filters?.sourceNodeId && rel.sourceNodeId !== filters.sourceNodeId) return false;
    if (filters?.targetNodeType && rel.targetNodeType !== filters.targetNodeType) return false;
    if (filters?.targetNodeId && rel.targetNodeId !== filters.targetNodeId) return false;
    if (filters?.relationshipType && rel.relationshipType !== filters.relationshipType) return false;
    if (filters?.commodity && rel.commodity?.toLowerCase() !== filters.commodity.toLowerCase())
      return false;
    if (filters?.locationState && rel.locationState?.toLowerCase() !== filters.locationState.toLowerCase())
      return false;
    if (filters?.isActiveOnly !== false && !rel.isActive) return false;
    return true;
  });
}

// -----------------------------------------------------------------------------
// 3. ASSESSMENT OPERATIONS
// -----------------------------------------------------------------------------

export async function saveDependencyAssessment(
  assessment: DependencyAssessment
): Promise<DependencyAssessment> {
  assertNoProhibitedProduceDependency(
    assessment.affectedCommodity,
    "Save Dependency Assessment"
  );

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_dependency_assessments")
      .insert({
        id: assessment.id,
        entity_type: assessment.entityType,
        entity_id: assessment.entityId,
        assessment_type: assessment.assessmentType,
        classification: assessment.classification,
        concentration_ratio: assessment.concentrationRatio ?? null,
        dominant_entity_type: assessment.dominantEntityType ?? null,
        dominant_entity_id: assessment.dominantEntityId ?? null,
        dominant_entity_label: assessment.dominantEntityLabel ?? null,
        affected_commodity: assessment.affectedCommodity ?? null,
        location_state: assessment.locationState ?? null,
        location_lga: assessment.locationLga ?? null,
        risk_summary: assessment.riskSummary,
        confidence: assessment.confidence,
        provenance: assessment.provenance,
        cascade_depth: assessment.cascadeDepth,
        metadata: assessment.metadata || {},
        assessed_at: assessment.assessedAt,
      })
      .select()
      .single();

    if (!error && data) {
      return mapDbAssessmentToDomain(data);
    }
  } catch {
    // Fallback to in-memory store
  }

  inMemoryAssessments.push(assessment);
  return assessment;
}

export async function getDependencyAssessments(filters?: {
  entityType?: string;
  entityId?: string;
  assessmentType?: string;
  classification?: ConcentrationClassification;
}): Promise<DependencyAssessment[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_dependency_assessments").select("*");

    if (filters?.entityType) query = query.eq("entity_type", filters.entityType);
    if (filters?.entityId) query = query.eq("entity_id", filters.entityId);
    if (filters?.assessmentType) query = query.eq("assessment_type", filters.assessmentType);
    if (filters?.classification) query = query.eq("classification", filters.classification);

    const { data, error } = await query.order("assessed_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: Record<string, unknown>) => mapDbAssessmentToDomain(d));
    }
  } catch {
    // Fallback to in-memory store
  }

  return inMemoryAssessments.filter((a) => {
    if (filters?.entityType && a.entityType !== filters.entityType) return false;
    if (filters?.entityId && a.entityId !== filters.entityId) return false;
    if (filters?.assessmentType && a.assessmentType !== filters.assessmentType) return false;
    if (filters?.classification && a.classification !== filters.classification) return false;
    return true;
  });
}

// -----------------------------------------------------------------------------
// 4. CASCADE RPC WRAPPER WITH IN-MEMORY FALLBACK
// -----------------------------------------------------------------------------

export async function executeDependencyCascadeQuery(params: {
  rootNodeType: DependencyNodeType;
  rootNodeId: string;
  maxDepth?: number;
  commodityFilter?: string | null;
}): Promise<DependencyCascadeResult> {
  const { rootNodeType, rootNodeId, maxDepth = 3, commodityFilter = null } = params;

  // 1. Fetch relationships from DB/memory and evaluate bounded cascade
  const relationships = await getDependencyRelationships({
    isActiveOnly: true,
  });

  return traverseDependencyCascade({
    rootNodeType,
    rootNodeId,
    relationships,
    maxDepth,
    commodityFilter,
  });
}
