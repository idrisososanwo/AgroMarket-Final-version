/**
 * AgroMarket Phase 3.4: Backend Intelligence Feedback Loop
 * Core Domain Contracts, Types, Enums, and Provenance Models
 *
 * SAFETY & GOVERNANCE INVARIANTS:
 * 1. ADVISORY ONLY: AI and intelligence outputs are decision support, never the system of record.
 * 2. NO FAKE DATA: Never fabricate accuracy, farmer counts, volumes, or causal certainties.
 * 3. NO CAUSAL MANUFACTURE: Correlations and outcome observations are association evidence, not causal proof.
 * 4. INSUFFICIENT DATA TRANSPARENCY: Return INSUFFICIENT_DATA when observation data or sample size is inadequate.
 * 5. ANTI-PORK ZERO TOLERANCE: Zero pig/pork produce, swine derivatives, or references across all records.
 * 6. PRIVACY & SECURITY: Zero exposure of farmer private coordinates, phone numbers, or tactical military/security instructions.
 * 7. IMMUTABILITY: Evaluations, evidence records, and learning signals are append-only.
 */

import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { ActorRole } from "@/features/decision-intelligence/types";

export type NigerianState = (typeof NIGERIAN_STATES)[number];

// -----------------------------------------------------------------------------
// 1. CANONICAL AGENTS (9 Canonical Agents)
// -----------------------------------------------------------------------------

export const CANONICAL_AGENT_IDS = [
  "MARKET_INTELLIGENCE_AGENT",
  "PRODUCTION_PLANNING_AGENT",
  "DEMAND_FORECASTING_AGENT",
  "SUPPLY_MATCHING_AGENT",
  "PROCUREMENT_INTELLIGENCE_AGENT",
  "FOOD_SECURITY_RESILIENCE_AGENT",
  "LOGISTICS_INTELLIGENCE_AGENT",
  "AGRICULTURAL_DISEASE_BIOSECURITY_AGENT",
  "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
] as const;

export type CanonicalAgentId = (typeof CANONICAL_AGENT_IDS)[number];

// -----------------------------------------------------------------------------
// 2. AGRICULTURAL DOMAINS (15+ Specialized Domains)
// -----------------------------------------------------------------------------

export const FEEDBACK_DOMAINS = [
  "CROP",
  "LIVESTOCK",
  "POULTRY",
  "AQUACULTURE",
  "DAIRY",
  "PROCESSING",
  "AGGREGATION",
  "B2B_PROCUREMENT",
  "COMMERCE",
  "LOGISTICS",
  "FOOD_SECURITY",
  "AGRICULTURAL_SECURITY",
  "DISEASE_BIOSECURITY",
  "EQUIPMENT",
  "SERVICES",
  "MARKET",
  "PRODUCTION",
  "DEMAND",
  "SUPPLY",
  "ORCHESTRATION",
] as const;

export type FeedbackDomain = (typeof FEEDBACK_DOMAINS)[number];

// -----------------------------------------------------------------------------
// 3. CONTROLLED OUTCOME TAXONOMY
// -----------------------------------------------------------------------------

export const OUTCOME_TYPES = [
  "SUPPLY_SOURCED",
  "SUPPLY_PARTIALLY_SOURCED",
  "SUPPLY_NOT_SOURCED",
  "PROCUREMENT_COMPLETED",
  "PROCUREMENT_PARTIALLY_COMPLETED",
  "PROCUREMENT_FAILED",
  "MARKETPLACE_PURCHASE_COMPLETED",
  "MARKETPLACE_PURCHASE_CANCELLED",
  "PRODUCTION_PLAN_ACCEPTED",
  "PRODUCTION_PLAN_DEFERRED",
  "PRODUCTION_PLAN_COMPLETED",
  "LOGISTICS_MOVEMENT_COMPLETED",
  "LOGISTICS_DELAYED",
  "LOGISTICS_CANCELLED",
  "EQUIPMENT_RENTAL_COMPLETED",
  "SERVICE_REQUEST_COMPLETED",
  "SHARED_PURCHASE_COMPLETED",
  "SHARED_PURCHASE_CANCELLED",
  "FOOD_SECURITY_RESPONSE_COMPLETED",
  "FOOD_SECURITY_RESPONSE_DEFERRED",
  "INTELLIGENCE_DISMISSED",
  "INTELLIGENCE_CONFIRMED",
  "INTELLIGENCE_UNCONFIRMED",
  "OTHER",
] as const;

export type OutcomeType = (typeof OUTCOME_TYPES)[number];

// -----------------------------------------------------------------------------
// 4. OUTCOME LIFECYCLE & COMPLETE LOOP STAGES
// -----------------------------------------------------------------------------

export const OUTCOME_STATUSES = [
  "OUTCOME_OBSERVED",
  "OUTCOME_UNKNOWN",
  "OUTCOME_EVALUATED",
] as const;

export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number];

export const LOOP_STAGES = [
  "RECOMMENDATION_GENERATED",
  "RECOMMENDATION_VIEWED",
  "RECOMMENDATION_ACCEPTED",
  "RECOMMENDATION_REJECTED",
  "RECOMMENDATION_DEFERRED",
  "DECISION_CREATED",
  "ACTION_INITIATED",
  "ACTION_COMPLETED",
  "ACTION_FAILED",
  "ACTION_CANCELLED",
  "ACTION_EXPIRED",
  "OUTCOME_OBSERVED",
  "OUTCOME_UNKNOWN",
  "OUTCOME_EVALUATED",
] as const;

export type LoopStage = (typeof LOOP_STAGES)[number];

// -----------------------------------------------------------------------------
// 5. PROVENANCE & EVIDENCE TAXONOMY
// -----------------------------------------------------------------------------

export const PROVENANCE_NATURES = [
  "OBSERVED",    // Ground truth directly observed
  "DERIVED",     // Calculated via deterministic logic
  "CORRELATED",  // Empirically correlated signal
  "ESTIMATED",   // Model estimation / projection
  "UNKNOWN",     // Insufficient provenance details
] as const;

export type ProvenanceNature = (typeof PROVENANCE_NATURES)[number];

export const OUTCOME_EVIDENCE_TYPES = [
  "TRANSACTION_RECEIPT",
  "DELIVERY_WAYBILL",
  "HARVEST_INSPECTION",
  "QUALITY_GRADING",
  "PARTNER_CONFIRMATION",
  "GROUND_TRUTH_OBSERVATION",
  "USER_ATTESTATION",
  "CORRIDOR_SURVEILLANCE",
  "MARKET_SURVEY",
  "SYSTEM_EVENT_AUDIT",
  "OTHER",
] as const;

export type OutcomeEvidenceType = (typeof OUTCOME_EVIDENCE_TYPES)[number];

export const EVIDENCE_SOURCE_TYPES = [
  "SYSTEM_EVENT",
  "VERIFIED_TRANSACTION",
  "USER_REPORT",
  "EXTERNAL_SOURCE",
  "AGENT_OBSERVATION",
] as const;

export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number];

// -----------------------------------------------------------------------------
// 6. EVALUATION STATUSES, USEFULNESS & TIMELINESS
// -----------------------------------------------------------------------------

export const EVALUATION_STATUSES = [
  "INSUFFICIENT_DATA",
  "PENDING",
  "EVALUATED",
  "NOT_EVALUABLE",
] as const;

export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];

export const USEFULNESS_RATINGS = [
  "VERY_USEFUL",
  "USEFUL",
  "NEUTRAL",
  "NOT_USEFUL",
  "HARMFUL",
  "UNKNOWN",
  "INSUFFICIENT_DATA",
] as const;

export type UsefulnessRating = (typeof USEFULNESS_RATINGS)[number];

export const TIMELINESS_STATUSES = [
  "EARLY",
  "ON_TIME",
  "LATE",
  "EXPIRED",
  "NOT_EVALUABLE",
  "INSUFFICIENT_DATA",
] as const;

export type TimelinessStatus = (typeof TIMELINESS_STATUSES)[number];

export const TIME_HORIZONS = [
  "SHORT_TERM_0_7D",
  "MEDIUM_TERM_8_30D",
  "LONG_TERM_31_90D",
] as const;

export type TimeHorizon = (typeof TIME_HORIZONS)[number];

// -----------------------------------------------------------------------------
// 7. LEARNING SIGNALS
// -----------------------------------------------------------------------------

export const LEARNING_SIGNAL_TYPES = [
  "RECOMMENDATION_SUCCESS_RATE",
  "FALSE_POSITIVE_SIGNAL",
  "FALSE_NEGATIVE_SIGNAL",
  "PREDICTION_ERROR",
  "DEMAND_FORECAST_ERROR",
  "SUPPLY_MATCH_EFFECTIVENESS",
  "PROCUREMENT_MATCH_EFFECTIVENESS",
  "LOGISTICS_PREDICTION_ERROR",
  "CONFIDENCE_CALIBRATION_SIGNAL",
  "DATA_QUALITY_ISSUE",
] as const;

export type LearningSignalType = (typeof LEARNING_SIGNAL_TYPES)[number];

// -----------------------------------------------------------------------------
// 8. DATA QUALITY FEEDBACK ISSUES
// -----------------------------------------------------------------------------

export const DATA_QUALITY_ISSUE_TYPES = [
  "STALE_OBSERVATION",
  "CONFLICTING_OBSERVATION",
  "MISSING_SOURCE_PROVENANCE",
  "INSUFFICIENT_SAMPLE_SIZE",
  "INCONSISTENT_UNITS",
  "REGIONAL_DATA_GAPS",
  "DUPLICATE_OBSERVATIONS",
  "SUSPICIOUS_VALUES",
  "INSUFFICIENT_INDEPENDENT_SOURCES",
] as const;

export type DataQualityIssueType = (typeof DATA_QUALITY_ISSUE_TYPES)[number];

export const DATA_QUALITY_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type DataQualitySeverity = (typeof DATA_QUALITY_SEVERITIES)[number];

export const DATA_QUALITY_STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"] as const;
export type DataQualityStatus = (typeof DATA_QUALITY_STATUSES)[number];

// -----------------------------------------------------------------------------
// 9. CORE DATA MODELS & CONTRACTS
// -----------------------------------------------------------------------------

export interface FeedbackOutcomeRecord {
  id: string;
  recommendationId: string;
  decisionId?: string | null;
  actionId?: string | null;
  actionIntegrationId?: string | null;
  outcomeType: OutcomeType;
  status: OutcomeStatus;
  decision: string;
  actionTaken: string;
  actionTime: string;
  observedOutcome: string;
  expectedOutcome: string;
  variance: string;
  evaluationScore: number; // 0.0 - 100.0
  lessonsLearned: string;
  actorRole?: ActorRole | string | null;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  recordedBy?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OutcomeEvidenceItem {
  id: string;
  outcomeId: string;
  evidenceType: OutcomeEvidenceType;
  sourceType: EvidenceSourceType;
  sourceReference?: string | null;
  provenanceNature: ProvenanceNature;
  observedAt: string;
  confidence: number; // 0.000 - 1.000
  description: string;
  quantitativeValue?: number | null;
  unit?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface FeedbackEvaluationItem {
  id: string;
  recommendationId: string;
  outcomeId?: string | null;
  agentId: CanonicalAgentId | string;
  domain: FeedbackDomain;
  evaluationStatus: EvaluationStatus;
  accuracyScore?: number | null; // 0.000 - 1.000
  usefulnessRating: UsefulnessRating;
  timeliness: TimelinessStatus;
  timeHorizon: TimeHorizon;
  predictedState?: string | null;
  actualState?: string | null;
  varianceAnalysis?: string | null;
  evaluationNotes?: string | null;
  evaluatedBy?: string | null;
  evaluatedAt: string;
  createdAt: string;
}

export interface LearningSignalItem {
  id: string;
  evaluationId?: string | null;
  agentId: CanonicalAgentId | string;
  domain: FeedbackDomain;
  signalType: LearningSignalType;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  sampleSize: number;
  metricValue?: number | null;
  confidence: number; // 0.000 - 1.000
  interpretation: string;
  metadata?: Record<string, unknown>;
  generatedAt: string;
  createdAt: string;
}

export interface DataQualityIssueItem {
  id: string;
  issueType: DataQualityIssueType;
  severity: DataQualitySeverity;
  domain: FeedbackDomain;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  affectedEntityType: string;
  affectedEntityId?: string | null;
  description: string;
  evidenceDetails?: Record<string, unknown>;
  status: DataQualityStatus;
  resolutionNotes?: string | null;
  reportedBy?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 10. UNIFIED AGENT PERFORMANCE EVALUATION MODEL
// -----------------------------------------------------------------------------

export interface AgentPerformanceSummary {
  agentId: CanonicalAgentId | string;
  agentName: string;
  domain: FeedbackDomain | string;
  totalRecommendationsGenerated: number;
  totalDecisionsResulted: number;
  totalActionsInitiated: number;
  totalOutcomesObserved: number;
  totalEvaluationsCount: number;

  // Evaluated Performance Rates (or null if insufficient data)
  evaluationState: "INSUFFICIENT_DATA" | "EVALUATED";
  meanAccuracyScore: number | null; // 0.0 - 1.0
  usefulnessRate: number | null; // Percentage rated USEFUL or VERY_USEFUL
  timelinessRate: number | null; // Percentage ON_TIME or EARLY
  meanConfidence: number; // Stated agent confidence

  // Calibration check (Difference between stated confidence and actual outcome accuracy)
  calibrationBias: number | null; // positive = overconfident, negative = underconfident

  // Core Evaluation Summary answering 8 Questions
  answers: {
    whichAgent: string;
    evidenceUsedCount: number;
    statedConfidence: number;
    decisionsCount: number;
    actionsCount: number;
    outcomesObservedCount: number;
    wasUseful: string;
    wasPredictionCorrect: string;
  };

  disclaimer: string;
}
