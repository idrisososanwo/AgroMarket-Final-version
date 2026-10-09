-- ==============================================================================
-- AGROMARKET PHASE 3.17: BACKGROUND PROCESSING, SCHEDULED JOBS & RETRY FOUNDATION
-- Resilient PostgreSQL-backed queue, atomic claiming with FOR UPDATE SKIP LOCKED,
-- lease recovery, status lifecycle, idempotency, least-privilege, and anti-pork constraints
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BACKGROUND JOBS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER')),
  priority INT NOT NULL DEFAULT 50,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB DEFAULT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  run_after TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  idempotency_key TEXT UNIQUE,
  claimed_by TEXT DEFAULT NULL,
  lease_expires_at TIMESTAMPTZ DEFAULT NULL,
  last_error_category VARCHAR(40) DEFAULT NULL
    CHECK (last_error_category IS NULL OR last_error_category IN (
      'TRANSIENT', 'PERMANENT', 'VALIDATION_FAILED', 'INVARIANT_VIOLATION', 'CANCELLED', 'TIMEOUT'
    )),
  last_error_message TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  failed_at TIMESTAMPTZ DEFAULT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Zero-Tolerance Anti-Pork Produce Invariant on background jobs
  CONSTRAINT chk_no_pork_background_jobs CHECK (
    NOT (job_type || ' ' || COALESCE(last_error_message, '') ~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

-- ------------------------------------------------------------------------------
-- 2. PERFORMANCE & QUEUE CLAIMING INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_background_jobs_queue
  ON public.background_jobs (status, run_after, priority DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_background_jobs_lease
  ON public.background_jobs (status, lease_expires_at)
  WHERE status = 'RUNNING';

CREATE INDEX IF NOT EXISTS idx_background_jobs_type_status
  ON public.background_jobs (job_type, status);

CREATE INDEX IF NOT EXISTS idx_background_jobs_idempotency
  ON public.background_jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. ATOMIC JOB CLAIMING RPC (FOR UPDATE SKIP LOCKED)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_background_jobs(
  p_worker_id TEXT,
  p_batch_size INT DEFAULT 5,
  p_lease_duration_seconds INT DEFAULT 300,
  p_allowed_types TEXT[] DEFAULT NULL
)
RETURNS SETOF public.background_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH eligible_jobs AS (
    SELECT id
    FROM public.background_jobs
    WHERE
      (
        -- Normal queued jobs ready to run
        (status = 'QUEUED' AND run_after <= timezone('utc'::text, now()))
        OR
        -- Abandoned/stalled running jobs whose lease has expired
        (status = 'RUNNING' AND lease_expires_at IS NOT NULL AND lease_expires_at < timezone('utc'::text, now()))
      )
      AND (p_allowed_types IS NULL OR job_type = ANY(p_allowed_types))
    ORDER BY priority DESC, run_after ASC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.background_jobs j
  SET
    status = 'RUNNING',
    claimed_by = p_worker_id,
    started_at = timezone('utc'::text, now()),
    lease_expires_at = timezone('utc'::text, now()) + (p_lease_duration_seconds || ' seconds')::interval,
    attempt_count = j.attempt_count + 1
  FROM eligible_jobs e
  WHERE j.id = e.id
  RETURNING j.*;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) & PERMISSION HARDENING
-- ------------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON TABLE public.background_jobs FROM anon, authenticated;
GRANT SELECT ON TABLE public.background_jobs TO authenticated;

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can inspect jobs via RLS; non-admins cannot read raw background job queue
DROP POLICY IF EXISTS "Admins view all background jobs" ON public.background_jobs;
CREATE POLICY "Admins view all background jobs"
  ON public.background_jobs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage background jobs" ON public.background_jobs;
CREATE POLICY "Admins manage background jobs"
  ON public.background_jobs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
