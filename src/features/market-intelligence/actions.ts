/**
 * AgroMarket Phase 2.3: Market Intelligence Server Actions
 *
 * Authenticated server actions for triggering agent evaluations,
 * recording market pressure snapshots, and human-in-the-loop review.
 *
 * SECURITY:
 * - Enforces requireAuth().
 * - Records structured audit logs via recordAuditLog().
 * - Strict anti-pork validation.
 * - Non-autonomous decision boundaries.
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { runMarketIntelligenceAgent } from "./agent";
import { MarketIntelligenceRunResult } from "./types";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Triggers the Market Intelligence Agent for a commodity and state
 */
export async function runMarketIntelligenceAction(
  commodity: string,
  state: string,
  comparisonStates: string[] = []
): Promise<ActionResult<MarketIntelligenceRunResult>> {
  try {
    const user = await requireAuth();
    assertNoProhibitedProduce(commodity, "Commodity");

    const result = await runMarketIntelligenceAgent({
      commodity,
      state,
      comparisonStates,
      userId: user.id,
    });

    await recordAuditLog({
      action: "EXECUTE_MARKET_INTELLIGENCE_AGENT",
      actorId: user.id,
      resourceType: "MARKET_INTELLIGENCE",
      resourceId: `${commodity}-${state}`,
      metadata: {
        commodity,
        state,
        pressureScore: result.snapshot.marketPressure.pressureScore,
        pressureLevel: result.snapshot.marketPressure.pressureLevel,
        status: result.status,
        signalsDetected: result.snapshot.signals.length,
      },
    });

    revalidatePath("/market-intelligence");
    revalidatePath("/admin/intelligence");

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to execute market intelligence agent",
    };
  }
}
