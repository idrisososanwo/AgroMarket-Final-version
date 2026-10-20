import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleApiError } from "@/lib/auth/api-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { SELF_ASSIGNABLE_ROLES, SelfAssignableRole, UserRole } from "@/types/auth";
import { nigerianPhoneSchema, normalizeNigerianPhone } from "@/lib/validation";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { ConflictError, ForbiddenError, ValidationError } from "@/lib/errors/app-error";
import { getAppBaseUrl } from "@/config/env";

export const dynamic = "force-dynamic";

const registerBodySchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(150),
  phone: nigerianPhoneSchema,
  email: z.string().trim().email("Please enter a valid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  state: z.string().refine((val) => (NIGERIAN_STATES as readonly string[]).includes(val), {
    message: "Please select a valid Nigerian state.",
  }),
  lga: z.string().trim().min(1, "Local Government Area (LGA) is required").max(100),
  roleType: z.string().default("BUYER"),
  providerSubtype: z.enum(["EQUIPMENT_OWNER", "SERVICE_PROVIDER", "BUSINESS"]).optional(),
  additionalRoles: z.array(z.string()).optional(),
  farmName: z.string().trim().max(150).optional(),
  produceTypes: z.string().trim().max(255).optional(),
  businessName: z.string().trim().max(150).optional(),
  servicesOffered: z.string().trim().max(255).optional(),
  bio: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting: 10 registrations per minute per IP
    const clientIp = getClientIp(req);
    const rateLimit = checkRateLimit(`register:${clientIp}`, 10, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many registration attempts. Please try again later.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // 2. Validate Request Body
    const json = await req.json().catch(() => null);
    if (!json || typeof json !== "object") {
      throw new ValidationError("Malformed JSON request body.");
    }

    const parsed = registerBodySchema.safeParse(json);
    if (!parsed.success) {
      return handleApiError(parsed.error);
    }

    const {
      fullName,
      phone,
      email,
      password,
      state,
      lga,
      roleType,
      providerSubtype,
      additionalRoles = [],
      farmName,
      produceTypes,
      businessName,
      servicesOffered,
      bio,
    } = parsed.data;

    // 3. Strict Anti-Self-Promotion: Prohibit self-assignment of ADMIN role
    if (
      roleType.toUpperCase() === "ADMIN" ||
      additionalRoles.some((r) => r.toUpperCase() === "ADMIN")
    ) {
      throw new ForbiddenError("Self-assignment of the ADMIN role is strictly prohibited.");
    }

    // Verify all requested roles are valid self-assignable roles
    const allRequestedRoles = [roleType, ...additionalRoles];
    for (const role of allRequestedRoles) {
      if (!(SELF_ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
        throw new ValidationError(
          `Invalid role: '${role}'. Must be one of: ${SELF_ASSIGNABLE_ROLES.join(", ")}`,
        );
      }
    }

    // 4. Compute Effective Assigned Roles
    // Every user receives BUYER role automatically
    const assignedRolesSet = new Set<SelfAssignableRole>(["BUYER"]);

    if (roleType === "FARMER") {
      assignedRolesSet.add("FARMER");
    } else if (roleType === "EQUIPMENT_OWNER") {
      assignedRolesSet.add("EQUIPMENT_OWNER");
    } else if (roleType === "BUSINESS") {
      assignedRolesSet.add("BUSINESS");
    } else if (roleType === "SERVICE_PROVIDER") {
      if (providerSubtype === "EQUIPMENT_OWNER") {
        assignedRolesSet.add("EQUIPMENT_OWNER");
      } else if (providerSubtype === "BUSINESS") {
        assignedRolesSet.add("BUSINESS");
      } else {
        assignedRolesSet.add("SERVICE_PROVIDER");
      }
    } else if ((SELF_ASSIGNABLE_ROLES as readonly string[]).includes(roleType)) {
      assignedRolesSet.add(roleType as SelfAssignableRole);
    }

    // Add any additional valid roles
    for (const r of additionalRoles) {
      if ((SELF_ASSIGNABLE_ROLES as readonly string[]).includes(r)) {
        assignedRolesSet.add(r as SelfAssignableRole);
      }
    }

    const assignedRoles = Array.from(assignedRolesSet);
    const normalizedPhone = normalizeNigerianPhone(phone);
    const adminClient = createAdminClient();

    // 5. Check for Existing Account
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      throw new ConflictError("An account with this email address already exists. Please log in.");
    }

    // 6. Create User in Supabase Auth
    const baseUrl = getAppBaseUrl();
    const supabase = await createClient();

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback?next=/account`,
        data: {
          full_name: fullName,
          phone: normalizedPhone,
          state,
          lga,
          intended_role: roleType,
          farm_name: farmName || null,
          business_name: businessName || null,
        },
      },
    });

    if (authErr) {
      throw new ValidationError(authErr.message);
    }

    const authUser = authData.user;
    if (!authUser) {
      throw new Error("User creation failed: Supabase did not return a user identifier.");
    }
    const userId = authUser.id;

    // Check if Supabase detected duplicate identity
    if (authUser.identities && authUser.identities.length === 0) {
      throw new ConflictError("An account with this email address already exists. Please log in.");
    }

    // 7. Persist Profile in PostgreSQL
    let computedBio = bio || null;
    if (!computedBio) {
      if (assignedRoles.includes("FARMER") && farmName) {
        computedBio = `Farm: ${farmName}${produceTypes ? ` | Produce: ${produceTypes}` : ""}`;
      } else if (
        (assignedRoles.includes("SERVICE_PROVIDER") || assignedRoles.includes("EQUIPMENT_OWNER")) &&
        businessName
      ) {
        computedBio = `Business: ${businessName}${servicesOffered ? ` | Services: ${servicesOffered}` : ""}`;
      }
    }

    const { error: profileErr } = await adminClient.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      phone: normalizedPhone,
      email,
      state,
      lga,
      bio: computedBio,
      is_verified: false,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.error("Failed to upsert profile in database:", profileErr);
      throw new Error("Failed to save user profile record.");
    }

    // 8. Persist Assigned Roles in PostgreSQL
    const roleInserts = assignedRoles.map((roleCode) => ({
      user_id: userId,
      role_code: roleCode,
      assigned_by: userId,
    }));

    const { error: rolesErr } = await adminClient
      .from("user_roles")
      .upsert(roleInserts, { onConflict: "user_id,role_code" });

    if (rolesErr) {
      console.error("Failed to assign user roles in database:", rolesErr);
      throw new Error("Failed to assign user roles.");
    }

    // 9. Persist Agribusiness Profile if applicable
    if (businessName || assignedRoles.includes("BUSINESS")) {
      const companyName = businessName || `${fullName}'s Agribusiness`;
      await adminClient.from("business_profiles").upsert(
        {
          user_id: userId,
          company_name: companyName,
          business_type: assignedRoles.includes("EQUIPMENT_OWNER")
            ? "EQUIPMENT_LEASING"
            : "SOLE_PROPRIETORSHIP",
          state,
          lga,
          office_address: `${lga}, ${state}`,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: userId,
            email,
            fullName,
            phone: normalizedPhone,
            state,
            lga,
            roles: assignedRoles as UserRole[],
            isOnboarded: true,
          },
          message: "Registration completed successfully.",
        },
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
