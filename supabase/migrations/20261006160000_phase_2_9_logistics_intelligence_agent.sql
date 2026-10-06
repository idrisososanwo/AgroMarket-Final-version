-- ==============================================================================
-- AGROMARKET PHASE 2.9: LOGISTICS INTELLIGENCE & MOVEMENT RESILIENCE AGENT
-- Schema for Logistics Movement Intelligence, Pressure Indexing, Network Resilience,
-- Corridor Dependency Tracking, Bottleneck Detection, Advisory Governance & RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTER LOGISTICS INTELLIGENCE AGENT IN REGISTRY
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
    'LOGISTICS_INTELLIGENCE_AGENT',
    'Specialized Logistics Intelligence & Movement Resilience Agent',
    '1.0.0',
    'Asset-light intelligence and agricultural movement coordination agent. Observes movement requirements, delivery performance, corridor dependencies, disruption signals, and network resilience across Nigerian agricultural corridors.',
    ARRAY[
      'MOVEMENT_DEMAND_ANALYSIS',
      'CORRIDOR_INTELLIGENCE',
      'LOGISTICS_PRESSURE_INDEXING',
      'BOTTLENECK_DETECTION',
      'LOGISTICS_RESILIENCE_ASSESSMENT',
      'PROVIDER_DEPENDENCY_ANALYSIS',
      'CORRIDOR_DEPENDENCY_MONITORING',
      'SECURITY_LOGISTICS_CORRELATION',
      'FOOD_SECURITY_LOGISTICS_LINK',
      'HUMAN_IN_THE_LOOP_RECOMMENDATIONS'
    ],
    'ACTIVE',
    '{"supported_domains": ["CROPS", "LIVESTOCK", "POULTRY", "AQUACULTURE"], "primary_currency": "NGN", "indicator_type": "ANALYTICAL_COORDINATION"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  status = 'ACTIVE',
  metadata = EXCLUDED.metadata,
  updated_at = timezone('utc'::text, now());

-- Update alias LOGISTICS_INTELLIGENCE if present
UPDATE public.agricultural_intelligence_agents
SET
  version = '1.0.0',
  description = 'Asset-light intelligence and agricultural movement coordination agent. Observes movement requirements, delivery performance, corridor dependencies, disruption signals, and network resilience across Nigerian agricultural corridors.',
  capabilities = ARRAY[
    'MOVEMENT_DEMAND_ANALYSIS',
    'CORRIDOR_INTELLIGENCE',
    'LOGISTICS_PRESSURE_INDEXING',
    'BOTTLENECK_DETECTION',
    'LOGISTICS_RESILIENCE_ASSESSMENT',
    'PROVIDER_DEPENDENCY_ANALYSIS',
    'CORRIDOR_DEPENDENCY_MONITORING',
    'SECURITY_LOGISTICS_CORRELATION',
    'FOOD_SECURITY_LOGISTICS_LINK',
    'HUMAN_IN_THE_LOOP_RECOMMENDATIONS'
  ],
  status = 'ACTIVE',
  updated_at = timezone('utc'::text, now())
WHERE id = 'LOGISTICS_INTELLIGENCE';

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
      'CORRIDOR_CAPACITY_STRENGTHENING'
    )
  );

-- ------------------------------------------------------------------------------
-- 3. LOGISTICS INTELLIGENCE SNAPSHOTS TABLE (Append-Only Movement History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_intelligence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corridor VARCHAR(150),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  commodity VARCHAR(100),
  category VARCHAR(50),
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
  pressure_components JSONB NOT NULL DEFAULT '{}'::jsonb,
  resilience_components JSONB NOT NULL DEFAULT '{}'::jsonb,
  key_drivers TEXT[] NOT NULL DEFAULT '{}',
  missing_evidence TEXT[] NOT NULL DEFAULT '{}',
  vulnerability_factors TEXT[] NOT NULL DEFAULT '{}',
  adaptive_capacities TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_logistics_snapshots CHECK (
    (commodity IS NULL OR commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
  )
);

CREATE INDEX IF NOT EXISTS idx_lis_state_corridor ON public.logistics_intelligence_snapshots(state, corridor, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_lis_pressure_score ON public.logistics_intelligence_snapshots(pressure_score DESC);
CREATE INDEX IF NOT EXISTS idx_lis_resilience_score ON public.logistics_intelligence_snapshots(resilience_score);

-- ------------------------------------------------------------------------------
-- 4. LOGISTICS CORRIDOR DEPENDENCIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_corridor_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.logistics_intelligence_snapshots(id) ON DELETE CASCADE,
  corridor VARCHAR(150) NOT NULL,
  state VARCHAR(50) NOT NULL,
  commodity VARCHAR(100),
  category VARCHAR(50),
  dominant_entity VARCHAR(150) NOT NULL,
  movement_share NUMERIC(5, 2) NOT NULL CHECK (movement_share BETWEEN 0.0 AND 100.0),
  threshold_exceeded NUMERIC(5, 2) NOT NULL CHECK (threshold_exceeded BETWEEN 0.0 AND 100.0),
  alternative_options_available INT NOT NULL DEFAULT 0 CHECK (alternative_options_available >= 0),
  dependency_type VARCHAR(50) NOT NULL CHECK (
    dependency_type IN (
      'CORRIDOR_DEPENDENCY',
      'HIGH_PROVIDER_DEPENDENCY',
      'REGIONAL_ALTERNATIVE_SCARCITY',
      'PROCESSING_DEPENDENCY',
      'SINGLE_TRANSIT_POINT'
    )
  ),
  severity VARCHAR(20) NOT NULL CHECK (
    severity IN ('INFO', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL')
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (
    status IN ('ACTIVE', 'MONITORING', 'RESOLVED', 'ARCHIVED')
  ),
  risk_assessment TEXT NOT NULL,
  evidence TEXT NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_logistics_dependencies CHECK (
    (commodity IS NULL OR commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
    AND dominant_entity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_lcd_corridor_state ON public.logistics_corridor_dependencies(corridor, state);
CREATE INDEX IF NOT EXISTS idx_lcd_type ON public.logistics_corridor_dependencies(dependency_type);
CREATE INDEX IF NOT EXISTS idx_lcd_severity ON public.logistics_corridor_dependencies(severity);

-- ------------------------------------------------------------------------------
-- 5. LOGISTICS BOTTLENECKS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_bottlenecks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.logistics_intelligence_snapshots(id) ON DELETE CASCADE,
  bottleneck_type VARCHAR(50) NOT NULL CHECK (
    bottleneck_type IN (
      'DELIVERY_BOTTLENECK',
      'PROVIDER_BOTTLENECK',
      'CORRIDOR_BOTTLENECK',
      'PROCESSING_TO_MARKET_BOTTLENECK',
      'AGGREGATION_TO_PROCESSING_BOTTLENECK',
      'REGIONAL_CAPACITY_SHORTAGE',
      'RECURRING_DELAY_PATTERN',
      'HIGH_CANCELLATION_CONCENTRATION',
      'DEMAND_SUPPLY_MOVEMENT_MISMATCH'
    )
  ),
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  corridor VARCHAR(150),
  commodity VARCHAR(100),
  category VARCHAR(50),
  severity VARCHAR(20) NOT NULL CHECK (
    severity IN ('INFO', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL')
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'IDENTIFIED' CHECK (
    status IN ('IDENTIFIED', 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'ARCHIVED')
  ),
  evidence TEXT NOT NULL,
  affected_scope VARCHAR(100) NOT NULL,
  alternative_available BOOLEAN NOT NULL DEFAULT false,
  recommended_action TEXT NOT NULL,
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  first_observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_observed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_logistics_bottlenecks CHECK (
    (commodity IS NULL OR commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
  )
);

CREATE INDEX IF NOT EXISTS idx_lb_type_severity ON public.logistics_bottlenecks(bottleneck_type, severity);
CREATE INDEX IF NOT EXISTS idx_lb_state_corridor ON public.logistics_bottlenecks(state, corridor);
CREATE INDEX IF NOT EXISTS idx_lb_status ON public.logistics_bottlenecks(status);

-- ------------------------------------------------------------------------------
-- 6. LOGISTICS RECOMMENDATIONS TABLE (Human-Governed Advisory)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.logistics_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES public.logistics_intelligence_snapshots(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  strategy VARCHAR(50) NOT NULL CHECK (
    strategy IN (
      'DIRECT_MOVEMENT',
      'MULTI_PROVIDER_MOVEMENT',
      'ALTERNATIVE_CORRIDOR_REVIEW',
      'REGIONAL_SOURCE_ALTERNATIVE',
      'PROCESSING_LOCATION_REVIEW',
      'WAIT_AND_MONITOR',
      'INSUFFICIENT_DATA'
    )
  ),
  state VARCHAR(50) NOT NULL,
  corridor VARCHAR(150),
  commodity VARCHAR(100),
  severity VARCHAR(20) NOT NULL DEFAULT 'WATCH' CHECK (
    severity IN ('INFO', 'WATCH', 'ELEVATED', 'HIGH', 'CRITICAL')
  ),
  status VARCHAR(20) NOT NULL DEFAULT 'PROPOSED' CHECK (
    status IN ('PROPOSED', 'REVIEWED', 'ACCEPTED', 'REJECTED', 'ACTIONED', 'COMPLETED')
  ),
  summary TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  evidence_citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  actioned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_logistics_recommendations CHECK (
    (commodity IS NULL OR commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
    AND title !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
    AND summary !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_lr_state_status ON public.logistics_recommendations(state, status);
CREATE INDEX IF NOT EXISTS idx_lr_strategy ON public.logistics_recommendations(strategy);

CREATE TRIGGER set_logistics_recommendations_updated_at
  BEFORE UPDATE ON public.logistics_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. IMMUTABILITY TRIGGERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_logistics_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Logistics intelligence snapshots are strictly immutable analytical audit records.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only system administrators may purge logistics intelligence snapshot records.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_logistics_snapshot_immutability ON public.logistics_intelligence_snapshots;
CREATE TRIGGER enforce_logistics_snapshot_immutability
  BEFORE UPDATE OR DELETE ON public.logistics_intelligence_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prevent_logistics_snapshot_mutation();

-- ------------------------------------------------------------------------------
-- 8. ROW-LEVEL SECURITY POLICIES (Privacy-Conscious Protection)
-- ------------------------------------------------------------------------------
ALTER TABLE public.logistics_intelligence_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_corridor_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_bottlenecks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_recommendations ENABLE ROW LEVEL SECURITY;

-- Snapshots: Public and authenticated read safe aggregate snapshots
DROP POLICY IF EXISTS "Public and authenticated read logistics snapshots" ON public.logistics_intelligence_snapshots;
CREATE POLICY "Public and authenticated read logistics snapshots"
  ON public.logistics_intelligence_snapshots
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR (metadata->>'is_public')::boolean = true
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert logistics snapshots" ON public.logistics_intelligence_snapshots;
CREATE POLICY "System role and authenticated service insert logistics snapshots"
  ON public.logistics_intelligence_snapshots
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Dependencies: Public and authenticated read
DROP POLICY IF EXISTS "Public and authenticated read logistics dependencies" ON public.logistics_corridor_dependencies;
CREATE POLICY "Public and authenticated read logistics dependencies"
  ON public.logistics_corridor_dependencies
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert logistics dependencies" ON public.logistics_corridor_dependencies;
CREATE POLICY "System role and authenticated service insert logistics dependencies"
  ON public.logistics_corridor_dependencies
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Bottlenecks: Public and authenticated read
DROP POLICY IF EXISTS "Public and authenticated read logistics bottlenecks" ON public.logistics_bottlenecks;
CREATE POLICY "Public and authenticated read logistics bottlenecks"
  ON public.logistics_bottlenecks
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert logistics bottlenecks" ON public.logistics_bottlenecks;
CREATE POLICY "System role and authenticated service insert logistics bottlenecks"
  ON public.logistics_bottlenecks
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Admins and authorized users update logistics bottlenecks" ON public.logistics_bottlenecks;
CREATE POLICY "Admins and authorized users update logistics bottlenecks"
  ON public.logistics_bottlenecks
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Recommendations: Public reads active recommendations; Authenticated users/admins manage
DROP POLICY IF EXISTS "Public and authenticated read logistics recommendations" ON public.logistics_recommendations;
CREATE POLICY "Public and authenticated read logistics recommendations"
  ON public.logistics_recommendations
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR true
  );

DROP POLICY IF EXISTS "System role and authenticated service insert logistics recommendations" ON public.logistics_recommendations;
CREATE POLICY "System role and authenticated service insert logistics recommendations"
  ON public.logistics_recommendations
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Admins and authorized users update logistics recommendations" ON public.logistics_recommendations;
CREATE POLICY "Admins and authorized users update logistics recommendations"
  ON public.logistics_recommendations
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
