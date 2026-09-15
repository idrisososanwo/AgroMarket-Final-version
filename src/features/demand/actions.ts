"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { DemandService } from "./service";
import {
  DemandForecast,
  GenerateForecastInput,
  generateForecastSchema,
} from "./types";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server action to generate or recalculate a baseline demand forecast.
 * Restricted strictly to platform administrators.
 */
export async function generateDemandForecastAction(
  input: GenerateForecastInput
): Promise<ActionResponse<DemandForecast>> {
  try {
    const admin = await requireRole("ADMIN");
    const validated = generateForecastSchema.parse(input);

    const forecast = await DemandService.generateBaselineForecast(validated, admin.id);

    revalidatePath("/admin/market-intelligence");
    revalidatePath("/farmer/market-intelligence");

    return {
      success: true,
      data: forecast,
    };
  } catch (error: unknown) {
    console.error("generateDemandForecastAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate demand forecast.";
    return { success: false, error: message };
  }
}
