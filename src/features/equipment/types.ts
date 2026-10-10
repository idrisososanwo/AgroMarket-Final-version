/**
 * AgroMarket Farm Equipment Domain Types
 * Strict typing for machinery rental & leasing (tractors, harvesters, planters, sprayers, etc.).
 *
 * Implements canonical state machines, owner privacy boundaries, and rental lifecycles.
 */

// ==============================================================================
// 1. CANONICAL ENUMS & CONSTANTS
// ==============================================================================

export type EquipmentCategory =
  | "TRACTOR"
  | "HARVESTER"
  | "PLANTER"
  | "BOOM_SPRAYER"
  | "TILLER"
  | "IRRIGATION_PUMP"
  | "THRESHER"
  | "GENERATOR"
  | "OTHER";

export const EQUIPMENT_CATEGORIES: readonly EquipmentCategory[] = [
  "TRACTOR",
  "HARVESTER",
  "PLANTER",
  "BOOM_SPRAYER",
  "TILLER",
  "IRRIGATION_PUMP",
  "THRESHER",
  "GENERATOR",
  "OTHER",
] as const;

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  TRACTOR: "Tractors & Prime Movers",
  HARVESTER: "Harvesters & Combines",
  PLANTER: "Planters & Seeders",
  BOOM_SPRAYER: "Boom Sprayers & Applicators",
  TILLER: "Power Tillers & Cultivators",
  IRRIGATION_PUMP: "Irrigation Pumps & Water Delivery",
  THRESHER: "Threshers & Shellers",
  GENERATOR: "Heavy Farm Generators",
  OTHER: "Other Machinery & Implements",
};

export type EquipmentCondition = "EXCELLENT" | "GOOD" | "FAIR";

export const EQUIPMENT_CONDITIONS: readonly EquipmentCondition[] = [
  "EXCELLENT",
  "GOOD",
  "FAIR",
] as const;

export const EQUIPMENT_CONDITION_LABELS: Record<EquipmentCondition, string> = {
  EXCELLENT: "Excellent (Like New / Fully Serviced)",
  GOOD: "Good (Field Ready / Operational)",
  FAIR: "Fair (Functional / Minor Wear)",
};

export type EquipmentStatus =
  | "ACTIVE"
  | "UNDER_MAINTENANCE"
  | "RENTED"
  | "DECOMMISSIONED";

export const EQUIPMENT_STATUSES: readonly EquipmentStatus[] = [
  "ACTIVE",
  "UNDER_MAINTENANCE",
  "RENTED",
  "DECOMMISSIONED",
] as const;

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  ACTIVE: "Active & Available",
  UNDER_MAINTENANCE: "Under Maintenance",
  RENTED: "Currently Rented",
  DECOMMISSIONED: "Decommissioned / Retired",
};

export type RentalStatus =
  | "REQUESTED"
  | "APPROVED"
  | "ACTIVE"
  | "RETURNED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export const RENTAL_STATUSES: readonly RentalStatus[] = [
  "REQUESTED",
  "APPROVED",
  "ACTIVE",
  "RETURNED",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
] as const;

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  REQUESTED: "Booking Requested",
  APPROVED: "Booking Approved",
  ACTIVE: "Active Rental",
  RETURNED: "Equipment Returned",
  COMPLETED: "Rental Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

// ==============================================================================
// 2. RENTAL LIFECYCLE & STATE MACHINE
// ==============================================================================

/**
 * Valid Rental Status Transitions:
 *
 * Expected lifecycle:
 * REQUESTED -> APPROVED -> ACTIVE -> RETURNED -> COMPLETED
 *
 * Cancellation:
 * Can be cancelled before completion (from REQUESTED or APPROVED).
 *
 * Dispute:
 * DISPUTED is reachable only from APPROVED, ACTIVE, or RETURNED states.
 * DISPUTED resolution is strictly ADMIN-only, transitioning to COMPLETED or CANCELLED.
 *
 * Terminal states:
 * COMPLETED and CANCELLED have no outward transitions.
 */
export const VALID_RENTAL_TRANSITIONS: Record<
  RentalStatus,
  readonly RentalStatus[]
> = {
  REQUESTED: ["APPROVED", "CANCELLED"],
  APPROVED: ["ACTIVE", "CANCELLED", "DISPUTED"],
  ACTIVE: ["RETURNED", "DISPUTED"],
  RETURNED: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["COMPLETED", "CANCELLED"],
};

export function isValidRentalTransition(
  current: RentalStatus,
  target: RentalStatus
): boolean {
  if (current === target) return true;
  return VALID_RENTAL_TRANSITIONS[current]?.includes(target) ?? false;
}

export type RentalRole = "RENTER" | "OWNER" | "ADMIN";

/**
 * Validates whether a specific actor role is authorized to execute a rental status transition.
 */
export function isAuthorizedRentalTransition(
  role: RentalRole,
  current: RentalStatus,
  target: RentalStatus
): boolean {
  // Admins possess superuser authority across all valid transitions
  if (role === "ADMIN") return isValidRentalTransition(current, target);

  // Self-transition is a no-op
  if (current === target) return true;

  // Verify that the transition is structurally valid first
  if (!isValidRentalTransition(current, target)) return false;

  switch (current) {
    case "REQUESTED":
      if (target === "APPROVED") return role === "OWNER";
      if (target === "CANCELLED") return role === "RENTER" || role === "OWNER";
      return false;

    case "APPROVED":
      if (target === "ACTIVE") return role === "OWNER";
      if (target === "CANCELLED") return role === "RENTER" || role === "OWNER";
      if (target === "DISPUTED") return role === "RENTER" || role === "OWNER";
      return false;

    case "ACTIVE":
      if (target === "RETURNED") return role === "OWNER";
      if (target === "DISPUTED") return role === "RENTER" || role === "OWNER";
      return false;

    case "RETURNED":
      if (target === "COMPLETED") return role === "OWNER";
      if (target === "DISPUTED") return role === "RENTER" || role === "OWNER";
      return false;

    case "DISPUTED":
      // Only ADMIN can resolve a disputed rental
      return false;

    case "COMPLETED":
    case "CANCELLED":
    default:
      return false;
  }
}

// ==============================================================================
// 3. DOMAIN INTERFACES & SAFE PROFILES
// ==============================================================================

/**
 * Safe public equipment owner representation.
 * STRICT PRIVACY REQUIREMENT:
 * Sourced strictly from public.equipment_owner_profiles view.
 * MUST NOT contain phone, email, location_address, or other private profile columns.
 */
export interface SafeEquipmentOwnerProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  state: string | null;
  lga: string | null;
}

export interface Equipment {
  id: string;
  ownerId: string;
  name: string;
  category: EquipmentCategory;
  makeModel: string | null;
  yearManufactured: number | null;
  description: string | null;
  locationState: string;
  locationLga: string;
  dailyRentalRate: number;
  cautionDeposit: number;
  currency: string;
  operatorIncluded: boolean;
  condition: EquipmentCondition;
  isAvailable: boolean;
  status: EquipmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentListing extends Equipment {
  owner?: SafeEquipmentOwnerProfile | null;
  reviewStats?: {
    averageRating: number;
    totalReviews: number;
  } | null;
}

export interface EquipmentRental {
  id: string;
  equipmentId: string;
  renterId: string;
  ownerId: string;
  startDate: string; // ISO date 'YYYY-MM-DD'
  endDate: string; // ISO date 'YYYY-MM-DD'
  totalDays: number;
  dailyRate: number;
  totalRentalAmount: number;
  depositAmount: number;
  currency: string;
  status: RentalStatus;
  handoverNotes: string | null;
  returnNotes: string | null;
  createdAt: string;
  updatedAt: string;
  equipment?: Equipment | null;
  owner?: SafeEquipmentOwnerProfile | null;
  renter?: {
    id: string;
    fullName: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
  } | null;
}

export interface EquipmentFilterParams {
  search?: string;
  category?: EquipmentCategory | "all";
  state?: string;
  lga?: string;
  status?: EquipmentStatus | "all";
  condition?: EquipmentCondition | "all";
  isAvailable?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "newest" | "rate_asc" | "rate_desc";
}

export interface PaginatedEquipmentResult {
  equipment: EquipmentListing[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string | null;
}

export interface RentalFilterParams {
  equipmentId?: string;
  renterId?: string;
  ownerId?: string;
  status?: RentalStatus | "all";
  page?: number;
  limit?: number;
}

export interface PaginatedRentalsResult {
  rentals: EquipmentRental[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}
