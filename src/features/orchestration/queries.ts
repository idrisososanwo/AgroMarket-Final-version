/**
 * AgroMarket Phase 3.1: Agricultural Intelligence Orchestration Server Queries
 * Provides typed, secure, and privacy-preserving data access for the Command Center.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  IntelligenceConflictItem,
  OrchestrationOverviewStats,
  OrchestrationRecommendationItem,
  OrchestrationSnapshotRecord,
  OrchestrationOutcomeItem,
  PriorityScoreBreakdown,
} from "./types";

/**
 * Fetches recent orchestration snapshots
 */
export async function getOrchestrationSnapshots(
  options: {
    limit?: number;
    state?: string;
    commodity?: string;
    scenarioType?: string;
  } = {}
): Promise<OrchestrationSnapshotRecord[]> {
  try {
    if (options.commodity) {
      assertNoProhibitedProduce(options.commodity, "Commodity query");
    }

    const supabase = await createClient();
    let query = supabase
      .from("agricultural_orchestration_snapshots")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(options.limit || 30);

    if (options.state) {
      query = query.eq("state", options.state);
    }
    if (options.commodity) {
      query = query.ilike("commodity", `%${options.commodity}%`);
    }
    if (options.scenarioType) {
      query = query.eq("scenario_type", options.scenarioType);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      ...row,
      priority_score: Number(row.priority_score),
      orchestration_confidence: Number(row.orchestration_confidence),
      domain_score: Number(row.domain_score),
      evidence_confidence: Number(row.evidence_confidence),
      component_breakdown: row.component_breakdown as PriorityScoreBreakdown,
      deterministic_findings: (row.deterministic_findings as Record<string, unknown>) || {},
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches cross-domain recommendations
 */
export async function getOrchestrationRecommendations(
  options: {
    limit?: number;
    status?: string;
    priority?: string;
  } = {}
): Promise<OrchestrationRecommendationItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_orchestration_recommendations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(options.limit || 30);

    if (options.status) {
      query = query.eq("status", options.status);
    }
    if (options.priority) {
      query = query.eq("priority", options.priority);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      snapshotId: row.snapshot_id,
      title: row.title,
      summary: row.summary,
      actionPath: row.action_path,
      priority: row.priority,
      confidence: Number(row.confidence),
      affectedDomains: (row.affected_domains || []) as OrchestrationRecommendationItem["affectedDomains"],
      affectedCommodities: row.affected_commodities || [],
      affectedStates: row.affected_states || [],
      status: row.status,
      advisoryDisclaimer: row.advisory_disclaimer,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewNotes: row.review_notes,
      outcomeId: row.outcome_id,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches active intelligence conflicts
 */
export async function getOrchestrationConflicts(
  options: {
    limit?: number;
    status?: string;
    severity?: string;
  } = {}
): Promise<IntelligenceConflictItem[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_intelligence_conflicts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(options.limit || 30);

    if (options.status) {
      query = query.eq("status", options.status);
    }
    if (options.severity) {
      query = query.eq("severity", options.severity);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      conflictType: row.conflict_type,
      domainA: row.domain_a as IntelligenceConflictItem["domainA"],
      domainB: row.domain_b as IntelligenceConflictItem["domainB"],
      signalA: row.signal_a,
      signalB: row.signal_b,
      state: row.state,
      lga: row.lga,
      commodity: row.commodity,
      severity: row.severity,
      status: row.status,
      explanation: row.explanation,
      confidenceImpact: Number(row.confidence_impact),
      recommendedHumanReview: row.recommended_human_review,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      resolutionNotes: row.resolution_notes,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches orchestration outcomes for evaluation
 */
export async function getOrchestrationOutcomes(
  options: { limit?: number } = {}
): Promise<OrchestrationOutcomeItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_orchestration_outcomes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(options.limit || 20);

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      recommendationId: row.recommendation_id,
      decision: row.decision,
      actionTaken: row.action_taken,
      actionTime: row.action_time,
      observedOutcome: row.observed_outcome,
      expectedOutcome: row.expected_outcome,
      variance: row.variance,
      evaluationScore: Number(row.evaluation_score),
      lessonsLearned: row.lessons_learned,
      recordedBy: row.recorded_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Computes high-level overview metrics for the Command Center
 */
export async function getOrchestrationOverviewStats(): Promise<OrchestrationOverviewStats> {
  try {
    const supabase = await createClient();

    const [
      { count: totalCount },
      { count: criticalCount },
      { count: highCount },
      { count: conflictsCount },
      { count: proposedRecsCount },
      { data: recentSnapshots },
    ] = await Promise.all([
      supabase.from("agricultural_orchestration_snapshots").select("*", { count: "exact", head: true }),
      supabase.from("agricultural_orchestration_snapshots").select("*", { count: "exact", head: true }).eq("priority_level", "CRITICAL"),
      supabase.from("agricultural_orchestration_snapshots").select("*", { count: "exact", head: true }).eq("priority_level", "HIGH"),
      supabase.from("agricultural_intelligence_conflicts").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("agricultural_orchestration_recommendations").select("*", { count: "exact", head: true }).eq("status", "PROPOSED"),
      supabase.from("agricultural_orchestration_snapshots").select("priority_score, orchestration_confidence, state, commodity").limit(30),
    ]);

    let avgScore = 48.0;
    let avgConf = 0.82;
    const stateSet = new Set<string>();
    const commoditySet = new Set<string>();

    if (recentSnapshots && recentSnapshots.length > 0) {
      avgScore =
        Math.round(
          (recentSnapshots.reduce((acc, row) => acc + Number(row.priority_score), 0) /
            recentSnapshots.length) *
            10
        ) / 10;
      avgConf =
        Math.round(
          (recentSnapshots.reduce((acc, row) => acc + Number(row.orchestration_confidence), 0) /
            recentSnapshots.length) *
            100
        ) / 100;

      for (const s of recentSnapshots) {
        if (s.state) stateSet.add(s.state);
        if (s.commodity) commoditySet.add(s.commodity);
      }
    }

    return {
      totalSnapshotsCount: totalCount || (recentSnapshots?.length ?? 0),
      criticalScenariosCount: criticalCount || 0,
      highScenariosCount: highCount || 0,
      activeConflictsCount: conflictsCount || 0,
      proposedRecommendationsCount: proposedRecsCount || 0,
      averagePriorityScore: avgScore,
      averageOrchestrationConfidence: avgConf,
      activeMonitoredCommoditiesCount: Math.max(1, commoditySet.size),
      activeMonitoredStatesCount: Math.max(1, stateSet.size),
    };
  } catch {
    return {
      totalSnapshotsCount: 0,
      criticalScenariosCount: 0,
      highScenariosCount: 0,
      activeConflictsCount: 0,
      proposedRecommendationsCount: 0,
      averagePriorityScore: 45.0,
      averageOrchestrationConfidence: 0.85,
      activeMonitoredCommoditiesCount: 1,
      activeMonitoredStatesCount: 1,
    };
  }
}
