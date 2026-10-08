/**
 * AgroMarket Phase 3.7: Cross-Horizon Scenario Modeling & Forward Planning Intelligence
 * Domain Contracts, Enums, Interfaces, and Safety Invariants
 *
 * PIPELINE ALIGNMENT:
 * HISTORICAL MEMORY (Phase 3.5)
 * -> CURRENT CONDITIONS (Phase 2.1 - 3.1)
 * -> FORECAST (Phase 3.6)
 * -> SCENARIO MODELING (Phase 3.7)
 * -> FORWARD PLANNING IMPLICATIONS (Phase 3.7)
 * -> LATER OUTCOME (Phase 3.4)
 * -> EVALUATION & LEARNING (Phase 3.4)
 *
 * SAFETY INVARIANTS:
 * 1. ADVISORY ONLY: Scenario intelligence surfaces forward planning implications for human decision-makers.
 *    Never triggers autonomous transactions, purchases, sales, movement, culling, or quarantine.
 * 2. ZERO PIG/PORK TOLERANCE: Strictly rejects any pig/pork terms across commodities, evidence, and planning.
 * 3. NO FAKE DATA: Strictly returns INSUFFICIENT_DATA when evidence, sample size, or coverage is deficient.
 * 4. ASSET-LIGHT: Coordinates third-party ecosystem actors; does not own physical farms, trucks, or processing plants.
 * 5. SECURITY & DISEASE BOUNDARIES: Mandatory disclaimers (CORRIDOR_REVIEW_REQUIRED, non-diagnostic biosecurity).
 * 6. PRIVACY SAFEGUARDS: Geographic aggregation at National, Corridor, State, or safe LGA level. No PII or raw GPS.
 * 7. IMMUTABILITY & VERSIONING: Scenarios are never silently overwritten; version increments with lineage pointer.
 */

import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { ForecastTimeHorizon, ForecastDirection } from "@/features/forecasting/types";

export type NigerianState = (typeof NIGERIAN_STATES)[number];

// -----------------------------------------------------------------------------
// 1. SCENARIO TYPES (12 Canonical Scenario Types)
// -----------------------------------------------------------------------------

export const SCENARIO_TYPES = [
  "BALANCED_NOMINAL_SCENARIO",            // Current trends continue broadly within expected ranges
  "DEMAND_SURGE_SCENARIO",                // Demand rises faster than currently available supply
  "SUPPLY_SHORTAGE_SCENARIO",             // Supply becomes constrained relative to expected demand
  "SUPPLY_SURPLUS_SCENARIO",              // Supply growth exceeds expected demand
  "MARKET_PRESSURE_SCENARIO",             // Price/market pressure becomes materially elevated or depressed
  "LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO", // Supply exists but movement/capacity constraints limit availability
  "PROCESSING_BOTTLENECK_SCENARIO",        // Production/aggregation increases faster than processing capacity
  "DISEASE_SUPPLY_RISK_SCENARIO",         // Agricultural health/biosecurity indicators create potential supply risk
  "PROCUREMENT_RISK_SCENARIO",            // B2B procurement requirements become difficult to satisfy reliably
  "FOOD_SECURITY_PRESSURE_SCENARIO",      // Multiple domains indicate potential food-security pressure
  "RESILIENCE_STRESS_SCENARIO",           // Network becomes overly dependent on limited suppliers, corridors, etc.
  "MULTI_DOMAIN_RISK_SCENARIO",           // Several independent domains point toward a common future risk
] as const;

export type ScenarioType = (typeof SCENARIO_TYPES)[number];

// -----------------------------------------------------------------------------
// 2. PROBABILITY CLASSES & CONFIDENCE LEVELS
// -----------------------------------------------------------------------------

export const PROBABILITY_CLASSES = [
  "LOW_LIKELIHOOD",
  "PLAUSIBLE",
  "ELEVATED",
  "HIGH_CONCERN",
  "INSUFFICIENT_DATA",
] as const;

export type ScenarioProbabilityClass = (typeof PROBABILITY_CLASSES)[number];

export const SCENARIO_CONFIDENCE_LEVELS = [
  "HIGH",
  "MODERATE",
  "LOW",
  "INSUFFICIENT_DATA",
] as const;

export type ScenarioConfidenceLevel = (typeof SCENARIO_CONFIDENCE_LEVELS)[number];

// -----------------------------------------------------------------------------
// 3. SCENARIO TIME HORIZONS & PLANNING HORIZONS
// -----------------------------------------------------------------------------

export const SCENARIO_HORIZONS = [
  "SHORT_TERM_0_7D",
  "MEDIUM_TERM_8_30D",
  "LONG_TERM_31_90D",
  "CROSS_HORIZON",
] as const;

export type ScenarioHorizon = (typeof SCENARIO_HORIZONS)[number];

export const PLANNING_HORIZONS = [
  "IMMEDIATE",    // 0–7 days
  "NEAR_TERM",    // 8–30 days
  "MEDIUM_TERM",  // 31–90 days
] as const;

export type PlanningHorizon = (typeof PLANNING_HORIZONS)[number];

// -----------------------------------------------------------------------------
// 4. PLANNING ACTION CATEGORIES
// -----------------------------------------------------------------------------

export const PLANNING_ACTION_CATEGORIES = [
  "MONITOR",              // Keep under active surveillance
  "VERIFY",               // Confirm on-the-ground reality before commitments
  "DIVERSIFY",            // Broaden supply, routing, or buyer sources
  "AGGREGATE",            // Consolidate volumes across nearby producers
  "PROCURE",              // Review forward procurement opportunities
  "PROCESS",              // Review preservation, drying, or processing capacity
  "REDIRECT",             // Plan alternative transit corridors or destination markets
  "PREPARE",              // Pre-position resources, packaging, or storage reserves
  "ESCALATE_FOR_REVIEW",  // Human-in-the-loop review by coordinator or analyst
  "WAIT_AND_MONITOR",     // Conditions do not warrant intervention; maintain watch
  "INSUFFICIENT_DATA",    // Cannot formulate planning advice due to data sparsity
] as const;

export type PlanningActionCategory = (typeof PLANNING_ACTION_CATEGORIES)[number];

// -----------------------------------------------------------------------------
// 5. SCENARIO LIFECYCLE STATUSES
// -----------------------------------------------------------------------------

export const SCENARIO_STATUSES = [
  "DRAFT",      // Generated, pending automated checks or analyst staging
  "REVIEW",     // Staged for human review (e.g. food security alerts)
  "ACTIVE",     // Authoritative active scenario advisory
  "EXPIRED",    // Scenario horizon has elapsed; awaiting outcome observation
  "EVALUATED",  // Evaluated against actual outcome in Phase 3.4
  "ARCHIVED",   // Historical record superseded or preserved
  "CANCELLED",  // Administratively revoked or quarantined
] as const;

export type ScenarioStatus = (typeof SCENARIO_STATUSES)[number];

// -----------------------------------------------------------------------------
// 6. CROSS-DOMAIN CONFLICT TYPES
// -----------------------------------------------------------------------------

export const SCENARIO_CONFLICT_TYPES = [
  "DEMAND_SUPPLY_CONFLICT",       // Demand surging while supply reported abundant
  "MARKET_SUPPLY_CONFLICT",       // Prices crashing despite perceived acute shortage
  "PRODUCTION_DEMAND_CONFLICT",   // Planting intentions contradict regional demand shifts
  "LOGISTICS_SUPPLY_CONFLICT",    // Supply ready at gate but corridor transit blocked
  "DISEASE_PRODUCTION_CONFLICT",  // Biosecurity alerts in area of projected production expansion
  "PROCUREMENT_DEMAND_CONFLICT",  // Off-taker demand contracts contradict spot buying signals
  "FORECAST_HORIZON_CONFLICT",    // Short-term trend strongly contradicts medium-term baseline
] as const;

export type ScenarioConflictType = (typeof SCENARIO_CONFLICT_TYPES)[number];

// -----------------------------------------------------------------------------
// 7. SCENARIO DOMAINS
// -----------------------------------------------------------------------------

export const SCENARIO_DOMAINS = [
  "MARKET",
  "PRODUCTION",
  "DEMAND",
  "SUPPLY",
  "PROCUREMENT",
  "FOOD_SECURITY",
  "LOGISTICS",
  "DISEASE_BIOSECURITY",
  "VALUE_CHAIN",
  "CROSS_DOMAIN",
] as const;

export type ScenarioDomain = (typeof SCENARIO_DOMAINS)[number];

// -----------------------------------------------------------------------------
// 8. EVIDENCE & DEPENDENCY INTERFACES
// -----------------------------------------------------------------------------

export interface ScenarioEvidenceItem {
  id: string;
  sourceType: "FORECAST" | "BASELINE" | "SNAPSHOT" | "OBSERVATION" | "SIGNAL" | "INCIDENT" | "RECOMMENDATION";
  sourceId: string;
  domain: string;
  summary: string;
  timestamp: string;
  confidence: number;
  dataQualityScore?: number;
  metricName?: string;
  observedValue?: number;
  timeHorizon?: ForecastTimeHorizon;
}

export interface ScenarioDependency {
  dependencyId: string;
  dependencyType: "CORRIDOR" | "SUPPLIER" | "PROCESSING_FACILITY" | "AGGREGATION_CENTER" | "COLD_STORAGE" | "REGIONAL_MARKET";
  name: string;
  state: string;
  criticality: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  status: "OPERATIONAL" | "CONSTRAINED" | "DISRUPTED" | "MONITORING_REQUIRED";
  description: string;
}

export interface ScenarioPlanningImplication {
  id: string;
  actionCategory: PlanningActionCategory;
  planningHorizon: PlanningHorizon;
  title: string;
  guidance: string;
  targetRole: "FARMER" | "BUYER" | "PROCESSOR" | "LOGISTICS_OPERATOR" | "COORDINATOR" | "AGGREGATOR";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  advisoryDisclaimer: string;
}

// -----------------------------------------------------------------------------
// 9. CORE SCENARIO INTERFACE
// -----------------------------------------------------------------------------

export interface AgriculturalScenario {
  id: string;
  scenarioType: ScenarioType;
  title: string;
  description: string;
  domain: ScenarioDomain;
  commodity: string;
  category?: string | null;
  state: string;
  lga?: string | null;
  horizon: ScenarioHorizon;
  startDate: string;
  endDate: string;
  probabilityClass: ScenarioProbabilityClass;
  confidence: number;
  confidenceLevel: ScenarioConfidenceLevel;
  evidence: ScenarioEvidenceItem[];
  triggeringConditions: string[];
  supportingForecastIds: string[];
  dependencies: ScenarioDependency[];
  constraints: string[];
  expectedDirection: ForecastDirection;
  expectedImpact: string;
  foodSecurityImplication?: string | null;
  marketImplication?: string | null;
  productionImplication?: string | null;
  demandImplication?: string | null;
  logisticsImplication?: string | null;
  procurementImplication?: string | null;
  diseaseOrBiosecurityImplication?: string | null;
  resilienceImplication?: string | null;
  planningImplications: ScenarioPlanningImplication[];
  status: ScenarioStatus;
  version: number;
  previousScenarioId?: string | null;
  evaluationStatus: "PENDING" | "EVALUATED" | "NOT_EVALUABLE" | "INSUFFICIENT_DATA";
  evaluationId?: string | null;
  supersededAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 10. GENERATION & EVALUATION OPTIONS
// -----------------------------------------------------------------------------

export interface ScenarioGenerationOptions {
  domain: ScenarioDomain;
  commodity: string;
  category?: string;
  state: string;
  lga?: string;
  horizon?: ScenarioHorizon;
  supportingForecastIds?: string[];
  customStartDate?: string;
  customEndDate?: string;
}

export interface ScenarioConflictItem {
  id: string;
  conflictType: ScenarioConflictType;
  domainA: string;
  domainB: string;
  signalA: string;
  signalB: string;
  state: string;
  commodity: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidenceImpact: number;
  explanation: string;
  recommendedReview: string;
}

export interface ScenarioEvaluationResult {
  scenarioId: string;
  evaluationStatus: "EVALUATED" | "NOT_EVALUABLE" | "INSUFFICIENT_DATA";
  directionalAccuracy: boolean;
  impactAccuracy: "ACCURATE" | "PARTIALLY_ACCURATE" | "INACCURATE" | "NOT_EVALUABLE";
  timingAccuracy: "ON_TIME" | "EARLY" | "LATE" | "NOT_EVALUABLE";
  isFalsePositive: boolean;
  isFalseNegative: boolean;
  score: number;
  evidenceUsefulness: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
  summary: string;
  learningSignalsFlagged: boolean;
}
