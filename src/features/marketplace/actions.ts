"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAnyRole } from "@/lib/auth/server";
import {
  isValidStatusTransition,
  ListingStatus,
} from "./types";
import {
  ActionResponse,
  createListingSchema,
  transitionStatusSchema,
  updateInventorySchema,
  updateListingSchema,
} from "./validation";

/**
 * Creates a new seller listing with canonical product reference and initializes inventory.
 * Enforces:
 * 1. User has FARMER or BUSINESS role
 * 2. Strict anti-pork content validation
 * 3. Atomic insertion of listing and initial inventory
 */
export async function createListingAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ listingId: string }>> {
  try {
    const user = await requireAnyRole(["FARMER", "BUSINESS"]);
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = createListingSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify the form inputs.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      productId,
      farmId,
      title,
      description,
      pricePerUnit,
      unit,
      minimumOrderQuantity,
      quantityOnHand,
      state,
      lga,
      pickupAddress,
    } = parsed.data;

    const supabase = await createClient();

    // 1. Verify canonical product exists and is active
    const { data: canonicalProd, error: prodErr } = await supabase
      .from("products")
      .select("id, name, is_active")
      .eq("id", productId)
      .single();

    if (prodErr || !canonicalProd || !canonicalProd.is_active) {
      return {
        success: false,
        error: "Selected canonical product does not exist or is inactive.",
      };
    }

    // 2. Insert into public.listings
    const { data: newListing, error: listingErr } = await supabase
      .from("listings")
      .insert({
        seller_id: user.id,
        product_id: productId,
        farm_id: farmId ? farmId : null,
        title: title.trim(),
        description: description ? description.trim() : null,
        price_per_unit: pricePerUnit,
        currency: "NGN",
        unit: unit.trim(),
        minimum_order_quantity: minimumOrderQuantity,
        state: state.trim(),
        lga: lga.trim(),
        pickup_address: pickupAddress.trim(),
        status: "ACTIVE",
        is_verified: false,
      })
      .select("id")
      .single();

    if (listingErr || !newListing) {
      console.error("Error creating listing:", listingErr);
      return {
        success: false,
        error: listingErr?.message || "Failed to create listing in database.",
      };
    }

    // 3. Insert into public.inventory for this listing
    const { error: invErr } = await supabase.from("inventory").insert({
      listing_id: newListing.id,
      quantity_on_hand: quantityOnHand,
      quantity_reserved: 0,
    });

    if (invErr) {
      console.error("Error initializing inventory:", invErr);
      // Clean up orphaned listing if inventory initialization fails
      await supabase.from("listings").delete().eq("id", newListing.id);
      return {
        success: false,
        error: "Failed to initialize listing inventory. Please try again.",
      };
    }

    revalidatePath("/marketplace");
    revalidatePath("/farmer/listings");

    return {
      success: true,
      data: { listingId: newListing.id },
    };
  } catch (error: unknown) {
    console.error("createListingAction error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred while creating listing.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Updates an existing seller listing.
 * Enforces ownership: only the listing owner (seller_id = auth.uid()) can update.
 */
export async function updateListingAction(
  listingId: string,
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse> {
  try {
    const user = await requireAnyRole(["FARMER", "BUSINESS"]);
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = updateListingSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify the form inputs.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const supabase = await createClient();

    // 1. Enforce ownership
    const { data: existingListing, error: fetchErr } = await supabase
      .from("listings")
      .select("id, seller_id, status")
      .eq("id", listingId)
      .single();

    if (fetchErr || !existingListing) {
      return { success: false, error: "Listing not found." };
    }

    if (existingListing.seller_id !== user.id) {
      return { success: false, error: "Unauthorized: You do not own this listing." };
    }

    if (existingListing.status === "ARCHIVED") {
      return { success: false, error: "Archived listings cannot be updated." };
    }

    const {
      title,
      description,
      pricePerUnit,
      unit,
      minimumOrderQuantity,
      state,
      lga,
      pickupAddress,
    } = parsed.data;

    // 2. Update listing record
    const { error: updateErr } = await supabase
      .from("listings")
      .update({
        title: title.trim(),
        description: description ? description.trim() : null,
        price_per_unit: pricePerUnit,
        unit: unit.trim(),
        minimum_order_quantity: minimumOrderQuantity,
        state: state.trim(),
        lga: lga.trim(),
        pickup_address: pickupAddress.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId)
      .eq("seller_id", user.id);

    if (updateErr) {
      console.error("Error updating listing:", updateErr);
      return { success: false, error: updateErr.message || "Failed to update listing." };
    }

    revalidatePath("/marketplace");
    revalidatePath("/farmer/listings");
    revalidatePath(`/marketplace/${listingId}`);

    return { success: true };
  } catch (error: unknown) {
    console.error("updateListingAction error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred while updating listing.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Updates physical stock for a listing in public.inventory.
 * Enforces:
 * 1. User owns the parent listing
 * 2. quantity_on_hand >= quantity_reserved (Non-Negative Stock & No Overselling)
 */
export async function updateInventoryAction(
  listingId: string,
  quantityOnHand: number
): Promise<ActionResponse> {
  try {
    const user = await requireAnyRole(["FARMER", "BUSINESS"]);

    const parsed = updateInventorySchema.safeParse({ listingId, quantityOnHand });
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid stock quantity specified.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const supabase = await createClient();

    // 1. Verify ownership of parent listing
    const { data: listing, error: listErr } = await supabase
      .from("listings")
      .select("id, seller_id, status")
      .eq("id", listingId)
      .single();

    if (listErr || !listing) {
      return { success: false, error: "Listing not found." };
    }

    if (listing.seller_id !== user.id) {
      return { success: false, error: "Unauthorized: You do not own this listing." };
    }

    // 2. Fetch current inventory to compare with quantity_reserved
    const { data: inv, error: invErr } = await supabase
      .from("inventory")
      .select("quantity_reserved")
      .eq("listing_id", listingId)
      .single();

    if (invErr || !inv) {
      return { success: false, error: "Inventory record not found." };
    }

    const reserved = Number(inv.quantity_reserved || 0);
    const newOnHand = parsed.data.quantityOnHand;

    if (newOnHand < reserved) {
      return {
        success: false,
        error: `Cannot reduce quantity to ${newOnHand}. There are currently ${reserved} units reserved by pending orders.`,
      };
    }

    // 3. Update inventory
    const { error: updateErr } = await supabase
      .from("inventory")
      .update({
        quantity_on_hand: newOnHand,
        updated_at: new Date().toISOString(),
      })
      .eq("listing_id", listingId);

    if (updateErr) {
      console.error("Error updating inventory:", updateErr);
      return { success: false, error: updateErr.message || "Failed to update inventory." };
    }

    // If stock is now 0 and listing was ACTIVE, consider adjusting status or keep as active with 0 stock
    revalidatePath("/marketplace");
    revalidatePath("/farmer/listings");
    revalidatePath(`/marketplace/${listingId}`);

    return { success: true };
  } catch (error: unknown) {
    console.error("updateInventoryAction error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred while updating inventory.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Transitions listing status through the validated state machine:
 * DRAFT -> ACTIVE | ARCHIVED
 * ACTIVE -> PAUSED | OUT_OF_STOCK | ARCHIVED
 * PAUSED -> ACTIVE | ARCHIVED
 * OUT_OF_STOCK -> ACTIVE | ARCHIVED
 * ARCHIVED -> [Terminal]
 */
export async function transitionListingStatusAction(
  listingId: string,
  targetStatus: ListingStatus
): Promise<ActionResponse> {
  try {
    const user = await requireAnyRole(["FARMER", "BUSINESS"]);

    const parsed = transitionStatusSchema.safeParse({ listingId, targetStatus });
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid transition parameters.",
      };
    }

    const supabase = await createClient();

    // 1. Verify ownership & fetch current status
    const { data: listing, error: listErr } = await supabase
      .from("listings")
      .select("id, seller_id, status")
      .eq("id", listingId)
      .single();

    if (listErr || !listing) {
      return { success: false, error: "Listing not found." };
    }

    if (listing.seller_id !== user.id) {
      return { success: false, error: "Unauthorized: You do not own this listing." };
    }

    const currentStatus = listing.status as ListingStatus;

    // 2. Validate state machine transition
    if (!isValidStatusTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        error: `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`,
      };
    }

    // 3. Update status in database
    const { error: updateErr } = await supabase
      .from("listings")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId)
      .eq("seller_id", user.id);

    if (updateErr) {
      console.error("Error transitioning status:", updateErr);
      return { success: false, error: updateErr.message || "Failed to update status." };
    }

    revalidatePath("/marketplace");
    revalidatePath("/farmer/listings");
    revalidatePath(`/marketplace/${listingId}`);

    return { success: true };
  } catch (error: unknown) {
    console.error("transitionListingStatusAction error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred while transitioning status.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Safely removes or archives a seller produce listing.
 * Enforces:
 * 1. User has FARMER or BUSINESS role
 * 2. Strict seller ownership (listing.seller_id === auth.uid())
 * 3. Historical Order & Dispute Safety:
 *    - If historical order_items or disputes exist referencing this listing,
 *      hard deletion is prevented to preserve order/receipt integrity.
 *      Instead, the listing is safely transitioned to ARCHIVED status with 0 available inventory.
 *    - If no orders or disputes reference this listing, it is cleanly deleted
 *      from public.listings (cascading to public.inventory).
 */
export async function deleteListingAction(
  listingId: string
): Promise<ActionResponse<{ action: "DELETED" | "ARCHIVED"; message: string }>> {
  try {
    const user = await requireAnyRole(["FARMER", "BUSINESS"]);

    if (!listingId || typeof listingId !== "string") {
      return { success: false, error: "Invalid listing ID provided." };
    }

    const supabase = await createClient();

    // 1. Fetch listing to verify existence and ownership
    const { data: listing, error: listErr } = await supabase
      .from("listings")
      .select("id, seller_id, title, status")
      .eq("id", listingId)
      .single();

    if (listErr || !listing) {
      return { success: false, error: "Listing not found." };
    }

    if (listing.seller_id !== user.id) {
      return {
        success: false,
        error: "Unauthorized: You do not have permission to delete this listing.",
      };
    }

    // 2. Check for historical orders referencing this listing
    const { count: orderItemsCount, error: orderErr } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId);

    if (orderErr) {
      console.error("Error checking order items for listing deletion:", orderErr);
    }

    // 3. Check for disputes referencing this listing
    const { count: disputesCount, error: disputeErr } = await supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId);

    if (disputeErr) {
      console.error("Error checking disputes for listing deletion:", disputeErr);
    }

    const hasAssociatedOrders = orderItemsCount !== null && orderItemsCount > 0;
    const hasAssociatedDisputes = disputesCount !== null && disputesCount > 0;

    if (hasAssociatedOrders || hasAssociatedDisputes) {
      // Historical references exist: Archive listing to preserve receipt & payment records
      const { error: archiveErr } = await supabase
        .from("listings")
        .update({
          status: "ARCHIVED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId)
        .eq("seller_id", user.id);

      if (archiveErr) {
        console.error("Error archiving listing:", archiveErr);
        return { success: false, error: archiveErr.message || "Failed to archive listing." };
      }

      // Zero-out inventory on hand so it cannot be reserved
      await supabase
        .from("inventory")
        .update({
          quantity_on_hand: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("listing_id", listingId);

      revalidatePath("/marketplace");
      revalidatePath("/farmer/listings");
      revalidatePath(`/marketplace/${listingId}`);

      const message =
        "Listing has historical orders and was safely archived. It is delisted from the marketplace while preserving customer receipts.";

      return {
        success: true,
        message,
        data: { action: "ARCHIVED", message },
      };
    }

    // No historical orders or disputes: Hard delete is completely safe
    const { error: deleteErr } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId)
      .eq("seller_id", user.id);

    if (deleteErr) {
      console.error("Error deleting listing:", deleteErr);
      return { success: false, error: deleteErr.message || "Failed to delete listing." };
    }

    revalidatePath("/marketplace");
    revalidatePath("/farmer/listings");
    revalidatePath(`/marketplace/${listingId}`);

    const message = "Produce listing deleted successfully.";

    return {
      success: true,
      message,
      data: { action: "DELETED", message },
    };
  } catch (error: unknown) {
    console.error("deleteListingAction error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while deleting listing.";
    return {
      success: false,
      error: message,
    };
  }
}
