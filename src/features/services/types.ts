/**
 * AgroMarket Services Domain Types
 * Strict typing for agricultural service providers (tractor operation, soil testing,
 * drone spraying, veterinary, land clearing, irrigation, and consulting).
 */

export type ServiceCategory =
  | "TRACTOR_OPERATOR"
  | "SOIL_TESTING"
  | "DRONE_SPRAYING"
  | "VETERINARY"
  | "LAND_CLEARING"
  | "IRRIGATION"
  | "AG_CONSULTING"
  | "PROCESSING"
  | "OTHER";

export const SERVICE_CATEGORIES: readonly ServiceCategory[] = [
  "TRACTOR_OPERATOR",
  "SOIL_TESTING",
  "DRONE_SPRAYING",
  "VETERINARY",
  "LAND_CLEARING",
  "IRRIGATION",
  "AG_CONSULTING",
  "PROCESSING",
  "OTHER",
] as const;

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  TRACTOR_OPERATOR: "Tractor & Heavy Machinery Operation",
  SOIL_TESTING: "Soil Testing & Nutrient Analysis",
  DRONE_SPRAYING: "Drone Spraying & Aerial Survey",
  VETERINARY: "Veterinary & Animal Health Services",
  LAND_CLEARING: "Land Clearing & Earth Moving",
  IRRIGATION: "Irrigation Setup & Maintenance",
  AG_CONSULTING: "Agricultural Extension & Consulting",
  PROCESSING: "Post-Harvest Crop Processing & Milling",
  OTHER: "Other Specialized Farm Services",
};

export type PricingModel =
  | "FIXED"
  | "PER_HECTARE"
  | "PER_HOUR"
  | "QUOTE_BASED";

export const PRICING_MODELS: readonly PricingModel[] = [
  "FIXED",
  "PER_HECTARE",
  "PER_HOUR",
  "QUOTE_BASED",
] as const;

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  FIXED: "Fixed Fee",
  PER_HECTARE: "Per Hectare",
  PER_HOUR: "Per Hour",
  QUOTE_BASED: "Quote-based / Custom Assessment",
};

export type ServiceRequestStatus =
  | "PENDING"
  | "QUOTED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export const SERVICE_REQUEST_STATUSES: readonly ServiceRequestStatus[] = [
  "PENDING",
  "QUOTED",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
] as const;

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  PENDING: "Pending Review",
  QUOTED: "Quote Provided",
  ACCEPTED: "Quote Accepted",
  IN_PROGRESS: "Work In Progress",
  COMPLETED: "Service Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

/**
 * Service Request Lifecycle State Machine:
 * PENDING     -> QUOTED, CANCELLED
 * QUOTED      -> ACCEPTED, CANCELLED
 * ACCEPTED    -> IN_PROGRESS, CANCELLED
 * IN_PROGRESS -> COMPLETED, DISPUTED
 * COMPLETED   -> DISPUTED (Terminal unless contested)
 * CANCELLED   -> (Terminal)
 * DISPUTED    -> COMPLETED, CANCELLED (Admin resolution only)
 */
export const VALID_SERVICE_REQUEST_TRANSITIONS: Record<
  ServiceRequestStatus,
  readonly ServiceRequestStatus[]
> = {
  PENDING: ["QUOTED", "CANCELLED"],
  QUOTED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED"],
  COMPLETED: ["DISPUTED"],
  CANCELLED: [],
  DISPUTED: ["COMPLETED", "CANCELLED"],
};

export function isValidServiceRequestTransition(
  current: ServiceRequestStatus,
  target: ServiceRequestStatus
): boolean {
  if (current === target) return true;
  return VALID_SERVICE_REQUEST_TRANSITIONS[current]?.includes(target) ?? false;
}

export type RequestRole = "CLIENT" | "PROVIDER" | "ADMIN";

/**
 * Validates whether a participant role is authorized to execute a specific status transition.
 */
export function isAuthorizedRequestTransition(
  role: RequestRole,
  current: ServiceRequestStatus,
  target: ServiceRequestStatus
): boolean {
  if (role === "ADMIN") return true;

  if (current === target) return true;

  if (current === "PENDING") {
    if (target === "QUOTED") return role === "PROVIDER";
    if (target === "CANCELLED") return role === "CLIENT" || role === "PROVIDER";
  }
  if (current === "QUOTED") {
    if (target === "ACCEPTED") return role === "CLIENT";
    if (target === "CANCELLED") return role === "CLIENT" || role === "PROVIDER";
  }
  if (current === "ACCEPTED") {
    if (target === "IN_PROGRESS") return role === "PROVIDER";
    if (target === "CANCELLED") return role === "CLIENT" || role === "PROVIDER";
  }
  if (current === "IN_PROGRESS") {
    if (target === "COMPLETED") return role === "PROVIDER" || role === "CLIENT";
    if (target === "DISPUTED") return role === "CLIENT" || role === "PROVIDER";
  }
  if (current === "COMPLETED") {
    if (target === "DISPUTED") return role === "CLIENT";
  }
  if (current === "DISPUTED") {
    // Only Admin can resolve a disputed request
    return false;
  }
  return false;
}

/**
 * Safe public provider profile representation.
 * STRICT PRIVACY REQUIREMENT:
 * Sourced strictly from public.services_provider_profiles view.
 * MUST NOT contain phone, email, location_address, or other private profile columns.
 */
export interface SafeProviderProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  state: string | null;
  lga: string | null;
}

export interface ServiceListing {
  id: string;
  providerId: string;
  title: string;
  description: string;
  serviceCategory: ServiceCategory;
  coverageStates: string[];
  pricingModel: PricingModel;
  baseRate: number;
  currency: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  provider?: SafeProviderProfile | null;
  requestsCount?: number;
}

export interface ServiceRequest {
  id: string;
  serviceId: string;
  clientId: string;
  providerId: string;
  details: string;
  state: string;
  lga: string;
  locationAddress: string;
  proposedDate: string;
  quotedAmount: number | null;
  currency: string;
  status: ServiceRequestStatus;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    fullName: string | null;
    avatarUrl?: string | null;
    phone?: string | null;
  } | null;
  service?: {
    id: string;
    title: string;
    serviceCategory: ServiceCategory;
    pricingModel: PricingModel;
  } | null;
  provider?: SafeProviderProfile | null;
}

export interface ServiceFilterParams {
  search?: string;
  serviceCategory?: ServiceCategory | "all";
  coverageState?: string;
  isAvailable?: boolean;
  pricingModel?: PricingModel | "all";
  page?: number;
  limit?: number;
  sortBy?: "newest" | "rate_asc" | "rate_desc";
}

export interface PaginatedServicesResult {
  services: ServiceListing[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}
