/**
 * AgroMarket Phase 3.0: Agricultural Disease & Biosecurity Intelligence Agent
 * Domain Contracts, Types, and Interfaces
 *
 * SAFETY INVARIANTS:
 * 1. Decision-support & early-warning indicator ONLY — NOT veterinary diagnostic, medical, or certification authority.
 * 2. Deterministic calculations are authoritative; AI Gateway is strictly advisory interpretation.
 * 3. Human review mandatory for critical/public alerts (DRAFT -> REVIEW -> PUBLISHED).
 * 4. Zero pig/pork produce tolerance across all parameters, prompts, alerts, and records.
 * 5. Commercial confidentiality preserved: no private farm coordinates, addresses, or records exposed.
 * 6. Never fabricates fake disease events, laboratory results, or veterinary diagnoses.
 */

import { NIGERIAN_STATES } from "@/features/marketplace/constants";

export type NigerianState = (typeof NIGERIAN_STATES)[number];

// -----------------------------------------------------------------------------
// 1. ENUMS & CONSTANTS
// -----------------------------------------------------------------------------

export const DISEASE_VERIFICATION_STATUSES = [
  "VERIFIED",
  "OFFICIAL",
  "SECONDARY",
  "UNVERIFIED",
  "SIMULATED",
] as const;
export type DiseaseVerificationStatus = (typeof DISEASE_VERIFICATION_STATUSES)[number];

export const DISEASE_OBSERVATION_TYPES = [
  "MORTALITY_SIGNAL",
  "PRODUCTION_HEALTH_DISRUPTION",
  "CROP_HEALTH_DISRUPTION",
  "AQUACULTURE_HEALTH_SIGNAL",
  "BIOSECURITY_RESTRICTION",
  "MOVEMENT_HEALTH_RESTRICTION",
  "OFFICIAL_ADVISORY",
  "SURVEILLANCE_NOTICE",
  "VETERINARY_COMMUNICATION",
  "PEST_VECTOR_INFESTATION",
  "ABNORMAL_YIELD_LOSS",
] as const;
export type DiseaseObservationType = (typeof DISEASE_OBSERVATION_TYPES)[number];

export const DISEASE_SOURCE_TYPES = [
  "OFFICIAL_VETERINARY",
  "GOVERNMENT_MINISTRY",
  "RESEARCH_INSTITUTE",
  "EXTENSION_OFFICER",
  "COMMERCIAL_OBSERVATION",
  "COOPERATIVE_REPORT",
  "PUBLIC_MEDIA",
  "SIMULATED",
] as const;
export type DiseaseSourceType = (typeof DISEASE_SOURCE_TYPES)[number];

export const DISEASE_RISK_LEVELS = [
  "LOW_RISK",
  "MODERATE_RISK",
  "ELEVATED_RISK",
  "HIGH_RISK",
  "CRITICAL_RISK",
  "INSUFFICIENT_DATA",
] as const;
export type DiseaseRiskLevel = (typeof DISEASE_RISK_LEVELS)[number];

export const BIOSECURITY_RESILIENCE_LEVELS = [
  "HIGH_RESILIENCE",
  "MODERATE_RESILIENCE",
  "VULNERABLE",
  "CRITICALLY_VULNERABLE",
  "INSUFFICIENT_DATA",
] as const;
export type BiosecurityResilienceLevel = (typeof BIOSECURITY_RESILIENCE_LEVELS)[number];

export const ALERT_LIFECYCLE_STATUSES = [
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "ACKNOWLEDGED",
  "RESOLVED",
  "ARCHIVED",
] as const;
export type AlertLifecycleStatus = (typeof ALERT_LIFECYCLE_STATUSES)[number];

export const BIOSECURITY_SEVERITIES = [
  "INFO",
  "WATCH",
  "ELEVATED",
  "HIGH",
  "CRITICAL",
] as const;
export type BiosecuritySeverity = (typeof BIOSECURITY_SEVERITIES)[number];

export const BIOSECURITY_DEPENDENCY_TYPES = [
  "REGIONAL_PRODUCTION_CONCENTRATION",
  "MOVEMENT_DEPENDENCY",
  "PROCESSING_DEPENDENCY",
  "SOURCE_SUPPLIER_DEPENDENCY",
] as const;
export type BiosecurityDependencyType = (typeof BIOSECURITY_DEPENDENCY_TYPES)[number];

export const AGRICULTURAL_HEALTH_DOMAINS = [
  "LIVESTOCK",
  "CROPS",
  "AQUACULTURE",
  "BIOSECURITY",
] as const;
export type AgriculturalHealthDomain = (typeof AGRICULTURAL_HEALTH_DOMAINS)[number];

// -----------------------------------------------------------------------------
// 2. SCORE & FORMULA CONTRACTS
// -----------------------------------------------------------------------------

/**
 * 7-Component Deterministic Disease Risk Index (100% Total)
 * Evidence Strength (20%) + Signal Convergence (20%) + Geographic Concentration (15%) +
 * Commodity Exposure (15%) + Production Impact Evidence (10%) + Movement/Biosecurity Exposure (10%) +
 * Supply Impact Evidence (10%) = 100%
 */
export interface DiseaseRiskComponents {
  evidenceStrength: number;              // max 20
  signalConvergence: number;             // max 20
  geographicConcentration: number;        // max 15
  commodityExposure: number;              // max 15
  productionImpactEvidence: number;      // max 10
  movementBiosecurityExposure: number;   // max 10
  supplyImpactEvidence: number;          // max 10
}

export interface DiseaseRiskIndex {
  score: number; // 0.0 to 100.0
  level: DiseaseRiskLevel;
  components: DiseaseRiskComponents;
  keyDrivers: string[];
  missingEvidence: string[];
  confidence: number; // 0.0 to 1.0
}

/**
 * 8-Dimension Biosecurity Resilience Score (100% Total)
 * Production Diversification (15%) + Regional Diversification (15%) +
 * Supplier/Source Diversity (10%) + Movement Flexibility (15%) +
 * Aggregation Flexibility (10%) + Processing Redundancy (10%) +
 * Market Diversification (10%) + Observed Response Capacity (15%) = 100%
 */
export interface BiosecurityResilienceComponents {
  productionDiversification: number;      // max 15
  regionalDiversification: number;        // max 15
  supplierSourceDiversity: number;        // max 10
  movementFlexibility: number;            // max 15
  aggregationFlexibility: number;         // max 10
  processingRedundancy: number;           // max 10
  marketDiversification: number;          // max 10
  observedResponseCapacity: number;       // max 15
}

export interface BiosecurityResilienceAssessment {
  score: number; // 0.0 to 100.0
  level: BiosecurityResilienceLevel;
  components: BiosecurityResilienceComponents;
  vulnerabilityFactors: string[];
  adaptiveCapacities: string[];
  confidence: number; // 0.0 to 1.0
}

// -----------------------------------------------------------------------------
// 3. EVIDENCE & OBSERVATIONS
// -----------------------------------------------------------------------------

export interface DiseaseObservationItem {
  id?: string;
  snapshotId?: string | null;
  observationType: DiseaseObservationType;
  sourceName: string;
  sourceType: DiseaseSourceType;
  sourceUrl?: string | null;
  verificationStatus: DiseaseVerificationStatus;
  reportingAuthority?: string | null;
  state: NigerianState | string;
  lga?: string | null;
  commodity?: string | null;
  category?: string | null;
  evidenceSummary: string;
  observedAt?: string;
  publishedAt?: string | null;
  confidence: number; // 0.0 to 1.0
  metadata?: Record<string, unknown>;
}

export interface SignalConvergenceDetection {
  isConvergent: boolean;
  independentSourceCount: number;
  distinctSourceTypes: DiseaseSourceType[];
  verifiedSourcesCount: number;
  convergenceScore: number; // 0 to 20
  convergenceNotes: string;
}

export interface ValueChainImpactAssessment {
  productionDisruptionLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  aggregationRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  processingRisk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  movementRestrictionPotential: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  supplyAvailabilityImpact: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  foodSecurityImplication: string;
  causationDisclaimer: string;
}

// -----------------------------------------------------------------------------
// 4. DEPENDENCIES & ALERTS
// -----------------------------------------------------------------------------

export interface BiosecurityDependencyItem {
  id?: string;
  snapshotId?: string | null;
  state: NigerianState | string;
  commodity?: string | null;
  dependencyType: BiosecurityDependencyType;
  dominantEntity: string;
  concentrationPercentage: number;
  severity: BiosecuritySeverity;
  status: "ACTIVE" | "MONITORING" | "RESOLVED" | "ARCHIVED";
  riskAssessment: string;
  evidence: string;
  confidence: number;
  observedAt?: string;
}

export interface DiseaseAlertItem {
  id?: string;
  snapshotId?: string | null;
  alertCode: string;
  title: string;
  severity: BiosecuritySeverity;
  status: AlertLifecycleStatus;
  state: NigerianState | string;
  lga?: string | null;
  commodity?: string | null;
  category?: string | null;
  summary: string;
  evidenceSources: Array<{
    sourceName: string;
    sourceType: string;
    verificationStatus: string;
    url?: string | null;
    publicationDate?: string | null;
  }>;
  verificationStatus: DiseaseVerificationStatus;
  limitations: string;
  officialConsultationAdvice: string;
  confidence: number;
  publishedAt?: string | null;
  publishedBy?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// -----------------------------------------------------------------------------
// 5. DATABASE RECORD CONTRACTS & METRICS
// -----------------------------------------------------------------------------

export interface DiseaseSnapshotRecord {
  id?: string;
  state: string;
  lga?: string | null;
  geopolitical_zone?: string | null;
  commodity?: string | null;
  category?: string | null;
  risk_score: number;
  risk_level: DiseaseRiskLevel;
  resilience_score: number;
  resilience_level: BiosecurityResilienceLevel;
  risk_components: DiseaseRiskComponents;
  resilience_components: BiosecurityResilienceComponents;
  evidence_strength: number;
  signal_convergence: number;
  production_impact: number;
  movement_exposure: number;
  supply_impact: number;
  key_drivers: string[];
  missing_evidence: string[];
  vulnerability_factors: string[];
  adaptive_capacities: string[];
  confidence: number;
  calculated_at?: string;
}

export interface DiseaseOverviewStats {
  averageRiskScore: number;
  averageResilienceScore: number;
  activeObservationsCount: number;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  monitoredCommoditiesCount: number;
  monitoredStatesCount: number;
  verifiedSourcesRatio: number;
}

export interface DiseaseRunResult {
  success: boolean;
  state: string;
  commodity?: string | null;
  riskIndex: DiseaseRiskIndex;
  resilienceAssessment: BiosecurityResilienceAssessment;
  convergence: SignalConvergenceDetection;
  valueChainImpact: ValueChainImpactAssessment;
  observations: DiseaseObservationItem[];
  dependencies: BiosecurityDependencyItem[];
  alerts: DiseaseAlertItem[];
  aiReasoning?: {
    interpretation: string;
    confidence: number;
    uncertaintyAnalysis: string;
    missingEvidence: string[];
    recommendedHumanInvestigation: string[];
  };
  error?: string;
}
