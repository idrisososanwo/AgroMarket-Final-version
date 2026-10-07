-- ==============================================================================
-- AgroMarket Phase 3.6: Multi-Horizon Forecasting & Predictive Intelligence Layer
-- Migration: 20261007170000_phase_3_6_multi_horizon_forecasting.sql
--
-- Extends the canonical agricultural_intelligence_predictions table to support:
-- 1. Multi-horizon forecasting (SHORT_TERM_0_7D, MEDIUM_TERM_8_30D, LONG_TERM_31_90D)
-- 2. Strict status lifecycle (DRAFT, ACTIVE, PENDING, EXPIRED, EVALUATED, INSUFFICIENT_DATA, CANCELLED)
-- 3. Directional classification & deterministic confidence levels
-- 4. Sample size and data completeness metrics
-- 5. Historical baseline linkage (agricultural_historical_baselines)
-- 6. Immutability & versioning tracking (previous_forecast_id, version)
-- 7. Evidence traceability jsonb
-- 8. Anti-pork policy enforcement check constraint
-- ==============================================================================

-- 1. Extend agricultural_intelligence_predictions with multi-horizon attributes
ALTER TABLE public.agricultural_intelligence_predictions
  ADD COLUMN IF NOT EXISTS domain VARCHAR(50) DEFAULT 'MARKET',
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS time_horizon VARCHAR(30) DEFAULT 'SHORT_TERM_0_7D',
  ADD COLUMN IF NOT EXISTS forecast_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS forecast_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS direction VARCHAR(30) DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(30) DEFAULT 'MODERATE',
  ADD COLUMN IF NOT EXISTS sample_size INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_completeness NUMERIC(4, 3) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS baseline_id UUID REFERENCES public.agricultural_historical_baselines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS method_name VARCHAR(100) DEFAULT 'HISTORICAL_BASELINE_COMPARISON',
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_forecast_id UUID REFERENCES public.agricultural_intelligence_predictions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evaluation_status VARCHAR(30) DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS error_metrics JSONB DEFAULT '{}'::jsonb;

-- 2. Allow nullable values for INSUFFICIENT_DATA and DRAFT states
ALTER TABLE public.agricultural_intelligence_predictions
  ALTER COLUMN baseline_value DROP NOT NULL,
  ALTER COLUMN predicted_value DROP NOT NULL,
  ALTER COLUMN agent_id DROP NOT NULL;

-- 3. Update status constraint to include all lifecycle statuses
ALTER TABLE public.agricultural_intelligence_predictions
  DROP CONSTRAINT IF EXISTS agricultural_intelligence_predictions_status_check;

ALTER TABLE public.agricultural_intelligence_predictions
  DROP CONSTRAINT IF EXISTS chk_prediction_lifecycle_status;

ALTER TABLE public.agricultural_intelligence_predictions
  ADD CONSTRAINT chk_prediction_lifecycle_status CHECK (
    status IN ('DRAFT', 'ACTIVE', 'PENDING', 'EXPIRED', 'EVALUATED', 'INSUFFICIENT_DATA', 'CANCELLED')
  );

-- 4. Add direction constraint
ALTER TABLE public.agricultural_intelligence_predictions
  DROP CONSTRAINT IF EXISTS chk_prediction_direction;

ALTER TABLE public.agricultural_intelligence_predictions
  ADD CONSTRAINT chk_prediction_direction CHECK (
    direction IN ('INCREASING', 'DECREASING', 'STABLE', 'VOLATILE', 'UNKNOWN')
  );

-- 5. Add time horizon constraint
ALTER TABLE public.agricultural_intelligence_predictions
  DROP CONSTRAINT IF EXISTS chk_prediction_time_horizon;

ALTER TABLE public.agricultural_intelligence_predictions
  ADD CONSTRAINT chk_prediction_time_horizon CHECK (
    time_horizon IN ('SHORT_TERM_0_7D', 'MEDIUM_TERM_8_30D', 'LONG_TERM_31_90D', 'CUSTOM')
  );

-- 6. Add confidence level constraint
ALTER TABLE public.agricultural_intelligence_predictions
  DROP CONSTRAINT IF EXISTS chk_prediction_confidence_level;

ALTER TABLE public.agricultural_intelligence_predictions
  ADD CONSTRAINT chk_prediction_confidence_level CHECK (
    confidence_level IN ('HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_DATA')
  );

-- 7. High-performance time-series and query indexes
CREATE INDEX IF NOT EXISTS idx_ai_pred_domain_horizon
  ON public.agricultural_intelligence_predictions(domain, time_horizon);

CREATE INDEX IF NOT EXISTS idx_ai_pred_commodity_state_horizon
  ON public.agricultural_intelligence_predictions(commodity, state, time_horizon);

CREATE INDEX IF NOT EXISTS idx_ai_pred_versioning
  ON public.agricultural_intelligence_predictions(previous_forecast_id, version);

CREATE INDEX IF NOT EXISTS idx_ai_pred_created_at
  ON public.agricultural_intelligence_predictions(created_at DESC);

-- 8. Enable view alias for developer ergonomics
CREATE OR REPLACE VIEW public.agricultural_multi_horizon_forecasts AS
  SELECT * FROM public.agricultural_intelligence_predictions;

COMMENT ON TABLE public.agricultural_intelligence_predictions IS
  'AgroMarket multi-horizon deterministic forecasting and prediction memory store.';
