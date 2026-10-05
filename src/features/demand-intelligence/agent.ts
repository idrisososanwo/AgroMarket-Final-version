/**
 * AgroMarket Phase 2.5: Demand Forecasting & Demand Intelligence Agent
 * Autonomous-Free Advisory Orchestrator
 *
 * Implements:
 * OBSERVE -> NORMALIZE -> DETECT -> FORECAST -> INTERPRET -> RECOMMEND -> HUMAN ACTION -> OUTCOME -> EVALUATION
 *
 * CRITICAL SAFETY RULES:
 * 1. The agent NEVER executes autonomous procurement, purchases, sales, pricing, or inventory changes.
 * 2. Deterministic calculations are authoritative; AI reasoning is strictly advisory.
 * 3. Zero pig/pork tolerance across all prompts, calculations, evidence packages, and outputs.
 * 4. Privacy preservation: private buyer names, business IDs, and addresses are strictly omitted.
 * 5. Handles sparse data gracefully (LOW_CONFIDENCE, INSUFFICIENT_EVIDENCE, INSUFFICIENT_DATA).
 * 6. Graceful fallbacks when AI provider is unavailable (falls back to deterministic intelligence).
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  IntelligenceSignal,
  IntelligenceEvidence,
  IntelligenceRecommendation,
} from "@/features/intelligence/types";
import { generateAdvisoryRecommendation } from "@/features/intelligence/recommendations";
import { runAgentReasoning } from "@/features/intelligence/orchestrator";
import { AIProvider } from "@/features/intelligence/ai-provider";
import { MarketIntelligenceSnapshot } from "@/features/market-intelligence/types";
import { ProductionPlanningSnapshot } from "@/features/production-planning/types";
import {
  DemandIntelligenceSnapshot,
  DemandIntelligenceRunResult,
  DemandChannelsSummary,
  RegionalDemandComparison,
} from "./types";
import {
  aggregateDemandVolume,
  detectDemandTrend,
  calculateDemandPressure,
  calculateDemandVolatility,
  evaluateDemandConcentration,
  detectUnmetDemand,
  calculateDeterministicDemandForecast,
} from "./calculations";
import { loadDemandEvidence, LoadedDemandEvidence } from "./data-layer";

export interface RunDemandForecastingParams {
  commodity: string;
  state: string;
  userId?: string | null;
  aiProvider?: AIProvider;
  skipAIEvaluation?: boolean;
  marketSnapshot?: MarketIntelligenceSnapshot;
  productionSnapshot?: ProductionPlanningSnapshot;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any;
}

/**
 * Executes the Demand Forecasting & Demand Intelligence Agent pipeline
 */
export async function runDemandForecastingAgent(
  params: RunDemandForecastingParams
): Promise<DemandIntelligenceRunResult> {
  const { commodity, state, marketSnapshot, productionSnapshot } = params;
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

  // 1. OBSERVE: Load real platform demand evidence
  let demandData: LoadedDemandEvidence;
  try {
    demandData = await loadDemandEvidence(commodity, state, supabase);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      commodity,
      state,
      snapshot: {
        commodity,
        state,
        demandPressure: {
          commodity,
          state,
          score: 0,
          level: "LOW",
          growthFactor: 0,
          b2bVolumeFactor: 0,
          orderFrequencyFactor: 0,
          unmetDemandFactor: 0,
          confidence: 0,
          drivers: [],
          risks: ["Failed to load demand evidence"],
          calculatedAt: new Date().toISOString(),
        },
        trend: {
          commodity,
          state,
          canonicalUnit: "KG",
          currentPeriodVolume30d: 0,
          previousPeriodVolume30d: 0,
          volume7d: 0,
          volume90d: 0,
          percentageChange30d: null,
          percentageChange7d: null,
          direction: "INSUFFICIENT_DATA",
          classification: "INSUFFICIENT_EVIDENCE",
          observationCount: 0,
          confidence: 0,
          calibratedObservation: "Error loading empirical demand data.",
        },
        volatility: {
          level: "INSUFFICIENT_DATA",
          coefficientOfVariation: null,
          explanation: "Data loading error.",
        },
        concentration: {
          level: "INSUFFICIENT_DATA",
          topSegmentSharePercent: null,
          calibratedStatement: "Data loading error.",
        },
        unmetDemand: {
          unmetDemandDetected: false,
          activeB2BQuantity: 0,
          activeCartInterestQuantity: 0,
          activeSupplyQuantity: 0,
          deficitQuantity: null,
          unit: "KG",
          calibratedNote: "Data loading error.",
        },
        forecast: {
          commodity,
          state,
          forecastHorizonDays: 7,
          predictedDemandVolume: 0,
          volumeUnit: "KG",
          confidenceScore: 0.1,
          confidenceLevel: "INSUFFICIENT_DATA",
          forecastDirection: "INSUFFICIENT_DATA",
          method: "MOVING_AVERAGE_30D",
          dailyAverageVolume: 0,
          sampleOrderCount: 0,
          explanation: "Data loading error.",
          limitations: "Demand evidence could not be retrieved.",
        },
        channels: {
          consumer: { ordersCount: 0, volume: 0, unit: "KG", activeCartCount: 0 },
          b2b: { activeDemandsCount: 0, requestedVolume: 0, unit: "KG", fulfilledCount: 0 },
          sharedPurchase: { activePoolsCount: 0, pooledVolume: 0, completedVolume: 0, unit: "KG" },
        },
        regionalComparisons: [],
        signals: [],
        evidenceCount: 0,
        hasSufficientEvidence: false,
        generatedAt: new Date().toISOString(),
      },
      status: "FAILED",
      message: `Failed to load demand evidence: ${errorMsg}`,
      requiresHumanReview: true,
    };
  }

  // 2. NORMALIZE & SLICE TIME WINDOWS
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const thirtyDaysAgo = now - 30 * 86400000;
  const sixtyDaysAgo = now - 60 * 86400000;

  const ordersInState = demandData.historicalOrders.filter(
    (o) => !o.deliveryState || o.deliveryState === state
  );

  const orders7d = ordersInState.filter((o) => new Date(o.createdAt).getTime() >= sevenDaysAgo);
  const orders30d = ordersInState.filter((o) => new Date(o.createdAt).getTime() >= thirtyDaysAgo);
  const ordersPrev30d = ordersInState.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= sixtyDaysAgo && t < thirtyDaysAgo;
  });

  const targetUnit = demandData.defaultUnit || "KG";

  const agg7d = aggregateDemandVolume(orders7d, targetUnit);
  const agg30d = aggregateDemandVolume(orders30d, targetUnit);
  const aggPrev30d = aggregateDemandVolume(ordersPrev30d, targetUnit);
  const agg90d = aggregateDemandVolume(ordersInState, targetUnit);

  // B2B Demands
  const b2bInState = demandData.b2bDemands.filter((b) => b.state === state);
  const b2bAgg = aggregateDemandVolume(
    b2bInState.map((b) => ({ quantity: b.quantity, unit: b.unit })),
    targetUnit
  );
  const b2bFulfilledCount = b2bInState.filter((b) => b.status === "FULFILLED").length;

  // Active Carts (intent only)
  const cartInState = demandData.activeCarts.filter((c) => !c.state || c.state === state);
  const activeCartCount = cartInState.reduce((acc, c) => acc + c.quantity, 0);

  // Shared Purchases
  const sharedPurchases = demandData.sharedPurchases;
  const sharedAllocatedAgg = aggregateDemandVolume(
    sharedPurchases.map((sp) => ({ quantity: sp.allocatedQuantity, unit: targetUnit })),
    targetUnit
  );
  const sharedTotalAgg = aggregateDemandVolume(
    sharedPurchases.map((sp) => ({ quantity: sp.totalQuantity, unit: targetUnit })),
    targetUnit
  );

  // Active supply listings in state (for unmet demand checking)
  const supplyAgg = aggregateDemandVolume(
    demandData.supplyListings.map((l) => ({ quantity: l.quantity, unit: l.unit })),
    targetUnit
  );

  // 3. DETECT: Pure Deterministic Analysis
  const trend = detectDemandTrend({
    commodity,
    state,
    targetUnit,
    currentPeriodVolume30d: agg30d.totalVolume,
    previousPeriodVolume30d: aggPrev30d.totalVolume,
    volume7d: agg7d.totalVolume,
    volume90d: agg90d.totalVolume,
    observationCount: orders30d.length,
    b2bVolume30d: b2bAgg.totalVolume,
    consumerVolume30d: agg30d.totalVolume,
  });

  const unmetDemand = detectUnmetDemand({
    commodity,
    state,
    activeB2BQuantity: b2bAgg.totalVolume,
    activeCartInterestQuantity: activeCartCount,
    activeSupplyQuantity: supplyAgg.totalVolume,
    unit: targetUnit,
  });

  const demandPressure = calculateDemandPressure({
    commodity,
    state,
    growthDelta: trend.percentageChange30d,
    b2bVolume: b2bAgg.totalVolume,
    totalVolume: agg30d.totalVolume,
    orderCount30d: orders30d.length,
    unmetDeficit: unmetDemand.deficitQuantity,
    observationCount: ordersInState.length,
  });

  // Calculate daily order volumes for volatility
  const dailyBuckets: Record<string, number> = {};
  for (const o of orders30d) {
    const dayKey = o.createdAt.split("T")[0];
    dailyBuckets[dayKey] = (dailyBuckets[dayKey] || 0) + o.quantity;
  }
  const volatility = calculateDemandVolatility(Object.values(dailyBuckets));

  // Regional breakdown
  const regionalComparisons: RegionalDemandComparison[] = [];
  const nationalTotal = Object.values(demandData.regionalBreakdown).reduce(
    (acc, v) => acc + v,
    0
  );

  for (const [rState, rVol] of Object.entries(demandData.regionalBreakdown)) {
    const share = nationalTotal > 0 ? Number(((rVol / nationalTotal) * 100).toFixed(1)) : 0;
    const rOrdersCount = demandData.historicalOrders.filter((o) => o.deliveryState === rState).length;
    regionalComparisons.push({
      state: rState,
      volume: Number(rVol.toFixed(2)),
      unit: targetUnit,
      sharePercent: share,
      ordersCount: rOrdersCount,
    });
  }
  regionalComparisons.sort((a, b) => b.volume - a.volume);

  const concentration = evaluateDemandConcentration({
    stateVolumes: demandData.regionalBreakdown,
    targetState: state,
    b2bVolume: b2bAgg.totalVolume,
    totalVolume: nationalTotal > 0 ? nationalTotal : agg30d.totalVolume,
  });

  // 4. FORECAST: Deterministic Baseline Demand Forecast
  const forecast = calculateDeterministicDemandForecast({
    commodity,
    productId: demandData.productId,
    state,
    historicalOrders: orders30d.map((o) => ({
      quantity: o.quantity,
      unit: o.unit,
      createdAt: o.createdAt,
    })),
    forecastHorizonDays: 7,
    dataWindowDays: 30,
    volumeUnit: targetUnit,
  });
  forecast.forecastDirection = trend.direction;

  const channels: DemandChannelsSummary = {
    consumer: {
      ordersCount: orders30d.length,
      volume: agg30d.totalVolume,
      unit: targetUnit,
      activeCartCount,
    },
    b2b: {
      activeDemandsCount: b2bInState.length,
      requestedVolume: b2bAgg.totalVolume,
      unit: targetUnit,
      fulfilledCount: b2bFulfilledCount,
    },
    sharedPurchase: {
      activePoolsCount: sharedPurchases.length,
      pooledVolume: sharedTotalAgg.totalVolume,
      completedVolume: sharedAllocatedAgg.totalVolume,
      unit: targetUnit,
    },
  };

  // Compile Signals
  const signals: IntelligenceSignal[] = [];

  if (trend.direction === "SHARP_INCREASE" || trend.direction === "MODERATE_INCREASE") {
    signals.push({
      id: `sig-demand-inc-${Date.now()}`,
      agentId: "DEMAND_FORECASTING_AGENT",
      signalType: "DEMAND_INCREASE",
      commodity,
      state,
      magnitude: trend.percentageChange30d ?? 15,
      confidence: trend.confidence,
      source: "DETERMINISTIC_DEMAND_TREND_ENGINE",
      evidence: [
        {
          sourceType: "ORDER_HISTORY",
          sourceId: `orders-30d-${commodity}-${state}`,
          description: trend.calibratedObservation,
          observedAt: new Date().toISOString(),
          relevance: 0.95,
        },
      ],
      observedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  } else if (trend.direction === "SHARP_DECREASE" || trend.direction === "MODERATE_DECREASE") {
    signals.push({
      id: `sig-demand-dec-${Date.now()}`,
      agentId: "DEMAND_FORECASTING_AGENT",
      signalType: "DEMAND_DECREASE",
      commodity,
      state,
      magnitude: Math.abs(trend.percentageChange30d ?? -15),
      confidence: trend.confidence,
      source: "DETERMINISTIC_DEMAND_TREND_ENGINE",
      evidence: [
        {
          sourceType: "ORDER_HISTORY",
          sourceId: `orders-30d-${commodity}-${state}`,
          description: trend.calibratedObservation,
          observedAt: new Date().toISOString(),
          relevance: 0.95,
        },
      ],
      observedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  if (unmetDemand.unmetDemandDetected) {
    signals.push({
      id: `sig-unmet-${Date.now()}`,
      agentId: "DEMAND_FORECASTING_AGENT",
      signalType: "UNMET_DEMAND",
      commodity,
      state,
      magnitude: unmetDemand.deficitQuantity || 0,
      confidence: 0.8,
      source: "DETERMINISTIC_UNMET_DEMAND_ENGINE",
      evidence: [
        {
          sourceType: "B2B_DEMAND",
          sourceId: `unmet-${commodity}-${state}`,
          description: unmetDemand.calibratedNote,
          observedAt: new Date().toISOString(),
          relevance: 0.9,
        },
      ],
      observedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  if (b2bAgg.totalVolume > 0) {
    signals.push({
      id: `sig-b2b-${Date.now()}`,
      agentId: "DEMAND_FORECASTING_AGENT",
      signalType: "B2B_DEMAND_INCREASE",
      commodity,
      state,
      magnitude: b2bAgg.totalVolume,
      confidence: 0.85,
      source: "DETERMINISTIC_B2B_DEMAND_ENGINE",
      evidence: [
        {
          sourceType: "B2B_DEMAND",
          sourceId: `b2b-demands-${commodity}-${state}`,
          description: `Confirmed B2B procurement demand volume: ${b2bAgg.totalVolume.toLocaleString()} ${targetUnit} across ${b2bInState.length} active demand request(s).`,
          observedAt: new Date().toISOString(),
          relevance: 0.95,
        },
      ],
      observedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  if (volatility.level === "HIGH") {
    signals.push({
      id: `sig-vol-${Date.now()}`,
      agentId: "DEMAND_FORECASTING_AGENT",
      signalType: "DEMAND_VOLATILITY",
      commodity,
      state,
      magnitude: (volatility.coefficientOfVariation ?? 0.8) * 100,
      confidence: 0.75,
      source: "DETERMINISTIC_VOLATILITY_ENGINE",
      evidence: [
        {
          sourceType: "ORDER_HISTORY",
          sourceId: `volatility-${commodity}-${state}`,
          description: volatility.explanation,
          observedAt: new Date().toISOString(),
          relevance: 0.8,
        },
      ],
      observedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  const totalEvidenceCount =
    ordersInState.length +
    b2bInState.length +
    sharedPurchases.length +
    demandData.supplyListings.length +
    demandData.contextualSignals.length;

  const hasSufficientEvidence =
    ordersInState.length >= 2 || b2bInState.length >= 1 || sharedPurchases.length >= 1;

  const snapshot: DemandIntelligenceSnapshot = {
    commodity,
    state,
    demandPressure,
    trend,
    volatility,
    concentration,
    unmetDemand,
    forecast,
    channels,
    regionalComparisons,
    signals,
    evidenceCount: totalEvidenceCount,
    hasSufficientEvidence,
    generatedAt: new Date().toISOString(),
  };

  // Persist snapshot to demand_intelligence_snapshots if supabase client is available
  if (supabase) {
    try {
      await supabase.from("demand_intelligence_snapshots").insert({
        commodity,
        state,
        demand_pressure_score: demandPressure.score,
        demand_pressure_level: demandPressure.level,
        forecast_direction: forecast.forecastDirection,
        forecast_confidence: forecast.confidenceScore,
        forecast_horizon_days: forecast.forecastHorizonDays,
        predicted_demand_volume: forecast.predictedDemandVolume,
        volume_unit: forecast.volumeUnit,
        b2b_demand_volume: b2bAgg.totalVolume,
        consumer_orders_count: orders30d.length,
        consumer_orders_volume: agg30d.totalVolume,
        shared_purchase_demand_volume: sharedTotalAgg.totalVolume,
        volatility_level: volatility.level,
        unmet_demand_detected: unmetDemand.unmetDemandDetected,
        demand_concentration: concentration.level,
        confidence: trend.confidence,
        drivers: demandPressure.drivers,
        risks: demandPressure.risks,
        evidence_count: totalEvidenceCount,
        metadata: {
          observationCount: ordersInState.length,
          b2bCount: b2bInState.length,
          activeCarts: activeCartCount,
        },
      });
    } catch {
      // Continue even if snapshot logging fails
    }
  }

  // If evidence is insufficient, return structured status
  if (!hasSufficientEvidence) {
    return {
      success: true,
      commodity,
      state,
      snapshot,
      status: "INSUFFICIENT_EVIDENCE",
      message: `Insufficient empirical demand records for ${commodity} in ${state}. Commercial or production pacing should not assume guaranteed offtake.`,
      requiresHumanReview: true,
    };
  }

  // If skipAIEvaluation is set
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
      message: "Deterministic demand intelligence analysis completed. AI interpretation skipped by policy.",
      requiresHumanReview: true,
    };
  }

  // 5. INTERPRET: Controlled AI Reasoning via Phase 2.2 Gateway
  const evidenceItems: IntelligenceEvidence[] = [
    {
      sourceType: "ORDER_HISTORY",
      sourceId: `demand-ctx-${commodity}-${state}`,
      description: `30-day confirmed consumer sales: ${agg30d.totalVolume.toLocaleString()} ${targetUnit} across ${orders30d.length} order(s). Trend: ${trend.direction} (${trend.classification}).`,
      observedAt: new Date().toISOString(),
      relevance: 0.95,
      metadata: { targetUnit },
    },
    {
      sourceType: "B2B_DEMAND",
      sourceId: `b2b-ctx-${commodity}-${state}`,
      description: `Active commercial B2B procurement requests: ${b2bAgg.totalVolume.toLocaleString()} ${targetUnit} across ${b2bInState.length} demand(s).`,
      observedAt: new Date().toISOString(),
      relevance: 0.9,
    },
  ];

  if (unmetDemand.unmetDemandDetected) {
    evidenceItems.push({
      sourceType: "B2B_DEMAND",
      sourceId: `unmet-ctx-${commodity}-${state}`,
      description: unmetDemand.calibratedNote,
      observedAt: new Date().toISOString(),
      relevance: 0.9,
    });
  }

  if (marketSnapshot) {
    evidenceItems.push({
      sourceType: "PRICE_OBSERVATION",
      sourceId: `market-pressure-${commodity}-${state}`,
      description: `Market Intelligence context: wholesale price pressure score ${marketSnapshot.marketPressure.pressureScore}/100, price trend: ${marketSnapshot.priceTrend.trendDirection}.`,
      observedAt: new Date().toISOString(),
      relevance: 0.85,
    });
  }

  if (productionSnapshot) {
    evidenceItems.push({
      sourceType: "PRODUCTION_OUTPUT",
      sourceId: `production-ctx-${commodity}-${state}`,
      description: `Production Planning context: available harvest ${productionSnapshot.productionContext.availableHarvestQuantity} ${productionSnapshot.productionContext.harvestUnit}, opportunity level: ${productionSnapshot.opportunity.opportunityLevel}.`,
      observedAt: new Date().toISOString(),
      relevance: 0.85,
    });
  }

  const aiResult = await runAgentReasoning({
    agentId: "DEMAND_FORECASTING_AGENT",
    objective: "DEMAND_TREND_INTERPRETATION",
    commodity,
    location: { state },
    signals,
    evidenceItems,
    constraints: [
      "Strictly advisory decision support; do not formulate autonomous procurement, purchase, sales, or pricing instructions.",
      "Strict zero-tolerance prohibited produce policy.",
      "Never guarantee buyers, demand volume, or sales revenue.",
      "Preserve privacy: do not mention specific private companies or individual buyer identities.",
    ],
    userId: params.userId,
    provider: params.aiProvider,
    supabaseClient: supabase,
  });

  // 6. RECOMMEND: Advisory recommendation for human review
  let proposedRecommendation: IntelligenceRecommendation | undefined;

  if (aiResult.success && aiResult.output) {
    proposedRecommendation = {
      id: aiResult.recommendationId || `rec-demand-${Date.now()}`,
      agentId: "DEMAND_FORECASTING_AGENT",
      objective: "DEMAND_FULFILLMENT",
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
    proposedRecommendation = generateAdvisoryRecommendation(signals[0]);
  }

  const finalStatus = aiResult.success ? "COMPLETED" : "DETERMINISTIC_ONLY";
  const finalMessage = aiResult.success
    ? `Demand intelligence completed with AI interpretation. Advisory recommendation proposed for human review.`
    : `Deterministic demand intelligence calculations completed. AI provider unavailable: ${aiResult.error || "No AI output"}.`;

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
