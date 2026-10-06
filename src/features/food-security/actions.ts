"use server";

/**
 * AgroMarket Phase 2.8: Food Security & Agricultural Resilience Server Actions
 * User/Admin triggered early-warning pipeline runs and human-in-the-loop alert reviews.
 *
 * SAFETY INVARIANTS:
 * 1. Internal analytical indicator — NOT an official government early-warning classification.
 * 2. Deterministic pipeline execution with AI advisory interpretation.
 * 3. Human review required for public alert publication (DRAFT -> REVIEW -> PUBLISHED).
 * 4. Zero pig/pork produce tolerance across all actions and inputs.
 * 5. Aggregated and privacy-preserving data handling.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { runFoodSecurityResilienceAgent } from "./agent";
import { AlertLifecycleStatus, ALERT_LIFECYCLE_STATUSES } from "./types";

const runFoodSecuritySchema = z.object({
  state: z
    .string()
    .refine((s) => (NIGERIAN_STATES as readonly string[]).includes(s), {
      message: "Must be a recognized Nigerian state",
    }),
  commodity: z
    .string()
    .max(100)
    .optional()
    .transform((val) => (val && val.trim() !== "" ? val.trim() : undefined))
    .refine((val) => !val || !/pork|pig|swine|bacon|ham|lard/i.test(val), {
      message: "Pig/pork commodities are strictly prohibited across AgroMarket.",
    }),
  lga: z.string().max(100).optional().transform((val) => (val && val.trim() !== "" ? val.trim() : undefined)),
  skipAIEvaluation: z.boolean().optional(),
});

export async function runFoodSecurityAction(formData: FormData) {
  try {
    const rawData = {
      state: formData.get("state"),
      commodity: formData.get("commodity") || undefined,
      lga: formData.get("lga") || undefined,
      skipAIEvaluation: formData.get("skipAIEvaluation") === "true",
    };

    const parsed = runFoodSecuritySchema.parse(rawData);
    if (parsed.commodity) {
      assertNoProhibitedProduce(parsed.commodity, "Commodity");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await runFoodSecurityResilienceAgent({
      state: parsed.state,
      commodity: parsed.commodity || null,
      lga: parsed.lga || null,
      userId: user?.id || null,
      skipAIEvaluation: parsed.skipAIEvaluation,
      supabaseClient: supabase,
    });

    revalidatePath("/food-security");
    revalidatePath("/admin/intelligence");

    return {
      success: true,
      result,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to execute food security analysis";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

const reviewAlertSchema = z.object({
  alertId: z.string().uuid("Invalid alert ID format"),
  decision: z.enum(ALERT_LIFECYCLE_STATUSES),
  reviewNotes: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
});

export async function reviewFoodSecurityAlertAction(params: {
  alertId: string;
  decision: AlertLifecycleStatus;
  reviewNotes?: string;
  isPublic?: boolean;
}) {
  try {
    const parsed = reviewAlertSchema.parse(params);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const now = new Date().toISOString();
    const updatePayload: {
      status: AlertLifecycleStatus;
      reviewed_by?: string | null;
      reviewed_at?: string;
      review_notes?: string;
      published_at?: string;
      resolved_at?: string;
      is_public?: boolean;
      updated_at: string;
    } = {
      status: parsed.decision,
      reviewed_by: user?.id || null,
      reviewed_at: now,
      review_notes: parsed.reviewNotes,
      updated_at: now,
    };

    if (parsed.decision === "PUBLISHED") {
      updatePayload.published_at = now;
      updatePayload.is_public = parsed.isPublic ?? true;
    } else if (parsed.decision === "RESOLVED") {
      updatePayload.resolved_at = now;
    } else if (parsed.decision === "ARCHIVED") {
      updatePayload.is_public = false;
    }

    const { error } = await supabase
      .from("food_security_alerts")
      .update(updatePayload)
      .eq("id", parsed.alertId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/food-security");
    revalidatePath("/admin/intelligence");

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to review food security alert";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
