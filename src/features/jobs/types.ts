/**
 * AgroMarket Jobs Domain Types
 * Strict typing for agricultural labor, farm managers, agronomists, harvesting crews,
 * and seasonal gig placements.
 */

export type JobCategory =
  | "AGRONOMIST"
  | "FARM_MANAGER"
  | "HARVEST_CREW"
  | "MACHINE_OPERATOR"
  | "CASUAL_LABOUR"
  | "EXTENSION_OFFICER"
  | "VETERINARY"
  | "OTHER";

export const JOB_CATEGORIES: readonly JobCategory[] = [
  "AGRONOMIST",
  "FARM_MANAGER",
  "HARVEST_CREW",
  "MACHINE_OPERATOR",
  "CASUAL_LABOUR",
  "EXTENSION_OFFICER",
  "VETERINARY",
  "OTHER",
] as const;

export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  AGRONOMIST: "Agronomist / Soil Expert",
  FARM_MANAGER: "Farm Manager / Supervisor",
  HARVEST_CREW: "Harvest & Field Crew",
  MACHINE_OPERATOR: "Tractor & Machinery Operator",
  CASUAL_LABOUR: "Casual Farm Labor",
  EXTENSION_OFFICER: "Agricultural Extension Officer",
  VETERINARY: "Veterinary / Livestock Specialist",
  OTHER: "Other Agricultural Roles",
};

export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "SEASONAL"
  | "INTERNSHIP";

export const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "SEASONAL",
  "INTERNSHIP",
] as const;

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  SEASONAL: "Seasonal",
  INTERNSHIP: "Internship / Apprenticeship",
};

export type CompensationType =
  | "HOURLY"
  | "DAILY"
  | "MONTHLY"
  | "PIECE_RATE";

export const COMPENSATION_TYPES: readonly CompensationType[] = [
  "HOURLY",
  "DAILY",
  "MONTHLY",
  "PIECE_RATE",
] as const;

export const COMPENSATION_TYPE_LABELS: Record<CompensationType, string> = {
  HOURLY: "Per Hour",
  DAILY: "Per Day",
  MONTHLY: "Per Month",
  PIECE_RATE: "Per Piece / Task",
};

export type JobStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED";

export const JOB_STATUSES: readonly JobStatus[] = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "CLOSED",
] as const;

export type ApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "REJECTED"
  | "HIRED";

export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
] as const;

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  HIRED: "Hired",
  REJECTED: "Not Selected",
};

/**
 * Explicit Valid State Transitions for Jobs:
 * DRAFT  -> ACTIVE, CLOSED
 * ACTIVE -> PAUSED, CLOSED
 * PAUSED -> ACTIVE, CLOSED
 * CLOSED -> (Terminal state, no further transitions)
 */
export const VALID_JOB_STATUS_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  DRAFT: ["ACTIVE", "CLOSED"],
  ACTIVE: ["PAUSED", "CLOSED"],
  PAUSED: ["ACTIVE", "CLOSED"],
  CLOSED: [],
};

export function isValidJobStatusTransition(
  current: JobStatus,
  target: JobStatus
): boolean {
  if (current === target) return true;
  return VALID_JOB_STATUS_TRANSITIONS[current]?.includes(target) ?? false;
}

/**
 * Explicit Valid State Transitions for Job Applications:
 * SUBMITTED     -> UNDER_REVIEW, SHORTLISTED, REJECTED
 * UNDER_REVIEW  -> SHORTLISTED, REJECTED
 * SHORTLISTED   -> HIRED, REJECTED
 * REJECTED      -> (Terminal state)
 * HIRED         -> (Terminal state)
 */
export const VALID_APPLICATION_STATUS_TRANSITIONS: Record<
  ApplicationStatus,
  readonly ApplicationStatus[]
> = {
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["HIRED", "REJECTED"],
  REJECTED: [],
  HIRED: [],
};

export function isValidApplicationStatusTransition(
  current: ApplicationStatus,
  target: ApplicationStatus
): boolean {
  if (current === target) return true;
  return VALID_APPLICATION_STATUS_TRANSITIONS[current]?.includes(target) ?? false;
}

/**
 * Safe public employer profile representation.
 * STRICT PRIVACY REQUIREMENT:
 * Sourced strictly from public.jobs_employer_profiles view.
 * MUST NOT contain phone, email, location_address, or other private profile columns.
 */
export interface SafeEmployerProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  state: string | null;
  lga: string | null;
}

/**
 * Safe applicant profile representation.
 * Never exposes phone, email, or private residential addresses to unverified parties.
 */
export interface SafeApplicantProfile {
  id: string;
  fullName: string | null;
  avatarUrl?: string | null;
  state?: string | null;
  lga?: string | null;
}

export interface JobListing {
  id: string;
  employerId: string;
  title: string;
  description: string;
  category: JobCategory;
  state: string;
  lga: string;
  locationDetails: string | null;
  employmentType: EmploymentType;
  compensationType: CompensationType;
  compensationAmount: number;
  currency: string;
  requirements: string | null;
  deadline: string | null;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  employer?: SafeEmployerProfile | null;
  applicationsCount?: number;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  coverNote: string | null;
  resumeUrl: string | null;
  status: ApplicationStatus;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applicant?: SafeApplicantProfile | null;
  job?: {
    id: string;
    title: string;
    category: JobCategory;
    employerId: string;
    state: string;
    lga: string;
    status: JobStatus;
  } | null;
}

export interface JobFilterParams {
  search?: string;
  category?: JobCategory | "all";
  state?: string;
  lga?: string;
  employmentType?: EmploymentType | "all";
  compensationType?: CompensationType | "all";
  status?: JobStatus;
  page?: number;
  limit?: number;
  sortBy?: "newest" | "compensation_desc" | "compensation_asc";
}

export interface PaginatedJobsResult {
  jobs: JobListing[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string | null;
}
