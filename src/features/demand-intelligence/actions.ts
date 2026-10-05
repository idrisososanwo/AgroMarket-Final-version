/**
 * AgroMarket Phase 2.5: Demand Intelligence Server Actions
 *
 * Authenticated server actions for triggering demand forecasting evaluations,
 * recording audit logs, and submitting recommendations to human review.
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { runDemandForecastingAgent } from "./agent";
import { DemandIntelligenceRunResult } from "./types";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Triggers the Demand Forecasting Agent for an agricultural commodity and state
 */
export async function runDemandForecastingAction(
  commodity: string,
  state: string
): Promise<ActionResult<DemandIntelligenceRunResult>> {
  try {
    const user = await requireAuth();
    assertNoProhibitedProduce(commodity, "Commodity");

    const result = await runDemandForecastingAgent({
      commodity,
      state,
      userId: user.id,
    });

    await recordAuditLog({
      action: "EXECUTE_DEMAND_FORECASTING_AGENT",
      actorId: user.id,
      resourceType: "DEMAND_INTELLIGENCE",
      resourceId: `${commodity}-${state}`,
      metadata: {
        commodity,
        state,
        demandPressureScore: result.snapshot.demandPressure.score,
        demandPressureLevel: result.snapshot.demandPressure.level,
        forecastDirection: result.snapshot.forecast.forecastDirection,
        forecastConfidence: result.snapshot.forecast.confidenceScore,
        status: result.status,
      },
    });

    revalidatePath("/demand-intelligence");
    revalidatePath("/admin/intelligence");

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to execute demand forecasting agent",
    };
  }
}
