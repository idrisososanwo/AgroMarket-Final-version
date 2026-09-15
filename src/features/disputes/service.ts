import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/audit";
import { NotificationService } from "@/features/notifications/service";
import { RefundService } from "@/features/payments/refund-service";
import { SettlementService } from "@/features/settlements/service";
import { DEFAULT_DISPUTE_WINDOW_DAYS } from "@/features/settlements/constants";
import {
  DisputeDetail,
  DisputeStatus,
  DisputeType,
  ResolutionType,
  EvidenceType,
  CreateDisputeInput,
  SellerResponseInput,
  ResolveDisputeInput,
  isValidDisputeTransition,
} from "./types";

export class DisputeService {
  /**
   * Creates a formal buyer dispute.
   * Derives authoritative values (buyer identity, seller ownership, disputed amount) server-side.
   */
  static async createDispute(
    input: CreateDisputeInput,
    buyerId: string
  ): Promise<DisputeDetail> {
    const admin = createAdminClient();

    // 1. Authoritative verification of order ownership
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, buyer_id, status, total_amount")
      .eq("id", input.orderId)
      .single();

    if (orderErr || !order) {
      throw new Error("Order not found.");
    }

    if (order.buyer_id !== buyerId) {
      throw new Error("Unauthorized: You may only dispute orders that you placed.");
    }

    // 2. Authoritative verification of seller participation
    const { data: sellerItems, error: itemsErr } = await admin
      .from("order_items")
      .select("id, seller_id, total_price, product_name_snapshot")
      .eq("order_id", input.orderId)
      .eq("seller_id", input.sellerId);

    if (itemsErr || !sellerItems || sellerItems.length === 0) {
      throw new Error("Specified seller has no items in this order.");
    }

    // 3. Calculate server-authoritative disputed amount
    let disputedAmount = 0;
    if (input.orderItemId) {
      const matchedItem = sellerItems.find((i) => i.id === input.orderItemId);
      if (!matchedItem) {
        throw new Error("Disputed item does not belong to this order or seller.");
      }
      disputedAmount = Number(matchedItem.total_price);
    } else {
      disputedAmount = sellerItems.reduce((sum, i) => sum + Number(i.total_price), 0);
    }

    // 4. Enforce Dispute Window (e.g. 7 days post-delivery)
    const { data: delivery } = await admin
      .from("deliveries")
      .select("status, actual_delivery_date, updated_at")
      .eq("order_id", input.orderId)
      .eq("seller_id", input.sellerId)
      .maybeSingle();

    if (delivery && delivery.status === "DELIVERED") {
      const deliveredTime = delivery.actual_delivery_date
        ? new Date(delivery.actual_delivery_date).getTime()
        : new Date(delivery.updated_at).getTime();

      const windowExpiresMs = deliveredTime + DEFAULT_DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() > windowExpiresMs) {
        throw new Error(
          `The dispute window of ${DEFAULT_DISPUTE_WINDOW_DAYS} days has expired for this delivery.`
        );
      }
    }

    // 5. Insert formal dispute record
    const { data: dispute, error: insErr } = await admin
      .from("disputes")
      .insert({
        opened_by: buyerId,
        seller_id: input.sellerId,
        related_order_id: input.orderId,
        order_item_id: input.orderItemId ?? null,
        dispute_type: input.disputeType,
        reason: input.reason,
        description: input.description,
        disputed_amount: disputedAmount,
        currency: "NGN",
        status: "OPEN",
      })
      .select()
      .single();

    if (insErr || !dispute) {
      console.error("Failed to insert dispute record:", insErr);
      throw new Error("Failed to create dispute record.");
    }

    // 6. Insert evidence URLs if provided
    if (input.evidenceUrls && input.evidenceUrls.length > 0) {
      const evidenceRows = input.evidenceUrls.map((url) => ({
        dispute_id: dispute.id,
        uploaded_by: buyerId,
        evidence_type: "DOCUMENT" as const,
        file_url: url,
        description: "Initial evidence uploaded by buyer.",
      }));
      await admin.from("dispute_evidence").insert(evidenceRows);
    }

    // 7. Freeze/Hold seller settlement
    await admin
      .from("settlements")
      .update({ hold_reason: "DISPUTE_OPEN", updated_at: new Date().toISOString() })
      .eq("order_id", input.orderId)
      .eq("seller_id", input.sellerId);

    // 8. Audit & Notification
    await recordAuditLog({
      actorId: buyerId,
      action: "DISPUTE_CREATED",
      resourceType: "dispute",
      resourceId: dispute.id,
      metadata: {
        orderId: input.orderId,
        sellerId: input.sellerId,
        disputeType: input.disputeType,
        disputedAmount,
      },
    });

    await NotificationService.sendNotification({
      userId: input.sellerId,
      type: "DISPUTE_OPENED",
      title: "New Dispute Opened",
      message: `A dispute has been opened by the buyer for Order #${order.order_number}. Reason: ${input.reason}.`,
    });

    return this.getDisputeById(dispute.id) as Promise<DisputeDetail>;
  }

  /**
   * Records a seller's response and optional evidence to a dispute.
   */
  static async respondToDispute(
    input: SellerResponseInput,
    sellerId: string
  ): Promise<DisputeDetail> {
    const admin = createAdminClient();

    const { data: dispute, error: fetchErr } = await admin
      .from("disputes")
      .select("id, opened_by, seller_id, status, related_order_id")
      .eq("id", input.disputeId)
      .single();

    if (fetchErr || !dispute) {
      throw new Error("Dispute not found.");
    }

    if (dispute.seller_id !== sellerId) {
      throw new Error("Unauthorized: You may only respond to disputes filed against your store.");
    }

    if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
      throw new Error(`Cannot respond to dispute in '${dispute.status}' status.`);
    }

    const { data: updated, error: updateErr } = await admin
      .from("disputes")
      .update({
        seller_response: input.response,
        seller_responded_at: new Date().toISOString(),
        status: "UNDER_REVIEW",
        updated_at: new Date().toISOString(),
      })
      .eq("id", dispute.id)
      .select()
      .single();

    if (updateErr || !updated) {
      throw new Error("Failed to record seller response.");
    }

    // Attach evidence if provided
    if (input.evidenceUrls && input.evidenceUrls.length > 0) {
      const evidenceRows = input.evidenceUrls.map((url) => ({
        dispute_id: dispute.id,
        uploaded_by: sellerId,
        evidence_type: "DELIVERY_PROOF" as const,
        file_url: url,
        description: "Seller response proof.",
      }));
      await admin.from("dispute_evidence").insert(evidenceRows);
    }

    await recordAuditLog({
      actorId: sellerId,
      action: "DISPUTE_UNDER_REVIEW",
      resourceType: "dispute",
      resourceId: dispute.id,
      metadata: {
        orderId: dispute.related_order_id,
        status: "UNDER_REVIEW",
      },
    });

    await NotificationService.sendNotification({
      userId: dispute.opened_by,
      type: "DISPUTE_SELLER_RESPONDED",
      title: "Seller Responded to Dispute",
      message: "The seller has submitted an official response to your dispute.",
    });

    return this.getDisputeById(dispute.id) as Promise<DisputeDetail>;
  }

  /**
   * Resolves a dispute with structured resolution. Strictly admin authority.
   */
  static async resolveDispute(
    input: ResolveDisputeInput,
    adminId: string
  ): Promise<DisputeDetail> {
    const admin = createAdminClient();

    const { data: dispute, error: fetchErr } = await admin
      .from("disputes")
      .select("*")
      .eq("id", input.disputeId)
      .single();

    if (fetchErr || !dispute) {
      throw new Error("Dispute not found.");
    }

    const currentStatus = dispute.status as DisputeStatus;
    if (!isValidDisputeTransition(currentStatus, "RESOLVED")) {
      throw new Error(`Cannot resolve dispute from current '${currentStatus}' status.`);
    }

    // 1. Calculate and execute refund if applicable
    let refundAmount = 0;
    if (input.resolutionType === "BUYER_REFUND" || input.resolutionType === "PARTIAL_REFUND") {
      if (input.resolutionType === "BUYER_REFUND") {
        refundAmount = Number(dispute.disputed_amount);
      } else {
        refundAmount = input.refundAmount || 0;
        if (refundAmount <= 0 || refundAmount > Number(dispute.disputed_amount)) {
          throw new Error(
            `Partial refund must be between ₦1.00 and ₦${Number(dispute.disputed_amount).toLocaleString()}.`
          );
        }
      }

      // Fetch payment
      const { data: payment } = await admin
        .from("payments")
        .select("id")
        .eq("order_id", dispute.related_order_id)
        .in("status", ["SUCCESSFUL", "PAID"])
        .single();

      if (!payment) {
        throw new Error("No successful payment record found to execute refund against.");
      }

      // Execute refund
      await RefundService.processRefund(
        {
          orderId: dispute.related_order_id,
          paymentId: payment.id,
          disputeId: dispute.id,
          sellerId: dispute.seller_id,
          orderItemId: dispute.order_item_id || undefined,
          amount: refundAmount,
          reason: `Dispute resolution (${input.resolutionType}): ${input.resolutionNotes}`,
        },
        adminId
      );

      // Deduct refund from seller's settlement
      await SettlementService.applyDisputeAdjustment(
        dispute.related_order_id,
        dispute.seller_id,
        refundAmount,
        dispute.id,
        adminId
      );
    }

    // 2. Finalize dispute status
    const nowIso = new Date().toISOString();
    const { data: resolved, error: updateErr } = await admin
      .from("disputes")
      .update({
        status: "RESOLVED",
        resolution_type: input.resolutionType,
        resolution_notes: input.resolutionNotes,
        refund_amount: refundAmount,
        resolved_by: adminId,
        resolved_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", dispute.id)
      .select()
      .single();

    if (updateErr || !resolved) {
      throw new Error("Failed to finalize dispute resolution.");
    }

    // 3. Clear settlement hold if no refund or dispute resolved
    await admin
      .from("settlements")
      .update({ hold_reason: null, updated_at: nowIso })
      .eq("order_id", dispute.related_order_id)
      .eq("seller_id", dispute.seller_id);

    await recordAuditLog({
      actorId: adminId,
      action: "DISPUTE_RESOLVED",
      resourceType: "dispute",
      resourceId: dispute.id,
      metadata: {
        resolutionType: input.resolutionType,
        refundAmount,
        resolutionNotes: input.resolutionNotes,
      },
    });

    await NotificationService.sendNotification({
      userId: dispute.opened_by,
      type: "DISPUTE_RESOLVED",
      title: "Dispute Resolved",
      message: `Your dispute has been resolved: ${input.resolutionType.replace(/_/g, " ")}.`,
    });

    await NotificationService.sendNotification({
      userId: dispute.seller_id,
      type: "DISPUTE_RESOLVED",
      title: "Dispute Resolved",
      message: `Dispute on your store has been resolved: ${input.resolutionType.replace(/_/g, " ")}.`,
    });

    return this.getDisputeById(dispute.id) as Promise<DisputeDetail>;
  }

  /**
   * Rejects a dispute without settlement alteration. Admin only.
   */
  static async rejectDispute(
    disputeId: string,
    notes: string,
    adminId: string
  ): Promise<DisputeDetail> {
    const admin = createAdminClient();

    const { data: dispute } = await admin
      .from("disputes")
      .select("*")
      .eq("id", disputeId)
      .single();

    if (!dispute) throw new Error("Dispute not found.");

    const currentStatus = dispute.status as DisputeStatus;
    if (!isValidDisputeTransition(currentStatus, "REJECTED")) {
      throw new Error(`Cannot reject dispute in '${currentStatus}' status.`);
    }

    const nowIso = new Date().toISOString();
    const { data: rejected, error } = await admin
      .from("disputes")
      .update({
        status: "REJECTED",
        resolution_type: "NO_ACTION",
        resolution_notes: notes,
        resolved_by: adminId,
        resolved_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", disputeId)
      .select()
      .single();

    if (error || !rejected) throw new Error("Failed to reject dispute.");

    // Clear settlement hold
    await admin
      .from("settlements")
      .update({ hold_reason: null, updated_at: nowIso })
      .eq("order_id", dispute.related_order_id)
      .eq("seller_id", dispute.seller_id);

    await recordAuditLog({
      actorId: adminId,
      action: "DISPUTE_REJECTED",
      resourceType: "dispute",
      resourceId: disputeId,
      metadata: { notes },
    });

    return this.getDisputeById(disputeId) as Promise<DisputeDetail>;
  }

  /**
   * Closes a resolved or rejected dispute. Admin only.
   */
  static async closeDispute(
    disputeId: string,
    adminId: string
  ): Promise<DisputeDetail> {
    const admin = createAdminClient();

    const { data: dispute } = await admin
      .from("disputes")
      .select("status")
      .eq("id", disputeId)
      .single();

    if (!dispute) throw new Error("Dispute not found.");

    const currentStatus = dispute.status as DisputeStatus;
    if (!isValidDisputeTransition(currentStatus, "CLOSED")) {
      throw new Error(`Cannot close dispute from current '${currentStatus}' status.`);
    }

    const nowIso = new Date().toISOString();
    const { data: closed, error } = await admin
      .from("disputes")
      .update({
        status: "CLOSED",
        closed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", disputeId)
      .select()
      .single();

    if (error || !closed) throw new Error("Failed to close dispute.");

    await recordAuditLog({
      actorId: adminId,
      action: "DISPUTE_CLOSED",
      resourceType: "dispute",
      resourceId: disputeId,
    });

    return this.getDisputeById(disputeId) as Promise<DisputeDetail>;
  }

  /**
   * Cancels a dispute prior to admin resolution. Buyer only.
   */
  static async cancelDispute(
    disputeId: string,
    buyerId: string,
    reason: string
  ): Promise<DisputeDetail> {
    const admin = createAdminClient();

    const { data: dispute } = await admin
      .from("disputes")
      .select("*")
      .eq("id", disputeId)
      .single();

    if (!dispute) throw new Error("Dispute not found.");

    if (dispute.opened_by !== buyerId) {
      throw new Error("Unauthorized: Only the buyer who opened this dispute may cancel it.");
    }

    const currentStatus = dispute.status as DisputeStatus;
    if (!isValidDisputeTransition(currentStatus, "CANCELLED")) {
      throw new Error(`Cannot cancel dispute in '${currentStatus}' status.`);
    }

    const nowIso = new Date().toISOString();
    const { data: cancelled, error } = await admin
      .from("disputes")
      .update({
        status: "CANCELLED",
        resolution_notes: `Cancelled by buyer: ${reason}`,
        closed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", disputeId)
      .select()
      .single();

    if (error || !cancelled) throw new Error("Failed to cancel dispute.");

    // Clear settlement hold
    await admin
      .from("settlements")
      .update({ hold_reason: null, updated_at: nowIso })
      .eq("order_id", dispute.related_order_id)
      .eq("seller_id", dispute.seller_id);

    await recordAuditLog({
      actorId: buyerId,
      action: "DISPUTE_CANCELLED",
      resourceType: "dispute",
      resourceId: disputeId,
      metadata: { reason },
    });

    return this.getDisputeById(disputeId) as Promise<DisputeDetail>;
  }

  /**
   * Uploads supplementary proof/evidence to an existing dispute.
   */
  static async addEvidence(
    disputeId: string,
    evidenceType: EvidenceType,
    fileUrl: string,
    description: string | undefined,
    uploaderId: string
  ): Promise<void> {
    const admin = createAdminClient();

    const { data: dispute } = await admin
      .from("disputes")
      .select("id")
      .eq("id", disputeId)
      .single();

    if (!dispute) {
      throw new Error("Dispute not found.");
    }

    const { error } = await admin.from("dispute_evidence").insert({
      dispute_id: disputeId,
      uploaded_by: uploaderId,
      evidence_type: evidenceType,
      file_url: fileUrl,
      description: description || null,
    });

    if (error) {
      console.error("addEvidence error:", error);
      throw new Error("Failed to upload evidence.");
    }

    await recordAuditLog({
      actorId: uploaderId,
      action: "DISPUTE_EVIDENCE_ADDED",
      resourceType: "dispute",
      resourceId: disputeId,
      metadata: { evidenceType, fileUrl },
    });
  }

  /**
   * Retrieves single dispute by ID with full metadata, evidence, and participants.
   */
  static async getDisputeById(disputeId: string): Promise<DisputeDetail | null> {
    const admin = createAdminClient();

    const { data: row, error } = await admin
      .from("disputes")
      .select(`
        *,
        orders!inner(order_number),
        order_items(product_name_snapshot),
        buyer:profiles!disputes_opened_by_fkey(full_name, email, phone),
        seller:profiles!disputes_seller_id_fkey(full_name, phone)
      `)
      .eq("id", disputeId)
      .maybeSingle();

    if (error || !row) return null;

    const { data: evidence } = await admin
      .from("dispute_evidence")
      .select(`
        *,
        uploader:profiles!dispute_evidence_uploaded_by_fkey(full_name)
      `)
      .eq("dispute_id", disputeId)
      .order("created_at", { ascending: true });

    return {
      id: row.id,
      openedBy: row.opened_by,
      buyerName: row.buyer?.full_name,
      buyerEmail: row.buyer?.email,
      buyerPhone: row.buyer?.phone,
      sellerId: row.seller_id,
      sellerName: row.seller?.full_name,
      sellerPhone: row.seller?.phone,
      orderId: row.related_order_id,
      orderNumber: row.orders?.order_number,
      orderItemId: row.order_item_id,
      productName: row.order_items?.product_name_snapshot,
      disputeType: row.dispute_type as DisputeType,
      reason: row.reason,
      description: row.description,
      disputedAmount: Number(row.disputed_amount),
      currency: "NGN",
      status: row.status as DisputeStatus,
      resolutionType: (row.resolution_type as ResolutionType) || null,
      refundAmount: Number(row.refund_amount || 0),
      resolutionNotes: row.resolution_notes,
      sellerResponse: row.seller_response,
      sellerRespondedAt: row.seller_responded_at,
      assignedAdminId: row.assigned_admin_id,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      evidence: (evidence || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        disputeId: e.dispute_id as string,
        uploadedBy: e.uploaded_by as string,
        uploadedByName: (e.uploader as { full_name?: string } | null)?.full_name,
        evidenceType: e.evidence_type as EvidenceType,
        fileUrl: e.file_url as string,
        description: (e.description as string) || null,
        createdAt: e.created_at as string,
      })),
    };
  }
}
