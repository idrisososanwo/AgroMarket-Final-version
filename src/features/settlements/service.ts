import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/audit";
import { NotificationService } from "@/features/notifications/service";
import {
  SettlementDetail,
  SettlementStatus,
  isValidSettlementTransition,
} from "./types";
import {
  DEFAULT_DISPUTE_WINDOW_DAYS,
  DEFAULT_PLATFORM_FEE_PERCENT,
} from "./constants";

export class SettlementService {
  /**
   * Initializes settlement accounting records for a multi-seller order.
   * Partitions order items by seller and creates one settlement record per seller.
   */
  static async createOrderSettlements(
    orderId: string,
    actorId: string
  ): Promise<string[]> {
    const admin = createAdminClient();

    // 1. Fetch order and its items
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, status, total_amount")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      throw new Error("Order not found.");
    }

    const { data: items, error: itemsErr } = await admin
      .from("order_items")
      .select("id, seller_id, total_price")
      .eq("order_id", orderId);

    if (itemsErr || !items || items.length === 0) {
      throw new Error("No order items found for settlement initialization.");
    }

    // 2. Partition items by seller
    const sellerGrossMap = new Map<string, number>();
    for (const item of items) {
      const current = sellerGrossMap.get(item.seller_id) || 0;
      sellerGrossMap.set(item.seller_id, current + Number(item.total_price));
    }

    const createdIds: string[] = [];

    // 3. Insert initial PENDING settlement per seller
    for (const [sellerId, grossAmount] of sellerGrossMap.entries()) {
      const platformFee = Number(
        ((grossAmount * DEFAULT_PLATFORM_FEE_PERCENT) / 100).toFixed(2)
      );
      const netAmount = Math.max(0, grossAmount - platformFee);

      const { data: settlement, error: insErr } = await admin
        .from("settlements")
        .upsert(
          {
            order_id: orderId,
            seller_id: sellerId,
            status: "PENDING",
            currency: "NGN",
            gross_amount: grossAmount,
            platform_fee: platformFee,
            logistics_adjustment: 0,
            refund_deduction: 0,
            dispute_adjustment: 0,
            net_amount: netAmount,
            hold_reason: "FULFILMENT_PENDING",
          },
          { onConflict: "order_id, seller_id" }
        )
        .select("id")
        .single();

      if (insErr || !settlement) {
        console.error("Failed to upsert settlement:", insErr);
        continue;
      }

      createdIds.push(settlement.id);

      await recordAuditLog({
        actorId,
        action: "SETTLEMENT_CREATED",
        resourceType: "settlement",
        resourceId: settlement.id,
        metadata: {
          orderId,
          sellerId,
          grossAmount,
          netAmount,
        },
      });
    }

    return createdIds;
  }

  /**
   * Evaluates server-authoritative settlement eligibility for an order's sellers.
   * Conditions:
   * 1. Order payment is confirmed.
   * 2. Seller's delivery consignment is confirmed DELIVERED.
   * 3. No unresolved delivery failure on the consignment.
   * 4. No active/open dispute blocking the seller.
   * 5. Configured dispute window has expired.
   */
  static async evaluateSettlementEligibility(
    orderId: string,
    sellerId?: string,
    actorId: string = "system"
  ): Promise<{ evaluated: number; eligible: number }> {
    const admin = createAdminClient();

    let query = admin
      .from("settlements")
      .select("*")
      .eq("order_id", orderId)
      .eq("status", "PENDING");

    if (sellerId) {
      query = query.eq("seller_id", sellerId);
    }

    const { data: pendingSettlements, error } = await query;
    if (error || !pendingSettlements || pendingSettlements.length === 0) {
      return { evaluated: 0, eligible: 0 };
    }

    // Fetch master order
    const { data: order } = await admin
      .from("orders")
      .select("id, status, order_number")
      .eq("id", orderId)
      .single();

    if (!order) return { evaluated: 0, eligible: 0 };

    const isOrderPaid =
      order.status === "PAID" ||
      order.status === "PROCESSING" ||
      order.status === "PARTIALLY_FULFILLED" ||
      order.status === "COMPLETED";

    let eligibleCount = 0;

    for (const settlement of pendingSettlements) {
      // 1. Payment Verification Check
      if (!isOrderPaid) {
        await admin
          .from("settlements")
          .update({ hold_reason: "PAYMENT_PENDING", updated_at: new Date().toISOString() })
          .eq("id", settlement.id);
        continue;
      }

      // 2. Delivery Consignment Check (Strictly isolated to this seller)
      const { data: deliveries } = await admin
        .from("deliveries")
        .select("id, status, actual_delivery_date, updated_at")
        .eq("order_id", orderId)
        .eq("seller_id", settlement.seller_id);

      if (!deliveries || deliveries.length === 0) {
        await admin
          .from("settlements")
          .update({ hold_reason: "FULFILMENT_PENDING", updated_at: new Date().toISOString() })
          .eq("id", settlement.id);
        continue;
      }

      // Check if any delivery consignment for this seller failed
      const hasDeliveryFailure = deliveries.some((d) => d.status === "DELIVERY_FAILED");
      if (hasDeliveryFailure) {
        await admin
          .from("settlements")
          .update({ hold_reason: "DELIVERY_FAILED", updated_at: new Date().toISOString() })
          .eq("id", settlement.id);
        continue;
      }

      // Check if all delivery consignments for this seller have reached DELIVERED status
      const allDelivered = deliveries.every((d) => d.status === "DELIVERED");
      if (!allDelivered) {
        await admin
          .from("settlements")
          .update({ hold_reason: "FULFILMENT_PENDING", updated_at: new Date().toISOString() })
          .eq("id", settlement.id);
        continue;
      }

      // 3. Open Dispute Check (Strictly isolated to this seller)
      const { data: activeDisputes } = await admin
        .from("disputes")
        .select("id, status")
        .eq("related_order_id", orderId)
        .eq("seller_id", settlement.seller_id)
        .in("status", ["OPEN", "UNDER_REVIEW"]);

      if (activeDisputes && activeDisputes.length > 0) {
        await admin
          .from("settlements")
          .update({ hold_reason: "DISPUTE_OPEN", updated_at: new Date().toISOString() })
          .eq("id", settlement.id);
        continue;
      }

      // 4. Dispute Window Check (Based on latest delivery timestamp for this seller's consignments)
      const deliveryTimestamps = deliveries.map((d) =>
        d.actual_delivery_date
          ? new Date(d.actual_delivery_date).getTime()
          : new Date(d.updated_at).getTime()
      );
      const latestDeliveredTime = Math.max(...deliveryTimestamps);
      const holdExpiresAtMs = latestDeliveredTime + DEFAULT_DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();

      if (nowMs < holdExpiresAtMs) {
        await admin
          .from("settlements")
          .update({
            hold_reason: "DISPUTE_WINDOW_ACTIVE",
            hold_expires_at: new Date(holdExpiresAtMs).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", settlement.id);
        continue;
      }

      // 5. All Conditions Satisfied: Transition to ELIGIBLE
      const { error: updateErr } = await admin
        .from("settlements")
        .update({
          status: "ELIGIBLE",
          hold_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settlement.id);

      if (!updateErr) {
        eligibleCount++;
        await recordAuditLog({
          actorId,
          action: "SETTLEMENT_ELIGIBLE",
          resourceType: "settlement",
          resourceId: settlement.id,
          metadata: {
            orderId,
            sellerId: settlement.seller_id,
            netAmount: settlement.net_amount,
          },
        });

        await NotificationService.sendNotification({
          userId: settlement.seller_id,
          type: "SETTLEMENT_ELIGIBLE",
          title: "Settlement Funds Eligible",
          message: `Your settlement of ₦${Number(settlement.net_amount).toLocaleString()} for Order #${order.order_number} is now eligible for release.`,
        });
      }
    }

    return { evaluated: pendingSettlements.length, eligible: eligibleCount };
  }

  /**
   * Executes settlement state advancement from ELIGIBLE to SETTLED.
   */
  static async processSettlement(
    settlementId: string,
    actorId: string
  ): Promise<SettlementDetail> {
    const admin = createAdminClient();

    const { data: settlement, error: fetchErr } = await admin
      .from("settlements")
      .select("*")
      .eq("id", settlementId)
      .single();

    if (fetchErr || !settlement) {
      throw new Error("Settlement record not found.");
    }

    const currentStatus = settlement.status as SettlementStatus;
    if (!isValidSettlementTransition(currentStatus, "PROCESSING")) {
      throw new Error(`Cannot process settlement currently in '${currentStatus}' status.`);
    }

    // Advance to PROCESSING
    await admin
      .from("settlements")
      .update({ status: "PROCESSING", updated_at: new Date().toISOString() })
      .eq("id", settlementId);

    // Finalize accounting to SETTLED
    const nowIso = new Date().toISOString();
    const { data: settled, error: settleErr } = await admin
      .from("settlements")
      .update({
        status: "SETTLED",
        settled_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", settlementId)
      .select()
      .single();

    if (settleErr || !settled) {
      // Mark FAILED if update encounters database error
      await admin
        .from("settlements")
        .update({ status: "FAILED", updated_at: new Date().toISOString() })
        .eq("id", settlementId);
      throw new Error("Failed to finalize settlement to SETTLED status.");
    }

    await recordAuditLog({
      actorId,
      action: "SETTLEMENT_SETTLED",
      resourceType: "settlement",
      resourceId: settlementId,
      metadata: {
        orderId: settled.order_id,
        sellerId: settled.seller_id,
        netAmount: settled.net_amount,
      },
    });

    await NotificationService.sendNotification({
      userId: settled.seller_id,
      type: "SETTLEMENT_COMPLETED",
      title: "Settlement Settled",
      message: `Your settlement of ₦${Number(settled.net_amount).toLocaleString()} has settled successfully.`,
    });

    return this.mapSettlementRow(settled);
  }

  /**
   * Retries a previously FAILED settlement attempt.
   */
  static async retrySettlement(
    settlementId: string,
    actorId: string
  ): Promise<SettlementDetail> {
    const admin = createAdminClient();
    const { data: settlement } = await admin
      .from("settlements")
      .select("*")
      .eq("id", settlementId)
      .single();

    if (!settlement || settlement.status !== "FAILED") {
      throw new Error("Only FAILED settlements can be retried.");
    }

    return this.processSettlement(settlementId, actorId);
  }

  /**
   * Applies dispute or refund deductions to a seller's settlement ledger.
   */
  static async applyDisputeAdjustment(
    orderId: string,
    sellerId: string,
    refundAmount: number,
    disputeId: string,
    actorId: string
  ): Promise<void> {
    const admin = createAdminClient();

    const { data: settlement } = await admin
      .from("settlements")
      .select("*")
      .eq("order_id", orderId)
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (!settlement) return;

    const newRefundDeduction = Number(settlement.refund_deduction) + refundAmount;
    const gross = Number(settlement.gross_amount);
    const platformFee = Number(settlement.platform_fee);
    const logisticsAdj = Number(settlement.logistics_adjustment);
    const disputeAdj = Number(settlement.dispute_adjustment);

    const newNet = Math.max(
      0,
      gross - platformFee - logisticsAdj - newRefundDeduction - disputeAdj
    );

    await admin
      .from("settlements")
      .update({
        refund_deduction: newRefundDeduction,
        net_amount: newNet,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settlement.id);

    await recordAuditLog({
      actorId,
      action: "SETTLEMENT_ADJUSTED",
      resourceType: "settlement",
      resourceId: settlement.id,
      metadata: {
        disputeId,
        refundDeduction: newRefundDeduction,
        netAmount: newNet,
      },
    });
  }

  /**
   * Maps a raw database row to a typed SettlementDetail object.
   */
  static mapSettlementRow(row: Record<string, unknown>): SettlementDetail {
    return {
      id: row.id as string,
      orderId: row.order_id as string,
      orderNumber: (row.order_number as string) || undefined,
      sellerId: row.seller_id as string,
      sellerName: (row.seller_name as string) || undefined,
      status: row.status as SettlementStatus,
      currency: "NGN",
      grossAmount: Number(row.gross_amount),
      platformFee: Number(row.platform_fee),
      logisticsAdjustment: Number(row.logistics_adjustment),
      refundDeduction: Number(row.refund_deduction),
      disputeAdjustment: Number(row.dispute_adjustment),
      netAmount: Number(row.net_amount),
      holdReason: (row.hold_reason as string) || null,
      holdExpiresAt: (row.hold_expires_at as string) || null,
      settledAt: (row.settled_at as string) || null,
      payoutReference: (row.payout_reference as string) || null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
