"use server";

/**
 * AgroMarket Phase 3.4: Server Actions for Intelligence Feedback Loop
 * Server-authoritative mutations with strict authentication and role governance.
 */

import { createClient } from "@/lib/supabase/server";
import {
  recordFeedbackOutcome,
  recordOutcomeEvidence,
  recordFeedbackEvaluation,
  recordLearningSignal,
  recordDataQualityIssue,
  RecordFeedbackOutcomeParams,
  RecordOutcomeEvidenceParams,
  RecordFeedbackEvaluationParams,
  RecordDataQualityIssueParams,
} from "./data-layer";
import { generateLearningSignalsFromEvaluation } from "./learning-signals";
import {
  FeedbackOutcomeRecord,
  OutcomeEvidenceItem,
  FeedbackEvaluationItem,
  DataQualityIssueItem,
} from "./types";
import { assertNoProhibitedProduce, assertNoPrivateInformation } from "./validation";
import { revalidatePath } from "next/cache";

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server action to record an observed agricultural outcome linked to a recommendation
 */
export async function recordOutcomeAction(
  params: Omit<RecordFeedbackOutcomeParams, "recordedBy">
): Promise<ActionResult<FeedbackOutcomeRecord>> {
  try {
    assertNoProhibitedProduce(params, "Outcome Server Action");
    assertNoPrivateInformation(params, "Outcome Server Action");

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to record outcomes." };
    }

    const record = await recordFeedbackOutcome({
      ...params,
      recordedBy: user.id,
    });

    revalidatePath("/intelligence");
    revalidatePath("/my-intelligence");

    return { success: true, data: record };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record outcome.";
    return { success: false, error: message };
  }
}

/**
 * Server action to record structured evidence with verified provenance for an outcome
 */
export async function recordOutcomeEvidenceAction(
  params: Omit<RecordOutcomeEvidenceParams, "createdBy">
): Promise<ActionResult<OutcomeEvidenceItem>> {
  try {
    assertNoProhibitedProduce(params, "Outcome Evidence Server Action");
    assertNoPrivateInformation(params, "Outcome Evidence Server Action");

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to record outcome evidence." };
    }

    const item = await recordOutcomeEvidence({
      ...params,
      createdBy: user.id,
    });

    return { success: true, data: item };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record outcome evidence.";
    return { success: false, error: message };
  }
}

/**
 * Server action to evaluate a recommendation vs. outcome and generate learning signals
 */
export async function recordFeedbackEvaluationAction(
  params: Omit<RecordFeedbackEvaluationParams, "evaluatedBy">
): Promise<ActionResult<FeedbackEvaluationItem>> {
  try {
    assertNoProhibitedProduce(params, "Feedback Evaluation Server Action");
    assertNoPrivateInformation(params, "Feedback Evaluation Server Action");

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to evaluate intelligence." };
    }

    const evaluation = await recordFeedbackEvaluation({
      ...params,
      evaluatedBy: user.id,
    });

    // Automatically generate and persist downstream learning signals
    try {
      const derivedSignals = generateLearningSignalsFromEvaluation({
        evaluation,
        agentId: params.agentId,
        domain: params.domain,
      });

      for (const signal of derivedSignals) {
        await recordLearningSignal({
          evaluationId: signal.evaluationId,
          agentId: signal.agentId,
          domain: signal.domain,
          signalType: signal.signalType,
          commodity: signal.commodity,
          state: signal.state,
          lga: signal.lga,
          sampleSize: signal.sampleSize,
          metricValue: signal.metricValue,
          confidence: signal.confidence,
          interpretation: signal.interpretation,
          metadata: signal.metadata,
        });
      }
    } catch (signalErr) {
      console.warn("Could not generate learning signals:", signalErr);
    }

    revalidatePath("/intelligence");
    revalidatePath("/admin/intelligence");

    return { success: true, data: evaluation };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record feedback evaluation.";
    return { success: false, error: message };
  }
}

/**
 * Server action to report an upstream data quality issue
 */
export async function reportDataQualityIssueAction(
  params: Omit<RecordDataQualityIssueParams, "reportedBy">
): Promise<ActionResult<DataQualityIssueItem>> {
  try {
    assertNoProhibitedProduce(params, "Data Quality Issue Server Action");

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to report data quality issue." };
    }

    const item = await recordDataQualityIssue({
      ...params,
      reportedBy: user.id,
    });

    revalidatePath("/admin/intelligence");

    return { success: true, data: item };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to report data quality issue.";
    return { success: false, error: message };
  }
}
