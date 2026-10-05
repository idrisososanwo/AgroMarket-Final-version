/**
 * AgroMarket Phase 2.4: Production Intelligence Server Actions
 *
 * Authenticated server actions for triggering production planning evaluations,
 * recording audit logs, and submitting recommendations to human review.
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { runProductionPlanningAgent } from "./agent";
import { ProductionPlanningRunResult } from "./types";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Triggers the Production Planning Agent for an agricultural commodity and state
 */
export async function runProductionPlanningAction(
  commodity: string,
  state: string
): Promise<ActionResult<ProductionPlanningRunResult>> {
  try {
    const user = await requireAuth();
    assertNoProhibitedProduce(commodity, "Commodity");

    const result = await runProductionPlanningAgent({
      commodity,
      state,
      userId: user.id,
    });

    await recordAuditLog({
      action: "EXECUTE_PRODUCTION_PLANNING_AGENT",
      actorId: user.id,
      resourceType: "PRODUCTION_PLANNING",
      resourceId: `${commodity}-${state}`,
      metadata: {
        commodity,
        state,
        domain: result.domain,
        opportunityScore: result.snapshot.opportunity.opportunityScore,
        opportunityLevel: result.snapshot.opportunity.opportunityLevel,
        riskScore: result.snapshot.risk.riskScore,
        riskLevel: result.snapshot.risk.riskLevel,
        status: result.status,
      },
    });

    revalidatePath("/production-intelligence");
    revalidatePath("/admin/intelligence");

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to execute production planning agent",
    };
  }
}
