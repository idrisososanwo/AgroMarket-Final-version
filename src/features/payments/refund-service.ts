import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/audit";
import { getPaymentProvider } from "./providers";
import { CreateRefundInput, RefundDetail, RefundStatus } from "./types";

export class RefundService {
  /**
   * Processes a server-authoritative refund with multi-level isolation:
   * 1. Global order payment balance: sum(refunds) <= payment.amount
   * 2. Item allocation ceiling: sum(item_refunds) <= order_item.total_price
   * 3. Seller allocation ceiling: sum(seller_refunds) <= sum(seller_order_items.total_price)
   * 4. Seller boundary enforcement: Seller A cannot refund Seller B's item
   * 5. Idempotency: exact idempotency_key prevents duplicate executions
   */
  static async processRefund(
    input: CreateRefundInput,
    actorId: string
  ): Promise<RefundDetail> {
    const admin = createAdminClient();
    const idempotencyKey =
      input.idempotencyKey ||
      `REF-IDEM-${input.orderId.slice(0, 8)}-${crypto.randomBytes(6).toString("hex")}`;

    // 1. Idempotency Check: return existing refund if already registered
    const { data: existingRefund } = await admin
      .from("refunds")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingRefund) {
      return this.mapRefundRow(existingRefund);
    }

    // 2. Fetch and validate payment
    const { data: payment, error: payErr } = await admin
      .from("payments")
      .select("id, order_id, buyer_id, amount, currency, provider, provider_reference, status")
      .eq("id", input.paymentId)
      .single();

    if (payErr || !payment) {
      throw new Error("Payment record not found.");
    }

    if (payment.status !== "SUCCESSFUL" && payment.status !== "PAID") {
      throw new Error(`Cannot refund payment in '${payment.status}' status. Payment must be SUCCESSFUL.`);
    }

    if (input.amount <= 0) {
      throw new Error("Refund amount must be strictly greater than zero.");
    }

    // 3. Global Order/Payment Level Balance Check
    const { data: previousOrderRefunds } = await admin
      .from("refunds")
      .select("amount, status")
      .eq("payment_id", payment.id)
      .in("status", ["SUCCEEDED", "PROCESSING"]);

    const totalOrderAlreadyRefunded = (previousOrderRefunds || []).reduce(
      (sum, r) => sum + Number(r.amount),
      0
    );

    const paymentAmount = Number(payment.amount);
    const maxOrderRefundable = Math.max(0, paymentAmount - totalOrderAlreadyRefunded);

    if (input.amount > maxOrderRefundable) {
      throw new Error(
        `Refund amount (₦${input.amount.toLocaleString()}) exceeds maximum order refundable balance (₦${maxOrderRefundable.toLocaleString()}).`
      );
    }

    // 4. Item-Level Isolation & Validation (if orderItemId provided)
    let effectiveSellerId = input.sellerId;

    if (input.orderItemId) {
      const { data: orderItem, error: itemErr } = await admin
        .from("order_items")
        .select("id, order_id, seller_id, total_price")
        .eq("id", input.orderItemId)
        .eq("order_id", input.orderId)
        .maybeSingle();

      if (itemErr || !orderItem) {
        throw new Error("Specified order item does not exist in this order.");
      }

      // Ensure sellerId matches item's actual seller
      if (effectiveSellerId && effectiveSellerId !== orderItem.seller_id) {
        throw new Error("Seller ID mismatch: You cannot refund an item belonging to another seller.");
      }
      effectiveSellerId = orderItem.seller_id;

      // Check item's remaining refundable balance
      const { data: prevItemRefunds } = await admin
        .from("refunds")
        .select("amount")
        .eq("order_item_id", input.orderItemId)
        .in("status", ["SUCCEEDED", "PROCESSING"]);

      const itemAlreadyRefunded = (prevItemRefunds || []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );
      const itemPrice = Number(orderItem.total_price);
      const itemMaxRefundable = Math.max(0, itemPrice - itemAlreadyRefunded);

      if (input.amount > itemMaxRefundable) {
        throw new Error(
          `Refund amount (₦${input.amount.toLocaleString()}) exceeds item's remaining refundable balance (₦${itemMaxRefundable.toLocaleString()}).`
        );
      }
    }

    // 5. Seller-Level Isolation & Allocation Check (if effectiveSellerId identified)
    if (effectiveSellerId) {
      const { data: sellerItems } = await admin
        .from("order_items")
        .select("total_price")
        .eq("order_id", input.orderId)
        .eq("seller_id", effectiveSellerId);

      const sellerTotal = (sellerItems || []).reduce(
        (sum, item) => sum + Number(item.total_price),
        0
      );

      if (sellerTotal <= 0) {
        throw new Error("Specified seller has no items in this order.");
      }

      // Deduct previous refunds already allocated to this seller
      const { data: prevSellerRefunds } = await admin
        .from("refunds")
        .select("amount")
        .eq("order_id", input.orderId)
        .eq("seller_id", effectiveSellerId)
        .in("status", ["SUCCEEDED", "PROCESSING"]);

      const sellerAlreadyRefunded = (prevSellerRefunds || []).reduce(
        (sum, r) => sum + Number(r.amount),
        0
      );

      const sellerMaxRefundable = Math.max(0, sellerTotal - sellerAlreadyRefunded);

      if (input.amount > sellerMaxRefundable) {
        throw new Error(
          `Refund allocation (₦${input.amount.toLocaleString()}) exceeds seller's remaining refundable balance (₦${sellerMaxRefundable.toLocaleString()}).`
        );
      }
    }

    // 6. Insert initial PENDING refund record
    const { data: newRefund, error: insErr } = await admin
      .from("refunds")
      .insert({
        dispute_id: input.disputeId ?? null,
        order_id: input.orderId,
        payment_id: input.paymentId,
        buyer_id: payment.buyer_id,
        seller_id: effectiveSellerId ?? null,
        order_item_id: input.orderItemId ?? null,
        amount: input.amount,
        currency: "NGN",
        reason: input.reason,
        status: "PENDING",
        provider: payment.provider,
        idempotency_key: idempotencyKey,
      })
      .select()
      .single();

    if (insErr || !newRefund) {
      console.error("Failed to insert refund record:", insErr);
      throw new Error("Failed to create refund record.");
    }

    await recordAuditLog({
      actorId,
      action: "REFUND_REQUESTED",
      resourceType: "refund",
      resourceId: newRefund.id,
      metadata: {
        orderId: input.orderId,
        paymentId: input.paymentId,
        amount: input.amount,
        disputeId: input.disputeId,
        sellerId: effectiveSellerId,
        orderItemId: input.orderItemId,
      },
    });

    // 7. Execute Provider Refund via Provider Abstraction
    let finalStatus: RefundStatus = "SUCCEEDED";
    let providerRefundRef = `RFD-SIM-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    try {
      const provider = getPaymentProvider(payment.provider);
      if (provider.processRefund) {
        const result = await provider.processRefund({
          paymentReference: payment.provider_reference,
          amount: input.amount,
          currency: "NGN",
          reason: input.reason,
          idempotencyKey,
        });
        finalStatus = result.status;
        providerRefundRef = result.providerRefundReference;
      }
    } catch (providerErr) {
      console.error("Payment provider refund failed:", providerErr);
      finalStatus = "FAILED";
    }

    // 8. Update refund record with final result
    const { data: updatedRefund, error: updateErr } = await admin
      .from("refunds")
      .update({
        status: finalStatus,
        provider_refund_reference: providerRefundRef,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", newRefund.id)
      .select()
      .single();

    if (updateErr || !updatedRefund) {
      throw new Error("Failed to finalize refund status.");
    }

    // 9. If full refund succeeded across entire order, update payment status
    if (finalStatus === "SUCCEEDED" && totalOrderAlreadyRefunded + input.amount >= paymentAmount) {
      await admin
        .from("payments")
        .update({ status: "REFUNDED", updated_at: new Date().toISOString() })
        .eq("id", payment.id);
    }

    await recordAuditLog({
      actorId,
      action: finalStatus === "SUCCEEDED" ? "REFUND_SUCCEEDED" : "REFUND_FAILED",
      resourceType: "refund",
      resourceId: updatedRefund.id,
      metadata: {
        amount: input.amount,
        finalStatus,
        providerRefundRef,
      },
    });

    return this.mapRefundRow(updatedRefund);
  }

  /**
   * Retrieves all refunds associated with an order.
   */
  static async getRefundsByOrder(orderId: string): Promise<RefundDetail[]> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("refunds")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(this.mapRefundRow);
  }

  /**
   * Retrieves all refunds associated with a dispute.
   */
  static async getRefundsByDispute(disputeId: string): Promise<RefundDetail[]> {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("refunds")
      .select("*")
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(this.mapRefundRow);
  }

  private static mapRefundRow(row: Record<string, unknown>): RefundDetail {
    return {
      id: row.id as string,
      disputeId: (row.dispute_id as string) || null,
      orderId: row.order_id as string,
      paymentId: row.payment_id as string,
      buyerId: row.buyer_id as string,
      sellerId: (row.seller_id as string) || null,
      orderItemId: (row.order_item_id as string) || null,
      amount: Number(row.amount),
      currency: "NGN",
      reason: row.reason as string,
      status: row.status as RefundStatus,
      provider: row.provider as string,
      providerRefundReference: (row.provider_refund_reference as string) || null,
      idempotencyKey: row.idempotency_key as string,
      processedAt: (row.processed_at as string) || null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
