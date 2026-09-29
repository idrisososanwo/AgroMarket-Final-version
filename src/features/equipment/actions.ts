"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { RentalStatus } from "./types";
import {
  ActionResponse,
  createEquipmentSchema,
  updateEquipmentSchema,
  toggleEquipmentAvailabilitySchema,
  createRentalRequestSchema,
  updateRentalStatusSchema,
} from "./validation";

/**
 * Creates a new equipment listing.
 *
 * AUTHORIZATION:
 * - Requires EQUIPMENT_OWNER or ADMIN role.
 * - owner_id is derived strictly from auth session (user.id).
 * - Never accepts client-provided owner_id.
 */
export async function createEquipmentAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ equipmentId: string }>> {
  try {
    const user = await requireAnyRole(["EQUIPMENT_OWNER", "ADMIN"]);
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = createEquipmentSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check the equipment details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      category,
      makeModel,
      yearManufactured,
      description,
      locationState,
      locationLga,
      dailyRentalRate,
      cautionDeposit,
      currency,
      operatorIncluded,
      condition,
    } = parsed.data;

    const supabase = await createClient();

    const { data: newEquipment, error } = await supabase
      .from("equipment")
      .insert({
        owner_id: user.id,
        name: name.trim(),
        category,
        make_model: makeModel ?? null,
        year_manufactured: yearManufactured ?? null,
        description: description ?? null,
        location_state: locationState.trim(),
        location_lga: locationLga.trim(),
        daily_rental_rate: dailyRentalRate,
        caution_deposit: cautionDeposit,
        currency,
        operator_included: operatorIncluded,
        condition,
        is_available: true,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (error || !newEquipment) {
      console.error("Database error creating equipment:", error);
      return {
        success: false,
        error: "Failed to create equipment listing. Please try again later.",
      };
    }

    revalidatePath("/equipment");

    return {
      success: true,
      data: { equipmentId: newEquipment.id },
    };
  } catch (err: unknown) {
    console.error("Error in createEquipmentAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Updates an existing equipment listing.
 *
 * AUTHORIZATION:
 * - Requires equipment owner or ADMIN.
 * - Protects owner_id and created_at from mutation.
 */
export async function updateEquipmentAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ equipmentId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = updateEquipmentSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check your updates.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { equipmentId, ...updates } = parsed.data;
    const supabase = await createClient();

    // Verify equipment existence and ownership
    const { data: existing, error: fetchError } = await supabase
      .from("equipment")
      .select("id, owner_id")
      .eq("id", equipmentId)
      .maybeSingle();

    if (fetchError || !existing) {
      return {
        success: false,
        error: "Equipment not found.",
      };
    }

    const isOwner = existing.owner_id === user.id;
    const isAdmin = hasRole(user.roles, "ADMIN");

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: "Unauthorized. You can only update your own equipment.",
      };
    }

    // Build safe database updates map
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.makeModel !== undefined) dbUpdates.make_model = updates.makeModel;
    if (updates.yearManufactured !== undefined) dbUpdates.year_manufactured = updates.yearManufactured;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.locationState !== undefined) dbUpdates.location_state = updates.locationState.trim();
    if (updates.locationLga !== undefined) dbUpdates.location_lga = updates.locationLga.trim();
    if (updates.dailyRentalRate !== undefined) dbUpdates.daily_rental_rate = updates.dailyRentalRate;
    if (updates.cautionDeposit !== undefined) dbUpdates.caution_deposit = updates.cautionDeposit;
    if (updates.operatorIncluded !== undefined) dbUpdates.operator_included = updates.operatorIncluded;
    if (updates.condition !== undefined) dbUpdates.condition = updates.condition;

    const { error: updateError } = await supabase
      .from("equipment")
      .update(dbUpdates)
      .eq("id", equipmentId);

    if (updateError) {
      console.error("Database error updating equipment:", updateError);
      return {
        success: false,
        error: "Failed to update equipment listing.",
      };
    }

    revalidatePath("/equipment");
    revalidatePath(`/equipment/${equipmentId}`);

    return {
      success: true,
      data: { equipmentId },
    };
  } catch (err: unknown) {
    console.error("Error in updateEquipmentAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Toggles equipment availability.
 *
 * AUTHORIZATION:
 * - Equipment owner or ADMIN only.
 */
export async function toggleEquipmentAvailabilityAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ isAvailable: boolean }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = toggleEquipmentAvailabilitySchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid request data.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { equipmentId, isAvailable } = parsed.data;
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("equipment")
      .select("id, owner_id")
      .eq("id", equipmentId)
      .maybeSingle();

    if (fetchError || !existing) {
      return {
        success: false,
        error: "Equipment not found.",
      };
    }

    const isOwner = existing.owner_id === user.id;
    const isAdmin = hasRole(user.roles, "ADMIN");

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: "Unauthorized. You can only change availability of your own equipment.",
      };
    }

    const { error: updateError } = await supabase
      .from("equipment")
      .update({ is_available: isAvailable })
      .eq("id", equipmentId);

    if (updateError) {
      console.error("Database error toggling equipment availability:", updateError);
      return {
        success: false,
        error: "Failed to update equipment availability.",
      };
    }

    revalidatePath("/equipment");
    revalidatePath(`/equipment/${equipmentId}`);

    return {
      success: true,
      data: { isAvailable },
    };
  } catch (err: unknown) {
    console.error("Error in toggleEquipmentAvailabilityAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Creates an equipment rental booking request via atomic database RPC.
 *
 * TRANSACTIONAL GUARANTEES:
 * 1. Invokes public.create_equipment_rental_booking() RPC.
 * 2. Locks equipment row FOR UPDATE before checking availability or inserting.
 * 3. Enforces date validity, rentable status, self-rental blocking, and schedule overlap protection.
 * 4. Derives renter_id strictly from auth.uid().
 * 5. Computes total_days, total_rental_amount, and deposit_amount using database-authoritative equipment rates.
 */
export async function createEquipmentRentalAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ rentalId: string }>> {
  try {
    await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = createRentalRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check booking dates.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { equipmentId, startDate, endDate, handoverNotes } = parsed.data;
    const supabase = await createClient();

    // Call atomic booking RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "create_equipment_rental_booking",
      {
        p_equipment_id: equipmentId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_handover_notes: handoverNotes ?? null,
      }
    );

    if (rpcError) {
      console.error("Database RPC error creating equipment rental:", rpcError);
      return {
        success: false,
        error: rpcError.message || "Failed to submit rental request.",
      };
    }

    const response = rpcResult as { success: boolean; rental_id?: string; error?: string };
    if (!response || !response.success || !response.rental_id) {
      return {
        success: false,
        error: response?.error || "Failed to submit rental request. Please check availability.",
      };
    }

    revalidatePath("/equipment");
    revalidatePath(`/equipment/${equipmentId}`);

    return {
      success: true,
      data: { rentalId: response.rental_id },
    };
  } catch (err: unknown) {
    console.error("Error in createEquipmentRentalAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Executes a rental lifecycle status transition via atomic database RPCs.
 *
 * TRANSACTIONAL & SECURITY GUARANTEES:
 * 1. For APPROVED: calls public.approve_equipment_rental() which locks equipment first, then rental,
 *    and verifies zero conflicting APPROVED/ACTIVE rentals before committing.
 * 2. For other transitions: calls public.transition_equipment_rental_status() enforcing
 *    canonical state machine and actor permissions (Owner/Renter/Admin).
 */
export async function updateRentalStatusAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ status: RentalStatus }>> {
  try {
    await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = updateRentalStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Invalid status transition requested.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { rentalId, status: targetStatus, notes } = parsed.data;
    const supabase = await createClient();

    let rpcResult: unknown;
    let rpcError: { message: string } | null = null;

    if (targetStatus === "APPROVED") {
      const res = await supabase.rpc("approve_equipment_rental", {
        p_rental_id: rentalId,
        p_notes: notes ?? null,
      });
      rpcResult = res.data;
      rpcError = res.error;
    } else {
      const res = await supabase.rpc("transition_equipment_rental_status", {
        p_rental_id: rentalId,
        p_target_status: targetStatus,
        p_notes: notes ?? null,
      });
      rpcResult = res.data;
      rpcError = res.error;
    }

    if (rpcError) {
      console.error("Database RPC error transitioning rental status:", rpcError);
      return {
        success: false,
        error: rpcError.message || "Failed to update rental status.",
      };
    }

    const response = rpcResult as { success: boolean; status?: RentalStatus; error?: string };
    if (!response || !response.success) {
      return {
        success: false,
        error: response?.error || "Failed to update rental status.",
      };
    }

    revalidatePath("/equipment");

    return {
      success: true,
      data: { status: targetStatus },
    };
  } catch (err: unknown) {
    console.error("Error in updateRentalStatusAction:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
