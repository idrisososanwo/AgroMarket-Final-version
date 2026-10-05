/**
 * AgroMarket Phase 2.3: Market Intelligence Agent
 * Domain Types & Data Contracts
 *
 * Implements:
 * OBSERVE -> DETECT -> INTERPRET -> RECOMMEND -> HUMAN/BUSINESS ACTION -> OUTCOME -> EVALUATION -> IMPROVEMENT
 *
 * Rules:
 * - Deterministic market calculations remain authoritative.
 * - AI output is strictly advisory.
 * - Zero pig/pork tolerance.
 * - Nigeria-first: Nigerian states, LGAs, corridors, commodities, and NGN pricing.
 */

import {
  IntelligenceSignal,
  IntelligenceRecommendation,
} from "@/features/intelligence/types";
import { StructuredReasoningOutput } from "@/features/intelligence/reasoning-contracts";

export type MarketPressureLevel = "LOW" | "MODERATE" | "ELEVATED" | "ACUTE" | "CRITICAL";

export type TrendDirection =
  | "SHARP_INCREASE"
  | "MODERATE_INCREASE"
  | "STABLE"
  | "MODERATE_DECREASE"
  | "SHARP_DECREASE"
  | "INSUFFICIENT_DATA";

export type SupplyStatus = "SHORTAGE" | "BALANCED" | "SURPLUS" | "INSUFFICIENT_DATA";
export type DemandStatus = "SURGING" | "ELEVATED" | "NORMAL" | "DECLINING" | "INSUFFICIENT_DATA";

/**
 * Deterministic Price Trend Analysis for 7d, 30d, and 90d horizons
 */
export interface CommodityPriceTrend {
  commodity: string;
  state?: string;
  unit: string;
  currency: "NGN";
  currentPrice: number | null;
  previousPrice7d: number | null;
  previousPrice30d: number | null;
  previousPrice90d: number | null;
  percentageChange7d: number | null;
  percentageChange30d: number | null;
  percentageChange90d: number | null;
  trendDirection: TrendDirection;
  observationCount: number;
  lastObservedAt: string | null;
  confidence: number; // 0.0 to 1.0
  isNormalized: boolean;
  notes?: string;
}

/**
 * Deterministic Demand Analysis
 */
export interface DemandAnalysisResult {
  commodity: string;
  state?: string;
  b2bDemandVolume: number;
  completedOrdersCount: number;
  sharedPurchaseDemandVolume: number;
  totalDemandIndex: number;
  baselineDemandIndex: number;
  percentageChange: number | null;
  status: DemandStatus;
  demandType: "ISOLATED_SPIKE" | "SUSTAINED_INCREASE" | "SEASONAL_SURGE" | "STEADY" | "WEAK" | "INSUFFICIENT_DATA";
  confidence: number;
  observationCount: number;
  lastObservedAt: string | null;
}

/**
 * Deterministic Supply Analysis
 */
export interface SupplyAnalysisResult {
  commodity: string;
  state?: string;
  activeListingsCount: number;
  availableHarvestQuantity: number;
  aggregationPoolQuantity: number;
  totalSupplyQuantity: number;
  unit: string;
  status: SupplyStatus;
  estimatedDeficitOrSurplusPercent: number | null;
  confidence: number;
  observationCount: number;
  lastObservedAt: string | null;
}

/**
 * Deterministic Regional Market Comparison
 */
export interface RegionalPriceComparison {
  commodity: string;
  baseState: string;
  comparisonState: string;
  basePriceNormalized: number;
  comparisonPriceNormalized: number;
  unit: string; // e.g. "KG"
  priceDifferentialNGN: number;
  percentageDifferential: number;
  calibratedObservation: string; // Calibrated non-speculative language
  baseObservationCount: number;
  comparisonObservationCount: number;
  confidence: number;
}

/**
 * Deterministic Market Pressure Index & Decomposition
 */
export interface MarketPressureScore {
  commodity: string;
  state: string;
  pressureScore: number; // 0.0 to 100.0
  pressureLevel: MarketPressureLevel;
  pricePressure: number; // 0.0 to 100.0 (35% weight)
  supplyPressure: number; // 0.0 to 100.0 (30% weight)
  demandPressure: number; // 0.0 to 100.0 (25% weight)
  disruptionPressure: number; // 0.0 to 100.0 (10% weight)
  confidence: number; // 0.0 to 1.0
  drivers: string[];
  risks: string[];
  evidenceCount: number;
  calculatedAt: string;
}

/**
 * Full Market Intelligence Snapshot for a Commodity & State
 */
export interface MarketIntelligenceSnapshot {
  commodity: string;
  state: string;
  priceTrend: CommodityPriceTrend;
  demandAnalysis: DemandAnalysisResult;
  supplyAnalysis: SupplyAnalysisResult;
  regionalComparisons: RegionalPriceComparison[];
  marketPressure: MarketPressureScore;
  signals: IntelligenceSignal[];
  evidenceCount: number;
  hasSufficientEvidence: boolean;
  generatedAt: string;
}

/**
 * Agent Run Execution Result
 */
export interface MarketIntelligenceRunResult {
  success: boolean;
  commodity: string;
  state: string;
  snapshot: MarketIntelligenceSnapshot;
  aiInterpretation?: StructuredReasoningOutput;
  proposedRecommendation?: IntelligenceRecommendation;
  runId?: string;
  status: "COMPLETED" | "DETERMINISTIC_ONLY" | "INSUFFICIENT_EVIDENCE" | "FAILED";
  message: string;
  requiresHumanReview: boolean;
}
