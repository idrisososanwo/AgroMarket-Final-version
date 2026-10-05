-- ==============================================================================
-- AGROMARKET PHASE 2.2: AI & AGENT REASONING FOUNDATION
-- Schema for AI Reasoning Runs, Outputs, Audits, Constraints, Immutability, and RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AI REASONING RUNS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_reasoning_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL REFERENCES public.agricultural_intelligence_agents(id) ON DELETE RESTRICT,
  objective VARCHAR(100) NOT NULL CHECK (
    objective IN (
      'MARKET_INTERPRETATION',
      'SUPPLY_DEMAND_ANALYSIS',
      'FOOD_SECURITY_ASSESSMENT',
      'LOGISTICS_IMPACT_ASSESSMENT',
      'SECURITY_IMPACT_ASSESSMENT',
      'PRODUCTION_SIGNAL_INTERPRETATION',
      'PROCESSING_BOTTLENECK_ANALYSIS',
      'GENERAL_AGRICULTURAL_INTELLIGENCE'
    )
  ),
  commodity VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  corridor VARCHAR(100),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  latency_ms INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (
    status IN (
      'PENDING',
      'COMPLETED',
      'FAILED',
      'REJECTED_SAFETY',
      'REJECTED_VALIDATION',
      'PROVIDER_UNAVAILABLE'
    )
  ),
  error_message TEXT,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_ai_reasoning_runs CHECK (
    commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_reasoning_runs_agent ON public.ai_reasoning_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_reasoning_runs_objective ON public.ai_reasoning_runs(objective);
CREATE INDEX IF NOT EXISTS idx_ai_reasoning_runs_commodity ON public.ai_reasoning_runs(commodity);
CREATE INDEX IF NOT EXISTS idx_ai_reasoning_runs_state ON public.ai_reasoning_runs(state, lga);
CREATE INDEX IF NOT EXISTS idx_ai_reasoning_runs_status ON public.ai_reasoning_runs(status);
CREATE INDEX IF NOT EXISTS idx_ai_reasoning_runs_created ON public.ai_reasoning_runs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. AI REASONING OUTPUTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_reasoning_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ai_reasoning_runs(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  interpretation TEXT NOT NULL,
  key_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  supporting_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  uncertainty TEXT NOT NULL,
  model_confidence NUMERIC(4, 3) NOT NULL CHECK (model_confidence BETWEEN 0.0 AND 1.0),
  evidence_confidence NUMERIC(4, 3) NOT NULL CHECK (evidence_confidence BETWEEN 0.0 AND 1.0),
  recommendation_title VARCHAR(255),
  recommendation_text TEXT,
  expected_impact JSONB NOT NULL DEFAULT '{}'::jsonb,
  affected_actors TEXT[] NOT NULL DEFAULT '{}',
  affected_commodities TEXT[] NOT NULL DEFAULT '{}',
  affected_locations TEXT[] NOT NULL DEFAULT '{}',
  limitations TEXT[] NOT NULL DEFAULT '{}',
  safety_notes TEXT[] NOT NULL DEFAULT '{}',
  generated_recommendation_id UUID REFERENCES public.agricultural_intelligence_recommendations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_ai_reasoning_outputs CHECK (
    summary !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
    AND interpretation !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
    AND (recommendation_title IS NULL OR recommendation_title !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
    AND (recommendation_text IS NULL OR recommendation_text !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_reasoning_outputs_run ON public.ai_reasoning_outputs(run_id);
CREATE INDEX IF NOT EXISTS idx_ai_reasoning_outputs_rec ON public.ai_reasoning_outputs(generated_recommendation_id);

-- ------------------------------------------------------------------------------
-- 3. AI REASONING AUDITS (Strictly Append-Only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_reasoning_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ai_reasoning_runs(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN (
      'REQUEST_INITIATED',
      'PRE_CHECK_PASSED',
      'PRE_CHECK_FAILED',
      'GATEWAY_DISPATCH',
      'PROVIDER_RESPONSE',
      'POST_CHECK_PASSED',
      'POST_CHECK_FAILED',
      'RECOMMENDATION_PROPOSED',
      'FAILURE_CAPTURED'
    )
  ),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_audits_run ON public.ai_reasoning_audits(run_id);
CREATE INDEX IF NOT EXISTS idx_ai_audits_event ON public.ai_reasoning_audits(event_type, created_at DESC);

-- Immutability trigger for AI Reasoning Audits
CREATE OR REPLACE FUNCTION public.prevent_ai_reasoning_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'AI reasoning audit entries are strictly immutable. Updates are forbidden.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'AI reasoning audit entries are append-only. Only system administrators may purge audit records.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_ai_reasoning_audit_immutability
  BEFORE UPDATE OR DELETE ON public.ai_reasoning_audits
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ai_reasoning_audit_mutation();

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.ai_reasoning_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reasoning_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_reasoning_audits ENABLE ROW LEVEL SECURITY;

-- 4.1 ai_reasoning_runs RLS
CREATE POLICY "Admins have full access to ai_reasoning_runs"
  ON public.ai_reasoning_runs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own reasoning runs or view public runs"
  ON public.ai_reasoning_runs
  FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "Authenticated users can initiate reasoning runs"
  ON public.ai_reasoning_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    OR requested_by IS NULL
    OR public.is_admin()
  );

-- 4.2 ai_reasoning_outputs RLS
CREATE POLICY "Admins have full access to ai_reasoning_outputs"
  ON public.ai_reasoning_outputs
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view outputs of runs they have access to"
  ON public.ai_reasoning_outputs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_reasoning_runs r
      WHERE r.id = ai_reasoning_outputs.run_id
      AND (r.requested_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Authenticated services/users can insert ai_reasoning_outputs"
  ON public.ai_reasoning_outputs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_reasoning_runs r
      WHERE r.id = ai_reasoning_outputs.run_id
      AND (r.requested_by = auth.uid() OR public.is_admin())
    )
  );

-- 4.3 ai_reasoning_audits RLS
CREATE POLICY "Admins have full access to ai_reasoning_audits"
  ON public.ai_reasoning_audits
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view audits of runs they requested"
  ON public.ai_reasoning_audits
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_reasoning_runs r
      WHERE r.id = ai_reasoning_audits.run_id
      AND (r.requested_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Authenticated users can insert audit records"
  ON public.ai_reasoning_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    OR actor_id IS NULL
    OR public.is_admin()
  );
