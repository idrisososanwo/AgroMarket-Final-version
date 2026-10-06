-- ==============================================================================
-- AGROMARKET PHASE 2.7: PROCUREMENT INTELLIGENCE & B2B PROCUREMENT AGENT
-- Schema for Procurement Intelligence Agent Registration, Persistent Intelligence Snapshots,
-- Procurement Opportunities, Advisory Procurement Recommendations, Immutability & RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTER PROCUREMENT INTELLIGENCE AGENT IN REGISTRY
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
    'PROCUREMENT_INTELLIGENCE_AGENT',
    'Specialized B2B Procurement & Procurement Intelligence Agent',
    '1.0.0',
    'Turns verified demand, market intelligence, supply matches, supply gaps, production planning, processing constraints, and logistics constraints into structured procurement intelligence and advisory recommendations for authorized buyers and businesses without autonomous purchasing.',
    ARRAY[
      'B2B_DEMAND_ANALYSIS',
      'PROCUREMENT_PRIORITY_SCORING',
      'PROCUREMENT_STRATEGY_CLASSIFICATION',
      'SUPPLIER_DIVERSIFICATION_ANALYSIS',
      'PROCUREMENT_RISK_ASSESSMENT',
      'MARKET_COST_INTELLIGENCE',
      'PROCESSING_COORDINATION_ANALYSIS',
      'LOGISTICS_CORRIDOR_INTELLIGENCE',
      'SECURITY_CONSTRAINT_MONITORING',
      'ADVISORY_PROCUREMENT_RECOMMENDATION'
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

-- Update legacy alias PROCUREMENT_INTELLIGENCE if present
UPDATE public.agricultural_intelligence_agents
SET
  version = '1.0.0',
  description = 'Turns verified demand, market intelligence, supply matches, supply gaps, production planning, processing constraints, and logistics constraints into structured procurement intelligence and advisory recommendations for authorized buyers and businesses without autonomous purchasing.',
  capabilities = ARRAY[
    'B2B_DEMAND_ANALYSIS',
    'PROCUREMENT_PRIORITY_SCORING',
    'PROCUREMENT_STRATEGY_CLASSIFICATION',
    'SUPPLIER_DIVERSIFICATION_ANALYSIS',
    'PROCUREMENT_RISK_ASSESSMENT',
    'MARKET_COST_INTELLIGENCE',
    'PROCESSING_COORDINATION_ANALYSIS',
    'LOGISTICS_CORRIDOR_INTELLIGENCE',
    'SECURITY_CONSTRAINT_MONITORING',
    'ADVISORY_PROCUREMENT_RECOMMENDATION'
  ],
  status = 'ACTIVE',
  updated_at = timezone('utc'::text, now())
WHERE id = 'PROCUREMENT_INTELLIGENCE';

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
      'B2B_PROCUREMENT'
    )
  );

-- ------------------------------------------------------------------------------
-- 3. PROCUREMENT INTELLIGENCE SNAPSHOTS TABLE (Append-Only Audit History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procurement_intelligence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id VARCHAR(100),
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  commodity VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  target_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (target_quantity >= 0.0),
  matched_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (matched_quantity >= 0.0),
  supply_gap NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (supply_gap >= 0.0),
  unit VARCHAR(30) NOT NULL DEFAULT 'KG',
  fulfillment_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (fulfillment_percentage BETWEEN 0.0 AND 100.0),
  procurement_priority_score NUMERIC(5, 2) NOT NULL CHECK (procurement_priority_score BETWEEN 0.0 AND 100.0),
  priority_components JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommended_strategy VARCHAR(50) NOT NULL CHECK (
    recommended_strategy IN (
      'DIRECT_SUPPLIER',
      'MULTI_SUPPLIER',
      'AGGREGATED_PROCUREMENT',
      'PROCESSING_REQUIRED',
      'REGIONAL_ALTERNATIVE',
      'WAIT_AND_MONITOR',
      'INSUFFICIENT_DATA'
    )
  ),
  procurement_risk_level VARCHAR(20) NOT NULL CHECK (
    procurement_risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN')
  ),
  risk_factors TEXT[] NOT NULL DEFAULT '{}',
  opportunity_status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (
    opportunity_status IN (
      'OPEN',
      'PARTIALLY_SOURCED',
      'SOURCED',
      'CONSTRAINED',
      'EXPIRED',
      'CANCELLED',
      'COMPLETED'
    )
  ),
  candidate_suppliers_count INT NOT NULL DEFAULT 0 CHECK (candidate_suppliers_count >= 0),
  supplier_concentration_detected BOOLEAN NOT NULL DEFAULT false,
  concentration_ratio NUMERIC(5, 2) DEFAULT 0.0 CHECK (concentration_ratio BETWEEN 0.0 AND 100.0),
  market_pressure_level VARCHAR(30) DEFAULT 'MODERATE',
  observed_price_min NUMERIC(14, 2),
  observed_price_max NUMERIC(14, 2),
  observed_price_median NUMERIC(14, 2),
  price_trend VARCHAR(30) DEFAULT 'STABLE',
  estimated_procurement_cost NUMERIC(14, 2),
  processing_required BOOLEAN NOT NULL DEFAULT false,
  security_disruption_flag BOOLEAN NOT NULL DEFAULT false,
  constraints TEXT[] NOT NULL DEFAULT '{}',
  missing_evidence TEXT[] NOT NULL DEFAULT '{}',
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_procurement_intelligence_snapshots CHECK (
    commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_pis_commodity_state ON public.procurement_intelligence_snapshots(commodity, state, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pis_demand_id ON public.procurement_intelligence_snapshots(demand_id);
CREATE INDEX IF NOT EXISTS idx_pis_buyer_id ON public.procurement_intelligence_snapshots(buyer_id);
CREATE INDEX IF NOT EXISTS idx_pis_strategy ON public.procurement_intelligence_snapshots(recommended_strategy);
CREATE INDEX IF NOT EXISTS idx_pis_priority ON public.procurement_intelligence_snapshots(procurement_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_pis_risk ON public.procurement_intelligence_snapshots(procurement_risk_level);

-- ------------------------------------------------------------------------------
-- 4. PROCUREMENT OPPORTUNITIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procurement_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.procurement_intelligence_snapshots(id) ON DELETE CASCADE,
  demand_id VARCHAR(100) NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  commodity VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  required_quantity NUMERIC(14, 2) NOT NULL CHECK (required_quantity >= 0.0),
  unit VARCHAR(30) NOT NULL DEFAULT 'KG',
  desired_delivery_date DATE,
  priority_score NUMERIC(5, 2) NOT NULL CHECK (priority_score BETWEEN 0.0 AND 100.0),
  priority_level VARCHAR(20) NOT NULL CHECK (
    priority_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')
  ),
  strategy VARCHAR(50) NOT NULL CHECK (
    strategy IN (
      'DIRECT_SUPPLIER',
      'MULTI_SUPPLIER',
      'AGGREGATED_PROCUREMENT',
      'PROCESSING_REQUIRED',
      'REGIONAL_ALTERNATIVE',
      'WAIT_AND_MONITOR',
      'INSUFFICIENT_DATA'
    )
  ),
  risk_level VARCHAR(20) NOT NULL CHECK (
    risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN')
  ),
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (
    status IN (
      'OPEN',
      'PARTIALLY_SOURCED',
      'SOURCED',
      'CONSTRAINED',
      'EXPIRED',
      'CANCELLED',
      'COMPLETED'
    )
  ),
  matched_quantity NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (matched_quantity >= 0.0),
  unmatched_gap NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (unmatched_gap >= 0.0),
  supplier_count INT NOT NULL DEFAULT 0 CHECK (supplier_count >= 0),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_procurement_opportunities CHECK (
    commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
    AND (notes IS NULL OR notes !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y')
  )
);

CREATE INDEX IF NOT EXISTS idx_po_snapshot_id ON public.procurement_opportunities(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_po_demand_id ON public.procurement_opportunities(demand_id);
CREATE INDEX IF NOT EXISTS idx_po_buyer_id ON public.procurement_opportunities(buyer_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.procurement_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_po_priority_score ON public.procurement_opportunities(priority_score DESC);

-- ------------------------------------------------------------------------------
-- 5. PROCUREMENT RECOMMENDATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procurement_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.procurement_intelligence_snapshots(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.procurement_opportunities(id) ON DELETE SET NULL,
  demand_id VARCHAR(100),
  recommendation_type VARCHAR(50) NOT NULL CHECK (
    recommendation_type IN (
      'DIRECT_OFFTAKE',
      'SPLIT_ORDER_SOURCING',
      'COOPERATIVE_AGGREGATION',
      'PROCESSOR_COMMISSIONING',
      'INTER_STATE_CORRIDOR_OFFTAKE',
      'PRICE_MONITORING_HOLD',
      'SUPPLIER_DIVERSIFICATION_REVIEW'
    )
  ),
  title VARCHAR(255) NOT NULL,
  details TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
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
  CONSTRAINT chk_no_pork_procurement_recommendations CHECK (
    title !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
    AND details !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
    AND suggested_action !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_pr_snapshot_id ON public.procurement_recommendations(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_pr_opportunity_id ON public.procurement_recommendations(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON public.procurement_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_pr_type ON public.procurement_recommendations(recommendation_type);

CREATE TRIGGER set_procurement_recommendations_updated_at
  BEFORE UPDATE ON public.procurement_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. IMMUTABILITY TRIGGERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_procurement_intelligence_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Procurement intelligence snapshots are strictly immutable audit records.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only system administrators may purge procurement intelligence snapshots.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_procurement_snapshot_immutability ON public.procurement_intelligence_snapshots;
CREATE TRIGGER enforce_procurement_snapshot_immutability
  BEFORE UPDATE OR DELETE ON public.procurement_intelligence_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prevent_procurement_intelligence_snapshot_mutation();

CREATE OR REPLACE FUNCTION public.prevent_procurement_opportunities_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Procurement opportunity audit records are immutable once generated.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only system administrators may delete procurement opportunity records.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_procurement_opportunities_immutability ON public.procurement_opportunities;
CREATE TRIGGER enforce_procurement_opportunities_immutability
  BEFORE UPDATE OR DELETE ON public.procurement_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.prevent_procurement_opportunities_mutation();

-- ------------------------------------------------------------------------------
-- 7. ROW-LEVEL SECURITY POLICIES (Privacy-Conscious Protection)
-- ------------------------------------------------------------------------------
ALTER TABLE public.procurement_intelligence_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_recommendations ENABLE ROW LEVEL SECURITY;

-- Snapshots: Authenticated users view their own records or non-sensitive public records; Admins see all
DROP POLICY IF EXISTS "Users read relevant procurement snapshots" ON public.procurement_intelligence_snapshots;
CREATE POLICY "Users read relevant procurement snapshots"
  ON public.procurement_intelligence_snapshots
  FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR (metadata->>'is_public')::boolean = true
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "System role and authenticated service insert procurement snapshots" ON public.procurement_intelligence_snapshots;
CREATE POLICY "System role and authenticated service insert procurement snapshots"
  ON public.procurement_intelligence_snapshots
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Opportunities: Authenticated users view their own opportunities or public/admin
DROP POLICY IF EXISTS "Users read relevant procurement opportunities" ON public.procurement_opportunities;
CREATE POLICY "Users read relevant procurement opportunities"
  ON public.procurement_opportunities
  FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR (metadata->>'is_public')::boolean = true
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "System role and authenticated service insert procurement opportunities" ON public.procurement_opportunities;
CREATE POLICY "System role and authenticated service insert procurement opportunities"
  ON public.procurement_opportunities
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Recommendations: Authenticated users read relevant recommendations
DROP POLICY IF EXISTS "Users read procurement recommendations" ON public.procurement_recommendations;
CREATE POLICY "Users read procurement recommendations"
  ON public.procurement_recommendations
  FOR SELECT
  USING (
    auth.role() IN ('authenticated', 'service_role')
  );

DROP POLICY IF EXISTS "System role and authenticated service insert procurement recommendations" ON public.procurement_recommendations;
CREATE POLICY "System role and authenticated service insert procurement recommendations"
  ON public.procurement_recommendations
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "Authenticated users update procurement recommendations" ON public.procurement_recommendations;
CREATE POLICY "Authenticated users update procurement recommendations"
  ON public.procurement_recommendations
  FOR UPDATE
  USING (auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
