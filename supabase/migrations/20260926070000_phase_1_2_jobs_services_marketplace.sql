-- ==============================================================================
-- AGROMARKET PHASE 1.2: JOBS & SERVICES MARKETPLACE FOUNDATION
-- Establishes safe public employer/provider profile views with security barriers,
-- exposes strictly whitelisted non-PII fields to anonymous and authenticated users,
-- and adds high-performance relational lookups for job and service discovery.
--
-- Row Level Security (RLS) remains 100% active and enforced across all tables.
-- ==============================================================================

-- 1. Safe Public Employer Profile Representation
-- Exposes ONLY explicitly safe public fields (id, full_name, avatar_url, is_verified, state, lga).
-- Strictly EXCLUDES phone, email, location_address, and other private profile fields.
-- Restricts rows to employers who currently have at least one ACTIVE job posting.
-- Uses security_barrier = true to prevent optimizer-level condition leakage.
CREATE OR REPLACE VIEW public.jobs_employer_profiles
WITH (security_barrier = true) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.is_verified,
  p.state,
  p.lga
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.jobs j
  WHERE j.employer_id = p.id
    AND j.status = 'ACTIVE'
);

-- Grant SELECT on safe employer profiles view to anon and authenticated
GRANT SELECT ON public.jobs_employer_profiles TO anon, authenticated;

-- 2. Safe Public Service Provider Profile Representation
-- Exposes ONLY explicitly safe public fields (id, full_name, avatar_url, is_verified, state, lga).
-- Strictly EXCLUDES phone, email, location_address, and other private profile fields.
-- Restricts rows to providers who currently have at least one AVAILABLE service.
-- Uses security_barrier = true to prevent optimizer-level condition leakage.
CREATE OR REPLACE VIEW public.services_provider_profiles
WITH (security_barrier = true) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.is_verified,
  p.state,
  p.lga
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.services s
  WHERE s.provider_id = p.id
    AND s.is_available = true
);

-- Grant SELECT on safe service provider profiles view to anon and authenticated
GRANT SELECT ON public.services_provider_profiles TO anon, authenticated;

-- 3. High-Performance Relational Indexes for Jobs & Services
-- Avoids duplicate indexes; targets foreign keys, status filters, and sort orders.

-- Jobs Lookups & Sorting
CREATE INDEX IF NOT EXISTS idx_jobs_employer_id ON public.jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

-- Job Applications Lookups
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON public.job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);

-- Services Lookups & Sorting
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_is_available ON public.services(is_available);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON public.services(created_at DESC);

-- Service Requests Lookups & Status Filtering
CREATE INDEX IF NOT EXISTS idx_service_requests_service_id ON public.service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_client_id ON public.service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_provider_id ON public.service_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);

-- Reviews on Services
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON public.reviews(service_id);
