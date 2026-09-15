"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { PaymentProviderName } from "@/features/payments/types";
import {
  ActionResponse,
  JoinSharedPurchaseResult,
  SharedPurchaseStatus,
} from "./types";
import { InitializePaymentResult } from "@/features/payments/types";
import {
  createSharedPurchaseSchema,
  joinSharedPurchaseSchema,
  transitionStatusSchema,
  cancelSharedPurchaseSchema,
} from "./validation";
import { SharedPurchaseService } from "./service";

/**
 * Server Action to create a new Shared Purchase pool.
 */
export async function createSharedPurchaseAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ id: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    // Type coercion for numeric inputs if passed as strings from FormData
    const prepared: Record<string, unknown> = { ...raw };
    if (typeof prepared.totalQuantity === "string") {
      prepared.totalQuantity = Number(prepared.totalQuantity);
    }
    if (typeof prepared.unitPrice === "string") {
      prepared.unitPrice = Number(prepared.unitPrice);
    }
    if (typeof prepared.targetParticipants === "string") {
      prepared.targetParticipants = parseInt(prepared.targetParticipants as string, 10);
    }
    if (typeof prepared.minShareQuantity === "string") {
      prepared.minShareQuantity = Number(prepared.minShareQuantity);
    }
    if (typeof prepared.maxShareQuantity === "string" && prepared.maxShareQuantity) {
      prepared.maxShareQuantity = Number(prepared.maxShareQuantity);
    }

    const parsed = createSharedPurchaseSchema.safeParse(prepared);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check your inputs.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const id = await SharedPurchaseService.createSharedPurchase(parsed.data, user.id);

    revalidatePath("/shared-purchases");
    revalidatePath("/farmer/shared-purchases");

    return { success: true, data: { id } };
  } catch (error: unknown) {
    console.error("createSharedPurchaseAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to create shared purchase.";
    return { success: false, error: message };
  }
}

/**
 * Server Action to join an open Shared Purchase pool.
 */
export async function joinSharedPurchaseAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<JoinSharedPurchaseResult>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const prepared: Record<string, unknown> = { ...raw };
    if (typeof prepared.requestedQuantity === "string") {
      prepared.requestedQuantity = Number(prepared.requestedQuantity);
    }

    const parsed = joinSharedPurchaseSchema.safeParse(prepared);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please complete all required commitment details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const result = await SharedPurchaseService.joinSharedPurchase(parsed.data, user.id);

    revalidatePath(`/shared-purchases/${parsed.data.sharedPurchaseId}`);
    revalidatePath("/account/shared-purchases");
    revalidatePath("/shared-purchases");

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("joinSharedPurchaseAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to join shared purchase.";
    return { success: false, error: message };
  }
}

/**
 * Server Action to initialize payment for a participant's pledge.
 */
export async function initializeSharedPurchasePaymentAction(
  participantId: string,
  provider?: PaymentProviderName
): Promise<ActionResponse<InitializePaymentResult>> {
  try {
    const user = await requireAuth();
    const result = await SharedPurchaseService.initializeParticipantPayment({
      participantId,
      buyerId: user.id,
      provider,
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("initializeSharedPurchasePaymentAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to initialize payment.";
    return { success: false, error: message };
  }
}

/**
 * Server Action to transition a Shared Purchase status.
 */
export async function transitionSharedPurchaseStatusAction(
  sharedPurchaseId: string,
  targetStatus: SharedPurchaseStatus
): Promise<ActionResponse> {
  try {
    const user = await requireAuth();
    const parsed = transitionStatusSchema.safeParse({ sharedPurchaseId, targetStatus });
    if (!parsed.success) {
      return { success: false, error: "Invalid status transition parameters." };
    }

    await SharedPurchaseService.transitionStatus(
      sharedPurchaseId,
      targetStatus,
      user.id,
      user.roles
    );

    revalidatePath(`/shared-purchases/${sharedPurchaseId}`);
    revalidatePath(`/farmer/shared-purchases/${sharedPurchaseId}`);
    revalidatePath("/farmer/shared-purchases");
    revalidatePath("/shared-purchases");

    return { success: true };
  } catch (error: unknown) {
    console.error("transitionSharedPurchaseStatusAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to transition pool status.";
    return { success: false, error: message };
  }
}

/**
 * Server Action to cancel a Shared Purchase pool.
 */
export async function cancelSharedPurchaseAction(
  sharedPurchaseId: string,
  reason: string
): Promise<ActionResponse> {
  try {
    const user = await requireAuth();
    const parsed = cancelSharedPurchaseSchema.safeParse({ sharedPurchaseId, reason });
    if (!parsed.success) {
      return { success: false, error: "Invalid cancellation reason." };
    }

    await SharedPurchaseService.cancelSharedPurchase(
      sharedPurchaseId,
      reason,
      user.id,
      user.roles
    );

    revalidatePath(`/shared-purchases/${sharedPurchaseId}`);
    revalidatePath(`/farmer/shared-purchases/${sharedPurchaseId}`);
    revalidatePath("/farmer/shared-purchases");
    revalidatePath("/shared-purchases");

    return { success: true };
  } catch (error: unknown) {
    console.error("cancelSharedPurchaseAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to cancel shared purchase.";
    return { success: false, error: message };
  }
}

/**
 * Server Action for a buyer to cancel an unpaid pledge.
 */
export async function cancelParticipationAction(
  participantId: string
): Promise<ActionResponse> {
  try {
    const user = await requireAuth();

    await SharedPurchaseService.cancelParticipation(
      participantId,
      user.id,
      user.roles
    );

    revalidatePath("/account/shared-purchases");
    revalidatePath("/shared-purchases");

    return { success: true };
  } catch (error: unknown) {
    console.error("cancelParticipationAction error:", error);
    const message = error instanceof Error ? error.message : "Failed to cancel pledge.";
    return { success: false, error: message };
  }
}

/**
 * Server Action to sweep and expire stale unconfirmed pledges.
 * Can be invoked by sellers, admins, or scheduled trigger.
 */
export async function expireStalePledgesAction(
  sharedPurchaseId?: string,
  ttlMinutes: number = 30
): Promise<ActionResponse<{ expiredCount: number; reclaimedQuantity: number }>> {
  try {
    const result = await SharedPurchaseService.expireStaleUnpaidPledges(
      sharedPurchaseId,
      ttlMinutes
    );

    if (sharedPurchaseId) {
      revalidatePath(`/shared-purchases/${sharedPurchaseId}`);
      revalidatePath(`/farmer/shared-purchases/${sharedPurchaseId}`);
    }
    revalidatePath("/shared-purchases");

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("expireStalePledgesAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to sweep stale pledges.";
    return { success: false, error: message };
  }
}

