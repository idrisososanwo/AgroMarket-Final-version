"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth/server";
import { SettlementService } from "./service";
import { ActionResponse, SettlementDetail } from "./types";

/**
 * Evaluates settlement eligibility for an order's sellers.
 * Accessible by sellers for their own orders or administrators.
 */
export async function evaluateSettlementEligibilityAction(
  orderId: string
): Promise<ActionResponse<{ evaluated: number; eligible: number }>> {
  try {
    const user = await requireAuth();
    const isAdmin = user.roles.includes("ADMIN");

    const result = await SettlementService.evaluateSettlementEligibility(
      orderId,
      isAdmin ? undefined : user.id,
      user.id
    );

    revalidatePath("/farmer/settlements");
    revalidatePath("/admin/settlements");

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    console.error("evaluateSettlementEligibilityAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to evaluate settlement eligibility.";
    return { success: false, error: message };
  }
}

/**
 * Transitions an ELIGIBLE settlement to SETTLED.
 * Strictly restricted to platform administrators.
 */
export async function processSettlementAction(
  settlementId: string
): Promise<ActionResponse<SettlementDetail>> {
  try {
    const user = await requireRole("ADMIN");

    const settled = await SettlementService.processSettlement(settlementId, user.id);

    revalidatePath("/farmer/settlements");
    revalidatePath("/admin/settlements");

    return {
      success: true,
      data: settled,
    };
  } catch (error: unknown) {
    console.error("processSettlementAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process settlement.";
    return { success: false, error: message };
  }
}

/**
 * Retries a FAILED settlement attempt.
 * Strictly restricted to platform administrators.
 */
export async function retrySettlementAction(
  settlementId: string
): Promise<ActionResponse<SettlementDetail>> {
  try {
    const user = await requireRole("ADMIN");

    const retried = await SettlementService.retrySettlement(settlementId, user.id);

    revalidatePath("/farmer/settlements");
    revalidatePath("/admin/settlements");

    return {
      success: true,
      data: retried,
    };
  } catch (error: unknown) {
    console.error("retrySettlementAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to retry settlement.";
    return { success: false, error: message };
  }
}
