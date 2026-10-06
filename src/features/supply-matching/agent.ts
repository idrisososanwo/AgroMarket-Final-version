/**
 * AgroMarket Phase 2.6: Supply Matching & Agricultural Coordination Agent
 * Autonomous-Free Advisory Orchestrator
 *
 * Implements:
 * OBSERVE -> NORMALIZE -> MATCH -> SCORE -> IDENTIFY GAPS -> IDENTIFY CONSTRAINTS -> INTERPRET -> RECOMMEND -> HUMAN ACTION -> OUTCOME -> EVALUATION
 *
 * SAFETY INVARIANTS:
 * 1. The agent NEVER executes autonomous procurement, reservations, sales, or financial commitments.
 * 2. Deterministic calculations are authoritative; AI reasoning is strictly advisory.
 * 3. Zero pig/pork tolerance across all parameters, prompts, evidence packages, and outputs.
 * 4. Privacy preservation: private buyer names, phone numbers, and addresses are strictly stripped.
 * 5. Handles sparse data gracefully (INSUFFICIENT_DATA, LOW_CONFIDENCE_MATCH, UNSATISFIED).
 * 6. Graceful fallbacks when AI provider is unavailable (falls back to deterministic intelligence).
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  IntelligenceEvidence,
} from "@/features/intelligence/types";
import { runAgentReasoning } from "@/features/intelligence/orchestrator";
import { AIProvider } from "@/features/intelligence/ai-provider";
import { MarketIntelligenceSnapshot } from "@/features/market-intelligence/types";
import { ProductionPlanningSnapshot } from "@/features/production-planning/types";
import { DemandIntelligenceSnapshot } from "@/features/demand-intelligence/types";
import {
  SupplyMatchingSnapshot,
  SupplyMatchCandidateRecord,
  SupplyCoordinationRecommendationRecord,
  SupplyMatchingRunResult,
  DemandOfftakeTarget,
} from "./types";
import {
  executeSupplyMatching,
  calculateSupplyGap,
} from "./calculations";
import {
  loadMatchingContext,
  LoadedSupplyMatchingContext,
} from "./data-layer";

export interface RunSupplyMatchingParams {
  commodity: string;
  state: string;
  demandId?: string;
  targetQuantity?: number;
  unit?: string;
  desiredDeliveryDate?: string;
  userId?: string | null;
  aiProvider?: AIProvider;
  skipAIEvaluation?: boolean;
  marketSnapshot?: MarketIntelligenceSnapshot;
  productionSnapshot?: ProductionPlanningSnapshot;
  demandSnapshot?: DemandIntelligenceSnapshot;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any;
}

/**
 * Executes the Supply Matching & Agricultural Coordination Agent pipeline
 */
export async function runSupplyMatchingAgent(
  params: RunSupplyMatchingParams
): Promise<SupplyMatchingRunResult> {
  const { commodity, state, marketSnapshot, productionSnapshot, demandSnapshot } = params;
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
  let context: LoadedSupplyMatchingContext;
  try {
    context = await loadMatchingContext(commodity, state, supabase);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const emptySnap: SupplyMatchingSnapshot = {
      demand_id: params.demandId || null,
      commodity,
      state,
      lga: null,
      target_quantity: params.targetQuantity || 0,
      matched_quantity: 0,
      remaining_gap: params.targetQuantity || 0,
      unit: params.unit || "KG",
      fulfillment_percentage: 0,
      match_classification: "INSUFFICIENT_DATA",
      coordination_type: "INSUFFICIENT_DATA",
      match_score: 0,
      component_scores: {
        commodityCompatibility: 0,
        quantityCompatibility: 0,
        locationCompatibility: 0,
        availabilityCompatibility: 0,
        specificationCompatibility: 0,
        processingAggregationFit: 0,
        logisticsCompatibility: 0,
      },
      candidates_count: 0,
      aggregation_pool_count: 0,
      processing_required: false,
      processing_facility_id: null,
      logistics_corridor: null,
      constraints: [`Failed to load supply matching context: ${errorMsg}`],
      missing_evidence: ["Database error or connectivity failure"],
      confidence: 0.3,
      calculated_at: new Date().toISOString(),
    };

    return {
      success: false,
      demandId: params.demandId || "DEMAND-NONE",
      commodity,
      state,
      snapshot: emptySnap,
      candidates: [],
      recommendations: [],
      gapAnalysis: {
        demandId: params.demandId || "DEMAND-NONE",
        requestedQuantity: params.targetQuantity || 0,
        matchedQuantity: 0,
        remainingQuantity: params.targetQuantity || 0,
        percentageFulfilled: 0,
        numberOfSupplySources: 0,
        aggregationRequired: false,
        processingRequired: false,
        logisticsRequired: false,
        constraints: [`Data layer load error: ${errorMsg}`],
        status: "INSUFFICIENT_DATA",
      },
      error: errorMsg,
    };
  }

  // Determine active Demand Offtake Target
  let targetDemand: DemandOfftakeTarget;

  if (params.demandId) {
    const found = context.demands.find((d) => d.id === params.demandId);
    if (found) {
      targetDemand = found;
    } else {
      targetDemand = {
        id: params.demandId,
        title: `Procurement Request for ${commodity}`,
        commodityOrProduct: commodity,
        quantity: params.targetQuantity || 1000,
        unit: params.unit || "KG",
        state,
        desiredDeliveryDate: params.desiredDeliveryDate || new Date(Date.now() + 7 * 86400000).toISOString(),
      };
    }
  } else if (context.demands.length > 0) {
    targetDemand = context.demands[0];
  } else if (demandSnapshot && demandSnapshot.forecast && demandSnapshot.forecast.predictedDemandVolume > 0) {
    targetDemand = {
      id: `snap-demand-${commodity}-${state}`,
      title: `Forecast Offtake Demand: ${commodity}`,
      commodityOrProduct: commodity,
      quantity: demandSnapshot.forecast.predictedDemandVolume,
      unit: demandSnapshot.forecast.volumeUnit || "KG",
      state,
      desiredDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
  } else {
    targetDemand = {
      id: `inferred-demand-${commodity}-${state}`,
      title: `Ecosystem Demand Coordination: ${commodity}`,
      quantity: params.targetQuantity || 1000,
      unit: params.unit || "KG",
      commodityOrProduct: commodity,
      state,
      desiredDeliveryDate: params.desiredDeliveryDate || new Date(Date.now() + 7 * 86400000).toISOString(),
    };
  }

  // 2. NORMALIZE & MATCH
  const matchResult = executeSupplyMatching(
    targetDemand,
    context.supplies,
    context.facilities,
    context.logistics,
    context.securityIncidents
  );

  // 3. GAP ANALYSIS
  const gapAnalysis = calculateSupplyGap(
    targetDemand,
    matchResult.matchedQuantity,
    matchResult.candidates.length,
    Boolean(matchResult.processingRequirement?.required),
    matchResult.constraints
  );

  // 4. RECOMMENDATIONS (Advisory State Machine)
  const recommendations: SupplyCoordinationRecommendationRecord[] = [];

  if (matchResult.aggregationSummary && matchResult.aggregationSummary.sourcesCount > 1) {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      demand_id: targetDemand.id,
      recommendation_type: "AGGREGATE_FARMERS",
      title: `Aggregate ${matchResult.aggregationSummary.sourcesCount} supply sources in ${matchResult.aggregationSummary.primaryStates.join(", ")}`,
      details: `Target demand of ${targetDemand.quantity} ${targetDemand.unit} can be fulfilled to ${matchResult.fulfillmentPercentage}% (${matchResult.matchedQuantity} ${targetDemand.unit}) by pooling ${matchResult.aggregationSummary.sourcesCount} production sources. Establish aggregation hub coordination prior to commercial commitment.`,
      confidence: matchResult.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else if (matchResult.candidates.length === 1 && matchResult.fulfillmentPercentage >= 80) {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      demand_id: targetDemand.id,
      recommendation_type: "CONNECT_DIRECT_SUPPLY",
      title: `Connect direct verified supply for ${targetDemand.commodityOrProduct}`,
      details: `A single verified supplier (${matchResult.candidates[0].supply.producerOrAggregatorName} in ${matchResult.candidates[0].supply.state}) can satisfy ${matchResult.fulfillmentPercentage}% of requested volume (${matchResult.matchedQuantity} ${targetDemand.unit}). Recommend initiating bilateral supply contract review.`,
      confidence: matchResult.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (matchResult.processingRequirement?.required) {
    if (matchResult.processingRequirement.facilityAvailable && matchResult.processingRequirement.matchedFacility) {
      recommendations.push({
        snapshot_id: "PENDING_SNAPSHOT_ID",
        demand_id: targetDemand.id,
        recommendation_type: "ROUTE_THROUGH_PROCESSOR",
        title: `Route raw output through processor: ${matchResult.processingRequirement.matchedFacility.name}`,
        details: `Raw ${targetDemand.commodityOrProduct} requires processing. Certified local facility '${matchResult.processingRequirement.matchedFacility.name}' in ${matchResult.processingRequirement.matchedFacility.state} has capacity. Coordinate batch scheduling before field harvest.`,
        confidence: matchResult.confidence,
        status: "PROPOSED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else {
      recommendations.push({
        snapshot_id: "PENDING_SNAPSHOT_ID",
        demand_id: targetDemand.id,
        recommendation_type: "EXPAND_SUPPLY_BASE",
        title: `Processing facility constraint identified for ${targetDemand.commodityOrProduct}`,
        details: `Demand requires specialized processing, but no active processing facility with certified capacity was identified in ${targetDemand.state} corridor. Explore mobile processing units or inter-state transfer.`,
        confidence: matchResult.confidence,
        status: "PROPOSED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (matchResult.remainingGap > 0 && matchResult.matchedQuantity > 0) {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      demand_id: targetDemand.id,
      recommendation_type: "EXPAND_SUPPLY_BASE",
      title: `Unmatched supply gap: ${matchResult.remainingGap} ${targetDemand.unit} remaining`,
      details: `Current platform supply leaves a ${matchResult.remainingGap} ${targetDemand.unit} deficit (${(100 - matchResult.fulfillmentPercentage).toFixed(0)}% gap). Issue targeted offtake signal to cooperative clusters in adjacent regional corridor states.`,
      confidence: matchResult.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (matchResult.constraints.some((c) => c.includes("SECURITY_DISRUPTION_REPORTED"))) {
    recommendations.push({
      snapshot_id: "PENDING_SNAPSHOT_ID",
      demand_id: targetDemand.id,
      recommendation_type: "RESOLVE_LOGISTICS_CONSTRAINT",
      title: `Corridor security review required for transit to ${targetDemand.state}`,
      details: `Active security advisory or transit friction reported on movement corridor. Verify route advisories with vetted carriers before dispatching bulk agricultural cargo.`,
      confidence: matchResult.confidence,
      status: "PROPOSED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // 5. CONSTRUCT SNAPSHOT & CANDIDATE RECORDS
  const snapshot: SupplyMatchingSnapshot = {
    demand_id: targetDemand.id,
    commodity,
    state,
    lga: targetDemand.lga || null,
    target_quantity: targetDemand.quantity,
    matched_quantity: matchResult.matchedQuantity,
    remaining_gap: matchResult.remainingGap,
    unit: targetDemand.unit,
    fulfillment_percentage: matchResult.fulfillmentPercentage,
    match_classification: matchResult.matchClassification,
    coordination_type: matchResult.coordinationType,
    match_score: matchResult.matchScore,
    component_scores: matchResult.componentScores,
    candidates_count: matchResult.candidates.length,
    aggregation_pool_count: matchResult.aggregationSummary?.sourcesCount || 0,
    processing_required: Boolean(matchResult.processingRequirement?.required),
    processing_facility_id: matchResult.processingRequirement?.matchedFacility?.id || null,
    logistics_corridor: matchResult.logisticsCorridor || null,
    constraints: matchResult.constraints,
    missing_evidence: matchResult.missingEvidence,
    confidence: matchResult.confidence,
    metadata: {
      explanation: matchResult.coordinationOpportunitySummary,
      marketContext: marketSnapshot
        ? { pricePressure: marketSnapshot.marketPressure?.pressureLevel, supplyStatus: marketSnapshot.supplyAnalysis?.status }
        : null,
      productionContext: productionSnapshot
        ? { opportunityScore: productionSnapshot.opportunity?.opportunityScore, riskScore: productionSnapshot.risk?.riskScore }
        : null,
      demandContext: demandSnapshot
        ? { demandPressure: demandSnapshot.demandPressure?.level, forecastDirection: demandSnapshot.forecast?.forecastDirection }
        : null,
    },
    calculated_at: new Date().toISOString(),
  };

  const candidateRecords: SupplyMatchCandidateRecord[] = matchResult.candidates.map((c) => ({
    snapshot_id: "PENDING_SNAPSHOT_ID",
    supply_id: c.supply.id,
    supply_source_type: c.supply.sourceType,
    supplier_name: c.supply.producerOrAggregatorName,
    state: c.supply.state,
    lga: c.supply.lga || null,
    available_quantity: c.supply.quantity,
    allocated_quantity: c.allocatedQuantity,
    unit: c.supply.unit,
    candidate_score: c.candidateScore,
    reliability_level: c.reliabilityLevel,
    ready_date: c.supply.readyDate || null,
    verification_status: c.supply.verificationStatus,
    distance_tier: c.proximityTier,
    metadata: {
      corridor: c.corridor,
      notes: c.notes,
    },
    created_at: new Date().toISOString(),
  }));

  // 6. DATABASE PERSISTENCE (Append-Only Snapshot & Candidates)
  if (supabase) {
    try {
      const { data: insertedSnap } = await supabase
        .from("supply_matching_snapshots")
        .insert({
          demand_id: snapshot.demand_id,
          commodity: snapshot.commodity,
          state: snapshot.state,
          lga: snapshot.lga,
          target_quantity: snapshot.target_quantity,
          matched_quantity: snapshot.matched_quantity,
          remaining_gap: snapshot.remaining_gap,
          unit: snapshot.unit,
          fulfillment_percentage: snapshot.fulfillment_percentage,
          match_classification: snapshot.match_classification,
          coordination_type: snapshot.coordination_type,
          match_score: snapshot.match_score,
          component_scores: snapshot.component_scores,
          candidates_count: snapshot.candidates_count,
          aggregation_pool_count: snapshot.aggregation_pool_count,
          processing_required: snapshot.processing_required,
          processing_facility_id: snapshot.processing_facility_id,
          logistics_corridor: snapshot.logistics_corridor,
          constraints: snapshot.constraints,
          missing_evidence: snapshot.missing_evidence,
          confidence: snapshot.confidence,
          metadata: snapshot.metadata,
        })
        .select("id")
        .single();

      if (insertedSnap && insertedSnap.id) {
        snapshot.id = insertedSnap.id;

        // Associate foreign key ID with candidate records & recommendations
        for (const cand of candidateRecords) {
          cand.snapshot_id = insertedSnap.id;
        }
        for (const rec of recommendations) {
          rec.snapshot_id = insertedSnap.id;
        }

        // Insert candidates
        if (candidateRecords.length > 0) {
          await supabase.from("supply_match_candidates").insert(
            candidateRecords.map((c) => ({
              snapshot_id: insertedSnap.id,
              supply_id: c.supply_id,
              supply_source_type: c.supply_source_type,
              supplier_name: c.supplier_name,
              state: c.state,
              lga: c.lga,
              available_quantity: c.available_quantity,
              allocated_quantity: c.allocated_quantity,
              unit: c.unit,
              candidate_score: c.candidate_score,
              reliability_level: c.reliability_level,
              ready_date: c.ready_date,
              verification_status: c.verification_status,
              distance_tier: c.distance_tier,
              metadata: c.metadata,
            }))
          );
        }

        // Insert recommendations
        if (recommendations.length > 0) {
          await supabase.from("supply_coordination_recommendations").insert(
            recommendations.map((r) => ({
              snapshot_id: insertedSnap.id,
              demand_id: r.demand_id,
              recommendation_type: r.recommendation_type,
              title: r.title,
              details: r.details,
              confidence: r.confidence,
              status: r.status,
            }))
          );
        }
      }
    } catch {
      // Continue even if snapshot logging fails
    }
  }

  // 7. INTERPRET: Controlled AI Reasoning via Phase 2.2 AI Gateway
  let aiInterpretation: SupplyMatchingRunResult["aiInterpretation"] = undefined;

  if (!params.skipAIEvaluation) {
    const evidenceItems: IntelligenceEvidence[] = [
      {
        sourceType: "B2B_DEMAND",
        sourceId: `target-demand-${targetDemand.id}`,
        description: `Target offtake demand: ${targetDemand.quantity} ${targetDemand.unit} of ${commodity} in ${state}. Required delivery: ${targetDemand.desiredDeliveryDate.slice(0, 10)}.`,
        observedAt: new Date().toISOString(),
        relevance: 1.0,
      },
      {
        sourceType: "PRODUCTION_OUTPUT",
        sourceId: `matched-supply-${commodity}-${state}`,
        description: `Deterministic matching identified ${matchResult.candidates.length} candidate source(s). Total matched: ${matchResult.matchedQuantity} ${targetDemand.unit} (${matchResult.fulfillmentPercentage}% fulfilled, remaining gap: ${matchResult.remainingGap} ${targetDemand.unit}). Score: ${matchResult.matchScore}/100 (${matchResult.matchClassification}).`,
        observedAt: new Date().toISOString(),
        relevance: 0.95,
      },
    ];

    if (matchResult.aggregationSummary && matchResult.aggregationSummary.sourcesCount > 1) {
      evidenceItems.push({
        sourceType: "PRODUCTION_OUTPUT",
        sourceId: `agg-summary-${commodity}-${state}`,
        description: `Multi-source aggregation recommended across ${matchResult.aggregationSummary.primaryStates.join(", ")} with ${matchResult.aggregationSummary.sourcesCount} farmers/pools. Difficulty: ${matchResult.aggregationSummary.coordinationDifficulty}.`,
        observedAt: new Date().toISOString(),
        relevance: 0.9,
      });
    }

    if (matchResult.processingRequirement?.required) {
      evidenceItems.push({
        sourceType: "PROCESSING_EVENT",
        sourceId: `processing-ctx-${commodity}`,
        description: matchResult.processingRequirement.facilityAvailable
          ? `Processing required: Compatible facility '${matchResult.processingRequirement.matchedFacility?.name}' available in ${matchResult.processingRequirement.matchedFacility?.state}.`
          : `Processing bottleneck: Intermediate processing required but no local certified facility found in corridor.`,
        observedAt: new Date().toISOString(),
        relevance: 0.85,
      });
    }

    if (matchResult.constraints.length > 0) {
      evidenceItems.push({
        sourceType: "SECURITY_INCIDENT",
        sourceId: `constraints-${commodity}-${state}`,
        description: `Operational & corridor constraints: ${matchResult.constraints.join("; ")}`,
        observedAt: new Date().toISOString(),
        relevance: 0.9,
      });
    }

    try {
      const reasoningResult = await runAgentReasoning({
        agentId: "SUPPLY_MATCHING_AGENT",
        objective: "SUPPLY_MATCH_INTERPRETATION",
        commodity,
        location: { state },
        signals: [],
        observations: [],
        evidenceItems,
        provider: params.aiProvider,
        supabaseClient: supabase,
      });

      if (reasoningResult.success && reasoningResult.output?.interpretation) {
        aiInterpretation = {
          summary: reasoningResult.output.interpretation,
          coordinationOptions: recommendations.map((r) => r.title),
          bottlenecks: matchResult.constraints,
          risks: reasoningResult.output.safetyNotes || reasoningResult.output.limitations || [],
          confidenceAssessment: `AI interpretation grounded on ${evidenceItems.length} empirical evidence sources (Confidence: ${(matchResult.confidence * 100).toFixed(0)}%).`,
          isAIGenerated: true,
        };
      }
    } catch {
      // Graceful AI gateway fallback to deterministic summary
      aiInterpretation = {
        summary: matchResult.coordinationOpportunitySummary,
        coordinationOptions: recommendations.map((r) => r.title),
        bottlenecks: matchResult.constraints,
        risks: matchResult.constraints.length > 0 ? matchResult.constraints : ["Sparse market supply"],
        confidenceAssessment: `Deterministic engine evaluation (Confidence: ${(matchResult.confidence * 100).toFixed(0)}%).`,
        isAIGenerated: false,
      };
    }
  } else {
    aiInterpretation = {
      summary: matchResult.coordinationOpportunitySummary,
      coordinationOptions: recommendations.map((r) => r.title),
      bottlenecks: matchResult.constraints,
      risks: matchResult.constraints,
      confidenceAssessment: "Deterministic-only evaluation mode.",
      isAIGenerated: false,
    };
  }

  return {
    success: true,
    demandId: targetDemand.id,
    commodity,
    state,
    snapshot,
    candidates: candidateRecords,
    recommendations,
    gapAnalysis,
    aiInterpretation,
  };
}
