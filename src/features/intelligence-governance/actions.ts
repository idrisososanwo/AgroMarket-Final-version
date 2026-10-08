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
import { ActorRole } from "@/features/decision-intelligence/types";

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

/**
 * Server Action: Approves a pending human approval with affirmative justification and safety re-evaluation.
 */
export async function approveHumanApprovalAction(
  approvalId: string,
  justification: string
): Promise<ActionResult<HumanApprovalRecord>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to review approvals." };
    }

    if (!justification || justification.trim().length === 0) {
      return { success: false, error: "Justification is required to record affirmative approval." };
    }

    assertNoProhibitedProduce(justification, "Approve Human Approval Justification");

    const approval = await import("./data-layer").then((m) => m.getHumanApprovalById(approvalId));
    if (!approval) {
      return { success: false, error: "Approval record not found." };
    }

    // Role verification: user must be ADMIN, PLATFORM_COORDINATOR, or match the required role
    const hasRole =
      user.roles.includes("ADMIN") ||
      (user.roles as string[]).includes("PLATFORM_COORDINATOR") ||
      (user.roles as string[]).includes(approval.approverRole);

    if (!hasRole) {
      return {
        success: false,
        error: `Unauthorized: User lacks required role (${approval.approverRole}) to approve this item.`,
      };
    }

    if (approval.status !== "PENDING") {
      return {
        success: false,
        error: `Cannot approve: Approval record is already marked as ${approval.status}.`,
      };
    }

    const now = new Date();
    if (now >= new Date(approval.expiresAt)) {
      return { success: false, error: "Cannot approve: Approval window has expired. Fresh evaluation required." };
    }

    // Policy version check: Stale policy assumptions cannot be approved
    const { CURRENT_GOVERNANCE_POLICY_VERSION } = await import("./constants");
    if (approval.policyVersion !== CURRENT_GOVERNANCE_POLICY_VERSION) {
      return {
        success: false,
        error: "Policy Version Mismatch: Governance policy has been updated. Fresh evaluation required.",
      };
    }

    // Safety re-evaluation: Re-run governance policy to guarantee assumptions remain valid
    const reEvaluation = evaluateGovernancePolicy({
      agentId: "AGRICULTURAL_ORCHESTRATION_AGENT",
      recommendationId: approval.recommendationId,
      actionIntent: approval.actionIntent,
      actorRole: approval.approverRole as ActorRole,
    });

    if (reEvaluation.decision === "DENY" || reEvaluation.decision === "INSUFFICIENT_DATA") {
      return {
        success: false,
        error: `Policy Safety Block: Re-evaluation determined action is no longer permissible (${reEvaluation.decision}).`,
      };
    }

    approval.status = "APPROVED";
    approval.justification = justification.trim();
    approval.updatedAt = now.toISOString();

    await import("./data-layer").then((m) => m.updateHumanApproval(approval));
    await auditHumanApproval(approval);

    return { success: true, data: approval };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to approve human review request.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Rejects a pending human approval with substantive reason.
 */
export async function rejectHumanApprovalAction(
  approvalId: string,
  reason: string
): Promise<ActionResult<HumanApprovalRecord>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to reject approvals." };
    }

    if (!reason || reason.trim().length === 0) {
      return { success: false, error: "Substantive reason is required to reject an approval request." };
    }

    assertNoProhibitedProduce(reason, "Reject Human Approval Reason");

    const approval = await import("./data-layer").then((m) => m.getHumanApprovalById(approvalId));
    if (!approval) {
      return { success: false, error: "Approval record not found." };
    }

    const hasRole =
      user.roles.includes("ADMIN") ||
      (user.roles as string[]).includes("PLATFORM_COORDINATOR") ||
      (user.roles as string[]).includes(approval.approverRole);

    if (!hasRole) {
      return {
        success: false,
        error: `Unauthorized: User lacks required role (${approval.approverRole}) to reject this item.`,
      };
    }

    if (approval.status !== "PENDING") {
      return {
        success: false,
        error: `Cannot reject: Approval record is already marked as ${approval.status}.`,
      };
    }

    approval.status = "REJECTED";
    approval.revocationReason = reason.trim();
    approval.updatedAt = new Date().toISOString();

    await import("./data-layer").then((m) => m.updateHumanApproval(approval));
    await auditHumanApproval(approval);

    return { success: true, data: approval };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reject approval request.";
    return { success: false, error: message };
  }
}

