/**
 * AgroMarket User Roles.
 * A single user can possess multiple roles simultaneously (e.g. FARMER and EQUIPMENT_OWNER).
 */
export const USER_ROLES = [
  "BUYER",
  "FARMER",
  "BUSINESS",
  "JOB_SEEKER",
  "SERVICE_PROVIDER",
  "EQUIPMENT_OWNER",
  "EXPERT",
  "ADMIN",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * Roles that a user can self-select during onboarding.
 * CRITICAL: ADMIN is strictly excluded and cannot be self-assigned.
 */
export const SELF_ASSIGNABLE_ROLES = [
  "BUYER",
  "FARMER",
  "BUSINESS",
  "JOB_SEEKER",
  "SERVICE_PROVIDER",
  "EQUIPMENT_OWNER",
  "EXPERT",
] as const;

export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  state: string | null;
  lga: string | null;
  roles: UserRole[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isVerified: boolean;
  isOnboarded: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  avatarUrl?: string | null;
  locationAddress?: string | null;
  state: string;
  lga: string;
  bio?: string | null;
  isVerified: boolean;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AuthUser | null;
  accessToken?: string;
  expiresAt?: number;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}
