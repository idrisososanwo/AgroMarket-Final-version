/**
 * AgroMarket Phase 2.2: AI & Agent Reasoning Foundation
 * Agent Orchestrator: End-to-End Execution Pipeline
 *
 * Coordinates: Pre-checks -> Evidence Packaging -> Gateway Dispatch ->
 * Post-checks -> Advisory Recommendation Proposal -> Memory & Audit Persistence.
 *
 * Enforces:
 * 1. AI Output is strictly advisory.
 * 2. Recommendations enter status PROPOSED for human review (no self-approval/execution).
 * 3. Strict anti-pork, non-diagnostic, and no-autonomous-action constraints.
 * 4. Separate model_confidence and evidence_confidence metrics.
 */

import { createClient } from "@/lib/supabase/server";
import { Json } from "@/types/database";
import {
  ReasoningObjective,
  GeographicScope,
  HistoricalContextItem,
  StructuredReasoningOutput,
  ReasoningRunStatus,
} from "./reasoning-contracts";
import {
  IntelligenceSignal,
  IntelligenceObservation,
  IntelligenceEvidence,
} from "./types";
import { packageEvidence } from "./evidence-package";
import { validatePreReasoningSafety, validatePostReasoningSafety } from "./ai-safety";
import { AIProvider, getAIProvider } from "./ai-provider";
import { AIGateway, GatewayResponse } from "./ai-gateway";

export interface RunReasoningParams {
  agentId?: string;
  objective: ReasoningObjective;
  commodity: string;
  location: GeographicScope;
  signals?: IntelligenceSignal[];
  observations?: IntelligenceObservation[];
  evidenceItems?: IntelligenceEvidence[];
  historicalContext?: HistoricalContextItem[];
  constraints?: string[];
  userId?: string | null;
  provider?: AIProvider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any;
}

export interface OrchestrationResult {
  success: boolean;
  runId?: string;
  status: ReasoningRunStatus;
  output?: StructuredReasoningOutput;
  recommendationId?: string;
  error?: string;
  violations?: string[];
  evidenceConfidence: number;
  modelConfidence?: number;
  provider: string;
  model: string;
  latencyMs: number;
}

/**
 * Runs the controlled, audited AI reasoning pipeline
 */
export async function runAgentReasoning(
  params: RunReasoningParams
): Promise<OrchestrationResult> {
  const agentId = params.agentId || "AGRICULTURAL_INTELLIGENCE";
  const provider = params.provider || getAIProvider();
  const startTime = Date.now();

  // Helper to obtain supabase client if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = params.supabaseClient;
  if (!supabase) {
    try {
      supabase = await createClient();
    } catch {
      // Running in unit test or offline mode without supabase context
      supabase = null;
    }
  }

  // 1. Evidence Packaging & Privacy Filter
  const evidencePackage = packageEvidence({
    commodity: params.commodity,
    geographicScope: params.location,
    signals: params.signals,
    observations: params.observations,
    evidenceItems: params.evidenceItems,
    historicalContext: params.historicalContext,
  });

  const reasoningRequest = {
    agentId,
    objective: params.objective,
    commodity: params.commodity,
    location: params.location,
    evidencePackage,
    constraints: params.constraints,
    requestedAt: new Date().toISOString(),
  };

  // 2. Deterministic Pre-Check
  const preCheck = validatePreReasoningSafety(reasoningRequest);
  if (!preCheck.passed) {
    let runId: string | undefined;

    if (supabase) {
      try {
        const { data: runData } = await supabase
          .from("ai_reasoning_runs")
          .insert({
            agent_id: agentId,
            objective: params.objective,
            commodity: params.commodity,
            state: params.location.state,
            lga: params.location.lga || null,
            corridor: params.location.corridor || null,
            provider: provider.id,
            model: provider.model,
            prompt_tokens: 0,
            completion_tokens: 0,
            latency_ms: Date.now() - startTime,
            status: "REJECTED_SAFETY",
            error_message: preCheck.violations.join("; "),
            requested_by: params.userId || null,
          })
          .select("id")
          .single();

        runId = runData?.id;

        if (runId) {
          await supabase.from("ai_reasoning_audits").insert({
            run_id: runId,
            event_type: "PRE_CHECK_FAILED",
            actor_id: params.userId || null,
            details: { violations: preCheck.violations } as Json,
          });
        }
      } catch {
        // Continue and return failure result cleanly
      }
    }

    return {
      success: false,
      runId,
      status: "REJECTED_SAFETY",
      error: `Pre-check safety failure: ${preCheck.violations.join("; ")}`,
      violations: preCheck.violations,
      evidenceConfidence: evidencePackage.evidenceConfidence,
      provider: provider.id,
      model: provider.model,
      latencyMs: Date.now() - startTime,
    };
  }

  // 3. Create Pending Run Record in Supabase (if client available)
  let runId: string | undefined;
  if (supabase) {
    try {
      const { data: runData } = await supabase
        .from("ai_reasoning_runs")
        .insert({
          agent_id: agentId,
          objective: params.objective,
          commodity: params.commodity,
          state: params.location.state,
          lga: params.location.lga || null,
          corridor: params.location.corridor || null,
          provider: provider.id,
          model: provider.model,
          status: "PENDING",
          requested_by: params.userId || null,
        })
        .select("id")
        .single();

      runId = runData?.id;

      if (runId) {
        await supabase.from("ai_reasoning_audits").insert({
          run_id: runId,
          event_type: "REQUEST_INITIATED",
          actor_id: params.userId || null,
          details: {
            objective: params.objective,
            commodity: params.commodity,
            evidenceConfidence: evidencePackage.evidenceConfidence,
          } as Json,
        });
      }
    } catch {
      // Continue even if database insert fails
    }
  }

  // 4. Dispatch via AI Gateway
  const gateway = new AIGateway(provider);
  const gatewayResponse: GatewayResponse = await gateway.executeReasoning(reasoningRequest);

  if (!gatewayResponse.success || !gatewayResponse.output) {
    const errorStatus: ReasoningRunStatus =
      gatewayResponse.errorCode === "PROVIDER_UNAVAILABLE"
        ? "PROVIDER_UNAVAILABLE"
        : gatewayResponse.errorCode === "SCHEMA_MISMATCH"
        ? "REJECTED_VALIDATION"
        : "FAILED";

    if (supabase && runId) {
      try {
        await supabase
          .from("ai_reasoning_runs")
          .update({
            status: errorStatus,
            error_message: gatewayResponse.errorMessage || "Gateway dispatch failed",
            latency_ms: gatewayResponse.latencyMs,
            prompt_tokens: gatewayResponse.promptTokens,
            completion_tokens: gatewayResponse.completionTokens,
          })
          .eq("id", runId);

        await supabase.from("ai_reasoning_audits").insert({
          run_id: runId,
          event_type: "FAILURE_CAPTURED",
          actor_id: params.userId || null,
          details: {
            errorCode: gatewayResponse.errorCode,
            errorMessage: gatewayResponse.errorMessage,
          } as Json,
        });
      } catch {
        // Ignore persistence error
      }
    }

    return {
      success: false,
      runId,
      status: errorStatus,
      error: gatewayResponse.errorMessage || "AI reasoning failed to produce valid output.",
      evidenceConfidence: evidencePackage.evidenceConfidence,
      provider: provider.id,
      model: provider.model,
      latencyMs: gatewayResponse.latencyMs,
    };
  }

  // 5. Deterministic Post-Check on Output
  const postCheck = validatePostReasoningSafety(gatewayResponse.output);
  if (!postCheck.passed) {
    if (supabase && runId) {
      try {
        await supabase
          .from("ai_reasoning_runs")
          .update({
            status: "REJECTED_SAFETY",
            error_message: postCheck.violations.join("; "),
            latency_ms: gatewayResponse.latencyMs,
            prompt_tokens: gatewayResponse.promptTokens,
            completion_tokens: gatewayResponse.completionTokens,
          })
          .eq("id", runId);

        await supabase.from("ai_reasoning_audits").insert({
          run_id: runId,
          event_type: "POST_CHECK_FAILED",
          actor_id: params.userId || null,
          details: { violations: postCheck.violations } as Json,
        });
      } catch {
        // Ignore persistence error
      }
    }

    return {
      success: false,
      runId,
      status: "REJECTED_SAFETY",
      error: `Post-check safety rejection: ${postCheck.violations.join("; ")}`,
      violations: postCheck.violations,
      evidenceConfidence: evidencePackage.evidenceConfidence,
      modelConfidence: gatewayResponse.output.modelConfidence,
      provider: provider.id,
      model: provider.model,
      latencyMs: gatewayResponse.latencyMs,
    };
  }

  // 6. Generate Advisory Recommendation (Status: PROPOSED for Human Review)
  let recommendationId: string | undefined;
  if (supabase) {
    try {
      const rec = gatewayResponse.output.recommendation;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: recData } = await supabase
        .from("agricultural_intelligence_recommendations")
        .insert({
          agent_id: agentId,
          objective: "RISK_MITIGATION", // mapped advisory objective
          title: rec.title,
          recommendation: rec.recommendation,
          evidence: gatewayResponse.output.supportingEvidence as unknown as Json,
          confidence: evidencePackage.evidenceConfidence,
          expected_impact: rec.expectedImpact as unknown as Json,
          affected_actors: rec.affectedActors,
          affected_commodities: rec.affectedCommodities,
          affected_locations: rec.affectedLocations,
          status: "PROPOSED", // Strictly non-autonomous; requires human review
          expires_at: expiresAt,
        })
        .select("id")
        .single();

      recommendationId = recData?.id;
    } catch {
      // Ignore recommendation insert failure if offline
    }
  }

  // 7. Persist AI Reasoning Output & Audits
  if (supabase && runId) {
    try {
      await supabase.from("ai_reasoning_outputs").insert({
        run_id: runId,
        summary: gatewayResponse.output.summary,
        interpretation: gatewayResponse.output.interpretation,
        key_findings: gatewayResponse.output.keyFindings as unknown as Json,
        supporting_evidence: gatewayResponse.output.supportingEvidence as unknown as Json,
        uncertainty: gatewayResponse.output.uncertainty,
        model_confidence: gatewayResponse.output.modelConfidence,
        evidence_confidence: evidencePackage.evidenceConfidence,
        recommendation_title: gatewayResponse.output.recommendation.title,
        recommendation_text: gatewayResponse.output.recommendation.recommendation,
        expected_impact: gatewayResponse.output.recommendation.expectedImpact as unknown as Json,
        affected_actors: gatewayResponse.output.recommendation.affectedActors,
        affected_commodities: gatewayResponse.output.recommendation.affectedCommodities,
        affected_locations: gatewayResponse.output.recommendation.affectedLocations,
        limitations: gatewayResponse.output.limitations,
        safety_notes: gatewayResponse.output.safetyNotes,
        generated_recommendation_id: recommendationId || null,
      });

      await supabase
        .from("ai_reasoning_runs")
        .update({
          status: "COMPLETED",
          latency_ms: gatewayResponse.latencyMs,
          prompt_tokens: gatewayResponse.promptTokens,
          completion_tokens: gatewayResponse.completionTokens,
        })
        .eq("id", runId);

      await supabase.from("ai_reasoning_audits").insert({
        run_id: runId,
        event_type: "RECOMMENDATION_PROPOSED",
        actor_id: params.userId || null,
        details: {
          recommendationId,
          modelConfidence: gatewayResponse.output.modelConfidence,
          evidenceConfidence: evidencePackage.evidenceConfidence,
        } as Json,
      });
    } catch {
      // Ignore database logging error
    }
  }

  return {
    success: true,
    runId,
    status: "COMPLETED",
    output: gatewayResponse.output,
    recommendationId,
    evidenceConfidence: evidencePackage.evidenceConfidence,
    modelConfidence: gatewayResponse.output.modelConfidence,
    provider: provider.id,
    model: provider.model,
    latencyMs: gatewayResponse.latencyMs,
  };
}
