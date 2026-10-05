/**
 * AgroMarket Phase 2.4: Production Planning & Farm Intelligence Agent
 * Autonomous-Free Advisory Orchestrator
 *
 * Implements:
 * OBSERVE -> DETECT -> INTERPRET -> RECOMMEND -> HUMAN ACTION -> OUTCOME -> EVALUATION -> IMPROVEMENT
 *
 * CRITICAL SAFETY RULES:
 * 1. The agent NEVER executes autonomous planting, breeding, harvesting, livestock dispatch, or input purchases.
 * 2. Deterministic calculations are authoritative.
 * 3. AI provider output is strictly advisory and routed via Phase 2.2 AI Gateway.
 * 4. Zero pig/pork tolerance across all prompts, calculations, and recommendations.
 * 5. Strictly non-diagnostic boundaries for livestock and plant diseases.
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
import { runMarketIntelligenceAgent } from "@/features/market-intelligence/agent";
import { MarketIntelligenceSnapshot } from "@/features/market-intelligence/types";
import {
  ProductionPlanningSnapshot,
  ProductionPlanningRunResult,
} from "./types";
import {
  inferProductionDomain,
  calculateProductionOpportunityScore,
  calculateProductionRiskScore,
} from "./calculations";
import { loadProductionEvidence, LoadedProductionEvidence } from "./data-layer";

export interface RunProductionPlanningParams {
  commodity: string;
  state: string;
  userId?: string | null;
  aiProvider?: AIProvider;
  skipAIEvaluation?: boolean;
  marketSnapshot?: MarketIntelligenceSnapshot;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any;
}

/**
 * Executes the Production Planning & Farm Intelligence Agent pipeline
 */
export async function runProductionPlanningAgent(
  params: RunProductionPlanningParams
): Promise<ProductionPlanningRunResult> {
  const { commodity, state } = params;
  assertNoProhibitedProduce(commodity, "Commodity");
  const domain = inferProductionDomain(commodity);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = params.supabaseClient;
  if (!supabase) {
    try {
      supabase = await createClient();
    } catch {
      supabase = null;
    }
  }

  // 1. OBSERVE: Load real production context and ecosystem constraints
  let productionData: LoadedProductionEvidence;
  try {
    productionData = await loadProductionEvidence(commodity, state, supabase);
  } catch (err: unknown) {
    return {
      success: false,
      commodity,
      state,
      domain,
      snapshot: {
        commodity,
        state,
        domain,
        productionContext: {
          commodity,
          state,
          domain,
          activeProductionUnitsCount: 0,
          totalCapacityReported: 0,
          capacityUnit: "HA",
          availableHarvestQuantity: 0,
          harvestUnit: "KG",
          outputBatchesCount: 0,
          lastHarvestDate: null,
          hasSufficientProductionRecords: false,
        },
        marketContext: {
          priceTrendDirection: "INSUFFICIENT_DATA",
          marketPressureLevel: "LOW",
          marketPressureScore: 0,
          demandStatus: "INSUFFICIENT_DATA",
          supplyStatus: "INSUFFICIENT_DATA",
          currentWholesalePrice: null,
          priceUnit: "KG",
        },
        opportunity: {
          commodity,
          state,
          domain,
          opportunityScore: 0,
          opportunityLevel: "LOW",
          marketDemandFactor: 0,
          priceIncentiveFactor: 0,
          supplyShortageFactor: 0,
          seasonalFitFactor: 0,
          infrastructureSupportFactor: 0,
          confidence: 0,
          drivers: [],
          calibratedNotice: "Failed to evaluate production evidence.",
        },
        risk: {
          commodity,
          state,
          domain,
          riskScore: 0,
          riskLevel: "LOW",
          inputConstraintFactor: 0,
          downstreamBottleneckFactor: 0,
          disruptionFactor: 0,
          marketSoftnessFactor: 0,
          diseaseAdvisoryFactor: 0,
          confidence: 0,
          riskDrivers: [],
          mitigations: [],
        },
        constraints: {
          commodity,
          state,
          inputConstraintLevel: "INSUFFICIENT_DATA",
          processingConstraintLevel: "INSUFFICIENT_DATA",
          processingFacilityCount: 0,
          totalDailyProcessingCapacity: 0,
          logisticsDelayEventsCount: 0,
          securityIncidentsCount: 0,
          diseaseSignalsCount: 0,
          seasonalAlignment: "INSUFFICIENT_DATA",
        },
        signals: [],
        evidenceCount: 0,
        hasSufficientEvidence: false,
        generatedAt: new Date().toISOString(),
      },
      status: "FAILED",
      message: err instanceof Error ? err.message : "Failed to load production evidence",
      requiresHumanReview: true,
    };
  }

  // 2. INTEGRATE: Load or receive Market Intelligence Agent outputs
  let marketSnapshot = params.marketSnapshot;
  if (!marketSnapshot) {
    try {
      const marketRes = await runMarketIntelligenceAgent({
        commodity,
        state,
        skipAIEvaluation: true, // Deterministic market analysis is fast and sufficient for upstream context
        supabaseClient: supabase,
      });
      if (marketRes.success) {
        marketSnapshot = marketRes.snapshot;
      }
    } catch {
      marketSnapshot = undefined;
    }
  }

  // 3. DETECT: Run pure deterministic calculations
  const opportunity = calculateProductionOpportunityScore({
    commodity,
    state,
    domain,
    marketSnapshot,
    seasonalAlignment: productionData.constraints.seasonalAlignment,
    productionContext: productionData.productionContext,
    constraints: productionData.constraints,
  });

  const risk = calculateProductionRiskScore({
    commodity,
    state,
    domain,
    marketSnapshot,
    constraints: productionData.constraints,
  });

  const signals: IntelligenceSignal[] = [];

  // Emit Opportunity or Risk Signal based on empirical scores
  if (opportunity.opportunityLevel === "HIGH_OPPORTUNITY" || opportunity.opportunityLevel === "ATTRACTIVE") {
    signals.push({
      id: `sig-prod-opp-${Date.now()}`,
      agentId: "PRODUCTION_PLANNING_AGENT",
      signalType: "SUPPLY_SHORTAGE",
      commodity,
      state,
      magnitude: opportunity.opportunityScore,
      confidence: opportunity.confidence,
      source: "DETERMINISTIC_PRODUCTION_OPPORTUNITY_ENGINE",
      evidence: [
        {
          sourceType: "PRODUCTION_OUTPUT",
          sourceId: `prod-opp-${commodity}-${state}`,
          description: opportunity.calibratedNotice,
          observedAt: new Date().toISOString(),
          relevance: 0.95,
        },
      ],
      observedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  if (risk.riskLevel === "HIGH_RISK" || risk.riskLevel === "ELEVATED") {
    signals.push({
      id: `sig-prod-risk-${Date.now()}`,
      agentId: "PRODUCTION_PLANNING_AGENT",
      signalType: "PROCESSING_BOTTLENECK",
      commodity,
      state,
      magnitude: risk.riskScore,
      confidence: risk.confidence,
      source: "DETERMINISTIC_PRODUCTION_RISK_ENGINE",
      evidence: [
        {
          sourceType: "PROCESSING_EVENT",
          sourceId: `prod-risk-${commodity}-${state}`,
          description: `Downstream constraints or disruptions detected: ${risk.riskDrivers.join("; ")}`,
          observedAt: new Date().toISOString(),
          relevance: 0.9,
        },
      ],
      observedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  const totalEvidenceCount =
    productionData.productionContext.outputBatchesCount +
    productionData.productionContext.activeProductionUnitsCount +
    (marketSnapshot?.evidenceCount || 0) +
    productionData.constraints.securityIncidentsCount +
    productionData.constraints.diseaseSignalsCount;

  const hasSufficientEvidence =
    productionData.productionContext.hasSufficientProductionRecords ||
    (marketSnapshot?.hasSufficientEvidence ?? false);

  const snapshot: ProductionPlanningSnapshot = {
    commodity,
    state,
    domain,
    productionContext: productionData.productionContext,
    marketContext: {
      priceTrendDirection: marketSnapshot?.priceTrend.trendDirection || "INSUFFICIENT_DATA",
      marketPressureLevel: marketSnapshot?.marketPressure.pressureLevel || "LOW",
      marketPressureScore: marketSnapshot?.marketPressure.pressureScore || 0,
      demandStatus: marketSnapshot?.demandAnalysis.status || "INSUFFICIENT_DATA",
      supplyStatus: marketSnapshot?.supplyAnalysis.status || "INSUFFICIENT_DATA",
      currentWholesalePrice: marketSnapshot?.priceTrend.currentPrice ?? null,
      priceUnit: marketSnapshot?.priceTrend.unit || "KG",
    },
    opportunity,
    risk,
    constraints: productionData.constraints,
    signals,
    evidenceCount: totalEvidenceCount,
    hasSufficientEvidence,
    generatedAt: new Date().toISOString(),
  };

  // Persist production planning snapshot if supabase is present
  if (supabase) {
    try {
      await supabase.from("production_planning_snapshots").insert({
        commodity,
        state,
        domain,
        opportunity_score: opportunity.opportunityScore,
        risk_score: risk.riskScore,
        opportunity_level: opportunity.opportunityLevel,
        risk_level: risk.riskLevel,
        market_demand_status: snapshot.marketContext.demandStatus,
        supply_balance_status: snapshot.marketContext.supplyStatus,
        seasonal_alignment: productionData.constraints.seasonalAlignment,
        input_constraint_level: productionData.constraints.inputConstraintLevel,
        processing_constraint_level: productionData.constraints.processingConstraintLevel,
        confidence: opportunity.confidence,
        opportunities: opportunity.drivers,
        risks: risk.riskDrivers,
        constraints: risk.mitigations,
        evidence_count: totalEvidenceCount,
        metadata: {
          activeUnits: productionData.productionContext.activeProductionUnitsCount,
          availableHarvestQuantity: productionData.productionContext.availableHarvestQuantity,
        },
      });
    } catch {
      // Continue even if snapshot logging fails
    }
  }

  // If evidence is insufficient, return deterministic status
  if (!hasSufficientEvidence) {
    return {
      success: true,
      commodity,
      state,
      domain,
      snapshot,
      marketSnapshot,
      status: "INSUFFICIENT_EVIDENCE",
      message:
        "Insufficient empirical production or market records. Pacing and volume commitments should await verified local offtake demand.",
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
      domain,
      snapshot,
      marketSnapshot,
      proposedRecommendation: proposedRec,
      status: "DETERMINISTIC_ONLY",
      message: "Deterministic production analysis completed. AI interpretation skipped by policy.",
      requiresHumanReview: true,
    };
  }

  // 4. INTERPRET: Controlled AI Reasoning via Phase 2.2 Gateway
  const evidenceItems: IntelligenceEvidence[] = [
    {
      sourceType: "PRODUCTION_OUTPUT",
      sourceId: `prod-ctx-${commodity}-${state}`,
      description: `Active units: ${productionData.productionContext.activeProductionUnitsCount}, available harvest: ${productionData.productionContext.availableHarvestQuantity} ${productionData.productionContext.harvestUnit}.`,
      observedAt: new Date().toISOString(),
      relevance: 0.95,
      metadata: { domain },
    },
    {
      sourceType: "PRICE_OBSERVATION",
      sourceId: `market-ctx-${commodity}-${state}`,
      description: `Wholesale price: ₦${snapshot.marketContext.currentWholesalePrice?.toLocaleString() || "N/A"}/${snapshot.marketContext.priceUnit}. Demand: ${snapshot.marketContext.demandStatus}, Supply: ${snapshot.marketContext.supplyStatus}.`,
      observedAt: new Date().toISOString(),
      relevance: 0.9,
    },
    {
      sourceType: "SEASONAL_CALENDAR",
      sourceId: `seasonal-${commodity}-${state}`,
      description: `Seasonal alignment: ${productionData.constraints.seasonalAlignment}. ${productionData.constraints.seasonalRationale || ""}`,
      observedAt: new Date().toISOString(),
      relevance: 0.85,
    },
  ];

  if (productionData.constraints.processingConstraintLevel === "BOTTLENECK") {
    evidenceItems.push({
      sourceType: "PROCESSING_EVENT",
      sourceId: `processing-constraint-${commodity}-${state}`,
      description: `Downstream processing capacity bottleneck detected in ${state}.`,
      observedAt: new Date().toISOString(),
      relevance: 0.9,
    });
  }

  const aiResult = await runAgentReasoning({
    agentId: "PRODUCTION_PLANNING_AGENT",
    objective: "PRODUCTION_PLANNING_INTERPRETATION",
    commodity,
    location: { state },
    signals,
    evidenceItems,
    constraints: [
      "Strictly advisory; do not formulate autonomous planting, harvesting, purchase, or logistics instructions.",
      "Strict zero-tolerance anti-pork prohibition.",
      "Do not provide veterinary diagnosis or prescribe chemical treatments.",
      "Never fabricate yields, revenues, or profit guarantees.",
    ],
    userId: params.userId,
    provider: params.aiProvider,
    supabaseClient: supabase,
  });

  // 5. RECOMMEND: Generate advisory recommendation
  let proposedRecommendation: IntelligenceRecommendation | undefined;

  if (aiResult.success && aiResult.output) {
    proposedRecommendation = {
      id: aiResult.recommendationId || `rec-prod-${Date.now()}`,
      agentId: "PRODUCTION_PLANNING_AGENT",
      objective: "STABILIZE_SUPPLY",
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
    ? `Production planning intelligence completed with AI interpretation. Advisory recommendation proposed for human review.`
    : `Deterministic production planning calculations completed. AI provider unavailable: ${aiResult.error || "No AI output"}.`;

  return {
    success: true,
    commodity,
    state,
    domain,
    snapshot,
    marketSnapshot,
    aiInterpretation: aiResult.output,
    proposedRecommendation,
    runId: aiResult.runId,
    status: finalStatus,
    message: finalMessage,
    requiresHumanReview: true,
  };
}
