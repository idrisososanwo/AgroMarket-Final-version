"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { ActionResponse, createReviewSchema } from "./validation";

/**
 * Creates a verified review for a Service, Marketplace Listing/Seller, or Equipment.
 *
 * AUTHORIZATION & RULES:
 * - Requires authenticated session.
 * - author_id is bound strictly to auth.uid().
 * - Self-review prevention: Users cannot review their own services, listings, or equipment.
 * - Service review eligibility: Verifies user has a COMPLETED service_request with the service.
 * - Marketplace transaction verification: Checks for completed/delivered order.
 * - Equipment transaction verification: Checks for returned/completed rental.
 * - Duplicate review prevention: Disallows duplicate reviews for the same target by the same author.
 * - Immutability: Reviews are append-only.
 */
export async function createReviewAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ reviewId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = createReviewSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check the review inputs.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      targetType,
      rating,
      comment,
      serviceId,
      orderId,
      listingId,
      sellerId,
      equipmentId,
    } = parsed.data;

    const supabase = await createClient();

    let resolvedSellerId = sellerId || null;
    let isVerifiedTransaction = false;

    // =========================================================================
    // 1. SERVICE REVIEW VALIDATION & ELIGIBILITY
    // =========================================================================
    if (targetType === "SERVICE") {
      if (!serviceId) {
        return {
          success: false,
          error: "Service ID is required for service reviews.",
        };
      }

      // Fetch service to verify existence and check self-review
      const { data: service, error: servErr } = await supabase
        .from("services")
        .select("id, provider_id")
        .eq("id", serviceId)
        .maybeSingle();

      if (servErr || !service) {
        return {
          success: false,
          error: "Selected service offering does not exist.",
        };
      }

      if (service.provider_id === user.id) {
        return {
          success: false,
          error: "You cannot review your own service offering.",
        };
      }

      // Verify transaction eligibility: must have a COMPLETED service_request
      const { data: completedRequest } = await supabase
        .from("service_requests")
        .select("id")
        .eq("service_id", serviceId)
        .eq("client_id", user.id)
        .eq("status", "COMPLETED")
        .maybeSingle();

      if (!completedRequest) {
        return {
          success: false,
          error: "You can only review a service after a completed service booking.",
        };
      }

      isVerifiedTransaction = true;

      // Duplicate review prevention
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("author_id", user.id)
        .eq("service_id", serviceId)
        .maybeSingle();

      if (existingReview) {
        return {
          success: false,
          error: "You have already submitted a review for this service.",
        };
      }
    }

    // =========================================================================
    // 2. MARKETPLACE REVIEW VALIDATION & TRANSACTION CHECK
    // =========================================================================
    if (targetType === "MARKETPLACE") {
      if (listingId) {
        const { data: listing, error: listErr } = await supabase
          .from("listings")
          .select("id, seller_id")
          .eq("id", listingId)
          .maybeSingle();

        if (listErr || !listing) {
          return {
            success: false,
            error: "Selected marketplace listing does not exist.",
          };
        }

        if (listing.seller_id === user.id) {
          return {
            success: false,
            error: "You cannot review your own marketplace listing.",
          };
        }

        resolvedSellerId = listing.seller_id;

        // Duplicate review check for this listing
        const { data: existingReview } = await supabase
          .from("reviews")
          .select("id")
          .eq("author_id", user.id)
          .eq("listing_id", listingId)
          .maybeSingle();

        if (existingReview) {
          return {
            success: false,
            error: "You have already submitted a review for this listing.",
          };
        }
      }

      if (resolvedSellerId && resolvedSellerId === user.id) {
        return {
          success: false,
          error: "You cannot review yourself as a seller.",
        };
      }

      // Verify order transaction if orderId provided
      if (orderId) {
        const { data: order } = await supabase
          .from("orders")
          .select("id, buyer_id, status")
          .eq("id", orderId)
          .maybeSingle();

        if (order && order.buyer_id === user.id && order.status === "COMPLETED") {
          isVerifiedTransaction = true;
        }

        // Duplicate check for this order
        const { data: existingOrderReview } = await supabase
          .from("reviews")
          .select("id")
          .eq("author_id", user.id)
          .eq("order_id", orderId)
          .maybeSingle();

        if (existingOrderReview) {
          return {
            success: false,
            error: "You have already submitted a review for this order.",
          };
        }
      }
    }

    // =========================================================================
    // 3. EQUIPMENT REVIEW VALIDATION & RENTAL CHECK
    // =========================================================================
    if (targetType === "EQUIPMENT") {
      if (!equipmentId) {
        return {
          success: false,
          error: "Equipment ID is required for equipment reviews.",
        };
      }

      const { data: equipment, error: equipErr } = await supabase
        .from("equipment")
        .select("id, owner_id")
        .eq("id", equipmentId)
        .maybeSingle();

      if (equipErr || !equipment) {
        return {
          success: false,
          error: "Selected equipment does not exist.",
        };
      }

      if (equipment.owner_id === user.id) {
        return {
          success: false,
          error: "You cannot review your own equipment listing.",
        };
      }

      // Check for verified completed rental
      const { data: completedRental } = await supabase
        .from("equipment_rentals")
        .select("id")
        .eq("equipment_id", equipmentId)
        .eq("renter_id", user.id)
        .in("status", ["RETURNED", "COMPLETED"])
        .maybeSingle();

      if (completedRental) {
        isVerifiedTransaction = true;
      }

      // Duplicate review check
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("author_id", user.id)
        .eq("equipment_id", equipmentId)
        .maybeSingle();

      if (existingReview) {
        return {
          success: false,
          error: "You have already submitted a review for this equipment.",
        };
      }
    }

    // =========================================================================
    // 4. INSERT INTO public.reviews
    // =========================================================================
    const { data: newReview, error: insertErr } = await supabase
      .from("reviews")
      .insert({
        author_id: user.id,
        order_id: orderId || null,
        listing_id: listingId || null,
        seller_id: resolvedSellerId || null,
        service_id: serviceId || null,
        equipment_id: equipmentId || null,
        rating,
        comment: comment || null,
        is_verified_transaction: isVerifiedTransaction,
      })
      .select("id")
      .single();

    if (insertErr || !newReview) {
      console.error("Database error creating review:", insertErr);
      return {
        success: false,
        error: "Failed to submit review. Please try again later.",
      };
    }

    if (serviceId) revalidatePath(`/services/${serviceId}`);
    if (listingId) revalidatePath(`/marketplace/${listingId}`);

    return {
      success: true,
      data: { reviewId: newReview.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create review";
    return {
      success: false,
      error: message,
    };
  }
}
