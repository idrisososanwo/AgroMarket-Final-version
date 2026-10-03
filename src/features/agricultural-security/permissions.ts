import { AuthUser } from "@/types/auth";
import { hasAnyRole, hasRole } from "@/lib/auth/roles";
import { SecurityIncident, SecurityVerificationStatus } from "./types";

/**
 * Checks whether the current user has administrative authority over agricultural security.
 */
export function canManageSecurityIncidents(user: AuthUser | null): boolean {
  if (!user) return false;
  return hasRole(user.roles, "ADMIN");
}

/**
 * Checks whether the current user is authorized to create security incident drafts.
 * Admins and verified agricultural Experts can submit drafts.
 */
export function canCreateSecurityDraft(user: AuthUser | null): boolean {
  if (!user) return false;
  return hasAnyRole(user.roles, ["ADMIN", "EXPERT"]);
}

/**
 * Checks whether the current user can edit a specific incident.
 * Admins can edit any incident. Experts can only edit their own unverified drafts.
 */
export function canEditSecurityIncident(
  user: AuthUser | null,
  incident: Pick<SecurityIncident, "createdBy" | "status" | "verificationStatus">
): boolean {
  if (!user) return false;
  if (hasRole(user.roles, "ADMIN")) return true;

  if (hasRole(user.roles, "EXPERT")) {
    const isOwner = incident.createdBy === user.id;
    const isDraft = incident.status === "DRAFT";
    const isUnpromoted =
      incident.verificationStatus === "UNVERIFIED" ||
      incident.verificationStatus === "REPORTED";
    return isOwner && isDraft && isUnpromoted;
  }

  return false;
}

/**
 * Checks whether the user can change verification status (e.g. promote to VERIFIED or OFFICIAL).
 * Only ADMIN is permitted to elevate verification state.
 */
export function canVerifySecurityIncident(
  user: AuthUser | null,
  _targetStatus: SecurityVerificationStatus
): boolean {
  if (!user) return false;
  return hasRole(user.roles, "ADMIN");
}

/**
 * Checks whether the user can publish or archive security records.
 * Only ADMIN is permitted to publish or archive.
 */
export function canPublishSecurityIncident(user: AuthUser | null): boolean {
  if (!user) return false;
  return hasRole(user.roles, "ADMIN");
}
