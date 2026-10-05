/**
 * AgroMarket Phase 2.4: Production Planning & Farm Intelligence Agent
 * Core Domain Types & Contracts
 *
 * Implements:
 * OBSERVE -> DETECT -> INTERPRET -> RECOMMEND -> HUMAN ACTION -> OUTCOME -> EVALUATION -> IMPROVEMENT
 *
 * SAFETY & POLICY RULES:
 * - Deterministic production & market calculations remain authoritative.
 * - Zero pig/pork tolerance throughout all structures.
 * - No yield or profit fabrication. Uses INSUFFICIENT_EVIDENCE when empirical records are sparse.
 * - Non-diagnostic livestock/disease boundaries (strictly agricultural decision-support).
 * - Nigeria-first: Nigerian states, LGAs, production clusters, NGN currency.
 */

import {
  IntelligenceSignal,
  IntelligenceRecommendation,
} from "@/features/intelligence/types";
import { StructuredReasoningOutput } from "@/features/intelligence/reasoning-contracts";
import { MarketIntelligenceSnapshot } from "@/features/market-intelligence/types";

export type ProductionDomain = "CROPS" | "LIVESTOCK" | "POULTRY" | "AQUACULTURE" | "MIXED";

export type OpportunityLevel = "LOW" | "MODERATE" | "ATTRACTIVE" | "HIGH_OPPORTUNITY";
export type ProductionRiskLevel = "LOW" | "MODERATE" | "ELEVATED" | "HIGH_RISK";

export type SeasonalAlignment = "PEAK_WINDOW" | "ACTIVE_SEASON" | "OFF_SEASON" | "INSUFFICIENT_DATA";
export type ConstraintLevel = "NONE" | "MODERATE" | "SEVERE" | "INSUFFICIENT_DATA";
export type ProcessingConstraintLevel = "NONE" | "MODERATE" | "BOTTLENECK" | "INSUFFICIENT_DATA";

/**
 * Deterministic Production Opportunity Assessment
 */
export interface ProductionOpportunityScore {
  commodity: string;
  state: string;
  domain: ProductionDomain;
  opportunityScore: number; // 0.0 to 100.0
  opportunityLevel: OpportunityLevel;
  marketDemandFactor: number; // 0.0 to 100.0 (30% weight)
  priceIncentiveFactor: number; // 0.0 to 100.0 (25% weight)
  supplyShortageFactor: number; // 0.0 to 100.0 (20% weight)
  seasonalFitFactor: number; // 0.0 to 100.0 (15% weight)
  infrastructureSupportFactor: number; // 0.0 to 100.0 (10% weight)
  confidence: number;
  drivers: string[];
  calibratedNotice: string;
}

/**
 * Deterministic Production Risk Assessment
 */
export interface ProductionRiskScore {
  commodity: string;
  state: string;
  domain: ProductionDomain;
  riskScore: number; // 0.0 to 100.0
  riskLevel: ProductionRiskLevel;
  inputConstraintFactor: number; // 0.0 to 100.0 (25% weight)
  downstreamBottleneckFactor: number; // 0.0 to 100.0 (25% weight)
  disruptionFactor: number; // 0.0 to 100.0 (20% weight)
  marketSoftnessFactor: number; // 0.0 to 100.0 (15% weight)
  diseaseAdvisoryFactor: number; // 0.0 to 100.0 (15% weight)
  confidence: number;
  riskDrivers: string[];
  mitigations: string[];
}

/**
 * Empirical Production Context Model (from real production_units & outputs)
 */
export interface ProductionContextSummary {
  commodity: string;
  state: string;
  domain: ProductionDomain;
  activeProductionUnitsCount: number;
  totalCapacityReported: number;
  capacityUnit: string;
  availableHarvestQuantity: number;
  harvestUnit: string;
  outputBatchesCount: number;
  lastHarvestDate: string | null;
  hasSufficientProductionRecords: boolean;
}

/**
 * Downstream & Input Ecosystem Constraints
 */
export interface ProductionConstraintsSummary {
  commodity: string;
  state: string;
  inputConstraintLevel: ConstraintLevel;
  inputNotes?: string;
  processingConstraintLevel: ProcessingConstraintLevel;
  processingFacilityCount: number;
  totalDailyProcessingCapacity: number;
  logisticsDelayEventsCount: number;
  securityIncidentsCount: number;
  diseaseSignalsCount: number;
  seasonalAlignment: SeasonalAlignment;
  seasonalRationale?: string;
}

/**
 * Complete Empirical Production Planning Snapshot
 */
export interface ProductionPlanningSnapshot {
  commodity: string;
  state: string;
  domain: ProductionDomain;
  productionContext: ProductionContextSummary;
  marketContext: {
    priceTrendDirection: string;
    marketPressureLevel: string;
    marketPressureScore: number;
    demandStatus: string;
    supplyStatus: string;
    currentWholesalePrice: number | null;
    priceUnit: string;
  };
  opportunity: ProductionOpportunityScore;
  risk: ProductionRiskScore;
  constraints: ProductionConstraintsSummary;
  signals: IntelligenceSignal[];
  evidenceCount: number;
  hasSufficientEvidence: boolean;
  generatedAt: string;
}

/**
 * Execution Result Contract for Production Planning Agent
 */
export interface ProductionPlanningRunResult {
  success: boolean;
  commodity: string;
  state: string;
  domain: ProductionDomain;
  snapshot: ProductionPlanningSnapshot;
  marketSnapshot?: MarketIntelligenceSnapshot;
  aiInterpretation?: StructuredReasoningOutput;
  proposedRecommendation?: IntelligenceRecommendation;
  runId?: string;
  status: "COMPLETED" | "DETERMINISTIC_ONLY" | "INSUFFICIENT_EVIDENCE" | "FAILED";
  message: string;
  requiresHumanReview: boolean;
}
