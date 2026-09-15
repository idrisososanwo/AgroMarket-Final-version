"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import {
  ActionResponse,
  addToCartSchema,
  removeCartItemSchema,
  updateCartItemSchema,
} from "./validation";

/**
 * Adds produce listing to the authenticated buyer's cart.
 * Enforces:
 * 1. User authentication
 * 2. Listing is ACTIVE in marketplace
 * 3. Requested quantity meets Minimum Order Quantity (MOQ)
 * 4. Requested quantity does not exceed authoritative available stock
 */
export async function addToCartAction(
  input: FormData | Record<string, unknown>
): Promise<ActionResponse<{ cartItemId: string }>> {
  try {
    const user = await requireAuth();
    const raw = input instanceof FormData ? Object.fromEntries(input.entries()) : input;

    const parsed = addToCartSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify the quantity.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { listingId, quantity } = parsed.data;
    const supabase = await createClient();

    // 1. Fetch listing and verify active status
    const { data: listing, error: listErr } = await supabase
      .from("listings")
      .select("id, title, status, minimum_order_quantity, price_per_unit")
      .eq("id", listingId)
      .single();

    if (listErr || !listing) {
      return { success: false, error: "Produce listing not found." };
    }

    if (listing.status !== "ACTIVE") {
      return {
        success: false,
        error: `Listing is no longer active (status: ${listing.status}).`,
      };
    }

    // 2. Fetch authoritative inventory
    const { data: inv, error: invErr } = await supabase
      .from("inventory")
      .select("quantity_on_hand, quantity_reserved, quantity_available")
      .eq("listing_id", listingId)
      .single();

    if (invErr || !inv) {
      return { success: false, error: "Inventory record unavailable." };
    }

    const available = Number(inv.quantity_available ?? 0);
    const moq = Number(listing.minimum_order_quantity || 1);

    if (available <= 0) {
      return { success: false, error: "This produce is currently out of stock." };
    }

    if (quantity < moq) {
      return {
        success: false,
        error: `Minimum order quantity for this item is ${moq}.`,
      };
    }

    // 3. Retrieve or create user's cart
    let { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cart) {
      const { data: newCart, error: createCartErr } = await supabase
        .from("carts")
        .insert({ user_id: user.id })
        .select("id")
        .single();

      if (createCartErr || !newCart) {
        return { success: false, error: "Failed to initialize shopping cart." };
      }
      cart = newCart;
    }

    // 4. Check if item already exists in cart
    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cart.id)
      .eq("listing_id", listingId)
      .maybeSingle();

    let finalCartItemId: string;

    if (existingItem) {
      const newTotalQty = Number(existingItem.quantity) + quantity;
      if (newTotalQty > available) {
        return {
          success: false,
          error: `Cannot add ${quantity} more. Total in cart (${newTotalQty}) would exceed available stock (${available}).`,
        };
      }

      const { error: updateErr } = await supabase
        .from("cart_items")
        .update({
          quantity: newTotalQty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id);

      if (updateErr) {
        return { success: false, error: "Failed to update item quantity in cart." };
      }
      finalCartItemId = existingItem.id;
    } else {
      if (quantity > available) {
        return {
          success: false,
          error: `Requested quantity (${quantity}) exceeds available stock (${available}).`,
        };
      }

      const { data: newItem, error: insertErr } = await supabase
        .from("cart_items")
        .insert({
          cart_id: cart.id,
          listing_id: listingId,
          quantity,
        })
        .select("id")
        .single();

      if (insertErr || !newItem) {
        return { success: false, error: "Failed to add produce to cart." };
      }
      finalCartItemId = newItem.id;
    }

    revalidatePath("/cart");
    revalidatePath(`/marketplace/${listingId}`);

    return { success: true, data: { cartItemId: finalCartItemId } };
  } catch (error: unknown) {
    console.error("addToCartAction error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

/**
 * Updates quantity for an existing cart item.
 * Enforces ownership and available stock boundaries.
 */
export async function updateCartItemAction(
  cartItemId: string,
  quantity: number
): Promise<ActionResponse> {
  try {
    const user = await requireAuth();

    const parsed = updateCartItemSchema.safeParse({ cartItemId, quantity });
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid quantity specified.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const supabase = await createClient();

    // 1. Fetch cart item and verify ownership through buyer's cart
    const { data: item, error: itemErr } = await supabase
      .from("cart_items")
      .select(
        `
          id,
          cart_id,
          listing_id,
          carts!inner (
            user_id
          ),
          listings!inner (
            id,
            status,
            minimum_order_quantity,
            inventory (
              quantity_available
            )
          )
        `
      )
      .eq("id", cartItemId)
      .single();

    if (itemErr || !item) {
      return { success: false, error: "Cart item not found." };
    }

interface UpdateCartItemRow {
      id: string;
      cart_id: string;
      listing_id: string;
      carts: { user_id: string } | null;
      listings: {
        id: string;
        status: string;
        minimum_order_quantity: number | string;
        inventory?:
          | { quantity_available?: number | string | null }
          | Array<{ quantity_available?: number | string | null }>
          | null;
      } | null;
    }

    const typedItem = item as unknown as UpdateCartItemRow;
    const cartOwnerId = typedItem.carts?.user_id;
    if (cartOwnerId !== user.id) {
      return { success: false, error: "Unauthorized: You do not own this cart item." };
    }

    const listing = typedItem.listings;
    if (!listing || listing.status !== "ACTIVE") {
      return { success: false, error: "This produce listing is no longer active." };
    }

    const inv = Array.isArray(listing.inventory)
      ? listing.inventory[0]
      : listing.inventory;
    const available = Number(inv?.quantity_available ?? 0);
    const moq = Number(listing.minimum_order_quantity || 1);

    if (parsed.data.quantity < moq) {
      return {
        success: false,
        error: `Minimum order quantity for this item is ${moq}.`,
      };
    }

    if (parsed.data.quantity > available) {
      return {
        success: false,
        error: `Requested quantity (${parsed.data.quantity}) exceeds available stock (${available}).`,
      };
    }

    // 2. Update quantity
    const { error: updateErr } = await supabase
      .from("cart_items")
      .update({
        quantity: parsed.data.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cartItemId);

    if (updateErr) {
      return { success: false, error: "Failed to update item quantity." };
    }

    revalidatePath("/cart");
    return { success: true };
  } catch (error: unknown) {
    console.error("updateCartItemAction error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

/**
 * Removes an item from the user's cart.
 */
export async function removeCartItemAction(
  cartItemId: string
): Promise<ActionResponse> {
  try {
    const user = await requireAuth();

    const parsed = removeCartItemSchema.safeParse({ cartItemId });
    if (!parsed.success) {
      return { success: false, error: "Invalid cart item ID." };
    }

    const supabase = await createClient();

    // Verify item belongs to user's cart
    const { data: item } = await supabase
      .from("cart_items")
      .select("id, carts!inner(user_id)")
      .eq("id", cartItemId)
      .single();

    const typedItem = item as unknown as { id: string; carts: { user_id: string } | null } | null;
    if (!typedItem || typedItem.carts?.user_id !== user.id) {
      return { success: false, error: "Cart item not found or unauthorized." };
    }

    const { error: deleteErr } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", cartItemId);

    if (deleteErr) {
      return { success: false, error: "Failed to remove item from cart." };
    }

    revalidatePath("/cart");
    return { success: true };
  } catch (error: unknown) {
    console.error("removeCartItemAction error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

/**
 * Empties all items from the authenticated user's cart.
 */
export async function clearCartAction(): Promise<ActionResponse> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!cart) {
      return { success: true };
    }

    const { error: deleteErr } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id);

    if (deleteErr) {
      return { success: false, error: "Failed to clear cart." };
    }

    revalidatePath("/cart");
    return { success: true };
  } catch (error: unknown) {
    console.error("clearCartAction error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
