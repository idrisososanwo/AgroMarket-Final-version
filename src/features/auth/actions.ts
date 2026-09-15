"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server";
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
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
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
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = signUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the errors in the form.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify`,
    },
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  // If email confirmation is required by Supabase
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return {
      success: false,
      message: "An account with this email already exists. Please log in instead.",
    };
  }

  return {
    success: true,
    message: "Registration successful! Please check your email to verify your account.",
  };
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

  revalidatePath("/", "layout");
  return {
    success: true,
    message: "Signed in successfully.",
  };
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

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password`,
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
