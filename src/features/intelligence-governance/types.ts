/**
 * AgroMarket Phase 3.8: Autonomous Intelligence Guardrails & Human Oversight Policy Execution
 * Core Governance Types, Enums, Contracts, and Safety Invariants
 *
 * SAFETY INVARIANTS:
 * 1. INTELLIGENCE ≠ AUTHORITY: Advisory intelligence only; never system-of-record authority.
 * 2. RECOMMENDATION ≠ DECISION: Recommendation propose options; human decision is required.
 * 3. DECISION ≠ EXECUTION: Decisions define human intent; execution requires explicit authorization.
 * 4. EXECUTION ≠ COMPLETION: Execution requires verification of real operational outcomes.
 * 5. FAIL-CLOSED: Unknown agents, actions, risks, or ambiguous conditions deny by default.
 * 6. ZERO-AUTONOMOUS CONSEQUENTIAL ACTIONS: Never autonomously move money, transport, cull, or certify.
 * 7. ANTI-PORK ZERO TOLERANCE: Absolute rejection of pig/pork terms across all layers.
 * 8. PRIVACY SAFEGUARDS: Zero raw farmer phone numbers, exact GPS, or private addresses.
 */

import { ActorRole } from "@/features/decision-intelligence/types";

// -----------------------------------------------------------------------------
// 1. RISK LEVELS
// -----------------------------------------------------------------------------

export const GOVERNANCE_RISK_LEVELS = [
  "LOW",       // Informational intelligence with limited downstream consequence.
  "MODERATE",  // Recommendations that may influence normal planning or procurement.
  "HIGH",      // Material financial, operational, health, security, or logistics impact.
  "CRITICAL",  // Disease/biosecurity, food emergency, physical security, livestock restrictions.
] as const;

export type GovernanceRiskLevel = (typeof GOVERNANCE_RISK_LEVELS)[number];

// -----------------------------------------------------------------------------
// 2. AUTONOMY LEVELS
// -----------------------------------------------------------------------------

export const GOVERNANCE_AUTONOMY_LEVELS = [
  "OBSERVE_ONLY",              // Can only gather/monitor data; cannot advise or act.
  "ANALYZE_ONLY",              // Can perform calculations/models; cannot recommend to users.
  "RECOMMEND",                 // Can propose non-consequential informational recommendations.
  "REQUIRE_HUMAN_REVIEW",      // Consequential recommendation; requires human review before action.
  "REQUIRE_HUMAN_APPROVAL",    // Consequential action; requires affirmative human approval.
  "REQUIRE_AUTHORITY_APPROVAL",// Regulated/biosecurity/security action; requires professional/authority review.
  "PROHIBITED",                // Completely forbidden for autonomous or automated agents.
] as const;

export type GovernanceAutonomyLevel = (typeof GOVERNANCE_AUTONOMY_LEVELS)[number];

// -----------------------------------------------------------------------------
// 3. DETERMINISTIC POLICY DECISIONS
// -----------------------------------------------------------------------------

export const GOVERNANCE_DECISIONS = [
  "ALLOW",                        // Permitted to proceed (low risk, informational).
  "ALLOW_WITH_REVIEW",            // Permitted with advisory banner / informational review flag.
  "REQUIRE_HUMAN_APPROVAL",       // Blocked until affirmative human user/business approval is recorded.
  "REQUIRE_PROFESSIONAL_REVIEW",  // Blocked until licensed veterinary/extension expert approval.
  "REQUIRE_AUTHORITY_REVIEW",     // Blocked until appropriate administrative/regulatory authority review.
  "DENY",                         // Strictly forbidden / blocked by policy or denylist.
  "INSUFFICIENT_DATA",            // Blocked due to inadequate evidence or low confidence score.
] as const;

export type GovernanceDecision = (typeof GOVERNANCE_DECISIONS)[number];

// -----------------------------------------------------------------------------
// 4. REVIEW & APPROVAL LEVELS
// -----------------------------------------------------------------------------

export const GOVERNANCE_REVIEW_LEVELS = [
  "NO_REVIEW_REQUIRED",   // Fully informational or read-only view.
  "PLATFORM_REVIEW",      // Designated platform coordinator or admin review.
  "HUMAN_APPROVAL",       // Affirmative human user, buyer, or business stakeholder approval.
  "PROFESSIONAL_REVIEW",  // Licensed veterinarian, agronomist, or extension officer.
  "AUTHORITY_REVIEW",     // Statutory regulator, security authority, or state agricultural ministry.
] as const;

export type GovernanceReviewLevel = (typeof GOVERNANCE_REVIEW_LEVELS)[number];

// -----------------------------------------------------------------------------
// 5. HUMAN APPROVAL LIFECYCLE
// -----------------------------------------------------------------------------

export const APPROVAL_TYPES = [
  "USER_APPROVAL",         // Approval from the initiating user / business operator.
  "PLATFORM_REVIEW",      // Review by internal AgroMarket operations / compliance personnel.
  "PROFESSIONAL_REVIEW",  // Review by verified veterinarian, agronomist, or extension officer.
  "AUTHORITY_REVIEW",     // External regulatory authority or public official review context.
] as const;

export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REVOKED",
  "EXPIRED",
  "SUPERSEDED",
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

// -----------------------------------------------------------------------------
// 6. HUMAN OVERRIDE
// -----------------------------------------------------------------------------

export const OVERRIDE_ROLES = ["ADMIN", "PLATFORM_COORDINATOR"] as const;
export type OverrideRole = (typeof OVERRIDE_ROLES)[number];

export const OVERRIDE_DECISIONS = [
  "ALLOW_WITH_OVERRIDE",
  "REQUIRE_EXTERNAL_VERIFICATION",
] as const;
export type OverrideDecision = (typeof OVERRIDE_DECISIONS)[number];

// -----------------------------------------------------------------------------
// 7. CANONICAL AGENT IDENTIFIERS (9 Canonical Agents)
// -----------------------------------------------------------------------------

export const CANONICAL_GOVERNANCE_AGENTS = [
  "MARKET_INTELLIGENCE_AGENT",
  "PRODUCTION_PLANNING_AGENT",
  "DEMAND_FORECASTING_AGENT",
  "SUPPLY_MATCHING_AGENT",
  "PROCUREMENT_INTELLIGENCE_AGENT",
  "FOOD_SECURITY_RESILIENCE_AGENT",
  "LOGISTICS_INTELLIGENCE_AGENT",
  "AGRICULTURAL_DISEASE_BIOSECURITY_AGENT",
  "AGRICULTURAL_ORCHESTRATION_AGENT",
] as const;

export type CanonicalGovernanceAgent = (typeof CANONICAL_GOVERNANCE_AGENTS)[number];

// -----------------------------------------------------------------------------
// 8. EXPLICIT PROHIBITED AUTONOMOUS ACTIONS (23 Denylist Actions)
// -----------------------------------------------------------------------------

export const PROHIBITED_AUTONOMOUS_ACTIONS = [
  "PURCHASE_COMMODITIES",
  "SELL_COMMODITIES",
  "TRANSFER_MONEY",
  "RELEASE_SELLER_SETTLEMENTS",
  "ISSUE_REFUNDS",
  "CREATE_REGULATED_FINANCIAL_COMMITMENTS",
  "CREATE_BINDING_CONTRACTS",
  "MOVE_LIVESTOCK",
  "MOVE_AGRICULTURAL_GOODS",
  "DISPATCH_VEHICLES",
  "RESERVE_DELIVERY_CAPACITY",
  "REROUTE_PHYSICAL_TRANSPORT_AUTONOMOUSLY",
  "QUARANTINE_FARMS",
  "ORDER_LIVESTOCK_CULLING",
  "PRESCRIBE_VETERINARY_TREATMENT",
  "PRESCRIBE_CHEMICALS",
  "DECLARE_DISEASE_OUTBREAKS",
  "DECLARE_FOOD_SECURITY_EMERGENCIES",
  "PUBLISH_EMERGENCY_SECURITY_ALERTS",
  "GUARANTEE_ROUTE_SAFETY",
  "CONTACT_LAW_ENFORCEMENT_AUTONOMOUSLY",
  "CHANGE_REGULATED_COMPLIANCE_STATUS",
  "ISSUE_HALAL_CERTIFICATION",
  "ISSUE_FOOD_SAFETY_CERTIFICATION",
] as const;

export type ProhibitedAutonomousAction = (typeof PROHIBITED_AUTONOMOUS_ACTIONS)[number];

// -----------------------------------------------------------------------------
// 9. AGENT CAPABILITY REGISTRY INTERFACE
// -----------------------------------------------------------------------------

export interface AgentCapabilityDefinition {
  agentId: CanonicalGovernanceAgent;
  displayName: string;
  domain: string;
  capabilityScope: string[];
  allowedOutputs: string[];
  forbiddenOutputs: string[];
  riskCeiling: GovernanceRiskLevel;
  maxPermittedAutonomy: GovernanceAutonomyLevel;
  requiredReviewLevel: GovernanceReviewLevel;
  statutoryConstraints: string[];
}

// -----------------------------------------------------------------------------
// 10. ACTION GOVERNANCE CLASSIFICATION
// -----------------------------------------------------------------------------

export interface ActionGovernanceClassification {
  actionIntent: string;
  domain: string;
  description: string;
  defaultRiskLevel: GovernanceRiskLevel;
  autonomyLevel: GovernanceAutonomyLevel;
  requiredReviewLevel: GovernanceReviewLevel;
  permittedActorRoles: ActorRole[];
  isProhibitedAutonomousAction: boolean;
  requiresAffirmativeApproval: boolean;
}

// -----------------------------------------------------------------------------
// 11. GOVERNANCE EVALUATION MODEL
// -----------------------------------------------------------------------------

export interface GovernanceEvaluationInput {
  agentId: string;
  recommendationId?: string | null;
  scenarioId?: string | null;
  actionIntent: string;
  actorRole: ActorRole | string;
  domain?: string;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  evidenceCount?: number;
  confidenceScore?: number;
  conflictingIntelligenceDetected?: boolean;
  contextMetadata?: Record<string, unknown>;
  policyVersion?: string;
}

export interface GovernanceEvaluationResult {
  id: string;
  recommendationId?: string | null;
  scenarioId?: string | null;
  agentId: CanonicalGovernanceAgent | string;
  domain: string;
  actionIntent: string;
  actorRole: ActorRole | string;
  riskLevel: GovernanceRiskLevel;
  autonomyLevel: GovernanceAutonomyLevel;
  decision: GovernanceDecision;
  requiredReviewLevel: GovernanceReviewLevel;
  reasons: string[];
  policyVersion: string;
  isProhibitedAction: boolean;
  evidenceCount: number;
  confidenceScore: number;
  contextMetadata: Record<string, unknown>;
  evaluatedAt: string;
}

// -----------------------------------------------------------------------------
// 12. HUMAN APPROVAL RECORD MODEL
// -----------------------------------------------------------------------------

export interface HumanApprovalRecord {
  id: string;
  evaluationId: string;
  recommendationId: string;
  actionIntent: string;
  approverId: string;
  approverRole: ActorRole | string;
  approvalType: ApprovalType;
  status: ApprovalStatus;
  justification: string;
  evidenceReferences: string[];
  policyVersion: string;
  expiresAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  supersededById?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApprovalInput {
  evaluationId: string;
  recommendationId: string;
  actionIntent: string;
  approverId: string;
  approverRole: ActorRole | string;
  approvalType: ApprovalType;
  justification: string;
  evidenceReferences?: string[];
  ttlHours?: number;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// 13. HUMAN OVERRIDE MODEL
// -----------------------------------------------------------------------------

export interface GovernanceOverrideRecord {
  id: string;
  evaluationId: string;
  overrideById: string;
  overrideRole: OverrideRole;
  originalDecision: GovernanceDecision;
  overrideDecision: OverrideDecision;
  reason: string;
  policyVersion: string;
  overriddenPolicyRules: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateOverrideInput {
  evaluationId: string;
  overrideById: string;
  overrideRole: OverrideRole;
  originalDecision: GovernanceDecision;
  overrideDecision: OverrideDecision;
  reason: string;
  overriddenPolicyRules?: string[];
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// 14. ACTION GATE CHECK RESULT
// -----------------------------------------------------------------------------

export interface ActionGateCheckResult {
  isPermitted: boolean;
  evaluation: GovernanceEvaluationResult;
  activeApproval?: HumanApprovalRecord | null;
  activeOverride?: GovernanceOverrideRecord | null;
  message: string;
  blockingReason?: string | null;
  requiredAction?: "NONE" | "SUBMIT_APPROVAL" | "OBTAIN_EXPERT_REVIEW" | "OBTAIN_AUTHORITY_REVIEW" | "BLOCKED";
}
