/**
 * AgroMarket Phase 3.2: Agricultural Decision & Action Intelligence Foundation
 * Contracts, Types, Enums, and Core Governance Models
 *
 * SAFETY & GOVERNANCE INVARIANTS:
 * 1. ADVISORY ONLY: AgroMarket NEVER autonomously executes consequential transactions or actions.
 * 2. 8 CORE QUESTIONS: Every recommendation clearly answers:
 *    - What is happening?
 *    - Why does it matter?
 *    - Who does it affect?
 *    - Where?
 *    - What evidence supports it?
 *    - What could the user consider doing?
 *    - What are the limitations?
 *    - What happened after the user decided?
 * 3. EXPLAINABILITY: Users can always inspect "Why Am I Seeing This?" without exposing internal prompts.
 * 4. COMMERCIAL PRIVACY: Zero exposure of private phone numbers, farm coordinates, buyer identities, or trade secrets.
 * 5. ANTI-PORK ZERO TOLERANCE: Absolutely no pig/pork/swine produce, terms, or byproducts.
 * 6. NO FAKE DATA: Governed real outcome linkages, real existing routes, no manufactured causal certainty.
 */

import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { SpecializedAgentDomain } from "@/features/orchestration/types";

export type NigerianState = (typeof NIGERIAN_STATES)[number];

// -----------------------------------------------------------------------------
// 1. ACTOR ROLES & STAKEHOLDER CONTEXTS
// -----------------------------------------------------------------------------

export const ACTOR_ROLES = [
  "FARMER",
  "BUYER",
  "BUSINESS",
  "SERVICE_PROVIDER",
  "EQUIPMENT_OWNER",
  "EXPERT",
  "ADMIN",
  "JOB_SEEKER",
] as const;

export type ActorRole = (typeof ACTOR_ROLES)[number];

// -----------------------------------------------------------------------------
// 2. NORMALIZED RECOMMENDATION CATEGORIES (17 Types)
// -----------------------------------------------------------------------------

export const RECOMMENDATION_TYPES = [
  "MONITOR",
  "INVESTIGATE",
  "DIVERSIFY_SUPPLIERS",
  "REVIEW_ALTERNATIVE_REGION",
  "REVIEW_PROCESSING_CAPACITY",
  "REVIEW_LOGISTICS_OPTIONS",
  "REVIEW_PRODUCTION_OPPORTUNITY",
  "REVIEW_MARKET_OPPORTUNITY",
  "REVIEW_BIOSECURITY_INFORMATION",
  "REVIEW_FOOD_SECURITY_RISK",
  "REVIEW_DEMAND_SIGNAL",
  "REVIEW_SUPPLY_GAP",
  "SEEK_EXPERT_GUIDANCE",
  "REVIEW_EQUIPMENT_OPTIONS",
  "REVIEW_AGGREGATION_OPPORTUNITY",
  "NO_ACTION_RECOMMENDED",
  "INSUFFICIENT_DATA",
] as const;

export type RecommendationType = (typeof RECOMMENDATION_TYPES)[number];

// -----------------------------------------------------------------------------
// 3. RECOMMENDATION LIFECYCLE
// -----------------------------------------------------------------------------

export const RECOMMENDATION_STATUSES = [
  "PROPOSED",
  "REVIEWED",
  "ACCEPTED",
  "ACTIONED",
  "COMPLETED",
  "REJECTED",
  "EXPIRED",
] as const;

export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

// -----------------------------------------------------------------------------
// 4. USER DECISION MODEL
// -----------------------------------------------------------------------------

export const USER_DECISION_TYPES = [
  "ACCEPT",
  "REJECT",
  "DISMISS",
  "DEFER",
  "SAVE",
  "REQUEST_MORE_INFORMATION",
  "SEEK_EXPERT",
  "TAKE_EXTERNAL_ACTION",
] as const;

export type UserDecisionType = (typeof USER_DECISION_TYPES)[number];

export interface UserDecisionItem {
  id?: string;
  recommendationId: string;
  userId: string;
  decision: UserDecisionType;
  actorRole: ActorRole | string;
  decisionNotes?: string | null;
  reasoning?: string | null;
  metadata?: Record<string, unknown>;
  decidedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// -----------------------------------------------------------------------------
// 5. GOVERNED ACTION RECORD MODEL
// -----------------------------------------------------------------------------

export const GOVERNED_ACTION_TYPES = [
  "VIEWED",
  "SAVED",
  "CONTACTED_PROVIDER",
  "REQUESTED_SERVICE",
  "JOINED_AGGREGATION",
  "CREATED_B2B_DEMAND",
  "CREATED_LISTING",
  "STARTED_PROCUREMENT",
  "REVIEWED_LOGISTICS",
  "SOUGHT_EXPERT_ADVICE",
  "USER_REPORTED_EXTERNAL_ACTION",
  "OTHER",
] as const;

export type GovernedActionType = (typeof GOVERNED_ACTION_TYPES)[number];

export const ACTION_VERIFICATION_STATUSES = [
  "VERIFIED_PLATFORM",
  "USER_REPORTED",
  "PENDING_VERIFICATION",
] as const;

export type ActionVerificationStatus = (typeof ACTION_VERIFICATION_STATUSES)[number];

export interface GovernedActionItem {
  id?: string;
  decisionId?: string | null;
  recommendationId: string;
  userId: string;
  actionType: GovernedActionType;
  actionPath?: string | null;
  isExternal: boolean;
  verificationStatus: ActionVerificationStatus;
  actionDetails?: Record<string, unknown>;
  notes?: string | null;
  executedAt?: string;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// 6. DECISION-ACTION LINKAGE
// -----------------------------------------------------------------------------

export interface DecisionActionLinkItem {
  id?: string;
  decisionId: string;
  actionId: string;
  linkedAt: string;
}

// -----------------------------------------------------------------------------
// 7. USER INTELLIGENCE PREFERENCES
// -----------------------------------------------------------------------------

export const DIGEST_FREQUENCIES = ["REALTIME", "DAILY", "WEEKLY", "MUTED"] as const;
export type DigestFrequency = (typeof DIGEST_FREQUENCIES)[number];

export interface UserIntelligencePreferences {
  id?: string;
  userId: string;
  primaryRole: ActorRole;
  preferredStates: string[];
  preferredLgas: string[];
  monitoredCommodities: string[];
  urgencyThreshold: UrgencyLevel;
  minConfidence: number; // 0.0 - 1.0
  notificationChannels: string[];
  digestFrequency: DigestFrequency;
  mutedRecommendationTypes: RecommendationType[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// -----------------------------------------------------------------------------
// 8. NOTIFICATION FOUNDATION (Governed Alerts)
// -----------------------------------------------------------------------------

export const INTELLIGENCE_NOTIFICATION_CATEGORIES = [
  "MARKET_SIGNAL",
  "SUPPLY_ALERT",
  "DEMAND_SIGNAL",
  "PROCUREMENT_ALERT",
  "LOGISTICS_ALERT",
  "FOOD_SECURITY_ALERT",
  "DISEASE_BIOSECURITY_ALERT",
  "RECOMMENDATION",
  "SYSTEM_NOTICE",
] as const;

export type IntelligenceNotificationCategory =
  (typeof INTELLIGENCE_NOTIFICATION_CATEGORIES)[number];

export interface GovernedNotificationItem {
  id?: string;
  userId: string;
  type: IntelligenceNotificationCategory | string;
  channel: "IN_APP" | "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
  title: string;
  body: string;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  severity: UrgencyLevel;
  source?: string;
  evidenceReference?: string;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// 9. EXPLAINABILITY & 8 CORE QUESTIONS
// -----------------------------------------------------------------------------

export interface ExplainabilityContext {
  contributingAgents: SpecializedAgentDomain[];
  keySignals: string[];
  evidenceConfidence: number; // 0.0 - 1.0
  dataRecencyHours: number;
  relevantGeography: {
    state?: string | null;
    lga?: string | null;
    geopoliticalZone?: string | null;
  };
  relevantCommodity?: string | null;
  limitations: string[];
  explanationSummary: string;
}

export interface RecommendationEightQuestions {
  whatIsHappening: string;
  whyDoesItMatter: string;
  whoDoesItAffect: string;
  where: string;
  whatEvidenceSupportsIt: string;
  whatCouldTheUserConsiderDoing: string;
  whatAreTheLimitations: string;
  whatHappenedAfterUserDecided?: string | null;
}

// -----------------------------------------------------------------------------
// 10. GOVERNED DECISION RECOMMENDATION ITEM
// -----------------------------------------------------------------------------

export interface GovernedDecisionRecommendation {
  id: string;
  recommendationType: RecommendationType;
  title: string;
  summary: string;
  rationale: string;
  affectedActor: ActorRole;
  geography: {
    state?: string | null;
    lga?: string | null;
    geopoliticalZone?: string | null;
  };
  commodity?: string | null;
  urgency: UrgencyLevel;
  priority: PriorityLevel;
  confidence: number; // 0.000 - 1.000
  evidenceReferences: string[];
  contributingAgents: SpecializedAgentDomain[];
  contributingSignals: string[];
  limitations: string;
  actionPath: string;
  status: RecommendationStatus;
  advisoryDisclaimer: string;
  eightQuestions: RecommendationEightQuestions;
  explainability: ExplainabilityContext;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string;

  // Linkage to user interactions
  userDecision?: UserDecisionItem | null;
  userActions?: GovernedActionItem[];
  outcome?: DecisionOutcomeRecord | null;
}

// -----------------------------------------------------------------------------
// 11. OUTCOME TRACKING & EVALUATION RECORD
// -----------------------------------------------------------------------------

export interface DecisionOutcomeRecord {
  id: string;
  recommendationId: string;
  decision: string;
  actionTaken: string;
  actionTime: string;
  observedOutcome: string;
  expectedOutcome: string;
  variance: string;
  evaluationScore: number; // 0 - 100
  lessonsLearned: string;
  recordedBy?: string | null;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 12. NORMALIZED DECISION CONTEXT
// -----------------------------------------------------------------------------

export interface NormalizedDecisionContext {
  actorRole: ActorRole;
  state?: string | null;
  lga?: string | null;
  selectedCommodities: string[];
  marketPressureCount: number;
  demandSignalCount: number;
  supplySignalCount: number;
  procurementRiskCount: number;
  logisticsBottleneckCount: number;
  biosecurityAlertCount: number;
  foodSecurityContextCount: number;
  activeOpportunitiesCount: number;
  contributingAgents: SpecializedAgentDomain[];
  latestGeneratedAt: string;
  signals: Array<{
    id: string;
    domain: SpecializedAgentDomain;
    signalType: string;
    severity: UrgencyLevel;
    commodity?: string | null;
    state?: string | null;
    summary: string;
    confidence: number;
  }>;
}

// -----------------------------------------------------------------------------
// 13. DASHBOARD PAYLOAD FOR /my-intelligence
// -----------------------------------------------------------------------------

export interface MyIntelligenceDashboardData {
  userRole: ActorRole;
  preferences: UserIntelligencePreferences;
  decisionContext: NormalizedDecisionContext;
  recommendations: GovernedDecisionRecommendation[];
  marketSignals: Array<{
    id: string;
    commodity: string;
    state: string;
    pressureType: string;
    trend: string;
    confidence: number;
    severity: UrgencyLevel;
    updatedAt: string;
  }>;
  supplyAndDemand: {
    supplyGaps: Array<{
      commodity: string;
      state: string;
      shortageLevel: string;
      confidence: number;
      actionUrl: string;
    }>;
    demandPeaks: Array<{
      commodity: string;
      volumeEstimate: string;
      timing: string;
      confidence: number;
    }>;
  };
  procurementOpportunities: Array<{
    id: string;
    title: string;
    commodity: string;
    volume: string;
    urgency: UrgencyLevel;
    deadline?: string;
    actionUrl: string;
  }>;
  logisticsAlerts: Array<{
    id: string;
    corridor: string;
    status: string;
    severity: UrgencyLevel;
    summary: string;
    actionUrl: string;
  }>;
  biosecurityAdvisories: Array<{
    id: string;
    threatName: string;
    affectedSpecies: string;
    state: string;
    advisoryType: string;
    urgency: UrgencyLevel;
    actionUrl: string;
  }>;
  opportunities: Array<{
    id: string;
    title: string;
    category: string;
    summary: string;
    actionUrl: string;
    actionLabel: string;
  }>;
  notifications: GovernedNotificationItem[];
  decisions: UserDecisionItem[];
  actions: GovernedActionItem[];
  outcomes: DecisionOutcomeRecord[];
}
