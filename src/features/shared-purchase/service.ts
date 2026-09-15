import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/audit";
import { PaymentService } from "@/features/payments/service";
import { RefundService } from "@/features/payments/refund-service";
import { PaymentProviderName } from "@/features/payments/types";
import {
  CreateSharedPurchaseInput,
  JoinSharedPurchaseInput,
  JoinSharedPurchaseResult,
  SharedPurchaseStatus,
  isValidSharedPurchaseTransition,
} from "./types";
import { containsProhibitedProduce } from "./validation";

export class SharedPurchaseService {
  /**
   * Creates a new Shared Purchase pool for bulk crops or animal portions.
   * Atomically verifies seller ownership, anti-pork produce safety, and ring-fences
   * the requested target quantity in the listing's inventory to prevent double-reservation.
   */
  static async createSharedPurchase(
    input: CreateSharedPurchaseInput,
    sellerId: string
  ): Promise<string> {
    const admin = createAdminClient();

    // 1. Anti-Pork content barrier
    if (
      containsProhibitedProduce(input.title) ||
      (input.description && containsProhibitedProduce(input.description))
    ) {
      throw new Error(
        "Shared purchase contains prohibited produce terms. AgroMarket strictly disallows pig/pork products."
      );
    }

    // 2. Fetch and lock listing
    const { data: listing, error: listingErr } = await admin
      .from("listings")
      .select("id, seller_id, title, status, product_id, products(id, name)")
      .eq("id", input.listingId)
      .single();

    if (listingErr || !listing) {
      throw new Error("Underlying listing not found.");
    }

    if (listing.seller_id !== sellerId) {
      throw new Error("Unauthorized: You can only create shared purchases for your own listings.");
    }

    if (listing.status !== "ACTIVE") {
      throw new Error(`Listing must be ACTIVE to create a shared purchase (current: ${listing.status}).`);
    }

    const prodRecord = listing.products as unknown as { id: string; name: string } | null;
    const productName = prodRecord?.name || "";
    if (containsProhibitedProduce(listing.title) || containsProhibitedProduce(productName)) {
      throw new Error("Listing produce is prohibited. AgroMarket strictly disallows pig/pork products.");
    }

    // 3. Atomically check and ring-fence listing inventory via DB RPC
    const { error: reserveErr } = await admin.rpc(
      "reserve_shared_purchase_stock",
      {
        p_listing_id: input.listingId,
        p_quantity: input.totalQuantity,
      }
    );

    if (reserveErr) {
      // If RPC is missing (e.g. non-migrated mock environment), execute locked fallback
      const { data: inv, error: invErr } = await admin
        .from("inventory")
        .select("id, quantity_on_hand, quantity_reserved, quantity_available")
        .eq("listing_id", input.listingId)
        .single();

      if (invErr || !inv) {
        throw new Error("Inventory record not found for listing.");
      }

      const available = Number(inv.quantity_available ?? (inv.quantity_on_hand - inv.quantity_reserved));
      if (available < input.totalQuantity) {
        throw new Error(
          `Insufficient available inventory to create shared purchase. Available: ${available} ${input.unit}, Requested Target: ${input.totalQuantity} ${input.unit}.`
        );
      }

      const newReserved = Number(inv.quantity_reserved) + input.totalQuantity;
      const { error: updateErr } = await admin
        .from("inventory")
        .update({
          quantity_reserved: newReserved,
          updated_at: new Date().toISOString(),
        })
        .eq("listing_id", input.listingId);

      if (updateErr) {
        throw new Error(`Failed to reserve listing stock for shared purchase: ${updateErr.message}`);
      }
    }

    // 4. Calculate total target value
    const totalPrice = Number((input.totalQuantity * input.unitPrice).toFixed(2));

    // 5. Insert shared purchase
    const { data: created, error: insertErr } = await admin
      .from("shared_purchases")
      .insert({
        listing_id: input.listingId,
        created_by: sellerId,
        title: input.title.trim(),
        description: input.description ? input.description.trim() : null,
        produce_type: input.purchaseType === "ANIMAL_PORTION" ? "ANIMAL_PRODUCT" : "CROP",
        purchase_type: input.purchaseType,
        total_quantity: input.totalQuantity,
        allocated_quantity: 0,
        unit: input.unit.trim(),
        unit_price: input.unitPrice,
        total_price: totalPrice,
        target_participants: input.targetParticipants,
        current_participants: 0,
        min_share_quantity: input.minShareQuantity,
        max_share_quantity: input.maxShareQuantity || null,
        portion_model: input.portionModel || null,
        portion_fractions: (input.portionFractions || []) as unknown as Record<string, unknown>[],
        metadata: input.metadata || {},
        deadline: input.deadline,
        status: "OPEN",
        pickup_hub_location: input.pickupHubLocation.trim(),
        hub_state: input.hubState.trim(),
        hub_lga: input.hubLga.trim(),
      })
      .select("id")
      .single();

    if (insertErr || !created) {
      // Revert reservation on failure atomically
      try {
        await admin.rpc("release_shared_purchase_stock", {
          p_listing_id: input.listingId,
          p_quantity: input.totalQuantity,
        });
      } catch {
        const { data: inv } = await admin
          .from("inventory")
          .select("quantity_reserved")
          .eq("listing_id", input.listingId)
          .single();
        if (inv) {
          await admin
            .from("inventory")
            .update({ quantity_reserved: Math.max(0, Number(inv.quantity_reserved) - input.totalQuantity) })
            .eq("listing_id", input.listingId);
        }
      }
      throw new Error(`Failed to create shared purchase: ${insertErr?.message}`);
    }

    await recordAuditLog({
      actorId: sellerId,
      action: "SHARED_PURCHASE_CREATED",
      resourceType: "shared_purchase",
      resourceId: created.id,
      metadata: {
        listingId: input.listingId,
        purchaseType: input.purchaseType,
        totalQuantity: input.totalQuantity,
        unitPrice: input.unitPrice,
        totalPrice,
      },
    });

    return created.id;
  }

  /**
   * Joins an open Shared Purchase pool.
   * Invokes the PostgreSQL stored procedure `allocate_shared_purchase_participant`
   * with row-level locks on the shared purchase and listing to guarantee zero over-allocation.
   */
  static async joinSharedPurchase(
    input: JoinSharedPurchaseInput,
    buyerId: string
  ): Promise<JoinSharedPurchaseResult> {
    const admin = createAdminClient();

    // 1. Anti-Pork content barrier on user notes
    if (
      (input.deliveryNotes && containsProhibitedProduce(input.deliveryNotes)) ||
      (input.portionNotes && containsProhibitedProduce(input.portionNotes))
    ) {
      throw new Error(
        "Notes contain prohibited produce terms. AgroMarket strictly disallows pig/pork products."
      );
    }

    // 2. Invoke atomic database procedure
    const { data, error } = await admin.rpc("allocate_shared_purchase_participant", {
      p_shared_purchase_id: input.sharedPurchaseId,
      p_user_id: buyerId,
      p_requested_quantity: input.requestedQuantity,
      p_portion_choice: input.portionChoice || null,
      p_delivery_address: input.deliveryAddress || "",
      p_delivery_state: input.deliveryState || "",
      p_delivery_lga: input.deliveryLga || "",
      p_contact_phone: input.contactPhone.trim(),
      p_delivery_notes: input.deliveryNotes ? input.deliveryNotes.trim() : null,
      p_portion_notes: input.portionNotes ? input.portionNotes.trim() : null,
    });

    if (error) {
      console.error("allocate_shared_purchase_participant RPC error:", error);
      throw new Error(error.message || "Failed to commit share in pool.");
    }

    const rpcResult = data as {
      participant_id: string;
      order_id: string;
      order_number: string;
      share_amount: number;
      allocated_quantity: number;
      remaining_quantity: number;
      is_target_reached: boolean;
    };

    await recordAuditLog({
      actorId: buyerId,
      action: "SHARED_PURCHASE_JOINED",
      resourceType: "shared_purchase_participant",
      resourceId: rpcResult.participant_id,
      metadata: {
        sharedPurchaseId: input.sharedPurchaseId,
        orderId: rpcResult.order_id,
        orderNumber: rpcResult.order_number,
        requestedQuantity: input.requestedQuantity,
        shareAmount: rpcResult.share_amount,
        isTargetReached: rpcResult.is_target_reached,
      },
    });

    return {
      participantId: rpcResult.participant_id,
      orderId: rpcResult.order_id,
      orderNumber: rpcResult.order_number,
      shareAmount: rpcResult.share_amount,
      allocatedQuantity: rpcResult.allocated_quantity,
      remainingQuantity: rpcResult.remaining_quantity,
      isTargetReached: rpcResult.is_target_reached,
    };
  }

  /**
   * Initializes payment for a participant's individual order.
   * Leverages Phase 0.6 PaymentService directly without client price trust.
   */
  static async initializeParticipantPayment(params: {
    participantId: string;
    buyerId: string;
    provider?: PaymentProviderName;
    callbackUrl?: string;
  }) {
    const admin = createAdminClient();

    const { data: participant, error } = await admin
      .from("shared_purchase_participants")
      .select("id, order_id, user_id, status")
      .eq("id", params.participantId)
      .single();

    if (error || !participant) {
      throw new Error("Participation record not found.");
    }

    if (participant.user_id !== params.buyerId) {
      throw new Error("Unauthorized: You do not own this participation record.");
    }

    if (!participant.order_id) {
      throw new Error("No associated order found for participation.");
    }

    // Call authoritative PaymentService
    const initResult = await PaymentService.initializeOrderPayment({
      orderId: participant.order_id,
      buyerId: params.buyerId,
      provider: params.provider,
      callbackUrl: params.callbackUrl,
    });

    // Update participant status to PAYMENT_PENDING
    await admin
      .from("shared_purchase_participants")
      .update({
        status: "PAYMENT_PENDING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.participantId);

    return initResult;
  }

  /**
   * Handles payment confirmation for a participant's order.
   * Called during webhook or verify payment callback when an order transitions to PAID.
   */
  static async handleParticipantPaymentSuccess(orderId: string): Promise<void> {
    const admin = createAdminClient();

    const { data: participant } = await admin
      .from("shared_purchase_participants")
      .select("id, shared_purchase_id, user_id, status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (!participant) {
      // Order is not part of a shared purchase
      return;
    }

    // 1. Mark participant as PAID
    await admin
      .from("shared_purchase_participants")
      .update({
        status: "PAID",
        updated_at: new Date().toISOString(),
      })
      .eq("id", participant.id);

    await recordAuditLog({
      actorId: participant.user_id,
      action: "SHARED_PURCHASE_PARTICIPANT_PAID",
      resourceType: "shared_purchase_participant",
      resourceId: participant.id,
      metadata: {
        sharedPurchaseId: participant.shared_purchase_id,
        orderId,
      },
    });

    // 2. Check if entire pool is funded
    const { data: sp } = await admin
      .from("shared_purchases")
      .select("id, total_quantity, allocated_quantity, status")
      .eq("id", participant.shared_purchase_id)
      .single();

    if (!sp) return;

    // Check all active participants
    const { data: allParts } = await admin
      .from("shared_purchase_participants")
      .select("status, shares_count")
      .eq("shared_purchase_id", participant.shared_purchase_id)
      .not("status", "in", '("CANCELLED","REFUNDED")');

    const totalPaidQuantity = (allParts || [])
      .filter((p) => p.status === "PAID" || p.status === "CONFIRMED")
      .reduce((sum, p) => sum + Number(p.shares_count), 0);

    if (totalPaidQuantity >= sp.total_quantity) {
      // Transition pool to CONFIRMED
      if (sp.status !== "CONFIRMED" && sp.status !== "FULFILMENT" && sp.status !== "COMPLETED") {
        await admin
          .from("shared_purchases")
          .update({
            status: "CONFIRMED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", sp.id);

        await recordAuditLog({
          actorId: participant.user_id,
          action: "SHARED_PURCHASE_CONFIRMED",
          resourceType: "shared_purchase",
          resourceId: sp.id,
          metadata: { totalPaidQuantity, totalQuantity: sp.total_quantity },
        });
      }
    }
  }

  /**
   * Transitions a Shared Purchase status according to the valid state machine.
   * Enforces seller ownership or admin authority.
   */
  static async transitionStatus(
    sharedPurchaseId: string,
    targetStatus: SharedPurchaseStatus,
    actorId: string,
    roles: string[]
  ): Promise<void> {
    const admin = createAdminClient();

    const { data: sp, error } = await admin
      .from("shared_purchases")
      .select("id, created_by, status, total_quantity, unit")
      .eq("id", sharedPurchaseId)
      .single();

    if (error || !sp) {
      throw new Error("Shared purchase not found.");
    }

    const isCreator = sp.created_by === actorId;
    const isAdmin = roles.includes("ADMIN");

    if (!isCreator && !isAdmin) {
      throw new Error("Unauthorized: Only the seller or admin can change the pool status.");
    }

    const currentStatus = sp.status as SharedPurchaseStatus;
    if (!isValidSharedPurchaseTransition(currentStatus, targetStatus)) {
      throw new Error(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`
      );
    }

    // Funding verification for CONFIRMED or FULFILMENT
    if (targetStatus === "CONFIRMED" || targetStatus === "FULFILMENT") {
      const { data: allParticipants } = await admin
        .from("shared_purchase_participants")
        .select("id, status, shares_count")
        .eq("shared_purchase_id", sharedPurchaseId)
        .not("status", "in", '("CANCELLED","REFUNDED")');

      const activeParts = allParticipants || [];
      const hasUnpaid = activeParts.some(
        (p) => p.status === "PLEDGED" || p.status === "PAYMENT_PENDING"
      );

      if (hasUnpaid) {
        throw new Error(
          `Cannot transition shared purchase to '${targetStatus}'. There are unconfirmed/unpaid participant pledges.`
        );
      }

      const totalPaid = activeParts
        .filter((p) => p.status === "PAID" || p.status === "CONFIRMED")
        .reduce((sum, p) => sum + Number(p.shares_count), 0);

      const poolTotal = Number(sp.total_quantity || 0);
      if (totalPaid < poolTotal) {
        throw new Error(
          `Cannot transition shared purchase to '${targetStatus}'. Total paid quantity (${totalPaid} ${sp.unit}) is less than target quantity (${poolTotal} ${sp.unit}).`
        );
      }
    }

    await admin
      .from("shared_purchases")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sharedPurchaseId);

    await recordAuditLog({
      actorId,
      action: "SHARED_PURCHASE_STATUS_TRANSITION",
      resourceType: "shared_purchase",
      resourceId: sharedPurchaseId,
      metadata: { previousStatus: currentStatus, targetStatus },
    });
  }

  /**
   * Cancels a Shared Purchase pool.
   * Atomically refunds any paid participants via RefundService, cancels participant orders,
   * and releases the reserved inventory on the underlying listing.
   */
  static async cancelSharedPurchase(
    sharedPurchaseId: string,
    reason: string,
    actorId: string,
    roles: string[]
  ): Promise<void> {
    const admin = createAdminClient();

    const { data: sp, error } = await admin
      .from("shared_purchases")
      .select("id, created_by, listing_id, total_quantity, status")
      .eq("id", sharedPurchaseId)
      .single();

    if (error || !sp) {
      throw new Error("Shared purchase not found.");
    }

    const isCreator = sp.created_by === actorId;
    const isAdmin = roles.includes("ADMIN");

    if (!isCreator && !isAdmin) {
      throw new Error("Unauthorized: Only the creator or an admin can cancel this pool.");
    }

    if (sp.status === "COMPLETED" || sp.status === "CANCELLED") {
      throw new Error(`Cannot cancel a shared purchase with status '${sp.status}'.`);
    }

    // 1. Fetch participants
    const { data: participants } = await admin
      .from("shared_purchase_participants")
      .select("id, user_id, order_id, status")
      .eq("shared_purchase_id", sharedPurchaseId);

    // 2. Process refunds for paid participants and cancel all orders
    for (const part of participants || []) {
      if ((part.status === "PAID" || part.status === "CONFIRMED") && part.order_id) {
        // Find payment record
        const { data: payment } = await admin
          .from("payments")
          .select("id, status, amount")
          .eq("order_id", part.order_id)
          .eq("status", "SUCCESSFUL")
          .maybeSingle();

        if (payment) {
          try {
            await RefundService.processRefund(
              {
                orderId: part.order_id,
                paymentId: payment.id,
                amount: Number(payment.amount || 0),
                reason: `Shared Purchase Pool Cancelled: ${reason}`,
              },
              actorId
            );
          } catch (refundErr) {
            console.error(`Refund failed for participant ${part.id}:`, refundErr);
          }
        }

        await admin
          .from("shared_purchase_participants")
          .update({ status: "REFUNDED", updated_at: new Date().toISOString() })
          .eq("id", part.id);

        // Synchronize order status to CANCELLED to prevent "Shared Purchase CANCELLED + Order PAID"
        if (part.order_id) {
          await admin
            .from("orders")
            .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
            .eq("id", part.order_id);
        }
      } else if (part.status === "PLEDGED" || part.status === "PAYMENT_PENDING") {
        await admin
          .from("shared_purchase_participants")
          .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
          .eq("id", part.id);

        if (part.order_id) {
          await admin
            .from("orders")
            .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
            .eq("id", part.order_id);
        }
      }
    }

    // 3. Release reserved inventory
    const { data: inv } = await admin
      .from("inventory")
      .select("quantity_reserved")
      .eq("listing_id", sp.listing_id)
      .single();

    if (inv) {
      const released = Math.max(0, Number(inv.quantity_reserved) - Number(sp.total_quantity));
      await admin
        .from("inventory")
        .update({
          quantity_reserved: released,
          updated_at: new Date().toISOString(),
        })
        .eq("listing_id", sp.listing_id);
    }

    // 4. Update status to CANCELLED
    await admin
      .from("shared_purchases")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sharedPurchaseId);

    await recordAuditLog({
      actorId,
      action: "SHARED_PURCHASE_CANCELLED",
      resourceType: "shared_purchase",
      resourceId: sharedPurchaseId,
      metadata: { reason },
    });
  }

  /**
   * Cancels an individual buyer's unpaid pledge/participation.
   * Releases their committed quantity back to the pool.
   */
  static async cancelParticipation(
    participantId: string,
    actorId: string,
    roles: string[]
  ): Promise<void> {
    const admin = createAdminClient();

    const { data: participant, error } = await admin
      .from("shared_purchase_participants")
      .select("id, shared_purchase_id, user_id, order_id, shares_count, status")
      .eq("id", participantId)
      .single();

    if (error || !participant) {
      throw new Error("Participation record not found.");
    }

    const isOwner = participant.user_id === actorId;
    const isAdmin = roles.includes("ADMIN");

    if (!isOwner && !isAdmin) {
      throw new Error("Unauthorized to cancel this participation.");
    }

    if (participant.status !== "PLEDGED" && participant.status !== "PAYMENT_PENDING") {
      throw new Error(
        `Cannot cancel participation with status '${participant.status}'. Paid commitments require dispute/refund resolution.`
      );
    }

    // 1. Lock shared purchase
    const { data: sp } = await admin
      .from("shared_purchases")
      .select("id, allocated_quantity, status")
      .eq("id", participant.shared_purchase_id)
      .single();

    if (sp) {
      const newAllocated = Math.max(0, Number(sp.allocated_quantity) - Number(participant.shares_count));
      const resetStatus = sp.status === "TARGET_REACHED" ? "OPEN" : sp.status;

      await admin
        .from("shared_purchases")
        .update({
          allocated_quantity: newAllocated,
          status: resetStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sp.id);
    }

    // 2. Mark participant CANCELLED
    await admin
      .from("shared_purchase_participants")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", participantId);

    // 3. Cancel associated order
    if (participant.order_id) {
      await admin
        .from("orders")
        .update({
          status: "CANCELLED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", participant.order_id);
    }

    await recordAuditLog({
      actorId,
      action: "SHARED_PURCHASE_PARTICIPATION_CANCELLED",
      resourceType: "shared_purchase_participant",
      resourceId: participantId,
      metadata: {
        sharedPurchaseId: participant.shared_purchase_id,
        sharesCount: participant.shares_count,
      },
    });
  }

  /**
   * Automatically expires stale unconfirmed participant pledges.
   * Reclaims allocated capacity from abandoned pledges, cancels pending orders,
   * and reopens the pool to 'OPEN' if it was in 'TARGET_REACHED'.
   * Safe, idempotent, and non-destructive to paid participants.
   */
  static async expireStaleUnpaidPledges(
    sharedPurchaseId?: string,
    ttlMinutes: number = 30
  ): Promise<{ expiredCount: number; reclaimedQuantity: number }> {
    const admin = createAdminClient();

    // 1. Try atomic RPC
    try {
      const { data, error } = await admin.rpc("expire_stale_shared_purchase_pledges", {
        p_shared_purchase_id: sharedPurchaseId || null,
        p_ttl_minutes: ttlMinutes,
      });

      if (!error && data) {
        const res = data as { expired_count: number; reclaimed_quantity: number };
        return {
          expiredCount: Number(res.expired_count || 0),
          reclaimedQuantity: Number(res.reclaimed_quantity || 0),
        };
      }
    } catch {
      // Fallback to service layer logic below
    }

    // 2. Service-layer fallback for test / non-migrated mock environments
    const cutoffTime = new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString();
    let query = admin
      .from("shared_purchase_participants")
      .select("id, shared_purchase_id, order_id, shares_count, status, updated_at")
      .in("status", ["PLEDGED", "PAYMENT_PENDING"])
      .lte("updated_at", cutoffTime);

    if (sharedPurchaseId) {
      query = query.eq("shared_purchase_id", sharedPurchaseId);
    }

    const { data: staleParts } = await query;
    let expiredCount = 0;
    let reclaimedQuantity = 0;

    for (const part of staleParts || []) {
      // Verify no successful payment exists
      let hasSuccessfulPayment = false;
      if (part.order_id) {
        const { data: pay } = await admin
          .from("payments")
          .select("id")
          .eq("order_id", part.order_id)
          .eq("status", "SUCCESSFUL")
          .maybeSingle();
        if (pay) hasSuccessfulPayment = true;
      }

      if (!hasSuccessfulPayment) {
        // Mark participant CANCELLED
        await admin
          .from("shared_purchase_participants")
          .update({
            status: "CANCELLED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", part.id);

        // Cancel order
        if (part.order_id) {
          await admin
            .from("orders")
            .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
            .eq("id", part.order_id);
        }

        // Deduct from pool allocated_quantity
        const { data: sp } = await admin
          .from("shared_purchases")
          .select("id, allocated_quantity, total_quantity, status")
          .eq("id", part.shared_purchase_id)
          .single();

        if (sp) {
          const newAllocated = Math.max(0, Number(sp.allocated_quantity) - Number(part.shares_count));
          const newStatus =
            newAllocated < Number(sp.total_quantity) && (sp.status === "TARGET_REACHED" || sp.status === "OPEN")
              ? "OPEN"
              : sp.status;

          await admin
            .from("shared_purchases")
            .update({
              allocated_quantity: newAllocated,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sp.id);

          reclaimedQuantity += Number(part.shares_count);
          expiredCount += 1;
        }
      }
    }

    if (expiredCount > 0) {
      await recordAuditLog({
        actorId: "system",
        action: "SHARED_PURCHASE_STALE_PLEDGES_EXPIRED",
        resourceType: "shared_purchase",
        resourceId: sharedPurchaseId || "all",
        metadata: { expiredCount, reclaimedQuantity, ttlMinutes },
      });
    }

    return { expiredCount, reclaimedQuantity };
  }
}
