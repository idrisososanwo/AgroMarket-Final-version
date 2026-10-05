/**
 * AgroMarket Phase 2.3: Market Intelligence Agent
 * Core Autonomous-Free Advisory Orchestrator
 *
 * Implements the lifecycle:
 * OBSERVE -> DETECT -> INTERPRET -> RECOMMEND -> HUMAN REVIEW -> OUTCOME -> EVALUATION
 *
 * CRITICAL SAFETY RULES:
 * 1. The agent NEVER executes autonomous financial, marketplace, order, or logistics actions.
 * 2. Deterministic calculations are authoritative.
 * 3. AI provider output is strictly advisory and gated through Phase 2.2 pre/post safety checks.
 * 4. Zero pig/pork tolerance across all prompts, calculations, and recommendations.
 * 5. Nigerian geography, NGN pricing, and calibrated non-speculative language.
 * 6. Gracefully handles AI provider unavailability (falls back to deterministic intelligence).
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  IntelligenceSignal,
  IntelligenceEvidence,
  IntelligenceRecommendation,
} from "@/features/intelligence/types";
import {
  detectPriceTrendSignals,
  detectDemandSignals,
  detectSupplyImbalanceSignals,
} from "@/features/intelligence/engine";
import { generateAdvisoryRecommendation } from "@/features/intelligence/recommendations";
import { runAgentReasoning } from "@/features/intelligence/orchestrator";
import { AIProvider } from "@/features/intelligence/ai-provider";
import {
  MarketIntelligenceSnapshot,
  MarketIntelligenceRunResult,
  RegionalPriceComparison,
} from "./types";
import {
  calculateCommodityPriceTrend,
  calculateDemandAnalysis,
  calculateSupplyAnalysis,
  calculateRegionalComparison,
  calculateMarketPressure,
} from "./calculations";
import { loadMarketEvidence, LoadedMarketEvidence } from "./data-layer";

export interface RunMarketIntelligenceParams {
  commodity: string;
  state: string;
  comparisonStates?: string[];
  userId?: string | null;
  aiProvider?: AIProvider;
  skipAIEvaluation?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any;
}

/**
 * Executes the complete Market Intelligence Agent pipeline
 */
export async function runMarketIntelligenceAgent(
  params: RunMarketIntelligenceParams
): Promise<MarketIntelligenceRunResult> {
  const { commodity, state, comparisonStates = [] } = params;
  assertNoProhibitedProduce(commodity, "Commodity");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = params.supabaseClient;
  if (!supabase) {
    try {
      supabase = await createClient();
    } catch {
      supabase = null;
    }
  }

  // 1. OBSERVE: Load real empirical market data
  let evidence: LoadedMarketEvidence;
  try {
    evidence = await loadMarketEvidence(commodity, state, comparisonStates, supabase);
  } catch (err: unknown) {
    return {
      success: false,
      commodity,
      state,
      snapshot: {
        commodity,
        state,
        priceTrend: {
          commodity,
          state,
          unit: "KG",
          currency: "NGN",
          currentPrice: null,
          previousPrice7d: null,
          previousPrice30d: null,
          previousPrice90d: null,
          percentageChange7d: null,
          percentageChange30d: null,
          percentageChange90d: null,
          trendDirection: "INSUFFICIENT_DATA",
          observationCount: 0,
          lastObservedAt: null,
          confidence: 0,
          isNormalized: true,
        },
        demandAnalysis: {
          commodity,
          state,
          b2bDemandVolume: 0,
          completedOrdersCount: 0,
          sharedPurchaseDemandVolume: 0,
          totalDemandIndex: 0,
          baselineDemandIndex: 0,
          percentageChange: null,
          status: "INSUFFICIENT_DATA",
          demandType: "INSUFFICIENT_DATA",
          confidence: 0,
          observationCount: 0,
          lastObservedAt: null,
        },
        supplyAnalysis: {
          commodity,
          state,
          activeListingsCount: 0,
          availableHarvestQuantity: 0,
          aggregationPoolQuantity: 0,
          totalSupplyQuantity: 0,
          unit: "KG",
          status: "INSUFFICIENT_DATA",
          estimatedDeficitOrSurplusPercent: null,
          confidence: 0,
          observationCount: 0,
          lastObservedAt: null,
        },
        regionalComparisons: [],
        marketPressure: {
          commodity,
          state,
          pressureScore: 0,
          pressureLevel: "LOW",
          pricePressure: 0,
          supplyPressure: 0,
          demandPressure: 0,
          disruptionPressure: 0,
          confidence: 0,
          drivers: [],
          risks: [],
          evidenceCount: 0,
          calculatedAt: new Date().toISOString(),
        },
        signals: [],
        evidenceCount: 0,
        hasSufficientEvidence: false,
        generatedAt: new Date().toISOString(),
      },
      status: "FAILED",
      message: err instanceof Error ? err.message : "Failed to load market evidence",
      requiresHumanReview: true,
    };
  }

  // 2. DETECT: Run pure deterministic calculations
  const priceTrend = calculateCommodityPriceTrend({
    commodity,
    state,
    observations: evidence.priceObservations,
  });

  const demandAnalysis = calculateDemandAnalysis({
    commodity,
    state,
    demandItems: evidence.demandObservations,
    baselineDemandIndex: evidence.historicalBaselineDemand,
  });

  const supplyAnalysis = calculateSupplyAnalysis({
    commodity,
    state,
    supplyItems: evidence.supplyObservations,
    expectedDemandQuantity: evidence.expectedDemandQuantity,
  });

  const regionalComparisons: RegionalPriceComparison[] = [];
  for (const comp of evidence.comparisonObservations) {
    const res = calculateRegionalComparison({
      commodity,
      baseState: state,
      comparisonState: comp.state,
      baseObservations: evidence.priceObservations,
      comparisonObservations: comp.observations,
    });
    if (res) regionalComparisons.push(res);
  }

  const marketPressure = calculateMarketPressure({
    commodity,
    state,
    priceTrend,
    supplyAnalysis,
    demandAnalysis,
    disruptions: evidence.disruptions,
  });

  // 3. GENERATE DETERMINISTIC SIGNALS
  const signals: IntelligenceSignal[] = [];

  // Price Trend Signal
  if (
    priceTrend.currentPrice !== null &&
    priceTrend.previousPrice30d !== null &&
    priceTrend.percentageChange30d !== null &&
    Math.abs(priceTrend.percentageChange30d) >= 10
  ) {
    const pSignal = detectPriceTrendSignals({
      commodity,
      state,
      recentPrice: priceTrend.currentPrice,
      baselinePrice: priceTrend.previousPrice30d,
      observationsCount: priceTrend.observationCount,
    });
    if (pSignal) signals.push(pSignal);
  }

  // Demand Signal
  if (
    demandAnalysis.status === "SURGING" ||
    demandAnalysis.status === "ELEVATED" ||
    demandAnalysis.status === "DECLINING"
  ) {
    const dSignal = detectDemandSignals({
      commodity,
      state,
      currentDemandVolume: demandAnalysis.totalDemandIndex,
      baselineDemandVolume: demandAnalysis.baselineDemandIndex || 100,
    });
    if (dSignal) signals.push(dSignal);
  }

  // Supply Imbalance Signal
  if (supplyAnalysis.status === "SHORTAGE" || supplyAnalysis.status === "SURPLUS") {
    const sSignal = detectSupplyImbalanceSignals({
      commodity,
      state,
      totalSupplyAvailable: supplyAnalysis.totalSupplyQuantity || 50,
      totalDemandExpected: evidence.expectedDemandQuantity || 100,
    });
    if (sSignal) signals.push(sSignal);
  }

  const totalEvidenceCount =
    priceTrend.observationCount +
    demandAnalysis.observationCount +
    supplyAnalysis.observationCount +
    evidence.disruptions.length;

  const hasSufficientEvidence = totalEvidenceCount >= 2;

  const snapshot: MarketIntelligenceSnapshot = {
    commodity,
    state,
    priceTrend,
    demandAnalysis,
    supplyAnalysis,
    regionalComparisons,
    marketPressure,
    signals,
    evidenceCount: totalEvidenceCount,
    hasSufficientEvidence,
    generatedAt: new Date().toISOString(),
  };

  // Persist market pressure snapshot if supabase is present
  if (supabase) {
    try {
      await supabase.from("market_pressure_snapshots").insert({
        commodity,
        state,
        pressure_score: marketPressure.pressureScore,
        pressure_level: marketPressure.pressureLevel,
        price_pressure: marketPressure.pricePressure,
        supply_pressure: marketPressure.supplyPressure,
        demand_pressure: marketPressure.demandPressure,
        disruption_pressure: marketPressure.disruptionPressure,
        confidence: marketPressure.confidence,
        drivers: marketPressure.drivers,
        risks: marketPressure.risks,
        evidence_count: marketPressure.evidenceCount,
        metadata: {
          priceTrendDirection: priceTrend.trendDirection,
          demandStatus: demandAnalysis.status,
          supplyStatus: supplyAnalysis.status,
        },
      });
    } catch {
      // Continue even if logging fails
    }
  }

  // If evidence is insufficient, return early with deterministic intelligence
  if (!hasSufficientEvidence) {
    return {
      success: true,
      commodity,
      state,
      snapshot,
      status: "INSUFFICIENT_EVIDENCE",
      message:
        "Insufficient empirical market evidence. Observations do not meet the minimum threshold for authoritative interpretation.",
      requiresHumanReview: true,
    };
  }

  // If skipAIEvaluation is set (e.g. rate limit protection or deterministic-only run)
  if (params.skipAIEvaluation) {
    const proposedRec =
      signals.length > 0 ? generateAdvisoryRecommendation(signals[0]) : undefined;

    return {
      success: true,
      commodity,
      state,
      snapshot,
      proposedRecommendation: proposedRec,
      status: "DETERMINISTIC_ONLY",
      message: "Deterministic market calculations completed. AI interpretation skipped by policy.",
      requiresHumanReview: true,
    };
  }

  // 4. INTERPRET: Controlled AI Reasoning Dispatch
  // Build structured evidence items
  const evidenceItems: IntelligenceEvidence[] = [
    {
      sourceType: "PRICE_OBSERVATION",
      sourceId: `price-trend-${commodity}-${state}`,
      description: `Current wholesale price: ₦${priceTrend.currentPrice?.toLocaleString() || "N/A"}/kg. 30-day movement: ${priceTrend.percentageChange30d !== null ? `${priceTrend.percentageChange30d}%` : "Stable/insufficient data"}.`,
      observedAt: priceTrend.lastObservedAt || new Date().toISOString(),
      relevance: 0.95,
      metadata: { trendDirection: priceTrend.trendDirection },
    },
    {
      sourceType: "B2B_DEMAND",
      sourceId: `demand-summary-${commodity}-${state}`,
      description: `Demand status: ${demandAnalysis.status}. B2B volume: ${demandAnalysis.b2bDemandVolume}, completed orders: ${demandAnalysis.completedOrdersCount}.`,
      observedAt: demandAnalysis.lastObservedAt || new Date().toISOString(),
      relevance: 0.9,
    },
    {
      sourceType: "PRODUCTION_OUTPUT",
      sourceId: `supply-summary-${commodity}-${state}`,
      description: `Supply condition: ${supplyAnalysis.status}. Available harvest/pool: ${supplyAnalysis.totalSupplyQuantity} ${supplyAnalysis.unit}.`,
      observedAt: supplyAnalysis.lastObservedAt || new Date().toISOString(),
      relevance: 0.9,
    },
  ];

  for (const d of evidence.disruptions) {
    evidenceItems.push({
      sourceType: d.type === "SECURITY" ? "SECURITY_INCIDENT" : "DELIVERY_EVENT",
      sourceId: `disruption-${commodity}-${state}-${Date.now()}`,
      description: `${d.type} [${d.severity}]: ${d.description}`,
      observedAt: new Date().toISOString(),
      relevance: 0.85,
    });
  }

  const aiResult = await runAgentReasoning({
    agentId: "MARKET_INTELLIGENCE_AGENT",
    objective: "MARKET_PRESSURE_ASSESSMENT",
    commodity,
    location: { state },
    signals,
    evidenceItems,
    constraints: [
      "Advisory only; do not propose financial, purchasing, or logistics dispatch actions.",
      "Strict anti-pork prohibition applies.",
      "Use calibrated non-speculative language; no guaranteed profits.",
    ],
    userId: params.userId,
    provider: params.aiProvider,
    supabaseClient: supabase,
  });

  // 5. RECOMMEND: Generate advisory recommendation
  let proposedRecommendation: IntelligenceRecommendation | undefined;

  if (aiResult.success && aiResult.output) {
    // Recommendation proposed through AI reasoning pipeline
    proposedRecommendation = {
      id: aiResult.recommendationId || `rec-market-${Date.now()}`,
      agentId: "MARKET_INTELLIGENCE_AGENT",
      objective: "OPTIMIZE_PRICING",
      title: aiResult.output.recommendation.title,
      recommendation: aiResult.output.recommendation.recommendation,
      evidence: evidenceItems,
      confidence: aiResult.evidenceConfidence,
      expectedImpact: aiResult.output.recommendation.expectedImpact,
      affectedActors: aiResult.output.recommendation.affectedActors,
      affectedCommodities: aiResult.output.recommendation.affectedCommodities,
      affectedLocations: aiResult.output.recommendation.affectedLocations,
      status: "PROPOSED",
      reviewNotes: `Human review required. Reasoning Run ID: ${aiResult.runId || "N/A"}`,
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } else if (signals.length > 0) {
    // Fallback: Deterministic recommendation when AI provider is unavailable
    proposedRecommendation = generateAdvisoryRecommendation(signals[0]);
  }

  const finalStatus = aiResult.success ? "COMPLETED" : "DETERMINISTIC_ONLY";
  const finalMessage = aiResult.success
    ? `Market intelligence analysis completed successfully with AI interpretation. Advisory recommendation proposed for human review.`
    : `Deterministic market calculations completed. AI provider unavailable or safety checks failed: ${aiResult.error || "No AI output"}.`;

  return {
    success: true,
    commodity,
    state,
    snapshot,
    aiInterpretation: aiResult.output,
    proposedRecommendation,
    runId: aiResult.runId,
    status: finalStatus,
    message: finalMessage,
    requiresHumanReview: true,
  };
}
