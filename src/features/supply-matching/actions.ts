"use server";

/**
 * AgroMarket Phase 2.6: Supply Matching Server Actions
 *
 * Exposes server actions for:
 * 1. Running deterministic supply matching for a commodity / state
 * 2. Updating human-in-the-loop recommendation lifecycle status
 *
 * STRICT SAFETY:
 * - Anti-pork enforcement at input.
 * - Human action remains authoritative; no autonomous contracts or payments.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { createClient } from "@/lib/supabase/server";
import { runSupplyMatchingAgent } from "./agent";
import {
  SupplyMatchingRunResult,
  RECOMMENDATION_LIFECYCLE_STATUSES,
} from "./types";

const runSupplyMatchingSchema = z.object({
  commodity: z.string().min(2, "Commodity name is required"),
  state: z.string().min(2, "State is required"),
  demandId: z.string().optional(),
  targetQuantity: z.number().positive().optional(),
  unit: z.string().optional(),
  desiredDeliveryDate: z.string().optional(),
  skipAIEvaluation: z.boolean().optional(),
});

/**
 * Triggers a Supply Matching evaluation run
 */
export async function runSupplyMatchingAction(
  rawInput: z.infer<typeof runSupplyMatchingSchema>
): Promise<SupplyMatchingRunResult> {
  const parsed = runSupplyMatchingSchema.parse(rawInput);
  assertNoProhibitedProduce(parsed.commodity, "Commodity");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await runSupplyMatchingAgent({
    commodity: parsed.commodity,
    state: parsed.state,
    demandId: parsed.demandId,
    targetQuantity: parsed.targetQuantity,
    unit: parsed.unit,
    desiredDeliveryDate: parsed.desiredDeliveryDate,
    userId: user?.id || null,
    skipAIEvaluation: parsed.skipAIEvaluation,
    supabaseClient: supabase,
  });

  revalidatePath("/supply-intelligence");
  revalidatePath("/admin/intelligence");

  return result;
}

const updateRecommendationStatusSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendation ID"),
  status: z.enum(RECOMMENDATION_LIFECYCLE_STATUSES),
  notes: z.string().max(1000).optional(),
});

/**
 * Updates a coordination recommendation's status in the human-in-the-loop state machine
 */
export async function updateCoordinationRecommendationAction(
  rawInput: z.infer<typeof updateRecommendationStatusSchema>
): Promise<{ success: boolean; message: string }> {
  const parsed = updateRecommendationStatusSchema.parse(rawInput);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const updatePayload: Record<string, unknown> = {
    status: parsed.status,
    notes: parsed.notes || null,
    updated_at: new Date().toISOString(),
  };

  if (parsed.status === "ACTIONED" || parsed.status === "COMPLETED" || parsed.status === "ACCEPTED") {
    updatePayload.actioned_by = user?.id || null;
    updatePayload.actioned_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("supply_coordination_recommendations")
    .update(updatePayload)
    .eq("id", parsed.recommendationId);

  if (error) {
    return {
      success: false,
      message: `Failed to update recommendation: ${error.message}`,
    };
  }

  revalidatePath("/supply-intelligence");
  revalidatePath("/admin/intelligence");

  return {
    success: true,
    message: `Recommendation status transitioned to ${parsed.status}.`,
  };
}
