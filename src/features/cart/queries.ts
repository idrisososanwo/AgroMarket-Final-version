import { createClient } from "@/lib/supabase/server";
import { BuyerCart, CartItemDetail } from "./types";

interface RawCartItemRow {
  id: string;
  cart_id: string;
  listing_id: string;
  quantity: number | string;
  created_at: string;
  updated_at: string;
  listings: {
    id: string;
    seller_id: string;
    title: string;
    price_per_unit: number | string;
    unit: string;
    minimum_order_quantity: number | string;
    status: string;
    state: string;
    lga: string;
    products?: {
      name?: string | null;
      categories?: {
        name?: string | null;
      } | null;
    } | null;
    inventory?:
      | {
          quantity_on_hand?: number | string | null;
          quantity_reserved?: number | string | null;
          quantity_available?: number | string | null;
        }
      | Array<{
          quantity_on_hand?: number | string | null;
          quantity_reserved?: number | string | null;
          quantity_available?: number | string | null;
        }>
      | null;
    profiles?: {
      full_name?: string | null;
      state?: string | null;
      lga?: string | null;
    } | null;
  } | null;
}

/**
 * Retrieves or lazily creates the active cart for the authenticated buyer.
 * Computes server-authoritative subtotals and checks live stock availability.
 */
export async function getBuyerCart(userId?: string): Promise<BuyerCart | null> {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    targetUserId = user.id;
  }

  // 1. Fetch or create cart for user
  const { data: existingCart, error: cartErr } = await supabase
    .from("carts")
    .select("id, user_id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (cartErr) {
    console.error("Error fetching cart:", cartErr);
    return null;
  }

  let cart = existingCart;

  if (!cart) {
    const { data: newCart, error: createErr } = await supabase
      .from("carts")
      .insert({ user_id: targetUserId })
      .select("id, user_id")
      .single();

    if (createErr || !newCart) {
      console.error("Error creating buyer cart:", createErr);
      return null;
    }
    cart = newCart;
  }

  // 2. Fetch cart items with listings, products, inventory, and seller info
  const { data: itemsData, error: itemsErr } = await supabase
    .from("cart_items")
    .select(
      `
        id,
        cart_id,
        listing_id,
        quantity,
        created_at,
        updated_at,
        listings!inner (
          id,
          seller_id,
          title,
          price_per_unit,
          unit,
          minimum_order_quantity,
          status,
          state,
          lga,
          products (
            name,
            categories (
              name
            )
          ),
          inventory (
            quantity_on_hand,
            quantity_reserved,
            quantity_available
          ),
          profiles!listings_seller_id_fkey (
            full_name,
            state,
            lga
          )
        )
      `
    )
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });

  if (itemsErr) {
    console.error("Error fetching cart items:", itemsErr);
    return {
      id: cart.id,
      userId: cart.user_id,
      items: [],
      subtotal: 0,
      total: 0,
      currency: "NGN",
      sellerCount: 0,
      itemCount: 0,
    };
  }

  const rawItems = (itemsData as unknown as RawCartItemRow[]) || [];
  const uniqueSellers = new Set<string>();

  const items: CartItemDetail[] = rawItems
    .filter((row) => row.listings !== null)
    .map((row) => {
      const listing = row.listings!;
      const prod = listing.products;
      const cat = prod?.categories;
      const inv = Array.isArray(listing.inventory)
        ? listing.inventory[0]
        : listing.inventory;
      const prof = listing.profiles;

      const qty = Number(row.quantity);
      const price = Number(listing.price_per_unit);
      const subtotal = Math.round(price * qty * 100) / 100;

      uniqueSellers.add(listing.seller_id);

      return {
        id: row.id,
        cartId: row.cart_id,
        listingId: row.listing_id,
        quantity: qty,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        title: listing.title,
        productName: prod?.name || "Agricultural Produce",
        categoryName: cat?.name || "Produce",
        unit: listing.unit,
        pricePerUnit: price,
        minimumOrderQuantity: Number(listing.minimum_order_quantity || 1),
        quantityAvailable: Number(inv?.quantity_available || 0),
        sellerId: listing.seller_id,
        sellerName: prof?.full_name || "Verified Farmer",
        sellerState: listing.state,
        sellerLga: listing.lga,
        subtotal,
      };
    });

  const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);

  return {
    id: cart.id,
    userId: cart.user_id,
    items,
    subtotal,
    total: subtotal,
    currency: "NGN",
    sellerCount: uniqueSellers.size,
    itemCount: items.length,
  };
}

/**
 * Retrieves the total item count in the user's active cart.
 */
export async function getCartCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cart) return 0;

  const { count } = await supabase
    .from("cart_items")
    .select("id", { count: "exact", head: true })
    .eq("cart_id", cart.id);

  return count || 0;
}
