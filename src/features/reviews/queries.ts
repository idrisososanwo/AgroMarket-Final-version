import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import {
  Review,
  ReviewFilterParams,
  ReviewStats,
  PaginatedReviewsResult,
  SafeAuthorProfile,
  ReviewTargetType,
} from "./types";

interface RawReviewRow {
  id: string;
  author_id: string;
  order_id: string | null;
  listing_id: string | null;
  seller_id: string | null;
  service_id: string | null;
  equipment_id: string | null;
  rating: number;
  comment: string | null;
  is_verified_transaction: boolean;
  created_at: string;
  updated_at: string;
}

interface RawAuthorProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  state: string | null;
  lga: string | null;
}

export function determineTargetType(row: RawReviewRow): ReviewTargetType {
  if (row.service_id) return "SERVICE";
  if (row.equipment_id) return "EQUIPMENT";
  return "MARKETPLACE";
}

export function mapReviewRow(
  row: RawReviewRow,
  author?: SafeAuthorProfile | null
): Review {
  return {
    id: row.id,
    authorId: row.author_id,
    targetType: determineTargetType(row),
    orderId: row.order_id,
    listingId: row.listing_id,
    sellerId: row.seller_id,
    serviceId: row.service_id,
    equipmentId: row.equipment_id,
    rating: row.rating,
    comment: row.comment,
    isVerifiedTransaction: Boolean(row.is_verified_transaction),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: author ?? null,
  };
}

/**
 * Calculates aggregate review statistics (average, total, distribution).
 */
export function calculateReviewStats(rows: Array<{ rating: number }>): ReviewStats {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  if (!rows || rows.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: distribution,
    };
  }

  let totalSum = 0;
  for (const r of rows) {
    totalSum += r.rating;
    const clamped = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[clamped] = (distribution[clamped] || 0) + 1;
  }

  const average = Number((totalSum / rows.length).toFixed(1));

  return {
    averageRating: average,
    totalReviews: rows.length,
    ratingDistribution: distribution,
  };
}

/**
 * Public Review Query Helper with Safe Author Profile Resolution.
 *
 * PRIVACY & SECURITY:
 * 1. Resolves author display information strictly using safe public fields (name, avatar, state, lga).
 * 2. NEVER queries or exposes email, phone, location_address.
 */
export async function getReviews(
  filters: ReviewFilterParams = {}
): Promise<PaginatedReviewsResult> {
  const supabase = await createClient();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("reviews")
    .select(
      `
        id,
        author_id,
        order_id,
        listing_id,
        seller_id,
        service_id,
        equipment_id,
        rating,
        comment,
        is_verified_transaction,
        created_at,
        updated_at
      `,
      { count: "exact" }
    );

  if (filters.serviceId) {
    query = query.eq("service_id", filters.serviceId);
  }
  if (filters.listingId) {
    query = query.eq("listing_id", filters.listingId);
  }
  if (filters.sellerId) {
    query = query.eq("seller_id", filters.sellerId);
  }
  if (filters.equipmentId) {
    query = query.eq("equipment_id", filters.equipmentId);
  }
  if (filters.authorId) {
    query = query.eq("author_id", filters.authorId);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching reviews:", error);
    return {
      reviews: [],
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
      stats: {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    };
  }

  const rawRows = (data as unknown as RawReviewRow[]) || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Batch resolve safe author profiles
  const authorIds = Array.from(new Set(rawRows.map((r) => r.author_id).filter(Boolean)));
  const authorMap = new Map<string, SafeAuthorProfile>();

  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_verified, state, lga")
      .in("id", authorIds);

    if (authors) {
      for (const a of authors as RawAuthorProfileRow[]) {
        authorMap.set(a.id, {
          id: a.id,
          fullName: a.full_name,
          avatarUrl: a.avatar_url,
          isVerified: Boolean(a.is_verified),
          state: a.state,
          lga: a.lga,
        });
      }
    }
  }

  const reviews = rawRows.map((row) => mapReviewRow(row, authorMap.get(row.author_id)));

  // Query overall stats for this target if targeted
  let stats: ReviewStats | undefined;
  if (filters.serviceId || filters.listingId || filters.sellerId || filters.equipmentId) {
    stats = await getReviewStats({
      serviceId: filters.serviceId,
      listingId: filters.listingId,
      sellerId: filters.sellerId,
      equipmentId: filters.equipmentId,
    });
  }

  return {
    reviews,
    totalCount,
    page,
    limit,
    totalPages,
    stats,
  };
}

/**
 * Gets reviews for a specific agricultural service.
 */
export async function getServiceReviews(
  serviceId: string,
  page = 1,
  limit = 10
): Promise<PaginatedReviewsResult> {
  return getReviews({ serviceId, page, limit });
}

/**
 * Gets reviews for a specific marketplace listing.
 */
export async function getListingReviews(
  listingId: string,
  page = 1,
  limit = 10
): Promise<PaginatedReviewsResult> {
  return getReviews({ listingId, page, limit });
}

/**
 * Gets reviews for a specific seller.
 */
export async function getSellerReviews(
  sellerId: string,
  page = 1,
  limit = 10
): Promise<PaginatedReviewsResult> {
  return getReviews({ sellerId, page, limit });
}

/**
 * Gets reviews for a specific equipment item.
 */
export async function getEquipmentReviews(
  equipmentId: string,
  page = 1,
  limit = 10
): Promise<PaginatedReviewsResult> {
  return getReviews({ equipmentId, page, limit });
}

/**
 * Gets reviews authored by the currently authenticated user.
 */
export async function getMyReviews(page = 1, limit = 10): Promise<PaginatedReviewsResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      reviews: [],
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  return getReviews({ authorId: currentUser.id, page, limit });
}

/**
 * Computes aggregated review statistics for a target.
 */
export async function getReviewStats(target: {
  serviceId?: string;
  listingId?: string;
  sellerId?: string;
  equipmentId?: string;
}): Promise<ReviewStats> {
  const supabase = await createClient();

  let query = supabase.from("reviews").select("rating");

  if (target.serviceId) {
    query = query.eq("service_id", target.serviceId);
  }
  if (target.listingId) {
    query = query.eq("listing_id", target.listingId);
  }
  if (target.sellerId) {
    query = query.eq("seller_id", target.sellerId);
  }
  if (target.equipmentId) {
    query = query.eq("equipment_id", target.equipmentId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  return calculateReviewStats(data as Array<{ rating: number }>);
}
