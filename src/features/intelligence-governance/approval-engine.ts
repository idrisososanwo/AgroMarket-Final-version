/**
 * AgroMarket Phase 3.8: Human Approval Engine & Lifecycle Management
 * Handles affirmative human approvals, expirations, revocations, and provenance tracking.
 */

import {
  CreateApprovalInput,
  HumanApprovalRecord,
} from "./types";
import {
  DEFAULT_APPROVAL_TTL_HOURS,
  CURRENT_GOVERNANCE_POLICY_VERSION,
} from "./constants";
import {
  assertNoProhibitedProduce,
  assertNoPrivateInformation,
  sanitizeGovernanceText,
} from "./validation";

/**
 * Creates a structured affirmative human approval record.
 */
export function createHumanApproval(input: CreateApprovalInput): HumanApprovalRecord {
  assertNoProhibitedProduce(input.justification, "Approval Justification");
  assertNoProhibitedProduce(input.metadata, "Approval Metadata");
  assertNoPrivateInformation(input.justification, "Approval Justification");
  assertNoPrivateInformation(input.metadata, "Approval Metadata");

  const cleanJustification = sanitizeGovernanceText(input.justification, "justification");

  const now = new Date();
  const ttlHours = input.ttlHours || DEFAULT_APPROVAL_TTL_HOURS;
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString();

  return {
    id: crypto.randomUUID(),
    evaluationId: input.evaluationId,
    recommendationId: input.recommendationId,
    actionIntent: input.actionIntent,
    approverId: input.approverId,
    approverRole: input.approverRole,
    approvalType: input.approvalType,
    status: "APPROVED",
    justification: cleanJustification,
    evidenceReferences: input.evidenceReferences || [],
    policyVersion: CURRENT_GOVERNANCE_POLICY_VERSION,
    expiresAt,
    revokedAt: null,
    revocationReason: null,
    supersededById: null,
    metadata: input.metadata || {},
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Validates whether an approval is active, unexpired, and matches the target context.
 */
export function isApprovalValid(
  approval: HumanApprovalRecord,
  context: {
    recommendationId: string;
    actionIntent: string;
    policyVersion?: string;
  }
): { valid: boolean; reason?: string } {
  if (approval.status !== "APPROVED") {
    return {
      valid: false,
      reason: `Approval is not active (current status: ${approval.status}).`,
    };
  }

  const now = new Date();
  const expiresAt = new Date(approval.expiresAt);
  if (now >= expiresAt) {
    return {
      valid: false,
      reason: `Approval expired at ${approval.expiresAt}.`,
    };
  }

  if (approval.recommendationId !== context.recommendationId) {
    return {
      valid: false,
      reason: "Approval recommendation mismatch: Approval cannot be reused across different recommendations.",
    };
  }

  if (approval.actionIntent !== context.actionIntent) {
    return {
      valid: false,
      reason: "Approval action intent mismatch: Approval is specific to the authorized action intent.",
    };
  }

  const expectedPolicy = context.policyVersion || CURRENT_GOVERNANCE_POLICY_VERSION;
  if (approval.policyVersion !== expectedPolicy) {
    return {
      valid: false,
      reason: `Approval policy version mismatch (${approval.policyVersion} vs current ${expectedPolicy}). Re-evaluation required.`,
    };
  }

  return { valid: true };
}

/**
 * Revokes an existing approval with substantive justification.
 */
export function revokeHumanApproval(
  approval: HumanApprovalRecord,
  revokerId: string,
  reason: string
): HumanApprovalRecord {
  assertNoProhibitedProduce(reason, "Approval Revocation Reason");
  assertNoPrivateInformation(reason, "Approval Revocation Reason");
  const cleanReason = sanitizeGovernanceText(reason, "revocation reason");

  const now = new Date().toISOString();
  return {
    ...approval,
    status: "REVOKED",
    revokedAt: now,
    revocationReason: cleanReason,
    updatedAt: now,
    metadata: {
      ...approval.metadata,
      revokedBy: revokerId,
    },
  };
}
