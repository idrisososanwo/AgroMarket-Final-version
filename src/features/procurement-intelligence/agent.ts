/**
 * AgroMarket Phase 2.7: Procurement Intelligence & B2B Procurement Agent
 * Autonomous-Free Advisory Orchestrator
 *
 * Implements:
 * OBSERVE -> NORMALIZE -> CONSOLIDATE -> PRIORITIZE -> ESTIMATE PROCUREMENT NEED ->
 * ANALYZE SUPPLY -> ANALYZE MARKET -> IDENTIFY PROCUREMENT OPTIONS -> INTERPRET ->
 * RECOMMEND -> HUMAN ACTION -> OUTCOME -> EVALUATION -> IMPROVEMENT
 *
 * SAFETY INVARIANTS:
 * 1. The agent NEVER executes autonomous purchasing, bids, orders, reservations, contracts, or funds transfers.
 * 2. Deterministic calculations are authoritative; AI reasoning is strictly advisory interpretation.
 * 3. Zero pig/pork tolerance across all parameters, prompts, evidence packages, and outputs.
 * 4. Privacy preservation: private buyer names, phone numbers, and addresses are strictly stripped.
 * 5. Handles sparse data gracefully (INSUFFICIENT_DATA, UNKNOWN, LOW_CONFIDENCE).
 * 6. Graceful fallbacks when AI provider is unavailable (falls back to deterministic intelligence).
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { IntelligenceEvidence } from "@/features/intelligence/types";
import { runAgentReasoning } from "@/features/intelligence/orchestrator";
import { AIProvider } from "@/features/intelligence/ai-provider";
import {
  ProcurementIntelligenceSnapshot,
  ProcurementOpportunityRecord,
  ProcurementRecommendationRecord,
  ProcurementRunResult,
  ProcurementDemandTarget,
} from "./types";
import {
  calculateProcurementPriority,
  classifyProcurementStrategy,
  analyzeSupplierDiversification,
  assessProcurementRisk,
  calculateCostIntelligence,
  determineOpportunityStatus,
} from "./calculations";
import {
  loadProcurementContext,
  LoadedProcurementContext,
} from "./data-layer";

export interface RunProcurementAgentParams {
  commodity: string;
  state: string;
  demandId?: string;
  targetQuantity?: number;
  unit?: string;
  desiredDeliveryDate?: string;
  userId?: string | null;
  aiProvider?: AIProvider;
  skipAIEvaluation?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any;
}

/**
 * Executes the Procurement Intelligence & B2B Procurement Agent pipeline
 */
export async function runProcurementIntelligenceAgent(
  params: RunProcurementAgentParams
): Promise<ProcurementRunResult> {
  const { commodity, state } = params;
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

  // 1. OBSERVE: Load real platform context
  let context: LoadedProcurementContext;
  try {
    context = await loadProcurementContext(commodity, state, params.demandId, supabase);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const emptySnap: ProcurementIntelligenceSnapshot = {
      demand_id: params.demandId || null,
      buyer_id: params.userId || null,
      commodity,
      state,
      lga: null,
      target_quantity: params.targetQuantity || 0,
      matched_quantity: 0,
      supply_gap: params.targetQuantity || 0,
      unit: params.unit || "KG",
      fulfillment_percentage: 0,
      procurement_priority_score: 0,
      priority_components: {
        demandUrgency: 0,
        supplyGap: 0,
        demandPressure: 0,
        marketPressure: 0,
        matchQuality: 0,
        leadTimeAvailability: 0,
        riskDisruption: 0,
      },
      recommended_strategy: "INSUFFICIENT_DATA",
      procurement_risk_level: "UNKNOWN",
      risk_factors: ["CONTEXT_LOAD_FAILURE"],
      opportunity_status: "OPEN",
      candidate_suppliers_count: 0,
      supplier_concentration_detected: false,
      concentration_ratio: 0,
      market_pressure_level: "INSUFFICIENT_DATA",
      observed_price_min: null,
      observed_price_max: null,
      observed_price_median: null,
      price_trend: "INSUFFICIENT_DATA",
      estimated_procurement_cost: null,
      processing_required: false,
      security_disruption_flag: false,
      constraints: [`Failed to load procurement context: ${errorMsg}`],
      missing_evidence: ["Database error or connectivity failure"],
      confidence: 0.2,
      calculated_at: new Date().toISOString(),
    };

    return {
      success: false,
      demandId: params.demandId || "DEMAND-NONE",
      commodity,
      state,
      snapshot: emptySnap,
      recommendations: [],
      aiInterpretation: null,
      aiSkippedOrFailed: true,
    };
  }

  // 2. CONSOLIDATE DEMAND TARGET
  const targetDemand: ProcurementDemandTarget = {
    id: params.demandId || context.targetDemand?.id || `DEMAND-${commodity.toUpperCase()}-${state.toUpperCase()}`,
    buyerId: params.userId || context.targetDemand?.buyerId,
    commodity,
    requiredQuantity: params.targetQuantity || context.targetDemand?.quantity || 1000,
    unit: params.unit || context.targetDemand?.unit || "KG",
    state,
    desiredDeliveryDate: params.desiredDeliveryDate || context.targetDemand?.desiredDeliveryDate || null,
    targetPricePerUnit: context.targetDemand?.targetPricePerUnit || null,
    requiresProcessing: context.targetDemand?.requiresProcessing || context.matchedSupply.requiresProcessing,
    specifications: context.targetDemand?.specifications || {},
    notes: context.targetDemand?.notes || null,
  };

  const matchedQuantity = context.matchedSupply.matchedQuantity;
  const supplyGap = Math.max(0, targetDemand.requiredQuantity - matchedQuantity);
  const fulfillmentPercentage =
    targetDemand.requiredQuantity > 0
      ? Math.min(100, Math.round((matchedQuantity / targetDemand.requiredQuantity) * 1000) / 10)
      : 0;

  // 3. DETERMINISTIC PRIORITY SCORING
  const priorityScore = calculateProcurementPriority({
    targetQuantity: targetDemand.requiredQuantity,
    matchedQuantity,
    desiredDeliveryDate: targetDemand.desiredDeliveryDate,
    demandPressureScore: context.demandIntelligence.demandPressureScore,
    marketPressureScore: context.marketIntelligence.marketPressureScore,
    matchScore: context.matchedSupply.matchScore,
    securityDisruptionReported: context.securityStatus.securityDisruptionReported,
    corridorDisruptionReported: context.securityStatus.corridorDisruptionReported,
    processingBottleneckDetected: context.matchedSupply.requiresProcessing && !context.matchedSupply.processingFacilityAvailable,
  });

  // 4. SUPPLIER DIVERSIFICATION ANALYSIS
  const diversification = analyzeSupplierDiversification(context.matchedSupply.candidates);

  // 5. DETERMINISTIC STRATEGY CLASSIFICATION
  const recommendedStrategy = classifyProcurementStrategy({
    commodity,
    targetQuantity: targetDemand.requiredQuantity,
    matchedQuantity,
    candidateCount: context.matchedSupply.candidateCount,
    maxSingleSupplierQuantity: diversification.largestSupplierQuantity,
    requiresProcessing: targetDemand.requiresProcessing,
    processingFacilityAvailable: context.matchedSupply.processingFacilityAvailable,
    isAggregatedPoolPresent: context.matchedSupply.isAggregatedPoolPresent,
    alternativeRegionalSupplyAvailable: context.matchedSupply.alternativeRegionalSupplyAvailable,
    upcomingHarvestForecastQuantity: context.productionPlanning.upcomingHarvestForecastQuantity,
  });

  // 6. PROCUREMENT COST INTELLIGENCE
  const costIntelligence = calculateCostIntelligence({
    commodity,
    state,
    unit: targetDemand.unit,
    targetQuantity: targetDemand.requiredQuantity,
    observations: context.marketIntelligence.priceObservations,
    marketPressure: context.marketIntelligence.marketPressureLevel,
  });

  // 7. PROCUREMENT RISK ASSESSMENT
  const riskAssessment = assessProcurementRisk({
    commodity,
    targetQuantity: targetDemand.requiredQuantity,
    matchedQuantity,
    concentrationDetected: diversification.concentrationDetected,
    securityDisruptionReported: context.securityStatus.securityDisruptionReported,
    corridorDisruptionReported: context.securityStatus.corridorDisruptionReported,
    processingBottleneckDetected: Boolean(targetDemand.requiresProcessing && !context.matchedSupply.processingFacilityAvailable),
    marketPressureLevel: context.marketIntelligence.marketPressureLevel,
    demandVolatilityLevel: context.demandIntelligence.demandVolatilityLevel,
    confidence: priorityScore.confidence,
  });

  const allConstraints = [
    ...context.matchedSupply.constraints,
    ...priorityScore.constraints,
    ...riskAssessment.notes.filter((n) => n.includes("RISK") || n.includes("DEFICIT") || n.includes("DISRUPTION")),
  ];

  const opportunityStatus = determineOpportunityStatus(
    targetDemand.requiredQuantity,
    matchedQuantity,
    allConstraints
  );

  // 8. GENERATE ADVISORY RECOMMENDATIONS
  const recommendations: ProcurementRecommendationRecord[] = [];

  if (recommendedStrategy === "DIRECT_SUPPLIER" && context.matchedSupply.candidates.length > 0) {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      opportunity_id: null,
      demand_id: targetDemand.id,
      recommendation_type: "DIRECT_OFFTAKE",
      title: `Direct offtake agreement available for ${commodity}`,
      details: `A single verified supplier has sufficient available capacity to meet ${fulfillmentPercentage}% of demand (${matchedQuantity} ${targetDemand.unit}). Review supplier credentials and proceed with bilateral negotiation if terms are acceptable.`,
      suggested_action: "Review supplier terms and issue formal request for quotation (RFQ).",
      confidence: priorityScore.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else if (recommendedStrategy === "MULTI_SUPPLIER") {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      opportunity_id: null,
      demand_id: targetDemand.id,
      recommendation_type: "SPLIT_ORDER_SOURCING",
      title: `Split-order multi-supplier sourcing recommended for ${commodity}`,
      details: `Fulfilling ${targetDemand.requiredQuantity} ${targetDemand.unit} requires coordinating across ${context.matchedSupply.candidateCount} verified supply sources. Total available volume meets ${fulfillmentPercentage}% of demand.`,
      suggested_action: "Structure split purchase orders across verified suppliers to lock in aggregate volume.",
      confidence: priorityScore.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else if (recommendedStrategy === "AGGREGATED_PROCUREMENT") {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      opportunity_id: null,
      demand_id: targetDemand.id,
      recommendation_type: "COOPERATIVE_AGGREGATION",
      title: `Engage cooperative aggregation pool in ${state}`,
      details: `Smallholder production clusters in ${state} can satisfy ${fulfillmentPercentage}% of requested volume when aggregated at a certified collection center.`,
      suggested_action: "Coordinate with aggregation cluster manager to confirm delivery schedules and quality staging.",
      confidence: priorityScore.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else if (recommendedStrategy === "PROCESSING_REQUIRED") {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      opportunity_id: null,
      demand_id: targetDemand.id,
      recommendation_type: "PROCESSOR_COMMISSIONING",
      title: `Downstream processing coordination required for ${commodity}`,
      details: `Commodity requires intermediate processing/milling. Verify capacity at third-party certified processing facilities before committing to raw offtake batches.`,
      suggested_action: "Commission batch milling slot at local facility and verify post-processing transport timeline.",
      confidence: priorityScore.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else if (recommendedStrategy === "REGIONAL_ALTERNATIVE") {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      opportunity_id: null,
      demand_id: targetDemand.id,
      recommendation_type: "INTER_STATE_CORRIDOR_OFFTAKE",
      title: `Source from adjacent regional corridor supply`,
      details: `In-state availability in ${state} is constrained (${matchedQuantity} ${targetDemand.unit} available). Adjacent corridor production hubs have available inventory.`,
      suggested_action: "Evaluate interstate haulage terms and dispatch quotes before procurement commitment.",
      confidence: priorityScore.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else if (recommendedStrategy === "WAIT_AND_MONITOR") {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      opportunity_id: null,
      demand_id: targetDemand.id,
      recommendation_type: "PRICE_MONITORING_HOLD",
      title: `Monitor market: upcoming harvest replenishment expected`,
      details: `Immediate spot supply is limited, but production planning models anticipate new crop inflow within 2-4 weeks. Current market prices are elevated.`,
      suggested_action: "Defer large spot purchases and set automated threshold alert for incoming harvest listings.",
      confidence: priorityScore.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Supplier Concentration Warning Recommendation
  if (diversification.concentrationDetected) {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      opportunity_id: null,
      demand_id: targetDemand.id,
      recommendation_type: "SUPPLIER_DIVERSIFICATION_REVIEW",
      title: `Supplier concentration advisory: ${diversification.concentrationRatio}% single-source ratio`,
      details: `A single supplier represents ${diversification.concentrationRatio}% of available matched volume. To mitigate fulfillment shock or failure, consider splitting volume across secondary suppliers.`,
      suggested_action: "Onboard secondary verified backup suppliers before issuing 100% volume commitment.",
      confidence: priorityScore.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // 9. CONSTRUCT PERSISTENT SNAPSHOT & OPPORTUNITY
  const snapshot: ProcurementIntelligenceSnapshot = {
    demand_id: targetDemand.id,
    buyer_id: targetDemand.buyerId || null,
    commodity,
    state,
    lga: targetDemand.lga || null,
    target_quantity: targetDemand.requiredQuantity,
    matched_quantity: matchedQuantity,
    supply_gap: supplyGap,
    unit: targetDemand.unit,
    fulfillment_percentage: fulfillmentPercentage,
    procurement_priority_score: priorityScore.score,
    priority_components: priorityScore.components,
    recommended_strategy: recommendedStrategy,
    procurement_risk_level: riskAssessment.riskLevel,
    risk_factors: riskAssessment.riskFactors,
    opportunity_status: opportunityStatus,
    candidate_suppliers_count: context.matchedSupply.candidateCount,
    supplier_concentration_detected: diversification.concentrationDetected,
    concentration_ratio: diversification.concentrationRatio,
    market_pressure_level: costIntelligence.marketPressure,
    observed_price_min: costIntelligence.observedPriceMin,
    observed_price_max: costIntelligence.observedPriceMax,
    observed_price_median: costIntelligence.observedPriceMedian,
    price_trend: costIntelligence.priceTrend,
    estimated_procurement_cost: costIntelligence.estimatedProcurementCost,
    processing_required: Boolean(targetDemand.requiresProcessing),
    security_disruption_flag: context.securityStatus.securityDisruptionReported,
    constraints: allConstraints,
    missing_evidence: priorityScore.missingEvidence,
    confidence: priorityScore.confidence,
    metadata: {
      diversificationNotes: diversification.notes,
      costNotes: costIntelligence.notes,
      riskNotes: riskAssessment.notes,
      priorityLevel: priorityScore.level,
      is_public: targetDemand.buyerId ? false : true,
    },
    calculated_at: new Date().toISOString(),
  };

  const opportunityRecord: ProcurementOpportunityRecord = {
    snapshot_id: "PENDING_SNAPSHOT_ID",
    demand_id: targetDemand.id,
    buyer_id: targetDemand.buyerId || null,
    commodity,
    state,
    lga: targetDemand.lga || null,
    required_quantity: targetDemand.requiredQuantity,
    unit: targetDemand.unit,
    desired_delivery_date: targetDemand.desiredDeliveryDate || null,
    priority_score: priorityScore.score,
    priority_level: priorityScore.level,
    strategy: recommendedStrategy,
    risk_level: riskAssessment.riskLevel,
    status: opportunityStatus,
    matched_quantity: matchedQuantity,
    unmatched_gap: supplyGap,
    supplier_count: context.matchedSupply.candidateCount,
    notes: `Recommended strategy: ${recommendedStrategy.replace(/_/g, " ")}. Risk level: ${riskAssessment.riskLevel}.`,
    metadata: {
      costSummary: costIntelligence.observedPriceMedian
        ? `Observed median ₦${costIntelligence.observedPriceMedian.toLocaleString()}/${targetDemand.unit}`
        : "No price history",
    },
    created_at: new Date().toISOString(),
  };

  // 10. PERSIST TO DATABASE (Append-Only)
  if (supabase) {
    try {
      const { data: insertedSnap } = await supabase
        .from("procurement_intelligence_snapshots")
        .insert({
          demand_id: snapshot.demand_id,
          buyer_id: snapshot.buyer_id,
          commodity: snapshot.commodity,
          state: snapshot.state,
          lga: snapshot.lga,
          target_quantity: snapshot.target_quantity,
          matched_quantity: snapshot.matched_quantity,
          supply_gap: snapshot.supply_gap,
          unit: snapshot.unit,
          fulfillment_percentage: snapshot.fulfillment_percentage,
          procurement_priority_score: snapshot.procurement_priority_score,
          priority_components: snapshot.priority_components,
          recommended_strategy: snapshot.recommended_strategy,
          procurement_risk_level: snapshot.procurement_risk_level,
          risk_factors: snapshot.risk_factors,
          opportunity_status: snapshot.opportunity_status,
          candidate_suppliers_count: snapshot.candidate_suppliers_count,
          supplier_concentration_detected: snapshot.supplier_concentration_detected,
          concentration_ratio: snapshot.concentration_ratio,
          market_pressure_level: snapshot.market_pressure_level,
          observed_price_min: snapshot.observed_price_min,
          observed_price_max: snapshot.observed_price_max,
          observed_price_median: snapshot.observed_price_median,
          price_trend: snapshot.price_trend,
          estimated_procurement_cost: snapshot.estimated_procurement_cost,
          processing_required: snapshot.processing_required,
          security_disruption_flag: snapshot.security_disruption_flag,
          constraints: snapshot.constraints,
          missing_evidence: snapshot.missing_evidence,
          confidence: snapshot.confidence,
          metadata: snapshot.metadata,
        })
        .select("id")
        .single();

      if (insertedSnap && insertedSnap.id) {
        snapshot.id = insertedSnap.id;
        opportunityRecord.snapshot_id = insertedSnap.id;

        // Insert opportunity record
        const { data: insertedOpp } = await supabase
          .from("procurement_opportunities")
          .insert({
            snapshot_id: insertedSnap.id,
            demand_id: opportunityRecord.demand_id,
            buyer_id: opportunityRecord.buyer_id,
            commodity: opportunityRecord.commodity,
            state: opportunityRecord.state,
            lga: opportunityRecord.lga,
            required_quantity: opportunityRecord.required_quantity,
            unit: opportunityRecord.unit,
            desired_delivery_date: opportunityRecord.desired_delivery_date,
            priority_score: opportunityRecord.priority_score,
            priority_level: opportunityRecord.priority_level,
            strategy: opportunityRecord.strategy,
            risk_level: opportunityRecord.risk_level,
            status: opportunityRecord.status,
            matched_quantity: opportunityRecord.matched_quantity,
            unmatched_gap: opportunityRecord.unmatched_gap,
            supplier_count: opportunityRecord.supplier_count,
            notes: opportunityRecord.notes,
            metadata: opportunityRecord.metadata,
          })
          .select("id")
          .single();

        if (insertedOpp && insertedOpp.id) {
          opportunityRecord.id = insertedOpp.id;
        }

        // Insert recommendations
        for (const rec of recommendations) {
          rec.snapshot_id = insertedSnap.id;
          rec.opportunity_id = insertedOpp?.id || null;
        }

        if (recommendations.length > 0) {
          await supabase.from("procurement_recommendations").insert(
            recommendations.map((r) => ({
              snapshot_id: insertedSnap.id,
              opportunity_id: r.opportunity_id,
              demand_id: r.demand_id,
              recommendation_type: r.recommendation_type,
              title: r.title,
              details: r.details,
              suggested_action: r.suggested_action,
              confidence: r.confidence,
              status: r.status,
            }))
          );
        }
      }
    } catch (dbErr) {
      console.warn("Failed to persist procurement intelligence records to Supabase:", dbErr);
    }
  }

  // 11. AI REASONING INTERPRETATION (Phase 2.2 AI Gateway)
  let aiInterpretation = null;
  let aiSkippedOrFailed = false;

  if (!params.skipAIEvaluation) {
    const evidenceItems: IntelligenceEvidence[] = [
      {
        sourceType: "B2B_DEMAND",
        sourceId: `target-demand-${targetDemand.id}`,
        description: `B2B demand offtake: ${targetDemand.requiredQuantity} ${targetDemand.unit} of ${commodity} in ${state}. Priority score: ${priorityScore.score}/100 (${priorityScore.level}). Strategy: ${recommendedStrategy}.`,
        observedAt: new Date().toISOString(),
        relevance: 1.0,
      },
      {
        sourceType: "PRODUCTION_OUTPUT",
        sourceId: `matched-supply-${commodity}-${state}`,
        description: `Supply matches: ${matchedQuantity} ${targetDemand.unit} sourced across ${context.matchedSupply.candidateCount} suppliers (${fulfillmentPercentage}% fulfilled, gap: ${supplyGap} ${targetDemand.unit}). Concentration: ${diversification.concentrationRatio}% (${diversification.concentrationDetected ? "CONCENTRATED" : "SPREAD"}).`,
        observedAt: new Date().toISOString(),
        relevance: 0.95,
      },
    ];

    if (costIntelligence.observedPriceMedian !== null) {
      evidenceItems.push({
        sourceType: "PRICE_OBSERVATION",
        sourceId: `price-ctx-${commodity}-${state}`,
        description: `Market price context: ₦${costIntelligence.observedPriceMedian.toLocaleString()} / ${targetDemand.unit} median (trend: ${costIntelligence.priceTrend}, pressure: ${costIntelligence.marketPressure}).`,
        observedAt: new Date().toISOString(),
        relevance: 0.9,
      });
    }

    if (allConstraints.length > 0) {
      evidenceItems.push({
        sourceType: "SECURITY_INCIDENT",
        sourceId: `constraints-${commodity}-${state}`,
        description: `Operational & corridor constraints: ${allConstraints.join("; ")}`,
        observedAt: new Date().toISOString(),
        relevance: 0.9,
      });
    }

    try {
      const reasoningResult = await runAgentReasoning({
        agentId: "PROCUREMENT_INTELLIGENCE_AGENT",
        objective: "PROCUREMENT_STRATEGY_ANALYSIS",
        commodity,
        location: { state },
        signals: [],
        observations: [],
        evidenceItems,
        provider: params.aiProvider,
        supabaseClient: supabase,
      });

      if (reasoningResult.success && reasoningResult.output?.interpretation) {
        aiInterpretation = reasoningResult.output;
      } else {
        aiSkippedOrFailed = true;
      }
    } catch {
      aiSkippedOrFailed = true;
    }
  } else {
    aiSkippedOrFailed = true;
  }

  return {
    success: true,
    demandId: targetDemand.id,
    commodity,
    state,
    snapshot,
    opportunity: opportunityRecord,
    recommendations,
    aiInterpretation,
    aiSkippedOrFailed,
  };
}
