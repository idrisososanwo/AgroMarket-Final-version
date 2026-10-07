-- ==============================================================================
-- AGROMARKET PHASE 3.4: AGRICULTURAL INTELLIGENCE FEEDBACK LOOP & EVALUATION ENGINE
-- Schema for Outcome Lifecycle, Outcome Evidence with Provenance, Feedback Evaluations,
-- Learning Signals, Agent Performance, Data Quality Feedback, RLS, and Anti-Pork
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND AGRICULTURAL ORCHESTRATION OUTCOMES
-- ------------------------------------------------------------------------------
-- Add linkages to decisions, actions, action integrations, controlled outcome types,
-- and geographic/actor context
ALTER TABLE public.agricultural_orchestration_outcomes
  ADD COLUMN IF NOT EXISTS decision_id UUID REFERENCES public.agricultural_decisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_id UUID REFERENCES public.agricultural_actions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_integration_id UUID REFERENCES public.agricultural_action_integrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outcome_type VARCHAR(60) DEFAULT 'OTHER' CHECK (
    outcome_type IN (
      'SUPPLY_SOURCED',
      'SUPPLY_PARTIALLY_SOURCED',
      'SUPPLY_NOT_SOURCED',
      'PROCUREMENT_COMPLETED',
      'PROCUREMENT_PARTIALLY_COMPLETED',
      'PROCUREMENT_FAILED',
      'MARKETPLACE_PURCHASE_COMPLETED',
      'MARKETPLACE_PURCHASE_CANCELLED',
      'PRODUCTION_PLAN_ACCEPTED',
      'PRODUCTION_PLAN_DEFERRED',
      'PRODUCTION_PLAN_COMPLETED',
      'LOGISTICS_MOVEMENT_COMPLETED',
      'LOGISTICS_DELAYED',
      'LOGISTICS_CANCELLED',
      'EQUIPMENT_RENTAL_COMPLETED',
      'SERVICE_REQUEST_COMPLETED',
      'SHARED_PURCHASE_COMPLETED',
      'SHARED_PURCHASE_CANCELLED',
      'FOOD_SECURITY_RESPONSE_COMPLETED',
      'FOOD_SECURITY_RESPONSE_DEFERRED',
      'INTELLIGENCE_DISMISSED',
      'INTELLIGENCE_CONFIRMED',
      'INTELLIGENCE_UNCONFIRMED',
      'OTHER'
    )
  ),
  ADD COLUMN IF NOT EXISTS status VARCHAR(40) DEFAULT 'OUTCOME_OBSERVED' CHECK (
    status IN ('OUTCOME_OBSERVED', 'OUTCOME_UNKNOWN', 'OUTCOME_EVALUATED')
  ),
  ADD COLUMN IF NOT EXISTS actor_role VARCHAR(40),
  ADD COLUMN IF NOT EXISTS commodity VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lga VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Anti-pork check on extended outcome commodity
ALTER TABLE public.agricultural_orchestration_outcomes
  DROP CONSTRAINT IF EXISTS agricultural_orchestration_outcomes_commodity_anti_pork;

ALTER TABLE public.agricultural_orchestration_outcomes
  ADD CONSTRAINT agricultural_orchestration_outcomes_commodity_anti_pork CHECK (
    commodity IS NULL OR commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b'
  );

CREATE INDEX IF NOT EXISTS idx_orchestration_outcomes_dec ON public.agricultural_orchestration_outcomes(decision_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_outcomes_act ON public.agricultural_orchestration_outcomes(action_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_outcomes_act_int ON public.agricultural_orchestration_outcomes(action_integration_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_outcomes_type ON public.agricultural_orchestration_outcomes(outcome_type);
CREATE INDEX IF NOT EXISTS idx_orchestration_outcomes_status ON public.agricultural_orchestration_outcomes(status);
CREATE INDEX IF NOT EXISTS idx_orchestration_outcomes_state ON public.agricultural_orchestration_outcomes(state);
CREATE INDEX IF NOT EXISTS idx_orchestration_outcomes_commodity ON public.agricultural_orchestration_outcomes(commodity);

-- ------------------------------------------------------------------------------
-- 2. AGRICULTURAL OUTCOME EVIDENCE (Structured Provenance Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_outcome_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id UUID NOT NULL REFERENCES public.agricultural_orchestration_outcomes(id) ON DELETE CASCADE,
  evidence_type VARCHAR(60) NOT NULL CHECK (
    evidence_type IN (
      'TRANSACTION_RECEIPT',
      'DELIVERY_WAYBILL',
      'HARVEST_INSPECTION',
      'QUALITY_GRADING',
      'PARTNER_CONFIRMATION',
      'GROUND_TRUTH_OBSERVATION',
      'USER_ATTESTATION',
      'CORRIDOR_SURVEILLANCE',
      'MARKET_SURVEY',
      'SYSTEM_EVENT_AUDIT',
      'OTHER'
    )
  ),
  source_type VARCHAR(50) NOT NULL CHECK (
    source_type IN (
      'SYSTEM_EVENT',
      'VERIFIED_TRANSACTION',
      'USER_REPORT',
      'EXTERNAL_SOURCE',
      'AGENT_OBSERVATION'
    )
  ),
  source_reference VARCHAR(255),
  provenance_nature VARCHAR(30) NOT NULL CHECK (
    provenance_nature IN ('OBSERVED', 'DERIVED', 'CORRELATED', 'ESTIMATED', 'UNKNOWN')
  ),
  observed_at TIMESTAMPTZ NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.000 AND 1.000),
  description TEXT NOT NULL,
  quantitative_value NUMERIC(14, 2),
  unit VARCHAR(30),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_outcome_evidence_anti_pork CHECK (
    description !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b'
  )
);

CREATE INDEX IF NOT EXISTS idx_outcome_evidence_outcome ON public.agricultural_outcome_evidence(outcome_id);
CREATE INDEX IF NOT EXISTS idx_outcome_evidence_type ON public.agricultural_outcome_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_outcome_evidence_source ON public.agricultural_outcome_evidence(source_type);
CREATE INDEX IF NOT EXISTS idx_outcome_evidence_provenance ON public.agricultural_outcome_evidence(provenance_nature);
CREATE INDEX IF NOT EXISTS idx_outcome_evidence_created ON public.agricultural_outcome_evidence(created_at DESC);

-- Trigger: Immutability for Outcome Evidence
CREATE OR REPLACE FUNCTION public.fn_prevent_outcome_evidence_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'agricultural_outcome_evidence records are append-only and cannot be updated.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_outcome_evidence_update ON public.agricultural_outcome_evidence;
CREATE TRIGGER trg_prevent_outcome_evidence_update
  BEFORE UPDATE ON public.agricultural_outcome_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_outcome_evidence_update();

-- ------------------------------------------------------------------------------
-- 3. AGRICULTURAL FEEDBACK EVALUATIONS (Prediction vs. Outcome Learning)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_feedback_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.agricultural_orchestration_recommendations(id) ON DELETE CASCADE,
  outcome_id UUID REFERENCES public.agricultural_orchestration_outcomes(id) ON DELETE SET NULL,
  agent_id VARCHAR(50) NOT NULL REFERENCES public.agricultural_intelligence_agents(id) ON DELETE RESTRICT,
  domain VARCHAR(50) NOT NULL CHECK (
    domain IN (
      'CROP',
      'LIVESTOCK',
      'POULTRY',
      'AQUACULTURE',
      'DAIRY',
      'PROCESSING',
      'AGGREGATION',
      'B2B_PROCUREMENT',
      'COMMERCE',
      'LOGISTICS',
      'FOOD_SECURITY',
      'AGRICULTURAL_SECURITY',
      'DISEASE_BIOSECURITY',
      'EQUIPMENT',
      'SERVICES',
      'MARKET',
      'PRODUCTION',
      'DEMAND',
      'SUPPLY',
      'ORCHESTRATION'
    )
  ),
  evaluation_status VARCHAR(30) NOT NULL CHECK (
    evaluation_status IN ('INSUFFICIENT_DATA', 'PENDING', 'EVALUATED', 'NOT_EVALUABLE')
  ),
  accuracy_score NUMERIC(4, 3) CHECK (accuracy_score BETWEEN 0.000 AND 1.000),
  usefulness_rating VARCHAR(30) NOT NULL CHECK (
    usefulness_rating IN ('VERY_USEFUL', 'USEFUL', 'NEUTRAL', 'NOT_USEFUL', 'HARMFUL', 'UNKNOWN', 'INSUFFICIENT_DATA')
  ),
  timeliness VARCHAR(30) NOT NULL CHECK (
    timeliness IN ('EARLY', 'ON_TIME', 'LATE', 'EXPIRED', 'NOT_EVALUABLE', 'INSUFFICIENT_DATA')
  ),
  time_horizon VARCHAR(30) NOT NULL CHECK (
    time_horizon IN ('SHORT_TERM_0_7D', 'MEDIUM_TERM_8_30D', 'LONG_TERM_31_90D')
  ),
  predicted_state TEXT,
  actual_state TEXT,
  variance_analysis TEXT,
  evaluation_notes TEXT,
  evaluated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_feedback_evaluations_anti_pork CHECK (
    (predicted_state IS NULL OR predicted_state !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (actual_state IS NULL OR actual_state !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (variance_analysis IS NULL OR variance_analysis !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (evaluation_notes IS NULL OR evaluation_notes !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_feedback_eval_rec ON public.agricultural_feedback_evaluations(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_eval_outcome ON public.agricultural_feedback_evaluations(outcome_id);
CREATE INDEX IF NOT EXISTS idx_feedback_eval_agent ON public.agricultural_feedback_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_feedback_eval_domain ON public.agricultural_feedback_evaluations(domain);
CREATE INDEX IF NOT EXISTS idx_feedback_eval_status ON public.agricultural_feedback_evaluations(evaluation_status);
CREATE INDEX IF NOT EXISTS idx_feedback_eval_usefulness ON public.agricultural_feedback_evaluations(usefulness_rating);
CREATE INDEX IF NOT EXISTS idx_feedback_eval_timeliness ON public.agricultural_feedback_evaluations(timeliness);
CREATE INDEX IF NOT EXISTS idx_feedback_eval_evaluated_at ON public.agricultural_feedback_evaluations(evaluated_at DESC);

-- Trigger: Immutability for Feedback Evaluations
CREATE OR REPLACE FUNCTION public.fn_prevent_feedback_evaluation_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'agricultural_feedback_evaluations records are append-only and cannot be updated.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_feedback_evaluation_update ON public.agricultural_feedback_evaluations;
CREATE TRIGGER trg_prevent_feedback_evaluation_update
  BEFORE UPDATE ON public.agricultural_feedback_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_feedback_evaluation_update();

-- ------------------------------------------------------------------------------
-- 4. AGRICULTURAL LEARNING SIGNALS (Structured Evidence for Future Intelligence)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_learning_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID REFERENCES public.agricultural_feedback_evaluations(id) ON DELETE SET NULL,
  agent_id VARCHAR(50) NOT NULL REFERENCES public.agricultural_intelligence_agents(id) ON DELETE RESTRICT,
  domain VARCHAR(50) NOT NULL,
  signal_type VARCHAR(60) NOT NULL CHECK (
    signal_type IN (
      'RECOMMENDATION_SUCCESS_RATE',
      'FALSE_POSITIVE_SIGNAL',
      'FALSE_NEGATIVE_SIGNAL',
      'PREDICTION_ERROR',
      'DEMAND_FORECAST_ERROR',
      'SUPPLY_MATCH_EFFECTIVENESS',
      'PROCUREMENT_MATCH_EFFECTIVENESS',
      'LOGISTICS_PREDICTION_ERROR',
      'CONFIDENCE_CALIBRATION_SIGNAL',
      'DATA_QUALITY_ISSUE'
    )
  ),
  commodity VARCHAR(100),
  state VARCHAR(50),
  lga VARCHAR(50),
  sample_size INT NOT NULL DEFAULT 1 CHECK (sample_size >= 1),
  metric_value NUMERIC(10, 4),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.000 AND 1.000),
  interpretation TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_learning_signals_anti_pork CHECK (
    (commodity IS NULL OR commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (interpretation !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_learning_signals_agent ON public.agricultural_learning_signals(agent_id);
CREATE INDEX IF NOT EXISTS idx_learning_signals_domain ON public.agricultural_learning_signals(domain);
CREATE INDEX IF NOT EXISTS idx_learning_signals_type ON public.agricultural_learning_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_learning_signals_commodity ON public.agricultural_learning_signals(commodity);
CREATE INDEX IF NOT EXISTS idx_learning_signals_state ON public.agricultural_learning_signals(state);
CREATE INDEX IF NOT EXISTS idx_learning_signals_generated ON public.agricultural_learning_signals(generated_at DESC);

-- Trigger: Immutability for Learning Signals
CREATE OR REPLACE FUNCTION public.fn_prevent_learning_signal_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'agricultural_learning_signals records are append-only and cannot be updated.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_learning_signal_update ON public.agricultural_learning_signals;
CREATE TRIGGER trg_prevent_learning_signal_update
  BEFORE UPDATE ON public.agricultural_learning_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_learning_signal_update();

-- ------------------------------------------------------------------------------
-- 5. AGRICULTURAL DATA QUALITY ISSUES (Upstream Anomaly & Flaw Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_data_quality_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type VARCHAR(60) NOT NULL CHECK (
    issue_type IN (
      'STALE_OBSERVATION',
      'CONFLICTING_OBSERVATION',
      'MISSING_SOURCE_PROVENANCE',
      'INSUFFICIENT_SAMPLE_SIZE',
      'INCONSISTENT_UNITS',
      'REGIONAL_DATA_GAPS',
      'DUPLICATE_OBSERVATIONS',
      'SUSPICIOUS_VALUES',
      'INSUFFICIENT_INDEPENDENT_SOURCES'
    )
  ),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  domain VARCHAR(50) NOT NULL,
  commodity VARCHAR(100),
  state VARCHAR(50),
  lga VARCHAR(50),
  affected_entity_type VARCHAR(60) NOT NULL,
  affected_entity_id VARCHAR(100),
  description TEXT NOT NULL,
  evidence_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (
    status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')
  ),
  resolution_notes TEXT,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_data_quality_issues_anti_pork CHECK (
    (commodity IS NULL OR commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (description !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (resolution_notes IS NULL OR resolution_notes !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_data_quality_type ON public.agricultural_data_quality_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_data_quality_severity ON public.agricultural_data_quality_issues(severity);
CREATE INDEX IF NOT EXISTS idx_data_quality_domain ON public.agricultural_data_quality_issues(domain);
CREATE INDEX IF NOT EXISTS idx_data_quality_status ON public.agricultural_data_quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_data_quality_commodity ON public.agricultural_data_quality_issues(commodity);
CREATE INDEX IF NOT EXISTS idx_data_quality_state ON public.agricultural_data_quality_issues(state);
CREATE INDEX IF NOT EXISTS idx_data_quality_created ON public.agricultural_data_quality_issues(created_at DESC);

-- Trigger: Updated_at for Data Quality Issues
CREATE TRIGGER set_agricultural_data_quality_issues_updated_at
  BEFORE UPDATE ON public.agricultural_data_quality_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_outcome_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_feedback_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_learning_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_data_quality_issues ENABLE ROW LEVEL SECURITY;

-- 6.1 Outcome Evidence
DROP POLICY IF EXISTS "Public and authenticated read outcome evidence" ON public.agricultural_outcome_evidence;
CREATE POLICY "Public and authenticated read outcome evidence"
  ON public.agricultural_outcome_evidence
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users create outcome evidence" ON public.agricultural_outcome_evidence;
CREATE POLICY "Authenticated users create outcome evidence"
  ON public.agricultural_outcome_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by OR public.is_admin()
  );

-- 6.2 Feedback Evaluations
DROP POLICY IF EXISTS "Public and authenticated read feedback evaluations" ON public.agricultural_feedback_evaluations;
CREATE POLICY "Public and authenticated read feedback evaluations"
  ON public.agricultural_feedback_evaluations
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins and authorized services create feedback evaluations" ON public.agricultural_feedback_evaluations;
CREATE POLICY "Admins and authorized services create feedback evaluations"
  ON public.agricultural_feedback_evaluations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = evaluated_by OR public.is_admin()
  );

-- 6.3 Learning Signals
DROP POLICY IF EXISTS "Public and authenticated read learning signals" ON public.agricultural_learning_signals;
CREATE POLICY "Public and authenticated read learning signals"
  ON public.agricultural_learning_signals
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins and services create learning signals" ON public.agricultural_learning_signals;
CREATE POLICY "Admins and services create learning signals"
  ON public.agricultural_learning_signals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() IN ('authenticated', 'service_role') OR public.is_admin()
  );

-- 6.4 Data Quality Issues
DROP POLICY IF EXISTS "Public and authenticated read data quality issues" ON public.agricultural_data_quality_issues;
CREATE POLICY "Public and authenticated read data quality issues"
  ON public.agricultural_data_quality_issues
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users report data quality issues" ON public.agricultural_data_quality_issues;
CREATE POLICY "Authenticated users report data quality issues"
  ON public.agricultural_data_quality_issues
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reported_by OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins update and resolve data quality issues" ON public.agricultural_data_quality_issues;
CREATE POLICY "Admins update and resolve data quality issues"
  ON public.agricultural_data_quality_issues
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
