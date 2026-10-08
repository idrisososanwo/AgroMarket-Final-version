/**
 * AgroMarket Phase 3.12: Agricultural Dependency Graph & Network Intelligence Types
 *
 * Strongly-typed domain models for agricultural dependency networks:
 * - Nodes: Canonical references across producers, facilities, corridors, regions, commodities
 * - Edges: Typed agricultural relationships distinguishing DEPENDENCY from ASSOCIATION
 * - Classifications: Deterministic concentration, strength, confidence, and provenance metrics
 * - Cascade Analysis: Bounded traversal and downstream exposure modeling
 */

import { NigerianState } from "@/features/marketplace/constants";

// -----------------------------------------------------------------------------
// 1. NODE & RELATIONSHIP VOCABULARY
// -----------------------------------------------------------------------------

export const DEPENDENCY_NODE_TYPES = [
  "PRODUCER",
  "PRODUCTION_UNIT",
  "PRODUCTION_OUTPUT",
  "AGGREGATION_POOL",
  "PROCESSING_FACILITY",
  "B2B_DEMAND",
  "MARKET",
  "LOGISTICS_PROVIDER",
  "LOGISTICS_CORRIDOR",
  "REGION",
  "COMMODITY",
  "INPUT",
  "FOOD_SECURITY_DOMAIN",
] as const;
export type DependencyNodeType = (typeof DEPENDENCY_NODE_TYPES)[number];

export const DEPENDENCY_RELATIONSHIP_TYPES = [
  "PRODUCES",
  "SUPPLIES",
  "CONTRIBUTES_TO",
  "AGGREGATES",
  "PROCESSES",
  "REQUIRES_INPUT",
  "DEPENDS_ON",
  "CONNECTED_TO",
  "SERVES",
  "DEMANDS",
  "DISTRIBUTES_TO",
  "TRANSPORTS_THROUGH",
  "ALTERNATIVE_TO",
  "CONSTRAINED_BY",
  "AFFECTS",
  "LOCATED_IN",
] as const;
export type DependencyRelationshipType = (typeof DEPENDENCY_RELATIONSHIP_TYPES)[number];

export const RELATIONSHIP_NATURES = ["DEPENDENCY", "ASSOCIATION"] as const;
export type RelationshipNature = (typeof RELATIONSHIP_NATURES)[number];

export const DEPENDENCY_STRENGTHS = [
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
  "INSUFFICIENT_DATA",
] as const;
export type DependencyStrength = (typeof DEPENDENCY_STRENGTHS)[number];

export const DEPENDENCY_CONFIDENCES = [
  "HIGH",
  "MODERATE",
  "LOW",
  "INSUFFICIENT_DATA",
] as const;
export type DependencyConfidence = (typeof DEPENDENCY_CONFIDENCES)[number];

export const DEPENDENCY_PROVENANCES = [
  "OBSERVED",
  "DERIVED",
  "CORRELATED",
  "ESTIMATED",
  "EXTERNAL_SOURCE",
  "INSUFFICIENT_DATA",
] as const;
export type DependencyProvenance = (typeof DEPENDENCY_PROVENANCES)[number];

export const DEPENDENCY_GEOGRAPHIC_SCOPES = [
  "NATIONAL",
  "REGIONAL_CORRIDOR",
  "STATE",
  "LGA",
] as const;
export type DependencyGeographicScope = (typeof DEPENDENCY_GEOGRAPHIC_SCOPES)[number];

export const CONCENTRATION_CLASSIFICATIONS = [
  "NORMAL",
  "CONCENTRATED",
  "HIGH_DEPENDENCY",
  "CRITICAL_DEPENDENCY",
  "INSUFFICIENT_DATA",
] as const;
export type ConcentrationClassification = (typeof CONCENTRATION_CLASSIFICATIONS)[number];

// -----------------------------------------------------------------------------
// 2. CORE DOMAIN INTERFACES
// -----------------------------------------------------------------------------

export interface DependencyNode {
  type: DependencyNodeType;
  id: string;
  label: string;
  state?: NigerianState | string | null;
  lga?: string | null;
  commodity?: string | null;
  metadata?: Record<string, unknown>;
}

export interface DependencyRelationship {
  id: string;
  sourceNodeType: DependencyNodeType;
  sourceNodeId: string;
  relationshipType: DependencyRelationshipType;
  targetNodeType: DependencyNodeType;
  targetNodeId: string;
  relationshipNature: RelationshipNature;
  dependencyStrength: DependencyStrength;
  confidence: DependencyConfidence;
  provenance: DependencyProvenance;
  commodity?: string | null;
  geographicScope: DependencyGeographicScope;
  locationState?: NigerianState | string | null;
  locationLga?: string | null;
  flowShare?: number | null; // 0 to 100 percentage
  isActive: boolean;
  validFrom: string;
  validUntil?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Presentation profile hints (sanitized)
  sourceLabel?: string;
  targetLabel?: string;
}

export interface DependencyAssessment {
  id: string;
  entityType: DependencyNodeType | string;
  entityId: string;
  assessmentType:
    | "SUPPLIER_CONCENTRATION"
    | "PROCESSING_BOTTLENECK"
    | "CORRIDOR_BOTTLENECK"
    | "REGIONAL_CONCENTRATION"
    | "SINGLE_POINT_FAILURE"
    | "CASCADE_EXPOSURE";
  classification: ConcentrationClassification;
  concentrationRatio?: number | null;
  dominantEntityType?: DependencyNodeType | string | null;
  dominantEntityId?: string | null;
  dominantEntityLabel?: string | null;
  affectedCommodity?: string | null;
  locationState?: NigerianState | string | null;
  locationLga?: string | null;
  riskSummary: string;
  confidence: DependencyConfidence;
  provenance: DependencyProvenance;
  cascadeDepth: number;
  metadata: Record<string, unknown>;
  assessedAt: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 3. CONCENTRATION & BOTTLENECK ANALYSIS MODELS
// -----------------------------------------------------------------------------

export interface ConcentrationAnalysisResult {
  subjectType: DependencyNodeType;
  subjectId: string;
  concentrationType: "SUPPLIER" | "PROCESSING" | "CORRIDOR" | "REGIONAL";
  dominantEntityId: string | null;
  dominantEntityLabel: string | null;
  concentrationRatio: number | null; // 0.00 to 100.00
  classification: ConcentrationClassification;
  sampleSize: number;
  thresholds: {
    normalMax: number;
    concentratedMax: number;
    highMax: number;
    criticalMin: number;
  };
  isSinglePointOfFailure: boolean;
  confidence: DependencyConfidence;
  provenance: DependencyProvenance;
  status: "COMPUTED" | "INSUFFICIENT_DATA";
  advisoryGuidance: string;
}

// -----------------------------------------------------------------------------
// 4. CASCADE TRAVERSAL & DOWNSTREAM EXPOSURE MODELS
// -----------------------------------------------------------------------------

export interface CascadePathStep {
  depth: number;
  sourceNodeType: DependencyNodeType;
  sourceNodeId: string;
  relationshipType: DependencyRelationshipType;
  targetNodeType: DependencyNodeType;
  targetNodeId: string;
  relationshipNature: RelationshipNature;
  dependencyStrength: DependencyStrength;
  confidence: DependencyConfidence;
  provenance: DependencyProvenance;
  commodity?: string | null;
  flowShare?: number | null;
}

export interface DownstreamExposureSummary {
  nodeType: DependencyNodeType;
  nodeId: string;
  label?: string;
  shortestDepth: number;
  pathCount: number;
  maxStrength: DependencyStrength;
  exposedCommodity?: string | null;
  exposurePathway: string;
}

export interface DependencyCascadeResult {
  rootNodeType: DependencyNodeType;
  rootNodeId: string;
  maxDepthEnforced: number;
  traversedNodesCount: number;
  traversedEdgesCount: number;
  cycleDetected: boolean;
  steps: CascadePathStep[];
  downstreamExposures: DownstreamExposureSummary[];
  advisoryDisclaimer: string;
}

// -----------------------------------------------------------------------------
// 5. ALTERNATIVE PATHS MODEL
// -----------------------------------------------------------------------------

export interface PotentialAlternativeCandidate {
  nodeType: DependencyNodeType;
  nodeId: string;
  label: string;
  state?: string | null;
  lga?: string | null;
  commodity?: string | null;
  capacityEvidenceStatus: "VERIFIED" | "UNVERIFIED_CAPACITY";
  relationshipNature: "DIRECT_ALTERNATIVE" | "CAPABLE_PEER";
  notes?: string;
}

export interface PotentialAlternativesResult {
  targetNodeType: DependencyNodeType;
  targetNodeId: string;
  targetLabel?: string;
  commodity?: string | null;
  state?: string | null;
  alternatives: PotentialAlternativeCandidate[];
  caveat: string;
}

// -----------------------------------------------------------------------------
// 6. ACTION INPUT CONTRACTS
// -----------------------------------------------------------------------------

export interface CreateDependencyRelationshipInput {
  sourceNodeType: DependencyNodeType;
  sourceNodeId: string;
  relationshipType: DependencyRelationshipType;
  targetNodeType: DependencyNodeType;
  targetNodeId: string;
  relationshipNature?: RelationshipNature;
  dependencyStrength?: DependencyStrength;
  confidence?: DependencyConfidence;
  provenance?: DependencyProvenance;
  commodity?: string | null;
  geographicScope?: DependencyGeographicScope;
  locationState?: string | null;
  locationLga?: string | null;
  flowShare?: number | null;
  validFrom?: string;
  validUntil?: string | null;
  metadata?: Record<string, unknown>;
}

export interface TraverseDependencyCascadeInput {
  rootNodeType: DependencyNodeType;
  rootNodeId: string;
  maxDepth?: number;
  commodity?: string | null;
}

export interface AssessConcentrationInput {
  subjectType: DependencyNodeType;
  subjectId: string;
  concentrationType: "SUPPLIER" | "PROCESSING" | "CORRIDOR" | "REGIONAL";
  commodity?: string | null;
  locationState?: string | null;
}
