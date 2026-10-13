/**
 * AgroMarket V1: Abandoned Order Inventory Cleanup Service
 * Automatically identifies abandoned pending checkout reservations and safely releases stock.
 *
 * SAFETY INVARIANTS:
 * 1. Never releases stock for paid, processing, or completed orders.
 * 2. Idempotent: Never releases stock from an order more than once.
 * 3. Conservative payment handling: If an order has an active payment updated within 15 minutes,
 *    it is treated as in-flight and skipped.
 * 4. Prevents negative reserved inventory and stock inflation.
 * 5. Records clear cancellation reasons and immutable audit log entries.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/audit";

export interface CleanupResult {
  success: boolean;
  processedCount: number;
  cancelledCount: number;
  skippedCount: number;
  timeoutMinutes: number;
  details: Array<{
    orderId: string;
    success: boolean;
    code: string;
    reason?: string;
  }>;
}

export interface ReleaseOrderResult {
  success: boolean;
  code: string;
  orderId?: string;
  orderNumber?: string;
  itemsReleased?: number;
  reason?: string;
  message?: string;
  currentStatus?: string;
}

export class OrderCleanupService {
  /**
   * Cleans up all pending orders that have been abandoned past the timeout window (default: 60 minutes).
   */
  static async cleanupAbandonedOrders(options: {
    timeoutMinutes?: number;
    limit?: number;
  } = {}): Promise<CleanupResult> {
    const timeoutMinutes = options.timeoutMinutes ?? 60;
    const limit = options.limit ?? 50;
    const admin = createAdminClient();

    // 1. Attempt execution via the atomic PostgreSQL stored procedure first
    const { data: rpcData, error: rpcError } = await admin.rpc(
      "cleanup_abandoned_pending_orders",
      {
        p_timeout_minutes: timeoutMinutes,
        p_batch_limit: limit,
      }
    );

    if (!rpcError && rpcData && typeof rpcData === "object") {
      const rpcResult = rpcData as {
        success?: boolean;
        processed_count?: number;
        cancelled_count?: number;
        skipped_count?: number;
        details?: Array<Record<string, unknown>>;
      };

      const mappedDetails = (rpcResult.details || []).map((d) => ({
        orderId: String(d.order_id || ""),
        success: Boolean(d.success),
        code: String(d.code || ""),
        reason: d.reason ? String(d.reason) : undefined,
      }));

      return {
        success: true,
        processedCount: rpcResult.processed_count ?? 0,
        cancelledCount: rpcResult.cancelled_count ?? 0,
        skippedCount: rpcResult.skipped_count ?? 0,
        timeoutMinutes,
        details: mappedDetails,
      };
    }

    // 2. Application-Level Graceful Fallback if RPC is not present
    return this.cleanupAbandonedOrdersApplicationLevel(timeoutMinutes, limit);
  }

  /**
   * Releases reserved inventory for a specific order atomically.
   */
  static async releaseSingleOrder(
    orderId: string,
    reason: string = "ABANDONED_CHECKOUT_TIMEOUT"
  ): Promise<ReleaseOrderResult> {
    const admin = createAdminClient();

    // 1. Try atomic database RPC
    const { data: rpcData, error: rpcError } = await admin.rpc(
      "release_order_inventory",
      {
        p_order_id: orderId,
        p_reason: reason,
      }
    );

    if (!rpcError && rpcData && typeof rpcData === "object") {
      const res = rpcData as Record<string, unknown>;
      return {
        success: Boolean(res.success),
        code: String(res.code || "UNKNOWN"),
        orderId: res.order_id ? String(res.order_id) : orderId,
        orderNumber: res.order_number ? String(res.order_number) : undefined,
        itemsReleased: res.items_released ? Number(res.items_released) : 0,
        reason: res.reason ? String(res.reason) : reason,
        message: res.message ? String(res.message) : undefined,
        currentStatus: res.current_status ? String(res.current_status) : undefined,
      };
    }

    // 2. Application-level fallback with strict invariant checks
    return this.releaseSingleOrderApplicationLevel(orderId, reason);
  }

  /**
   * Application-level fallback for batch cleanup.
   */
  private static async cleanupAbandonedOrdersApplicationLevel(
    timeoutMinutes: number,
    limit: number
  ): Promise<CleanupResult> {
    const admin = createAdminClient();
    const cutoffDate = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

    // Fetch candidate PENDING orders older than cutoff
    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select("id, order_number, created_at, status")
      .eq("status", "PENDING")
      .lt("created_at", cutoffDate)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (ordersError || !orders) {
      console.error("OrderCleanupService: Failed to query pending orders:", ordersError);
      return {
        success: false,
        processedCount: 0,
        cancelledCount: 0,
        skippedCount: 0,
        timeoutMinutes,
        details: [],
      };
    }

    const details: CleanupResult["details"] = [];
    let cancelledCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      const releaseResult = await this.releaseSingleOrderApplicationLevel(
        order.id,
        "ABANDONED_CHECKOUT_TIMEOUT"
      );

      details.push({
        orderId: order.id,
        success: releaseResult.success,
        code: releaseResult.code,
        reason: releaseResult.reason,
      });

      if (releaseResult.success) {
        cancelledCount++;
      } else {
        skippedCount++;
      }
    }

    return {
      success: true,
      processedCount: orders.length,
      cancelledCount,
      skippedCount,
      timeoutMinutes,
      details,
    };
  }

  /**
   * Application-level fallback for releasing a single order.
   */
  private static async releaseSingleOrderApplicationLevel(
    orderId: string,
    reason: string
  ): Promise<ReleaseOrderResult> {
    const admin = createAdminClient();

    // 1. Fetch current order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, buyer_id, status, total_amount")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return {
        success: false,
        code: "ORDER_NOT_FOUND",
        message: "Order not found.",
      };
    }

    // 2. Guard: Never release stock from paid or completed orders
    if (["PAID", "PROCESSING", "PARTIALLY_FULFILLED", "COMPLETED"].includes(order.status)) {
      return {
        success: false,
        code: "ORDER_ALREADY_PAID",
        orderId: order.id,
        currentStatus: order.status,
        message: "Cannot release inventory for an order that is already paid or completed.",
      };
    }

    // 3. Guard: Idempotency check - if already cancelled, do not release twice
    if (order.status === "CANCELLED") {
      return {
        success: false,
        code: "ORDER_ALREADY_CANCELLED",
        orderId: order.id,
        currentStatus: order.status,
        message: "Order is already cancelled; reservation was previously released.",
      };
    }

    if (order.status !== "PENDING") {
      return {
        success: false,
        code: "INVALID_ORDER_STATUS",
        orderId: order.id,
        currentStatus: order.status,
        message: `Order has status "${order.status}", which cannot be released by this operation.`,
      };
    }

    // 4. Guard: Check associated payments
    const { data: payments } = await admin
      .from("payments")
      .select("id, status, updated_at")
      .eq("order_id", orderId);

    if (payments && payments.length > 0) {
      // Check if any payment was successful
      const hasSuccessfulPayment = payments.some((p) => p.status === "SUCCESSFUL");
      if (hasSuccessfulPayment) {
        return {
          success: false,
          code: "PAYMENT_SUCCESSFUL",
          orderId: order.id,
          message: "Order has confirmed successful payment. Cancellation aborted.",
        };
      }

      // Check if payment is actively in-flight (< 15 minutes old)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const hasActivePayment = payments.some(
        (p) =>
          ["INITIALIZED", "PENDING"].includes(p.status) &&
          p.updated_at > fifteenMinutesAgo
      );

      if (hasActivePayment) {
        return {
          success: false,
          code: "PAYMENT_IN_FLIGHT",
          orderId: order.id,
          message: "Order has an active payment transaction currently in flight. Cancellation deferred.",
        };
      }
    }

    // 5. Conditional transition to CANCELLED
    const { error: updateOrderErr } = await admin
      .from("orders")
      .update({
        status: "CANCELLED",
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "PENDING"); // Conditional update to prevent race conditions

    if (updateOrderErr) {
      console.error("OrderCleanupService: Failed to cancel order:", updateOrderErr);
      return {
        success: false,
        code: "UPDATE_FAILED",
        orderId: order.id,
        message: updateOrderErr.message,
      };
    }

    // 6. Transition order items to CANCELLED
    await admin
      .from("order_items")
      .update({ status: "CANCELLED" })
      .eq("order_id", orderId)
      .eq("status", "PENDING");

    // 7. Restore reserved inventory safely
    const { data: items } = await admin
      .from("order_items")
      .select("listing_id, quantity")
      .eq("order_id", orderId);

    let itemsReleasedCount = 0;

    if (items && items.length > 0) {
      for (const item of items) {
        const { data: inv } = await admin
          .from("inventory")
          .select("quantity_reserved, quantity_on_hand")
          .eq("listing_id", item.listing_id)
          .single();

        if (inv) {
          const newReserved = Math.max(0, Number(inv.quantity_reserved) - Number(item.quantity));
          await admin
            .from("inventory")
            .update({
              quantity_reserved: newReserved,
              updated_at: new Date().toISOString(),
            })
            .eq("listing_id", item.listing_id);

          itemsReleasedCount++;
        }
      }
    }

    // 8. Immutable Audit Log
    try {
      await recordAuditLog({
        actorId: order.buyer_id,
        action: "ORDER_RESERVATION_RELEASED",
        resourceType: "order",
        resourceId: order.id,
        metadata: {
          orderNumber: order.order_number,
          previousStatus: "PENDING",
          newStatus: "CANCELLED",
          reason,
          itemsReleasedCount,
        },
      });
    } catch {
      // Audit log failures should not block cleanup completion
    }

    return {
      success: true,
      code: "RESERVATION_RELEASED",
      orderId: order.id,
      orderNumber: order.order_number,
      itemsReleased: itemsReleasedCount,
      reason,
    };
  }
}
