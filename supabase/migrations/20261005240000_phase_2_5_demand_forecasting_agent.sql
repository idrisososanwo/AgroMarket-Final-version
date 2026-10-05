-- ==============================================================================
-- AGROMARKET PHASE 2.5: DEMAND FORECASTING & DEMAND INTELLIGENCE AGENT
-- Schema for Demand Forecasting Agent Registration, Demand Intelligence Snapshots,
-- Constraints, Immutability, and RLS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REGISTER DEMAND FORECASTING AGENT IN REGISTRY
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
    'DEMAND_FORECASTING_AGENT',
    'Specialized Demand Forecasting & Demand Intelligence Agent',
    '1.0.0',
    'Analyzes observed agricultural demand across consumer, B2B, shared-purchase and regional activity to identify demand trends, forecast near-term demand conditions, quantify uncertainty, and provide evidence-grounded decision support.',
    ARRAY[
      'CONSUMER_DEMAND_ANALYSIS',
      'B2B_DEMAND_TRACKING',
      'SHARED_PURCHASE_DEMAND_INDEXING',
      'DEMAND_TREND_DETECTION',
      'DEMAND_PRESSURE_INDEXING',
      'DEMAND_VOLATILITY_ANALYSIS',
      'UNMET_DEMAND_MONITORING',
      'DETERMINISTIC_FORECASTING',
      'EVIDENCE_PACKAGING',
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

-- Update legacy alias DEMAND_FORECASTING if present
UPDATE public.agricultural_intelligence_agents
SET
  version = '1.0.0',
  description = 'Analyzes observed agricultural demand across consumer, B2B, shared-purchase and regional activity to identify demand trends, forecast near-term demand conditions, quantify uncertainty, and provide evidence-grounded decision support.',
  capabilities = ARRAY[
    'CONSUMER_DEMAND_ANALYSIS',
    'B2B_DEMAND_TRACKING',
    'SHARED_PURCHASE_DEMAND_INDEXING',
    'DEMAND_TREND_DETECTION',
    'DEMAND_PRESSURE_INDEXING',
    'DEMAND_VOLATILITY_ANALYSIS',
    'UNMET_DEMAND_MONITORING',
    'DETERMINISTIC_FORECASTING',
    'EVIDENCE_PACKAGING',
    'ADVISORY_RECOMMENDATION'
  ],
  status = 'ACTIVE',
  updated_at = timezone('utc'::text, now())
WHERE id = 'DEMAND_FORECASTING';

-- ------------------------------------------------------------------------------
-- 2. EXPAND AGRICULTURAL INTELLIGENCE SIGNALS CONSTRAINT
-- ------------------------------------------------------------------------------
ALTER TABLE public.agricultural_intelligence_signals 
  DROP CONSTRAINT IF EXISTS agricultural_intelligence_signals_signal_type_check;

ALTER TABLE public.agricultural_intelligence_signals 
  ADD CONSTRAINT agricultural_intelligence_signals_signal_type_check 
  CHECK (
    signal_type IN (
      'PRICE_INCREASE',
      'PRICE_DECREASE',
      'DEMAND_INCREASE',
      'DEMAND_DECREASE',
      'SUPPLY_SHORTAGE',
      'SUPPLY_SURPLUS',
      'PROCESSING_BOTTLENECK',
      'LOGISTICS_DISRUPTION',
      'SECURITY_DISRUPTION',
      'DISEASE_RISK',
      'SEASONAL_DEMAND',
      'DEMAND_VOLATILITY',
      'UNMET_DEMAND',
      'B2B_DEMAND_INCREASE'
    )
  );

-- ------------------------------------------------------------------------------
-- 3. DEMAND INTELLIGENCE SNAPSHOTS TABLE (Append-Only Evaluation History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demand_intelligence_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  demand_pressure_score NUMERIC(5, 2) NOT NULL CHECK (demand_pressure_score BETWEEN 0.0 AND 100.0),
  demand_pressure_level VARCHAR(30) NOT NULL CHECK (
    demand_pressure_level IN ('LOW', 'MODERATE', 'ELEVATED', 'ACUTE', 'CRITICAL')
  ),
  forecast_direction VARCHAR(30) NOT NULL CHECK (
    forecast_direction IN ('SHARP_INCREASE', 'MODERATE_INCREASE', 'STABLE', 'MODERATE_DECREASE', 'SHARP_DECREASE', 'INSUFFICIENT_DATA')
  ),
  forecast_confidence NUMERIC(4, 3) NOT NULL CHECK (forecast_confidence BETWEEN 0.0 AND 1.0),
  forecast_horizon_days INT NOT NULL DEFAULT 7 CHECK (forecast_horizon_days IN (7, 14, 30)),
  predicted_demand_volume NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (predicted_demand_volume >= 0.0),
  volume_unit VARCHAR(30) NOT NULL DEFAULT 'KG',
  b2b_demand_volume NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (b2b_demand_volume >= 0.0),
  consumer_orders_count INT NOT NULL DEFAULT 0 CHECK (consumer_orders_count >= 0),
  consumer_orders_volume NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (consumer_orders_volume >= 0.0),
  shared_purchase_demand_volume NUMERIC(14, 2) NOT NULL DEFAULT 0.0 CHECK (shared_purchase_demand_volume >= 0.0),
  volatility_level VARCHAR(30) NOT NULL CHECK (
    volatility_level IN ('LOW', 'MODERATE', 'HIGH', 'INSUFFICIENT_DATA')
  ),
  unmet_demand_detected BOOLEAN NOT NULL DEFAULT false,
  demand_concentration VARCHAR(50) NOT NULL DEFAULT 'BALANCED',
  confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
  drivers TEXT[] NOT NULL DEFAULT '{}',
  risks TEXT[] NOT NULL DEFAULT '{}',
  evidence_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Anti-pork check constraint
  CONSTRAINT chk_no_pork_demand_intelligence_snapshots CHECK (
    commodity !~* '\y(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\y'
  )
);

CREATE INDEX IF NOT EXISTS idx_dis_commodity_state ON public.demand_intelligence_snapshots(commodity, state, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dis_pressure_level ON public.demand_intelligence_snapshots(demand_pressure_level);
CREATE INDEX IF NOT EXISTS idx_dis_forecast_dir ON public.demand_intelligence_snapshots(forecast_direction);
CREATE INDEX IF NOT EXISTS idx_dis_volatility ON public.demand_intelligence_snapshots(volatility_level);

-- ------------------------------------------------------------------------------
-- 4. IMMUTABILITY TRIGGER FOR DEMAND INTELLIGENCE SNAPSHOTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_demand_intelligence_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Demand intelligence snapshots are strictly immutable audit records.';
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only system administrators may purge demand intelligence snapshot records.';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_demand_intelligence_snapshot_immutability ON public.demand_intelligence_snapshots;
CREATE TRIGGER enforce_demand_intelligence_snapshot_immutability
  BEFORE UPDATE OR DELETE ON public.demand_intelligence_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.prevent_demand_intelligence_snapshot_mutation();

-- ------------------------------------------------------------------------------
-- 5. ROW-LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.demand_intelligence_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for verified demand intelligence snapshots" ON public.demand_intelligence_snapshots;
CREATE POLICY "Public read access for verified demand intelligence snapshots"
  ON public.demand_intelligence_snapshots
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "System role and authenticated service insert demand intelligence snapshots" ON public.demand_intelligence_snapshots;
CREATE POLICY "System role and authenticated service insert demand intelligence snapshots"
  ON public.demand_intelligence_snapshots
  FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
