"use server";

/**
 * AgroMarket Phase 3.2: Agricultural Decision & Action Intelligence Server Actions
 * Governed State Transitions, Decision Recording, Action Tracking, Preference Management, and Audit Trail
 *
 * SAFETY INVARIANTS:
 * 1. ADVISORY GUARANTEE: Never autonomously executes transactions.
 * 2. AUTHENTICATION & RLS: Explicit caller authentication; users can only mutate their own records.
 * 3. ZERO PORK TOLERANCE: Rejects prohibited produce terms in all submissions.
 * 4. CAREFUL EXTERNAL ACTION RECORDING: Accurately flags user-reported vs platform-verified actions.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  recordGovernedAction,
  recordUserDecision,
  upsertUserIntelligencePreferences,
  markNotificationAsRead,
} from "./data-layer";
import {
  ActionVerificationStatus,
  GovernedActionItem,
  RecommendationStatus,
  UserDecisionItem,
  UserIntelligencePreferences,
} from "./types";
import {
  assertNoProhibitedProduce,
  recordOutcomeEvaluationSchema,
  recordUserActionSchema,
  recordUserDecisionSchema,
  userIntelligencePreferencesSchema,
} from "./validation";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Record User Decision on a Recommendation
 */
export async function recordUserDecisionAction(
  formData: unknown
): Promise<ActionResult<UserDecisionItem>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to record decision." };
    }

    const validated = recordUserDecisionSchema.parse(formData);

    if (validated.decisionNotes) {
      assertNoProhibitedProduce(validated.decisionNotes, "Decision Notes");
    }
    if (validated.reasoning) {
      assertNoProhibitedProduce(validated.reasoning, "Reasoning");
    }

    const decisionRecord = await recordUserDecision(supabase, {
      recommendationId: validated.recommendationId,
      userId: user.id,
      decision: validated.decision,
      actorRole: validated.actorRole,
      decisionNotes: validated.decisionNotes || null,
      reasoning: validated.reasoning || null,
      metadata: validated.metadata || {},
      decidedAt: new Date().toISOString(),
    });

    // Update recommendation lifecycle status if appropriate
    try {
      const nextStatus: RecommendationStatus =
        validated.decision === "ACCEPT"
          ? "ACCEPTED"
          : validated.decision === "REJECT" || validated.decision === "DISMISS"
          ? "REJECTED"
          : "REVIEWED";

      await supabase
        .from("agricultural_orchestration_recommendations")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.recommendationId);
    } catch (statusErr) {
      console.warn("Could not advance recommendation status on decision:", statusErr);
    }

    revalidatePath("/my-intelligence");
    revalidatePath("/intelligence");

    return { success: true, data: decisionRecord };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record decision.";
    console.error("Error in recordUserDecisionAction:", err);
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Record Governed User Action Execution
 */
export async function recordUserActionExecutionAction(
  formData: unknown
): Promise<ActionResult<GovernedActionItem>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to record action." };
    }

    const validated = recordUserActionSchema.parse(formData);

    if (validated.notes) {
      assertNoProhibitedProduce(validated.notes, "Action Notes");
    }

    const isExternal =
      validated.isExternal || validated.actionType === "USER_REPORTED_EXTERNAL_ACTION";
    const verificationStatus: ActionVerificationStatus = isExternal ? "USER_REPORTED" : "VERIFIED_PLATFORM";

    const actionRecord = await recordGovernedAction(supabase, {
      decisionId: validated.decisionId || null,
      recommendationId: validated.recommendationId,
      userId: user.id,
      actionType: validated.actionType,
      actionPath: validated.actionPath || null,
      isExternal,
      verificationStatus,
      actionDetails: validated.actionDetails || {},
      notes: validated.notes || null,
      executedAt: new Date().toISOString(),
    });

    // Advance recommendation lifecycle to ACTIONED
    try {
      await supabase
        .from("agricultural_orchestration_recommendations")
        .update({
          status: "ACTIONED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.recommendationId);
    } catch (statusErr) {
      console.warn("Could not advance recommendation status on action:", statusErr);
    }

    revalidatePath("/my-intelligence");
    revalidatePath("/intelligence");

    return { success: true, data: actionRecord };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record action execution.";
    console.error("Error in recordUserActionExecutionAction:", err);
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Save User Intelligence Preferences
 */
export async function saveUserPreferencesAction(
  formData: unknown
): Promise<ActionResult<UserIntelligencePreferences>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to update preferences." };
    }

    const validated = userIntelligencePreferencesSchema.parse(formData);

    for (const c of validated.monitoredCommodities) {
      assertNoProhibitedProduce(c, "Monitored Commodity");
    }

    const updated = await upsertUserIntelligencePreferences(supabase, {
      userId: user.id,
      primaryRole: validated.primaryRole,
      preferredStates: validated.preferredStates,
      preferredLgas: validated.preferredLgas,
      monitoredCommodities: validated.monitoredCommodities,
      urgencyThreshold: validated.urgencyThreshold,
      minConfidence: validated.minConfidence,
      notificationChannels: validated.notificationChannels,
      digestFrequency: validated.digestFrequency,
      mutedRecommendationTypes: validated.mutedRecommendationTypes,
      metadata: validated.metadata || {},
    });

    revalidatePath("/my-intelligence");

    return { success: true, data: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save preferences.";
    console.error("Error in saveUserPreferencesAction:", err);
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Mark Governed Notification as Read
 */
export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required." };
    }

    const ok = await markNotificationAsRead(supabase, notificationId, user.id);
    revalidatePath("/my-intelligence");

    return { success: ok, data: ok };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to mark notification read.";
    console.error("Error in markNotificationReadAction:", err);
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Record Outcome Evaluation
 */
export async function recordOutcomeEvaluationAction(
  formData: unknown
): Promise<ActionResult<boolean>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to evaluate outcome." };
    }

    const validated = recordOutcomeEvaluationSchema.parse(formData);

    assertNoProhibitedProduce(validated.actionTaken, "Action Taken");
    assertNoProhibitedProduce(validated.observedOutcome, "Observed Outcome");
    assertNoProhibitedProduce(validated.expectedOutcome, "Expected Outcome");
    assertNoProhibitedProduce(validated.lessonsLearned, "Lessons Learned");

    const payload = {
      recommendation_id: validated.recommendationId,
      decision: validated.decision,
      action_taken: validated.actionTaken,
      action_time: new Date().toISOString(),
      observed_outcome: validated.observedOutcome,
      expected_outcome: validated.expectedOutcome,
      variance: validated.variance,
      evaluation_score: validated.evaluationScore,
      lessons_learned: validated.lessonsLearned,
      recorded_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("agricultural_orchestration_outcomes")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save outcome: ${error.message}`);
    }

    // Mark recommendation as COMPLETED with outcome_id
    if (data?.id) {
      await supabase
        .from("agricultural_orchestration_recommendations")
        .update({
          status: "COMPLETED",
          outcome_id: data.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.recommendationId);
    }

    revalidatePath("/my-intelligence");
    revalidatePath("/intelligence");

    return { success: true, data: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record outcome evaluation.";
    console.error("Error in recordOutcomeEvaluationAction:", err);
    return { success: false, error: msg };
  }
}
