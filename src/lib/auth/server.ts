import { createClient } from "@/lib/supabase/server";
import { AuthUser, UserRole } from "@/types/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors/app-error";
import { hasAnyRole, hasRole } from "./roles";

/**
 * Retrieves the currently authenticated user on the server.
 * Uses Supabase's secure getUser() to cryptographically validate the auth token,
 * then fetches authoritative roles and profile state directly from PostgreSQL.
 *
 * CRITICAL SECURITY PRINCIPLE:
 * Roles are strictly retrieved from the database `public.user_roles` table,
 * NEVER from client-controlled user_metadata or cookies.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // 1. Fetch authoritative roles from public.user_roles in PostgreSQL
  const { data: userRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("role_code")
    .eq("user_id", user.id);

  if (rolesError) {
    console.error("Error fetching user roles from database:", rolesError.message);
  }

  const roles: UserRole[] =
    userRoles && userRoles.length > 0
      ? userRoles.map((r: { role_code: string }) => r.role_code as UserRole)
      : ["BUYER"];

  // 2. Fetch profile from public.profiles in PostgreSQL
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, phone, state, lga, is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching profile from database:", profileError.message);
  }

  const isOnboarded = Boolean(
    profile &&
      profile.full_name &&
      profile.phone &&
      profile.state &&
      profile.lga
  );

  return {
    id: user.id,
    email: user.email ?? null,
    phone: profile?.phone ?? user.phone ?? null,
    fullName: profile?.full_name ?? null,
    state: profile?.state ?? null,
    lga: profile?.lga ?? null,
    roles,
    isEmailVerified: Boolean(user.email_confirmed_at),
    isPhoneVerified: Boolean(user.phone_confirmed_at),
    isVerified: Boolean(profile?.is_verified),
    isOnboarded,
    createdAt: user.created_at,
  };
}

/**
 * Server guard: Guarantees that a valid user session exists.
 * Throws UnauthorizedError if unauthenticated.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

/**
 * Server guard: Enforces that the user has completed initial profile onboarding.
 */
export async function requireOnboarded(): Promise<AuthUser> {
  const user = await requireAuth();
  if (!user.isOnboarded) {
    throw new ForbiddenError("Please complete your profile onboarding to proceed.");
  }
  return user;
}

/**
 * Server guard: Enforces that the user has a specific role.
 * Throws ForbiddenError if the role requirement is unmet.
 */
export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasRole(user.roles, role)) {
    throw new ForbiddenError(`Access denied. Missing required role: ${role}`);
  }
  return user;
}

/**
 * Server guard: Enforces that the user has at least one of the specified roles.
 * Throws ForbiddenError if none of the roles are met.
 */
export async function requireAnyRole(roles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasAnyRole(user.roles, roles)) {
    throw new ForbiddenError(
      `Access denied. Requires one of: ${roles.join(", ")}`
    );
  }
  return user;
}
