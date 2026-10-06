/**
 * AgroMarket Phase 2.7: Procurement Intelligence & B2B Procurement Agent Types
 *
 * Domain contracts and interfaces for deterministic procurement prioritization,
 * strategy classification, supplier diversification, risk assessment, market cost
 * intelligence, and human-in-the-loop advisory procurement recommendations.
 *
 * SAFETY INVARIANT:
 * This agent is NOT an autonomous purchasing agent.
 * It NEVER buys products, places purchase orders, commits funds, reserves inventory,
 * negotiates binding contracts, or transfers money automatically.
 */

import { NigerianState } from "@/features/ecosystem/types";
import { StructuredReasoningOutput } from "@/features/intelligence/reasoning-contracts";

// -----------------------------------------------------------------------------
// 1. DOMAIN ENUMS & CLASSIFICATIONS
// -----------------------------------------------------------------------------

export const PROCUREMENT_STRATEGIES = [
  "DIRECT_SUPPLIER",
  "MULTI_SUPPLIER",
  "AGGREGATED_PROCUREMENT",
  "PROCESSING_REQUIRED",
  "REGIONAL_ALTERNATIVE",
  "WAIT_AND_MONITOR",
  "INSUFFICIENT_DATA",
] as const;
export type ProcurementStrategy = (typeof PROCUREMENT_STRATEGIES)[number];

export const PROCUREMENT_RISK_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
  "UNKNOWN",
] as const;
export type ProcurementRiskLevel = (typeof PROCUREMENT_RISK_LEVELS)[number];

export const OPPORTUNITY_STATUSES = [
  "OPEN",
  "PARTIALLY_SOURCED",
  "SOURCED",
  "CONSTRAINED",
  "EXPIRED",
  "CANCELLED",
  "COMPLETED",
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

export const PRIORITY_LEVELS = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const PROCUREMENT_RECOMMENDATION_TYPES = [
  "DIRECT_OFFTAKE",
  "SPLIT_ORDER_SOURCING",
  "COOPERATIVE_AGGREGATION",
  "PROCESSOR_COMMISSIONING",
  "INTER_STATE_CORRIDOR_OFFTAKE",
  "PRICE_MONITORING_HOLD",
  "SUPPLIER_DIVERSIFICATION_REVIEW",
] as const;
export type ProcurementRecommendationType = (typeof PROCUREMENT_RECOMMENDATION_TYPES)[number];

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
// 2. PRIORITY SCORING CONTRACTS
// -----------------------------------------------------------------------------

export interface ProcurementPriorityComponents {
  demandUrgency: number;          // max 25
  supplyGap: number;              // max 20
  demandPressure: number;         // max 15
  marketPressure: number;         // max 15
  matchQuality: number;           // max 10
  leadTimeAvailability: number;   // max 10
  riskDisruption: number;         // max 5
}

export interface ProcurementPriorityScore {
  score: number; // 0.0 to 100.0
  level: PriorityLevel;
  components: ProcurementPriorityComponents;
  missingEvidence: string[];
  constraints: string[];
  confidence: number; // 0.0 to 1.0
}

// -----------------------------------------------------------------------------
// 3. SUPPLIER DIVERSIFICATION & CONCENTRATION
// -----------------------------------------------------------------------------

export interface SupplierDiversificationAnalysis {
  totalMatchedQuantity: number;
  supplierCount: number;
  largestSupplierQuantity: number;
  concentrationRatio: number; // percentage 0 to 100
  concentrationDetected: boolean;
  notes: string[];
}

// -----------------------------------------------------------------------------
// 4. COST & MARKET INTELLIGENCE
// -----------------------------------------------------------------------------

export interface ProcurementCostIntelligence {
  commodity: string;
  state: string;
  unit: string;
  observedPriceMin: number | null;
  observedPriceMax: number | null;
  observedPriceMedian: number | null;
  priceTrend: "INCREASING" | "DECREASING" | "STABLE" | "INSUFFICIENT_DATA";
  marketPressure: "LOW" | "MODERATE" | "ELEVATED" | "ACUTE" | "INSUFFICIENT_DATA";
  recencyDays: number | null;
  observationCount: number;
  estimatedProcurementCost: number | null;
  confidence: number;
  notes: string[];
}

// -----------------------------------------------------------------------------
// 5. BUYER PROFILE & CONTEXT
// -----------------------------------------------------------------------------

export interface BuyerProcurementProfile {
  buyerId: string;
  businessName?: string;
  state: NigerianState | string;
  lga?: string;
  buyerType?: string;
  isVerified?: boolean;
}

export interface ProcurementDemandTarget {
  id: string;
  buyerId?: string;
  commodity: string;
  productForm?: string;
  requiredQuantity: number;
  unit: string;
  state: NigerianState | string;
  lga?: string;
  desiredDeliveryDate?: string | null;
  targetPricePerUnit?: number | null;
  qualityRequirements?: string;
  specifications?: Record<string, unknown>;
  requiresProcessing?: boolean;
  notes?: string | null;
}

// -----------------------------------------------------------------------------
// 6. PROCUREMENT OPPORTUNITY & SNAPSHOT RECORDS
// -----------------------------------------------------------------------------

export interface ProcurementOpportunityDetail {
  demandId: string;
  buyerId?: string | null;
  commodity: string;
  state: string;
  lga?: string | null;
  requiredQuantity: number;
  matchedQuantity: number;
  supplyGap: number;
  unit: string;
  fulfillmentPercentage: number;
  desiredDeliveryDate?: string | null;
  priorityScore: ProcurementPriorityScore;
  recommendedStrategy: ProcurementStrategy;
  riskLevel: ProcurementRiskLevel;
  riskFactors: string[];
  status: OpportunityStatus;
  diversification: SupplierDiversificationAnalysis;
  costIntelligence: ProcurementCostIntelligence;
  processingRequired: boolean;
  securityDisruptionFlag: boolean;
  constraints: string[];
}

export interface ProcurementIntelligenceSnapshot {
  id?: string;
  demand_id: string | null;
  buyer_id: string | null;
  commodity: string;
  state: string;
  lga: string | null;
  target_quantity: number;
  matched_quantity: number;
  supply_gap: number;
  unit: string;
  fulfillment_percentage: number;
  procurement_priority_score: number;
  priority_components: ProcurementPriorityComponents | Record<string, unknown>;
  recommended_strategy: ProcurementStrategy;
  procurement_risk_level: ProcurementRiskLevel;
  risk_factors: string[];
  opportunity_status: OpportunityStatus;
  candidate_suppliers_count: number;
  supplier_concentration_detected: boolean;
  concentration_ratio: number | null;
  market_pressure_level: string | null;
  observed_price_min: number | null;
  observed_price_max: number | null;
  observed_price_median: number | null;
  price_trend: string | null;
  estimated_procurement_cost: number | null;
  processing_required: boolean;
  security_disruption_flag: boolean;
  constraints: string[];
  missing_evidence: string[];
  confidence: number;
  metadata?: Record<string, unknown>;
  calculated_at?: string;
}

export interface ProcurementOpportunityRecord {
  id?: string;
  snapshot_id: string;
  demand_id: string;
  buyer_id: string | null;
  commodity: string;
  state: string;
  lga: string | null;
  required_quantity: number;
  unit: string;
  desired_delivery_date: string | null;
  priority_score: number;
  priority_level: PriorityLevel;
  strategy: ProcurementStrategy;
  risk_level: ProcurementRiskLevel;
  status: OpportunityStatus;
  matched_quantity: number;
  unmatched_gap: number;
  supplier_count: number;
  notes: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface ProcurementRecommendationRecord {
  id?: string;
  snapshot_id: string;
  opportunity_id?: string | null;
  demand_id: string | null;
  recommendation_type: ProcurementRecommendationType;
  title: string;
  details: string;
  suggested_action: string;
  confidence: number;
  status: RecommendationLifecycleStatus;
  actioned_by?: string | null;
  actioned_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProcurementOverviewStats {
  openOpportunitiesCount: number;
  highPriorityCount: number;
  partiallySourcedCount: number;
  fullySourcedCount: number;
  totalVolumeRequired: number;
  totalVolumeSourced: number;
  totalVolumeGap: number;
  highRiskCount: number;
  concentrationRiskCount: number;
  processingConstrainedCount: number;
  securityConstrainedCount: number;
}

export interface ProcurementRunResult {
  success: boolean;
  demandId: string;
  commodity: string;
  state: string;
  snapshot: ProcurementIntelligenceSnapshot;
  opportunity?: ProcurementOpportunityRecord;
  recommendations: ProcurementRecommendationRecord[];
  aiInterpretation?: StructuredReasoningOutput | null;
  aiSkippedOrFailed?: boolean;
}
