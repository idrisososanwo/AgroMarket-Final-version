-- ==============================================================================
-- AGROMARKET PHASE 2.6: SUPPLY MATCHING & AGRICULTURAL COORDINATION AGENT
-- Schema for Supply Matching Agent Registration, Persistent Matching Snapshots,
-- Candidate Evaluation Records, Coordination Recommendations, Immutability & RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTER SUPPLY MATCHING AGENT IN REGISTRY
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
    'SUPPLY_MATCHING_AGENT',
    'Specialized Supply Matching & Agricultural Coordination Agent',
    '1.0.0',
    'Coordinates deterministic value-chain matching across agricultural supply, offtake demand, processing facilities, and logistics corridors. Evaluates multi-source aggregation, supply gaps, reliability, and security constraints to recommend advisory coordination actions without autonomous execution.',
    ARRAY[
      'SUPPLY_OBSERVATION',
      'UNIT_NORMALIZATION',
      'DETERMINISTIC_MATCHING',
      'MULTI_SOURCE_AGGREGATION',
      'SUPPLY_GAP_ANALYSIS',
      'PROCESSING_COORDINATION',
      'LOGISTICS_CORRIDOR_MATCHING',
      'SECURITY_CONSTRAINT_MONITORING',
      'SUPPLY_RELIABILITY_SCORING',
      'ADVISORY_COORDINATION_RECOMMENDATION'
    ],
    'ACTIVE',
    '{"supported_domains": ["CROPS", "LIVESTOCK", "POULTRY", "AQUACULTURE"], "primary_currency": "NGN"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  status = 'ACTIVE',
  metadata = EXCLUDED.metadata,
  updated_at = timezone('utc'::text, now());

-- Update legacy alias SUPPLY_MATCHING if present
UPDATE public.agricultural_intelligence_agents
SET
  version = '1.0.0',
  description = 'Coordinates deterministic value-chain matching across agricultural supply, offtake demand, processing facilities, and logistics corridors. Evaluates multi-source aggregation, supply gaps, reliability, and security constraints to recommend advisory coordination actions without autonomous execution.',
  capabilities = ARRAY[
    'SUPPLY_OBSERVATION',
    'UNIT_NORMALIZATION',
    'DETERMINISTIC_MATCHING',
    'MULTI_SOURCE_AGGREGATION',
    'SUPPLY_GAP_ANALYSIS',
    'PROCESSING_COORDINATION',
    'LOGISTICS_CORRIDOR_MATCHING',
    'SECURITY_CONSTRAINT_MONITORING',
    'SUPPLY_RELIABILITY_SCORING',
    'ADVISORY_COORDINATION_RECOMMENDATION'
  ],
  status = 'ACTIVE',
  updated_at = timezone('utc'::text, now())
WHERE id = 'SUPPLY_MATCHING';

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
      'PROCESSING_COORDINATION'
    )
  );

-- ------------------------------------------------------------------------------
-- 3. SUPPLY MATCHING SNAPSHOTS TABLE (Append-Only Evaluation History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supply_matching_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id VARCHAR(100),
  commodity VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  target_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (target_quantity >= 0.0),
  matched_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (matched_quantity >= 0.0),
  remaining_gap NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (remaining_gap >= 0.0),
  unit VARCHAR(30) NOT NULL DEFAULT 'KG',
  fulfillment_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (fulfillment_percentage BETWEEN 0.0 AND 100.0),
  match_classification VARCHAR(40) NOT NULL CHECK (
    match_classification IN (
      'EXCELLENT_MATCH',
      'GOOD_MATCH',
      'PARTIAL_MATCH',
      'LOW_CONFIDENCE_MATCH',
      'NO_MATCH',
      'INSUFFICIENT_DATA'
    )
  ),
  coordination_type VARCHAR(40) NOT NULL CHECK (
    coordination_type IN (
      'DIRECT_SINGLE_SOURCE',
      'MULTI_SOURCE_AGGREGATION',
      'PROCESSING_REQUIRED',
      'CROSS_CORRIDOR',
      'UNSATISFIED',
      'INSUFFICIENT_DATA'
    )
  ),
  match_score NUMERIC(5, 2) NOT NULL CHECK (match_score BETWEEN 0.0 AND 100.0),
  component_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  candidates_count INT NOT NULL DEFAULT 0 CHECK (candidates_count >= 0),
  aggregation_pool_count INT NOT NULL DEFAULT 0 CHECK (aggregation_pool_count >= 0),
  processing_required BOOLEAN NOT NULL DEFAULT false,
  processing_facility_id UUID REFERENCES public.processing_facilities(id) ON DELETE SET NULL,
  logistics_corridor VARCHAR(100),
  constraints TEXT[] NOT NULL DEFAULT '{}',
  missing_evidence TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_supply_matching_snapshots CHECK (
    commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_sms_commodity_state ON public.supply_matching_snapshots(commodity, state, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_classification ON public.supply_matching_snapshots(match_classification);
CREATE INDEX IF NOT EXISTS idx_sms_coordination_type ON public.supply_matching_snapshots(coordination_type);
CREATE INDEX IF NOT EXISTS idx_sms_demand_id ON public.supply_matching_snapshots(demand_id);

-- ------------------------------------------------------------------------------
-- 4. SUPPLY MATCH CANDIDATES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supply_match_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.supply_matching_snapshots(id) ON DELETE CASCADE,
  supply_id VARCHAR(100) NOT NULL,
  supply_source_type VARCHAR(50) NOT NULL CHECK (
    supply_source_type IN (
      'LISTING',
      'INVENTORY',
      'PRODUCTION_OUTPUT',
      'AGGREGATION_POOL',
      'PROCESSING_OUTPUT',
      'EXPECTED_PRODUCTION'
    )
  ),
  supplier_name VARCHAR(150) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  available_quantity NUMERIC(14, 2) NOT NULL CHECK (available_quantity >= 0.0),
  allocated_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (allocated_quantity >= 0.0),
  unit VARCHAR(30) NOT NULL DEFAULT 'KG',
  candidate_score NUMERIC(5, 2) NOT NULL CHECK (candidate_score BETWEEN 0.0 AND 100.0),
  reliability_level VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN' CHECK (
    reliability_level IN ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN')
  ),
  ready_date TIMESTAMPTZ,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED',
  distance_tier VARCHAR(30) NOT NULL CHECK (
    distance_tier IN ('SAME_LGA', 'SAME_STATE', 'REGIONAL_CORRIDOR', 'NATIONAL')
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_smc_snapshot_id ON public.supply_match_candidates(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_smc_supply_id ON public.supply_match_candidates(supply_id);
CREATE INDEX IF NOT EXISTS idx_smc_candidate_score ON public.supply_match_candidates(candidate_score DESC);

-- ------------------------------------------------------------------------------
-- 5. SUPPLY COORDINATION RECOMMENDATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supply_coordination_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.supply_matching_snapshots(id) ON DELETE CASCADE,
  demand_id VARCHAR(100),
  recommendation_type VARCHAR(50) NOT NULL CHECK (
    recommendation_type IN (
      'AGGREGATE_FARMERS',
      'CONNECT_DIRECT_SUPPLY',
      'ROUTE_THROUGH_PROCESSOR',
      'EXPLORE_ALTERNATIVE_CORRIDOR',
      'RESOLVE_LOGISTICS_CONSTRAINT',
      'EXPAND_SUPPLY_BASE'
    )
  ),
  title VARCHAR(255) NOT NULL,
  details TEXT NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED' CHECK (
    status IN ('PROPOSED', 'REVIEWED', 'ACCEPTED', 'REJECTED', 'ACTIONED', 'COMPLETED')
  ),
  actioned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actioned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_coordination_recommendations CHECK (
    title !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
    AND details !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_scr_snapshot_id ON public.supply_coordination_recommendations(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_scr_status ON public.supply_coordination_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_scr_type ON public.supply_coordination_recommendations(recommendation_type);

CREATE TRIGGER set_supply_coordination_recommendations_updated_at
  BEFORE UPDATE ON public.supply_coordination_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. IMMUTABILITY TRIGGERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_supply_matching_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Supply matching snapshots are strictly immutable audit records.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only system administrators may purge supply matching snapshot records.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_supply_matching_snapshot_immutability ON public.supply_matching_snapshots;
CREATE TRIGGER enforce_supply_matching_snapshot_immutability
  BEFORE UPDATE OR DELETE ON public.supply_matching_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prevent_supply_matching_snapshot_mutation();

CREATE OR REPLACE FUNCTION public.prevent_supply_match_candidates_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Supply match candidate records are immutable evaluations associated with a snapshot.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only system administrators may delete supply match candidate records directly.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_supply_match_candidates_immutability ON public.supply_match_candidates;
CREATE TRIGGER enforce_supply_match_candidates_immutability
  BEFORE UPDATE OR DELETE ON public.supply_match_candidates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_supply_match_candidates_mutation();

-- ------------------------------------------------------------------------------
-- 7. ROW-LEVEL SECURITY POLICIES (Privacy-Conscious Protection)
-- ------------------------------------------------------------------------------
ALTER TABLE public.supply_matching_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_match_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_coordination_recommendations ENABLE ROW LEVEL SECURITY;

-- Snapshots: Authenticated users can view; public can view aggregated non-sensitive records
DROP POLICY IF EXISTS "Authenticated users read supply matching snapshots" ON public.supply_matching_snapshots;
CREATE POLICY "Authenticated users read supply matching snapshots"
  ON public.supply_matching_snapshots
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR (metadata->>'is_public')::boolean = true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert supply matching snapshots" ON public.supply_matching_snapshots;
CREATE POLICY "System role and authenticated service insert supply matching snapshots"
  ON public.supply_matching_snapshots
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Candidates: Authenticated users can read candidate details
DROP POLICY IF EXISTS "Authenticated users read supply match candidates" ON public.supply_match_candidates;
CREATE POLICY "Authenticated users read supply match candidates"
  ON public.supply_match_candidates
  FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "System role and authenticated service insert supply match candidates" ON public.supply_match_candidates;
CREATE POLICY "System role and authenticated service insert supply match candidates"
  ON public.supply_match_candidates
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Coordination Recommendations: Authenticated users can read & update recommendations
DROP POLICY IF EXISTS "Authenticated users read coordination recommendations" ON public.supply_coordination_recommendations;
CREATE POLICY "Authenticated users read coordination recommendations"
  ON public.supply_coordination_recommendations
  FOR SELECT
  USING (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "System role and authenticated service insert coordination recommendations" ON public.supply_coordination_recommendations;
CREATE POLICY "System role and authenticated service insert coordination recommendations"
  ON public.supply_coordination_recommendations
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Authenticated users update coordination recommendations" ON public.supply_coordination_recommendations;
CREATE POLICY "Authenticated users update coordination recommendations"
  ON public.supply_coordination_recommendations
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
