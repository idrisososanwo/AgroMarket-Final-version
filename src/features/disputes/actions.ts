"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth/server";
import { DisputeService } from "./service";
import {
  createDisputeSchema,
  sellerResponseSchema,
  resolveDisputeSchema,
  addEvidenceSchema,
  cancelDisputeSchema,
} from "./validation";
import { ActionResponse, DisputeDetail } from "./types";

/**
 * Initiates a formal dispute against a seller by the authenticated buyer.
 */
export async function createDisputeAction(
  rawData: unknown
): Promise<ActionResponse<DisputeDetail>> {
  try {
    const user = await requireAuth();

    const parsed = createDisputeSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid dispute details.",
      };
    }

    const dispute = await DisputeService.createDispute(parsed.data, user.id);

    revalidatePath("/account/disputes");
    revalidatePath(`/account/orders/${parsed.data.orderId}`);
    revalidatePath(`/farmer/disputes`);
    revalidatePath(`/admin/disputes`);

    return {
      success: true,
      data: dispute,
    };
  } catch (error: unknown) {
    console.error("createDisputeAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to open dispute.";
    return { success: false, error: message };
  }
}

/**
 * Submits the seller's formal defense or statement to an open dispute.
 */
export async function respondToDisputeAction(
  rawData: unknown
): Promise<ActionResponse<DisputeDetail>> {
  try {
    const user = await requireAuth();

    const parsed = sellerResponseSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid response details.",
      };
    }

    const dispute = await DisputeService.respondToDispute(parsed.data, user.id);

    revalidatePath(`/farmer/disputes`);
    revalidatePath(`/farmer/disputes/${parsed.data.disputeId}`);
    revalidatePath(`/account/disputes/${parsed.data.disputeId}`);
    revalidatePath(`/admin/disputes/${parsed.data.disputeId}`);

    return {
      success: true,
      data: dispute,
    };
  } catch (error: unknown) {
    console.error("respondToDisputeAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to submit seller response.";
    return { success: false, error: message };
  }
}

/**
 * Uploads additional evidence (photographs, weighbridge receipts, delivery slips).
 */
export async function addDisputeEvidenceAction(
  rawData: unknown
): Promise<ActionResponse<void>> {
  try {
    const user = await requireAuth();

    const parsed = addEvidenceSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid evidence details.",
      };
    }

    await DisputeService.addEvidence(
      parsed.data.disputeId,
      parsed.data.evidenceType,
      parsed.data.fileUrl,
      parsed.data.description,
      user.id
    );

    revalidatePath(`/account/disputes/${parsed.data.disputeId}`);
    revalidatePath(`/farmer/disputes/${parsed.data.disputeId}`);
    revalidatePath(`/admin/disputes/${parsed.data.disputeId}`);

    return {
      success: true,
    };
  } catch (error: unknown) {
    console.error("addDisputeEvidenceAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload evidence.";
    return { success: false, error: message };
  }
}

/**
 * Formally resolves a dispute. Restricted to Platform Administrators.
 */
export async function resolveDisputeAction(
  rawData: unknown
): Promise<ActionResponse<DisputeDetail>> {
  try {
    const adminUser = await requireRole("ADMIN");

    const parsed = resolveDisputeSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid resolution details.",
      };
    }

    const dispute = await DisputeService.resolveDispute(parsed.data, adminUser.id);

    revalidatePath(`/admin/disputes`);
    revalidatePath(`/admin/disputes/${parsed.data.disputeId}`);
    revalidatePath(`/admin/settlements`);
    revalidatePath(`/account/disputes/${parsed.data.disputeId}`);
    revalidatePath(`/farmer/disputes/${parsed.data.disputeId}`);
    revalidatePath(`/farmer/settlements`);

    return {
      success: true,
      data: dispute,
    };
  } catch (error: unknown) {
    console.error("resolveDisputeAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to resolve dispute.";
    return { success: false, error: message };
  }
}

/**
 * Rejects a buyer dispute without financial adjustments. Restricted to Platform Administrators.
 */
export async function rejectDisputeAction(
  disputeId: string,
  notes: string
): Promise<ActionResponse<DisputeDetail>> {
  try {
    const adminUser = await requireRole("ADMIN");

    const dispute = await DisputeService.rejectDispute(disputeId, notes, adminUser.id);

    revalidatePath(`/admin/disputes`);
    revalidatePath(`/admin/disputes/${disputeId}`);
    revalidatePath(`/account/disputes/${disputeId}`);
    revalidatePath(`/farmer/disputes/${disputeId}`);

    return {
      success: true,
      data: dispute,
    };
  } catch (error: unknown) {
    console.error("rejectDisputeAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to reject dispute.";
    return { success: false, error: message };
  }
}

/**
 * Cancels an open dispute by the buyer who filed it.
 */
export async function cancelDisputeAction(
  rawData: unknown
): Promise<ActionResponse<DisputeDetail>> {
  try {
    const user = await requireAuth();

    const parsed = cancelDisputeSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid cancellation details.",
      };
    }

    const dispute = await DisputeService.cancelDispute(
      parsed.data.disputeId,
      parsed.data.reason,
      user.id
    );

    revalidatePath(`/account/disputes`);
    revalidatePath(`/account/disputes/${parsed.data.disputeId}`);
    revalidatePath(`/farmer/disputes/${parsed.data.disputeId}`);
    revalidatePath(`/admin/disputes/${parsed.data.disputeId}`);

    return {
      success: true,
      data: dispute,
    };
  } catch (error: unknown) {
    console.error("cancelDisputeAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to cancel dispute.";
    return { success: false, error: message };
  }
}
