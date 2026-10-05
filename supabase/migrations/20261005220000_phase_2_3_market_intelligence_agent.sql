-- ==============================================================================
-- AGROMARKET PHASE 2.3: MARKET INTELLIGENCE AGENT FOUNDATION
-- Schema for Market Intelligence Agent Registration, Market Pressure Snapshots,
-- Constraints, Immutability, and RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTER MARKET INTELLIGENCE AGENT IN REGISTRY
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
    'MARKET_INTELLIGENCE_AGENT',
    'Specialized Market Intelligence Agent',
    '1.1.0',
    'Analyzes commodity wholesale price movements, regional differentials, supply/demand tightness, and computes composite market pressure indexes across Nigerian agricultural corridors.',
    ARRAY[
      'PRICE_TREND_ANALYSIS',
      'DEMAND_SIGNAL_DETECTION',
      'SUPPLY_SHORTAGE_MONITORING',
      'REGIONAL_MARKET_COMPARISON',
      'MARKET_PRESSURE_INDEXING',
      'EVIDENCE_PACKAGING',
      'ADVISORY_RECOMMENDATION'
    ],
    'ACTIVE',
    '{"primary_corridors": ["Northern Arterial", "Middle Belt", "South-West Food Belt", "Niger Delta Coast"], "currency": "NGN"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  version = EXCLUDED.version,
  description = EXCLUDED.description,
  capabilities = EXCLUDED.capabilities,
  status = 'ACTIVE',
  metadata = EXCLUDED.metadata,
  updated_at = timezone('utc'::text, now());

-- Update legacy alias if present
UPDATE public.agricultural_intelligence_agents
SET
  version = '1.1.0',
  description = 'Monitors wholesale commodity market trends, regional price spreads, and market pressure indexes across Nigerian agricultural corridors.',
  capabilities = ARRAY[
    'PRICE_TREND_ANALYSIS',
    'VOLATILITY_MONITORING',
    'PARITY_CALCULATION',
    'REGIONAL_MARKET_COMPARISON',
    'MARKET_PRESSURE_INDEXING'
  ],
  status = 'ACTIVE',
  updated_at = timezone('utc'::text, now())
WHERE id = 'MARKET_INTELLIGENCE';

-- ------------------------------------------------------------------------------
-- 2. MARKET PRESSURE SNAPSHOTS (Append-Only Historical Ledger)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.market_pressure_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  lga VARCHAR(50),
  corridor VARCHAR(100),
  price_pressure_score NUMERIC(5, 2) NOT NULL CHECK (price_pressure_score BETWEEN 0.0 AND 100.0),
  supply_pressure_score NUMERIC(5, 2) NOT NULL CHECK (supply_pressure_score BETWEEN 0.0 AND 100.0),
  demand_pressure_score NUMERIC(5, 2) NOT NULL CHECK (demand_pressure_score BETWEEN 0.0 AND 100.0),
  composite_pressure_index NUMERIC(5, 2) NOT NULL CHECK (composite_pressure_index BETWEEN 0.0 AND 100.0),
  pressure_level VARCHAR(20) NOT NULL CHECK (pressure_level IN ('LOW', 'MODERATE', 'ELEVATED', 'ACUTE', 'CRITICAL')),
  contributing_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_no_pork_market_pressure CHECK (
    commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_market_pressure_commodity_state 
  ON public.market_pressure_snapshots(commodity, state, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_market_pressure_index 
  ON public.market_pressure_snapshots(composite_pressure_index DESC);

CREATE INDEX IF NOT EXISTS idx_market_pressure_level 
  ON public.market_pressure_snapshots(pressure_level);

-- Immutability trigger for market pressure snapshots
CREATE OR REPLACE FUNCTION public.prevent_market_pressure_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Market pressure snapshots are historical ledgers and strictly immutable.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only system administrators may purge market pressure snapshots.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_market_pressure_snapshot_immutability
  BEFORE UPDATE OR DELETE ON public.market_pressure_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prevent_market_pressure_snapshot_mutation();

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.market_pressure_snapshots ENABLE ROW LEVEL SECURITY;

-- Transparent read access for all authenticated users (decision-support infrastructure)
CREATE POLICY "Authenticated users can view market pressure snapshots"
  ON public.market_pressure_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

-- Also allow public viewing for transparent market pricing
CREATE POLICY "Public users can view market pressure snapshots"
  ON public.market_pressure_snapshots
  FOR SELECT
  TO anon
  USING (true);

-- Inserts are restricted to authenticated operators or admins
CREATE POLICY "Authenticated users and services can record pressure snapshots"
  ON public.market_pressure_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins retain full management authority
CREATE POLICY "Admins have full access to market_pressure_snapshots"
  ON public.market_pressure_snapshots
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
