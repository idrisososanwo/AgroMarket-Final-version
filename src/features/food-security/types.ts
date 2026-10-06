/**
 * AgroMarket Phase 2.8: Food Security & Agricultural Resilience Agent Types
 *
 * Domain contracts, interfaces, and early-warning early-indicators.
 *
 * SAFETY INVARIANT:
 * This system is an internal analytical early-warning indicator.
 * It is NOT an official government food-security agency, emergency-response authority,
 * military/security system, food-safety regulator, veterinary authority, or halal certifier.
 * Human and institutional decision-makers remain authoritative.
 */

import { NigerianState } from "@/features/ecosystem/types";
import { StructuredReasoningOutput } from "@/features/intelligence/reasoning-contracts";

// -----------------------------------------------------------------------------
// 1. DOMAIN ENUMS & CLASSIFICATIONS
// -----------------------------------------------------------------------------

export const FOOD_SECURITY_PRESSURE_LEVELS = [
  "LOW_PRESSURE",
  "MODERATE_PRESSURE",
  "HIGH_PRESSURE",
  "CRITICAL_PRESSURE",
  "INSUFFICIENT_DATA",
] as const;
export type FoodSecurityPressureLevel = (typeof FOOD_SECURITY_PRESSURE_LEVELS)[number];

export const AGRICULTURAL_RESILIENCE_LEVELS = [
  "HIGH_RESILIENCE",
  "MODERATE_RESILIENCE",
  "VULNERABLE",
  "CRITICALLY_VULNERABLE",
  "INSUFFICIENT_DATA",
] as const;
export type AgriculturalResilienceLevel = (typeof AGRICULTURAL_RESILIENCE_LEVELS)[number];

export const ALERT_SEVERITIES = [
  "INFO",
  "WATCH",
  "ELEVATED",
  "HIGH",
  "CRITICAL",
] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_LIFECYCLE_STATUSES = [
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "ACKNOWLEDGED",
  "RESOLVED",
  "ARCHIVED",
] as const;
export type AlertLifecycleStatus = (typeof ALERT_LIFECYCLE_STATUSES)[number];

export const DEPENDENCY_TYPES = [
  "REGIONAL_SUPPLY_CONCENTRATION",
  "PROCESSING_BOTTLENECK_DEPENDENCY",
  "CORRIDOR_TRANSIT_DEPENDENCY",
  "SUPPLIER_CONCENTRATION_DEPENDENCY",
  "SINGLE_POINT_FAILURE",
] as const;
export type DependencyType = (typeof DEPENDENCY_TYPES)[number];

export const AVAILABILITY_STATUSES = [
  "ADEQUATE",
  "MODERATE_DEFICIT",
  "SEVERE_DEFICIT",
  "INSUFFICIENT_DATA",
] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const AFFORDABILITY_STATUSES = [
  "STABLE",
  "MODERATE_PRESSURE",
  "SEVERE_PRESSURE",
  "INSUFFICIENT_DATA",
] as const;
export type AffordabilityStatus = (typeof AFFORDABILITY_STATUSES)[number];

export const ACCESS_STATUSES = [
  "NORMAL",
  "ACCESS_PRESSURE",
  "ACCESS_CONSTRAINT",
  "INSUFFICIENT_DATA",
] as const;
export type AccessStatus = (typeof ACCESS_STATUSES)[number];

export const STABILITY_STATUSES = [
  "STABLE",
  "MODERATE_VOLATILITY",
  "SEVERE_VOLATILITY",
  "INSUFFICIENT_DATA",
] as const;
export type StabilityStatus = (typeof STABILITY_STATUSES)[number];

export const SOURCE_VERIFICATION_STATUSES = [
  "VERIFIED",
  "OFFICIAL",
  "SECONDARY",
  "UNVERIFIED",
  "SIMULATED",
] as const;
export type SourceVerificationStatus = (typeof SOURCE_VERIFICATION_STATUSES)[number];

// -----------------------------------------------------------------------------
// 2. PRESSURE & RESILIENCE SCORE CONTRACTS
// -----------------------------------------------------------------------------

export interface FoodSecurityPressureComponents {
  supplyPressure: number;       // max 25
  demandPressure: number;       // max 15
  marketPricePressure: number;  // max 15
  regionalSupplyGap: number;    // max 15
  productionRisk: number;       // max 10
  logisticsRisk: number;        // max 10
  securityRisk: number;         // max 5
  processingBottleneck: number; // max 5
}

export interface FoodSecurityPressureIndex {
  score: number; // 0.0 to 100.0
  level: FoodSecurityPressureLevel;
  components: FoodSecurityPressureComponents;
  keyDrivers: string[];
  missingEvidence: string[];
  confidence: number; // 0.0 to 1.0
}

export interface ResilienceComponents {
  supplyDiversification: number;   // max 15
  regionalDiversification: number; // max 15
  productionDiversity: number;     // max 15
  processingRedundancy: number;    // max 15
  logisticsRedundancy: number;     // max 15
  marketDiversification: number;   // max 15
  aggregationCapacity: number;     // max 10
}

export interface AgriculturalResilienceAssessment {
  score: number; // 0.0 to 100.0
  level: AgriculturalResilienceLevel;
  components: ResilienceComponents;
  vulnerabilityFactors: string[];
  adaptiveCapacities: string[];
  confidence: number; // 0.0 to 1.0
}

export interface CriticalDependencyItem {
  id?: string;
  snapshotId?: string | null;
  commodity: string;
  state: NigerianState | string;
  dependencyType: DependencyType;
  dominantEntity: string;
  concentrationRatio: number;
  thresholdExceeded: number;
  alternativeOptionsAvailable: number;
  riskAssessment: string;
}

// -----------------------------------------------------------------------------
// 3. SOURCE GOVERNANCE & METADATA
// -----------------------------------------------------------------------------

export interface SourceGovernanceMetadata {
  sourceName: string;
  sourceType: "PLATFORM_TRANSACTION" | "PRICE_OBSERVATION" | "MARKET_INTELLIGENCE" | "PRODUCTION_PLANNING" | "DEMAND_INTELLIGENCE" | "SUPPLY_MATCHING" | "SECURITY_INCIDENT" | "OFFICIAL_SURVEY";
  verificationStatus: SourceVerificationStatus;
  publicationDate?: string;
  dataTimestamp: string;
  isSimulated?: boolean;
}

// -----------------------------------------------------------------------------
// 4. PERSISTENT RECORDS & RUN OUTCOMES
// -----------------------------------------------------------------------------

export interface FoodSecuritySnapshotRecord {
  id?: string;
  commodity: string | null;
  state: string;
  lga: string | null;
  geopolitical_zone: string | null;
  pressure_score: number;
  pressure_level: FoodSecurityPressureLevel;
  component_scores: FoodSecurityPressureComponents | Record<string, unknown>;
  availability_status: AvailabilityStatus;
  affordability_status: AffordabilityStatus;
  access_status: AccessStatus;
  stability_status: StabilityStatus;
  key_drivers: string[];
  constraints: string[];
  missing_evidence: string[];
  confidence: number;
  metadata?: Record<string, unknown>;
  calculated_at?: string;
}

export interface AgriculturalResilienceSnapshotRecord {
  id?: string;
  commodity: string | null;
  state: string;
  lga: string | null;
  resilience_score: number;
  resilience_level: AgriculturalResilienceLevel;
  component_scores: ResilienceComponents | Record<string, unknown>;
  vulnerability_factors: string[];
  adaptive_capacities: string[];
  confidence: number;
  metadata?: Record<string, unknown>;
  calculated_at?: string;
}

export interface FoodSecurityAlertRecord {
  id?: string;
  snapshot_id?: string | null;
  title: string;
  commodity: string | null;
  state: string;
  lga: string | null;
  severity: AlertSeverity;
  status: AlertLifecycleStatus;
  summary: string;
  evidence_summary: string;
  contributing_signals: string[];
  source_governance: SourceGovernanceMetadata | Record<string, unknown>;
  is_public: boolean;
  confidence: number;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  published_at?: string | null;
  resolved_at?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface FoodSecurityOverviewStats {
  averagePressureScore: number;
  averageResilienceScore: number;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  highPressureCommoditiesCount: number;
  stressedRegionsCount: number;
  criticalDependenciesCount: number;
  totalEvaluatedStatesCount: number;
}

export interface FoodSecurityRunResult {
  success: boolean;
  commodity?: string | null;
  state: string;
  pressureIndex: FoodSecurityPressureIndex;
  resilienceAssessment: AgriculturalResilienceAssessment;
  dependencies: CriticalDependencyItem[];
  candidateAlerts: FoodSecurityAlertRecord[];
  aiInterpretation?: StructuredReasoningOutput | null;
  aiSkippedOrFailed?: boolean;
}
