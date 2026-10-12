"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server";
import { getAppBaseUrl } from "@/config/env";
import {
  ActionResponse,
  SELF_ASSIGNABLE_ROLES,
  SelfAssignableRole,
} from "@/types/auth";
import {
  nigerianPhoneSchema,
  normalizeNigerianPhone,
} from "@/lib/validation";

// ==============================================================================
// 1. SCHEMAS
// ==============================================================================

const signUpSchema = z
  .object({
    roleType: z.enum(["BUYER", "FARMER", "SERVICE_PROVIDER", "EQUIPMENT_OWNER", "BUSINESS"]).default("BUYER"),
    providerSubtype: z.enum(["EQUIPMENT_OWNER", "SERVICE_PROVIDER", "BUSINESS"]).optional(),
    fullName: z.string().min(2, "Full name must be at least 2 characters").max(150).optional(),
    phone: z.string().optional(),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    state: z.string().optional(),
    lga: z.string().optional(),
    farmName: z.string().max(150).optional(),
    produceTypes: z.string().max(255).optional(),
    businessName: z.string().max(150).optional(),
    servicesOffered: z.string().max(255).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const onboardingSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(150),
  phone: nigerianPhoneSchema,
  state: z.string().min(1, "State is required"),
  lga: z.string().min(1, "Local Government Area (LGA) is required"),
  bio: z.string().max(500).optional(),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(150),
  phone: nigerianPhoneSchema,
  state: z.string().min(1, "State is required"),
  lga: z.string().min(1, "Local Government Area (LGA) is required"),
  locationAddress: z.string().max(255).optional(),
  bio: z.string().max(500).optional(),
});

// ==============================================================================
// 2. AUTHENTICATION ACTIONS
// ==============================================================================

export async function signUpAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const rawData = {
    roleType: formData.get("roleType") || formData.get("intendedRole") || "BUYER",
    providerSubtype: formData.get("providerSubtype") || undefined,
    fullName: formData.get("fullName") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    state: formData.get("state") || undefined,
    lga: formData.get("lga") || undefined,
    farmName: formData.get("farmName") || undefined,
    produceTypes: formData.get("produceTypes") || undefined,
    businessName: formData.get("businessName") || undefined,
    servicesOffered: formData.get("servicesOffered") || undefined,
  };

  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the errors in the form.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    roleType,
    providerSubtype,
    fullName,
    phone,
    email,
    password,
    state,
    lga,
    farmName,
    produceTypes,
    businessName,
    servicesOffered,
  } = parsed.data;

  // Determine effective primary and assigned roles
  let primaryRole: SelfAssignableRole = "BUYER";
  const assignedRoles: SelfAssignableRole[] = ["BUYER"];

  if (roleType === "FARMER") {
    primaryRole = "FARMER";
    assignedRoles.push("FARMER");
  } else if (roleType === "EQUIPMENT_OWNER") {
    primaryRole = "EQUIPMENT_OWNER";
    assignedRoles.push("EQUIPMENT_OWNER");
  } else if (roleType === "BUSINESS") {
    primaryRole = "BUSINESS";
    assignedRoles.push("BUSINESS");
  } else if (roleType === "SERVICE_PROVIDER") {
    if (providerSubtype === "EQUIPMENT_OWNER") {
      primaryRole = "EQUIPMENT_OWNER";
      assignedRoles.push("EQUIPMENT_OWNER");
    } else if (providerSubtype === "BUSINESS") {
      primaryRole = "BUSINESS";
      assignedRoles.push("BUSINESS");
    } else {
      primaryRole = "SERVICE_PROVIDER";
      assignedRoles.push("SERVICE_PROVIDER");
    }
  }

  const effectiveFullName = fullName || email.split("@")[0] || "AgroMarket User";
  const effectivePhone = phone ? normalizeNigerianPhone(phone) : "08000000000";
  const effectiveState = state || "Lagos";
  const effectiveLga = lga || "Ikeja";

  const baseUrl = getAppBaseUrl();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?next=/auth/login?registered=true`,
      data: {
        full_name: effectiveFullName,
        phone: effectivePhone,
        state: effectiveState,
        lga: effectiveLga,
        intended_role: primaryRole,
        farm_name: farmName || null,
        business_name: businessName || null,
      },
    },
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  // Check if duplicate user
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return {
      success: false,
      message: "An account with this email already exists. Please log in instead.",
    };
  }

  // Safely persist profile & trusted roles in database
  if (data.user) {
    const userId = data.user.id;
    try {
      const adminClient = createAdminClient();

      let bioContent: string | null = null;
      if (primaryRole === "FARMER" && farmName) {
        bioContent = `Farm: ${farmName}${produceTypes ? ` | Produce: ${produceTypes}` : ""}`;
      } else if ((primaryRole === "SERVICE_PROVIDER" || primaryRole === "EQUIPMENT_OWNER") && businessName) {
        bioContent = `Business: ${businessName}${servicesOffered ? ` | Services: ${servicesOffered}` : ""}`;
      }

      // Upsert profile
      await adminClient.from("profiles").upsert({
        id: userId,
        full_name: effectiveFullName,
        phone: effectivePhone,
        email,
        state: effectiveState,
        lga: effectiveLga,
        bio: bioContent,
        is_verified: false,
        updated_at: new Date().toISOString(),
      });

      // Upsert user_roles
      const roleInserts = assignedRoles.map((roleCode) => ({
        user_id: userId,
        role_code: roleCode,
        assigned_by: userId,
      }));

      await adminClient
        .from("user_roles")
        .upsert(roleInserts, { onConflict: "user_id,role_code" });

      // If business profile data exists, persist to business_profiles
      if (businessName) {
        await adminClient.from("business_profiles").upsert(
          {
            user_id: userId,
            company_name: businessName,
            business_type: primaryRole === "EQUIPMENT_OWNER" ? "EQUIPMENT_LEASING" : "SOLE_PROPRIETORSHIP",
            state: effectiveState,
            lga: effectiveLga,
            office_address: `${effectiveLga}, ${effectiveState}`,
            is_verified: false,
          },
          { onConflict: "user_id" }
        );
      }
    } catch (dbErr) {
      console.warn("Could not upsert profile/roles during signup (will sync on login/verify):", dbErr);
    }
  }

  const isEmailConfirmationPending = !data.session;
  if (data.session) {
    // If auto-logged in, sign out so they go through standard login flow as required
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");

  // Redirect user to login page with clear feedback
  redirect(
    `/auth/login?registered=true&email=${encodeURIComponent(email)}${
      isEmailConfirmationPending ? "&verify=true" : ""
    }`
  );
}

export async function signInAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = signInSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please enter your email and password.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      message:
        error.message === "Invalid login credentials"
          ? "Invalid email or password. Please try again."
          : error.message,
    };
  }

  // Determine landing destination based on trusted database roles or safe return URL
  let targetDestination = "/";
  const requestedNext = formData.get("next") as string | null;
  if (
    requestedNext &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    !requestedNext.startsWith("/\\")
  ) {
    targetDestination = requestedNext;
  } else {
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();

    if (signedInUser) {
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role_code")
        .eq("user_id", signedInUser.id);

      const roles = (rolesData?.map((r) => r.role_code) || []) as string[];

      // Explicit role-based landing precedence:
      // 1. ADMIN -> /admin
      // 2. FARMER -> /farmer (producer workspace)
      // 3. EQUIPMENT_OWNER -> /equipment/owner
      // 4. SERVICE_PROVIDER / EXPERT -> /services/provider
      // 5. BUSINESS -> /business
      // 6. BUYER / default -> / (Customer shopping marketplace homepage!)
      if (roles.includes("ADMIN")) {
        targetDestination = "/admin";
      } else if (roles.includes("FARMER")) {
        targetDestination = "/farmer";
      } else if (roles.includes("EQUIPMENT_OWNER")) {
        targetDestination = "/equipment/owner";
      } else if (roles.includes("SERVICE_PROVIDER") || roles.includes("EXPERT")) {
        targetDestination = "/services/provider";
      } else if (roles.includes("BUSINESS")) {
        targetDestination = "/business";
      } else {
        targetDestination = "/"; // Customer/Buyer lands directly on the customer marketplace!
      }
    }
  }

  revalidatePath("/", "layout");
  redirect(targetDestination);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/auth/login");
}

export async function forgotPasswordAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const rawData = {
    email: formData.get("email"),
  };

  const parsed = forgotPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please provide a valid email address.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const baseUrl = getAppBaseUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "Password reset link sent! Please check your email.",
  };
}

export async function resetPasswordAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const rawData = {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = resetPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please enter a valid password.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  return {
    success: true,
    message: "Password has been successfully reset! You can now log in.",
  };
}

// ==============================================================================
// 3. ONBOARDING & ROLE ASSIGNMENT ACTIONS
// ==============================================================================

export async function completeOnboardingAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const authUser = await requireAuth();

  const rawProfile = {
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    state: formData.get("state"),
    lga: formData.get("lga"),
    bio: formData.get("bio") || undefined,
  };

  const parsed = onboardingSchema.safeParse(rawProfile);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please complete all required fields correctly.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  // Extract selected roles from form data
  const rawRoles = formData.getAll("roles") as string[];

  // CRITICAL SECURITY VALIDATION:
  // 1. ADMIN must never be self-selected!
  if (rawRoles.includes("ADMIN")) {
    return {
      success: false,
      message: "Security violation: The ADMIN role cannot be self-selected.",
    };
  }

  // 2. Validate all chosen roles against SELF_ASSIGNABLE_ROLES
  const sanitizedRoles: SelfAssignableRole[] = rawRoles.filter((r): r is SelfAssignableRole =>
    (SELF_ASSIGNABLE_ROLES as readonly string[]).includes(r)
  );

  // Default to BUYER if no roles were selected
  if (sanitizedRoles.length === 0) {
    sanitizedRoles.push("BUYER");
  }

  const supabase = await createClient();
  const normalizedPhone = normalizeNigerianPhone(parsed.data.phone);

  // 1. Upsert Profile in public.profiles
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: authUser.id,
    full_name: parsed.data.fullName,
    phone: normalizedPhone,
    email: authUser.email,
    state: parsed.data.state,
    lga: parsed.data.lga,
    bio: parsed.data.bio || null,
    is_verified: false,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    return {
      success: false,
      message: `Failed to save profile: ${profileError.message}`,
    };
  }

  // 2. Assign Non-Privileged Roles in public.user_roles
  // Uses server admin client because RLS on user_roles requires service-role/admin
  const adminClient = createAdminClient();

  const roleInserts = sanitizedRoles.map((roleCode) => ({
    user_id: authUser.id,
    role_code: roleCode,
    assigned_by: authUser.id,
  }));

  const { error: roleError } = await adminClient
    .from("user_roles")
    .upsert(roleInserts, { onConflict: "user_id,role_code" });

  if (roleError) {
    return {
      success: false,
      message: `Failed to assign roles: ${roleError.message}`,
    };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    message: "Onboarding completed successfully!",
  };
}

// ==============================================================================
// 4. PROFILE UPDATE ACTION
// ==============================================================================

export async function updateProfileAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const authUser = await requireAuth();

  const rawData = {
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    state: formData.get("state"),
    lga: formData.get("lga"),
    locationAddress: formData.get("locationAddress") || undefined,
    bio: formData.get("bio") || undefined,
  };

  const parsed = updateProfileSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the errors in the profile form.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const normalizedPhone = normalizeNigerianPhone(parsed.data.phone);

  // Update only permitted fields. User cannot change their id, is_verified, or roles here!
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: normalizedPhone,
      state: parsed.data.state,
      lga: parsed.data.lga,
      location_address: parsed.data.locationAddress || null,
      bio: parsed.data.bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authUser.id);

  if (error) {
    return {
      success: false,
      message: `Failed to update profile: ${error.message}`,
    };
  }

  revalidatePath("/account");
  return {
    success: true,
    message: "Profile updated successfully!",
  };
}
