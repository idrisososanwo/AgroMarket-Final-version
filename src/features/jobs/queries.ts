import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import {
  JobFilterParams,
  JobListing,
  JobApplication,
  PaginatedJobsResult,
  SafeEmployerProfile,
  JobStatus,
  ApplicationStatus,
  JobCategory,
  EmploymentType,
  CompensationType,
} from "./types";

interface RawJobRow {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  category: string;
  state: string;
  lga: string;
  location_details: string | null;
  employment_type: string;
  compensation_type: string;
  compensation_amount: number | string;
  currency: string;
  requirements: string | null;
  deadline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RawEmployerProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  state: string | null;
  lga: string | null;
}

interface RawApplicationRow {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_note: string | null;
  resume_url: string | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    state: string | null;
    lga: string | null;
  } | null;
  jobs?: {
    id: string;
    title: string;
    category: string;
    employer_id: string;
    state: string;
    lga: string;
    status: string;
  } | null;
}

export function mapJobRow(
  row: RawJobRow,
  employer?: SafeEmployerProfile | null,
  applicationsCount?: number
): JobListing {
  return {
    id: row.id,
    employerId: row.employer_id,
    title: row.title,
    description: row.description,
    category: row.category as JobCategory,
    state: row.state,
    lga: row.lga,
    locationDetails: row.location_details,
    employmentType: row.employment_type as EmploymentType,
    compensationType: row.compensation_type as CompensationType,
    compensationAmount: Number(row.compensation_amount),
    currency: row.currency || "NGN",
    requirements: row.requirements,
    deadline: row.deadline,
    status: row.status as JobStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    employer: employer ?? null,
    applicationsCount,
  };
}

/**
 * Public Active-Job Discovery Query.
 *
 * PRIVACY & SECURITY:
 * 1. Strictly filters for status = 'ACTIVE'.
 * 2. Resolves employer information exclusively from public.jobs_employer_profiles view.
 * 3. NEVER touches public.profiles directly.
 * 4. NEVER exposes phone, email, or private residential addresses.
 */
export async function getJobs(
  filters: JobFilterParams = {}
): Promise<PaginatedJobsResult> {
  const supabase = await createClient();

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 12));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("jobs")
    .select(
      `
        id,
        employer_id,
        title,
        description,
        category,
        state,
        lga,
        location_details,
        employment_type,
        compensation_type,
        compensation_amount,
        currency,
        requirements,
        deadline,
        status,
        created_at,
        updated_at
      `,
      { count: "exact" }
    )
    .eq("status", "ACTIVE");

  // Filter by category
  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  // Filter by state
  if (filters.state && filters.state !== "all") {
    query = query.eq("state", filters.state);
  }

  // Filter by LGA
  if (filters.lga && filters.lga !== "all") {
    query = query.eq("lga", filters.lga);
  }

  // Filter by employment type
  if (filters.employmentType && filters.employmentType !== "all") {
    query = query.eq("employment_type", filters.employmentType);
  }

  // Filter by compensation type
  if (filters.compensationType && filters.compensationType !== "all") {
    query = query.eq("compensation_type", filters.compensationType);
  }

  // Keyword search across title and description
  if (filters.search && filters.search.trim().length > 0) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term}`);
  }

  // Sorting
  switch (filters.sortBy) {
    case "compensation_desc":
      query = query.order("compensation_amount", { ascending: false });
      break;
    case "compensation_asc":
      query = query.order("compensation_amount", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Pagination
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error querying active jobs:", {
      message: error.message,
      code: error.code,
    });
    return {
      jobs: [],
      totalCount: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const rawRows = (data as unknown as RawJobRow[]) || [];
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Batch resolve employer profile safely from jobs_employer_profiles
  const employerIds = Array.from(
    new Set(rawRows.map((r) => r.employer_id).filter(Boolean))
  );

  const employerMap = new Map<string, SafeEmployerProfile>();
  if (employerIds.length > 0) {
    const { data: employers, error: empError } = await supabase
      .from("jobs_employer_profiles")
      .select("id, full_name, avatar_url, is_verified, state, lga")
      .in("id", employerIds);

    if (!empError && employers) {
      for (const emp of employers as RawEmployerProfileRow[]) {
        employerMap.set(emp.id, {
          id: emp.id,
          fullName: emp.full_name,
          avatarUrl: emp.avatar_url,
          isVerified: Boolean(emp.is_verified),
          state: emp.state,
          lga: emp.lga,
        });
      }
    }
  }

  const jobs = rawRows.map((row) =>
    mapJobRow(row, employerMap.get(row.employer_id))
  );

  return {
    jobs,
    totalCount,
    page,
    limit,
    totalPages,
  };
}

/**
 * Single Job Detail Query
 * Sourced safely: employer profile resolved from jobs_employer_profiles.
 */
export async function getJobById(jobId: string): Promise<JobListing | null> {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  const { data, error } = await supabase
    .from("jobs")
    .select(
      `
        id,
        employer_id,
        title,
        description,
        category,
        state,
        lga,
        location_details,
        employment_type,
        compensation_type,
        compensation_amount,
        currency,
        requirements,
        deadline,
        status,
        created_at,
        updated_at
      `
    )
    .eq("id", jobId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as RawJobRow;

  // Authorization check for non-active jobs
  if (row.status !== "ACTIVE") {
    const isOwner = currentUser?.id === row.employer_id;
    const isAdmin = currentUser ? hasRole(currentUser.roles, "ADMIN") : false;
    if (!isOwner && !isAdmin) {
      return null;
    }
  }

  // Resolve safe employer profile
  let safeEmployer: SafeEmployerProfile | null = null;
  const { data: empData } = await supabase
    .from("jobs_employer_profiles")
    .select("id, full_name, avatar_url, is_verified, state, lga")
    .eq("id", row.employer_id)
    .maybeSingle();

  if (empData) {
    const rawEmp = empData as RawEmployerProfileRow;
    safeEmployer = {
      id: rawEmp.id,
      fullName: rawEmp.full_name,
      avatarUrl: rawEmp.avatar_url,
      isVerified: Boolean(rawEmp.is_verified),
      state: rawEmp.state,
      lga: rawEmp.lga,
    };
  }

  return mapJobRow(row, safeEmployer);
}

/**
 * Employer's Own Jobs Query
 * Strictly authorizes the employer or an administrator.
 */
export async function getEmployerJobs(
  employerId?: string,
  status?: JobStatus
): Promise<JobListing[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  const targetEmployerId = employerId || currentUser.id;
  const isAdmin = hasRole(currentUser.roles, "ADMIN");

  if (targetEmployerId !== currentUser.id && !isAdmin) {
    return [];
  }

  const supabase = await createClient();

  let query = supabase
    .from("jobs")
    .select(
      `
        id,
        employer_id,
        title,
        description,
        category,
        state,
        lga,
        location_details,
        employment_type,
        compensation_type,
        compensation_amount,
        currency,
        requirements,
        deadline,
        status,
        created_at,
        updated_at,
        job_applications (id)
      `
    )
    .eq("employer_id", targetEmployerId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return (data as Array<RawJobRow & { job_applications?: Array<{ id: string }> }>).map(
    (row) => {
      const applicationsCount = Array.isArray(row.job_applications)
        ? row.job_applications.length
        : 0;
      return mapJobRow(row, null, applicationsCount);
    }
  );
}

/**
 * Employer's Applications for a Specific Job
 * Enforces ownership: only job employer or ADMIN may view.
 */
export async function getJobApplications(jobId: string): Promise<JobApplication[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  const supabase = await createClient();

  // Verify user is job employer or admin
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id, employer_id, title, category, state, lga, status")
    .eq("id", jobId)
    .maybeSingle();

  if (jobErr || !job) {
    return [];
  }

  const isAdmin = hasRole(currentUser.roles, "ADMIN");
  if (job.employer_id !== currentUser.id && !isAdmin) {
    return [];
  }

  // Fetch applications
  const { data: applications, error: appErr } = await supabase
    .from("job_applications")
    .select(
      `
        id,
        job_id,
        applicant_id,
        cover_note,
        resume_url,
        status,
        reviewed_at,
        created_at,
        updated_at
      `
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (appErr || !applications) {
    return [];
  }

  const rawApps = applications as RawApplicationRow[];
  const applicantIds = Array.from(
    new Set(rawApps.map((a) => a.applicant_id).filter(Boolean))
  );

  // Safely resolve applicant public information (no phone/email/address)
  const applicantMap = new Map<
    string,
    { id: string; fullName: string | null; avatarUrl: string | null; state: string | null; lga: string | null }
  >();

  if (applicantIds.length > 0) {
    const { data: applicantProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, state, lga")
      .in("id", applicantIds);

    if (applicantProfiles) {
      for (const p of applicantProfiles) {
        applicantMap.set(p.id, {
          id: p.id,
          fullName: p.full_name,
          avatarUrl: p.avatar_url,
          state: p.state,
          lga: p.lga,
        });
      }
    }
  }

  return rawApps.map((app) => ({
    id: app.id,
    jobId: app.job_id,
    applicantId: app.applicant_id,
    coverNote: app.cover_note,
    resumeUrl: app.resume_url,
    status: app.status as ApplicationStatus,
    reviewedAt: app.reviewed_at,
    createdAt: app.created_at,
    updatedAt: app.updated_at,
    applicant: applicantMap.get(app.applicant_id) ?? null,
    job: {
      id: job.id,
      title: job.title,
      category: job.category as JobCategory,
      employerId: job.employer_id,
      state: job.state,
      lga: job.lga,
      status: job.status as JobStatus,
    },
  }));
}

/**
 * Applicant's Own Applications Query
 * Returns all applications submitted by the authenticated user.
 */
export async function getMyApplications(): Promise<JobApplication[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_applications")
    .select(
      `
        id,
        job_id,
        applicant_id,
        cover_note,
        resume_url,
        status,
        reviewed_at,
        created_at,
        updated_at,
        jobs (
          id,
          title,
          category,
          employer_id,
          state,
          lga,
          status
        )
      `
    )
    .eq("applicant_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return ((data as unknown as RawApplicationRow[]) || []).map((app) => {
    const rawJob = app.jobs as unknown;
    const jobData = (Array.isArray(rawJob) ? rawJob[0] : rawJob) as
      | {
          id: string;
          title: string;
          category: string;
          employer_id: string;
          state: string;
          lga: string;
          status: string;
        }
      | null
      | undefined;

    return {
      id: app.id,
      jobId: app.job_id,
      applicantId: app.applicant_id,
      coverNote: app.cover_note,
      resumeUrl: app.resume_url,
      status: app.status as ApplicationStatus,
      reviewedAt: app.reviewed_at,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
      job: jobData
        ? {
            id: jobData.id,
            title: jobData.title,
            category: jobData.category as JobCategory,
            employerId: jobData.employer_id,
            state: jobData.state,
            lga: jobData.lga,
            status: jobData.status as JobStatus,
          }
        : null,
    };
  });
}
