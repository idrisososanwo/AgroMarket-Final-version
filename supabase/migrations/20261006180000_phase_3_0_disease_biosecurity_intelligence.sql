-- ==============================================================================
-- AGROMARKET PHASE 3.0: AGRICULTURAL DISEASE & BIOSECURITY INTELLIGENCE AGENT
-- Schema for Agricultural Disease Risk Indexing, Biosecurity Resilience,
-- Evidence-Grounded Observations, Signal Convergence, Value-Chain Impact,
-- Governed Early-Warning Alerts & RLS Safety
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTER AGRICULTURAL DISEASE & BIOSECURITY AGENT IN REGISTRY
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
    'AGRICULTURAL_DISEASE_BIOSECURITY_AGENT',
    'Agricultural Disease & Biosecurity Intelligence Agent',
    '1.0.0',
    'Asset-light early-warning and biosecurity intelligence agent. Observes, normalizes, and correlates agricultural disease-risk signals, biosecurity constraints, and signal convergence across Nigerian trade basins.',
    ARRAY[
      'DISEASE_RISK_DETECTION',
      'BIOSECURITY_INTELLIGENCE',
      'SIGNAL_CONVERGENCE_ANALYSIS',
      'PRODUCTION_HEALTH_ASSESSMENT',
      'MOVEMENT_HEALTH_MONITORING',
      'SUPPLY_IMPACT_ANALYSIS',
      'PROCUREMENT_IMPACT_ANALYSIS',
      'FOOD_SECURITY_CORRELATION',
      'BIOSECURITY_RESILIENCE_ASSESSMENT',
      'HUMAN_IN_THE_LOOP_ALERTS'
    ],
    'ACTIVE',
    '{"supported_domains": ["CROPS", "LIVESTOCK", "POULTRY", "AQUACULTURE"], "primary_currency": "NGN", "indicator_type": "DECISION_SUPPORT_EARLY_WARNING"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  status = 'ACTIVE',
  metadata = EXCLUDED.metadata,
  updated_at = timezone('utc'::text, now());

-- Update alias DISEASE_BIOSECURITY if present
UPDATE public.agricultural_intelligence_agents
SET
  version = '1.0.0',
  description = 'Asset-light early-warning and biosecurity intelligence agent. Observes, normalizes, and correlates agricultural disease-risk signals, biosecurity constraints, and signal convergence across Nigerian trade basins.',
  capabilities = ARRAY[
    'DISEASE_RISK_DETECTION',
    'BIOSECURITY_INTELLIGENCE',
    'SIGNAL_CONVERGENCE_ANALYSIS',
    'PRODUCTION_HEALTH_ASSESSMENT',
    'MOVEMENT_HEALTH_MONITORING',
    'SUPPLY_IMPACT_ANALYSIS',
    'PROCUREMENT_IMPACT_ANALYSIS',
    'FOOD_SECURITY_CORRELATION',
    'BIOSECURITY_RESILIENCE_ASSESSMENT',
    'HUMAN_IN_THE_LOOP_ALERTS'
  ],
  status = 'ACTIVE',
  updated_at = timezone('utc'::text, now())
WHERE id = 'DISEASE_BIOSECURITY';

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
      'DISEASE_SURVEILLANCE_VERIFICATION'
    )
  );

-- ------------------------------------------------------------------------------
-- 3. AGRICULTURAL DISEASE SNAPSHOTS TABLE (Append-Only Analytical History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_disease_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  geopolitical_zone VARCHAR(50),
  commodity VARCHAR(100),
  category VARCHAR(50),
  risk_score NUMERIC(5, 2) NOT NULL CHECK (risk_score BETWEEN 0.0 AND 100.0),
  risk_level VARCHAR(30) NOT NULL CHECK (
    risk_level IN (
      'LOW_RISK',
      'MODERATE_RISK',
      'ELEVATED_RISK',
      'HIGH_RISK',
      'CRITICAL_RISK',
      'INSUFFICIENT_DATA'
    )
  ),
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
  risk_components JSONB NOT NULL DEFAULT '{}'::jsonb,
  resilience_components JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_strength NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  signal_convergence NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  production_impact NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  movement_exposure NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  supply_impact NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  key_drivers TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  missing_evidence TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  vulnerability_factors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  adaptive_capacities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant: Absolute zero tolerance at DB schema level
  CONSTRAINT agricultural_disease_snapshots_anti_pork CHECK (
    (commodity IS NULL OR commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (category IS NULL OR category !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_agricultural_disease_snapshots_state ON public.agricultural_disease_snapshots(state);
CREATE INDEX IF NOT EXISTS idx_agricultural_disease_snapshots_commodity ON public.agricultural_disease_snapshots(commodity);
CREATE INDEX IF NOT EXISTS idx_agricultural_disease_snapshots_calculated_at ON public.agricultural_disease_snapshots(calculated_at DESC);

-- Trigger: Snapshot Immutability (Append-only enforcement)
CREATE OR REPLACE FUNCTION public.fn_prevent_agricultural_disease_snapshot_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'agricultural_disease_snapshots records are immutable and cannot be updated.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_agricultural_disease_snapshot_update ON public.agricultural_disease_snapshots;
CREATE TRIGGER trg_prevent_agricultural_disease_snapshot_update
  BEFORE UPDATE ON public.agricultural_disease_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_agricultural_disease_snapshot_update();

-- ------------------------------------------------------------------------------
-- 4. AGRICULTURAL DISEASE OBSERVATIONS TABLE (Structured Evidence Records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_disease_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.agricultural_disease_snapshots(id) ON DELETE SET NULL,
  observation_type VARCHAR(60) NOT NULL CHECK (
    observation_type IN (
      'MORTALITY_SIGNAL',
      'PRODUCTION_HEALTH_DISRUPTION',
      'CROP_HEALTH_DISRUPTION',
      'AQUACULTURE_HEALTH_SIGNAL',
      'BIOSECURITY_RESTRICTION',
      'MOVEMENT_HEALTH_RESTRICTION',
      'OFFICIAL_ADVISORY',
      'SURVEILLANCE_NOTICE',
      'VETERINARY_COMMUNICATION',
      'PEST_VECTOR_INFESTATION',
      'ABNORMAL_YIELD_LOSS'
    )
  ),
  source_name VARCHAR(150) NOT NULL,
  source_type VARCHAR(50) NOT NULL CHECK (
    source_type IN (
      'OFFICIAL_VETERINARY',
      'GOVERNMENT_MINISTRY',
      'RESEARCH_INSTITUTE',
      'EXTENSION_OFFICER',
      'COMMERCIAL_OBSERVATION',
      'COOPERATIVE_REPORT',
      'PUBLIC_MEDIA',
      'SIMULATED'
    )
  ),
  source_url TEXT,
  verification_status VARCHAR(30) NOT NULL CHECK (
    verification_status IN (
      'VERIFIED',
      'OFFICIAL',
      'SECONDARY',
      'UNVERIFIED',
      'SIMULATED'
    )
  ),
  reporting_authority VARCHAR(150),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  commodity VARCHAR(100),
  category VARCHAR(50),
  evidence_summary TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  published_at TIMESTAMPTZ,
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.8 CHECK (confidence BETWEEN 0.0 AND 1.0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_disease_observations_anti_pork CHECK (
    (commodity IS NULL OR commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (category IS NULL OR category !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (evidence_summary !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_agricultural_disease_observations_state ON public.agricultural_disease_observations(state);
CREATE INDEX IF NOT EXISTS idx_agricultural_disease_observations_commodity ON public.agricultural_disease_observations(commodity);
CREATE INDEX IF NOT EXISTS idx_agricultural_disease_observations_observed_at ON public.agricultural_disease_observations(observed_at DESC);

-- ------------------------------------------------------------------------------
-- 5. BIOSECURITY DEPENDENCIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.biosecurity_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.agricultural_disease_snapshots(id) ON DELETE SET NULL,
  state VARCHAR(50) NOT NULL,
  commodity VARCHAR(100),
  dependency_type VARCHAR(60) NOT NULL CHECK (
    dependency_type IN (
      'REGIONAL_PRODUCTION_CONCENTRATION',
      'MOVEMENT_DEPENDENCY',
      'PROCESSING_DEPENDENCY',
      'SOURCE_SUPPLIER_DEPENDENCY'
    )
  ),
  dominant_entity VARCHAR(150) NOT NULL,
  concentration_percentage NUMERIC(5, 2) NOT NULL CHECK (concentration_percentage BETWEEN 0.0 AND 100.0),
  severity VARCHAR(20) NOT NULL CHECK (
    severity IN ('INFO', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL')
  ),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'MONITORING', 'RESOLVED', 'ARCHIVED')
  ),
  risk_assessment TEXT NOT NULL,
  evidence TEXT NOT NULL,
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT biosecurity_dependencies_anti_pork CHECK (
    (commodity IS NULL OR commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (dominant_entity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (risk_assessment !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_biosecurity_dependencies_state ON public.biosecurity_dependencies(state);
CREATE INDEX IF NOT EXISTS idx_biosecurity_dependencies_status ON public.biosecurity_dependencies(status);

-- ------------------------------------------------------------------------------
-- 6. AGRICULTURAL DISEASE ALERTS TABLE (Governed Lifecycle)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agricultural_disease_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.agricultural_disease_snapshots(id) ON DELETE SET NULL,
  alert_code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (
    severity IN ('INFO', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL')
  ),
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'REVIEW', 'PUBLISHED', 'ACKNOWLEDGED', 'RESOLVED', 'ARCHIVED')
  ),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  commodity VARCHAR(100),
  category VARCHAR(50),
  summary TEXT NOT NULL,
  evidence_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_status VARCHAR(30) NOT NULL CHECK (
    verification_status IN ('VERIFIED', 'OFFICIAL', 'SECONDARY', 'UNVERIFIED', 'SIMULATED')
  ),
  limitations TEXT NOT NULL,
  official_consultation_advice TEXT NOT NULL,
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-Pork Invariant
  CONSTRAINT agricultural_disease_alerts_anti_pork CHECK (
    (commodity IS NULL OR commodity !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (category IS NULL OR category !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (title !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b') AND
    (summary !~* '\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b')
  )
);

CREATE INDEX IF NOT EXISTS idx_agricultural_disease_alerts_state ON public.agricultural_disease_alerts(state);
CREATE INDEX IF NOT EXISTS idx_agricultural_disease_alerts_status ON public.agricultural_disease_alerts(status);
CREATE INDEX IF NOT EXISTS idx_agricultural_disease_alerts_severity ON public.agricultural_disease_alerts(severity);

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_disease_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_disease_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biosecurity_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricultural_disease_alerts ENABLE ROW LEVEL SECURITY;

-- Snapshots: Public/authenticated aggregate read; Authenticated service insert
DROP POLICY IF EXISTS "Public and authenticated read disease snapshots" ON public.agricultural_disease_snapshots;
CREATE POLICY "Public and authenticated read disease snapshots"
  ON public.agricultural_disease_snapshots
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert disease snapshots" ON public.agricultural_disease_snapshots;
CREATE POLICY "System role and authenticated service insert disease snapshots"
  ON public.agricultural_disease_snapshots
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Observations: Public/authenticated read; Authenticated service insert
DROP POLICY IF EXISTS "Public and authenticated read disease observations" ON public.agricultural_disease_observations;
CREATE POLICY "Public and authenticated read disease observations"
  ON public.agricultural_disease_observations
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert disease observations" ON public.agricultural_disease_observations;
CREATE POLICY "System role and authenticated service insert disease observations"
  ON public.agricultural_disease_observations
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Dependencies: Public/authenticated read; Authenticated service insert/update
DROP POLICY IF EXISTS "Public and authenticated read biosecurity dependencies" ON public.biosecurity_dependencies;
CREATE POLICY "Public and authenticated read biosecurity dependencies"
  ON public.biosecurity_dependencies
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert biosecurity dependencies" ON public.biosecurity_dependencies;
CREATE POLICY "System role and authenticated service insert biosecurity dependencies"
  ON public.biosecurity_dependencies
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Admins and authorized users update biosecurity dependencies" ON public.biosecurity_dependencies;
CREATE POLICY "Admins and authorized users update biosecurity dependencies"
  ON public.biosecurity_dependencies
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Alerts: Public reads published alerts; Authenticated users/admins read & manage
DROP POLICY IF EXISTS "Public and authenticated read disease alerts" ON public.agricultural_disease_alerts;
CREATE POLICY "Public and authenticated read disease alerts"
  ON public.agricultural_disease_alerts
  FOR SELECT
  USING (
    status = 'PUBLISHED'
    OR auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "System role and authenticated service insert disease alerts" ON public.agricultural_disease_alerts;
CREATE POLICY "System role and authenticated service insert disease alerts"
  ON public.agricultural_disease_alerts
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Admins and authorized users update disease alerts" ON public.agricultural_disease_alerts;
CREATE POLICY "Admins and authorized users update disease alerts"
  ON public.agricultural_disease_alerts
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
