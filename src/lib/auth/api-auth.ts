import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/server";
import { hasRole, hasAnyRole } from "@/lib/auth/roles";
import { AuthUser, UserRole } from "@/types/auth";
import { AppError, UnauthorizedError, ForbiddenError } from "@/lib/errors/app-error";

/**
 * Extracts and cryptographically validates the authenticated user for an incoming API request.
 * Supports:
 * 1. Bearer Token in `Authorization: Bearer <access_token>` (Native mobile apps)
 * 2. Fallback to HTTP-only cookies if present (Web consumers)
 *
 * CRITICAL SECURITY PRINCIPLES:
 * - Never trusts client-supplied user ID, email, or role claims in request body.
 * - Always verifies the cryptographic signature of the JWT via Supabase Auth.
 * - Roles are strictly loaded from `public.user_roles` in PostgreSQL, never from JWT claims.
 */
export async function getApiUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization");

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (!token) {
      return null;
    }

    try {
      const admin = createAdminClient();
      const {
        data: { user },
        error,
      } = await admin.auth.getUser(token);

      if (error || !user) {
        return null;
      }

      // 1. Fetch authoritative roles from public.user_roles in PostgreSQL
      const { data: userRoles, error: rolesError } = await admin
        .from("user_roles")
        .select("role_code")
        .eq("user_id", user.id);

      if (rolesError) {
        console.error("Error fetching API user roles from database:", rolesError.message);
      }

      const roles: UserRole[] =
        userRoles && userRoles.length > 0
          ? userRoles.map((r: { role_code: string }) => r.role_code as UserRole)
          : ["BUYER"];

      // 2. Fetch profile from public.profiles in PostgreSQL
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("full_name, phone, state, lga, is_verified")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching API user profile from database:", profileError.message);
      }

      const isOnboarded = Boolean(
        profile && profile.full_name && profile.phone && profile.state && profile.lga,
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
    } catch (err) {
      console.error("Failed to authenticate API Bearer token:", err);
      return null;
    }
  }

  // Fallback to cookie-based session if called within web browser environment
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/**
 * Enforces that an incoming API request contains a valid, authenticated user.
 * Throws `UnauthorizedError` (HTTP 401) if unauthenticated.
 */
export async function requireApiAuth(req: Request): Promise<AuthUser> {
  const user = await getApiUser(req);
  if (!user) {
    throw new UnauthorizedError("Authentication required. Please provide a valid Bearer token.");
  }
  return user;
}

/**
 * Enforces that the authenticated user possesses a specific role.
 * Throws `ForbiddenError` (HTTP 403) if role requirement is unmet.
 */
export async function requireApiRole(req: Request, role: UserRole): Promise<AuthUser> {
  const user = await requireApiAuth(req);
  if (!hasRole(user.roles, role)) {
    throw new ForbiddenError(`Access denied. Missing required role: ${role}`);
  }
  return user;
}

/**
 * Enforces that the authenticated user possesses at least one of the specified roles.
 * Throws `ForbiddenError` (HTTP 403) if none of the roles are met.
 */
export async function requireApiAnyRole(req: Request, roles: UserRole[]): Promise<AuthUser> {
  const user = await requireApiAuth(req);
  if (!hasAnyRole(user.roles, roles)) {
    throw new ForbiddenError(`Access denied. Requires one of: ${roles.join(", ")}`);
  }
  return user;
}

/**
 * Standardized API Route error handler.
 * Maps domain errors, Zod validation errors, and unexpected exceptions to uniform JSON responses.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed.",
        code: "VALIDATION_ERROR",
        details: error.flatten().fieldErrors,
      },
      {
        status: 422,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      },
      {
        status: error.statusCode,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  console.error("Unhandled API error:", error);
  const message = error instanceof Error ? error.message : "An unexpected server error occurred.";

  if (typeof message === "string") {
    if (message.toLowerCase().includes("unauthorized")) {
      return NextResponse.json(
        {
          success: false,
          error: message,
          code: "FORBIDDEN",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    if (message.toLowerCase().includes("not found")) {
      return NextResponse.json(
        {
          success: false,
          error: message,
          code: "NOT_FOUND",
        },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: message,
      code: "INTERNAL_SERVER_ERROR",
    },
    {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
