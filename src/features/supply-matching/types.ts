/**
 * AgroMarket Phase 2.6: Supply Matching & Agricultural Coordination Agent Types
 *
 * Domain contracts and interfaces for deterministic value-chain supply/demand matching,
 * multi-source aggregation, gap analysis, processing coordination, logistics corridors,
 * reliability scoring, and human-in-the-loop coordination recommendations.
 */

import { NigerianState } from "@/features/ecosystem/types";

// -----------------------------------------------------------------------------
// 1. DOMAIN ENUMS & CLASSIFICATIONS
// -----------------------------------------------------------------------------

export const SUPPLY_SOURCE_TYPES = [
  "LISTING",
  "INVENTORY",
  "PRODUCTION_OUTPUT",
  "AGGREGATION_POOL",
  "PROCESSING_OUTPUT",
  "EXPECTED_PRODUCTION",
] as const;
export type SupplySourceType = (typeof SUPPLY_SOURCE_TYPES)[number];

export const SUPPLY_AVAILABILITY_STATUSES = [
  "AVAILABLE_NOW",
  "EXPECTED",
  "AGGREGATED",
  "PROCESSING_REQUIRED",
  "PROCESSING_AVAILABLE",
  "UNVERIFIED",
  "INSUFFICIENT_DATA",
] as const;
export type SupplyAvailabilityStatus = (typeof SUPPLY_AVAILABILITY_STATUSES)[number];

export const MATCH_CLASSIFICATIONS = [
  "EXCELLENT_MATCH",
  "GOOD_MATCH",
  "PARTIAL_MATCH",
  "LOW_CONFIDENCE_MATCH",
  "NO_MATCH",
  "INSUFFICIENT_DATA",
] as const;
export type MatchClassification = (typeof MATCH_CLASSIFICATIONS)[number];

export const COORDINATION_TYPES = [
  "DIRECT_SINGLE_SOURCE",
  "MULTI_SOURCE_AGGREGATION",
  "PROCESSING_REQUIRED",
  "CROSS_CORRIDOR",
  "UNSATISFIED",
  "INSUFFICIENT_DATA",
] as const;
export type CoordinationType = (typeof COORDINATION_TYPES)[number];

export const SUPPLY_GAP_STATUSES = [
  "FULLY_SATISFIED",
  "PARTIALLY_SATISFIED",
  "UNSATISFIED",
  "INSUFFICIENT_DATA",
] as const;
export type SupplyGapStatus = (typeof SUPPLY_GAP_STATUSES)[number];

export const RELIABILITY_LEVELS = [
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNKNOWN",
] as const;
export type ReliabilityLevel = (typeof RELIABILITY_LEVELS)[number];

export const PROXIMITY_TIERS = [
  "SAME_LGA",
  "SAME_STATE",
  "REGIONAL_CORRIDOR",
  "NATIONAL",
] as const;
export type ProximityTier = (typeof PROXIMITY_TIERS)[number];

export const COORDINATION_RECOMMENDATION_TYPES = [
  "AGGREGATE_FARMERS",
  "CONNECT_DIRECT_SUPPLY",
  "ROUTE_THROUGH_PROCESSOR",
  "EXPLORE_ALTERNATIVE_CORRIDOR",
  "RESOLVE_LOGISTICS_CONSTRAINT",
  "EXPAND_SUPPLY_BASE",
] as const;
export type CoordinationRecommendationType = (typeof COORDINATION_RECOMMENDATION_TYPES)[number];

export const RECOMMENDATION_LIFECYCLE_STATUSES = [
  "PROPOSED",
  "REVIEWED",
  "ACCEPTED",
  "REJECTED",
  "ACTIONED",
  "COMPLETED",
] as const;
export type RecommendationLifecycleStatus = (typeof RECOMMENDATION_LIFECYCLE_STATUSES)[number];

// -----------------------------------------------------------------------------
// 2. CANDIDATE & EVIDENCE STRUCTURES
// -----------------------------------------------------------------------------

export interface SupplyObservationRecord {
  id: string;
  sourceType: SupplySourceType;
  commodity: string;
  productType?: string;
  quantity: number;
  unit: string;
  qualityGrade?: string;
  state: NigerianState | string;
  lga?: string;
  producerOrAggregatorName: string;
  producerId?: string;
  productionState?: string;
  readyDate?: string;
  expectedDeliveryWindow?: string;
  isAggregated?: boolean;
  requiresProcessing?: boolean;
  minOrderQuantity?: number;
  perishability?: "HIGH" | "MEDIUM" | "LOW";
  verificationStatus: "UNVERIFIED" | "SELF_DECLARED" | "VERIFIED" | "OFFICIAL" | "INSPECTED";
  reliabilityLevel: ReliabilityLevel;
  availabilityStatus: SupplyAvailabilityStatus;
  metadata?: Record<string, unknown>;
}

export interface DemandOfftakeTarget {
  id: string;
  buyerId?: string;
  title: string;
  commodityOrProduct: string;
  quantity: number;
  unit: string;
  state: NigerianState | string;
  lga?: string;
  desiredDeliveryDate: string;
  qualityGradeRequirement?: string;
  specifications?: Record<string, unknown>;
  requiresProcessing?: boolean;
  minOrderQuantity?: number;
  isPrivate?: boolean;
  targetPricePerUnit?: number | null;
  metadata?: Record<string, unknown>;
}

export interface ProcessingFacilityCandidate {
  id: string;
  name: string;
  facilityType: string;
  supportedCommodities: string[];
  capacityValue?: number | null;
  capacityUnit?: string | null;
  state: NigerianState | string;
  lga?: string;
  verificationStatus: string;
  isActive: boolean;
}

export interface LogisticsRouteCandidate {
  id: string;
  providerName: string;
  coverageStates: string[];
  hasRefrigeration: boolean;
  vehicleTypes: string[];
  securityStatus?: "NORMAL" | "SECURITY_DISRUPTION_REPORTED" | "MOVEMENT_CONSTRAINT_REPORTED" | "CORRIDOR_REVIEW_REQUIRED";
}

// -----------------------------------------------------------------------------
// 3. SCORING & COMPONENT SCORES
// -----------------------------------------------------------------------------

export interface SupplyMatchComponentScores {
  commodityCompatibility: number; // max 30
  quantityCompatibility: number;  // max 20
  locationCompatibility: number;  // max 15
  availabilityCompatibility: number; // max 15
  specificationCompatibility: number; // max 10
  processingAggregationFit: number; // max 5
  logisticsCompatibility: number; // max 5
}

export interface EvaluatedCandidateSupply {
  supply: SupplyObservationRecord;
  candidateScore: number; // 0-100
  allocatedQuantity: number;
  proximityTier: ProximityTier;
  reliabilityLevel: ReliabilityLevel;
  corridor: string;
  notes: string[];
}

export interface MultiSourceAggregationSummary {
  sourcesCount: number;
  totalAggregatedQuantity: number;
  requiredQuantity: number;
  aggregatedFulfillmentPercentage: number;
  remainingGap: number;
  primaryStates: string[];
  aggregationCenterRecommended?: string;
  coordinationDifficulty: "LOW" | "MODERATE" | "HIGH";
}

export interface ProcessingRequirementSummary {
  required: boolean;
  facilityAvailable: boolean;
  matchedFacility?: ProcessingFacilityCandidate;
  estimatedLeadDays: number;
  bottleneckDetected: boolean;
}

export interface SupplyGapAnalysis {
  demandId: string;
  requestedQuantity: number;
  matchedQuantity: number;
  remainingQuantity: number;
  percentageFulfilled: number;
  numberOfSupplySources: number;
  aggregationRequired: boolean;
  processingRequired: boolean;
  logisticsRequired: boolean;
  constraints: string[];
  status: SupplyGapStatus;
}

export interface SupplyMatchResult {
  demandId: string;
  commodity: string;
  targetQuantity: number;
  matchedQuantity: number;
  remainingGap: number;
  unit: string;
  fulfillmentPercentage: number;
  matchScore: number;
  componentScores: SupplyMatchComponentScores;
  matchClassification: MatchClassification;
  coordinationType: CoordinationType;
  confidence: number;
  candidates: EvaluatedCandidateSupply[];
  aggregationSummary?: MultiSourceAggregationSummary;
  processingRequirement?: ProcessingRequirementSummary;
  logisticsCorridor?: string;
  constraints: string[];
  missingEvidence: string[];
  coordinationOpportunitySummary: string;
}

// -----------------------------------------------------------------------------
// 4. PERSISTENT RECORDS & RUN OUTCOMES
// -----------------------------------------------------------------------------

export interface SupplyMatchingSnapshot {
  id?: string;
  demand_id: string | null;
  commodity: string;
  state: string;
  lga: string | null;
  target_quantity: number;
  matched_quantity: number;
  remaining_gap: number;
  unit: string;
  fulfillment_percentage: number;
  match_classification: MatchClassification;
  coordination_type: CoordinationType;
  match_score: number;
  component_scores: SupplyMatchComponentScores | Record<string, unknown>;
  candidates_count: number;
  aggregation_pool_count: number;
  processing_required: boolean;
  processing_facility_id: string | null;
  logistics_corridor: string | null;
  constraints: string[];
  missing_evidence: string[];
  confidence: number;
  metadata?: Record<string, unknown>;
  calculated_at?: string;
}

export interface SupplyMatchCandidateRecord {
  id?: string;
  snapshot_id: string;
  supply_id: string;
  supply_source_type: SupplySourceType;
  supplier_name: string;
  state: string;
  lga: string | null;
  available_quantity: number;
  allocated_quantity: number;
  unit: string;
  candidate_score: number;
  reliability_level: ReliabilityLevel;
  ready_date: string | null;
  verification_status: string;
  distance_tier: ProximityTier;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface SupplyCoordinationRecommendationRecord {
  id?: string;
  snapshot_id: string;
  demand_id: string | null;
  recommendation_type: CoordinationRecommendationType;
  title: string;
  details: string;
  confidence: number;
  status: RecommendationLifecycleStatus;
  actioned_by?: string | null;
  actioned_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SupplyMatchingRunResult {
  success: boolean;
  demandId: string;
  commodity: string;
  state: string;
  snapshot: SupplyMatchingSnapshot;
  candidates: SupplyMatchCandidateRecord[];
  recommendations: SupplyCoordinationRecommendationRecord[];
  gapAnalysis: SupplyGapAnalysis;
  aiInterpretation?: {
    summary: string;
    coordinationOptions: string[];
    bottlenecks: string[];
    risks: string[];
    confidenceAssessment: string;
    isAIGenerated: boolean;
  };
  warnings?: string[];
  error?: string;
}

export interface RegionalSupplyMatchingSummary {
  state: string;
  lga?: string;
  commodity: string;
  demandVolume: number;
  availableSupplyVolume: number;
  gapVolume: number;
  fulfillmentRatio: number;
  matchQuality: MatchClassification;
}

export interface SupplyComponentScoresSummary {
  commodityCompatibility: number;
  quantityCompatibility: number;
  locationCompatibility: number;
  availabilityCompatibility: number;
  specificationCompatibility: number;
  processingAggregationFit: number;
  logisticsCompatibility: number;
}

export interface SupplyMatchingOverviewStats {
  totalSnapshotsCount: number;
  activeDemandsCount: number;
  totalMatchedVolume: number;
  totalUnmatchedGap: number;
  averageMatchScore: number;
  multiSourceAggregationCount: number;
  processingBottlenecksCount: number;
  securityDisruptionsCount: number;
}
