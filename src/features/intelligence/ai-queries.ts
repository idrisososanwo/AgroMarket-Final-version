/**
 * AgroMarket Phase 2.2: AI & Agent Reasoning Foundation
 * Safe Read Queries for AI Reasoning Runs, Outputs, and Audits
 */

import { createClient } from "@/lib/supabase/server";
import {
  AIReasoningRun,
  AIReasoningOutput,
  AIReasoningAudit,
  ReasoningRunStatus,
} from "./reasoning-contracts";
import { assertNoProhibitedProduce } from "./validation";
import { ExpectedImpact } from "./types";

export interface GetReasoningRunsFilters {
  status?: ReasoningRunStatus;
  commodity?: string;
  state?: string;
  limit?: number;
}

export interface FullReasoningRunDetails {
  run: AIReasoningRun;
  output?: AIReasoningOutput;
  audits: AIReasoningAudit[];
}

export async function getAIReasoningRuns(
  filters?: GetReasoningRunsFilters
): Promise<AIReasoningRun[]> {
  try {
    if (filters?.commodity) {
      assertNoProhibitedProduce(filters.commodity, "Filter commodity");
    }

    const supabase = await createClient();
    let query = supabase
      .from("ai_reasoning_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(filters?.limit ?? 50);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.commodity) {
      query = query.eq("commodity", filters.commodity);
    }
    if (filters?.state) {
      query = query.eq("state", filters.state);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      objective: row.objective,
      commodity: row.commodity,
      state: row.state,
      lga: row.lga,
      corridor: row.corridor,
      provider: row.provider,
      model: row.model,
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
      latencyMs: row.latency_ms,
      status: row.status,
      errorMessage: row.error_message,
      requestedBy: row.requested_by,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getAIReasoningRunDetails(
  runId: string
): Promise<FullReasoningRunDetails | null> {
  try {
    const supabase = await createClient();

    const [runRes, outputRes, auditsRes] = await Promise.all([
      supabase.from("ai_reasoning_runs").select("*").eq("id", runId).single(),
      supabase.from("ai_reasoning_outputs").select("*").eq("run_id", runId).maybeSingle(),
      supabase
        .from("ai_reasoning_audits")
        .select("*")
        .eq("run_id", runId)
        .order("created_at", { ascending: true }),
    ]);

    if (runRes.error || !runRes.data) return null;

    const runRow = runRes.data;
    const run: AIReasoningRun = {
      id: runRow.id,
      agentId: runRow.agent_id,
      objective: runRow.objective,
      commodity: runRow.commodity,
      state: runRow.state,
      lga: runRow.lga,
      corridor: runRow.corridor,
      provider: runRow.provider,
      model: runRow.model,
      promptTokens: runRow.prompt_tokens,
      completionTokens: runRow.completion_tokens,
      latencyMs: runRow.latency_ms,
      status: runRow.status,
      errorMessage: runRow.error_message,
      requestedBy: runRow.requested_by,
      createdAt: runRow.created_at,
    };

    let output: AIReasoningOutput | undefined;
    if (outputRes.data) {
      const outRow = outputRes.data;
      output = {
        id: outRow.id,
        runId: outRow.run_id,
        summary: outRow.summary,
        interpretation: outRow.interpretation,
        keyFindings: (outRow.key_findings as string[]) || [],
        supportingEvidence: (outRow.supporting_evidence as unknown as Array<{
          sourceType: string;
          sourceId: string;
          description: string;
          relevance: number;
        }>) || [],
        uncertainty: outRow.uncertainty,
        modelConfidence: Number(outRow.model_confidence),
        evidenceConfidence: Number(outRow.evidence_confidence),
        recommendationTitle: outRow.recommendation_title,
        recommendationText: outRow.recommendation_text,
        expectedImpact: outRow.expected_impact as unknown as ExpectedImpact,
        affectedActors: outRow.affected_actors || [],
        affectedCommodities: outRow.affected_commodities || [],
        affectedLocations: outRow.affected_locations || [],
        limitations: outRow.limitations || [],
        safetyNotes: outRow.safety_notes || [],
        generatedRecommendationId: outRow.generated_recommendation_id,
        createdAt: outRow.created_at,
      };
    }

    const audits: AIReasoningAudit[] = (auditsRes.data || []).map((a) => ({
      id: a.id,
      runId: a.run_id,
      eventType: a.event_type,
      actorId: a.actor_id,
      details: (a.details as Record<string, unknown>) || {},
      createdAt: a.created_at,
    }));

    return { run, output, audits };
  } catch {
    return null;
  }
}
