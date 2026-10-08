-- ==============================================================================
-- AGROMARKET PHASE 3.8: AUTONOMOUS INTELLIGENCE GUARDRAILS & HUMAN OVERSIGHT
-- Schema for Governance Evaluations, Human Approvals, Governance Overrides,
-- Immutable Audit Trails, Performance Indexes, Anti-Pork Constraints, and RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AGRICULTURAL GOVERNANCE EVALUATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_governance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES public.agricultural_orchestration_recommendations(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES public.agricultural_scenarios(id) ON DELETE SET NULL,
  agent_id VARCHAR(80) NOT NULL,
  domain VARCHAR(60) NOT NULL,
  action_intent VARCHAR(80) NOT NULL,
  actor_role VARCHAR(40) NOT NULL,
  risk_level VARCHAR(20) NOT NULL CHECK (
    risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')
  ),
  autonomy_level VARCHAR(40) NOT NULL CHECK (
    autonomy_level IN (
      'OBSERVE_ONLY',
      'ANALYZE_ONLY',
      'RECOMMEND',
      'REQUIRE_HUMAN_REVIEW',
      'REQUIRE_HUMAN_APPROVAL',
      'REQUIRE_AUTHORITY_APPROVAL',
      'PROHIBITED'
    )
  ),
  decision VARCHAR(40) NOT NULL CHECK (
    decision IN (
      'ALLOW',
      'ALLOW_WITH_REVIEW',
      'REQUIRE_HUMAN_APPROVAL',
      'REQUIRE_PROFESSIONAL_REVIEW',
      'REQUIRE_AUTHORITY_REVIEW',
      'DENY',
      'INSUFFICIENT_DATA'
    )
  ),
  required_review_level VARCHAR(40) NOT NULL CHECK (
    required_review_level IN (
      'NO_REVIEW_REQUIRED',
      'PLATFORM_REVIEW',
      'HUMAN_APPROVAL',
      'PROFESSIONAL_REVIEW',
      'AUTHORITY_REVIEW'
    )
  ),
  reasons TEXT[] NOT NULL DEFAULT '{}',
  policy_version VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
  is_prohibited_action BOOLEAN NOT NULL DEFAULT false,
  evidence_count INT NOT NULL DEFAULT 0,
  confidence_score NUMERIC(4, 3) NOT NULL DEFAULT 0.000 CHECK (
    confidence_score BETWEEN 0.000 AND 1.000
  ),
  context_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Zero-Tolerance Invariant
  CONSTRAINT agricultural_governance_evaluations_anti_pork CHECK (
    NOT (context_metadata::text ~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_agri_gov_eval_rec ON public.agricultural_governance_evaluations(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_agri_gov_eval_agent ON public.agricultural_governance_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agri_gov_eval_intent ON public.agricultural_governance_evaluations(action_intent);
CREATE INDEX IF NOT EXISTS idx_agri_gov_eval_decision ON public.agricultural_governance_evaluations(decision);
CREATE INDEX IF NOT EXISTS idx_agri_gov_eval_risk ON public.agricultural_governance_evaluations(risk_level);
CREATE INDEX IF NOT EXISTS idx_agri_gov_eval_created ON public.agricultural_governance_evaluations(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. AGRICULTURAL HUMAN APPROVALS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_human_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID REFERENCES public.agricultural_governance_evaluations(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES public.agricultural_orchestration_recommendations(id) ON DELETE CASCADE,
  action_intent VARCHAR(80) NOT NULL,
  approver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approver_role VARCHAR(40) NOT NULL,
  approval_type VARCHAR(40) NOT NULL CHECK (
    approval_type IN (
      'USER_APPROVAL',
      'PLATFORM_REVIEW',
      'PROFESSIONAL_REVIEW',
      'AUTHORITY_REVIEW'
    )
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'APPROVED' CHECK (
    status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED', 'SUPERSEDED')
  ),
  justification TEXT NOT NULL,
  evidence_references TEXT[] NOT NULL DEFAULT '{}',
  policy_version VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  superseded_by_id UUID REFERENCES public.agricultural_human_approvals(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant on Justification and Metadata
  CONSTRAINT agricultural_human_approvals_anti_pork CHECK (
    (justification !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (revocation_reason IS NULL OR revocation_reason !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (NOT (metadata::text ~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b'))
  )
);

CREATE INDEX IF NOT EXISTS idx_agri_human_appr_eval ON public.agricultural_human_approvals(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_agri_human_appr_rec ON public.agricultural_human_approvals(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_agri_human_appr_approver ON public.agricultural_human_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_agri_human_appr_status ON public.agricultural_human_approvals(status);
CREATE INDEX IF NOT EXISTS idx_agri_human_appr_expires ON public.agricultural_human_approvals(expires_at);

-- ------------------------------------------------------------------------------
-- 3. AGRICULTURAL GOVERNANCE OVERRIDES TABLE (Audited Administrative Overrides)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_governance_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES public.agricultural_governance_evaluations(id) ON DELETE CASCADE,
  override_by_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  override_role VARCHAR(40) NOT NULL CHECK (
    override_role IN ('ADMIN', 'PLATFORM_COORDINATOR')
  ),
  original_decision VARCHAR(40) NOT NULL,
  override_decision VARCHAR(40) NOT NULL CHECK (
    override_decision IN ('ALLOW_WITH_OVERRIDE', 'REQUIRE_EXTERNAL_VERIFICATION')
  ),
  reason TEXT NOT NULL,
  policy_version VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
  overridden_policy_rules TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_governance_overrides_anti_pork CHECK (
    (reason !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (NOT (metadata::text ~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b'))
  )
);

CREATE INDEX IF NOT EXISTS idx_agri_gov_overrides_eval ON public.agricultural_governance_overrides(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_agri_gov_overrides_user ON public.agricultural_governance_overrides(override_by_id);
CREATE INDEX IF NOT EXISTS idx_agri_gov_overrides_created ON public.agricultural_governance_overrides(created_at DESC);

-- Immutability trigger on overrides: overrides are append-only and cannot be updated or deleted
CREATE OR REPLACE FUNCTION public.fn_prevent_governance_override_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Agricultural governance overrides are immutable and append-only.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_governance_override_mutation ON public.agricultural_governance_overrides;
CREATE TRIGGER trg_prevent_governance_override_mutation
  BEFORE UPDATE OR DELETE ON public.agricultural_governance_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_governance_override_mutation();

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_governance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_human_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_governance_overrides ENABLE ROW LEVEL SECURITY;

-- 4.1 Evaluations RLS
DROP POLICY IF EXISTS "Authenticated users view governance evaluations" ON public.agricultural_governance_evaluations;
CREATE POLICY "Authenticated users view governance evaluations"
  ON public.agricultural_governance_evaluations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role creates governance evaluations" ON public.agricultural_governance_evaluations;
CREATE POLICY "Service role creates governance evaluations"
  ON public.agricultural_governance_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);

-- 4.2 Approvals RLS
DROP POLICY IF EXISTS "Users view their own approvals or admins view all" ON public.agricultural_human_approvals;
CREATE POLICY "Users view their own approvals or admins view all"
  ON public.agricultural_human_approvals FOR SELECT
  TO authenticated
  USING (auth.uid() = approver_id OR public.is_admin());

DROP POLICY IF EXISTS "Users create approvals" ON public.agricultural_human_approvals;
CREATE POLICY "Users create approvals"
  ON public.agricultural_human_approvals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = approver_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins or approver can update approval status" ON public.agricultural_human_approvals;
CREATE POLICY "Admins or approver can update approval status"
  ON public.agricultural_human_approvals FOR UPDATE
  TO authenticated
  USING (auth.uid() = approver_id OR public.is_admin())
  WITH CHECK (auth.uid() = approver_id OR public.is_admin());

-- 4.3 Overrides RLS (Restricted to Admins)
DROP POLICY IF EXISTS "Only admins view governance overrides" ON public.agricultural_governance_overrides;
CREATE POLICY "Only admins view governance overrides"
  ON public.agricultural_governance_overrides FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins insert governance overrides" ON public.agricultural_governance_overrides;
CREATE POLICY "Only admins insert governance overrides"
  ON public.agricultural_governance_overrides FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. GRANTS
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.agricultural_governance_evaluations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.agricultural_human_approvals TO authenticated, service_role;
GRANT SELECT, INSERT ON public.agricultural_governance_overrides TO authenticated, service_role;
