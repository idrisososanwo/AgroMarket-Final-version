/**
 * Marketplace Domain Types & State Machine
 */

export type ListingStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "OUT_OF_STOCK" | "ARCHIVED";

/**
 * Controlled Listing Status State Machine.
 * Enforces valid lifecycle transitions.
 */
export const VALID_STATUS_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "OUT_OF_STOCK", "ARCHIVED"],
  PAUSED: ["ACTIVE", "ARCHIVED"],
  OUT_OF_STOCK: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [], // Terminal state
};

export function isValidStatusTransition(
  currentStatus: ListingStatus,
  targetStatus: ListingStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(targetStatus));
}

export interface MarketplaceFilterParams {
  search?: string;
  category?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  availableOnly?: boolean;
  sortBy?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  productId: string;
  farmId: string | null;
  title: string;
  description: string | null;
  pricePerUnit: number;
  currency: string;
  unit: string;
  minimumOrderQuantity: number;
  state: string;
  lga: string;
  pickupAddress: string;
  status: ListingStatus;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  productName: string;
  productSlug: string;
  categoryId: string;
  categoryName: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  sellerName: string;
  sellerPhone?: string | null;
  sellerVerified: boolean;
  farmName?: string | null;
}

export interface CanonicalProductOption {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  defaultUnit: string;
}

export interface ListingMutationInput {
  productId: string;
  farmId?: string;
  title: string;
  description?: string;
  pricePerUnit: number;
  unit: string;
  minimumOrderQuantity: number;
  quantityOnHand: number;
  state: string;
  lga: string;
  pickupAddress: string;
  status?: ListingStatus;
}
