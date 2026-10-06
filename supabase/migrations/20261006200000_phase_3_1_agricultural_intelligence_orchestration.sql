-- ==============================================================================
-- AGROMARKET PHASE 3.1: AGRICULTURAL INTELLIGENCE ORCHESTRATION & CROSS-DOMAIN DECISION ENGINE
-- Schema for Multi-Agent Coordination, Normalized Agent Outputs, Scenario Detection,
-- Conflict Resolution, Deterministic Priority Scoring, Governed Recommendations,
-- Outcome Linkage, RLS, Append-Only Snapshot Immutability, and Anti-Pork Invariants
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTER AGRICULTURAL INTELLIGENCE ORCHESTRATOR IN REGISTRY
-- ------------------------------------------------------------------------------
INSERT INTO public.agricultural_intelligence_agents (
  id,
  name,
  version,
  description,
  capabilities,
  status,
  metadata
)
VALUES
  (
    'AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR',
    'Agricultural Intelligence Orchestrator & Cross-Domain Decision Engine',
    '1.0.0',
    'Cross-domain orchestration layer coordinating specialized domain agents (Market, Production, Demand, Supply Matching, Procurement, Food Security, Logistics, Biosecurity). Correlates signals, evaluates systemic priorities, resolves conflicts, and generates advisory human-reviewed recommendations.',
    ARRAY[
      'CROSS_DOMAIN_CORRELATION',
      'SCENARIO_DETECTION',
      'INTELLIGENCE_CONFLICT_DETECTION',
      'DETERMINISTIC_PRIORITY_SCORING',
      'SAME_SOURCE_DEDUPLICATION',
      'CONFIDENCE_CALIBRATION',
      'CROSS_DOMAIN_RECOMMENDATION_SYNTHESIS',
      'HUMAN_IN_THE_LOOP_GOVERNANCE',
      'OUTCOME_LINKAGE_AND_EVALUATION'
    ],
    'ACTIVE',
    '{"role": "ORCHESTRATION_LAYER", "indicator_type": "CROSS_DOMAIN_DECISION_ENGINE", "supported_domains": ["MARKET", "PRODUCTION", "DEMAND", "SUPPLY", "PROCUREMENT", "FOOD_SECURITY", "LOGISTICS", "DISEASE_BIOSECURITY"]}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  status = 'ACTIVE',
  metadata = EXCLUDED.metadata,
  updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 2. EXPAND AGRICULTURAL RECOMMENDATIONS OBJECTIVE CHECK CONSTRAINT
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_intelligence_recommendations
  DROP CONSTRAINT IF EXISTS agricultural_intelligence_recommendations_objective_check;

ALTER TABLE public.agricultural_intelligence_recommendations
  ADD CONSTRAINT agricultural_intelligence_recommendations_objective_check
  CHECK (
    objective IN (
      'STABILIZE_SUPPLY',
      'PREVENT_SPOILAGE',
      'OPTIMIZE_PRICING',
      'REROUTE_LOGISTICS',
      'RISK_MITIGATION',
      'FACILITY_OFFTAKE',
      'DEMAND_FULFILLMENT',
      'SECURITY_ADVISORY',
      'SUPPLY_COORDINATION',
      'AGGREGATION_COORDINATION',
      'PROCESSING_COORDINATION',
      'PROCUREMENT_COORDINATION',
      'PROCUREMENT_STRATEGY',
      'SUPPLIER_DIVERSIFICATION',
      'PROCUREMENT_RISK',
      'B2B_PROCUREMENT',
      'FOOD_SECURITY_INTERVENTION',
      'RESILIENCE_STRENGTHENING',
      'CORRIDOR_PROTECTION',
      'SUPPLY_RESERVE_RELEASE',
      'CRITICAL_DEPENDENCY_MITIGATION',
      'DIRECT_MOVEMENT',
      'MULTI_PROVIDER_MOVEMENT',
      'ALTERNATIVE_CORRIDOR_REVIEW',
      'REGIONAL_SOURCE_ALTERNATIVE',
      'PROCESSING_LOCATION_REVIEW',
      'LOGISTICS_BOTTLENECK_INVESTIGATION',
      'CORRIDOR_CAPACITY_STRENGTHENING',
      'BIOSECURITY_ISOLATION_ADVISORY',
      'VETERINARY_CONSULTATION_REFERRAL',
      'MOVEMENT_HEALTH_CAUTION',
      'REGIONAL_SOURCE_DIVERSIFICATION',
      'FEED_WATER_QUALITY_INSPECTION',
      'HARVEST_QUARANTINE_MONITORING',
      'DISEASE_SURVEILLANCE_VERIFICATION',
      'CROSS_DOMAIN_ORCHESTRATION',
      'MULTI_DOMAIN_RISK_MITIGATION',
      'SUPPLY_SHORTAGE_RESPONSE',
      'DISEASE_SUPPLY_HEDGING',
      'LOGISTICS_CONSTRAINED_REROUTING',
      'PROCUREMENT_RISK_DIVERSIFICATION'
    )
  );

-- ------------------------------------------------------------------------------
-- 3. AGRICULTURAL ORCHESTRATION SNAPSHOTS (Append-Only Analytical Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_orchestration_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_type VARCHAR(60) NOT NULL CHECK (
    scenario_type IN (
      'SUPPLY_SHORTAGE_SCENARIO',
      'DISEASE_SUPPLY_RISK_SCENARIO',
      'LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO',
      'PROCUREMENT_RISK_SCENARIO',
      'FOOD_SECURITY_PRESSURE_SCENARIO',
      'MULTI_DOMAIN_RISK_SCENARIO',
      'BALANCED_NOMINAL_SCENARIO'
    )
  ),
  priority_score NUMERIC(5, 2) NOT NULL CHECK (priority_score BETWEEN 0.0 AND 100.0),
  priority_level VARCHAR(20) NOT NULL CHECK (
    priority_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')
  ),
  orchestration_confidence NUMERIC(4, 3) NOT NULL CHECK (orchestration_confidence BETWEEN 0.000 AND 1.000),
  domain_score NUMERIC(5, 2) NOT NULL CHECK (domain_score BETWEEN 0.0 AND 100.0),
  evidence_confidence NUMERIC(4, 3) NOT NULL CHECK (evidence_confidence BETWEEN 0.000 AND 1.000),
  geographic_scope VARCHAR(50),
  state VARCHAR(50),
  lga VARCHAR(50),
  geopolitical_zone VARCHAR(50),
  commodity VARCHAR(100),
  commodity_category VARCHAR(50),
  affected_domains TEXT[] NOT NULL DEFAULT '{}',
  contributing_agents TEXT[] NOT NULL DEFAULT '{}',
  contributing_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  scenario_summary TEXT NOT NULL,
  deterministic_findings JSONB NOT NULL DEFAULT '{}'::jsonb,
  conflict_detected BOOLEAN NOT NULL DEFAULT false,
  conflict_details JSONB,
  evidence_summary TEXT NOT NULL,
  component_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_orchestration_snapshots_anti_pork CHECK (
    (commodity IS NULL OR commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (commodity_category IS NULL OR commodity_category !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (scenario_summary !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (evidence_summary !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_orchestration_snapshots_state ON public.agricultural_orchestration_snapshots(state);
CREATE INDEX IF NOT EXISTS idx_orchestration_snapshots_commodity ON public.agricultural_orchestration_snapshots(commodity);
CREATE INDEX IF NOT EXISTS idx_orchestration_snapshots_scenario ON public.agricultural_orchestration_snapshots(scenario_type);
CREATE INDEX IF NOT EXISTS idx_orchestration_snapshots_priority ON public.agricultural_orchestration_snapshots(priority_level);
CREATE INDEX IF NOT EXISTS idx_orchestration_snapshots_generated_at ON public.agricultural_orchestration_snapshots(generated_at DESC);

-- Trigger: Snapshot Immutability (Append-only enforcement)
CREATE OR REPLACE FUNCTION public.fn_prevent_agricultural_orchestration_snapshot_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'agricultural_orchestration_snapshots records are immutable and cannot be updated.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_agricultural_orchestration_snapshot_update ON public.agricultural_orchestration_snapshots;
CREATE TRIGGER trg_prevent_agricultural_orchestration_snapshot_update
  BEFORE UPDATE ON public.agricultural_orchestration_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_agricultural_orchestration_snapshot_update();

-- ------------------------------------------------------------------------------
-- 4. AGRICULTURAL ORCHESTRATION RECOMMENDATIONS TABLE (Governed Synthesis)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_orchestration_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.agricultural_orchestration_snapshots(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  summary TEXT NOT NULL,
  action_path VARCHAR(200) NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (
    priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')
  ),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.000 AND 1.000),
  affected_domains TEXT[] NOT NULL DEFAULT '{}',
  affected_commodities TEXT[] NOT NULL DEFAULT '{}',
  affected_states TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'PROPOSED' CHECK (
    status IN ('PROPOSED', 'REVIEWED', 'ACCEPTED', 'REJECTED', 'ACTIONED', 'COMPLETED')
  ),
  advisory_disclaimer TEXT NOT NULL DEFAULT 'Cross-domain advisory recommendation only. Requires human verification before execution. No autonomous purchasing, movement, or transactions.',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  outcome_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_orchestration_recommendations_anti_pork CHECK (
    (title !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (summary !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_orchestration_recs_status ON public.agricultural_orchestration_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_orchestration_recs_priority ON public.agricultural_orchestration_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_orchestration_recs_created_at ON public.agricultural_orchestration_recommendations(created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. AGRICULTURAL INTELLIGENCE CONFLICTS TABLE (Contradiction Tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_intelligence_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.agricultural_orchestration_snapshots(id) ON DELETE SET NULL,
  conflict_type VARCHAR(60) NOT NULL,
  domain_a VARCHAR(50) NOT NULL,
  domain_b VARCHAR(50) NOT NULL,
  signal_a VARCHAR(80) NOT NULL,
  signal_b VARCHAR(80) NOT NULL,
  state VARCHAR(50),
  lga VARCHAR(50),
  commodity VARCHAR(100),
  severity VARCHAR(20) NOT NULL CHECK (
    severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')
  ),
  explanation TEXT NOT NULL,
  confidence_impact NUMERIC(4, 3) NOT NULL DEFAULT 0.200 CHECK (confidence_impact BETWEEN 0.000 AND 1.000),
  recommended_human_review TEXT NOT NULL,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_intelligence_conflicts_anti_pork CHECK (
    (commodity IS NULL OR commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (explanation !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (recommended_human_review !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_intel_conflicts_status ON public.agricultural_intelligence_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_intel_conflicts_severity ON public.agricultural_intelligence_conflicts(severity);
CREATE INDEX IF NOT EXISTS idx_intel_conflicts_state ON public.agricultural_intelligence_conflicts(state);
CREATE INDEX IF NOT EXISTS idx_intel_conflicts_commodity ON public.agricultural_intelligence_conflicts(commodity);

-- ------------------------------------------------------------------------------
-- 6. AGRICULTURAL ORCHESTRATION OUTCOMES TABLE (Evaluation Loop)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_orchestration_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.agricultural_orchestration_recommendations(id) ON DELETE CASCADE,
  decision VARCHAR(50) NOT NULL,
  action_taken TEXT NOT NULL,
  action_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  observed_outcome TEXT NOT NULL,
  expected_outcome TEXT NOT NULL,
  variance TEXT NOT NULL,
  evaluation_score NUMERIC(5, 2) NOT NULL CHECK (evaluation_score BETWEEN 0.0 AND 100.0),
  lessons_learned TEXT NOT NULL,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_orchestration_outcomes_anti_pork CHECK (
    (action_taken !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (observed_outcome !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (lessons_learned !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_orchestration_outcomes_rec ON public.agricultural_orchestration_outcomes(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_outcomes_created_at ON public.agricultural_orchestration_outcomes(created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_orchestration_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_orchestration_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_intelligence_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_orchestration_outcomes ENABLE ROW LEVEL SECURITY;

-- Snapshots: Public & authenticated can read aggregate snapshots; authenticated service can insert
DROP POLICY IF EXISTS "Public and authenticated read orchestration snapshots" ON public.agricultural_orchestration_snapshots;
CREATE POLICY "Public and authenticated read orchestration snapshots"
  ON public.agricultural_orchestration_snapshots
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert orchestration snapshots" ON public.agricultural_orchestration_snapshots;
CREATE POLICY "System role and authenticated service insert orchestration snapshots"
  ON public.agricultural_orchestration_snapshots
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Recommendations: Public & authenticated can read recommendations; authenticated service can insert/update
DROP POLICY IF EXISTS "Public and authenticated read orchestration recommendations" ON public.agricultural_orchestration_recommendations;
CREATE POLICY "Public and authenticated read orchestration recommendations"
  ON public.agricultural_orchestration_recommendations
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert orchestration recommendations" ON public.agricultural_orchestration_recommendations;
CREATE POLICY "System role and authenticated service insert orchestration recommendations"
  ON public.agricultural_orchestration_recommendations
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Admins and authorized users update orchestration recommendations" ON public.agricultural_orchestration_recommendations;
CREATE POLICY "Admins and authorized users update orchestration recommendations"
  ON public.agricultural_orchestration_recommendations
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Conflicts: Public & authenticated can read conflicts; authenticated service can insert/update
DROP POLICY IF EXISTS "Public and authenticated read intelligence conflicts" ON public.agricultural_intelligence_conflicts;
CREATE POLICY "Public and authenticated read intelligence conflicts"
  ON public.agricultural_intelligence_conflicts
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert intelligence conflicts" ON public.agricultural_intelligence_conflicts;
CREATE POLICY "System role and authenticated service insert intelligence conflicts"
  ON public.agricultural_intelligence_conflicts
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Admins and authorized users update intelligence conflicts" ON public.agricultural_intelligence_conflicts;
CREATE POLICY "Admins and authorized users update intelligence conflicts"
  ON public.agricultural_intelligence_conflicts
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Outcomes: Public & authenticated can read outcomes; authenticated service can insert/update
DROP POLICY IF EXISTS "Public and authenticated read orchestration outcomes" ON public.agricultural_orchestration_outcomes;
CREATE POLICY "Public and authenticated read orchestration outcomes"
  ON public.agricultural_orchestration_outcomes
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert orchestration outcomes" ON public.agricultural_orchestration_outcomes;
CREATE POLICY "System role and authenticated service insert orchestration outcomes"
  ON public.agricultural_orchestration_outcomes
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Admins and authorized users update orchestration outcomes" ON public.agricultural_orchestration_outcomes;
CREATE POLICY "Admins and authorized users update orchestration outcomes"
  ON public.agricultural_orchestration_outcomes
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
