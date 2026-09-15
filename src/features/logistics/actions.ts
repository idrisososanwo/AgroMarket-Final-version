"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { LogisticsService } from "./service";
import {
  createOrderDeliveriesSchema,
  assignLogisticsProviderSchema,
  updateDeliveryStatusSchema,
  cancelDeliverySchema,
  AssignLogisticsProviderInput,
  UpdateDeliveryStatusInput,
  CancelDeliveryInput,
} from "./validation";
import { ActionResponse, DeliveryStatus } from "./types";

/**
 * Initiates third-party delivery dispatch consignments for a PAID order.
 */
export async function createOrderDeliveriesAction(
  orderId: string
): Promise<ActionResponse<{ deliveryIds: string[] }>> {
  try {
    const user = await requireAuth();

    const parsed = createOrderDeliveriesSchema.safeParse({ orderId });
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid order ID.",
      };
    }

    const deliveryIds = await LogisticsService.createOrderDeliveries(orderId, user.id);

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath(`/account/orders/${orderId}/delivery`);
    revalidatePath("/farmer/orders");
    revalidatePath("/logistics/deliveries");

    return {
      success: true,
      data: { deliveryIds },
    };
  } catch (error: unknown) {
    console.error("createOrderDeliveriesAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create delivery consignments.";
    return { success: false, error: message };
  }
}

/**
 * Assigns a verified logistics provider to a delivery consignment.
 * Strictly restricted to platform ADMINs or verified carrier account owners claiming their own fleet.
 * Ordinary SERVICE_PROVIDER roles without an authorized carrier profile are rejected.
 */
export async function assignLogisticsProviderAction(
  input: AssignLogisticsProviderInput
): Promise<ActionResponse> {
  try {
    const user = await requireAuth();

    const parsed = assignLogisticsProviderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid provider assignment input.",
      };
    }

    const isAdmin = user.roles.includes("ADMIN");

    // If caller is not platform ADMIN, verify they are the verified account owner of target provider
    if (!isAdmin) {
      const supabase = await createClient();
      const { data: provider } = await supabase
        .from("logistics_providers")
        .select("id, profile_id, is_active, is_verified")
        .eq("id", parsed.data.providerId)
        .single();

      const isAuthorizedCarrier =
        provider &&
        provider.profile_id === user.id &&
        provider.is_active &&
        provider.is_verified;

      if (!isAuthorizedCarrier) {
        return {
          success: false,
          error:
            "Unauthorized: Only platform administrators or authorized carrier account owners can perform provider assignment.",
        };
      }
    }

    await LogisticsService.assignLogisticsProvider(
      parsed.data.deliveryId,
      parsed.data.providerId,
      user.id,
      user.roles
    );

    revalidatePath("/logistics/deliveries");
    revalidatePath(`/logistics/deliveries/${parsed.data.deliveryId}`);

    return { success: true };
  } catch (error: unknown) {
    console.error("assignLogisticsProviderAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to assign logistics provider.";
    return { success: false, error: message };
  }
}

/**
 * Advances a delivery consignment through the state machine.
 */
export async function updateDeliveryStatusAction(
  input: UpdateDeliveryStatusInput
): Promise<ActionResponse> {
  try {
    const user = await requireAuth();

    const parsed = updateDeliveryStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid delivery update parameters.",
      };
    }

    const { deliveryId, targetStatus, locationName, description, failureReason, proofOfDeliveryUrl } =
      parsed.data;

    await LogisticsService.transitionDeliveryStatus(
      deliveryId,
      targetStatus as DeliveryStatus,
      user.id,
      {
        locationName,
        description,
        failureReason,
        proofOfDeliveryUrl,
      }
    );

    revalidatePath("/logistics/deliveries");
    revalidatePath(`/logistics/deliveries/${deliveryId}`);

    return { success: true };
  } catch (error: unknown) {
    console.error("updateDeliveryStatusAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update delivery status.";
    return { success: false, error: message };
  }
}

/**
 * Cancels a delivery consignment before physical pickup.
 */
export async function cancelDeliveryAction(
  input: CancelDeliveryInput
): Promise<ActionResponse> {
  try {
    const user = await requireAuth();

    const parsed = cancelDeliverySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid cancellation parameters.",
      };
    }

    await LogisticsService.cancelDelivery(parsed.data.deliveryId, parsed.data.reason, user.id);

    revalidatePath("/logistics/deliveries");
    revalidatePath(`/logistics/deliveries/${parsed.data.deliveryId}`);

    return { success: true };
  } catch (error: unknown) {
    console.error("cancelDeliveryAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to cancel delivery consignment.";
    return { success: false, error: message };
  }
}
