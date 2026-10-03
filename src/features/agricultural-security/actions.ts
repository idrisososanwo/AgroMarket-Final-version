"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAnyRole, requireRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import {
  createSecurityIncidentSchema,
  updateSecurityIncidentSchema,
  changeSecurityStatusSchema,
  updateSecurityVerificationSchema,
  slugifyIncidentTitle,
  ActionResponse,
} from "./validation";
import { SecurityIncidentStatus, SecurityVerificationStatus } from "./types";

/**
 * Creates a new agricultural security incident or draft.
 *
 * AUTHORIZATION:
 * - Requires ADMIN or EXPERT role.
 * - created_by is derived strictly from server session (user.id).
 * - Non-admins cannot publish directly or mark as VERIFIED/OFFICIAL.
 */
export async function createSecurityIncidentAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ incidentId: string; slug: string }>> {
  try {
    const user = await requireAnyRole(["ADMIN", "EXPERT"]);
    const raw =
      formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : formData;

    const parsed = createSecurityIncidentSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check the incident fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      title,
      slug: providedSlug,
      incidentType,
      severity,
      description,
      occurredAt,
      reportedAt,
      sourceName,
      sourceType,
      sourceUrl,
      sourcePublicationDate,
      verificationStatus: requestedVerification,
      state,
      lga,
      locationScope,
      affectedCommodities,
      affectedCategories,
      movementImpact,
      foodSecurityImpact,
      editorialNotes,
      status: requestedStatus,
    } = parsed.data;

    const isAdmin = hasRole(user.roles, "ADMIN");

    // Enforce publication & verification safeguards for non-admins
    const status: SecurityIncidentStatus = isAdmin
      ? (requestedStatus as SecurityIncidentStatus) || "DRAFT"
      : "DRAFT";

    let verificationStatus: SecurityVerificationStatus = isAdmin
      ? (requestedVerification as SecurityVerificationStatus) || "REPORTED"
      : "REPORTED";

    // Non-admins can only submit as UNVERIFIED or REPORTED
    if (!isAdmin && (verificationStatus === "VERIFIED" || verificationStatus === "OFFICIAL")) {
      verificationStatus = "REPORTED";
    }

    const supabase = await createClient();

    // Generate unique slug
    const baseSlug = providedSlug && providedSlug.length > 0
      ? providedSlug
      : slugifyIncidentTitle(title);

    let finalSlug = baseSlug;
    let collisionCheck = 0;
    while (collisionCheck < 5) {
      const { data: existing } = await supabase
        .from("agricultural_security_incidents")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (!existing) break;
      collisionCheck += 1;
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const nowIso = new Date().toISOString();
    const publishedAt = status === "PUBLISHED" ? nowIso : null;

    const { data: inserted, error: insertError } = await supabase
      .from("agricultural_security_incidents")
      .insert({
        title,
        slug: finalSlug,
        incident_type: incidentType,
        status,
        severity,
        description,
        occurred_at: occurredAt || null,
        reported_at: reportedAt || nowIso,
        published_at: publishedAt,
        source_name: sourceName,
        source_type: sourceType,
        source_url: sourceUrl || null,
        source_publication_date: sourcePublicationDate || null,
        verification_status: verificationStatus,
        state,
        lga: lga || null,
        location_scope: locationScope,
        affected_commodities: affectedCommodities,
        affected_categories: affectedCategories,
        movement_impact: movementImpact || null,
        food_security_impact: foodSecurityImpact || null,
        editorial_notes: editorialNotes || null,
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id, slug")
      .single();

    if (insertError) {
      console.error("Error creating security incident:", insertError.message);
      return {
        success: false,
        error: "Failed to persist incident in database. Please try again.",
      };
    }

    revalidatePath("/learn/security");
    revalidatePath("/admin/security");

    return {
      success: true,
      data: {
        incidentId: inserted.id,
        slug: inserted.slug,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Updates an existing agricultural security incident.
 */
export async function updateSecurityIncidentAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ incidentId: string; slug: string }>> {
  try {
    const user = await requireAnyRole(["ADMIN", "EXPERT"]);
    const raw =
      formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : formData;

    const parsed = updateSecurityIncidentSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify the incident information.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { id, ...updates } = parsed.data;
    if (!id) {
      return { success: false, error: "Missing incident identifier" };
    }

    const supabase = await createClient();

    // Verify existing incident & permissions
    const { data: existing, error: fetchError } = await supabase
      .from("agricultural_security_incidents")
      .select("id, slug, status, verification_status, created_by")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Incident not found" };
    }

    const isAdmin = hasRole(user.roles, "ADMIN");
    if (!isAdmin) {
      if (existing.created_by !== user.id) {
        return { success: false, error: "You are not authorized to edit this incident record" };
      }
      if (existing.status !== "DRAFT") {
        return { success: false, error: "Only draft incidents may be edited by non-administrators" };
      }
      if (updates.status && updates.status !== "DRAFT") {
        return { success: false, error: "Only administrators can publish security incidents" };
      }
      if (
        updates.verificationStatus &&
        (updates.verificationStatus === "VERIFIED" || updates.verificationStatus === "OFFICIAL")
      ) {
        return { success: false, error: "Only administrators can verify incidents" };
      }
    }

    const payload: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.incidentType !== undefined) payload.incident_type = updates.incidentType;
    if (updates.severity !== undefined) payload.severity = updates.severity;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.occurredAt !== undefined) payload.occurred_at = updates.occurredAt || null;
    if (updates.reportedAt !== undefined) payload.reported_at = updates.reportedAt;
    if (updates.sourceName !== undefined) payload.source_name = updates.sourceName;
    if (updates.sourceType !== undefined) payload.source_type = updates.sourceType;
    if (updates.sourceUrl !== undefined) payload.source_url = updates.sourceUrl || null;
    if (updates.sourcePublicationDate !== undefined)
      payload.source_publication_date = updates.sourcePublicationDate || null;
    if (updates.state !== undefined) payload.state = updates.state;
    if (updates.lga !== undefined) payload.lga = updates.lga || null;
    if (updates.locationScope !== undefined) payload.location_scope = updates.locationScope;
    if (updates.affectedCommodities !== undefined)
      payload.affected_commodities = updates.affectedCommodities;
    if (updates.affectedCategories !== undefined)
      payload.affected_categories = updates.affectedCategories;
    if (updates.movementImpact !== undefined) payload.movement_impact = updates.movementImpact || null;
    if (updates.foodSecurityImpact !== undefined)
      payload.food_security_impact = updates.foodSecurityImpact || null;
    if (updates.editorialNotes !== undefined) payload.editorial_notes = updates.editorialNotes || null;

    if (isAdmin) {
      if (updates.status !== undefined) {
        payload.status = updates.status;
        if (updates.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
          payload.published_at = new Date().toISOString();
        } else if (updates.status === "ARCHIVED") {
          payload.archived_at = new Date().toISOString();
        }
      }
      if (updates.verificationStatus !== undefined) {
        payload.verification_status = updates.verificationStatus;
      }
    }

    const { error: updateError } = await supabase
      .from("agricultural_security_incidents")
      .update(payload)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating security incident:", updateError.message);
      return { success: false, error: "Failed to update incident record" };
    }

    revalidatePath("/learn/security");
    revalidatePath(`/learn/security/${existing.slug}`);
    revalidatePath("/admin/security");
    revalidatePath(`/admin/security/${id}`);

    return {
      success: true,
      data: {
        incidentId: id,
        slug: existing.slug,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Changes incident status (DRAFT, PUBLISHED, ARCHIVED).
 * Strictly requires ADMIN role.
 */
export async function changeSecurityIncidentStatusAction(
  input: { id: string; status: SecurityIncidentStatus }
): Promise<ActionResponse<{ incidentId: string; status: SecurityIncidentStatus }>> {
  try {
    const user = await requireRole("ADMIN");
    const parsed = changeSecurityStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid status parameters" };
    }

    const { id, status } = parsed.data;
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("agricultural_security_incidents")
      .select("id, slug, status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Incident not found" };
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status,
      updated_by: user.id,
      updated_at: nowIso,
    };

    if (status === "PUBLISHED" && existing.status !== "PUBLISHED") {
      updatePayload.published_at = nowIso;
    } else if (status === "ARCHIVED") {
      updatePayload.archived_at = nowIso;
    }

    const { error: updateError } = await supabase
      .from("agricultural_security_incidents")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      console.error("Error changing status:", updateError.message);
      return { success: false, error: "Failed to update incident status" };
    }

    revalidatePath("/learn/security");
    revalidatePath(`/learn/security/${existing.slug}`);
    revalidatePath("/admin/security");
    revalidatePath(`/admin/security/${id}`);

    return {
      success: true,
      data: { incidentId: id, status: status as SecurityIncidentStatus },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Updates verification status (e.g. promoting to VERIFIED or OFFICIAL).
 * Strictly requires ADMIN role.
 */
export async function updateSecurityVerificationAction(
  input: { id: string; verificationStatus: SecurityVerificationStatus }
): Promise<ActionResponse<{ incidentId: string; verificationStatus: SecurityVerificationStatus }>> {
  try {
    const user = await requireRole("ADMIN");
    const parsed = updateSecurityVerificationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid verification parameters" };
    }

    const { id, verificationStatus } = parsed.data;
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("agricultural_security_incidents")
      .select("id, slug")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Incident not found" };
    }

    const { error: updateError } = await supabase
      .from("agricultural_security_incidents")
      .update({
        verification_status: verificationStatus,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating verification:", updateError.message);
      return { success: false, error: "Failed to update verification status" };
    }

    revalidatePath("/learn/security");
    revalidatePath(`/learn/security/${existing.slug}`);
    revalidatePath("/admin/security");
    revalidatePath(`/admin/security/${id}`);

    return {
      success: true,
      data: { incidentId: id, verificationStatus: verificationStatus as SecurityVerificationStatus },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}

/**
 * Deletes an incident record permanently.
 * Strictly requires ADMIN role.
 */
export async function deleteSecurityIncidentAction(
  id: string
): Promise<ActionResponse<{ deletedId: string }>> {
  try {
    await requireRole("ADMIN");
    if (!id) {
      return { success: false, error: "Incident ID is required" };
    }

    const supabase = await createClient();
    const { error: deleteError } = await supabase
      .from("agricultural_security_incidents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting incident:", deleteError.message);
      return { success: false, error: "Failed to delete incident record" };
    }

    revalidatePath("/learn/security");
    revalidatePath("/admin/security");

    return { success: true, data: { deletedId: id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { success: false, error: message };
  }
}
