-- ==============================================================================
-- AgroMarket Migration: Phase 1.0 Smart Basket Recommendation Engine
-- Migration: 20260914000000_phase_1_0_smart_basket.sql
--
-- Implements:
-- 1. Extend public.user_preferences with basket budget, exclusions, and purpose
-- 2. Extend public.basket_recommendations with status, engine version, and state
-- 3. Hardened RLS policies for preferences and recommendations
-- 4. Composite indexes for fast recommendation history lookups
-- ==============================================================================

-- 1. Extend public.user_preferences
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS budget_target_basket NUMERIC(14, 2) CHECK (budget_target_basket >= 0),
  ADD COLUMN IF NOT EXISTS preferred_categories UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_products UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_categories UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS purchasing_frequency VARCHAR(30) DEFAULT 'BIWEEKLY',
  ADD COLUMN IF NOT EXISTS basket_purpose VARCHAR(50) DEFAULT 'HOUSEHOLD',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_purchasing_frequency_check;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_purchasing_frequency_check
  CHECK (purchasing_frequency IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ONE_TIME'));

ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_basket_purpose_check;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_basket_purpose_check
  CHECK (basket_purpose IN ('HOUSEHOLD', 'BULK_SHARING', 'SMALL_COMMERCIAL', 'INDIVIDUAL'));


-- 2. Extend public.basket_recommendations
ALTER TABLE public.basket_recommendations
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'GENERATED',
  ADD COLUMN IF NOT EXISTS engine_version VARCHAR(30) NOT NULL DEFAULT 'DETERMINISTIC_V1',
  ADD COLUMN IF NOT EXISTS budget_allocated NUMERIC(14, 2) CHECK (budget_allocated >= 0),
  ADD COLUMN IF NOT EXISTS state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.basket_recommendations DROP CONSTRAINT IF EXISTS basket_recommendations_status_check;
ALTER TABLE public.basket_recommendations ADD CONSTRAINT basket_recommendations_status_check
  CHECK (status IN ('GENERATED', 'ACCEPTED', 'MODIFIED', 'REJECTED'));

-- Query Indexes for User Recommendation Lookups
CREATE INDEX IF NOT EXISTS idx_basket_recs_user_created 
  ON public.basket_recommendations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_basket_recs_user_status 
  ON public.basket_recommendations(user_id, status);


-- 3. RLS Hardening for basket_recommendations
DROP POLICY IF EXISTS "Users view their own basket recommendations" ON public.basket_recommendations;
DROP POLICY IF EXISTS "Users can insert their own basket recommendations" ON public.basket_recommendations;
DROP POLICY IF EXISTS "Users can update their own basket recommendations" ON public.basket_recommendations;

-- Buyers can view their own generated recommendations
CREATE POLICY "Users view their own basket recommendations"
  ON public.basket_recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Buyers can record recommendations generated for them
CREATE POLICY "Users can insert their own basket recommendations"
  ON public.basket_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Buyers can update recommendation status (e.g. mark accepted/rejected)
CREATE POLICY "Users can update their own basket recommendations"
  ON public.basket_recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Revoke DELETE privileges on basket_recommendations from client roles to preserve audit history
REVOKE DELETE ON public.basket_recommendations FROM anon, authenticated;
