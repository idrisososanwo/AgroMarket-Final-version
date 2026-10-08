"use server";

/**
 * AgroMarket Phase 3.8: Intelligence Governance Server Actions
 * Governed server-side mutations for evaluations, approvals, and overrides.
 */

import { getCurrentUser } from "@/lib/auth/server";
import {
  governanceEvaluationInputSchema,
  createApprovalSchema,
  revokeApprovalSchema,
  createOverrideSchema,
  assertNoProhibitedProduce,
} from "./validation";
import { evaluateGovernancePolicy } from "./policy-engine";
import { createHumanApproval } from "./approval-engine";
import { createGovernanceOverride } from "./override-engine";
import {
  saveGovernanceEvaluation,
  saveHumanApproval,
  saveGovernanceOverride,
} from "./data-layer";
import {
  auditGovernanceEvaluation,
  auditHumanApproval,
  auditGovernanceOverride,
} from "./audit";
import {
  GovernanceEvaluationResult,
  GovernanceEvaluationInput,
  HumanApprovalRecord,
  CreateApprovalInput,
  GovernanceOverrideRecord,
  CreateOverrideInput,
} from "./types";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Deterministically evaluates a governance policy request.
 */
export async function evaluateGovernanceAction(
  rawInput: unknown
): Promise<ActionResult<GovernanceEvaluationResult>> {
  try {
    assertNoProhibitedProduce(rawInput, "Evaluate Governance Action");

    const parsed = governanceEvaluationInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const evaluation = evaluateGovernancePolicy(parsed.data as GovernanceEvaluationInput);
    await saveGovernanceEvaluation(evaluation);

    const user = await getCurrentUser();
    await auditGovernanceEvaluation(evaluation, user?.id ?? null);

    return { success: true, data: evaluation };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to evaluate governance policy.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Submits an affirmative human approval record.
 */
export async function submitHumanApprovalAction(
  rawInput: unknown
): Promise<ActionResult<HumanApprovalRecord>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to grant human approvals." };
    }

    assertNoProhibitedProduce(rawInput, "Submit Human Approval Action");

    const parsed = createApprovalSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    if (parsed.data.approverId !== user.id && !user.roles.includes("ADMIN")) {
      return { success: false, error: "Approver ID must match the authenticated user." };
    }

    const approval = createHumanApproval(parsed.data as CreateApprovalInput);
    await saveHumanApproval(approval);
    await auditHumanApproval(approval);

    return { success: true, data: approval };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record human approval.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Revokes an active human approval with justification.
 */
export async function revokeHumanApprovalAction(
  rawInput: unknown
): Promise<ActionResult<boolean>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to revoke approvals." };
    }

    assertNoProhibitedProduce(rawInput, "Revoke Human Approval Action");

    const parsed = revokeApprovalSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    // Server-side revocation acknowledged
    return { success: true, data: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke approval.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Submits an administrative governance override.
 */
export async function submitGovernanceOverrideAction(
  rawInput: unknown
): Promise<ActionResult<GovernanceOverrideRecord>> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.roles.includes("ADMIN")) {
      return { success: false, error: "Unauthorized: Administrator privileges required to execute overrides." };
    }

    assertNoProhibitedProduce(rawInput, "Submit Governance Override Action");

    const parsed = createOverrideSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      };
    }

    const override = createGovernanceOverride(parsed.data as CreateOverrideInput);
    await saveGovernanceOverride(override);
    await auditGovernanceOverride(override);

    return { success: true, data: override };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to execute governance override.";
    return { success: false, error: message };
  }
}
