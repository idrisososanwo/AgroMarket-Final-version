/**
 * AgroMarket Phase 3.1: Agricultural Intelligence Orchestration & Cross-Domain Decision Engine
 * Domain Contracts, Enums, Interfaces, and Invariants
 *
 * SAFETY & ARCHITECTURAL INVARIANTS:
 * 1. Orchestration is a coordination layer above specialized domain agents, not a replacement.
 * 2. Deterministic calculations are authoritative for quantitative aggregation, priority, and conflicts.
 * 3. AI Gateway reasoning is strictly advisory interpretation.
 * 4. Human-in-the-loop is mandatory for all consequential decisions.
 * 5. Commercial confidentiality preserved: no private farmer identities, coordinates, or buyer PII.
 * 6. Zero pig/pork tolerance throughout all parameters, prompts, alerts, and records.
 * 7. Never fabricates fake evidence or causal connections.
 */

import { NIGERIAN_STATES } from "@/features/marketplace/constants";

export type NigerianState = (typeof NIGERIAN_STATES)[number];

// -----------------------------------------------------------------------------
// 1. ENUMS & CONSTANTS
// -----------------------------------------------------------------------------

export const SPECIALIZED_AGENT_DOMAINS = [
  "MARKET",
  "PRODUCTION",
  "DEMAND",
  "SUPPLY",
  "PROCUREMENT",
  "FOOD_SECURITY",
  "LOGISTICS",
  "DISEASE_BIOSECURITY",
] as const;

export type SpecializedAgentDomain = (typeof SPECIALIZED_AGENT_DOMAINS)[number];

export const VALUE_CHAIN_STAGES = [
  "PRODUCTION",
  "AGGREGATION",
  "PROCESSING",
  "LOGISTICS",
  "DISTRIBUTION",
  "RETAIL",
  "CONSUMPTION",
] as const;

export type ValueChainStage = (typeof VALUE_CHAIN_STAGES)[number];

export const CORRELATION_TIME_WINDOWS = [
  "SHORT_TERM",   // <= 7 days
  "MEDIUM_TERM",  // 8 - 30 days
  "LONGER_TERM",  // 31 - 90 days
] as const;

export type CorrelationTimeWindow = (typeof CORRELATION_TIME_WINDOWS)[number];

export const ORCHESTRATION_SCENARIO_TYPES = [
  "SUPPLY_SHORTAGE_SCENARIO",
  "DISEASE_SUPPLY_RISK_SCENARIO",
  "LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO",
  "PROCUREMENT_RISK_SCENARIO",
  "FOOD_SECURITY_PRESSURE_SCENARIO",
  "MULTI_DOMAIN_RISK_SCENARIO",
  "BALANCED_NOMINAL_SCENARIO",
] as const;

export type OrchestrationScenarioType = (typeof ORCHESTRATION_SCENARIO_TYPES)[number];

export const ORCHESTRATION_PRIORITY_LEVELS = [
  "CRITICAL", // 80 - 100
  "HIGH",     // 60 - 79
  "MEDIUM",   // 40 - 59
  "LOW",      // < 40
] as const;

export type OrchestrationPriorityLevel = (typeof ORCHESTRATION_PRIORITY_LEVELS)[number];

export const RECOMMENDATION_LIFECYCLE_STATUSES = [
  "PROPOSED",
  "REVIEWED",
  "ACCEPTED",
  "REJECTED",
  "ACTIONED",
  "COMPLETED",
] as const;

export type RecommendationLifecycleStatus = (typeof RECOMMENDATION_LIFECYCLE_STATUSES)[number];

export const CONFLICT_STATUSES = [
  "ACTIVE",
  "INVESTIGATING",
  "RESOLVED",
  "DISMISSED",
] as const;

export type ConflictStatus = (typeof CONFLICT_STATUSES)[number];

// -----------------------------------------------------------------------------
// 2. NORMALIZED AGENT OUTPUT CONTRACT
// -----------------------------------------------------------------------------

export interface AgentGeographicScope {
  state?: string | null;
  lga?: string | null;
  geopoliticalZone?: string | null;
  corridor?: string | null;
  tradingHub?: string | null;
}

export interface AgentOutputContribution {
  agentId: string;
  agentType: string;
  domain: SpecializedAgentDomain;
  geographicScope: AgentGeographicScope;
  state: string | null;
  lga: string | null;
  geopoliticalZone: string | null;
  commodity: string | null;
  commodityCategory: string | null;
  signalType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number; // 0 - 100
  confidence: number; // 0.0 - 1.0
  evidenceConfidence: number; // 0.0 - 1.0
  evidenceCount: number;
  observationTime: string;
  generatedAt: string;
  sourceReferences: string[];
  affectedValueChainStage: ValueChainStage;
  dependencies: string[];
  limitations: string[];
  recommendationCandidates: string[];
}

// -----------------------------------------------------------------------------
// 3. CROSS-DOMAIN CORRELATION & CONFLICT
// -----------------------------------------------------------------------------

export interface CrossDomainCorrelationMatch {
  domains: SpecializedAgentDomain[];
  commodity: string | null;
  state: string | null;
  lga: string | null;
  geopoliticalZone: string | null;
  timeWindow: CorrelationTimeWindow;
  valueChainStages: ValueChainStage[];
  contributingSignalsCount: number;
  distinctSourceCount: number;
  agreementRatio: number;
}

export interface IntelligenceConflictItem {
  id?: string;
  conflictType: string;
  domainA: SpecializedAgentDomain;
  domainB: SpecializedAgentDomain;
  signalA: string;
  signalB: string;
  state?: string | null;
  lga?: string | null;
  commodity?: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: ConflictStatus;
  explanation: string;
  confidenceImpact: number; // e.g. 0.20 deduction
  recommendedHumanReview: string;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
}

// -----------------------------------------------------------------------------
// 4. DETERMINISTIC PRIORITY SCORE & CONFIDENCE
// -----------------------------------------------------------------------------

export interface PriorityScoreBreakdown {
  crossDomainSeverity: number;     // 25% max 25
  evidenceConfidence: number;       // 20% max 20
  foodSecurityExposure: number;     // 15% max 15
  supplyExposure: number;           // 15% max 15
  geographicConcentration: number;  // 10% max 10
  logisticsExposure: number;        // 5% max 5
  procurementExposure: number;      // 5% max 5
  timeSensitivity: number;          // 5% max 5
  totalScore: number;               // 0 - 100
}

export interface OrchestrationConfidenceMetrics {
  domainScore: number;              // 0 - 100 (aggregated domain severity)
  evidenceConfidence: number;       // 0.0 - 1.0 (mean evidence credibility)
  orchestrationConfidence: number;  // 0.0 - 1.0 (calibrated systemic confidence)
  confidenceDegradation: number;    // deduction due to conflicts or missing evidence
  independentSourcesCount: number;
  conflictsPenaltyApplied: number;
}

// -----------------------------------------------------------------------------
// 5. GOVERNED RECOMMENDATIONS & OUTCOMES
// -----------------------------------------------------------------------------

export interface OrchestrationRecommendationItem {
  id?: string;
  snapshotId?: string | null;
  title: string;
  summary: string;
  actionPath: string;
  priority: OrchestrationPriorityLevel;
  confidence: number;
  affectedDomains: SpecializedAgentDomain[];
  affectedCommodities: string[];
  affectedStates: string[];
  status: RecommendationLifecycleStatus;
  advisoryDisclaimer: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  outcomeId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrchestrationOutcomeItem {
  id?: string;
  recommendationId: string;
  decision: string;
  actionTaken: string;
  actionTime?: string;
  observedOutcome: string;
  expectedOutcome: string;
  variance: string;
  evaluationScore: number; // 0 - 100
  lessonsLearned: string;
  recordedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// -----------------------------------------------------------------------------
// 6. SNAPSHOT & RUN RESULTS
// -----------------------------------------------------------------------------

export interface OrchestrationSnapshotRecord {
  id?: string;
  scenario_type: OrchestrationScenarioType;
  priority_score: number;
  priority_level: OrchestrationPriorityLevel;
  orchestration_confidence: number;
  domain_score: number;
  evidence_confidence: number;
  geographic_scope: string | null;
  state: string | null;
  lga: string | null;
  geopolitical_zone: string | null;
  commodity: string | null;
  commodity_category: string | null;
  affected_domains: string[];
  contributing_agents: string[];
  contributing_signals: unknown[];
  scenario_summary: string;
  deterministic_findings: Record<string, unknown>;
  conflict_detected: boolean;
  conflict_details: unknown | null;
  evidence_summary: string;
  component_breakdown: PriorityScoreBreakdown;
  generated_at: string;
  created_at?: string;
}

export interface OrchestrationOverviewStats {
  totalSnapshotsCount: number;
  criticalScenariosCount: number;
  highScenariosCount: number;
  activeConflictsCount: number;
  proposedRecommendationsCount: number;
  averagePriorityScore: number;
  averageOrchestrationConfidence: number;
  activeMonitoredCommoditiesCount: number;
  activeMonitoredStatesCount: number;
}

export interface OrchestrationRunResult {
  snapshot: OrchestrationSnapshotRecord;
  scenarioType: OrchestrationScenarioType;
  priorityScore: number;
  priorityLevel: OrchestrationPriorityLevel;
  confidenceMetrics: OrchestrationConfidenceMetrics;
  breakdown: PriorityScoreBreakdown;
  conflicts: IntelligenceConflictItem[];
  recommendations: OrchestrationRecommendationItem[];
  aiInterpretation?: {
    summary: string;
    strategicContext: string;
    confidence: number;
    uncertaintyAnalysis: string;
    suggestedHumanActions: string[];
  } | null;
}
