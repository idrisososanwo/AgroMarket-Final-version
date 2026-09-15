"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { isValidOrderStatusTransition, OrderStatus } from "./types";
import {
  ActionResponse,
  createOrderSchema,
  transitionOrderStatusSchema,
} from "./validation";

/**
 * Creates an order atomically from the buyer's active cart.
 * Invokes the PostgreSQL stored procedure `create_order_from_cart` with row-level locks
 * on cart items, listings, and inventory to prevent race conditions and overselling.
 */
export async function createOrderFromCartAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ orderId: string; orderNumber: string }>> {
  try {
    await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = createOrderSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Please complete all required delivery details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      deliveryAddress,
      deliveryState,
      deliveryLga,
      contactPhone,
      deliveryNotes,
    } = parsed.data;

    const supabase = await createClient();

    // Invoke atomic PostgreSQL stored procedure
    const { data, error } = await supabase.rpc("create_order_from_cart", {
      p_delivery_address: deliveryAddress.trim(),
      p_delivery_state: deliveryState.trim(),
      p_delivery_lga: deliveryLga.trim(),
      p_contact_phone: contactPhone.trim(),
      p_delivery_notes: deliveryNotes ? deliveryNotes.trim() : null,
    });

    if (error) {
      console.error("create_order_from_cart RPC error:", error);
      return {
        success: false,
        error: error.message || "Failed to create order from cart.",
      };
    }

    const rpcResult = data as { order_id?: string; order_number?: string } | null;
    const orderId = rpcResult?.order_id;
    const orderNumber = rpcResult?.order_number;

    if (!orderId || !orderNumber) {
      return {
        success: false,
        error: "Order creation completed but failed to retrieve order confirmation details.",
      };
    }

    revalidatePath("/cart");
    revalidatePath("/account/orders");
    revalidatePath("/farmer/orders");

    return {
      success: true,
      data: { orderId, orderNumber },
    };
  } catch (error: unknown) {
    console.error("createOrderFromCartAction error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred during order creation.";
    return { success: false, error: message };
  }
}

/**
 * Transitions order status through the controlled state machine.
 * Enforces role-based permissions:
 * - Buyers can cancel their own PENDING orders.
 * - Sellers can advance orders containing their produce.
 * - Admins have system-level management.
 */
export async function transitionOrderStatusAction(
  orderId: string,
  targetStatus: OrderStatus
): Promise<ActionResponse> {
  try {
    const user = await requireAuth();

    const parsed = transitionOrderStatusSchema.safeParse({ orderId, targetStatus });
    if (!parsed.success) {
      return { success: false, error: "Invalid status transition parameters." };
    }

    const supabase = await createClient();

    // 1. Fetch current order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, buyer_id, status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return { success: false, error: "Order not found." };
    }

    const currentStatus = order.status as OrderStatus;

    // 2. Validate state machine transition
    if (!isValidOrderStatusTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        error: `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`,
      };
    }

    const isBuyer = order.buyer_id === user.id;
    const isAdmin = user.roles.includes("ADMIN");

    // Check if user is a seller for items in this order
    const { data: sellerItems } = await supabase
      .from("order_items")
      .select("id, listing_id, quantity")
      .eq("order_id", orderId)
      .eq("seller_id", user.id);

    const isSeller = Boolean(sellerItems && sellerItems.length > 0);

    // Permission enforcement:
    // - Buyers can ONLY cancel their own PENDING orders
    if (isBuyer && !isAdmin && !isSeller) {
      if (targetStatus !== "CANCELLED" || currentStatus !== "PENDING") {
        return {
          success: false,
          error: "Buyers may only cancel orders while in PENDING status.",
        };
      }
    }

    // - Non-participants cannot alter orders
    if (!isBuyer && !isSeller && !isAdmin) {
      return {
        success: false,
        error: "Unauthorized: You are not a participant in this order.",
      };
    }

    // 3. Update order status
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateErr) {
      return { success: false, error: updateErr.message || "Failed to update order status." };
    }

    // 4. If order was cancelled from PENDING, release reserved inventory
    if (targetStatus === "CANCELLED" && currentStatus === "PENDING") {
      const { data: allItems } = await supabase
        .from("order_items")
        .select("listing_id, quantity")
        .eq("order_id", orderId);

      if (allItems) {
        for (const item of allItems) {
          const { data: inv } = await supabase
            .from("inventory")
            .select("quantity_reserved")
            .eq("listing_id", item.listing_id)
            .single();

          if (inv) {
            const newReserved = Math.max(0, Number(inv.quantity_reserved) - Number(item.quantity));
            await supabase
              .from("inventory")
              .update({ quantity_reserved: newReserved })
              .eq("listing_id", item.listing_id);
          }
        }
      }
    }

    revalidatePath("/cart");
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath("/farmer/orders");

    return { success: true };
  } catch (error: unknown) {
    console.error("transitionOrderStatusAction error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
