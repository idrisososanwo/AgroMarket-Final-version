"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import {
  isValidJobStatusTransition,
  isValidApplicationStatusTransition,
  JobStatus,
  ApplicationStatus,
} from "./types";
import {
  ActionResponse,
  createJobSchema,
  updateJobSchema,
  transitionJobStatusSchema,
  applyForJobSchema,
  updateApplicationStatusSchema,
} from "./validation";

/**
 * Creates a new agricultural job listing.
 *
 * AUTHORIZATION:
 * - Requires BUSINESS, FARMER, or ADMIN role.
 * - Employer ID is bound strictly to auth.uid() from the authenticated session.
 * - Never accepts an arbitrary employer_id from the client.
 */
export async function createJobAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ jobId: string }>> {
  try {
    const user = await requireAnyRole(["FARMER", "BUSINESS"]);
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = createJobSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check the job details.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      title,
      description,
      category,
      state,
      lga,
      locationDetails,
      employmentType,
      compensationType,
      compensationAmount,
      currency,
      requirements,
      deadline,
      status,
    } = parsed.data;

    const supabase = await createClient();

    const { data: newJob, error } = await supabase
      .from("jobs")
      .insert({
        employer_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        state: state.trim(),
        lga: lga.trim(),
        location_details: locationDetails,
        employment_type: employmentType,
        compensation_type: compensationType,
        compensation_amount: compensationAmount,
        currency: currency || "NGN",
        requirements,
        deadline: deadline || null,
        status: status || "ACTIVE",
      })
      .select("id")
      .single();

    if (error || !newJob) {
      console.error("Database error creating job:", error);
      return {
        success: false,
        error: "Failed to create job listing. Please try again later.",
      };
    }

    revalidatePath("/jobs");

    return {
      success: true,
      data: { jobId: newJob.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create job";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Updates an existing job listing.
 *
 * AUTHORIZATION:
 * - Only the job owner (employer_id === auth.uid()) or an authorized ADMIN may edit.
 * - Status transitions are NOT permitted via this action; use transitionJobStatusAction.
 */
export async function updateJobAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ jobId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = updateJobSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please check your inputs.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { jobId, ...updateFields } = parsed.data;

    const supabase = await createClient();

    // Fetch existing job to verify existence and ownership
    const { data: existingJob, error: fetchErr } = await supabase
      .from("jobs")
      .select("id, employer_id, status")
      .eq("id", jobId)
      .maybeSingle();

    if (fetchErr || !existingJob) {
      return {
        success: false,
        error: "Job listing not found.",
      };
    }

    const isOwner = existingJob.employer_id === user.id;
    const isAdmin = hasRole(user.roles, "ADMIN");

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: "Unauthorized. You can only edit your own job listings.",
      };
    }

    const dbPayload: Record<string, unknown> = {};
    if (updateFields.title !== undefined) dbPayload.title = updateFields.title.trim();
    if (updateFields.description !== undefined) dbPayload.description = updateFields.description.trim();
    if (updateFields.category !== undefined) dbPayload.category = updateFields.category;
    if (updateFields.state !== undefined) dbPayload.state = updateFields.state.trim();
    if (updateFields.lga !== undefined) dbPayload.lga = updateFields.lga.trim();
    if (updateFields.locationDetails !== undefined) dbPayload.location_details = updateFields.locationDetails;
    if (updateFields.employmentType !== undefined) dbPayload.employment_type = updateFields.employmentType;
    if (updateFields.compensationType !== undefined) dbPayload.compensation_type = updateFields.compensationType;
    if (updateFields.compensationAmount !== undefined) dbPayload.compensation_amount = updateFields.compensationAmount;
    if (updateFields.currency !== undefined) dbPayload.currency = updateFields.currency;
    if (updateFields.requirements !== undefined) dbPayload.requirements = updateFields.requirements;
    if (updateFields.deadline !== undefined) dbPayload.deadline = updateFields.deadline;

    if (Object.keys(dbPayload).length === 0) {
      return {
        success: true,
        data: { jobId },
      };
    }

    let updateError: unknown = null;
    if (isAdmin && !isOwner) {
      const adminClient = createAdminClient();
      const { error } = await adminClient
        .from("jobs")
        .update(dbPayload)
        .eq("id", jobId);
      updateError = error;
    } else {
      const { error } = await supabase
        .from("jobs")
        .update(dbPayload)
        .eq("id", jobId);
      updateError = error;
    }

    if (updateError) {
      console.error("Database error updating job:", updateError);
      return {
        success: false,
        error: "Failed to update job listing. Please try again later.",
      };
    }

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);

    return {
      success: true,
      data: { jobId },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update job";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Transitions a job's status according to the finite state machine.
 *
 * STATE MACHINE RULES:
 * DRAFT  -> ACTIVE, CLOSED
 * ACTIVE -> PAUSED, CLOSED
 * PAUSED -> ACTIVE, CLOSED
 * CLOSED -> (Terminal)
 *
 * AUTHORIZATION:
 * - Only the job owner or authorized ADMIN may transition status.
 */
export async function transitionJobStatusAction(
  input: { jobId: string; status: JobStatus }
): Promise<ActionResponse<{ jobId: string; status: JobStatus }>> {
  try {
    const user = await requireAuth();

    const parsed = transitionJobStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid status transition request.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { jobId, status: targetStatus } = parsed.data;

    const supabase = await createClient();

    const { data: existingJob, error: fetchErr } = await supabase
      .from("jobs")
      .select("id, employer_id, status")
      .eq("id", jobId)
      .maybeSingle();

    if (fetchErr || !existingJob) {
      return {
        success: false,
        error: "Job listing not found.",
      };
    }

    const isOwner = existingJob.employer_id === user.id;
    const isAdmin = hasRole(user.roles, "ADMIN");

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: "Unauthorized. You can only modify your own job listings.",
      };
    }

    const currentStatus = existingJob.status as JobStatus;

    if (!isValidJobStatusTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        error: `Invalid status transition from ${currentStatus} to ${targetStatus}.`,
      };
    }

    let updateError: unknown = null;
    if (isAdmin && !isOwner) {
      const adminClient = createAdminClient();
      const { error } = await adminClient
        .from("jobs")
        .update({ status: targetStatus })
        .eq("id", jobId);
      updateError = error;
    } else {
      const { error } = await supabase
        .from("jobs")
        .update({ status: targetStatus })
        .eq("id", jobId);
      updateError = error;
    }

    if (updateError) {
      console.error("Database error updating job status:", updateError);
      return {
        success: false,
        error: "Failed to update job status.",
      };
    }

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);

    return {
      success: true,
      data: { jobId, status: targetStatus },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to transition job status";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Submits an application for an active job.
 *
 * AUTHORIZATION & RULES:
 * - Only authenticated users can apply.
 * - Applicant ID comes strictly from auth.uid().
 * - Job must be ACTIVE.
 * - Employers cannot apply to their own job.
 * - Duplicate applications prevented logically and backed by UNIQUE(job_id, applicant_id).
 */
export async function applyForJobAction(
  formData: FormData | Record<string, unknown>
): Promise<ActionResponse<{ applicationId: string }>> {
  try {
    const user = await requireAuth();
    const raw = formData instanceof FormData ? Object.fromEntries(formData.entries()) : formData;

    const parsed = applyForJobSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: "Validation failed. Please verify the application fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { jobId, coverNote, resumeUrl } = parsed.data;

    const supabase = await createClient();

    // 1. Fetch job to verify status and employer
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, employer_id, status")
      .eq("id", jobId)
      .maybeSingle();

    if (jobErr || !job) {
      return {
        success: false,
        error: "Job listing not found.",
      };
    }

    if (job.status !== "ACTIVE") {
      return {
        success: false,
        error: "Applications can only be submitted for active jobs.",
      };
    }

    if (job.employer_id === user.id) {
      return {
        success: false,
        error: "You cannot apply for your own job listing.",
      };
    }

    // 2. Pre-check for existing duplicate application
    const { data: existingApp } = await supabase
      .from("job_applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("applicant_id", user.id)
      .maybeSingle();

    if (existingApp) {
      return {
        success: false,
        error: "You have already applied for this job.",
      };
    }

    // 3. Insert application into public.job_applications
    const { data: newApp, error: insertErr } = await supabase
      .from("job_applications")
      .insert({
        job_id: jobId,
        applicant_id: user.id,
        cover_note: coverNote || null,
        resume_url: resumeUrl || null,
        status: "SUBMITTED",
      })
      .select("id")
      .single();

    if (insertErr) {
      // 23505 is PostgreSQL unique_violation code
      if ((insertErr as { code?: string }).code === "23505") {
        return {
          success: false,
          error: "You have already applied for this job.",
        };
      }

      console.error("Database error inserting job application:", insertErr);
      return {
        success: false,
        error: "Failed to submit application. Please try again later.",
      };
    }

    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs/applications");

    return {
      success: true,
      data: { applicationId: newApp.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to apply for job";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Updates the status of an application.
 *
 * AUTHORIZATION:
 * - Only the employer of the corresponding job or an authorized ADMIN may update application status.
 * - Applicants MUST NOT be able to modify their own application status.
 * - Enforces the application state machine:
 *   SUBMITTED -> UNDER_REVIEW, SHORTLISTED, REJECTED
 *   UNDER_REVIEW -> SHORTLISTED, REJECTED
 *   SHORTLISTED -> HIRED, REJECTED
 * - Mutations are server-authoritative via adminClient because job_applications is append-only for authenticated.
 */
export async function updateApplicationStatusAction(
  input: { applicationId: string; status: ApplicationStatus }
): Promise<ActionResponse<{ applicationId: string; status: ApplicationStatus }>> {
  try {
    const user = await requireAuth();

    const parsed = updateApplicationStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid application status update request.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { applicationId, status: targetStatus } = parsed.data;

    const supabase = await createClient();

    // Fetch application and associated job
    const { data: application, error: appErr } = await supabase
      .from("job_applications")
      .select(
        `
          id,
          job_id,
          applicant_id,
          status,
          jobs (
            id,
            employer_id
          )
        `
      )
      .eq("id", applicationId)
      .maybeSingle();

    if (appErr || !application) {
      return {
        success: false,
        error: "Application not found.",
      };
    }

    const rawJob = (application as { jobs?: unknown }).jobs;
    const job = (Array.isArray(rawJob) ? rawJob[0] : rawJob) as
      | { id: string; employer_id: string }
      | null
      | undefined;

    if (!job) {
      return {
        success: false,
        error: "Associated job listing not found.",
      };
    }

    const isEmployer = job.employer_id === user.id;
    const isAdmin = hasRole(user.roles, "ADMIN");

    // Applicants must not be able to modify their own application status
    if (!isEmployer && !isAdmin) {
      if (application.applicant_id === user.id) {
        return {
          success: false,
          error: "Applicants are not permitted to modify their own application status.",
        };
      }
      return {
        success: false,
        error: "Unauthorized. Only the employer or an administrator can update application status.",
      };
    }

    const currentStatus = application.status as ApplicationStatus;

    if (!isValidApplicationStatusTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        error: `Invalid application status transition from ${currentStatus} to ${targetStatus}.`,
      };
    }

    // Execute server-authoritative update via admin client
    const adminClient = createAdminClient();
    const { error: updateErr } = await adminClient
      .from("job_applications")
      .update({
        status: targetStatus,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (updateErr) {
      console.error("Database error updating application status:", updateErr);
      return {
        success: false,
        error: "Failed to update application status.",
      };
    }

    revalidatePath(`/jobs/${job.id}`);
    revalidatePath("/jobs/applications");

    return {
      success: true,
      data: { applicationId, status: targetStatus },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update application status";
    return {
      success: false,
      error: message,
    };
  }
}
