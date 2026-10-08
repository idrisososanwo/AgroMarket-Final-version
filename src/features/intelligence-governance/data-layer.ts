/**
 * AgroMarket Phase 3.8: Governance Data Layer
 * Server-authoritative persistence to PostgreSQL/Supabase with robust in-memory fallback.
 */

import { createClient } from "@/lib/supabase/server";
import {
  GovernanceEvaluationResult,
  HumanApprovalRecord,
  GovernanceOverrideRecord,
} from "./types";
import { isApprovalValid } from "./approval-engine";
import {
  assertNoProhibitedProduce,
  assertNoPrivateInformation,
} from "./validation";

// -----------------------------------------------------------------------------
// IN-MEMORY FALLBACK STORE (Offline & Unit Testing)
// -----------------------------------------------------------------------------

const inMemoryEvaluations: GovernanceEvaluationResult[] = [];
const inMemoryApprovals: HumanApprovalRecord[] = [];
const inMemoryOverrides: GovernanceOverrideRecord[] = [];

export function clearInMemoryGovernanceStore(): void {
  inMemoryEvaluations.length = 0;
  inMemoryApprovals.length = 0;
  inMemoryOverrides.length = 0;
}

export function seedInMemoryGovernanceStore(data: {
  evaluations?: GovernanceEvaluationResult[];
  approvals?: HumanApprovalRecord[];
  overrides?: GovernanceOverrideRecord[];
}): void {
  if (data.evaluations) inMemoryEvaluations.push(...data.evaluations);
  if (data.approvals) inMemoryApprovals.push(...data.approvals);
  if (data.overrides) inMemoryOverrides.push(...data.overrides);
}

// -----------------------------------------------------------------------------
// 1. EVALUATION PERSISTENCE
// -----------------------------------------------------------------------------

export async function saveGovernanceEvaluation(
  evaluation: GovernanceEvaluationResult
): Promise<boolean> {
  assertNoProhibitedProduce(evaluation.actionIntent, "Save Governance Evaluation Intent");
  assertNoProhibitedProduce(evaluation.contextMetadata, "Save Governance Evaluation Metadata");
  assertNoPrivateInformation(evaluation.contextMetadata, "Save Governance Evaluation Metadata");

  // In-memory cache update
  const existingIdx = inMemoryEvaluations.findIndex((e) => e.id === evaluation.id);
  if (existingIdx >= 0) {
    inMemoryEvaluations[existingIdx] = evaluation;
  } else {
    inMemoryEvaluations.push(evaluation);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("agricultural_governance_evaluations").insert({
      id: evaluation.id,
      recommendation_id: evaluation.recommendationId ?? null,
      scenario_id: evaluation.scenarioId ?? null,
      agent_id: evaluation.agentId,
      domain: evaluation.domain,
      action_intent: evaluation.actionIntent,
      actor_role: evaluation.actorRole,
      risk_level: evaluation.riskLevel,
      autonomy_level: evaluation.autonomyLevel,
      decision: evaluation.decision,
      required_review_level: evaluation.requiredReviewLevel,
      reasons: evaluation.reasons,
      policy_version: evaluation.policyVersion,
      is_prohibited_action: evaluation.isProhibitedAction,
      evidence_count: evaluation.evidenceCount,
      confidence_score: evaluation.confidenceScore,
      context_metadata: evaluation.contextMetadata,
      evaluated_at: evaluation.evaluatedAt,
    });

    if (error) {
      console.warn("DB notice in saveGovernanceEvaluation, fallback used:", error.message);
    }
    return true;
  } catch {
    return true;
  }
}

export async function getGovernanceEvaluationById(
  id: string
): Promise<GovernanceEvaluationResult | null> {
  const cached = inMemoryEvaluations.find((e) => e.id === id);
  if (cached) return cached;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_governance_evaluations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      recommendationId: data.recommendation_id,
      scenarioId: data.scenario_id,
      agentId: data.agent_id,
      domain: data.domain,
      actionIntent: data.action_intent,
      actorRole: data.actor_role,
      riskLevel: data.risk_level,
      autonomyLevel: data.autonomy_level,
      decision: data.decision,
      requiredReviewLevel: data.required_review_level,
      reasons: data.reasons || [],
      policyVersion: data.policy_version,
      isProhibitedAction: data.is_prohibited_action,
      evidenceCount: data.evidence_count,
      confidenceScore: Number(data.confidence_score),
      contextMetadata: data.context_metadata || {},
      evaluatedAt: data.evaluated_at,
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// 2. APPROVAL PERSISTENCE
// -----------------------------------------------------------------------------

export async function saveHumanApproval(approval: HumanApprovalRecord): Promise<boolean> {
  assertNoProhibitedProduce(approval.justification, "Save Human Approval Justification");
  assertNoProhibitedProduce(approval.metadata, "Save Human Approval Metadata");
  assertNoPrivateInformation(approval.justification, "Save Human Approval Justification");
  assertNoPrivateInformation(approval.metadata, "Save Human Approval Metadata");

  const existingIdx = inMemoryApprovals.findIndex((a) => a.id === approval.id);
  if (existingIdx >= 0) {
    inMemoryApprovals[existingIdx] = approval;
  } else {
    inMemoryApprovals.push(approval);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("agricultural_human_approvals").insert({
      id: approval.id,
      evaluation_id: approval.evaluationId,
      recommendation_id: approval.recommendationId,
      action_intent: approval.actionIntent,
      approver_id: approval.approverId,
      approver_role: approval.approverRole,
      approval_type: approval.approvalType,
      status: approval.status,
      justification: approval.justification,
      evidence_references: approval.evidenceReferences,
      policy_version: approval.policyVersion,
      expires_at: approval.expiresAt,
      revoked_at: approval.revokedAt ?? null,
      revocation_reason: approval.revocationReason ?? null,
      superseded_by_id: approval.supersededById ?? null,
      metadata: approval.metadata,
      created_at: approval.createdAt,
      updated_at: approval.updatedAt,
    });

    if (error) {
      console.warn("DB notice in saveHumanApproval, fallback used:", error.message);
    }
    return true;
  } catch {
    return true;
  }
}

export async function getActiveApprovalForContext(
  recommendationId: string,
  actionIntent: string
): Promise<HumanApprovalRecord | null> {
  // First search in-memory cache
  const activeCached = inMemoryApprovals.find(
    (a) =>
      a.recommendationId === recommendationId &&
      a.actionIntent === actionIntent &&
      isApprovalValid(a, { recommendationId, actionIntent }).valid
  );
  if (activeCached) return activeCached;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("agricultural_human_approvals")
      .select("*")
      .eq("recommendation_id", recommendationId)
      .eq("action_intent", actionIntent)
      .eq("status", "APPROVED")
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      evaluationId: data.evaluation_id,
      recommendationId: data.recommendation_id,
      actionIntent: data.action_intent,
      approverId: data.approver_id,
      approverRole: data.approver_role,
      approvalType: data.approval_type,
      status: data.status,
      justification: data.justification,
      evidenceReferences: data.evidence_references || [],
      policyVersion: data.policy_version,
      expiresAt: data.expires_at,
      revokedAt: data.revoked_at,
      revocationReason: data.revocation_reason,
      supersededById: data.superseded_by_id,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// 3. OVERRIDE PERSISTENCE
// -----------------------------------------------------------------------------

export async function saveGovernanceOverride(
  override: GovernanceOverrideRecord
): Promise<boolean> {
  assertNoProhibitedProduce(override.reason, "Save Governance Override Reason");
  assertNoProhibitedProduce(override.metadata, "Save Governance Override Metadata");
  assertNoPrivateInformation(override.reason, "Save Governance Override Reason");
  assertNoPrivateInformation(override.metadata, "Save Governance Override Metadata");

  inMemoryOverrides.push(override);

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("agricultural_governance_overrides").insert({
      id: override.id,
      evaluation_id: override.evaluationId,
      override_by_id: override.overrideById,
      override_role: override.overrideRole,
      original_decision: override.originalDecision,
      override_decision: override.overrideDecision,
      reason: override.reason,
      policy_version: override.policyVersion,
      overridden_policy_rules: override.overriddenPolicyRules,
      metadata: override.metadata,
      created_at: override.createdAt,
    });

    if (error) {
      console.warn("DB notice in saveGovernanceOverride, fallback used:", error.message);
    }
    return true;
  } catch {
    return true;
  }
}

export async function getActiveOverrideForEvaluation(
  evaluationId: string
): Promise<GovernanceOverrideRecord | null> {
  const cached = inMemoryOverrides.find((o) => o.evaluationId === evaluationId);
  if (cached) return cached;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_governance_overrides")
      .select("*")
      .eq("evaluation_id", evaluationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      evaluationId: data.evaluation_id,
      overrideById: data.override_by_id,
      overrideRole: data.override_role,
      originalDecision: data.original_decision,
      overrideDecision: data.override_decision,
      reason: data.reason,
      policyVersion: data.policy_version,
      overriddenPolicyRules: data.overridden_policy_rules || [],
      metadata: data.metadata || {},
      createdAt: data.created_at,
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// 4. GOVERNANCE COMMAND CENTER QUERIES & LISTINGS
// -----------------------------------------------------------------------------

export async function getHumanApprovalById(id: string): Promise<HumanApprovalRecord | null> {
  const cached = inMemoryApprovals.find((a) => a.id === id);
  if (cached) return cached;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_human_approvals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      evaluationId: data.evaluation_id,
      recommendationId: data.recommendation_id,
      actionIntent: data.action_intent,
      approverId: data.approver_id,
      approverRole: data.approver_role,
      approvalType: data.approval_type,
      status: data.status,
      justification: data.justification,
      evidenceReferences: data.evidence_references || [],
      policyVersion: data.policy_version,
      expiresAt: data.expires_at,
      revokedAt: data.revoked_at,
      revocationReason: data.revocation_reason,
      supersededById: data.superseded_by_id,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch {
    return null;
  }
}

export async function updateHumanApproval(approval: HumanApprovalRecord): Promise<boolean> {
  assertNoProhibitedProduce(approval.justification, "Update Human Approval Justification");
  assertNoProhibitedProduce(approval.metadata, "Update Human Approval Metadata");

  const idx = inMemoryApprovals.findIndex((a) => a.id === approval.id);
  if (idx >= 0) {
    inMemoryApprovals[idx] = approval;
  } else {
    inMemoryApprovals.push(approval);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("agricultural_human_approvals")
      .update({
        status: approval.status,
        justification: approval.justification,
        revoked_at: approval.revokedAt,
        revocation_reason: approval.revocationReason,
        metadata: approval.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", approval.id);

    if (error) {
      console.warn("DB notice in updateHumanApproval, fallback used:", error.message);
    }
    return true;
  } catch {
    return true;
  }
}

export async function getAllGovernanceEvaluations(filters?: {
  decision?: string;
  riskLevel?: string;
  agentId?: string;
  limit?: number;
}): Promise<GovernanceEvaluationResult[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_governance_evaluations").select("*");
    if (filters?.decision) query = query.eq("decision", filters.decision);
    if (filters?.riskLevel) query = query.eq("risk_level", filters.riskLevel);
    if (filters?.agentId) query = query.eq("agent_id", filters.agentId);
    query = query.order("evaluated_at", { ascending: false }).limit(filters?.limit || 50);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        recommendationId: d.recommendation_id,
        scenarioId: d.scenario_id,
        agentId: d.agent_id,
        domain: d.domain,
        actionIntent: d.action_intent,
        actorRole: d.actor_role,
        riskLevel: d.risk_level,
        autonomyLevel: d.autonomy_level,
        decision: d.decision,
        requiredReviewLevel: d.required_review_level,
        reasons: d.reasons || [],
        policyVersion: d.policy_version,
        isProhibitedAction: d.is_prohibited_action,
        evidenceCount: d.evidence_count,
        confidenceScore: Number(d.confidence_score),
        contextMetadata: d.context_metadata || {},
        evaluatedAt: d.evaluated_at,
      }));
    }
  } catch {
    // In-memory fallback
  }

  let list = [...inMemoryEvaluations];

  if (filters?.decision) {
    list = list.filter((e) => e.decision === filters.decision);
  }
  if (filters?.riskLevel) {
    list = list.filter((e) => e.riskLevel === filters.riskLevel);
  }
  if (filters?.agentId) {
    list = list.filter((e) => e.agentId === filters.agentId);
  }

  list.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime());
  const limit = filters?.limit || 50;
  return list.slice(0, limit);
}

export async function getAllHumanApprovals(filters?: {
  status?: string;
  approvalType?: string;
  limit?: number;
}): Promise<HumanApprovalRecord[]> {
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_human_approvals").select("*");
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.approvalType) query = query.eq("approval_type", filters.approvalType);
    query = query.order("created_at", { ascending: false }).limit(filters?.limit || 50);

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        evaluationId: d.evaluation_id,
        recommendationId: d.recommendation_id,
        actionIntent: d.action_intent,
        approverId: d.approver_id,
        approverRole: d.approver_role,
        approvalType: d.approval_type,
        status: d.status,
        justification: d.justification,
        evidenceReferences: d.evidence_references || [],
        revocationReason: d.revocation_reason,
        policyVersion: d.policy_version,
        metadata: d.metadata || {},
        expiresAt: d.expires_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    }
  } catch {
    // in-memory fallback
  }

  let list = [...inMemoryApprovals];

  if (filters?.status) {
    list = list.filter((a) => a.status === filters.status);
  }
  if (filters?.approvalType) {
    list = list.filter((a) => a.approvalType === filters.approvalType);
  }

  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const limit = filters?.limit || 50;
  return list.slice(0, limit);
}

export async function getAllGovernanceOverrides(limit = 50): Promise<GovernanceOverrideRecord[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_governance_overrides")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        evaluationId: d.evaluation_id,
        overrideById: d.override_by_id,
        overrideRole: d.override_role,
        originalDecision: d.original_decision,
        overrideDecision: d.override_decision,
        reason: d.reason,
        overriddenPolicyRules: d.overridden_policy_rules || [],
        policyVersion: d.policy_version,
        metadata: d.metadata || {},
        createdAt: d.created_at,
      }));
    }
  } catch {
    // in-memory fallback
  }

  const list = [...inMemoryOverrides];
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list.slice(0, limit);
}

export async function getGovernanceSummaryStats(): Promise<import("./types").GovernanceSummaryStats> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const evals = await getAllGovernanceEvaluations({ limit: 1000 });
  const approvals = await getAllHumanApprovals({ limit: 1000 });
  const overrides = await getAllGovernanceOverrides(1000);

  const totalEvaluations = evals.length;
  const evaluationsToday = evals.filter((e) => e.evaluatedAt.startsWith(todayStr)).length;
  const evaluationsRequiringReview = evals.filter(
    (e) =>
      e.decision === "REQUIRE_HUMAN_APPROVAL" ||
      e.decision === "REQUIRE_PROFESSIONAL_REVIEW" ||
      e.decision === "REQUIRE_AUTHORITY_REVIEW"
  ).length;

  const pendingApprovals = approvals.filter((a) => a.status === "PENDING").length;
  const professionalReviewsPending = evals.filter(
    (e) => e.decision === "REQUIRE_PROFESSIONAL_REVIEW"
  ).length;
  const authorityReviewsPending = evals.filter(
    (e) => e.decision === "REQUIRE_AUTHORITY_REVIEW"
  ).length;

  const blockedActions = evals.filter((e) => e.decision === "DENY").length;
  const insufficientDataDecisions = evals.filter(
    (e) => e.decision === "INSUFFICIENT_DATA"
  ).length;

  const expiredApprovals = approvals.filter(
    (a) => a.status === "EXPIRED" || (a.status === "APPROVED" && new Date(a.expiresAt) < now)
  ).length;

  const recentOverrides = overrides.length;

  return {
    totalEvaluations,
    evaluationsToday,
    evaluationsRequiringReview,
    pendingApprovals,
    professionalReviewsPending,
    authorityReviewsPending,
    blockedActions,
    insufficientDataDecisions,
    expiredApprovals,
    recentOverrides,
    activePolicyVersion: "v1.0.0",
  };
}

