-- ==============================================================================
-- AGROMARKET PHASE 2.4: PRODUCTION PLANNING & FARM INTELLIGENCE AGENT
-- Schema for Production Planning Agent Registration, Production Plans/Snapshots,
-- Constraints, Immutability, and RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTER PRODUCTION PLANNING AGENT IN REGISTRY
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
    'PRODUCTION_PLANNING_AGENT',
    'Specialized Production Planning & Farm Intelligence Agent',
    '1.0.0',
    'Interprets agricultural production conditions, market signals, production context, seasonality, input availability, and observed risks to provide evidence-grounded production planning recommendations.',
    ARRAY[
      'PRODUCTION_CONTEXT_ANALYSIS',
      'MARKET_SIGNAL_INTEGRATION',
      'OPPORTUNITY_SCORING',
      'RISK_FACTOR_EVALUATION',
      'INPUT_CONSTRAINT_MONITORING',
      'SEASONAL_WINDOW_ALIGNMENT',
      'ADVISORY_RECOMMENDATION'
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

-- Update legacy alias PRODUCTION_PLANNING if present
UPDATE public.agricultural_intelligence_agents
SET
  version = '1.0.0',
  description = 'Interprets agricultural production conditions, market signals, production context, seasonality, input availability, and observed risks to provide evidence-grounded production planning recommendations.',
  capabilities = ARRAY[
    'PRODUCTION_CONTEXT_ANALYSIS',
    'MARKET_SIGNAL_INTEGRATION',
    'OPPORTUNITY_SCORING',
    'RISK_FACTOR_EVALUATION',
    'INPUT_CONSTRAINT_MONITORING',
    'SEASONAL_WINDOW_ALIGNMENT',
    'ADVISORY_RECOMMENDATION'
  ],
  status = 'ACTIVE',
  updated_at = timezone('utc'::text, now())
WHERE id = 'PRODUCTION_PLANNING';

-- ------------------------------------------------------------------------------
-- 2. PRODUCTION PLANNING SNAPSHOTS TABLE (Append-Only Evaluation History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.production_planning_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  domain VARCHAR(30) NOT NULL DEFAULT 'CROPS' CHECK (
    domain IN ('CROPS', 'LIVESTOCK', 'POULTRY', 'AQUACULTURE', 'MIXED')
  ),
  opportunity_score NUMERIC(5, 2) NOT NULL CHECK (opportunity_score BETWEEN 0.0 AND 100.0),
  risk_score NUMERIC(5, 2) NOT NULL CHECK (risk_score BETWEEN 0.0 AND 100.0),
  opportunity_level VARCHAR(30) NOT NULL CHECK (
    opportunity_level IN ('LOW', 'MODERATE', 'ATTRACTIVE', 'HIGH_OPPORTUNITY')
  ),
  risk_level VARCHAR(30) NOT NULL CHECK (
    risk_level IN ('LOW', 'MODERATE', 'ELEVATED', 'HIGH_RISK')
  ),
  market_demand_status VARCHAR(30) NOT NULL,
  supply_balance_status VARCHAR(30) NOT NULL,
  seasonal_alignment VARCHAR(30) NOT NULL CHECK (
    seasonal_alignment IN ('PEAK_WINDOW', 'ACTIVE_SEASON', 'OFF_SEASON', 'INSUFFICIENT_DATA')
  ),
  input_constraint_level VARCHAR(30) NOT NULL CHECK (
    input_constraint_level IN ('NONE', 'MODERATE', 'SEVERE', 'INSUFFICIENT_DATA')
  ),
  processing_constraint_level VARCHAR(30) NOT NULL CHECK (
    processing_constraint_level IN ('NONE', 'MODERATE', 'BOTTLENECK', 'INSUFFICIENT_DATA')
  ),
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  opportunities TEXT[] NOT NULL DEFAULT '{}',
  risks TEXT[] NOT NULL DEFAULT '{}',
  constraints TEXT[] NOT NULL DEFAULT '{}',
  evidence_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_production_planning_snapshots CHECK (
    commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_pps_commodity_state ON public.production_planning_snapshots(commodity, state, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pps_domain ON public.production_planning_snapshots(domain);
CREATE INDEX IF NOT EXISTS idx_pps_opportunity_level ON public.production_planning_snapshots(opportunity_level);
CREATE INDEX IF NOT EXISTS idx_pps_risk_level ON public.production_planning_snapshots(risk_level);

-- ------------------------------------------------------------------------------
-- 3. IMMUTABILITY TRIGGER FOR PRODUCTION PLANNING SNAPSHOTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_production_planning_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Production planning snapshots are strictly immutable audit records.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only system administrators may purge production planning snapshot records.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_production_planning_snapshot_immutability ON public.production_planning_snapshots;
CREATE TRIGGER enforce_production_planning_snapshot_immutability
  BEFORE UPDATE OR DELETE ON public.production_planning_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prevent_production_planning_snapshot_mutation();

-- ------------------------------------------------------------------------------
-- 4. ROW-LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.production_planning_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for verified production planning snapshots" ON public.production_planning_snapshots;
CREATE POLICY "Public read access for verified production planning snapshots"
  ON public.production_planning_snapshots
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "System role and authenticated service insert production planning snapshots" ON public.production_planning_snapshots;
CREATE POLICY "System role and authenticated service insert production planning snapshots"
  ON public.production_planning_snapshots
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
