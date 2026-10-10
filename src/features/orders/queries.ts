import { createClient } from "@/lib/supabase/server";
import { OrderDetail, OrderItemDetail, OrderStatus } from "./types";

interface RawOrderRow {
  id: string;
  order_number: string;
  buyer_id: string;
  status: string;
  currency: string;
  subtotal_amount: number | string;
  delivery_fee_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  delivery_address: string;
  delivery_state: string;
  delivery_lga: string;
  contact_phone: string;
  delivery_notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  order_items?: Array<{
    id: string;
    order_id: string;
    listing_id: string;
    seller_id: string;
    product_id: string;
    product_name_snapshot: string;
    unit_price_snapshot: number | string;
    quantity: number | string;
    unit_snapshot: string;
    total_price: number | string;
    status: string;
    created_at: string;
    profiles?: {
      full_name?: string | null;
      phone?: string | null;
      state?: string | null;
    } | null;
  }> | null;
}

function mapOrderRow(row: RawOrderRow): OrderDetail {
  const buyer = row.profiles;
  const rawItems = row.order_items || [];
  const uniqueSellers = new Set<string>();

  const items: OrderItemDetail[] = rawItems.map((item) => {
    uniqueSellers.add(item.seller_id);
    const seller = item.profiles;

    return {
      id: item.id,
      orderId: item.order_id,
      listingId: item.listing_id,
      sellerId: item.seller_id,
      productId: item.product_id,
      productName: item.product_name_snapshot,
      unitPrice: Number(item.unit_price_snapshot),
      quantity: Number(item.quantity),
      unit: item.unit_snapshot,
      totalPrice: Number(item.total_price),
      status: item.status as OrderItemDetail["status"],
      createdAt: item.created_at,
      sellerName: seller?.full_name || "Verified Farmer",
      sellerPhone: seller?.phone || undefined,
      sellerState: seller?.state || undefined,
    };
  });

  return {
    id: row.id,
    orderNumber: row.order_number,
    buyerId: row.buyer_id,
    buyerName: buyer?.full_name || undefined,
    buyerEmail: buyer?.email || undefined,
    buyerPhone: buyer?.phone || undefined,
    status: row.status as OrderStatus,
    currency: row.currency || "NGN",
    subtotalAmount: Number(row.subtotal_amount),
    deliveryFeeAmount: Number(row.delivery_fee_amount),
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    deliveryAddress: row.delivery_address,
    deliveryState: row.delivery_state,
    deliveryLga: row.delivery_lga,
    contactPhone: row.contact_phone,
    deliveryNotes: row.delivery_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
    sellerCount: uniqueSellers.size,
    itemCount: items.length,
  };
}

/**
 * Retrieves order history for the authenticated buyer with error tracking.
 */
export async function getBuyerOrdersResult(
  buyerId?: string
): Promise<{ orders: OrderDetail[]; error?: string | null }> {
  const supabase = await createClient();

  let targetBuyerId = buyerId;
  if (!targetBuyerId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { orders: [], error: null };
    targetBuyerId = user.id;
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        buyer_id,
        status,
        currency,
        subtotal_amount,
        delivery_fee_amount,
        discount_amount,
        total_amount,
        delivery_address,
        delivery_state,
        delivery_lga,
        contact_phone,
        delivery_notes,
        created_at,
        updated_at,
        order_items (
          id,
          order_id,
          listing_id,
          seller_id,
          product_id,
          product_name_snapshot,
          unit_price_snapshot,
          quantity,
          unit_snapshot,
          total_price,
          status,
          created_at,
          profiles!order_items_seller_id_fkey (
            full_name,
            phone,
            state
          )
        )
      `
    )
    .eq("buyer_id", targetBuyerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching buyer orders:", error);
    return { orders: [], error: error.message };
  }

  return {
    orders: ((data as unknown as RawOrderRow[]) || []).map(mapOrderRow),
    error: null,
  };
}

/**
 * Retrieves order history for the authenticated buyer.
 */
export async function getBuyerOrders(buyerId?: string): Promise<OrderDetail[]> {
  const result = await getBuyerOrdersResult(buyerId);
  return result.orders;
}

/**
 * Retrieves a single order by ID with all item snapshots and seller metadata,
 * providing explicit error status so callers can differentiate database/RLS errors
 * from genuine non-existence (404).
 */
export async function getOrderDetailsResult(
  orderId: string
): Promise<{ order: OrderDetail | null; error?: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        buyer_id,
        status,
        currency,
        subtotal_amount,
        delivery_fee_amount,
        discount_amount,
        total_amount,
        delivery_address,
        delivery_state,
        delivery_lga,
        contact_phone,
        delivery_notes,
        created_at,
        updated_at,
        profiles!orders_buyer_id_fkey (
          full_name,
          email,
          phone
        ),
        order_items (
          id,
          order_id,
          listing_id,
          seller_id,
          product_id,
          product_name_snapshot,
          unit_price_snapshot,
          quantity,
          unit_snapshot,
          total_price,
          status,
          created_at,
          profiles!order_items_seller_id_fkey (
            full_name,
            phone,
            state
          )
        )
      `
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching order by ID:", error);
    return { order: null, error: error.message };
  }

  if (!data) {
    return { order: null, error: null };
  }

  return { order: mapOrderRow(data as unknown as RawOrderRow), error: null };
}

/**
 * Retrieves a single order by ID with all item snapshots and seller metadata.
 */
export async function getOrderById(orderId: string): Promise<OrderDetail | null> {
  const result = await getOrderDetailsResult(orderId);
  return result.order;
}

export interface SellerOrderItemRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  status: string;
  deliveryState: string;
  deliveryLga: string;
  deliveryAddress: string;
  contactPhone: string;
  createdAt: string;
  buyerName: string;
}

/**
 * Retrieves incoming orders containing items belonging to the authenticated seller with error tracking.
 */
export async function getSellerOrdersResult(
  sellerId?: string
): Promise<{ orders: SellerOrderItemRecord[]; error?: string | null }> {
  const supabase = await createClient();

  let targetSellerId = sellerId;
  if (!targetSellerId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { orders: [], error: null };
    targetSellerId = user.id;
  }

  const { data, error } = await supabase
    .from("order_items")
    .select(
      `
        id,
        order_id,
        seller_id,
        product_name_snapshot,
        unit_price_snapshot,
        quantity,
        unit_snapshot,
        total_price,
        status,
        created_at,
        orders!inner (
          id,
          order_number,
          status,
          delivery_state,
          delivery_lga,
          delivery_address,
          contact_phone,
          profiles!orders_buyer_id_fkey (
            full_name
          )
        )
      `
    )
    .eq("seller_id", targetSellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching seller order items:", error);
    return { orders: [], error: error.message };
  }

  if (!data) {
    return { orders: [], error: null };
  }

  interface RawSellerOrderItemQueryRow {
    id: string;
    order_id: string;
    seller_id: string;
    product_name_snapshot: string;
    unit_price_snapshot: number | string;
    quantity: number | string;
    unit_snapshot: string;
    total_price: number | string;
    status: string;
    created_at: string;
    orders?: {
      id: string;
      order_number: string;
      status: string;
      delivery_state: string;
      delivery_lga: string;
      delivery_address: string;
      contact_phone: string;
      profiles?: {
        full_name?: string | null;
      } | null;
    } | null;
  }

  const orders: SellerOrderItemRecord[] = (
    (data as unknown as RawSellerOrderItemQueryRow[]) || []
  ).map((row) => {
    const order = row.orders;
    const buyer = order?.profiles;

    return {
      id: row.id,
      orderId: row.order_id,
      orderNumber: order?.order_number || "AGRO-ORDER",
      orderStatus: (order?.status as OrderStatus) || "PENDING",
      productName: row.product_name_snapshot,
      quantity: Number(row.quantity),
      unit: row.unit_snapshot,
      unitPrice: Number(row.unit_price_snapshot),
      totalPrice: Number(row.total_price),
      status: row.status,
      deliveryState: order?.delivery_state || "",
      deliveryLga: order?.delivery_lga || "",
      deliveryAddress: order?.delivery_address || "",
      contactPhone: order?.contact_phone || "",
      createdAt: row.created_at,
      buyerName: buyer?.full_name || "Buyer",
    };
  });

  return { orders, error: null };
}

/**
 * Retrieves incoming orders containing items belonging to the authenticated seller.
 * Strictly scopes visibility so sellers only view their own items.
 */
export async function getSellerOrders(
  sellerId?: string
): Promise<SellerOrderItemRecord[]> {
  const result = await getSellerOrdersResult(sellerId);
  return result.orders;
}
