-- ==============================================================================
-- AgroMarket Migration: Phase 0.9 Market Intelligence, Regional Prices & Demand Forecasting
-- Migration: 20260913120000_phase_0_9_market_intelligence.sql
--
-- Implements:
-- 1. Extend public.price_observations with normalization, quality label, and metadata
-- 2. Extend public.demand_forecasts with transparent baseline methodology metadata
-- 3. Hardened RLS policies ensuring safe public exposure and admin authority
-- 4. High-performance composite indexes for regional price querying
-- 5. Clearly-labelled simulated Nigerian staple market observations (Zero Pork)
-- ==============================================================================

-- 1. Extend public.price_observations
ALTER TABLE public.price_observations DROP CONSTRAINT IF EXISTS price_observations_source_type_check;
ALTER TABLE public.price_observations DROP CONSTRAINT IF EXISTS price_observations_verification_status_check;

ALTER TABLE public.price_observations
  ADD COLUMN IF NOT EXISTS normalized_price NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS normalized_unit VARCHAR(30),
  ADD COLUMN IF NOT EXISTS normalization_status VARCHAR(30) NOT NULL DEFAULT 'EXACT',
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3, 2) CHECK (confidence_score BETWEEN 0.0 AND 1.0),
  ADD COLUMN IF NOT EXISTS data_quality_label VARCHAR(30) NOT NULL DEFAULT 'SIMULATED',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.price_observations ADD CONSTRAINT price_observations_source_type_check
  CHECK (source_type IN (
    'PLATFORM_TRANSACTION',
    'FARMER_REPORTED',
    'BUYER_REPORTED',
    'MARKET_SURVEY',
    'PARTNER_FEED',
    'GOVERNMENT_SOURCE',
    'COMMUNITY',
    'OFFICIAL_MONITOR',
    'ENUMERATOR',
    'COOPERATIVE',
    'OTHER'
  ));

ALTER TABLE public.price_observations ADD CONSTRAINT price_observations_verification_status_check
  CHECK (verification_status IN (
    'UNVERIFIED',
    'SELF_REPORTED',
    'VERIFIED',
    'SYSTEM_DERIVED',
    'REJECTED'
  ));

ALTER TABLE public.price_observations ADD CONSTRAINT price_observations_normalization_status_check
  CHECK (normalization_status IN ('EXACT', 'NORMALIZED', 'UNAVAILABLE'));

ALTER TABLE public.price_observations ADD CONSTRAINT price_observations_data_quality_label_check
  CHECK (data_quality_label IN ('OBSERVED', 'VERIFIED', 'ESTIMATED', 'SIMULATED'));

-- Query Indexes for Regional Price Aggregation
CREATE INDEX IF NOT EXISTS idx_price_obs_product_state 
  ON public.price_observations(product_id, state);

CREATE INDEX IF NOT EXISTS idx_price_obs_state_observed 
  ON public.price_observations(state, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_obs_source_status 
  ON public.price_observations(source_type, verification_status);

CREATE INDEX IF NOT EXISTS idx_price_obs_quality 
  ON public.price_observations(data_quality_label);

CREATE INDEX IF NOT EXISTS idx_price_obs_normalized 
  ON public.price_observations(product_id, normalized_unit, observed_at DESC);

-- RLS Hardening for Price Observations
DROP POLICY IF EXISTS "Price observations viewable by all" ON public.price_observations;
DROP POLICY IF EXISTS "Authenticated users can report prices" ON public.price_observations;
DROP POLICY IF EXISTS "Admins have full access to price observations" ON public.price_observations;

-- Public and buyers can view safe observations (verified, system derived, or observed test data)
CREATE POLICY "Price observations viewable by all"
  ON public.price_observations FOR SELECT
  TO authenticated, anon
  USING (
    verification_status IN ('VERIFIED', 'SYSTEM_DERIVED') 
    OR data_quality_label IN ('SIMULATED', 'OBSERVED')
    OR auth.uid() = reported_by 
    OR public.is_admin()
  );

-- Authenticated users (farmers/buyers) can submit price observations as SELF_REPORTED/UNVERIFIED
CREATE POLICY "Authenticated users can report prices"
  ON public.price_observations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reported_by 
    AND verification_status IN ('UNVERIFIED', 'SELF_REPORTED')
  );

-- Admins manage, verify, and curate observations
CREATE POLICY "Admins have full access to price observations"
  ON public.price_observations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- 2. Extend public.demand_forecasts
ALTER TABLE public.demand_forecasts
  ADD COLUMN IF NOT EXISTS forecast_method VARCHAR(50) NOT NULL DEFAULT 'MOVING_AVERAGE_30D',
  ADD COLUMN IF NOT EXISTS forecast_horizon_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(30) NOT NULL DEFAULT 'LOW',
  ADD COLUMN IF NOT EXISTS data_window_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS data_quality_label VARCHAR(30) NOT NULL DEFAULT 'ESTIMATED';

ALTER TABLE public.demand_forecasts DROP CONSTRAINT IF EXISTS demand_forecasts_confidence_level_check;
ALTER TABLE public.demand_forecasts ADD CONSTRAINT demand_forecasts_confidence_level_check
  CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH', 'INSUFFICIENT_DATA'));

ALTER TABLE public.demand_forecasts DROP CONSTRAINT IF EXISTS demand_forecasts_data_quality_label_check;
ALTER TABLE public.demand_forecasts ADD CONSTRAINT demand_forecasts_data_quality_label_check
  CHECK (data_quality_label IN ('ESTIMATED', 'SIMULATED', 'OBSERVED'));

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_lookup
  ON public.demand_forecasts(product_id, region_state, period_start DESC);

-- RLS Hardening for Demand Forecasts
DROP POLICY IF EXISTS "Demand forecasts viewable by authenticated users" ON public.demand_forecasts;
DROP POLICY IF EXISTS "Admins manage demand forecasts" ON public.demand_forecasts;

CREATE POLICY "Demand forecasts viewable by authenticated users"
  ON public.demand_forecasts FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins manage demand forecasts"
  ON public.demand_forecasts FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- 3. Realistic Simulated Nigerian Staple Price Observations
-- Explicitly tagged as SIMULATED / SELF_REPORTED. Absolutely ZERO pig/pork products.
INSERT INTO public.price_observations (
  id,
  product_id,
  market_name,
  state,
  lga,
  price,
  currency,
  unit,
  normalized_price,
  normalized_unit,
  normalization_status,
  source_type,
  verification_status,
  confidence_score,
  data_quality_label,
  observed_at,
  metadata
)
VALUES
  -- Milled Parboiled Rice (50kg Bag -> 50kg, normalized to NGN/kg)
  (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000004',
    'Mile 12 International Market',
    'Lagos',
    'Kosofe',
    88000.00,
    'NGN',
    '50kg Bag',
    1760.00,
    'KG',
    'NORMALIZED',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.80,
    'SIMULATED',
    NOW() - INTERVAL '2 days',
    '{"surveyor": "Simulated Field Monitor", "sample_size": 12}'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000004',
    'Dawanau Grain Market',
    'Kano',
    'Dawakin Tofa',
    82000.00,
    'NGN',
    '50kg Bag',
    1640.00,
    'KG',
    'NORMALIZED',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.85,
    'SIMULATED',
    NOW() - INTERVAL '3 days',
    '{"surveyor": "Simulated Field Monitor", "sample_size": 20}'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'Bodija Market',
    'Oyo',
    'Ibadan North',
    85000.00,
    'NGN',
    '50kg Bag',
    1700.00,
    'KG',
    'NORMALIZED',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.75,
    'SIMULATED',
    NOW() - INTERVAL '4 days',
    '{"surveyor": "Simulated Field Monitor", "sample_size": 8}'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'Wuse Market',
    'FCT - Abuja',
    'Municipal',
    92000.00,
    'NGN',
    '50kg Bag',
    1840.00,
    'KG',
    'NORMALIZED',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.78,
    'SIMULATED',
    NOW() - INTERVAL '1 day',
    '{"surveyor": "Simulated Field Monitor", "sample_size": 6}'::jsonb
  ),

  -- White Maize (Grain) (100kg Bag -> 100kg, normalized to NGN/kg)
  (
    'c0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    'Dawanau Grain Market',
    'Kano',
    'Dawakin Tofa',
    64000.00,
    'NGN',
    '100kg Bag',
    640.00,
    'KG',
    'NORMALIZED',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.85,
    'SIMULATED',
    NOW() - INTERVAL '2 days',
    '{"surveyor": "Simulated Field Monitor", "sample_size": 25}'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000001',
    'Mile 12 International Market',
    'Lagos',
    'Kosofe',
    76000.00,
    'NGN',
    '100kg Bag',
    760.00,
    'KG',
    'NORMALIZED',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.80,
    'SIMULATED',
    NOW() - INTERVAL '1 day',
    '{"surveyor": "Simulated Field Monitor", "sample_size": 15}'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000001',
    'Gboko Central Market',
    'Benue',
    'Gboko',
    61000.00,
    'NGN',
    '100kg Bag',
    610.00,
    'KG',
    'NORMALIZED',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.82,
    'SIMULATED',
    NOW() - INTERVAL '3 days',
    '{"surveyor": "Simulated Field Monitor", "sample_size": 10}'::jsonb
  ),

  -- Brown Beans (Cowpea) (100kg Bag -> 100kg)
  (
    'c0000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000011',
    'Dawanau Grain Market',
    'Kano',
    'Dawakin Tofa',
    115000.00,
    'NGN',
    '100kg Bag',
    1150.00,
    'KG',
    'NORMALIZED',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.88,
    'SIMULATED',
    NOW() - INTERVAL '2 days',
    '{"surveyor": "Simulated Field Monitor", "sample_size": 18}'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000009',
    'b0000000-0000-0000-0000-000000000011',
    'Mile 12 International Market',
    'Lagos',
    'Kosofe',
    138000.00,
    'NGN',
    '100kg Bag',
    1380.00,
    'KG',
    'NORMALIZED',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.80,
    'SIMULATED',
    NOW() - INTERVAL '1 day',
    '{"surveyor": "Simulated Field Monitor", "sample_size": 12}'::jsonb
  ),

  -- Roma Tomatoes (Crate -> Variable packaging, normalized_price is NULL, status UNAVAILABLE)
  (
    'c0000000-0000-0000-0000-000000000010',
    'b0000000-0000-0000-0000-000000000008',
    'Mile 12 International Market',
    'Lagos',
    'Kosofe',
    42000.00,
    'NGN',
    'Crate',
    NULL,
    NULL,
    'UNAVAILABLE',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.72,
    'SIMULATED',
    NOW() - INTERVAL '1 day',
    '{"surveyor": "Simulated Field Monitor", "note": "Standard wooden crate weight fluctuates by moisture"}'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000011',
    'b0000000-0000-0000-0000-000000000008',
    'Dawanau Produce Section',
    'Kano',
    'Dawakin Tofa',
    28000.00,
    'NGN',
    'Crate',
    NULL,
    NULL,
    'UNAVAILABLE',
    'MARKET_SURVEY',
    'SELF_REPORTED',
    0.75,
    'SIMULATED',
    NOW() - INTERVAL '2 days',
    '{"surveyor": "Simulated Field Monitor", "note": "Local harvest crate"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
