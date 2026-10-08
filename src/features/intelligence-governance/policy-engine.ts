/**
 * AgroMarket Phase 3.8: Deterministic Policy Decision Engine
 * Evaluates intelligence proposals against codified rules, agent capability boundaries,
 * risk ceilings, statutory limits, and evidence thresholds.
 *
 * SAFETY INVARIANTS:
 * 1. NO LLM EVER DECIDES PERMISSION: All policy evaluations are deterministic code.
 * 2. FAIL CLOSED: Unknown agents, actions, or missing risks deny by default.
 * 3. ZERO AUTONOMOUS TRANSACTIONS: Financial, livestock, and culling actions are denied.
 * 4. ANTI-PORK: Rejects prohibited swine/pork terms across all inputs and contexts.
 * 5. PRIVACY: Blocks exposure of phone numbers and raw GPS coordinates.
 */

import {
  GovernanceEvaluationInput,
  GovernanceEvaluationResult,
  GovernanceDecision,
} from "./types";
import { ActorRole } from "@/features/decision-intelligence/types";
import { CURRENT_GOVERNANCE_POLICY_VERSION, MIN_CONFIDENCE_THRESHOLD } from "./constants";
import {
  assertNoProhibitedProduce,
  assertNoPrivateInformation,
  detectPromptInjection,
} from "./validation";
import { getAgentCapability } from "./agent-capabilities";
import { getActionClassification, isProhibitedAction } from "./action-classification";

/**
 * Deterministically evaluates a governance policy request.
 */
export function evaluateGovernancePolicy(
  input: GovernanceEvaluationInput
): GovernanceEvaluationResult {
  const reasons: string[] = [];
  const evalId = crypto.randomUUID();
  const policyVersion = input.policyVersion || CURRENT_GOVERNANCE_POLICY_VERSION;

  // 1. Invariant Assertions: Anti-Pork & Privacy
  assertNoProhibitedProduce(input.actionIntent, "Policy Evaluation Intent");
  assertNoProhibitedProduce(input.commodity, "Policy Evaluation Commodity");
  assertNoProhibitedProduce(input.contextMetadata, "Policy Evaluation Metadata");

  assertNoPrivateInformation(input.contextMetadata, "Policy Evaluation Metadata");
  if (input.state) assertNoPrivateInformation(input.state, "Policy Evaluation State");
  if (input.lga) assertNoPrivateInformation(input.lga, "Policy Evaluation LGA");

  // 2. Prompt Injection Defense on Untrusted Context
  if (input.contextMetadata) {
    const serialized = JSON.stringify(input.contextMetadata);
    if (detectPromptInjection(serialized) || detectPromptInjection(input.actionIntent)) {
      return {
        id: evalId,
        recommendationId: input.recommendationId ?? null,
        scenarioId: input.scenarioId ?? null,
        agentId: input.agentId,
        domain: input.domain || "UNKNOWN",
        actionIntent: input.actionIntent,
        actorRole: input.actorRole,
        riskLevel: "CRITICAL",
        autonomyLevel: "PROHIBITED",
        decision: "DENY",
        requiredReviewLevel: "PLATFORM_REVIEW",
        reasons: ["Security Violation: Adversarial prompt injection detected in context payload."],
        policyVersion,
        isProhibitedAction: true,
        evidenceCount: input.evidenceCount ?? 0,
        confidenceScore: input.confidenceScore ?? 0,
        contextMetadata: input.contextMetadata ?? {},
        evaluatedAt: new Date().toISOString(),
      };
    }
  }

  // 3. Agent Authorization Check (Fail Closed on Unknown Agents)
  const agentCapability = getAgentCapability(input.agentId);
  if (!agentCapability) {
    return {
      id: evalId,
      recommendationId: input.recommendationId ?? null,
      scenarioId: input.scenarioId ?? null,
      agentId: input.agentId,
      domain: input.domain || "UNKNOWN",
      actionIntent: input.actionIntent,
      actorRole: input.actorRole,
      riskLevel: "CRITICAL",
      autonomyLevel: "PROHIBITED",
      decision: "DENY",
      requiredReviewLevel: "PLATFORM_REVIEW",
      reasons: [`Unauthorized Agent: Agent '${input.agentId}' is not registered in the canonical capability registry.`],
      policyVersion,
      isProhibitedAction: false,
      evidenceCount: input.evidenceCount ?? 0,
      confidenceScore: input.confidenceScore ?? 0,
      contextMetadata: input.contextMetadata ?? {},
      evaluatedAt: new Date().toISOString(),
    };
  }

  // 4. Prohibited Autonomous Action Check (Explicit Denylist)
  if (isProhibitedAction(input.actionIntent)) {
    return {
      id: evalId,
      recommendationId: input.recommendationId ?? null,
      scenarioId: input.scenarioId ?? null,
      agentId: agentCapability.agentId,
      domain: agentCapability.domain,
      actionIntent: input.actionIntent,
      actorRole: input.actorRole,
      riskLevel: "CRITICAL",
      autonomyLevel: "PROHIBITED",
      decision: "DENY",
      requiredReviewLevel: "AUTHORITY_REVIEW",
      reasons: [`Prohibited Autonomous Action: Action '${input.actionIntent}' violates the AgroMarket autonomy denylist. Autonomous execution of financial, culling, or quarantine actions is prohibited.`],
      policyVersion,
      isProhibitedAction: true,
      evidenceCount: input.evidenceCount ?? 0,
      confidenceScore: input.confidenceScore ?? 0,
      contextMetadata: input.contextMetadata ?? {},
      evaluatedAt: new Date().toISOString(),
    };
  }

  // 5. Action Intent Classification Check (Fail Closed on Unknown Actions)
  const actionClassification = getActionClassification(input.actionIntent);
  if (!actionClassification) {
    return {
      id: evalId,
      recommendationId: input.recommendationId ?? null,
      scenarioId: input.scenarioId ?? null,
      agentId: agentCapability.agentId,
      domain: agentCapability.domain,
      actionIntent: input.actionIntent,
      actorRole: input.actorRole,
      riskLevel: "CRITICAL",
      autonomyLevel: "PROHIBITED",
      decision: "DENY",
      requiredReviewLevel: "PLATFORM_REVIEW",
      reasons: [`Unrecognized Action Intent: Action '${input.actionIntent}' is not classified in the governance taxonomy.`],
      policyVersion,
      isProhibitedAction: false,
      evidenceCount: input.evidenceCount ?? 0,
      confidenceScore: input.confidenceScore ?? 0,
      contextMetadata: input.contextMetadata ?? {},
      evaluatedAt: new Date().toISOString(),
    };
  }

  // 6. Role Authorization Check
  if (
    actionClassification.permittedActorRoles.length > 0 &&
    !actionClassification.permittedActorRoles.includes(input.actorRole as ActorRole)
  ) {
    return {
      id: evalId,
      recommendationId: input.recommendationId ?? null,
      scenarioId: input.scenarioId ?? null,
      agentId: agentCapability.agentId,
      domain: actionClassification.domain,
      actionIntent: input.actionIntent,
      actorRole: input.actorRole,
      riskLevel: actionClassification.defaultRiskLevel,
      autonomyLevel: actionClassification.autonomyLevel,
      decision: "DENY",
      requiredReviewLevel: actionClassification.requiredReviewLevel,
      reasons: [`Role Authorization Failure: Actor role '${input.actorRole}' is not authorized to initiate '${input.actionIntent}'. Permitted roles: ${actionClassification.permittedActorRoles.join(", ")}.`],
      policyVersion,
      isProhibitedAction: false,
      evidenceCount: input.evidenceCount ?? 0,
      confidenceScore: input.confidenceScore ?? 0,
      contextMetadata: input.contextMetadata ?? {},
      evaluatedAt: new Date().toISOString(),
    };
  }

  // 7. Evidence & Confidence Evaluation
  const evidenceCount = input.evidenceCount ?? 0;
  const confidenceScore = input.confidenceScore ?? 0.5;

  if (actionClassification.defaultRiskLevel === "CRITICAL" || actionClassification.defaultRiskLevel === "HIGH") {
    if (evidenceCount < 1) {
      return {
        id: evalId,
        recommendationId: input.recommendationId ?? null,
        scenarioId: input.scenarioId ?? null,
        agentId: agentCapability.agentId,
        domain: actionClassification.domain,
        actionIntent: input.actionIntent,
        actorRole: input.actorRole,
        riskLevel: actionClassification.defaultRiskLevel,
        autonomyLevel: actionClassification.autonomyLevel,
        decision: "INSUFFICIENT_DATA",
        requiredReviewLevel: actionClassification.requiredReviewLevel,
        reasons: [`Insufficient Evidence: High/Critical risk action '${input.actionIntent}' requires at least 1 verified observational evidence record (found: ${evidenceCount}).`],
        policyVersion,
        isProhibitedAction: false,
        evidenceCount,
        confidenceScore,
        contextMetadata: input.contextMetadata ?? {},
        evaluatedAt: new Date().toISOString(),
      };
    }

    if (confidenceScore < MIN_CONFIDENCE_THRESHOLD) {
      return {
        id: evalId,
        recommendationId: input.recommendationId ?? null,
        scenarioId: input.scenarioId ?? null,
        agentId: agentCapability.agentId,
        domain: actionClassification.domain,
        actionIntent: input.actionIntent,
        actorRole: input.actorRole,
        riskLevel: actionClassification.defaultRiskLevel,
        autonomyLevel: actionClassification.autonomyLevel,
        decision: "INSUFFICIENT_DATA",
        requiredReviewLevel: actionClassification.requiredReviewLevel,
        reasons: [`Low Confidence Score: Confidence ${confidenceScore.toFixed(2)} is below minimum threshold (${MIN_CONFIDENCE_THRESHOLD}) for action '${input.actionIntent}'.`],
        policyVersion,
        isProhibitedAction: false,
        evidenceCount,
        confidenceScore,
        contextMetadata: input.contextMetadata ?? {},
        evaluatedAt: new Date().toISOString(),
      };
    }
  }

  // 8. Cross-Domain Intelligence Conflict Escalation
  if (input.conflictingIntelligenceDetected) {
    reasons.push("Cross-domain intelligence conflict detected: Action escalated for human review and resolution.");
    return {
      id: evalId,
      recommendationId: input.recommendationId ?? null,
      scenarioId: input.scenarioId ?? null,
      agentId: agentCapability.agentId,
      domain: actionClassification.domain,
      actionIntent: input.actionIntent,
      actorRole: input.actorRole,
      riskLevel: "HIGH",
      autonomyLevel: "REQUIRE_HUMAN_APPROVAL",
      decision: "REQUIRE_HUMAN_APPROVAL",
      requiredReviewLevel: "HUMAN_APPROVAL",
      reasons,
      policyVersion,
      isProhibitedAction: false,
      evidenceCount,
      confidenceScore,
      contextMetadata: input.contextMetadata ?? {},
      evaluatedAt: new Date().toISOString(),
    };
  }

  // 9. Domain-Specific Statutory & Professional Boundaries
  const domain = actionClassification.domain;

  // 9.1 Disease / Biosecurity Boundary
  if (domain === "DISEASE_BIOSECURITY" || agentCapability.agentId === "AGRICULTURAL_DISEASE_BIOSECURITY_AGENT") {
    if (actionClassification.actionIntent === "DISEASE_REVIEW") {
      reasons.push("Disease/Biosecurity Boundary: Action involves epidemiological risk review. Requires licensed veterinary or extension professional review.");
      return {
        id: evalId,
        recommendationId: input.recommendationId ?? null,
        scenarioId: input.scenarioId ?? null,
        agentId: agentCapability.agentId,
        domain,
        actionIntent: input.actionIntent,
        actorRole: input.actorRole,
        riskLevel: "CRITICAL",
        autonomyLevel: "REQUIRE_AUTHORITY_APPROVAL",
        decision: "REQUIRE_PROFESSIONAL_REVIEW",
        requiredReviewLevel: "PROFESSIONAL_REVIEW",
        reasons,
        policyVersion,
        isProhibitedAction: false,
        evidenceCount,
        confidenceScore,
        contextMetadata: input.contextMetadata ?? {},
        evaluatedAt: new Date().toISOString(),
      };
    }
  }

  // 9.2 Physical Transport & Corridor Security Boundary
  if (domain === "SECURITY" || actionClassification.actionIntent === "SECURITY_REVIEW") {
    reasons.push("Security Boundary: Corridor friction review requires appropriate authority context. Platform does not guarantee route safety.");
    return {
      id: evalId,
      recommendationId: input.recommendationId ?? null,
      scenarioId: input.scenarioId ?? null,
      agentId: agentCapability.agentId,
      domain,
      actionIntent: input.actionIntent,
      actorRole: input.actorRole,
      riskLevel: "CRITICAL",
      autonomyLevel: "REQUIRE_AUTHORITY_APPROVAL",
      decision: "REQUIRE_AUTHORITY_REVIEW",
      requiredReviewLevel: "AUTHORITY_REVIEW",
      reasons,
      policyVersion,
      isProhibitedAction: false,
      evidenceCount,
      confidenceScore,
      contextMetadata: input.contextMetadata ?? {},
      evaluatedAt: new Date().toISOString(),
    };
  }

  // 9.3 Food Security Boundary
  if (domain === "FOOD_SECURITY" && actionClassification.defaultRiskLevel === "CRITICAL") {
    reasons.push("Food Security Boundary: Critical food resilience alerts require platform coordinator review before external escalation.");
    return {
      id: evalId,
      recommendationId: input.recommendationId ?? null,
      scenarioId: input.scenarioId ?? null,
      agentId: agentCapability.agentId,
      domain,
      actionIntent: input.actionIntent,
      actorRole: input.actorRole,
      riskLevel: "CRITICAL",
      autonomyLevel: "REQUIRE_AUTHORITY_APPROVAL",
      decision: "REQUIRE_AUTHORITY_REVIEW",
      requiredReviewLevel: "PLATFORM_REVIEW",
      reasons,
      policyVersion,
      isProhibitedAction: false,
      evidenceCount,
      confidenceScore,
      contextMetadata: input.contextMetadata ?? {},
      evaluatedAt: new Date().toISOString(),
    };
  }

  // 10. General Risk and Review Level Decision Resolution
  let decision: GovernanceDecision;
  const riskLevel = actionClassification.defaultRiskLevel;
  const autonomyLevel = actionClassification.autonomyLevel;
  const reviewLevel = actionClassification.requiredReviewLevel;

  if (actionClassification.requiresAffirmativeApproval) {
    decision = "REQUIRE_HUMAN_APPROVAL";
    reasons.push(`Affirmative Human Approval Required: Consequential action '${input.actionIntent}' requires human decision maker approval.`);
  } else if (riskLevel === "LOW" && reviewLevel === "NO_REVIEW_REQUIRED") {
    decision = "ALLOW";
    reasons.push("Informational Intelligence Permitted: Read-only intelligence exploration.");
  } else if (riskLevel === "MODERATE") {
    decision = "ALLOW_WITH_REVIEW";
    reasons.push("Advisory Intelligence Permitted with Review: Normal agricultural planning recommendations subject to user discretion.");
  } else if (riskLevel === "HIGH") {
    decision = "REQUIRE_HUMAN_APPROVAL";
    reasons.push("High Consequence Action: Requires affirmative approval before execution.");
  } else {
    // CRITICAL
    decision = reviewLevel === "PROFESSIONAL_REVIEW"
      ? "REQUIRE_PROFESSIONAL_REVIEW"
      : reviewLevel === "AUTHORITY_REVIEW"
      ? "REQUIRE_AUTHORITY_REVIEW"
      : "REQUIRE_HUMAN_APPROVAL";
    reasons.push(`Critical Risk: Requires ${reviewLevel} before proceeding.`);
  }

  return {
    id: evalId,
    recommendationId: input.recommendationId ?? null,
    scenarioId: input.scenarioId ?? null,
    agentId: agentCapability.agentId,
    domain: actionClassification.domain,
    actionIntent: input.actionIntent,
    actorRole: input.actorRole,
    riskLevel,
    autonomyLevel,
    decision,
    requiredReviewLevel: reviewLevel,
    reasons,
    policyVersion,
    isProhibitedAction: false,
    evidenceCount,
    confidenceScore,
    contextMetadata: input.contextMetadata ?? {},
    evaluatedAt: new Date().toISOString(),
  };
}
