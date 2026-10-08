/**
 * AgroMarket Phase 3.8: Governance Audit Ledger Integration
 * Records immutable audit entries into public.audit_logs and in-memory governance store.
 */

import { recordAuditLog } from "@/lib/audit";
import {
  GovernanceEvaluationResult,
  HumanApprovalRecord,
  GovernanceOverrideRecord,
} from "./types";

export interface GovernanceAuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorId?: string | null;
  policyVersion: string;
  details: Record<string, unknown>;
  timestamp: string;
}

const inMemoryAuditEntries: GovernanceAuditEntry[] = [];

export function getInMemoryGovernanceAuditEntries(): GovernanceAuditEntry[] {
  return [...inMemoryAuditEntries];
}

export function clearInMemoryGovernanceAuditEntries(): void {
  inMemoryAuditEntries.length = 0;
}

/**
 * Appends a governance policy evaluation to the immutable audit trail.
 */
export async function auditGovernanceEvaluation(
  evaluation: GovernanceEvaluationResult,
  actorId?: string | null
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry: GovernanceAuditEntry = {
    id: evaluation.id,
    action: `GOVERNANCE_EVALUATION_${evaluation.decision}`,
    resourceType: "agricultural_governance_evaluations",
    resourceId: evaluation.id,
    actorId: actorId ?? null,
    policyVersion: evaluation.policyVersion,
    details: {
      agentId: evaluation.agentId,
      actionIntent: evaluation.actionIntent,
      riskLevel: evaluation.riskLevel,
      autonomyLevel: evaluation.autonomyLevel,
      decision: evaluation.decision,
      requiredReviewLevel: evaluation.requiredReviewLevel,
      reasons: evaluation.reasons,
      confidenceScore: evaluation.confidenceScore,
      evidenceCount: evaluation.evidenceCount,
    },
    timestamp,
  };

  inMemoryAuditEntries.push(entry);

  await recordAuditLog({
    actorId: actorId ?? null,
    action: `GOVERNANCE_EVALUATION_${evaluation.decision}`,
    resourceType: "agricultural_governance_evaluations",
    resourceId: evaluation.id,
    metadata: entry.details,
  });
}

/**
 * Appends a human approval grant to the immutable audit trail.
 */
export async function auditHumanApproval(approval: HumanApprovalRecord): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry: GovernanceAuditEntry = {
    id: approval.id,
    action: "GOVERNANCE_HUMAN_APPROVAL_RECORDED",
    resourceType: "agricultural_human_approvals",
    resourceId: approval.id,
    actorId: approval.approverId,
    policyVersion: approval.policyVersion,
    details: {
      evaluationId: approval.evaluationId,
      recommendationId: approval.recommendationId,
      actionIntent: approval.actionIntent,
      approverRole: approval.approverRole,
      approvalType: approval.approvalType,
      expiresAt: approval.expiresAt,
    },
    timestamp,
  };

  inMemoryAuditEntries.push(entry);

  await recordAuditLog({
    actorId: approval.approverId,
    action: "GOVERNANCE_HUMAN_APPROVAL_RECORDED",
    resourceType: "agricultural_human_approvals",
    resourceId: approval.id,
    metadata: entry.details,
  });
}

/**
 * Appends an administrative governance override to the immutable audit trail.
 */
export async function auditGovernanceOverride(
  override: GovernanceOverrideRecord
): Promise<void> {
  const timestamp = new Date().toISOString();
  const entry: GovernanceAuditEntry = {
    id: override.id,
    action: "GOVERNANCE_OVERRIDE_EXECUTED",
    resourceType: "agricultural_governance_overrides",
    resourceId: override.id,
    actorId: override.overrideById,
    policyVersion: override.policyVersion,
    details: {
      evaluationId: override.evaluationId,
      overrideRole: override.overrideRole,
      originalDecision: override.originalDecision,
      overrideDecision: override.overrideDecision,
      reason: override.reason,
      overriddenPolicyRules: override.overriddenPolicyRules,
    },
    timestamp,
  };

  inMemoryAuditEntries.push(entry);

  await recordAuditLog({
    actorId: override.overrideById,
    action: "GOVERNANCE_OVERRIDE_EXECUTED",
    resourceType: "agricultural_governance_overrides",
    resourceId: override.id,
    metadata: entry.details,
  });
}
