import { createClient } from "@/lib/supabase/server";
import {
  SharedPurchaseDetail,
  SharedPurchaseParticipantDetail,
  SharedPurchaseStatus,
  ParticipantStatus,
  SharedPurchaseType,
  AnimalPortionModel,
  AnimalPortionFraction,
} from "./types";

interface RawSharedPurchase {
  id: string;
  listing_id: string;
  created_by: string;
  title: string;
  description: string | null;
  purchase_type?: string;
  total_quantity: number | string;
  allocated_quantity?: number | string;
  unit: string;
  unit_price: number | string;
  total_price: number | string;
  target_participants: number;
  current_participants?: number;
  min_share_quantity: number | string;
  max_share_quantity?: number | string | null;
  portion_model?: string | null;
  portion_fractions?: unknown;
  metadata?: Record<string, unknown> | null;
  deadline: string;
  status: string;
  pickup_hub_location: string;
  hub_state: string;
  hub_lga: string;
  created_at: string;
  updated_at: string;
  listings?: {
    id: string;
    seller_id: string;
    title: string;
    price_per_unit: number | string;
    unit: string;
    state: string;
    lga: string;
    products?: {
      id: string;
      name: string;
      categories?: { name: string } | null;
    } | null;
    profiles?: {
      full_name?: string | null;
      phone_number?: string | null;
    } | null;
  } | null;
}

interface RawParticipant {
  id: string;
  shared_purchase_id: string;
  user_id: string;
  order_id?: string | null;
  shares_count: number | string;
  share_amount: number | string;
  unit?: string;
  unit_price?: number | string;
  portion_choice?: string | null;
  payment_id?: string | null;
  status: string;
  portion_allocation_notes?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
  profiles?: {
    full_name?: string | null;
    phone_number?: string | null;
  } | null;
  orders?: {
    order_number?: string | null;
  } | null;
}

/**
 * Maps raw database shared purchase record to domain SharedPurchaseDetail.
 */
function mapSharedPurchase(raw: RawSharedPurchase): SharedPurchaseDetail {
  const totalQuantity = Number(raw.total_quantity || 0);
  const allocatedQuantity = Number(raw.allocated_quantity || 0);
  const remainingQuantity = Math.max(0, totalQuantity - allocatedQuantity);
  const progressPercent = totalQuantity > 0
    ? Math.min(100, Math.round((allocatedQuantity / totalQuantity) * 100))
    : 0;

  const isExpired = new Date(raw.deadline).getTime() <= Date.now();
  const isJoinable = raw.status === "OPEN" && !isExpired && remainingQuantity > 0;

  const listing = raw.listings
    ? {
        id: raw.listings.id,
        title: raw.listings.title,
        pricePerUnit: Number(raw.listings.price_per_unit || 0),
        unit: raw.listings.unit,
        sellerId: raw.listings.seller_id,
        sellerName: raw.listings.profiles?.full_name || undefined,
        sellerPhone: raw.listings.profiles?.phone_number || undefined,
        state: raw.listings.state,
        lga: raw.listings.lga,
        productName: raw.listings.products?.name || "Farm Produce",
        categoryName: raw.listings.products?.categories?.name || undefined,
      }
    : undefined;

  return {
    id: raw.id,
    listingId: raw.listing_id,
    createdBy: raw.created_by,
    title: raw.title,
    description: raw.description,
    purchaseType: (raw.purchase_type as SharedPurchaseType) || "BULK_CROP",
    totalQuantity,
    allocatedQuantity,
    remainingQuantity,
    unit: raw.unit,
    unitPrice: Number(raw.unit_price || 0),
    totalPrice: Number(raw.total_price || 0),
    targetParticipants: Number(raw.target_participants || 0),
    currentParticipants: Number(raw.current_participants || 0),
    minShareQuantity: Number(raw.min_share_quantity || 1),
    maxShareQuantity: raw.max_share_quantity ? Number(raw.max_share_quantity) : null,
    portionModel: (raw.portion_model as AnimalPortionModel) || null,
    portionFractions: (raw.portion_fractions as AnimalPortionFraction[]) || [],
    metadata: raw.metadata || {},
    deadline: raw.deadline,
    status: raw.status as SharedPurchaseStatus,
    pickupHubLocation: raw.pickup_hub_location,
    hubState: raw.hub_state,
    hubLga: raw.hub_lga,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    listing,
    progressPercent,
    isExpired,
    isJoinable,
  };
}

/**
 * Maps raw participant database record to SharedPurchaseParticipantDetail.
 */
function mapParticipant(raw: RawParticipant): SharedPurchaseParticipantDetail {
  return {
    id: raw.id,
    sharedPurchaseId: raw.shared_purchase_id,
    userId: raw.user_id,
    orderId: raw.order_id || null,
    sharesCount: Number(raw.shares_count || 0),
    shareAmount: Number(raw.share_amount || 0),
    unit: raw.unit || "kg",
    unitPrice: Number(raw.unit_price || 0),
    portionChoice: raw.portion_choice || null,
    paymentId: raw.payment_id || null,
    status: raw.status as ParticipantStatus,
    portionAllocationNotes: raw.portion_allocation_notes || null,
    metadata: raw.metadata || {},
    createdAt: raw.created_at,
    updatedAt: raw.updated_at || raw.created_at,
    userName: raw.profiles?.full_name || undefined,
    userPhone: raw.profiles?.phone_number || undefined,
    orderNumber: raw.orders?.order_number || undefined,
  };
}

/**
 * Fetches public active Shared Purchases with optional filters.
 */
export async function getSharedPurchases(params?: {
  type?: SharedPurchaseType;
  state?: string;
  status?: SharedPurchaseStatus;
  search?: string;
}): Promise<SharedPurchaseDetail[]> {
  const supabase = await createClient();

  let query = supabase
    .from("shared_purchases")
    .select(`
      *,
      listings!inner (
        id,
        seller_id,
        title,
        price_per_unit,
        unit,
        state,
        lga,
        products (
          id,
          name,
          categories (
            name
          )
        ),
        profiles:seller_id (
          full_name,
          phone_number
        )
      )
    `)
    .order("created_at", { ascending: false });

  // Exclude DRAFT from public catalog
  if (params?.status) {
    query = query.eq("status", params.status);
  } else {
    query = query.not("status", "eq", "DRAFT");
  }

  if (params?.type) {
    query = query.eq("purchase_type", params.type);
  }

  if (params?.state) {
    query = query.eq("hub_state", params.state);
  }

  if (params?.search) {
    query = query.ilike("title", `%${params.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getSharedPurchases error:", error);
    return [];
  }

  return (data || []).map(mapSharedPurchase);
}

/**
 * Fetches a single Shared Purchase pool by ID.
 */
export async function getSharedPurchaseById(
  id: string
): Promise<SharedPurchaseDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shared_purchases")
    .select(`
      *,
      listings (
        id,
        seller_id,
        title,
        price_per_unit,
        unit,
        state,
        lga,
        products (
          id,
          name,
          categories (
            name
          )
        ),
        profiles:seller_id (
          full_name,
          phone_number
        )
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Opportunistically clean up stale pledges if pool is not completed/cancelled
  if (data.status === "OPEN" || data.status === "TARGET_REACHED") {
    import("./service")
      .then(({ SharedPurchaseService }) =>
        SharedPurchaseService.expireStaleUnpaidPledges(id, 30).catch(() => {})
      )
      .catch(() => {});
  }

  return mapSharedPurchase(data);
}

/**
 * Fetches participants for a specific Shared Purchase pool.
 */
export async function getSharedPurchaseParticipants(
  sharedPurchaseId: string
): Promise<SharedPurchaseParticipantDetail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shared_purchase_participants")
    .select(`
      *,
      profiles:user_id (
        full_name,
        phone_number
      ),
      orders:order_id (
        order_number
      )
    `)
    .eq("shared_purchase_id", sharedPurchaseId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getSharedPurchaseParticipants error:", error);
    return [];
  }

  return (data || []).map(mapParticipant);
}

/**
 * Fetches Shared Purchases managed by a specific seller.
 */
export async function getFarmerSharedPurchases(
  sellerId: string
): Promise<SharedPurchaseDetail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shared_purchases")
    .select(`
      *,
      listings (
        id,
        seller_id,
        title,
        price_per_unit,
        unit,
        state,
        lga,
        products (
          id,
          name
        )
      )
    `)
    .eq("created_by", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getFarmerSharedPurchases error:", error);
    return [];
  }

  return (data || []).map(mapSharedPurchase);
}

/**
 * Fetches participations for a buyer.
 */
export async function getUserParticipations(
  userId: string
): Promise<SharedPurchaseParticipantDetail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shared_purchase_participants")
    .select(`
      *,
      orders:order_id (
        order_number
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserParticipations error:", error);
    return [];
  }

  return (data || []).map(mapParticipant);
}
