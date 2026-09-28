"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import {
  isValidServiceRequestTransition,
  isAuthorizedRequestTransition,
  RequestRole,
  ServiceRequestStatus,
} from "./types";
import {
  ActionResponse,
  createServiceSchema,
  updateServiceSchema,
  toggleServiceAvailabilitySchema,
  createServiceRequestSchema,
  updateServiceRequestStatusSchema,
} from "./validation";

/**
 * Creates a new agricultural service offering.
 *
 * AUTHORIZATION:
 * - Requires SERVICE_PROVIDER, EXPERT, or ADMIN role.
 * - Provider ID is bound strictly to auth.uid() from the authenticated session.
 * - Never accepts an arbitrary provider_id from the client.
 */
export async function createServiceAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ serviceId: string }>> {
  try {
    const user = await requireAnyRole(["SERVICE_PROVIDER", "EXPERT"]);
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    // Handle coverageStates if passed as comma-separated or json from FormData
    const coverageInput = raw.coverageStates;
    if (typeof coverageInput === "string") {
      try {
        raw.coverageStates = JSON.parse(coverageInput);
      } catch {
        raw.coverageStates = coverageInput.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const parsed = createServiceSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check the service details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      title,
      description,
      serviceCategory,
      coverageStates,
      pricingModel,
      baseRate,
      currency,
      isAvailable,
    } = parsed.data;

    const supabase = await createClient();

    const { data: newService, error } = await supabase
      .from("services")
      .insert({
        provider_id: user.id,
        title: title.trim(),
        description: description.trim(),
        service_category: serviceCategory,
        coverage_states: coverageStates,
        pricing_model: pricingModel,
        base_rate: baseRate,
        currency: currency || "NGN",
        is_available: isAvailable ?? true,
      })
      .select("id")
      .single();

    if (error || !newService) {
      console.error("Database error creating service:", error);
      return {
        success: false,
        error: "Failed to create service offering. Please try again later.",
      };
    }

    revalidatePath("/services");

    return {
      success: true,
      data: { serviceId: newService.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create service";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Updates an existing agricultural service offering.
 *
 * AUTHORIZATION:
 * - Only the service provider (provider_id === auth.uid()) or an authorized ADMIN may edit.
 */
export async function updateServiceAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ serviceId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const coverageInput = raw.coverageStates;
    if (typeof coverageInput === "string") {
      try {
        raw.coverageStates = JSON.parse(coverageInput);
      } catch {
        raw.coverageStates = coverageInput.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const parsed = updateServiceSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check your inputs.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { serviceId, ...updateFields } = parsed.data;

    const supabase = await createClient();

    // Verify existence and ownership
    const { data: existingService, error: fetchErr } = await supabase
      .from("services")
      .select("id, provider_id")
      .eq("id", serviceId)
      .maybeSingle();

    if (fetchErr || !existingService) {
      return {
        success: false,
        error: "Service listing not found.",
      };
    }

    const isOwner = existingService.provider_id === user.id;
    const isAdmin = hasRole(user.roles, "ADMIN");

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: "Unauthorized. You can only edit your own service offerings.",
      };
    }

    const dbPayload: Record<string, unknown> = {};
    if (updateFields.title !== undefined) dbPayload.title = updateFields.title.trim();
    if (updateFields.description !== undefined) dbPayload.description = updateFields.description.trim();
    if (updateFields.serviceCategory !== undefined) dbPayload.service_category = updateFields.serviceCategory;
    if (updateFields.coverageStates !== undefined) dbPayload.coverage_states = updateFields.coverageStates;
    if (updateFields.pricingModel !== undefined) dbPayload.pricing_model = updateFields.pricingModel;
    if (updateFields.baseRate !== undefined) dbPayload.base_rate = updateFields.baseRate;
    if (updateFields.currency !== undefined) dbPayload.currency = updateFields.currency;
    if (updateFields.isAvailable !== undefined) dbPayload.is_available = updateFields.isAvailable;

    if (Object.keys(dbPayload).length === 0) {
      return {
        success: true,
        data: { serviceId },
      };
    }

    let updateError: unknown = null;
    if (isAdmin && !isOwner) {
      const adminClient = createAdminClient();
      const { error } = await adminClient
        .from("services")
        .update(dbPayload)
        .eq("id", serviceId);
      updateError = error;
    } else {
      const { error } = await supabase
        .from("services")
        .update(dbPayload)
        .eq("id", serviceId);
      updateError = error;
    }

    if (updateError) {
      console.error("Database error updating service:", updateError);
      return {
        success: false,
        error: "Failed to update service offering. Please try again later.",
      };
    }

    revalidatePath("/services");
    revalidatePath(`/services/${serviceId}`);

    return {
      success: true,
      data: { serviceId },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update service";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Toggles the availability of a service.
 *
 * AUTHORIZATION:
 * - Only the provider or an authorized ADMIN may change availability.
 */
export async function toggleServiceAvailabilityAction(
  input: { serviceId: string; isAvailable: boolean }
): Promise<ActionResponse<{ serviceId: string; isAvailable: boolean }>> {
  try {
    const user = await requireAuth();

    const parsed = toggleServiceAvailabilitySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid availability toggle parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { serviceId, isAvailable } = parsed.data;

    const supabase = await createClient();

    const { data: existingService, error: fetchErr } = await supabase
      .from("services")
      .select("id, provider_id, is_available")
      .eq("id", serviceId)
      .maybeSingle();

    if (fetchErr || !existingService) {
      return {
        success: false,
        error: "Service listing not found.",
      };
    }

    const isOwner = existingService.provider_id === user.id;
    const isAdmin = hasRole(user.roles, "ADMIN");

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: "Unauthorized. You can only modify availability of your own services.",
      };
    }

    let updateError: unknown = null;
    if (isAdmin && !isOwner) {
      const adminClient = createAdminClient();
      const { error } = await adminClient
        .from("services")
        .update({ is_available: isAvailable })
        .eq("id", serviceId);
      updateError = error;
    } else {
      const { error } = await supabase
        .from("services")
        .update({ is_available: isAvailable })
        .eq("id", serviceId);
      updateError = error;
    }

    if (updateError) {
      console.error("Database error updating service availability:", updateError);
      return {
        success: false,
        error: "Failed to update service availability.",
      };
    }

    revalidatePath("/services");
    revalidatePath(`/services/${serviceId}`);

    return {
      success: true,
      data: { serviceId, isAvailable },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle service availability";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Creates a service request for an available service.
 *
 * AUTHORIZATION & RULES:
 * - Only authenticated users can submit a request.
 * - Client ID is derived strictly from auth.uid().
 * - Provider ID is derived strictly from the target service record in the database.
 * - Service must be available (is_available === true).
 * - Providers cannot request their own services.
 */
export async function createServiceRequestAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ requestId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = createServiceRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify the request details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { serviceId, details, state, lga, locationAddress, proposedDate } = parsed.data;

    const supabase = await createClient();

    // 1. Fetch service to verify availability and derive authoritative provider_id
    const { data: service, error: servErr } = await supabase
      .from("services")
      .select("id, provider_id, is_available")
      .eq("id", serviceId)
      .maybeSingle();

    if (servErr || !service) {
      return {
        success: false,
        error: "Selected service offering not found.",
      };
    }

    if (!service.is_available) {
      return {
        success: false,
        error: "This service offering is currently unavailable for new bookings.",
      };
    }

    if (service.provider_id === user.id) {
      return {
        success: false,
        error: "You cannot request your own service offering.",
      };
    }

    // 2. Insert into public.service_requests
    const { data: newRequest, error: insertErr } = await supabase
      .from("service_requests")
      .insert({
        service_id: serviceId,
        client_id: user.id,
        provider_id: service.provider_id,
        details: details.trim(),
        state: state.trim(),
        lga: lga.trim(),
        location_address: locationAddress.trim(),
        proposed_date: proposedDate,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (insertErr || !newRequest) {
      console.error("Database error creating service request:", insertErr);
      return {
        success: false,
        error: "Failed to submit service request. Please try again later.",
      };
    }

    revalidatePath("/services/requests");

    return {
      success: true,
      data: { requestId: newRequest.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create service request";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Updates the status of a service request according to the lifecycle state machine.
 *
 * LIFECYCLE & ROLE RULES:
 * - PENDING -> QUOTED (Provider only, with quotedAmount)
 * - PENDING -> CANCELLED (Client or Provider)
 * - QUOTED -> ACCEPTED (Client only)
 * - QUOTED -> CANCELLED (Client or Provider)
 * - ACCEPTED -> IN_PROGRESS (Provider only)
 * - ACCEPTED -> CANCELLED (Client or Provider)
 * - IN_PROGRESS -> COMPLETED (Provider or Client)
 * - IN_PROGRESS -> DISPUTED (Client or Provider)
 * - COMPLETED -> DISPUTED (Client only)
 * - DISPUTED -> COMPLETED or CANCELLED (Admin only)
 */
export async function updateServiceRequestStatusAction(
  input: {
    requestId: string;
    status: ServiceRequestStatus;
    quotedAmount?: number;
  }
): Promise<ActionResponse<{ requestId: string; status: ServiceRequestStatus }>> {
  try {
    const user = await requireAuth();

    const parsed = updateServiceRequestStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid service request status update parameters.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { requestId, status: targetStatus, quotedAmount } = parsed.data;

    const supabase = await createClient();

    // Fetch existing request to verify participants and current status
    const { data: request, error: fetchErr } = await supabase
      .from("service_requests")
      .select("id, client_id, provider_id, status, quoted_amount")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchErr || !request) {
      return {
        success: false,
        error: "Service request not found.",
      };
    }

    const isClient = request.client_id === user.id;
    const isProvider = request.provider_id === user.id;
    const isAdmin = hasRole(user.roles, "ADMIN");

    if (!isClient && !isProvider && !isAdmin) {
      return {
        success: false,
        error: "Unauthorized. You are not a participant in this service request.",
      };
    }

    const participantRole: RequestRole = isAdmin
      ? "ADMIN"
      : isProvider
      ? "PROVIDER"
      : "CLIENT";

    const currentStatus = request.status as ServiceRequestStatus;

    if (!isValidServiceRequestTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        error: `Invalid status transition from ${currentStatus} to ${targetStatus}.`,
      };
    }

    if (!isAuthorizedRequestTransition(participantRole, currentStatus, targetStatus)) {
      return {
        success: false,
        error: `Unauthorized. A ${participantRole.toLowerCase()} cannot transition this request from ${currentStatus} to ${targetStatus}.`,
      };
    }

    const updatePayload: Record<string, unknown> = {
      status: targetStatus,
    };

    // If transitioning to QUOTED, update quoted_amount if provided
    if (targetStatus === "QUOTED" && quotedAmount !== undefined) {
      updatePayload.quoted_amount = quotedAmount;
    }

    let updateError: unknown = null;
    if (isAdmin && !isClient && !isProvider) {
      const adminClient = createAdminClient();
      const { error } = await adminClient
        .from("service_requests")
        .update(updatePayload)
        .eq("id", requestId);
      updateError = error;
    } else {
      const { error } = await supabase
        .from("service_requests")
        .update(updatePayload)
        .eq("id", requestId);
      updateError = error;
    }

    if (updateError) {
      console.error("Database error updating service request status:", updateError);
      return {
        success: false,
        error: "Failed to update service request status.",
      };
    }

    revalidatePath("/services/requests");

    return {
      success: true,
      data: { requestId, status: targetStatus },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update service request status";
    return {
      success: false,
      error: message,
    };
  }
}
