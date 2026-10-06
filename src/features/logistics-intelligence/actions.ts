"use server";

/**
 * AgroMarket Phase 2.9: Logistics Intelligence Server Actions
 * User/Admin triggered movement evaluations and human-in-the-loop recommendation review.
 *
 * SAFETY INVARIANTS:
 * 1. Internal analytical coordination indicator — NOT an official transport operator.
 * 2. Deterministic pipeline execution with AI advisory interpretation.
 * 3. Human review required for taking action on recommendations (PROPOSED -> REVIEWED -> ACCEPTED/ACTIONED).
 * 4. Zero pig/pork produce tolerance across all actions and inputs.
 * 5. Aggregated and privacy-preserving data handling.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { runLogisticsIntelligenceAgent } from "./agent";
import {
  RecommendationLifecycleStatus,
  RECOMMENDATION_LIFECYCLE_STATUSES,
} from "./types";

const runLogisticsSchema = z.object({
  state: z
    .string()
    .refine((s) => (NIGERIAN_STATES as readonly string[]).includes(s), {
      message: "Must be a recognized Nigerian state",
    }),
  corridor: z.string().max(150).optional().transform((val) => (val && val.trim() !== "" ? val.trim() : undefined)),
  commodity: z
    .string()
    .max(100)
    .optional()
    .transform((val) => (val && val.trim() !== "" ? val.trim() : undefined))
    .refine((val) => !val || !/pork|pig|swine|bacon|ham|lard/i.test(val), {
      message: "Pig/pork commodities are strictly prohibited across AgroMarket.",
    }),
  category: z.string().max(50).optional().transform((val) => (val && val.trim() !== "" ? val.trim() : undefined)),
  skipAIEvaluation: z.boolean().optional(),
});

export async function runLogisticsIntelligenceAction(formData: FormData) {
  try {
    const rawData = {
      state: formData.get("state"),
      corridor: formData.get("corridor") || undefined,
      commodity: formData.get("commodity") || undefined,
      category: formData.get("category") || undefined,
      skipAIEvaluation: formData.get("skipAIEvaluation") === "true",
    };

    const parsed = runLogisticsSchema.parse(rawData);
    if (parsed.commodity) {
      assertNoProhibitedProduce(parsed.commodity, "Commodity");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await runLogisticsIntelligenceAgent({
      state: parsed.state,
      corridor: parsed.corridor || null,
      commodity: parsed.commodity || null,
      category: parsed.category || null,
      userId: user?.id || null,
      skipAIEvaluation: parsed.skipAIEvaluation,
      supabaseClient: supabase,
    });

    revalidatePath("/logistics-intelligence");
    revalidatePath("/admin/intelligence");

    return {
      success: true,
      result,
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to execute logistics evaluation";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

const reviewRecommendationSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendation ID format"),
  decision: z.enum(RECOMMENDATION_LIFECYCLE_STATUSES),
  reviewNotes: z.string().max(1000).optional(),
});

export async function reviewLogisticsRecommendationAction(params: {
  recommendationId: string;
  decision: RecommendationLifecycleStatus;
  reviewNotes?: string;
}) {
  try {
    const parsed = reviewRecommendationSchema.parse(params);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const now = new Date().toISOString();
    const updatePayload: {
      status: RecommendationLifecycleStatus;
      reviewed_by?: string | null;
      reviewed_at?: string;
      review_notes?: string;
      actioned_by?: string | null;
      actioned_at?: string;
      updated_at: string;
    } = {
      status: parsed.decision,
      reviewed_by: user?.id || null,
      reviewed_at: now,
      review_notes: parsed.reviewNotes,
      updated_at: now,
    };

    if (parsed.decision === "ACTIONED" || parsed.decision === "COMPLETED") {
      updatePayload.actioned_by = user?.id || null;
      updatePayload.actioned_at = now;
    }

    const { error } = await supabase
      .from("logistics_recommendations")
      .update(updatePayload)
      .eq("id", parsed.recommendationId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/logistics-intelligence");
    revalidatePath("/admin/intelligence");

    return { success: true };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to review logistics recommendation";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
