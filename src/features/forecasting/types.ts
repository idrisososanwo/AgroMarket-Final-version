/**
 * AgroMarket Phase 3.6: Multi-Horizon Forecasting & Predictive Intelligence Layer
 * Core Domain Contracts & Predictive Interfaces
 *
 * PIPELINE ALIGNMENT:
 * HISTORICAL MEMORY (Phase 3.5)
 * -> CURRENT CONDITIONS (Phase 2.1 - 3.1)
 * -> FORECAST (Phase 3.6)
 * -> FUTURE OUTCOME (Phase 3.4)
 * -> EVALUATION (Phase 3.4)
 * -> LEARNING (Phase 3.4)
 *
 * SAFETY INVARIANTS:
 * 1. ADVISORY ONLY: Forecasts are analytical guidance and never trigger autonomous actions.
 * 2. ZERO PORK TOLERANCE: Zero pig/pork commodities across all forecast models and queries.
 * 3. NO FAKE DATA: Returns INSUFFICIENT_DATA when sample count < 3 or data is sparse.
 * 4. DETERMINISTIC COMPUTATION: Pure transparent mathematical methods (moving averages, baselines, trends).
 * 5. IMMUTABILITY & VERSIONING: Forecasts are never silently overwritten; version increments with lineage.
 * 6. PRIVACY SAFEGUARDS: Regional/state/LGA aggregates only; zero raw GPS coordinates or phone numbers.
 */

import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { HistoricalBaselineSummary } from "@/features/historical-intelligence/types";

export type NigerianState = (typeof NIGERIAN_STATES)[number];

// -----------------------------------------------------------------------------
// 1. TIME HORIZONS
// -----------------------------------------------------------------------------

export const FORECAST_TIME_HORIZONS = [
  "SHORT_TERM_0_7D",   // 0–7 days (tactical dispatch, spot pricing, immediate off-take)
  "MEDIUM_TERM_8_30D",  // 8–30 days (aggregation cycles, monthly B2B demand, regional corridor routing)
  "LONG_TERM_31_90D",  // 31–90 days (seasonal planting/harvest, supply hedging, quarterly food reserves)
  "CUSTOM",
] as const;

export type ForecastTimeHorizon = (typeof FORECAST_TIME_HORIZONS)[number];

// -----------------------------------------------------------------------------
// 2. FORECAST STATUS LIFECYCLE
// -----------------------------------------------------------------------------

export const FORECAST_STATUSES = [
  "DRAFT",              // Initial computation under staging or validation
  "ACTIVE",             // Active authoritative advisory forecast
  "PENDING",            // Awaiting verification or outcome horizon arrival
  "EXPIRED",            // Horizon has passed without evaluation
  "EVALUATED",          // Verified against observed outcome in Phase 3.4
  "INSUFFICIENT_DATA",   // Cannot generate forecast due to data sparsity or quality guards
  "CANCELLED",          // Invalidated by data quality quarantine or anomaly detection
] as const;

export type ForecastStatus = (typeof FORECAST_STATUSES)[number];

// -----------------------------------------------------------------------------
// 3. FORECAST DIRECTIONS
// -----------------------------------------------------------------------------

export const FORECAST_DIRECTIONS = [
  "INCREASING",
  "DECREASING",
  "STABLE",
  "VOLATILE",
  "UNKNOWN",
] as const;

export type ForecastDirection = (typeof FORECAST_DIRECTIONS)[number];

// -----------------------------------------------------------------------------
// 4. CONFIDENCE LEVELS
// -----------------------------------------------------------------------------

export const FORECAST_CONFIDENCE_LEVELS = [
  "HIGH",               // Extensive sample size, high data completeness, strong trend convergence
  "MODERATE",           // Adequate sample size meeting baseline threshold
  "LOW",                // Meets minimum sample size but high variance or partial temporal coverage
  "INSUFFICIENT_DATA",   // Below threshold (N < 3), zero confidence
] as const;

export type ForecastConfidenceLevel = (typeof FORECAST_CONFIDENCE_LEVELS)[number];

// -----------------------------------------------------------------------------
// 5. DETERMINISTIC FORECASTING METHODS
// -----------------------------------------------------------------------------

export const FORECASTING_METHODS = [
  "HISTORICAL_BASELINE_COMPARISON", // Compares current value against Phase 3.5 statistical baseline
  "MOVING_AVERAGE",                // Simple rolling average over observations
  "WEIGHTED_MOVING_AVERAGE",       // Recency-weighted moving average
  "EXPONENTIALLY_WEIGHTED_TREND",  // Exponential smoothing with alpha factor
  "TREND_EXTRAPOLATION",           // Linear slope projection over time window
  "SEASONAL_BASELINE_COMPARISON",  // Seasonally adjusted cyclical baseline comparison
] as const;

export type ForecastingMethod = (typeof FORECASTING_METHODS)[number];

// -----------------------------------------------------------------------------
// 6. DOMAINS
// -----------------------------------------------------------------------------

export type ForecastDomain =
  | "MARKET"
  | "DEMAND"
  | "SUPPLY"
  | "PRODUCTION"
  | "LOGISTICS"
  | "FOOD_SECURITY"
  | "DISEASE_BIOSECURITY"
  | "PROCUREMENT";

// -----------------------------------------------------------------------------
// 7. FORECAST EVIDENCE
// -----------------------------------------------------------------------------

export interface ForecastEvidence {
  sourceType: string;
  sourceId: string;
  description: string;
  observedAt: string;
  relevance: number; // 0.0 to 1.0
  provenance: "OBSERVED" | "DERIVED" | "CORRELATED" | "ESTIMATED" | "UNKNOWN";
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// 8. MULTI-HORIZON FORECAST CONTRACT
// -----------------------------------------------------------------------------

export interface MultiHorizonForecast {
  id: string;
  domain: ForecastDomain;
  metricName: string;
  commodity: string;
  category?: string | null;
  state: string;
  lga?: string | null;
  corridor?: string | null;
  timeHorizon: ForecastTimeHorizon;
  forecastPeriodDays: number;
  forecastStartDate: string;
  forecastEndDate: string;
  targetDate: string;

  // Quantitative Predictions (null if INSUFFICIENT_DATA or qualitative only)
  currentValue: number | null;
  baselineValue: number | null;
  predictedValue: number | null;
  predictedRangeLow: number | null;
  predictedRangeHigh: number | null;
  expectedDelta: number | null;
  expectedPercentageDelta: number | null;

  // Directional & Confidence Intelligence
  direction: ForecastDirection;
  confidence: number; // 0.0 to 1.0 (0.0 if INSUFFICIENT_DATA)
  confidenceLevel: ForecastConfidenceLevel;

  // Statistical & Provenance Attributes
  sampleSize: number;
  dataCompleteness: number; // 0.0 to 1.0
  baselineId?: string | null;
  baselineSummary?: HistoricalBaselineSummary | null;
  methodName: ForecastingMethod;
  evidence: ForecastEvidence[];

  // Lifecycle & Lineage
  status: ForecastStatus;
  version: number;
  previousForecastId?: string | null;
  evaluationStatus: "PENDING" | "EVALUATED" | "NOT_EVALUABLE";
  errorMetrics?: ForecastErrorMetrics | null;

  // Governance & Advisory Disclaimers
  explanation: string;
  limitations: string;
  governanceNote: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 9. FORECAST ERROR METRICS & EVALUATION
// -----------------------------------------------------------------------------

export interface ForecastErrorMetrics {
  actualValue: number;
  absoluteError: number;
  percentageError: number | null; // null if actual is 0 or invalid
  directionAccurate: boolean;
  withinRange: boolean;
  evaluationScore: number; // 0.0 to 1.0
  evaluatedAt: string;
}

export interface ForecastEvaluationResult {
  forecastId: string;
  outcomeId?: string;
  status: "EVALUATED" | "NOT_EVALUABLE" | "INSUFFICIENT_DATA";
  actualValue: number | null;
  predictedValue: number | null;
  errorMetrics: ForecastErrorMetrics | null;
  varianceAnalysis: string;
  evaluationNotes: string;
  learningSignalSuggested: boolean;
  evaluatedAt: string;
}

// -----------------------------------------------------------------------------
// 10. FORECAST GENERATION OPTIONS
// -----------------------------------------------------------------------------

export interface ForecastGenerationOptions {
  domain: ForecastDomain;
  metricName: string;
  commodity: string;
  category?: string;
  state?: string;
  lga?: string;
  corridor?: string;
  timeHorizon: ForecastTimeHorizon;
  method?: ForecastingMethod;
  agentId?: string;
  customHorizonDays?: number;
  seasonalityFactor?: number;
}
