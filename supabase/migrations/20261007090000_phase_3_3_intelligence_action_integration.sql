-- ==============================================================================
-- AGROMARKET PHASE 3.3: AGRICULTURAL INTELLIGENCE ACTION INTEGRATION
-- Schema for Action Integration Layer, Linkage between Recommendations/Decisions
-- and Real AgroMarket Product Capabilities, Real-Time Revalidation, and Audit
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AGRICULTURAL ACTION INTEGRATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_action_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES public.agricultural_orchestration_recommendations(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES public.agricultural_decisions(id) ON DELETE SET NULL,
  action_id UUID REFERENCES public.agricultural_actions(id) ON DELETE SET NULL,
  action_intent VARCHAR(80) NOT NULL,
  destination_type VARCHAR(60) NOT NULL,
  destination_url VARCHAR(500) NOT NULL,
  context_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(40) NOT NULL DEFAULT 'NOT_STARTED' CHECK (
    status IN (
      'NOT_STARTED',
      'VIEWED',
      'ACTION_INITIATED',
      'ACTION_COMPLETED',
      'ACTION_CANCELLED',
      'ACTION_FAILED',
      'EXPIRED',
      'UNKNOWN'
    )
  ),
  revalidation_status VARCHAR(40) NOT NULL DEFAULT 'PENDING' CHECK (
    revalidation_status IN ('PENDING', 'VALID', 'STALE', 'UNAVAILABLE', 'FAILED')
  ),
  revalidation_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  revalidated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Zero-Tolerance Invariant
  CONSTRAINT agricultural_action_integrations_anti_pork CHECK (
    NOT (context_payload::text ~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

-- Indexing for high-performance governed querying
CREATE INDEX IF NOT EXISTS idx_agri_act_int_user ON public.agricultural_action_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_agri_act_int_rec ON public.agricultural_action_integrations(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_agri_act_int_dec ON public.agricultural_action_integrations(decision_id);
CREATE INDEX IF NOT EXISTS idx_agri_act_int_act ON public.agricultural_action_integrations(action_id);
CREATE INDEX IF NOT EXISTS idx_agri_act_int_status ON public.agricultural_action_integrations(status);
CREATE INDEX IF NOT EXISTS idx_agri_act_int_intent ON public.agricultural_action_integrations(action_intent);
CREATE INDEX IF NOT EXISTS idx_agri_act_int_dest ON public.agricultural_action_integrations(destination_type);
CREATE INDEX IF NOT EXISTS idx_agri_act_int_created ON public.agricultural_action_integrations(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_action_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own action integrations" ON public.agricultural_action_integrations;
CREATE POLICY "Users view their own action integrations"
  ON public.agricultural_action_integrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users create their own action integrations" ON public.agricultural_action_integrations;
CREATE POLICY "Users create their own action integrations"
  ON public.agricultural_action_integrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their own action integrations" ON public.agricultural_action_integrations;
CREATE POLICY "Users update their own action integrations"
  ON public.agricultural_action_integrations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
