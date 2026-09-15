-- ==============================================================================
-- AgroMarket Migration: Phase 0.9 Price Observations Immutability & Data Integrity Hardening
-- Migration: 20260913180000_phase_0_9_price_observations_integrity.sql
--
-- Implements:
-- 1. Database-level trigger enforcing immutable historical facts on public.price_observations.
--    Prevents modifying commodity, market, state, lga, price, currency, unit,
--    source_type, reported_by, observed_at, created_at, or normalized values.
-- 2. Database-level trigger preventing DELETE operations (strictly append-only registry).
-- 3. Invariant constraint & trigger: SIMULATED observations must NEVER be promoted to VERIFIED,
--    and data_quality_label cannot be altered from SIMULATED.
-- 4. Hardened RLS policies: Replaces broad Admin 'FOR ALL' with separate granular SELECT,
--    INSERT, and UPDATE policies, revoking DELETE privileges entirely.
-- ==============================================================================

-- 1. Invariant Constraint: SIMULATED records can NEVER have VERIFIED status
ALTER TABLE public.price_observations DROP CONSTRAINT IF EXISTS price_obs_no_simulated_verified;
ALTER TABLE public.price_observations ADD CONSTRAINT price_obs_no_simulated_verified
  CHECK (NOT (data_quality_label = 'SIMULATED' AND verification_status = 'VERIFIED'));

-- 2. Trigger Function: Enforce immutability of historical price observation facts
CREATE OR REPLACE FUNCTION public.enforce_price_observation_append_only()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent any modification of historical observation facts
  IF NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.market_name IS DISTINCT FROM OLD.market_name
     OR NEW.state IS DISTINCT FROM OLD.state
     OR NEW.lga IS DISTINCT FROM OLD.lga
     OR NEW.price IS DISTINCT FROM OLD.price
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.unit IS DISTINCT FROM OLD.unit
     OR NEW.normalized_price IS DISTINCT FROM OLD.normalized_price
     OR NEW.normalized_unit IS DISTINCT FROM OLD.normalized_unit
     OR NEW.normalization_status IS DISTINCT FROM OLD.normalization_status
     OR NEW.source_type IS DISTINCT FROM OLD.source_type
     OR NEW.reported_by IS DISTINCT FROM OLD.reported_by
     OR NEW.observed_at IS DISTINCT FROM OLD.observed_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'Historical price observation facts are immutable: UPDATE of product, market, location, price, unit, source, reporter, or timestamps is strictly forbidden.';
  END IF;

  -- Invariant: SIMULATED records can NEVER be upgraded to VERIFIED
  IF OLD.data_quality_label = 'SIMULATED' AND NEW.verification_status = 'VERIFIED' THEN
    RAISE EXCEPTION 'SIMULATED price observations cannot be promoted to VERIFIED. Real observations must be inserted as new records.';
  END IF;

  -- Invariant: SIMULATED records cannot alter their data_quality_label to bypass safety checks
  IF OLD.data_quality_label = 'SIMULATED' AND NEW.data_quality_label IS DISTINCT FROM OLD.data_quality_label THEN
    RAISE EXCEPTION 'SIMULATED price observation data_quality_label cannot be altered.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_price_observation_append_only ON public.price_observations;

CREATE TRIGGER trg_enforce_price_observation_append_only
  BEFORE UPDATE ON public.price_observations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_price_observation_append_only();


-- 3. Trigger Function: Strictly forbid DELETE operations (append-only ledger)
CREATE OR REPLACE FUNCTION public.prevent_price_observation_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'public.price_observations is strictly append-only: DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_price_observation_deletion ON public.price_observations;

CREATE TRIGGER trg_prevent_price_observation_deletion
  BEFORE DELETE ON public.price_observations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_price_observation_deletion();


-- 4. Hardened RLS Policies for price_observations
-- Drop broad 'FOR ALL' admin policy that granted update/delete authority
DROP POLICY IF EXISTS "Admins have full access to price observations" ON public.price_observations;
DROP POLICY IF EXISTS "Admins can view all price observations" ON public.price_observations;
DROP POLICY IF EXISTS "Admins can insert price observations" ON public.price_observations;
DROP POLICY IF EXISTS "Admins can moderate price observations" ON public.price_observations;

-- Admins can view all observations (including unverified and rejected)
CREATE POLICY "Admins can view all price observations"
  ON public.price_observations FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can insert verified or curated observations
CREATE POLICY "Admins can insert price observations"
  ON public.price_observations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can only perform moderation updates (subject to database immutability triggers)
CREATE POLICY "Admins can moderate price observations"
  ON public.price_observations FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Explicitly revoke DELETE privileges from client roles
REVOKE DELETE ON public.price_observations FROM anon, authenticated;
