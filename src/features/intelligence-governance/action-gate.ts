/**
 * AgroMarket Phase 3.8: Action Governance Gate
 * Enforces server-authoritative policy evaluation and approval checks BEFORE any
 * action integration or downstream execution is initiated.
 *
 * Direct execution or route bypass is strictly prevented.
 */

import {
  ActionGateCheckResult,
  GovernanceEvaluationInput,
  GovernanceEvaluationResult,
} from "./types";
import { evaluateGovernancePolicy } from "./policy-engine";
import {
  saveGovernanceEvaluation,
  getActiveApprovalForContext,
  getActiveOverrideForEvaluation,
} from "./data-layer";
import { auditGovernanceEvaluation } from "./audit";
import {
  assertNoProhibitedProduce,
  assertNoPrivateInformation,
} from "./validation";

export interface ActionGateParams {
  recommendationId?: string | null;
  scenarioId?: string | null;
  actionIntent: string;
  actorRole: string;
  agentId?: string;
  domain?: string;
  commodity?: string | null;
  evidenceCount?: number;
  confidenceScore?: number;
  conflictingIntelligenceDetected?: boolean;
  contextPayload?: Record<string, unknown>;
  userId?: string;
}

/**
 * Pre-action server-side gate evaluation.
 * MUST be called before creating or initiating any agricultural action integration.
 */
export async function evaluateActionGovernanceGate(
  params: ActionGateParams
): Promise<ActionGateCheckResult> {
  // 1. Invariant Assertions
  assertNoProhibitedProduce(params.actionIntent, "Action Gate Intent");
  assertNoProhibitedProduce(params.commodity, "Action Gate Commodity");
  assertNoProhibitedProduce(params.contextPayload, "Action Gate Context");
  assertNoPrivateInformation(params.contextPayload, "Action Gate Context");

  // 2. Resolve Agent and Domain Context (Defaults to Orchestrator if initiating synthesized action)
  const agentId = params.agentId || "AGRICULTURAL_ORCHESTRATION_AGENT";

  const evalInput: GovernanceEvaluationInput = {
    agentId,
    recommendationId: params.recommendationId ?? null,
    scenarioId: params.scenarioId ?? null,
    actionIntent: params.actionIntent,
    actorRole: params.actorRole,
    domain: params.domain,
    commodity: params.commodity ?? null,
    evidenceCount: params.evidenceCount ?? 1,
    confidenceScore: params.confidenceScore ?? 0.7,
    conflictingIntelligenceDetected: params.conflictingIntelligenceDetected ?? false,
    contextMetadata: params.contextPayload ?? {},
  };

  // 3. Deterministic Policy Evaluation
  const evaluation: GovernanceEvaluationResult = evaluateGovernancePolicy(evalInput);

  // 4. Persist and Audit Evaluation Asynchronously
  await saveGovernanceEvaluation(evaluation);
  await auditGovernanceEvaluation(evaluation, params.userId ?? null);

  // 5. Evaluate Decision Outcomes
  if (evaluation.decision === "ALLOW" || evaluation.decision === "ALLOW_WITH_REVIEW") {
    return {
      isPermitted: true,
      evaluation,
      message: "Action permitted under governance policy.",
      requiredAction: "NONE",
    };
  }

  // Check for Active Admin Override first
  const activeOverride = await getActiveOverrideForEvaluation(evaluation.id);
  if (activeOverride) {
    return {
      isPermitted: true,
      evaluation,
      activeOverride,
      message: "Action permitted under authorized administrative governance override.",
      requiredAction: "NONE",
    };
  }

  // If Human Approval or Review is Required, check if valid unexpired approval is on file
  if (
    evaluation.decision === "REQUIRE_HUMAN_APPROVAL" ||
    evaluation.decision === "REQUIRE_PROFESSIONAL_REVIEW" ||
    evaluation.decision === "REQUIRE_AUTHORITY_REVIEW"
  ) {
    if (params.recommendationId) {
      const activeApproval = await getActiveApprovalForContext(
        params.recommendationId,
        params.actionIntent
      );

      if (activeApproval) {
        return {
          isPermitted: true,
          evaluation,
          activeApproval,
          message: "Action permitted with recorded affirmative human approval.",
          requiredAction: "NONE",
        };
      }
    }

    // Required approval is missing
    const requiredAction =
      evaluation.decision === "REQUIRE_PROFESSIONAL_REVIEW"
        ? "OBTAIN_EXPERT_REVIEW"
        : evaluation.decision === "REQUIRE_AUTHORITY_REVIEW"
        ? "OBTAIN_AUTHORITY_REVIEW"
        : "SUBMIT_APPROVAL";

    return {
      isPermitted: false,
      evaluation,
      blockingReason: evaluation.reasons.join("; "),
      message: `Action requires prior ${evaluation.requiredReviewLevel} before initiation.`,
      requiredAction,
    };
  }

  // DENY or INSUFFICIENT_DATA
  return {
    isPermitted: false,
    evaluation,
    blockingReason: evaluation.reasons.join("; "),
    message:
      evaluation.decision === "INSUFFICIENT_DATA"
        ? "Action blocked due to inadequate observational evidence or low confidence score."
        : "Action strictly prohibited by governance policy denylist.",
    requiredAction: "BLOCKED",
  };
}
