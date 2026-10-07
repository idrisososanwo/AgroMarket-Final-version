/**
 * AgroMarket Phase 3.5: Agricultural Memory & Historical Intelligence Layer
 * Domain Models, Time-Series Contracts, and Baseline Governance
 *
 * SAFETY & ARCHITECTURAL INVARIANTS:
 * 1. STRICT DISTINCTION: Differentiates EVENT vs SNAPSHOT vs CURRENT STATE.
 * 2. NO FAKE DATA: Returns INSUFFICIENT_DATA or NO_DATA when data does not exist.
 * 3. NO CAUSAL CLAIMS: Repeated correlation is never reported as confirmed causation.
 * 4. ANTI-PORK ZERO TOLERANCE: Zero pig/pork produce across all memory, queries, and filters.
 * 5. REGIONAL AGGREGATION: Safe LGA/State/National levels; zero private farm coordinates or phone numbers.
 * 6. DETERMINISTIC COMPUTATION: All baseline metrics, z-scores, and variances use pure deterministic math.
 */

import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { FeedbackDomain } from "@/features/intelligence-feedback/types";

export type NigerianState = (typeof NIGERIAN_STATES)[number];

// -----------------------------------------------------------------------------
// 1. TEMPORAL HORIZONS & TIME WINDOWS
// -----------------------------------------------------------------------------

export const HISTORICAL_TIME_HORIZONS = [
  "LAST_7_DAYS",
  "LAST_30_DAYS",
  "LAST_90_DAYS",
  "LAST_365_DAYS",
  "CUSTOM",
] as const;

export type HistoricalTimeHorizon = (typeof HISTORICAL_TIME_HORIZONS)[number];

// -----------------------------------------------------------------------------
// 2. TEMPORAL DATA TYPES (EVENT vs SNAPSHOT vs CURRENT STATE)
// -----------------------------------------------------------------------------

export const TEMPORAL_RECORD_TYPES = [
  "EVENT",          // Discrete historical incident (e.g. security incident, weather disruption, biosecurity notice)
  "SNAPSHOT",       // Periodic analytical state at a point in time (e.g. daily/weekly state price index, corridor delay)
  "CURRENT_STATE",   // Live mutable operational state (e.g. active inventory, pending B2B demand)
] as const;

export type TemporalRecordType = (typeof TEMPORAL_RECORD_TYPES)[number];

// -----------------------------------------------------------------------------
// 3. HISTORICAL DATA STATES
// -----------------------------------------------------------------------------

export const HISTORICAL_DATA_STATES = [
  "EVALUATED",          // Sufficient historical sample meeting statistical confidence
  "PARTIAL_DATA",       // Some observations exist, but incomplete temporal coverage
  "INSUFFICIENT_DATA",  // Sample count below minimum threshold for baseline
  "NO_DATA",            // Zero matching historical records found
] as const;

export type HistoricalDataState = (typeof HISTORICAL_DATA_STATES)[number];

// -----------------------------------------------------------------------------
// 4. COMPARISON DIRECTIONS
// -----------------------------------------------------------------------------

export const BASELINE_COMPARISON_DIRECTIONS = [
  "ELEVATED",   // Significantly above baseline (> +1.0 StdDev)
  "NORMAL",     // Within nominal baseline range ([-1.0, +1.0] StdDev)
  "DEPRESSED",  // Significantly below baseline (< -1.0 StdDev)
  "VOLATILE",   // High variance / erratic shifts
  "UNKNOWN",    // Insufficient baseline data to classify
] as const;

export type BaselineComparisonDirection = (typeof BASELINE_COMPARISON_DIRECTIONS)[number];

// -----------------------------------------------------------------------------
// 5. HISTORICAL BASELINE INTERFACES
// -----------------------------------------------------------------------------

export interface HistoricalBaselineSummary {
  metricName: string;
  domain: FeedbackDomain;
  commodity?: string | null;
  state?: string | null;
  lga?: string | null;
  timeHorizon: HistoricalTimeHorizon;
  timeCoverageDays: number;
  sampleCount: number;
  dataCompletenessRatio: number; // 0.0 - 1.0
  baselineConfidence: number;    // 0.0 - 1.0

  // Statistical distribution
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p25?: number;
  p75?: number;

  dataQualityFlags: string[];
  computedAt: string;
}

export interface CurrentVsBaselineComparison {
  metricName: string;
  domain: FeedbackDomain;
  commodity?: string | null;
  state?: string | null;
  currentValue: number;
  baselineValue: number | null;
  baselineSummary: HistoricalBaselineSummary | null;

  // Comparison metrics
  dataState: HistoricalDataState;
  absoluteDelta: number | null;
  percentageDelta: number | null;
  zScore: number | null; // Standard deviation distance from mean
  direction: BaselineComparisonDirection;
  interpretation: string;
  confidence: number;
  governanceNote: string;
}

// -----------------------------------------------------------------------------
// 6. HISTORICAL SIGNAL PATTERN INTERFACE
// -----------------------------------------------------------------------------

export interface HistoricalSignalPatternSummary {
  signalType: string;
  commodity?: string | null;
  state?: string | null;
  timeHorizon: HistoricalTimeHorizon;
  dataState: HistoricalDataState;
  frequencyCount: number;
  lastObservedAt: string | null;
  meanMagnitude: number | null;
  meanConfidence: number | null;

  // Recurrence & Confirmation metrics
  recurringLocations: Array<{ state: string; count: number }>;
  historicalConfirmationRate: number | null; // % of signals confirmed by outcome evidence
  associatedRecommendationsCount: number;
  summary: string;
}

// -----------------------------------------------------------------------------
// 7. HISTORICAL RECOMMENDATION TRACK RECORD
// -----------------------------------------------------------------------------

export interface HistoricalRecommendationTrackRecord {
  recommendationType: string;
  timeHorizon: HistoricalTimeHorizon;
  dataState: HistoricalDataState;
  totalGeneratedCount: number;

  // Historical decisions distribution
  decisionsSummary: {
    acceptedCount: number;
    rejectedCount: number;
    deferredCount: number;
    dismissedCount: number;
    acceptanceRate: number | null; // 0.0 - 1.0
  };

  // Real-world outcome verification
  outcomesSummary: {
    totalObservedOutcomesCount: number;
    completedSuccessCount: number;
    partialCount: number;
    failedCount: number;
    successRate: number | null; // 0.0 - 1.0
  };

  // Performance evaluation
  evaluationsSummary: {
    totalEvaluationsCount: number;
    meanEvaluationScore: number | null; // 0 - 100
    usefulnessRate: number | null;       // % USEFUL or VERY_USEFUL
  };

  answers: {
    whatHappenedHistorically: string;
    wasUsefulHistorically: string;
  };

  disclaimer: string;
}

// -----------------------------------------------------------------------------
// 8. QUERY FILTER PARAMETERS
// -----------------------------------------------------------------------------

export interface HistoricalQueryFilters {
  domain?: FeedbackDomain;
  commodity?: string;
  state?: string;
  lga?: string;
  agentId?: string;
  timeHorizon?: HistoricalTimeHorizon;
  fromDate?: string;
  toDate?: string;
  recordType?: TemporalRecordType;
  excludeLowQuality?: boolean;
  limit?: number;
}
