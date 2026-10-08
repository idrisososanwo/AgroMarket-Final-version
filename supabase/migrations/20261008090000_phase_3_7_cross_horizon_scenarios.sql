-- ==============================================================================
-- AgroMarket Phase 3.7: Cross-Horizon Scenario Modeling & Forward Planning Intelligence
-- Migration: 20261008090000_phase_3_7_cross_horizon_scenarios.sql
--
-- 1. Updates agricultural_orchestration_snapshots scenario_type check constraint
--    to support all 12 canonical scenario types.
-- 2. Creates public.agricultural_scenarios table with multi-horizon support,
--    evidence graph, probability classes, forward planning implications,
--    versioning lineage, and evaluation linkage.
-- 3. Implements strict RLS, anti-pork invariants, and composite performance indexes.
-- ==============================================================================

-- 1. Update agricultural_orchestration_snapshots scenario_type constraint to 12 types
ALTER TABLE public.agricultural_orchestration_snapshots
  DROP CONSTRAINT IF EXISTS agricultural_orchestration_snapshots_scenario_type_check;

ALTER TABLE public.agricultural_orchestration_snapshots
  ADD CONSTRAINT agricultural_orchestration_snapshots_scenario_type_check
  CHECK (
    scenario_type IN (
      'BALANCED_NOMINAL_SCENARIO',
      'DEMAND_SURGE_SCENARIO',
      'SUPPLY_SHORTAGE_SCENARIO',
      'SUPPLY_SURPLUS_SCENARIO',
      'MARKET_PRESSURE_SCENARIO',
      'LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO',
      'PROCESSING_BOTTLENECK_SCENARIO',
      'DISEASE_SUPPLY_RISK_SCENARIO',
      'PROCUREMENT_RISK_SCENARIO',
      'FOOD_SECURITY_PRESSURE_SCENARIO',
      'RESILIENCE_STRESS_SCENARIO',
      'MULTI_DOMAIN_RISK_SCENARIO'
    )
  );

-- 2. Create agricultural_scenarios table
CREATE TABLE IF NOT EXISTS public.agricultural_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_type VARCHAR(60) NOT NULL CHECK (
    scenario_type IN (
      'BALANCED_NOMINAL_SCENARIO',
      'DEMAND_SURGE_SCENARIO',
      'SUPPLY_SHORTAGE_SCENARIO',
      'SUPPLY_SURPLUS_SCENARIO',
      'MARKET_PRESSURE_SCENARIO',
      'LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO',
      'PROCESSING_BOTTLENECK_SCENARIO',
      'DISEASE_SUPPLY_RISK_SCENARIO',
      'PROCUREMENT_RISK_SCENARIO',
      'FOOD_SECURITY_PRESSURE_SCENARIO',
      'RESILIENCE_STRESS_SCENARIO',
      'MULTI_DOMAIN_RISK_SCENARIO'
    )
  ),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  domain VARCHAR(50) NOT NULL,
  commodity VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  horizon VARCHAR(40) NOT NULL CHECK (
    horizon IN ('SHORT_TERM_0_7D', 'MEDIUM_TERM_8_30D', 'LONG_TERM_31_90D', 'CROSS_HORIZON')
  ),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  probability_class VARCHAR(30) NOT NULL CHECK (
    probability_class IN ('LOW_LIKELIHOOD', 'PLAUSIBLE', 'ELEVATED', 'HIGH_CONCERN', 'INSUFFICIENT_DATA')
  ),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.000 AND 1.000),
  confidence_level VARCHAR(30) NOT NULL CHECK (
    confidence_level IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_DATA')
  ),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  triggering_conditions TEXT[] NOT NULL DEFAULT '{}',
  supporting_forecast_ids UUID[] NOT NULL DEFAULT '{}',
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints TEXT[] NOT NULL DEFAULT '{}',
  expected_direction VARCHAR(30) NOT NULL CHECK (
    expected_direction IN ('INCREASING', 'DECREASING', 'STABLE', 'VOLATILE', 'UNKNOWN')
  ),
  expected_impact TEXT NOT NULL,
  food_security_implication TEXT,
  market_implication TEXT,
  production_implication TEXT,
  demand_implication TEXT,
  logistics_implication TEXT,
  procurement_implication TEXT,
  disease_or_biosecurity_implication TEXT,
  resilience_implication TEXT,
  planning_implications JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'REVIEW', 'ACTIVE', 'EXPIRED', 'EVALUATED', 'ARCHIVED', 'CANCELLED')
  ),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  previous_scenario_id UUID REFERENCES public.agricultural_scenarios(id) ON DELETE SET NULL,
  evaluation_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (
    evaluation_status IN ('PENDING', 'EVALUATED', 'NOT_EVALUABLE', 'INSUFFICIENT_DATA')
  ),
  evaluation_id UUID REFERENCES public.agricultural_feedback_evaluations(id) ON DELETE SET NULL,
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Zero-Tolerance Invariant
  CONSTRAINT chk_agricultural_scenarios_anti_pork CHECK (
    (commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (category IS NULL OR category !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (title !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (description !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (expected_impact !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_scenarios_domain_horizon_status
  ON public.agricultural_scenarios(domain, horizon, status);

CREATE INDEX IF NOT EXISTS idx_scenarios_commodity_state_status
  ON public.agricultural_scenarios(commodity, state, status);

CREATE INDEX IF NOT EXISTS idx_scenarios_prob_conf
  ON public.agricultural_scenarios(probability_class, confidence_level);

CREATE INDEX IF NOT EXISTS idx_scenarios_version_lineage
  ON public.agricultural_scenarios(previous_scenario_id, version);

CREATE INDEX IF NOT EXISTS idx_scenarios_created_at
  ON public.agricultural_scenarios(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scenarios_dates
  ON public.agricultural_scenarios(start_date, end_date);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.agricultural_scenarios ENABLE ROW LEVEL SECURITY;

-- Read policy: Public and authenticated read active, evaluated, or archived scenarios
DROP POLICY IF EXISTS "Public and authenticated read agricultural scenarios" ON public.agricultural_scenarios;
CREATE POLICY "Public and authenticated read agricultural scenarios"
  ON public.agricultural_scenarios
  FOR SELECT
  USING (
    status IN ('ACTIVE', 'EVALUATED', 'ARCHIVED')
    OR auth.role() IN ('authenticated', 'service_role')
  );

-- Insert policy: Service role and authenticated system write scenarios
DROP POLICY IF EXISTS "Authenticated service insert agricultural scenarios" ON public.agricultural_scenarios;
CREATE POLICY "Authenticated service insert agricultural scenarios"
  ON public.agricultural_scenarios
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Update policy: Server authoritative updates for state transitions and evaluation
DROP POLICY IF EXISTS "Authenticated service update agricultural scenarios" ON public.agricultural_scenarios;
CREATE POLICY "Authenticated service update agricultural scenarios"
  ON public.agricultural_scenarios
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- 5. View alias for developer ergonomics
CREATE OR REPLACE VIEW public.agricultural_cross_horizon_scenarios AS
  SELECT * FROM public.agricultural_scenarios;

COMMENT ON TABLE public.agricultural_scenarios IS
  'AgroMarket cross-horizon scenario modeling and forward planning intelligence ledger.';
