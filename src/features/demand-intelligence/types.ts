/**
 * AgroMarket Phase 2.5: Demand Forecasting & Demand Intelligence Agent
 * Domain Types & Data Contracts
 *
 * Implements:
 * OBSERVE -> NORMALIZE -> DETECT -> FORECAST -> INTERPRET -> RECOMMEND -> HUMAN ACTION -> OUTCOME -> EVALUATION
 *
 * Rules:
 * - Deterministic demand calculations remain authoritative.
 * - AI reasoning is strictly advisory, non-autonomous, and routed via Phase 2.2 AI Gateway.
 * - Zero pig/pork tolerance across all domain models, schemas, and outputs.
 * - Privacy-preserving: aggregated evidence only; no private buyer identities or private order logs exposed.
 * - Handles data sparsity gracefully (LOW_CONFIDENCE, INSUFFICIENT_EVIDENCE, INSUFFICIENT_DATA).
 */

import {
  IntelligenceSignal,
  IntelligenceRecommendation,
} from "@/features/intelligence/types";
import { StructuredReasoningOutput } from "@/features/intelligence/reasoning-contracts";

export type DemandPressureLevel = "LOW" | "MODERATE" | "ELEVATED" | "ACUTE" | "CRITICAL";

export type DemandTrendDirection =
  | "SHARP_INCREASE"
  | "MODERATE_INCREASE"
  | "STABLE"
  | "MODERATE_DECREASE"
  | "SHARP_DECREASE"
  | "INSUFFICIENT_DATA";

export type DemandTrendClassification =
  | "ISOLATED_SPIKE"
  | "SHORT_TERM_INCREASE"
  | "SUSTAINED_INCREASE"
  | "SEASONAL_INCREASE"
  | "REGIONAL_INCREASE"
  | "B2B_DRIVEN_INCREASE"
  | "CONSUMER_DRIVEN_INCREASE"
  | "STABLE"
  | "DECLINING"
  | "INSUFFICIENT_EVIDENCE";

export type DemandVolatilityLevel = "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_DATA";

export type DemandConcentrationLevel =
  | "CONCENTRATED_REGIONAL"
  | "CONCENTRATED_B2B"
  | "BALANCED"
  | "INSUFFICIENT_DATA";

export type DemandChannelType =
  | "CONSUMER_DEMAND"
  | "B2B_DEMAND"
  | "SHARED_PURCHASE_DEMAND"
  | "REGIONAL_DEMAND"
  | "SEASONAL_DEMAND"
  | "AGGREGATED_DEMAND"
  | "INSUFFICIENT_EVIDENCE";

/**
 * Deterministic Demand Trend Analysis
 */
export interface DemandTrendResult {
  commodity: string;
  state: string;
  canonicalUnit: string;
  currentPeriodVolume30d: number;
  previousPeriodVolume30d: number;
  volume7d: number;
  volume90d: number;
  percentageChange30d: number | null;
  percentageChange7d: number | null;
  direction: DemandTrendDirection;
  classification: DemandTrendClassification;
  observationCount: number;
  confidence: number; // 0.0 to 1.0
  calibratedObservation: string;
}

/**
 * Deterministic Demand Pressure Score (0 to 100) & Factor Breakdown
 */
export interface DemandPressureScore {
  commodity: string;
  state: string;
  score: number; // 0.0 to 100.0
  level: DemandPressureLevel;
  growthFactor: number; // 0.0 to 100.0 (35% weight)
  b2bVolumeFactor: number; // 0.0 to 100.0 (30% weight)
  orderFrequencyFactor: number; // 0.0 to 100.0 (20% weight)
  unmetDemandFactor: number; // 0.0 to 100.0 (15% weight)
  confidence: number; // 0.0 to 1.0
  drivers: string[];
  risks: string[];
  calculatedAt: string;
}

/**
 * Demand Volatility Analysis
 */
export interface DemandVolatilityResult {
  level: DemandVolatilityLevel;
  coefficientOfVariation: number | null;
  explanation: string;
}

/**
 * Demand Concentration Analysis
 */
export interface DemandConcentrationResult {
  level: DemandConcentrationLevel;
  topSegmentSharePercent: number | null;
  calibratedStatement: string;
}

/**
 * Unmet Demand Signal
 */
export interface UnmetDemandResult {
  unmetDemandDetected: boolean;
  activeB2BQuantity: number;
  activeCartInterestQuantity: number;
  activeSupplyQuantity: number;
  deficitQuantity: number | null;
  unit: string;
  calibratedNote: string;
}

/**
 * Deterministic Demand Forecast
 */
export interface DemandForecastResult {
  commodity: string;
  state: string;
  forecastHorizonDays: number; // 7, 14, 30
  predictedDemandVolume: number;
  volumeUnit: string;
  confidenceScore: number; // 0.0 to 1.0
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH" | "INSUFFICIENT_DATA";
  forecastDirection: DemandTrendDirection;
  method: string;
  dailyAverageVolume: number;
  sampleOrderCount: number;
  explanation: string;
  limitations: string;
}

/**
 * Channel Breakdown: Consumer vs B2B vs Shared Purchase
 */
export interface DemandChannelsSummary {
  consumer: {
    ordersCount: number;
    volume: number;
    unit: string;
    activeCartCount: number;
  };
  b2b: {
    activeDemandsCount: number;
    requestedVolume: number;
    unit: string;
    fulfilledCount: number;
  };
  sharedPurchase: {
    activePoolsCount: number;
    pooledVolume: number;
    completedVolume: number;
    unit: string;
  };
}

/**
 * Regional Demand Comparison across Nigerian States
 */
export interface RegionalDemandComparison {
  state: string;
  volume: number;
  unit: string;
  sharePercent: number;
  ordersCount: number;
}

/**
 * Full Demand Intelligence Snapshot
 */
export interface DemandIntelligenceSnapshot {
  id?: string;
  commodity: string;
  state: string;
  demandPressure: DemandPressureScore;
  trend: DemandTrendResult;
  volatility: DemandVolatilityResult;
  concentration: DemandConcentrationResult;
  unmetDemand: UnmetDemandResult;
  forecast: DemandForecastResult;
  channels: DemandChannelsSummary;
  regionalComparisons: RegionalDemandComparison[];
  signals: IntelligenceSignal[];
  evidenceCount: number;
  hasSufficientEvidence: boolean;
  generatedAt: string;
}

/**
 * Agent Run Execution Result
 */
export interface DemandIntelligenceRunResult {
  success: boolean;
  commodity: string;
  state: string;
  snapshot: DemandIntelligenceSnapshot;
  aiInterpretation?: StructuredReasoningOutput;
  proposedRecommendation?: IntelligenceRecommendation;
  runId?: string;
  status: "COMPLETED" | "DETERMINISTIC_ONLY" | "INSUFFICIENT_EVIDENCE" | "FAILED";
  message: string;
  requiresHumanReview: boolean;
}
