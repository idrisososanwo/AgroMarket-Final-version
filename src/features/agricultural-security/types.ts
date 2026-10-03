/**
 * AgroMarket Agricultural Security & Food Security Domain Types
 * Phase 1.5: Physical Agricultural Security, Food Resilience,
 * and Security-Aware Logistics Advisory Layer.
 */

export const INCIDENT_TYPES = [
  "FARM_ATTACK",
  "KIDNAPPING_SECURITY_THREAT",
  "FARM_ACCESS_DISRUPTION",
  "LOGISTICS_CORRIDOR_INCIDENT",
  "THEFT_OR_ROBBERY",
  "MOVEMENT_RESTRICTION",
  "AGRICULTURAL_MARKET_DISRUPTION",
  "OTHER_AGRICULTURAL_SECURITY_EVENT",
] as const;

export type SecurityIncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_SEVERITY_LEVELS = [
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL",
] as const;

export type SecurityIncidentSeverity = (typeof INCIDENT_SEVERITY_LEVELS)[number];

export const INCIDENT_VERIFICATION_STATUSES = [
  "UNVERIFIED",
  "REPORTED",
  "VERIFIED",
  "OFFICIAL",
  "CORRECTED",
  "ARCHIVED",
] as const;

export type SecurityVerificationStatus = (typeof INCIDENT_VERIFICATION_STATUSES)[number];

export const INCIDENT_SOURCE_TYPES = [
  "OFFICIAL",
  "NEWS",
  "PARTNER",
  "EXPERT",
  "COMMUNITY_REPORT",
  "OTHER",
] as const;

export type SecuritySourceType = (typeof INCIDENT_SOURCE_TYPES)[number];

export const INCIDENT_LOCATION_SCOPES = [
  "STATE",
  "LGA",
  "REGION_CORRIDOR",
  "GENERAL_AREA",
] as const;

export type SecurityLocationScope = (typeof INCIDENT_LOCATION_SCOPES)[number];

export const INCIDENT_PUBLICATION_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type SecurityIncidentStatus = (typeof INCIDENT_PUBLICATION_STATUSES)[number];

export interface SafeSecurityReporterProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  state: string | null;
}

export interface SecurityIncident {
  id: string;
  title: string;
  slug: string;
  incidentType: SecurityIncidentType;
  status: SecurityIncidentStatus;
  severity: SecurityIncidentSeverity;
  description: string;
  occurredAt: string | null;
  reportedAt: string;
  publishedAt: string | null;
  sourceName: string;
  sourceType: SecuritySourceType;
  sourceUrl: string | null;
  sourcePublicationDate: string | null;
  verificationStatus: SecurityVerificationStatus;
  state: string;
  lga: string | null;
  locationScope: SecurityLocationScope;
  affectedCommodities: string[];
  affectedCategories: string[];
  movementImpact: string | null;
  foodSecurityImpact: string | null;
  editorialNotes: string | null;
  createdBy: string | null;
  creator?: SafeSecurityReporterProfile | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface SecurityIncidentFilterParams {
  search?: string;
  incidentType?: SecurityIncidentType | "all";
  severity?: SecurityIncidentSeverity | "all";
  verificationStatus?: SecurityVerificationStatus | "all";
  state?: string | "all";
  status?: SecurityIncidentStatus | "all";
  commodity?: string | "all";
  page?: number;
  limit?: number;
}

export interface PaginatedSecurityIncidentsResult {
  incidents: SecurityIncident[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Logistics security advisory representation for transit and destination checks.
 */
export interface LogisticsCorridorAdvisory {
  state: string;
  activeDisruptionsCount: number;
  highestSeverity: SecurityIncidentSeverity | null;
  hasMovementRestrictions: boolean;
  latestIncidentTitle?: string;
  latestIncidentSlug?: string;
  publishedAt?: string;
}
