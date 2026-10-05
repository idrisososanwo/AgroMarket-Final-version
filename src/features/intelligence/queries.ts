/**
 * AgroMarket Phase 2.1: Agricultural Intelligence Server Queries
 *
 * Provides safe, typed read models for observations, signals, recommendations,
 * agents, and evaluations respecting RLS and anti-pork policies.
 */

import { createClient } from "@/lib/supabase/server";
import {
  IntelligenceAgent,
  IntelligenceSignal,
  IntelligenceObservation,
  IntelligenceRecommendation,
  IntelligencePrediction,
  IntelligenceEvaluation,
  IntelligenceEvidence,
  ExpectedImpact,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";

export async function getIntelligenceAgents(): Promise<IntelligenceAgent[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_intelligence_agents")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      capabilities: row.capabilities,
      status: row.status,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function getIntelligenceSignals(filters?: {
  signalType?: string;
  commodity?: string;
  state?: string;
  limit?: number;
}): Promise<IntelligenceSignal[]> {
  try {
    if (filters?.commodity) {
      assertNoProhibitedProduce(filters.commodity, "Filter commodity");
    }
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_intelligence_signals")
      .select("*")
      .order("observed_at", { ascending: false });

    if (filters?.signalType && filters.signalType !== "ALL") {
      query = query.eq("signal_type", filters.signalType);
    }
    if (filters?.commodity && filters.commodity !== "ALL") {
      query = query.ilike("commodity", `%${filters.commodity}%`);
    }
    if (filters?.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      signalType: row.signal_type,
      commodity: row.commodity,
      category: row.category,
      state: row.state,
      lga: row.lga,
      corridor: row.corridor,
      magnitude: Number(row.magnitude),
      confidence: Number(row.confidence),
      source: row.source,
      evidence: (row.evidence as unknown as IntelligenceEvidence[]) || [],
      supportingObservationIds: row.supporting_observation_ids,
      observedAt: row.observed_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getIntelligenceObservations(filters?: {
  domainSource?: string;
  commodity?: string;
  state?: string;
  limit?: number;
}): Promise<IntelligenceObservation[]> {
  try {
    if (filters?.commodity) {
      assertNoProhibitedProduce(filters.commodity, "Filter commodity");
    }
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_intelligence_observations")
      .select("*")
      .order("observed_at", { ascending: false });

    if (filters?.domainSource && filters.domainSource !== "ALL") {
      query = query.eq("domain_source", filters.domainSource);
    }
    if (filters?.commodity && filters.commodity !== "ALL") {
      query = query.ilike("commodity", `%${filters.commodity}%`);
    }
    if (filters?.state && filters.state !== "ALL") {
      query = query.eq("state", filters.state);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      domainSource: row.domain_source,
      sourceId: row.source_id,
      commodity: row.commodity,
      category: row.category,
      state: row.state,
      lga: row.lga,
      corridor: row.corridor,
      summary: row.summary,
      details: (row.details as Record<string, unknown>) || {},
      observedValue: row.observed_value != null ? Number(row.observed_value) : null,
      baselineValue: row.baseline_value != null ? Number(row.baseline_value) : null,
      unit: row.unit,
      confidence: Number(row.confidence),
      evidence: (row.evidence as unknown as IntelligenceEvidence[]) || [],
      observedAt: row.observed_at,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getIntelligenceRecommendations(filters?: {
  status?: string;
  objective?: string;
  limit?: number;
}): Promise<IntelligenceRecommendation[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_intelligence_recommendations")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    if (filters?.objective && filters.objective !== "ALL") {
      query = query.eq("objective", filters.objective);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      objective: row.objective,
      title: row.title,
      recommendation: row.recommendation,
      evidence: (row.evidence as unknown as IntelligenceEvidence[]) || [],
      confidence: Number(row.confidence),
      expectedImpact: (row.expected_impact as unknown as ExpectedImpact) || {
        primaryMetric: "SUPPLY_FLOW",
        estimatedChange: "Balanced offtake",
        timeframeDays: 7,
        qualitativeSummary: "General recommendation",
      },
      affectedActors: row.affected_actors || [],
      affectedCommodities: row.affected_commodities || [],
      affectedLocations: row.affected_locations || [],
      status: row.status,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reviewDecision: row.review_decision,
      reviewNotes: row.review_notes,
      executedAt: row.executed_at,
      executionNotes: row.execution_notes,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function getIntelligencePredictions(filters?: {
  status?: string;
  commodity?: string;
  limit?: number;
}): Promise<IntelligencePrediction[]> {
  try {
    if (filters?.commodity) {
      assertNoProhibitedProduce(filters.commodity, "Filter commodity");
    }
    const supabase = await createClient();
    let query = supabase
      .from("agricultural_intelligence_predictions")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    if (filters?.commodity && filters.commodity !== "ALL") {
      query = query.ilike("commodity", `%${filters.commodity}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      recommendationId: row.recommendation_id,
      commodity: row.commodity,
      state: row.state,
      lga: row.lga,
      metricName: row.metric_name,
      baselineValue: Number(row.baseline_value),
      predictedValue: Number(row.predicted_value),
      predictedRangeLow: row.predicted_range_low != null ? Number(row.predicted_range_low) : null,
      predictedRangeHigh: row.predicted_range_high != null ? Number(row.predicted_range_high) : null,
      confidence: Number(row.confidence),
      targetDate: row.target_date,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getIntelligenceEvaluations(
  limit = 50
): Promise<IntelligenceEvaluation[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_intelligence_evaluations")
      .select("*")
      .order("evaluated_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      predictionId: row.prediction_id,
      outcomeId: row.outcome_id,
      predictedValue: Number(row.predicted_value),
      actualValue: Number(row.actual_value),
      absoluteError: Number(row.absolute_error),
      percentageError: Number(row.percentage_error),
      directionAccurate: row.direction_accurate,
      withinPredictedRange: row.within_predicted_range,
      evaluationScore: Number(row.evaluation_score),
      evaluatedAt: row.evaluated_at,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}
