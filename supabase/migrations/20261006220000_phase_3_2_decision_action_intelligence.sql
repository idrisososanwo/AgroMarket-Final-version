-- ==============================================================================
-- AGROMARKET PHASE 3.2: AGRICULTURAL DECISION & ACTION INTELLIGENCE FOUNDATION
-- Schema for Decision Context, Recommendation Governance, User Decisions,
-- Action Tracking, Linkage to Outcomes, User Preferences, RLS, and Anti-Pork
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND AGRICULTURAL ORCHESTRATION RECOMMENDATIONS
-- ------------------------------------------------------------------------------
-- Expand status to support EXPIRED in recommendation lifecycle
ALTER TABLE public.agricultural_orchestration_recommendations
  DROP CONSTRAINT IF EXISTS agricultural_orchestration_recommendations_status_check;

ALTER TABLE public.agricultural_orchestration_recommendations
  ADD CONSTRAINT agricultural_orchestration_recommendations_status_check
  CHECK (
    status IN ('PROPOSED', 'REVIEWED', 'ACCEPTED', 'REJECTED', 'ACTIONED', 'COMPLETED', 'EXPIRED')
  );

-- Add decision and targeting metadata columns
ALTER TABLE public.agricultural_orchestration_recommendations
  ADD COLUMN IF NOT EXISTS recommendation_type VARCHAR(60) DEFAULT 'MONITOR',
  ADD COLUMN IF NOT EXISTS affected_actor VARCHAR(40) DEFAULT 'FARMER',
  ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) DEFAULT 'MEDIUM'
    CHECK (urgency IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  ADD COLUMN IF NOT EXISTS rationale TEXT,
  ADD COLUMN IF NOT EXISTS limitations TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Anti-pork check on rationale and limitations if present
ALTER TABLE public.agricultural_orchestration_recommendations
  DROP CONSTRAINT IF EXISTS agricultural_orchestration_recommendations_anti_pork_ext;

ALTER TABLE public.agricultural_orchestration_recommendations
  ADD CONSTRAINT agricultural_orchestration_recommendations_anti_pork_ext CHECK (
    (rationale IS NULL OR rationale !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (limitations IS NULL OR limitations !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  );

-- ------------------------------------------------------------------------------
-- 2. USER INTELLIGENCE PREFERENCES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_intelligence_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  primary_role VARCHAR(40) NOT NULL DEFAULT 'FARMER' CHECK (
    primary_role IN (
      'FARMER', 'BUYER', 'BUSINESS', 'SERVICE_PROVIDER',
      'EQUIPMENT_OWNER', 'EXPERT', 'ADMIN', 'JOB_SEEKER'
    )
  ),
  preferred_states TEXT[] NOT NULL DEFAULT '{}',
  preferred_lgas TEXT[] NOT NULL DEFAULT '{}',
  monitored_commodities TEXT[] NOT NULL DEFAULT '{}',
  urgency_threshold VARCHAR(20) NOT NULL DEFAULT 'LOW' CHECK (
    urgency_threshold IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
  ),
  min_confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.500 CHECK (
    min_confidence BETWEEN 0.000 AND 1.000
  ),
  notification_channels TEXT[] NOT NULL DEFAULT ARRAY['IN_APP'],
  digest_frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY' CHECK (
    digest_frequency IN ('REALTIME', 'DAILY', 'WEEKLY', 'MUTED')
  ),
  muted_recommendation_types TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant on monitored commodities
  CONSTRAINT user_intelligence_preferences_anti_pork CHECK (
    NOT (monitored_commodities::text ~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_user_intel_pref_user ON public.user_intelligence_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_intel_pref_role ON public.user_intelligence_preferences(primary_role);

-- ------------------------------------------------------------------------------
-- 3. AGRICULTURAL DECISIONS TABLE (User Decision Record)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.agricultural_orchestration_recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision VARCHAR(40) NOT NULL CHECK (
    decision IN (
      'ACCEPT',
      'REJECT',
      'DISMISS',
      'DEFER',
      'SAVE',
      'REQUEST_MORE_INFORMATION',
      'SEEK_EXPERT',
      'TAKE_EXTERNAL_ACTION'
    )
  ),
  actor_role VARCHAR(40) NOT NULL,
  decision_notes TEXT,
  reasoning TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_decisions_anti_pork CHECK (
    (decision_notes IS NULL OR decision_notes !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (reasoning IS NULL OR reasoning !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_agri_decisions_user ON public.agricultural_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_agri_decisions_rec ON public.agricultural_decisions(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_agri_decisions_type ON public.agricultural_decisions(decision);
CREATE INDEX IF NOT EXISTS idx_agri_decisions_decided_at ON public.agricultural_decisions(decided_at DESC);

-- ------------------------------------------------------------------------------
-- 4. AGRICULTURAL ACTIONS TABLE (Governed Action Record)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES public.agricultural_decisions(id) ON DELETE SET NULL,
  recommendation_id UUID NOT NULL REFERENCES public.agricultural_orchestration_recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (
    action_type IN (
      'VIEWED',
      'SAVED',
      'CONTACTED_PROVIDER',
      'REQUESTED_SERVICE',
      'JOINED_AGGREGATION',
      'CREATED_B2B_DEMAND',
      'CREATED_LISTING',
      'STARTED_PROCUREMENT',
      'REVIEWED_LOGISTICS',
      'SOUGHT_EXPERT_ADVICE',
      'USER_REPORTED_EXTERNAL_ACTION',
      'OTHER'
    )
  ),
  action_path VARCHAR(255),
  is_external BOOLEAN NOT NULL DEFAULT false,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED' CHECK (
    verification_status IN ('VERIFIED_PLATFORM', 'USER_REPORTED', 'PENDING_VERIFICATION')
  ),
  action_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_actions_anti_pork CHECK (
    (notes IS NULL OR notes !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_agri_actions_user ON public.agricultural_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_agri_actions_decision ON public.agricultural_actions(decision_id);
CREATE INDEX IF NOT EXISTS idx_agri_actions_rec ON public.agricultural_actions(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_agri_actions_type ON public.agricultural_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_agri_actions_executed_at ON public.agricultural_actions(executed_at DESC);

-- ------------------------------------------------------------------------------
-- 5. DECISION-ACTION LINKS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decision_action_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.agricultural_decisions(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.agricultural_actions(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_decision_action UNIQUE (decision_id, action_id)
);

CREATE INDEX IF NOT EXISTS idx_decision_action_links_dec ON public.decision_action_links(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_action_links_act ON public.decision_action_links(action_id);

-- ------------------------------------------------------------------------------
-- 6. EXTEND NOTIFICATIONS TABLE (Governed Intelligence Alerts)
-- ------------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'INFO',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_intelligence_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_action_links ENABLE ROW LEVEL SECURITY;

-- Preferences: Users manage their own preferences; admins can view
DROP POLICY IF EXISTS "Users manage their own intelligence preferences" ON public.user_intelligence_preferences;
CREATE POLICY "Users manage their own intelligence preferences"
  ON public.user_intelligence_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Decisions: Users can view and insert their own decisions; admins can view all
DROP POLICY IF EXISTS "Users view their own decisions" ON public.agricultural_decisions;
CREATE POLICY "Users view their own decisions"
  ON public.agricultural_decisions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users create their own decisions" ON public.agricultural_decisions;
CREATE POLICY "Users create their own decisions"
  ON public.agricultural_decisions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their own decisions" ON public.agricultural_decisions;
CREATE POLICY "Users update their own decisions"
  ON public.agricultural_decisions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Actions: Users can view and insert their own actions; admins can view all
DROP POLICY IF EXISTS "Users view their own actions" ON public.agricultural_actions;
CREATE POLICY "Users view their own actions"
  ON public.agricultural_actions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users create their own actions" ON public.agricultural_actions;
CREATE POLICY "Users create their own actions"
  ON public.agricultural_actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Decision-Action Links: Users can view and manage links for their decisions
DROP POLICY IF EXISTS "Users view their decision-action links" ON public.decision_action_links;
CREATE POLICY "Users view their decision-action links"
  ON public.decision_action_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agricultural_decisions d
      WHERE d.id = decision_id AND (d.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users create decision-action links" ON public.decision_action_links;
CREATE POLICY "Users create decision-action links"
  ON public.decision_action_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agricultural_decisions d
      WHERE d.id = decision_id AND d.user_id = auth.uid()
    )
  );
