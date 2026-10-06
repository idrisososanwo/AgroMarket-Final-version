"use server";

/**
 * AgroMarket Phase 2.7: Procurement Intelligence Server Actions
 * User-triggered pipeline runs and human-in-the-loop recommendation state transitions.
 *
 * SAFETY INVARIANT:
 * Strictly advisory. Taking action transitions the recommendation record status;
 * it DOES NOT execute autonomous payment or purchasing.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { runProcurementIntelligenceAgent } from "./agent";
import { RecommendationLifecycleStatus } from "./types";

const runProcurementSchema = z.object({
  commodity: z
    .string()
    .min(2, "Commodity name is required")
    .max(100)
    .refine((val) => !/pork|pig|swine|bacon|ham|lard/i.test(val), {
      message: "Pig/pork commodities are strictly prohibited across AgroMarket.",
    }),
  state: z
    .string()
    .refine((s) => (NIGERIAN_STATES as readonly string[]).includes(s), {
      message: "Must be a recognized Nigerian state",
    }),
  demandId: z.string().optional(),
  targetQuantity: z.coerce.number().positive().optional(),
  unit: z.string().max(30).optional(),
  desiredDeliveryDate: z.string().optional(),
});

export async function runProcurementIntelligenceAction(formData: FormData) {
  try {
    const rawData = {
      commodity: formData.get("commodity"),
      state: formData.get("state"),
      demandId: formData.get("demandId") || undefined,
      targetQuantity: formData.get("targetQuantity") || undefined,
      unit: formData.get("unit") || undefined,
      desiredDeliveryDate: formData.get("desiredDeliveryDate") || undefined,
    };

    const parsed = runProcurementSchema.parse(rawData);
    assertNoProhibitedProduce(parsed.commodity, "Commodity");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await runProcurementIntelligenceAgent({
      commodity: parsed.commodity,
      state: parsed.state,
      demandId: parsed.demandId,
      targetQuantity: parsed.targetQuantity,
      unit: parsed.unit,
      desiredDeliveryDate: parsed.desiredDeliveryDate,
      userId: user?.id || null,
      supabaseClient: supabase,
    });

    revalidatePath("/procurement-intelligence");
    revalidatePath("/admin/intelligence");

    return {
      success: true,
      result,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to execute procurement pipeline";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

const reviewRecommendationSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendation ID"),
  decision: z.enum(["ACCEPTED", "REJECTED", "ACTIONED", "COMPLETED"]),
  notes: z.string().max(1000).optional(),
});

export async function reviewProcurementRecommendationAction(params: {
  recommendationId: string;
  decision: RecommendationLifecycleStatus;
  notes?: string;
}) {
  try {
    const parsed = reviewRecommendationSchema.parse(params);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updatePayload: {
      status: string;
      notes?: string;
      actioned_by?: string;
      actioned_at?: string;
    } = {
      status: parsed.decision,
      notes: parsed.notes,
    };

    if (parsed.decision === "ACTIONED" || parsed.decision === "COMPLETED") {
      updatePayload.actioned_by = user?.id;
      updatePayload.actioned_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("procurement_recommendations")
      .update(updatePayload)
      .eq("id", parsed.recommendationId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/procurement-intelligence");
    revalidatePath("/admin/intelligence");

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to review recommendation";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
