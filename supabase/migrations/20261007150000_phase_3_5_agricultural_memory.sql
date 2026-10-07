-- ==============================================================================
-- AGROMARKET PHASE 3.5: AGRICULTURAL MEMORY & HISTORICAL INTELLIGENCE LAYER
-- Schema for Historical Baselines, Temporal Indices, Time-Series Optimizations,
-- Baseline Snapshots, RLS, and Anti-Pork Constraints
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TIME-SERIES PERFORMANCE INDEXES ON EXISTING INTELLIGENCE TABLES
-- ------------------------------------------------------------------------------

-- 1.1 Observations (Composite indexes for historical range & geographic slices)
CREATE INDEX IF NOT EXISTS idx_ai_obs_comm_state_time
  ON public.agricultural_intelligence_observations(commodity, state, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_obs_domain_time
  ON public.agricultural_intelligence_observations(domain_source, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_obs_agent_time
  ON public.agricultural_intelligence_observations(agent_id, observed_at DESC);

-- 1.2 Signals (Composite indexes for recurring pattern analysis)
CREATE INDEX IF NOT EXISTS idx_ai_sig_type_comm_time
  ON public.agricultural_intelligence_signals(signal_type, commodity, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_sig_comm_state_time
  ON public.agricultural_intelligence_signals(commodity, state, observed_at DESC);

-- 1.3 Orchestration Recommendations (Type and time tracking)
CREATE INDEX IF NOT EXISTS idx_orch_rec_type_time
  ON public.agricultural_orchestration_recommendations(recommendation_type, created_at DESC);

-- 1.4 Feedback Evaluations (Domain and agent historical track record)
CREATE INDEX IF NOT EXISTS idx_fb_eval_domain_time
  ON public.agricultural_feedback_evaluations(domain, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_fb_eval_agent_time
  ON public.agricultural_feedback_evaluations(agent_id, evaluated_at DESC);

-- 1.5 Learning Signals (Historical calibration and recurrence tracking)
CREATE INDEX IF NOT EXISTS idx_learn_sig_agent_type_time
  ON public.agricultural_learning_signals(agent_id, signal_type, generated_at DESC);

-- ------------------------------------------------------------------------------
-- 2. AGRICULTURAL HISTORICAL BASELINES TABLE (Governed Baseline Cache)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_historical_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(50) NOT NULL CHECK (
    domain IN (
      'MARKET',
      'PRODUCTION',
      'DEMAND',
      'SUPPLY',
      'PROCUREMENT',
      'LOGISTICS',
      'FOOD_SECURITY',
      'AGRICULTURAL_SECURITY',
      'DISEASE_BIOSECURITY',
      'PROCESSING',
      'AGGREGATION',
      'VALUE_CHAIN',
      'EQUIPMENT',
      'SERVICES',
      'ORCHESTRATION'
    )
  ),
  metric_name VARCHAR(80) NOT NULL,
  commodity VARCHAR(100),
  state VARCHAR(50),
  lga VARCHAR(50),
  time_horizon VARCHAR(40) NOT NULL CHECK (
    time_horizon IN (
      'LAST_7_DAYS',
      'LAST_30_DAYS',
      'LAST_90_DAYS',
      'LAST_365_DAYS',
      'CUSTOM'
    )
  ),
  sample_count INT NOT NULL DEFAULT 0 CHECK (sample_count >= 0),
  time_coverage_days INT NOT NULL DEFAULT 0 CHECK (time_coverage_days >= 0),
  data_completeness_ratio NUMERIC(4, 3) NOT NULL DEFAULT 0.0 CHECK (
    data_completeness_ratio BETWEEN 0.0 AND 1.0
  ),
  baseline_value NUMERIC(14, 2) NOT NULL,
  baseline_range_low NUMERIC(14, 2),
  baseline_range_high NUMERIC(14, 2),
  std_dev NUMERIC(14, 2),
  baseline_confidence NUMERIC(4, 3) NOT NULL CHECK (
    baseline_confidence BETWEEN 0.0 AND 1.0
  ),
  data_quality_flags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Zero-Tolerance Invariant
  CONSTRAINT agricultural_historical_baselines_anti_pork CHECK (
    commodity IS NULL OR commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b'
  )
);

CREATE INDEX IF NOT EXISTS idx_hist_baselines_lookup
  ON public.agricultural_historical_baselines(domain, metric_name, commodity, state);

CREATE INDEX IF NOT EXISTS idx_hist_baselines_valid
  ON public.agricultural_historical_baselines(valid_until);

CREATE TRIGGER set_agricultural_historical_baselines_updated_at
  BEFORE UPDATE ON public.agricultural_historical_baselines
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_historical_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and authenticated read historical baselines"
  ON public.agricultural_historical_baselines;
CREATE POLICY "Public and authenticated read historical baselines"
  ON public.agricultural_historical_baselines
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "System role and authenticated service manage historical baselines"
  ON public.agricultural_historical_baselines;
CREATE POLICY "System role and authenticated service manage historical baselines"
  ON public.agricultural_historical_baselines
  FOR ALL
  TO authenticated
  USING (auth.role() IN ('authenticated', 'service_role') OR public.is_admin())
  WITH CHECK (auth.role() IN ('authenticated', 'service_role') OR public.is_admin());
