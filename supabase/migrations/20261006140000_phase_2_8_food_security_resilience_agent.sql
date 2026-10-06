-- ==============================================================================
-- AGROMARKET PHASE 2.8: FOOD SECURITY & AGRICULTURAL RESILIENCE AGENT
-- Schema for Food Security Early Warning, Pressure Indexing, Agricultural Resilience,
-- Critical Dependency Tracking, Alert Governance, Immutability & RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTER FOOD SECURITY & AGRICULTURAL RESILIENCE AGENT IN REGISTRY
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
    'FOOD_SECURITY_RESILIENCE_AGENT',
    'Specialized Food Security & Agricultural Resilience Agent',
    '1.0.0',
    'Transforms agricultural intelligence into a responsible food-security early-warning and resilience layer. Correlates supply stress, demand pressure, market inflation, corridor disruptions, and production risks into analytical early-warning indicators with strict human review governance.',
    ARRAY[
      'FOOD_SECURITY_PRESSURE_INDEXING',
      'AGRICULTURAL_RESILIENCE_ASSESSMENT',
      'COMMODITY_PRESSURE_ANALYSIS',
      'REGIONAL_STRESS_DETECTION',
      'CRITICAL_DEPENDENCY_MONITORING',
      'SECURITY_TO_SUPPLY_CORRELATION',
      'EARLY_WARNING_ALERT_GENERATION',
      'HUMAN_IN_THE_LOOP_ALERT_GOVERNANCE',
      'DISEASE_RISK_INTEGRATION',
      'MULTI_DIMENSIONAL_VULNERABILITY_MAPPING'
    ],
    'ACTIVE',
    '{"supported_domains": ["CROPS", "LIVESTOCK", "POULTRY", "AQUACULTURE"], "primary_currency": "NGN", "indicator_type": "ANALYTICAL_EARLY_WARNING"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  status = 'ACTIVE',
  metadata = EXCLUDED.metadata,
  updated_at = timezone('utc'::text, now());

-- Update legacy alias FOOD_SECURITY if present
UPDATE public.agricultural_intelligence_agents
SET
  version = '1.0.0',
  description = 'Transforms agricultural intelligence into a responsible food-security early-warning and resilience layer. Correlates supply stress, demand pressure, market inflation, corridor disruptions, and production risks into analytical early-warning indicators with strict human review governance.',
  capabilities = ARRAY[
    'FOOD_SECURITY_PRESSURE_INDEXING',
    'AGRICULTURAL_RESILIENCE_ASSESSMENT',
    'COMMODITY_PRESSURE_ANALYSIS',
    'REGIONAL_STRESS_DETECTION',
    'CRITICAL_DEPENDENCY_MONITORING',
    'SECURITY_TO_SUPPLY_CORRELATION',
    'EARLY_WARNING_ALERT_GENERATION',
    'HUMAN_IN_THE_LOOP_ALERT_GOVERNANCE',
    'DISEASE_RISK_INTEGRATION',
    'MULTI_DIMENSIONAL_VULNERABILITY_MAPPING'
  ],
  status = 'ACTIVE',
  updated_at = timezone('utc'::text, now())
WHERE id = 'FOOD_SECURITY';

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
      'CRITICAL_DEPENDENCY_MITIGATION'
    )
  );

-- ------------------------------------------------------------------------------
-- 3. FOOD SECURITY SNAPSHOTS TABLE (Append-Only Early Warning History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_security_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity VARCHAR(100),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  geopolitical_zone VARCHAR(50),
  pressure_score NUMERIC(5, 2) NOT NULL CHECK (pressure_score BETWEEN 0.0 AND 100.0),
  pressure_level VARCHAR(30) NOT NULL CHECK (
    pressure_level IN (
      'LOW_PRESSURE',
      'MODERATE_PRESSURE',
      'HIGH_PRESSURE',
      'CRITICAL_PRESSURE',
      'INSUFFICIENT_DATA'
    )
  ),
  component_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  availability_status VARCHAR(30) NOT NULL DEFAULT 'ADEQUATE' CHECK (
    availability_status IN ('ADEQUATE', 'MODERATE_DEFICIT', 'SEVERE_DEFICIT', 'INSUFFICIENT_DATA')
  ),
  affordability_status VARCHAR(30) NOT NULL DEFAULT 'STABLE' CHECK (
    affordability_status IN ('STABLE', 'MODERATE_PRESSURE', 'SEVERE_PRESSURE', 'INSUFFICIENT_DATA')
  ),
  access_status VARCHAR(30) NOT NULL DEFAULT 'NORMAL' CHECK (
    access_status IN ('NORMAL', 'ACCESS_PRESSURE', 'ACCESS_CONSTRAINT', 'INSUFFICIENT_DATA')
  ),
  stability_status VARCHAR(30) NOT NULL DEFAULT 'STABLE' CHECK (
    stability_status IN ('STABLE', 'MODERATE_VOLATILITY', 'SEVERE_VOLATILITY', 'INSUFFICIENT_DATA')
  ),
  key_drivers TEXT[] NOT NULL DEFAULT '{}',
  constraints TEXT[] NOT NULL DEFAULT '{}',
  missing_evidence TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_food_security_snapshots CHECK (
    (commodity IS NULL OR commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
  )
);

CREATE INDEX IF NOT EXISTS idx_fss_commodity_state ON public.food_security_snapshots(commodity, state, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fss_pressure_score ON public.food_security_snapshots(pressure_score DESC);
CREATE INDEX IF NOT EXISTS idx_fss_pressure_level ON public.food_security_snapshots(pressure_level);

-- ------------------------------------------------------------------------------
-- 4. AGRICULTURAL RESILIENCE SNAPSHOTS TABLE (Append-Only Adaptability History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_resilience_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity VARCHAR(100),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  resilience_score NUMERIC(5, 2) NOT NULL CHECK (resilience_score BETWEEN 0.0 AND 100.0),
  resilience_level VARCHAR(30) NOT NULL CHECK (
    resilience_level IN (
      'HIGH_RESILIENCE',
      'MODERATE_RESILIENCE',
      'VULNERABLE',
      'CRITICALLY_VULNERABLE',
      'INSUFFICIENT_DATA'
    )
  ),
  component_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  vulnerability_factors TEXT[] NOT NULL DEFAULT '{}',
  adaptive_capacities TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_resilience_snapshots CHECK (
    (commodity IS NULL OR commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
  )
);

CREATE INDEX IF NOT EXISTS idx_ars_state_commodity ON public.agricultural_resilience_snapshots(state, commodity, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ars_resilience_score ON public.agricultural_resilience_snapshots(resilience_score);

-- ------------------------------------------------------------------------------
-- 5. CRITICAL DEPENDENCIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_security_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.food_security_snapshots(id) ON DELETE CASCADE,
  commodity VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  dependency_type VARCHAR(50) NOT NULL CHECK (
    dependency_type IN (
      'REGIONAL_SUPPLY_CONCENTRATION',
      'PROCESSING_BOTTLENECK_DEPENDENCY',
      'CORRIDOR_TRANSIT_DEPENDENCY',
      'SUPPLIER_CONCENTRATION_DEPENDENCY',
      'SINGLE_POINT_FAILURE'
    )
  ),
  dominant_entity VARCHAR(150) NOT NULL,
  concentration_ratio NUMERIC(5, 2) NOT NULL CHECK (concentration_ratio BETWEEN 0.0 AND 100.0),
  threshold_exceeded NUMERIC(5, 2) NOT NULL CHECK (threshold_exceeded BETWEEN 0.0 AND 100.0),
  alternative_options_available INT NOT NULL DEFAULT 0 CHECK (alternative_options_available >= 0),
  risk_assessment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_food_security_dependencies CHECK (
    commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
    AND dominant_entity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_fsd_commodity_state ON public.food_security_dependencies(commodity, state);
CREATE INDEX IF NOT EXISTS idx_fsd_type ON public.food_security_dependencies(dependency_type);

-- ------------------------------------------------------------------------------
-- 6. FOOD SECURITY ALERTS TABLE (Human-Governed Early Warnings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.food_security_snapshots(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  commodity VARCHAR(100),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  severity VARCHAR(20) NOT NULL CHECK (
    severity IN ('INFO', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL')
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'REVIEW', 'PUBLISHED', 'ACKNOWLEDGED', 'RESOLVED', 'ARCHIVED')
  ),
  summary TEXT NOT NULL,
  evidence_summary TEXT NOT NULL,
  contributing_signals TEXT[] NOT NULL DEFAULT '{}',
  source_governance JSONB NOT NULL DEFAULT '{"sourceType": "VERIFIED", "verificationStatus": "VERIFIED"}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  published_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_food_security_alerts CHECK (
    (commodity IS NULL OR commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
    AND title !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
    AND summary !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_fsa_state_severity ON public.food_security_alerts(state, severity);
CREATE INDEX IF NOT EXISTS idx_fsa_status ON public.food_security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fsa_published ON public.food_security_alerts(is_public, status);

CREATE TRIGGER set_food_security_alerts_updated_at
  BEFORE UPDATE ON public.food_security_alerts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. IMMUTABILITY TRIGGERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_food_security_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Food security snapshots are strictly immutable analytical audit records.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only system administrators may purge food security snapshot records.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_food_security_snapshot_immutability ON public.food_security_snapshots;
CREATE TRIGGER enforce_food_security_snapshot_immutability
  BEFORE UPDATE OR DELETE ON public.food_security_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prevent_food_security_snapshot_mutation();

CREATE OR REPLACE FUNCTION public.prevent_resilience_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Agricultural resilience snapshots are strictly immutable analytical audit records.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only system administrators may purge agricultural resilience snapshots.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_resilience_snapshot_immutability ON public.agricultural_resilience_snapshots;
CREATE TRIGGER enforce_resilience_snapshot_immutability
  BEFORE UPDATE OR DELETE ON public.agricultural_resilience_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prevent_resilience_snapshot_mutation();

-- ------------------------------------------------------------------------------
-- 8. ROW-LEVEL SECURITY POLICIES (Privacy-Conscious Protection)
-- ------------------------------------------------------------------------------
ALTER TABLE public.food_security_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_resilience_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_security_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_security_alerts ENABLE ROW LEVEL SECURITY;

-- Snapshots: Authenticated users can view; public can view safe aggregate snapshots
DROP POLICY IF EXISTS "Public and authenticated read food security snapshots" ON public.food_security_snapshots;
CREATE POLICY "Public and authenticated read food security snapshots"
  ON public.food_security_snapshots
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR (metadata->>'is_public')::boolean = true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert food security snapshots" ON public.food_security_snapshots;
CREATE POLICY "System role and authenticated service insert food security snapshots"
  ON public.food_security_snapshots
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Resilience Snapshots: Public and authenticated read
DROP POLICY IF EXISTS "Public and authenticated read resilience snapshots" ON public.agricultural_resilience_snapshots;
CREATE POLICY "Public and authenticated read resilience snapshots"
  ON public.agricultural_resilience_snapshots
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR (metadata->>'is_public')::boolean = true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert resilience snapshots" ON public.agricultural_resilience_snapshots;
CREATE POLICY "System role and authenticated service insert resilience snapshots"
  ON public.agricultural_resilience_snapshots
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Dependencies: Public and authenticated read
DROP POLICY IF EXISTS "Public and authenticated read food security dependencies" ON public.food_security_dependencies;
CREATE POLICY "Public and authenticated read food security dependencies"
  ON public.food_security_dependencies
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert food security dependencies" ON public.food_security_dependencies;
CREATE POLICY "System role and authenticated service insert food security dependencies"
  ON public.food_security_dependencies
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Alerts: Public can read PUBLISHED alerts; Authenticated users/admins can read all
DROP POLICY IF EXISTS "Public reads published food security alerts" ON public.food_security_alerts;
CREATE POLICY "Public reads published food security alerts"
  ON public.food_security_alerts
  FOR SELECT
  USING (
    (status = 'PUBLISHED' AND is_public = true)
    OR auth.role() = 'authenticated'
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "System role and authenticated service insert food security alerts" ON public.food_security_alerts;
CREATE POLICY "System role and authenticated service insert food security alerts"
  ON public.food_security_alerts
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Admins and authorized users update food security alerts" ON public.food_security_alerts;
CREATE POLICY "Admins and authorized users update food security alerts"
  ON public.food_security_alerts
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
