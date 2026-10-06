"use server";

/**
 * AgroMarket Phase 3.0: Agricultural Disease & Biosecurity Intelligence Agent
 * Server Actions
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  assertNoProhibitedProduce,
  validateNigerianState,
} from "@/features/intelligence/validation";
import { runAgriculturalDiseaseAgent } from "./agent";
import { AlertLifecycleStatus, DiseaseRunResult } from "./types";

export interface RunDiseaseActionResponse {
  success: boolean;
  result?: DiseaseRunResult;
  error?: string;
}

export async function runDiseaseIntelligenceAction(
  formData: FormData
): Promise<RunDiseaseActionResponse> {
  try {
    const rawState = formData.get("state")?.toString() || "Kano";
    const state = validateNigerianState(rawState);

    const lga = formData.get("lga")?.toString() || null;
    const commodity = formData.get("commodity")?.toString() || null;
    const category = formData.get("category")?.toString() || null;
    const domain = (formData.get("domain")?.toString() as
      | "LIVESTOCK"
      | "CROPS"
      | "AQUACULTURE"
      | "BIOSECURITY"
      | null) || undefined;

    if (commodity) {
      assertNoProhibitedProduce(commodity, "Commodity");
    }
    if (category) {
      assertNoProhibitedProduce(category, "Category");
    }

    const result = await runAgriculturalDiseaseAgent({
      state,
      lga,
      commodity,
      category,
      domain,
    });

    revalidatePath("/disease-intelligence");
    revalidatePath("/admin/intelligence");

    return {
      success: true,
      result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to execute disease intelligence action";
    return {
      success: false,
      error: message,
    };
  }
}

export interface ReviewDiseaseAlertParams {
  alertId: string;
  decision: AlertLifecycleStatus;
  reviewNotes?: string;
}

export async function reviewDiseaseAlertAction(
  params: ReviewDiseaseAlertParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const updatePayload: Record<string, unknown> = {
      status: params.decision,
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
      review_notes: params.reviewNotes || null,
      updated_at: new Date().toISOString(),
    };

    if (params.decision === "PUBLISHED") {
      updatePayload.published_at = new Date().toISOString();
      updatePayload.published_by = user?.id || null;
    }

    const { error } = await supabase
      .from("agricultural_disease_alerts")
      .update(updatePayload)
      .eq("id", params.alertId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/disease-intelligence");
    revalidatePath("/admin/intelligence");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to review disease alert",
    };
  }
}
