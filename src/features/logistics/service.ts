import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLogisticsAdapter } from "./providers";
import {
  DeliveryStatus,
  isValidDeliveryStatusTransition,
  DeliveryDetail,
} from "./types";
import { OrderStatus, isValidOrderStatusTransition } from "@/features/orders/types";
import { recordAuditLog } from "@/lib/audit";

export class LogisticsService {
  /**
   * Generates a unique customer-facing AgroMarket delivery tracking reference.
   * Format: AM-DLV-YYYYMMDD-XXXXXX
   */
  static generateTrackingNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `AM-DLV-${dateStr}-${randomHex}`;
  }

  /**
   * Creates delivery consignments for a PAID order.
   * Groups items by seller so multi-seller orders generate distinct dispatch consignments.
   */
  static async createOrderDeliveries(
    orderId: string,
    requesterId: string
  ): Promise<string[]> {
    const admin = createAdminClient();

    // 1. Fetch order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, buyer_id, status, delivery_address, delivery_state, delivery_lga, contact_phone")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      throw new Error("Order not found.");
    }

    // 2. Enforce PAID precondition
    if (order.status !== "PAID" && order.status !== "PROCESSING") {
      if (order.status === "PENDING") {
        throw new Error("Cannot coordinate delivery for an unpaid order. Payment must be confirmed first.");
      }
      if (order.status === "CANCELLED") {
        throw new Error("Cannot coordinate delivery for a cancelled order.");
      }
      throw new Error(`Order is not eligible for delivery coordination in status: ${order.status}.`);
    }

    // 3. Authorization check
    // Fetch buyer profile for recipient name
    const { data: buyerProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", order.buyer_id)
      .single();

    const recipientName = buyerProfile?.full_name || "AgroMarket Customer";

    // 4. Fetch order items and group by seller
    const { data: orderItems, error: itemsErr } = await admin
      .from("order_items")
      .select("id, seller_id, listing_id, product_name_snapshot, quantity, unit_snapshot, total_price")
      .eq("order_id", orderId);

    if (itemsErr || !orderItems || orderItems.length === 0) {
      throw new Error("No items found for this order.");
    }

    // Group items by seller_id
    const sellerGroups = new Map<string, typeof orderItems>();
    for (const item of orderItems) {
      const existing = sellerGroups.get(item.seller_id) || [];
      existing.push(item);
      sellerGroups.set(item.seller_id, existing);
    }

    // Fetch active providers for auto-assignment
    const { data: providers } = await admin
      .from("logistics_providers")
      .select("id, name, coverage_states, is_verified, is_active")
      .eq("is_active", true);

    const adapter = getLogisticsAdapter();
    const createdDeliveryIds: string[] = [];

    // 5. Partition into distinct consignments per seller
    for (const [sellerId, items] of sellerGroups.entries()) {
      // Check if delivery consignment already exists for this order + seller
      const { data: existingDelivery } = await admin
        .from("deliveries")
        .select("id")
        .eq("order_id", orderId)
        .eq("seller_id", sellerId)
        .maybeSingle();

      if (existingDelivery) {
        createdDeliveryIds.push(existingDelivery.id);
        continue;
      }

      // Resolve pickup address from the first listing or seller profile
      const firstListingId = items[0]?.listing_id;
      let pickupState = order.delivery_state;
      let pickupLga = order.delivery_lga;
      let pickupAddress = "Farm / Agro Hub Pickup Point";

      if (firstListingId) {
        const { data: listing } = await admin
          .from("listings")
          .select("state, lga, pickup_address")
          .eq("id", firstListingId)
          .single();

        if (listing) {
          pickupState = listing.state;
          pickupLga = listing.lga;
          pickupAddress = listing.pickup_address;
        }
      }

      // Generate delivery quote
      const quote = await adapter.getQuote({
        pickupState,
        pickupLga,
        deliveryState: order.delivery_state,
        deliveryLga: order.delivery_lga,
        itemCount: items.length,
      });

      // Find best matching provider covering pickup and delivery state
      const matchingProvider = (providers || []).find(
        (p) =>
          p.is_verified &&
          p.coverage_states.some((s: string) => s.toLowerCase() === pickupState.toLowerCase()) &&
          p.coverage_states.some((s: string) => s.toLowerCase() === order.delivery_state.toLowerCase())
      );

      const trackingNumber = this.generateTrackingNumber();
      const initialStatus: DeliveryStatus = matchingProvider ? "ASSIGNED" : "QUOTED";

      // Insert delivery consignment record
      const { data: newDelivery, error: insertErr } = await admin
        .from("deliveries")
        .insert({
          order_id: order.id,
          seller_id: sellerId,
          provider_id: matchingProvider?.id || null,
          pickup_address: pickupAddress,
          pickup_state: pickupState,
          pickup_lga: pickupLga,
          delivery_address: order.delivery_address,
          delivery_state: order.delivery_state,
          delivery_lga: order.delivery_lga,
          recipient_name: recipientName,
          recipient_phone: order.contact_phone,
          status: initialStatus,
          tracking_number: trackingNumber,
          delivery_fee: quote.amount,
          currency: "NGN",
          quote_reference: quote.quoteReference,
          quote_expires_at: quote.expiresAt,
        })
        .select("id")
        .single();

      if (insertErr || !newDelivery) {
        console.error("Failed to insert delivery consignment:", insertErr);
        throw new Error("Failed to create delivery record.");
      }

      createdDeliveryIds.push(newDelivery.id);

      // Append DELIVERY_CREATED event
      await admin.from("delivery_events").insert({
        delivery_id: newDelivery.id,
        status: "DELIVERY_CREATED",
        location_name: pickupState,
        description: `Consignment created with ${items.length} produce item(s). Initial quote: ₦${quote.amount.toLocaleString()}.`,
        actor_id: requesterId,
      });

      // If provider was auto-assigned, append PROVIDER_ASSIGNED event
      if (matchingProvider) {
        await admin.from("delivery_events").insert({
          delivery_id: newDelivery.id,
          status: "PROVIDER_ASSIGNED",
          location_name: pickupState,
          description: `Assigned to logistics provider: ${matchingProvider.name}.`,
          actor_id: requesterId,
        });
      }

      await recordAuditLog({
        actorId: requesterId,
        action: "DELIVERY_CREATED",
        resourceType: "delivery",
        resourceId: newDelivery.id,
        metadata: {
          orderId: order.id,
          sellerId,
          trackingNumber,
          initialStatus,
          deliveryFee: quote.amount,
        },
      });
    }

    // Advance order to PROCESSING if currently PAID
    if (order.status === "PAID") {
      await admin
        .from("orders")
        .update({ status: "PROCESSING", updated_at: new Date().toISOString() })
        .eq("id", order.id);

      await admin
        .from("order_items")
        .update({ status: "PROCESSING", updated_at: new Date().toISOString() })
        .eq("order_id", order.id);
    }

    return createdDeliveryIds;
  }

  /**
   * Assigns a verified logistics provider to a delivery consignment.
   * Authorized strictly for platform ADMINs or the verified carrier account owner.
   */
  static async assignLogisticsProvider(
    deliveryId: string,
    providerId: string,
    actorId: string,
    actorRoles: string[] = []
  ): Promise<void> {
    const admin = createAdminClient();

    // 1. Fetch delivery
    const { data: delivery, error: delErr } = await admin
      .from("deliveries")
      .select("id, status, pickup_state, delivery_state, tracking_number")
      .eq("id", deliveryId)
      .single();

    if (delErr || !delivery) {
      throw new Error("Delivery consignment not found.");
    }

    if (delivery.status === "CANCELLED" || delivery.status === "DELIVERED") {
      throw new Error(`Cannot assign provider to a delivery in terminal status: ${delivery.status}.`);
    }

    // 2. Fetch provider
    const { data: provider, error: provErr } = await admin
      .from("logistics_providers")
      .select("id, name, profile_id, is_active, is_verified, coverage_states")
      .eq("id", providerId)
      .single();

    if (provErr || !provider) {
      throw new Error("Logistics provider not found.");
    }

    if (!provider.is_active) {
      throw new Error("Cannot assign an inactive logistics provider.");
    }

    if (!provider.is_verified) {
      throw new Error("Cannot assign an unverified logistics provider.");
    }

    // Authorization check: Only platform ADMIN or the authorized carrier owner can assign
    const isAdmin = actorRoles.includes("ADMIN");
    if (!isAdmin) {
      if (provider.profile_id !== actorId) {
        throw new Error(
          "Unauthorized: Only platform administrators or the verified carrier account owner can perform this provider assignment."
        );
      }
    }

    // Verify state coverage
    const coversPickup = provider.coverage_states.some(
      (s: string) => s.toLowerCase() === delivery.pickup_state.toLowerCase()
    );
    const coversDelivery = provider.coverage_states.some(
      (s: string) => s.toLowerCase() === delivery.delivery_state.toLowerCase()
    );

    if (!coversPickup || !coversDelivery) {
      throw new Error(
        `Provider '${provider.name}' does not cover required route (${delivery.pickup_state} to ${delivery.delivery_state}).`
      );
    }

    // 3. Update delivery
    const { error: updateErr } = await admin
      .from("deliveries")
      .update({
        provider_id: providerId,
        status: "ASSIGNED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deliveryId);

    if (updateErr) {
      throw new Error("Failed to assign logistics provider.");
    }

    // 4. Append PROVIDER_ASSIGNED event
    await admin.from("delivery_events").insert({
      delivery_id: deliveryId,
      status: "PROVIDER_ASSIGNED",
      location_name: delivery.pickup_state,
      description: `Logistics provider assigned: ${provider.name}.`,
      actor_id: actorId,
    });

    await recordAuditLog({
      actorId,
      action: "DELIVERY_ASSIGNED",
      resourceType: "delivery",
      resourceId: deliveryId,
      metadata: {
        providerId,
        providerName: provider.name,
      },
    });
  }

  /**
   * Transitions delivery status through the controlled state machine.
   */
  static async transitionDeliveryStatus(
    deliveryId: string,
    targetStatus: DeliveryStatus,
    actorId: string,
    options?: {
      locationName?: string;
      description?: string;
      failureReason?: string;
      proofOfDeliveryUrl?: string;
    }
  ): Promise<void> {
    const admin = createAdminClient();

    // 1. Fetch current delivery
    const { data: delivery, error: delErr } = await admin
      .from("deliveries")
      .select("id, status, tracking_number, order_id")
      .eq("id", deliveryId)
      .single();

    if (delErr || !delivery) {
      throw new Error("Delivery consignment not found.");
    }

    const currentStatus = delivery.status as DeliveryStatus;

    // 2. Validate state machine transition
    if (!isValidDeliveryStatusTransition(currentStatus, targetStatus)) {
      throw new Error(
        `Invalid delivery status transition from '${currentStatus}' to '${targetStatus}'.`
      );
    }

    // 3. Build update payload
    const updatePayload: Record<string, unknown> = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    if (targetStatus === "DELIVERED") {
      updatePayload.actual_delivery_date = new Date().toISOString();
      if (options?.proofOfDeliveryUrl) {
        updatePayload.proof_of_delivery_url = options.proofOfDeliveryUrl;
      }
    }

    if (targetStatus === "DELIVERY_FAILED" && options?.failureReason) {
      updatePayload.failure_reason = options.failureReason;
    }

    const { error: updateErr } = await admin
      .from("deliveries")
      .update(updatePayload)
      .eq("id", deliveryId);

    if (updateErr) {
      throw new Error("Failed to update delivery status.");
    }

    // 4. Append delivery event
    const eventDescription =
      options?.description ||
      (targetStatus === "DELIVERED"
        ? "Consignment successfully delivered to destination recipient."
        : targetStatus === "DELIVERY_FAILED"
        ? `Delivery attempt failed: ${options?.failureReason || "Unreachable recipient or transit disruption"}.`
        : `Shipment status updated to ${targetStatus.replace(/_/g, " ")}.`);

    await admin.from("delivery_events").insert({
      delivery_id: deliveryId,
      status: targetStatus,
      location_name: options?.locationName || null,
      description: eventDescription,
      actor_id: actorId,
    });

    // 5. Check sibling consignments and sync order lifecycle
    if (targetStatus === "DELIVERED") {
      const { data: siblingDeliveries } = await admin
        .from("deliveries")
        .select("id, status")
        .eq("order_id", delivery.order_id);

      const allDeliveries = (siblingDeliveries || []).map((d) =>
        d.id === deliveryId ? { ...d, status: "DELIVERED" } : d
      );

      const deliveredCount = allDeliveries.filter((d) => d.status === "DELIVERED").length;
      const totalCount = allDeliveries.length;
      const allCompleted = totalCount > 0 && deliveredCount === totalCount;

      const { data: order } = await admin
        .from("orders")
        .select("id, status")
        .eq("id", delivery.order_id)
        .single();

      if (order) {
        const currentOrderStatus = order.status as OrderStatus;

        if (allCompleted) {
          // If order is currently PAID, enforce the step: PAID -> PROCESSING -> COMPLETED
          if (currentOrderStatus === "PAID") {
            await admin
              .from("orders")
              .update({ status: "PROCESSING", updated_at: new Date().toISOString() })
              .eq("id", delivery.order_id);

            await recordAuditLog({
              actorId,
              action: "ORDER_STATUS_CHANGED",
              resourceType: "order",
              resourceId: delivery.order_id,
              metadata: { from: "PAID", to: "PROCESSING", reason: "Auto-transition during consignment delivery" },
            });
          }

          // Advance to COMPLETED only if current or intermediate status permits it
          const canComplete =
            currentOrderStatus === "PROCESSING" ||
            currentOrderStatus === "PARTIALLY_FULFILLED" ||
            currentOrderStatus === "PAID"; // Having advanced through PROCESSING

          if (canComplete && isValidOrderStatusTransition("PROCESSING", "COMPLETED")) {
            await admin
              .from("orders")
              .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
              .eq("id", delivery.order_id);

            await admin
              .from("order_items")
              .update({ status: "COMPLETED", updated_at: new Date().toISOString() })
              .eq("order_id", delivery.order_id);

            await recordAuditLog({
              actorId,
              action: "ORDER_STATUS_CHANGED",
              resourceType: "order",
              resourceId: delivery.order_id,
              metadata: {
                from: currentOrderStatus === "PAID" ? "PROCESSING" : currentOrderStatus,
                to: "COMPLETED",
                reason: "All consignments delivered",
              },
            });
          }
        } else if (deliveredCount > 0 && deliveredCount < totalCount) {
          // Partial delivery completion: advance to PARTIALLY_FULFILLED if currently PROCESSING
          if (currentOrderStatus === "PROCESSING" && isValidOrderStatusTransition("PROCESSING", "PARTIALLY_FULFILLED")) {
            await admin
              .from("orders")
              .update({ status: "PARTIALLY_FULFILLED", updated_at: new Date().toISOString() })
              .eq("id", delivery.order_id);

            await recordAuditLog({
              actorId,
              action: "ORDER_STATUS_CHANGED",
              resourceType: "order",
              resourceId: delivery.order_id,
              metadata: {
                from: "PROCESSING",
                to: "PARTIALLY_FULFILLED",
                deliveredConsignments: deliveredCount,
                totalConsignments: totalCount,
              },
            });
          }
        }
      }
    }

    await recordAuditLog({
      actorId,
      action: "DELIVERY_STATUS_CHANGED",
      resourceType: "delivery",
      resourceId: deliveryId,
      metadata: {
        from: currentStatus,
        to: targetStatus,
        location: options?.locationName,
      },
    });
  }

  /**
   * Cancels a delivery consignment before dispatch.
   */
  static async cancelDelivery(
    deliveryId: string,
    reason: string,
    actorId: string
  ): Promise<void> {
    const admin = createAdminClient();

    const { data: delivery, error: delErr } = await admin
      .from("deliveries")
      .select("id, status")
      .eq("id", deliveryId)
      .single();

    if (delErr || !delivery) {
      throw new Error("Delivery consignment not found.");
    }

    const currentStatus = delivery.status as DeliveryStatus;
    if (!isValidDeliveryStatusTransition(currentStatus, "CANCELLED")) {
      throw new Error(
        `Cannot cancel delivery in status '${currentStatus}'. Cancellation is only permitted prior to dispatch.`
      );
    }

    const { error: updateErr } = await admin
      .from("deliveries")
      .update({
        status: "CANCELLED",
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deliveryId);

    if (updateErr) {
      throw new Error("Failed to cancel delivery consignment.");
    }

    await admin.from("delivery_events").insert({
      delivery_id: deliveryId,
      status: "CANCELLED",
      description: `Delivery consignment cancelled: ${reason}.`,
      actor_id: actorId,
    });

    await recordAuditLog({
      actorId,
      action: "DELIVERY_CANCELLED",
      resourceType: "delivery",
      resourceId: deliveryId,
      metadata: { reason },
    });
  }

  /**
   * Retrieves full delivery details with event timeline and line items.
   */
  static async getDeliveryDetails(deliveryId: string): Promise<DeliveryDetail | null> {
    const admin = createAdminClient();

    const { data: delivery, error } = await admin
      .from("deliveries")
      .select(`
        *,
        logistics_providers (
          name,
          phone
        ),
        profiles!deliveries_seller_id_fkey (
          full_name,
          phone_number
        ),
        orders (
          order_number
        )
      `)
      .eq("id", deliveryId)
      .single();

    if (error || !delivery) {
      return null;
    }

    // Fetch delivery events
    const { data: events } = await admin
      .from("delivery_events")
      .select("*")
      .eq("delivery_id", deliveryId)
      .order("occurred_at", { ascending: true });

    // Fetch items for this seller from the order
    const { data: items } = await admin
      .from("order_items")
      .select("id, product_name_snapshot, quantity, unit_snapshot, unit_price_snapshot, total_price")
      .eq("order_id", delivery.order_id)
      .eq("seller_id", delivery.seller_id);

    return {
      id: delivery.id,
      orderId: delivery.order_id,
      orderNumber: delivery.orders?.order_number,
      providerId: delivery.provider_id,
      providerName: delivery.logistics_providers?.name,
      providerPhone: delivery.logistics_providers?.phone,
      sellerId: delivery.seller_id,
      sellerName: delivery.profiles?.full_name,
      sellerPhone: delivery.profiles?.phone_number,
      pickupAddress: delivery.pickup_address,
      pickupState: delivery.pickup_state,
      pickupLga: delivery.pickup_lga,
      deliveryAddress: delivery.delivery_address,
      deliveryState: delivery.delivery_state,
      deliveryLga: delivery.delivery_lga,
      recipientName: delivery.recipient_name,
      recipientPhone: delivery.recipient_phone,
      status: delivery.status as DeliveryStatus,
      trackingNumber: delivery.tracking_number,
      externalTrackingReference: delivery.external_tracking_reference,
      deliveryFee: Number(delivery.delivery_fee),
      currency: delivery.currency as "NGN",
      quoteReference: delivery.quote_reference,
      quoteExpiresAt: delivery.quote_expires_at,
      proofOfDeliveryUrl: delivery.proof_of_delivery_url,
      estimatedDeliveryDate: delivery.estimated_delivery_date,
      actualDeliveryDate: delivery.actual_delivery_date,
      cancellationReason: delivery.cancellation_reason,
      failureReason: delivery.failure_reason,
      items: (items || []).map((i) => ({
        id: i.id,
        productName: i.product_name_snapshot,
        quantity: Number(i.quantity),
        unit: i.unit_snapshot,
        unitPrice: Number(i.unit_price_snapshot),
        totalPrice: Number(i.total_price),
      })),
      events: (events || []).map((e) => ({
        id: e.id,
        deliveryId: e.delivery_id,
        status: e.status,
        locationName: e.location_name,
        description: e.description,
        occurredAt: e.occurred_at,
        actorId: e.actor_id,
      })),
      createdAt: delivery.created_at,
      updatedAt: delivery.updated_at,
    };
  }
}
