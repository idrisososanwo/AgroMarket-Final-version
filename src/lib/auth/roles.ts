import { UserRole, USER_ROLES } from "@/types/auth";

/**
 * Checks if a user has a specific role.
 * ADMIN role possesses superuser authority across all protected scopes.
 */
export function hasRole(
  userRoles: UserRole[] | undefined | null,
  requiredRole: UserRole
): boolean {
  if (!userRoles || !Array.isArray(userRoles)) {
    return false;
  }

  // Superuser override
  if (userRoles.includes("ADMIN")) {
    return true;
  }

  return userRoles.includes(requiredRole);
}

/**
 * Checks if a user has at least one of the given roles.
 */
export function hasAnyRole(
  userRoles: UserRole[] | undefined | null,
  requiredRoles: UserRole[]
): boolean {
  if (!userRoles || !Array.isArray(userRoles) || requiredRoles.length === 0) {
    return false;
  }

  if (userRoles.includes("ADMIN")) {
    return true;
  }

  return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Checks if a user has all of the given roles.
 */
export function hasAllRoles(
  userRoles: UserRole[] | undefined | null,
  requiredRoles: UserRole[]
): boolean {
  if (!userRoles || !Array.isArray(userRoles)) {
    return false;
  }

  if (userRoles.includes("ADMIN")) {
    return true;
  }

  return requiredRoles.every((role) => userRoles.includes(role));
}

/**
 * Validates whether a given string is a recognized AgroMarket UserRole.
 */
export function isValidRole(role: string): role is UserRole {
  return (USER_ROLES as readonly string[]).includes(role);
}
