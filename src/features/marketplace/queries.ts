import { createClient } from "@/lib/supabase/server";
import {
  CanonicalProductOption,
  MarketplaceFilterParams,
  MarketplaceListing,
} from "./types";

export interface PaginatedMarketplaceResult {
  listings: MarketplaceListing[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface RawListingRow {
  id: string;
  seller_id: string;
  product_id: string;
  farm_id: string | null;
  title: string;
  description: string | null;
  price_per_unit: number | string;
  currency: string;
  unit: string;
  minimum_order_quantity: number | string;
  state: string;
  lga: string;
  pickup_address: string;
  status: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  products?: {
    id?: string;
    name?: string;
    slug?: string;
    categories?: {
      id?: string;
      name?: string;
      slug?: string;
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
  farms?: {
    name?: string | null;
  } | null;
}

interface SafeSellerProfile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
  state?: string | null;
  lga?: string | null;
}

interface RawCanonicalProductRow {
  id: string;
  name: string;
  slug: string;
  default_unit: string;
  categories?: {
    name?: string | null;
  } | null;
}

function mapListingRow(
  row: RawListingRow,
  seller?: SafeSellerProfile | null
): MarketplaceListing {
  const inv = Array.isArray(row.inventory) ? row.inventory[0] : row.inventory;
  const prod = row.products;
  const cat = prod?.categories;
  const farm = row.farms;

  return {
    id: row.id,
    sellerId: row.seller_id,
    productId: row.product_id,
    farmId: row.farm_id,
    title: row.title,
    description: row.description,
    pricePerUnit: Number(row.price_per_unit),
    currency: row.currency || "NGN",
    unit: row.unit,
    minimumOrderQuantity: Number(row.minimum_order_quantity),
    state: row.state,
    lga: row.lga,
    pickupAddress: row.pickup_address,
    status: row.status as MarketplaceListing["status"],
    isVerified: row.is_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productName: prod?.name || "Agricultural Produce",
    productSlug: prod?.slug || "",
    categoryId: cat?.id || "",
    categoryName: cat?.name || "General",
    quantityOnHand: Number(inv?.quantity_on_hand || 0),
    quantityReserved: Number(inv?.quantity_reserved || 0),
    quantityAvailable: Number(inv?.quantity_available || 0),
    sellerName: seller?.full_name || "Verified Farmer",
    sellerPhone: null,
    sellerVerified: Boolean(seller?.is_verified),
    farmName: farm?.name,
  };
}

/**
 * Server-side query for marketplace listings discovery.
 * Enforces server-side filtering, sorting, and pagination against PostgreSQL.
 */
export async function getMarketplaceListings(
  filters: MarketplaceFilterParams = {}
): Promise<PaginatedMarketplaceResult> {
  const supabase = await createClient();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 12));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("listings")
    .select(
      `
        id,
        seller_id,
        product_id,
        farm_id,
        title,
        description,
        price_per_unit,
        currency,
        unit,
        minimum_order_quantity,
        state,
        lga,
        pickup_address,
        status,
        is_verified,
        created_at,
        updated_at,
        products!inner (
          id,
          name,
          slug,
          categories!inner (
            id,
            name,
            slug
          )
        ),
        inventory (
          quantity_on_hand,
          quantity_reserved,
          quantity_available
        ),
        farms (
          name
        )
      `,
      { count: "exact" }
    )
    .eq("status", "ACTIVE");

  // Filter by category slug
  if (filters.category && filters.category !== "all") {
    query = query.eq("products.categories.slug", filters.category);
  }

  // Filter by state
  if (filters.state && filters.state !== "all") {
    query = query.eq("state", filters.state);
  }

  // Filter by price range
  if (filters.minPrice !== undefined && filters.minPrice > 0) {
    query = query.gte("price_per_unit", filters.minPrice);
  }
  if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
    query = query.lte("price_per_unit", filters.maxPrice);
  }

  // Search by title or product name
  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},products.name.ilike.${term}`);
  }

  // Sorting
  switch (filters.sortBy) {
    case "price_asc":
      query = query.order("price_per_unit", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price_per_unit", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Pagination
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching marketplace listings:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      listings: [],
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const rawRows = ((data as unknown as RawListingRow[]) || []);
  const sellerIds = Array.from(new Set(rawRows.map((r) => r.seller_id).filter(Boolean)));

  const sellerMap = new Map<string, SafeSellerProfile>();
  if (sellerIds.length > 0) {
    const { data: sellers } = await supabase
      .from("marketplace_seller_profiles")
      .select("id, full_name, avatar_url, is_verified, state, lga")
      .in("id", sellerIds);

    if (sellers) {
      for (const s of sellers) {
        sellerMap.set(s.id, s as SafeSellerProfile);
      }
    }
  }

  // Map raw data into clean domain interface
  const listings: MarketplaceListing[] = rawRows.map((row) =>
    mapListingRow(row, sellerMap.get(row.seller_id))
  );

  return {
    listings,
    totalCount,
    page,
    limit,
    totalPages,
  };
}

/**
 * Retrieves a single listing by ID with full details, inventory status, and safe seller profile.
 */
export async function getMarketplaceListingById(
  listingId: string
): Promise<MarketplaceListing | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `
        id,
        seller_id,
        product_id,
        farm_id,
        title,
        description,
        price_per_unit,
        currency,
        unit,
        minimum_order_quantity,
        state,
        lga,
        pickup_address,
        status,
        is_verified,
        created_at,
        updated_at,
        products (
          id,
          name,
          slug,
          categories (
            id,
            name,
            slug
          )
        ),
        inventory (
          quantity_on_hand,
          quantity_reserved,
          quantity_available
        ),
        farms (
          name
        )
      `
    )
    .eq("id", listingId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const rawRow = data as unknown as RawListingRow;
  let seller: SafeSellerProfile | null = null;
  if (rawRow.seller_id) {
    const { data: sellerData } = await supabase
      .from("marketplace_seller_profiles")
      .select("id, full_name, avatar_url, is_verified, state, lga")
      .eq("id", rawRow.seller_id)
      .maybeSingle();
    seller = sellerData as SafeSellerProfile | null;
  }

  return mapListingRow(rawRow, seller);
}

/**
 * Retrieves all listings owned by a specific seller.
 */
export async function getSellerListings(
  sellerId?: string
): Promise<MarketplaceListing[]> {
  const supabase = await createClient();

  let targetSellerId = sellerId;
  if (!targetSellerId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    targetSellerId = user.id;
  }

  const { data, error } = await supabase
    .from("listings")
    .select(
      `
        id,
        seller_id,
        product_id,
        farm_id,
        title,
        description,
        price_per_unit,
        currency,
        unit,
        minimum_order_quantity,
        state,
        lga,
        pickup_address,
        status,
        is_verified,
        created_at,
        updated_at,
        products (
          id,
          name,
          slug,
          categories (
            id,
            name,
            slug
          )
        ),
        inventory (
          quantity_on_hand,
          quantity_reserved,
          quantity_available
        ),
        farms (
          name
        )
      `
    )
    .eq("seller_id", targetSellerId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const rawRows = ((data as unknown as RawListingRow[]) || []);
  let seller: SafeSellerProfile | null = null;
  if (targetSellerId) {
    const { data: sellerData } = await supabase
      .from("marketplace_seller_profiles")
      .select("id, full_name, avatar_url, is_verified, state, lga")
      .eq("id", targetSellerId)
      .maybeSingle();
    seller = sellerData as SafeSellerProfile | null;
  }

  return rawRows.map((row) => mapListingRow(row, seller));
}

/**
 * Retrieves all active canonical products for listing selection.
 */
export async function getCanonicalProducts(): Promise<CanonicalProductOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        default_unit,
        categories (
          name
        )
      `
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return ((data as unknown as RawCanonicalProductRow[]) || []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    defaultUnit: row.default_unit,
    categoryName: row.categories?.name || "General",
  }));
}

/**
 * Retrieves all categories for filter options.
 */
export async function getCategories(): Promise<{ id: string; name: string; slug: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return data || [];
}
