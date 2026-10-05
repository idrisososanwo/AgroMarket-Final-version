-- ==============================================================================
-- AGROMARKET PHASE 2.1: AGRICULTURAL INTELLIGENCE FOUNDATION
-- Schema, Registry, Signals, Observations, Recommendations, Evaluations, RLS,
-- Anti-Pork Constraints, and Immutability Triggers
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AGENT REGISTRY
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_intelligence_agents (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  description TEXT NOT NULL,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'DEPRECATED')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_agricultural_intelligence_agents_updated_at
  BEFORE UPDATE ON public.agricultural_intelligence_agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Register initial canonical agents (Phase 2.1 Foundation + Future Extensions)
INSERT INTO public.agricultural_intelligence_agents (id, name, version, description, capabilities, status)
VALUES
  (
    'AGRICULTURAL_INTELLIGENCE',
    'Core Agricultural Intelligence Agent',
    '1.0.0',
    'Primary deterministic coordination and signal processing engine for AgroMarket Nigerian value chains.',
    ARRAY['PRICE_TREND_ANALYSIS', 'SUPPLY_DEMAND_BALANCING', 'LOGISTICS_MONITORING', 'SECURITY_INTELLIGENCE', 'BOTTLENECK_DETECTION', 'EVALUATION'],
    'ACTIVE'
  ),
  (
    'MARKET_INTELLIGENCE',
    'Commodity Market Intelligence Agent',
    '1.0.0',
    'Monitors regional wholesale and terminal market price dynamics across Nigerian agricultural corridors.',
    ARRAY['PRICE_TREND_ANALYSIS', 'VOLATILITY_MONITORING', 'PARITY_CALCULATION'],
    'ACTIVE'
  ),
  (
    'PRODUCTION_PLANNING',
    'Farm Production Planning Agent',
    '1.0.0',
    'Advises farmers and production clusters on planting schedules, harvest pacing, and output allocation.',
    ARRAY['HARVEST_PACING', 'YIELD_ESTIMATION', 'CLUSTER_AGGREGATION_PLANNING'],
    'ACTIVE'
  ),
  (
    'DEMAND_FORECASTING',
    'Ecosystem Demand Forecasting Agent',
    '1.0.0',
    'Projects metropolitan and B2B offtake demand curves from commercial orders and institutional contracts.',
    ARRAY['INSTITUTIONAL_DEMAND_PROJECTION', 'SEASONAL_CURVES', 'RECURRING_OFFTAKE_MODELING'],
    'ACTIVE'
  ),
  (
    'SUPPLY_MATCHING',
    'Value-Chain Supply Matching Agent',
    '1.0.0',
    'Coordinates deterministic matching between farm outputs, processing facilities, and buyer demand.',
    ARRAY['MULTI_ACTOR_MATCHING', 'CORRIDOR_ROUTING', 'BATCH_POOLING'],
    'ACTIVE'
  ),
  (
    'FOOD_SECURITY',
    'Food Security & Vulnerability Agent',
    '1.0.0',
    'Identifies supply disruptions, price inflation spikes, and staple commodity deficits in vulnerable regions.',
    ARRAY['STAPLE_DEFICIT_DETECTION', 'VULNERABILITY_INDEXING', 'BUFFER_STOCK_ADVISORY'],
    'ACTIVE'
  ),
  (
    'SECURITY_RISK',
    'Agricultural Security Risk Agent',
    '1.0.0',
    'Synthesizes verified agricultural security notices to project transit and farm gate movement disruptions.',
    ARRAY['CORRIDOR_DISRUPTION_ASSESSMENT', 'INCIDENT_CORRELATION', 'TRANSIT_ADVISORY'],
    'ACTIVE'
  ),
  (
    'DISEASE_RISK',
    'Agricultural Disease Alert Agent',
    '1.0.0',
    'Tracks non-diagnostic agronomic and livestock disease advisories to prevent regional contagion spread.',
    ARRAY['VET_ADVISORY_INTEGRATION', 'CROP_PEST_TRACKING', 'BIOSECURITY_ADVISORY'],
    'ACTIVE'
  ),
  (
    'LOGISTICS_INTELLIGENCE',
    'Cold-Chain & Freight Logistics Agent',
    '1.0.0',
    'Evaluates fleet haulage efficiency, reefer temperature compliance, and interstate transit corridors.',
    ARRAY['REEFER_MONITORING', 'TRANSIT_DELAY_DETECTION', 'ROUTE_OPTIMIZATION'],
    'ACTIVE'
  ),
  (
    'FARMER_ADVISORY',
    'Smallholder Farmer Advisory Agent',
    '1.0.0',
    'Translates high-level ecosystem signals into actionable, localized guidance for farm operators.',
    ARRAY['OFFTAKE_PRICE_GUIDANCE', 'STORAGE_RECOMMENDATION', 'EQUIPMENT_TIMING'],
    'ACTIVE'
  ),
  (
    'PROCUREMENT',
    'Institutional B2B Procurement Agent',
    '1.0.0',
    'Structures bulk purchase batches for restaurants, food processors, supermarkets, and hotels.',
    ARRAY['BULK_SPECIFICATION_MATCHING', 'ESCROW_SETTLEMENT_CHECK', 'CONTRACT_FULFILLMENT'],
    'ACTIVE'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  status = EXCLUDED.status,
  updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 2. INTELLIGENCE OBSERVATIONS (Append-Only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_intelligence_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL REFERENCES public.agricultural_intelligence_agents(id) ON DELETE RESTRICT,
  domain_source VARCHAR(50) NOT NULL CHECK (
    domain_source IN (
      'MARKET',
      'SUPPLY',
      'DEMAND',
      'PROCESSING',
      'LOGISTICS',
      'SECURITY',
      'KNOWLEDGE',
      'EQUIPMENT',
      'VALUE_CHAIN'
    )
  ),
  source_id VARCHAR(100),
  commodity VARCHAR(100),
  category VARCHAR(50),
  state VARCHAR(50),
  lga VARCHAR(50),
  corridor VARCHAR(100),
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_value NUMERIC(14, 2),
  baseline_value NUMERIC(14, 2),
  unit VARCHAR(30),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_intelligence_observations CHECK (
    (commodity IS NULL OR commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
    AND summary !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_obs_agent ON public.agricultural_intelligence_observations(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_obs_domain ON public.agricultural_intelligence_observations(domain_source, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_obs_commodity ON public.agricultural_intelligence_observations(commodity);
CREATE INDEX IF NOT EXISTS idx_ai_obs_state ON public.agricultural_intelligence_observations(state, lga);
CREATE INDEX IF NOT EXISTS idx_ai_obs_observed ON public.agricultural_intelligence_observations(observed_at DESC);

-- Immutability trigger for Observations
CREATE OR REPLACE FUNCTION public.prevent_intelligence_observation_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Intelligence observations are strictly immutable. Updates are forbidden.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Intelligence observations are append-only. Only system administrators may purge audit data.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_intelligence_observation_immutability
  BEFORE UPDATE OR DELETE ON public.agricultural_intelligence_observations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_intelligence_observation_mutation();

-- ------------------------------------------------------------------------------
-- 3. INTELLIGENCE SIGNALS (Append-Only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_intelligence_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL REFERENCES public.agricultural_intelligence_agents(id) ON DELETE RESTRICT,
  signal_type VARCHAR(50) NOT NULL CHECK (
    signal_type IN (
      'PRICE_INCREASE',
      'PRICE_DECREASE',
      'DEMAND_INCREASE',
      'DEMAND_DECREASE',
      'SUPPLY_SHORTAGE',
      'SUPPLY_SURPLUS',
      'PROCESSING_BOTTLENECK',
      'LOGISTICS_DISRUPTION',
      'SECURITY_DISRUPTION',
      'DISEASE_RISK',
      'SEASONAL_DEMAND'
    )
  ),
  commodity VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  corridor VARCHAR(100),
  magnitude NUMERIC(10, 2) NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  source VARCHAR(100) NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  supporting_observation_ids UUID[] DEFAULT '{}',
  observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_intelligence_signals CHECK (
    commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_signals_type ON public.agricultural_intelligence_signals(signal_type, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_signals_commodity ON public.agricultural_intelligence_signals(commodity);
CREATE INDEX IF NOT EXISTS idx_ai_signals_state ON public.agricultural_intelligence_signals(state, lga);
CREATE INDEX IF NOT EXISTS idx_ai_signals_expiry ON public.agricultural_intelligence_signals(expires_at);

-- Immutability trigger for Signals
CREATE OR REPLACE FUNCTION public.prevent_intelligence_signal_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Intelligence signals are strictly immutable. Updates are forbidden.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Intelligence signals are append-only. Only system administrators may purge signals.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_intelligence_signal_immutability
  BEFORE UPDATE OR DELETE ON public.agricultural_intelligence_signals
  FOR EACH ROW EXECUTE FUNCTION public.prevent_intelligence_signal_mutation();

-- ------------------------------------------------------------------------------
-- 4. AGRICULTURAL RECOMMENDATIONS (Human-in-the-Loop State Machine)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_intelligence_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL REFERENCES public.agricultural_intelligence_agents(id) ON DELETE RESTRICT,
  objective VARCHAR(100) NOT NULL CHECK (
    objective IN (
      'STABILIZE_SUPPLY',
      'PREVENT_SPOILAGE',
      'OPTIMIZE_PRICING',
      'REROUTE_LOGISTICS',
      'RISK_MITIGATION',
      'FACILITY_OFFTAKE',
      'DEMAND_FULFILLMENT',
      'SECURITY_ADVISORY'
    )
  ),
  title VARCHAR(255) NOT NULL,
  recommendation TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  expected_impact JSONB NOT NULL DEFAULT '{}'::jsonb,
  affected_actors TEXT[] NOT NULL DEFAULT '{}',
  affected_commodities TEXT[] NOT NULL DEFAULT '{}',
  affected_locations TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED' CHECK (
    status IN (
      'PROPOSED',
      'REVIEWED',
      'APPROVED',
      'REJECTED',
      'EXECUTED',
      'EXPIRED'
    )
  ),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_decision VARCHAR(30) CHECK (review_decision IN ('APPROVED', 'REJECTED', 'DEFERRED', NULL)),
  review_notes TEXT,
  executed_at TIMESTAMPTZ,
  execution_notes TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_intelligence_recommendations CHECK (
    title !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
    AND recommendation !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE TRIGGER set_agricultural_intelligence_recommendations_updated_at
  BEFORE UPDATE ON public.agricultural_intelligence_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_rec_status ON public.agricultural_intelligence_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_rec_objective ON public.agricultural_intelligence_recommendations(objective);
CREATE INDEX IF NOT EXISTS idx_ai_rec_agent ON public.agricultural_intelligence_recommendations(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_rec_expiry ON public.agricultural_intelligence_recommendations(expires_at);

-- ------------------------------------------------------------------------------
-- 5. AGRICULTURAL PREDICTIONS (Agent Memory Forecaster)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_intelligence_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL REFERENCES public.agricultural_intelligence_agents(id) ON DELETE RESTRICT,
  recommendation_id UUID REFERENCES public.agricultural_intelligence_recommendations(id) ON DELETE SET NULL,
  commodity VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  metric_name VARCHAR(100) NOT NULL,
  baseline_value NUMERIC(14, 2) NOT NULL,
  predicted_value NUMERIC(14, 2) NOT NULL,
  predicted_range_low NUMERIC(14, 2),
  predicted_range_high NUMERIC(14, 2),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  target_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EVALUATED', 'CANCELLED', 'EXPIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_intelligence_predictions CHECK (
    commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_pred_status ON public.agricultural_intelligence_predictions(status);
CREATE INDEX IF NOT EXISTS idx_ai_pred_target ON public.agricultural_intelligence_predictions(target_date);
CREATE INDEX IF NOT EXISTS idx_ai_pred_commodity ON public.agricultural_intelligence_predictions(commodity, state);

-- ------------------------------------------------------------------------------
-- 6. AGRICULTURAL OUTCOMES (Observed Reality)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_intelligence_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.agricultural_intelligence_predictions(id) ON DELETE CASCADE,
  actual_value NUMERIC(14, 2) NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  source_domain VARCHAR(50) NOT NULL,
  source_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_outcomes_pred ON public.agricultural_intelligence_outcomes(prediction_id);
CREATE INDEX IF NOT EXISTS idx_ai_outcomes_observed ON public.agricultural_intelligence_outcomes(observed_at DESC);

-- ------------------------------------------------------------------------------
-- 7. PREDICTION EVALUATIONS (Deterministic Learning Loop)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_intelligence_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL UNIQUE REFERENCES public.agricultural_intelligence_predictions(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES public.agricultural_intelligence_outcomes(id) ON DELETE CASCADE,
  predicted_value NUMERIC(14, 2) NOT NULL,
  actual_value NUMERIC(14, 2) NOT NULL,
  absolute_error NUMERIC(14, 2) NOT NULL,
  percentage_error NUMERIC(10, 2) NOT NULL,
  direction_accurate BOOLEAN NOT NULL,
  within_predicted_range BOOLEAN NOT NULL,
  evaluation_score NUMERIC(4, 3) NOT NULL CHECK (evaluation_score BETWEEN 0.0 AND 1.0),
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_eval_pred ON public.agricultural_intelligence_evaluations(prediction_id);
CREATE INDEX IF NOT EXISTS idx_ai_eval_score ON public.agricultural_intelligence_evaluations(evaluation_score);

-- Immutability trigger for Evaluations
CREATE OR REPLACE FUNCTION public.prevent_intelligence_evaluation_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Intelligence evaluations are strictly immutable. Updates are forbidden.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Intelligence evaluations are append-only. Only system administrators may purge evaluation records.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_intelligence_evaluation_immutability
  BEFORE UPDATE OR DELETE ON public.agricultural_intelligence_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_intelligence_evaluation_mutation();

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 8.1 Agents Registry
ALTER TABLE public.agricultural_intelligence_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active intelligence agents"
  ON public.agricultural_intelligence_agents FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage intelligence agents"
  ON public.agricultural_intelligence_agents FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8.2 Observations
ALTER TABLE public.agricultural_intelligence_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view intelligence observations"
  ON public.agricultural_intelligence_observations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and authorized services can insert observations"
  ON public.agricultural_intelligence_observations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8.3 Signals
ALTER TABLE public.agricultural_intelligence_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view intelligence signals"
  ON public.agricultural_intelligence_signals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and services can insert signals"
  ON public.agricultural_intelligence_signals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8.4 Recommendations
ALTER TABLE public.agricultural_intelligence_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view recommendations"
  ON public.agricultural_intelligence_recommendations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can insert recommendations"
  ON public.agricultural_intelligence_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authorized users and admins can review recommendations"
  ON public.agricultural_intelligence_recommendations FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR auth.uid() IS NOT NULL
  )
  WITH CHECK (
    public.is_admin()
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins can delete recommendations"
  ON public.agricultural_intelligence_recommendations FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 8.5 Predictions
ALTER TABLE public.agricultural_intelligence_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view predictions"
  ON public.agricultural_intelligence_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can insert predictions"
  ON public.agricultural_intelligence_predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authorized users can update prediction status"
  ON public.agricultural_intelligence_predictions FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() IS NOT NULL)
  WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);

-- 8.6 Outcomes
ALTER TABLE public.agricultural_intelligence_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view outcomes"
  ON public.agricultural_intelligence_outcomes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can insert outcomes"
  ON public.agricultural_intelligence_outcomes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8.7 Evaluations
ALTER TABLE public.agricultural_intelligence_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view evaluations"
  ON public.agricultural_intelligence_evaluations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authorized users can insert evaluations"
  ON public.agricultural_intelligence_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 9. PERMISSIONS AND GRANTS
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.agricultural_intelligence_agents TO anon, authenticated;
GRANT SELECT, INSERT ON public.agricultural_intelligence_observations TO authenticated;
GRANT SELECT, INSERT ON public.agricultural_intelligence_signals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agricultural_intelligence_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.agricultural_intelligence_predictions TO authenticated;
GRANT SELECT, INSERT ON public.agricultural_intelligence_outcomes TO authenticated;
GRANT SELECT, INSERT ON public.agricultural_intelligence_evaluations TO authenticated;
