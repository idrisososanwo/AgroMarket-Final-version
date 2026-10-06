/**
 * AgroMarket Phase 2.9: Logistics Intelligence & Movement Resilience Agent Types
 *
 * Domain contracts, interfaces, and movement early-warning indicators.
 *
 * SAFETY INVARIANTS:
 * 1. AgroMarket Logistics Intelligence is an internal analytical coordination and decision-support capability.
 * 2. It is NOT a transport operator, trucking fleet owner, road-safety authority, or emergency-response agency.
 * 3. Never claims real-time road conditions without ground evidence, never issues safe-passage guarantees,
 *    and never autonomously dispatches vehicles or transfers funds.
 * 4. Human and business operators remain authoritative for all physical dispatch and routing decisions.
 * 5. Strict zero-tolerance for pig/pork commodities across all records and calculations.
 */

import { NigerianState } from "@/features/ecosystem/types";
import { StructuredReasoningOutput } from "@/features/intelligence/reasoning-contracts";

// -----------------------------------------------------------------------------
// 1. DOMAIN ENUMS & CLASSIFICATIONS
// -----------------------------------------------------------------------------

export const LOGISTICS_PRESSURE_LEVELS = [
  "LOW_PRESSURE",
  "MODERATE_PRESSURE",
  "HIGH_PRESSURE",
  "CRITICAL_PRESSURE",
  "INSUFFICIENT_DATA",
] as const;
export type LogisticsPressureLevel = (typeof LOGISTICS_PRESSURE_LEVELS)[number];

export const LOGISTICS_RESILIENCE_LEVELS = [
  "HIGH_RESILIENCE",
  "MODERATE_RESILIENCE",
  "VULNERABLE",
  "CRITICALLY_VULNERABLE",
  "INSUFFICIENT_DATA",
] as const;
export type LogisticsResilienceLevel = (typeof LOGISTICS_RESILIENCE_LEVELS)[number];

export const CORRIDOR_TYPES = [
  "SAME_LGA",
  "SAME_STATE",
  "REGIONAL_CORRIDOR",
  "NATIONAL",
] as const;
export type CorridorType = (typeof CORRIDOR_TYPES)[number];

export const DEPENDENCY_TYPES = [
  "CORRIDOR_DEPENDENCY",
  "HIGH_PROVIDER_DEPENDENCY",
  "REGIONAL_ALTERNATIVE_SCARCITY",
  "PROCESSING_DEPENDENCY",
  "SINGLE_TRANSIT_POINT",
] as const;
export type DependencyType = (typeof DEPENDENCY_TYPES)[number];

export const BOTTLENECK_TYPES = [
  "DELIVERY_BOTTLENECK",
  "PROVIDER_BOTTLENECK",
  "CORRIDOR_BOTTLENECK",
  "PROCESSING_TO_MARKET_BOTTLENECK",
  "AGGREGATION_TO_PROCESSING_BOTTLENECK",
  "REGIONAL_CAPACITY_SHORTAGE",
  "RECURRING_DELAY_PATTERN",
  "HIGH_CANCELLATION_CONCENTRATION",
  "DEMAND_SUPPLY_MOVEMENT_MISMATCH",
] as const;
export type BottleneckType = (typeof BOTTLENECK_TYPES)[number];

export const LOGISTICS_RECOMMENDATION_STRATEGIES = [
  "DIRECT_MOVEMENT",
  "MULTI_PROVIDER_MOVEMENT",
  "ALTERNATIVE_CORRIDOR_REVIEW",
  "REGIONAL_SOURCE_ALTERNATIVE",
  "PROCESSING_LOCATION_REVIEW",
  "WAIT_AND_MONITOR",
  "INSUFFICIENT_DATA",
] as const;
export type LogisticsRecommendationStrategy =
  (typeof LOGISTICS_RECOMMENDATION_STRATEGIES)[number];

export const RECOMMENDATION_LIFECYCLE_STATUSES = [
  "PROPOSED",
  "REVIEWED",
  "ACCEPTED",
  "REJECTED",
  "ACTIONED",
  "COMPLETED",
] as const;
export type RecommendationLifecycleStatus =
  (typeof RECOMMENDATION_LIFECYCLE_STATUSES)[number];

export const LOGISTICS_SEVERITIES = [
  "INFO",
  "WATCH",
  "ELEVATED",
  "HIGH",
  "CRITICAL",
] as const;
export type LogisticsSeverity = (typeof LOGISTICS_SEVERITIES)[number];

// -----------------------------------------------------------------------------
// 2. PRESSURE & RESILIENCE SCORE CONTRACTS
// -----------------------------------------------------------------------------

export interface LogisticsPressureComponents {
  movementDemandPressure: number;       // max 20
  capacityConstraintPressure: number;   // max 20
  deliveryDelayPressure: number;        // max 15
  corridorDependencyPressure: number;   // max 15
  disruptionPressure: number;           // max 10
  processingMovementPressure: number;    // max 10
  regionalAlternativeScarcity: number;  // max 10
}

export interface LogisticsPressureIndex {
  score: number; // 0.0 to 100.0
  level: LogisticsPressureLevel;
  components: LogisticsPressureComponents;
  keyDrivers: string[];
  missingEvidence: string[];
  confidence: number; // 0.0 to 1.0
}

export interface LogisticsResilienceComponents {
  providerDiversity: number;                // max 15
  corridorDiversity: number;                // max 15
  regionalAlternativeAvailability: number;  // max 15
  processingConnectivity: number;           // max 15
  aggregationConnectivity: number;          // max 10
  marketDestinationDiversity: number;       // max 10
  movementCapacityAvailability: number;     // max 10
  disruptionRecoveryEvidence: number;       // max 10
}

export interface LogisticsResilienceAssessment {
  score: number; // 0.0 to 100.0
  level: LogisticsResilienceLevel;
  components: LogisticsResilienceComponents;
  vulnerabilityFactors: string[];
  adaptiveCapacities: string[];
  confidence: number; // 0.0 to 1.0
}

// -----------------------------------------------------------------------------
// 3. CORRIDOR DEPENDENCIES & BOTTLENECKS
// -----------------------------------------------------------------------------

export interface LogisticsCorridorDependencyItem {
  id?: string;
  snapshotId?: string | null;
  corridor: string;
  state: NigerianState | string;
  commodity?: string | null;
  category?: string | null;
  dominantEntity: string;
  movementShare: number;
  thresholdExceeded: number;
  alternativeOptionsAvailable: number;
  dependencyType: DependencyType;
  severity: LogisticsSeverity;
  status: "ACTIVE" | "MONITORING" | "RESOLVED" | "ARCHIVED";
  riskAssessment: string;
  evidence: string;
  confidence: number;
  observedAt?: string;
}

export interface LogisticsBottleneckItem {
  id?: string;
  snapshotId?: string | null;
  bottleneckType: BottleneckType;
  state: NigerianState | string;
  lga?: string | null;
  corridor?: string | null;
  commodity?: string | null;
  category?: string | null;
  severity: LogisticsSeverity;
  status: "IDENTIFIED" | "INVESTIGATING" | "MITIGATED" | "RESOLVED" | "ARCHIVED";
  evidence: string;
  affectedScope: string;
  alternativeAvailable: boolean;
  recommendedAction: string;
  confidence: number;
  firstObservedAt?: string;
  lastObservedAt?: string;
  resolvedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface LogisticsRecommendationRecord {
  id?: string;
  snapshotId?: string | null;
  title: string;
  strategy: LogisticsRecommendationStrategy;
  state: string;
  corridor?: string | null;
  commodity?: string | null;
  severity: LogisticsSeverity;
  status: RecommendationLifecycleStatus;
  summary: string;
  reasoning: string;
  evidenceCitations: Array<{
    sourceType: string;
    description: string;
    relevance: number;
  }>;
  confidence: number;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  actionedBy?: string | null;
  actionedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// -----------------------------------------------------------------------------
// 4. PERSISTENT RECORDS & DASHBOARD METRICS
// -----------------------------------------------------------------------------

export interface LogisticsIntelligenceSnapshotRecord {
  id?: string;
  corridor: string | null;
  state: string;
  lga: string | null;
  commodity: string | null;
  category: string | null;
  pressure_score: number;
  pressure_level: LogisticsPressureLevel;
  resilience_score: number;
  resilience_level: LogisticsResilienceLevel;
  pressure_components: LogisticsPressureComponents | Record<string, unknown>;
  resilience_components: LogisticsResilienceComponents | Record<string, unknown>;
  key_drivers: string[];
  missing_evidence: string[];
  vulnerability_factors: string[];
  adaptive_capacities: string[];
  confidence: number;
  metadata?: Record<string, unknown>;
  calculated_at?: string;
}

export interface LogisticsOverviewStats {
  averagePressureScore: number;
  averageResilienceScore: number;
  activeBottlenecksCount: number;
  criticalDependenciesCount: number;
  pendingRecommendationsCount: number;
  activeDeliveriesCount: number;
  activeProvidersCount: number;
  evaluatedCorridorsCount: number;
}

export interface LogisticsRunResult {
  success: boolean;
  state: string;
  corridor?: string | null;
  commodity?: string | null;
  pressureIndex: LogisticsPressureIndex;
  resilienceAssessment: LogisticsResilienceAssessment;
  dependencies: LogisticsCorridorDependencyItem[];
  bottlenecks: LogisticsBottleneckItem[];
  recommendations: LogisticsRecommendationRecord[];
  aiInterpretation?: StructuredReasoningOutput | null;
  aiSkippedOrFailed?: boolean;
}
