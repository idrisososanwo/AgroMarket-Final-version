/**
 * AgroMarket Reviews Domain Types
 * Strict typing for verified reviews across Services, Marketplace, and Equipment.
 */

export type ReviewTargetType = "SERVICE" | "MARKETPLACE" | "EQUIPMENT";

export const REVIEW_TARGET_TYPES: readonly ReviewTargetType[] = [
  "SERVICE",
  "MARKETPLACE",
  "EQUIPMENT",
] as const;

/**
 * Safe public author representation.
 * STRICT PRIVACY REQUIREMENT:
 * Exposes only safe public display fields.
 * MUST NOT expose email, phone, location_address, or other private profile fields.
 */
export interface SafeAuthorProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  state: string | null;
  lga: string | null;
}

export interface Review {
  id: string;
  authorId: string;
  targetType: ReviewTargetType;
  orderId: string | null;
  listingId: string | null;
  sellerId: string | null;
  serviceId: string | null;
  equipmentId: string | null;
  rating: number; // 1 to 5
  comment: string | null;
  isVerifiedTransaction: boolean;
  createdAt: string;
  updatedAt: string;
  author?: SafeAuthorProfile | null;
}

export interface ReviewFilterParams {
  targetType?: ReviewTargetType;
  serviceId?: string;
  listingId?: string;
  sellerId?: string;
  equipmentId?: string;
  authorId?: string;
  page?: number;
  limit?: number;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface PaginatedReviewsResult {
  reviews: Review[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  stats?: ReviewStats;
}

// Legacy compatibility interface
export interface ReviewRecord {
  id: string;
  orderId?: string | null;
  authorId: string;
  targetId?: string | null;
  rating: number;
  comment?: string | null;
}
