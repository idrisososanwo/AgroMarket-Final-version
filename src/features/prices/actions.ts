"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth/server";
import { PriceService } from "./service";
import {
  CreatePriceObservationInput,
  createPriceObservationSchema,
  PriceObservation,
} from "./types";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Records a price observation from an authenticated user (farmer, aggregator, or administrator).
 */
export async function recordPriceObservationAction(
  input: CreatePriceObservationInput
): Promise<ActionResponse<PriceObservation>> {
  try {
    const user = await requireAuth();
    const isAdmin = user.roles.includes("ADMIN");

    const validated = createPriceObservationSchema.parse(input);
    const observation = await PriceService.recordObservation(validated, user.id, isAdmin);

    revalidatePath("/market");
    revalidatePath("/farmer/market-intelligence");
    revalidatePath("/admin/market-intelligence");

    return {
      success: true,
      data: observation,
    };
  } catch (error: unknown) {
    console.error("recordPriceObservationAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to record price observation.";
    return { success: false, error: message };
  }
}

/**
 * Admin action to verify a price observation.
 */
export async function verifyPriceObservationAction(
  observationId: string
): Promise<ActionResponse<{ verified: boolean }>> {
  try {
    const admin = await requireRole("ADMIN");
    await PriceService.setVerificationStatus(observationId, admin.id, "VERIFIED");

    revalidatePath("/market");
    revalidatePath("/admin/market-intelligence");

    return {
      success: true,
      data: { verified: true },
    };
  } catch (error: unknown) {
    console.error("verifyPriceObservationAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to verify price observation.";
    return { success: false, error: message };
  }
}

/**
 * Admin action to reject an invalid price observation.
 */
export async function rejectPriceObservationAction(
  observationId: string
): Promise<ActionResponse<{ rejected: boolean }>> {
  try {
    const admin = await requireRole("ADMIN");
    await PriceService.setVerificationStatus(observationId, admin.id, "REJECTED");

    revalidatePath("/market");
    revalidatePath("/admin/market-intelligence");

    return {
      success: true,
      data: { rejected: true },
    };
  } catch (error: unknown) {
    console.error("rejectPriceObservationAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to reject price observation.";
    return { success: false, error: message };
  }
}
