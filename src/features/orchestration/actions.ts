"use server";

/**
 * AgroMarket Phase 3.1: Agricultural Intelligence Orchestration Server Actions
 * Governed Human-in-the-Loop Operations & Evaluation Runner
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { runAgriculturalOrchestration } from "./agent";
import {
  CorrelationTimeWindow,
  OrchestrationRunResult,
  RecommendationLifecycleStatus,
} from "./types";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  result?: T;
}

/**
 * Runs an on-demand cross-domain orchestration evaluation.
 */
export async function runOrchestrationAction(
  formData: FormData
): Promise<ActionResponse<OrchestrationRunResult>> {
  try {
    const state = formData.get("state")?.toString() || "Kano";
    const lga = formData.get("lga")?.toString() || null;
    const commodity = formData.get("commodity")?.toString() || "Maize";
    const timeWindow = (formData.get("timeWindow")?.toString() ||
      "MEDIUM_TERM") as CorrelationTimeWindow;

    // Enforce Anti-Pork
    if (commodity) {
      assertNoProhibitedProduce(commodity, "Action Commodity");
    }

    const result = await runAgriculturalOrchestration({
      state,
      lga,
      commodity,
      timeWindow,
    });

    revalidatePath("/intelligence");
    revalidatePath("/admin/intelligence");

    return {
      success: true,
      message: `Cross-domain evaluation completed for ${commodity} in ${state}. Scenario: ${result.scenarioType}.`,
      result,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Orchestration evaluation failed";
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Reviews a cross-domain recommendation (Human-in-the-Loop Governance Gate).
 */
export async function reviewRecommendationAction(
  recommendationId: string,
  newStatus: RecommendationLifecycleStatus,
  notes?: string
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("agricultural_orchestration_recommendations")
      .update({
        status: newStatus,
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recommendationId);

    if (error) {
      throw new Error(`Failed to update recommendation: ${error.message}`);
    }

    revalidatePath("/intelligence");
    return {
      success: true,
      message: `Recommendation status updated to ${newStatus}.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to review recommendation";
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Resolves an active intelligence conflict.
 */
export async function resolveConflictAction(
  conflictId: string,
  resolutionStatus: "RESOLVED" | "DISMISSED",
  resolutionNotes: string
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("agricultural_intelligence_conflicts")
      .update({
        status: resolutionStatus,
        resolution_notes: resolutionNotes,
        resolved_by: user?.id || null,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conflictId);

    if (error) {
      throw new Error(`Failed to resolve conflict: ${error.message}`);
    }

    revalidatePath("/intelligence");
    return {
      success: true,
      message: `Conflict marked as ${resolutionStatus}.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed resolving conflict";
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Records an observed outcome and evaluation for a recommendation.
 */
export async function recordOutcomeAction(formData: FormData): Promise<ActionResponse> {
  try {
    const recommendationId = formData.get("recommendationId")?.toString();
    const decision = formData.get("decision")?.toString() || "IMPLEMENTED";
    const actionTaken = formData.get("actionTaken")?.toString();
    const observedOutcome = formData.get("observedOutcome")?.toString();
    const expectedOutcome = formData.get("expectedOutcome")?.toString();
    const variance = formData.get("variance")?.toString() || "Within 10% expected tolerance";
    const evaluationScore = Number(formData.get("evaluationScore")) || 85;
    const lessonsLearned = formData.get("lessonsLearned")?.toString() || "Documented for future model calibration.";

    if (!recommendationId || !actionTaken || !observedOutcome || !expectedOutcome) {
      throw new Error("Missing required outcome parameters.");
    }

    // Anti-Pork verification on outcome logs
    assertNoProhibitedProduce(actionTaken, "Action Taken Log");
    assertNoProhibitedProduce(observedOutcome, "Observed Outcome Log");
    assertNoProhibitedProduce(lessonsLearned, "Lessons Learned Log");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: insertedOutcome, error: outcomeError } = await supabase
      .from("agricultural_orchestration_outcomes")
      .insert({
        recommendation_id: recommendationId,
        decision,
        action_taken: actionTaken,
        observed_outcome: observedOutcome,
        expected_outcome: expectedOutcome,
        variance,
        evaluation_score: evaluationScore,
        lessons_learned: lessonsLearned,
        recorded_by: user?.id || null,
      })
      .select("id")
      .single();

    if (outcomeError) {
      throw new Error(`Failed recording outcome: ${outcomeError.message}`);
    }

    // Update recommendation to COMPLETED and link outcome_id
    if (insertedOutcome?.id) {
      await supabase
        .from("agricultural_orchestration_recommendations")
        .update({
          status: "COMPLETED",
          outcome_id: insertedOutcome.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recommendationId);
    }

    revalidatePath("/intelligence");
    return {
      success: true,
      message: "Orchestration outcome and evaluation successfully recorded.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record outcome";
    return {
      success: false,
      error: msg,
    };
  }
}
