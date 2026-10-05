"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit";
import { Json } from "@/types/database";
import {
  intelligenceObservationSchema,
  intelligenceSignalSchema,
  intelligenceRecommendationSchema,
  recommendationReviewSchema,
  intelligencePredictionSchema,
  intelligenceOutcomeSchema,
  assertNoProhibitedProduce,
} from "./validation";
import {
  validateRecommendationTransition,
  generateAdvisoryRecommendation,
} from "./recommendations";
import { evaluatePredictionOutcome } from "./evaluations";
import {
  getMarketDomainData,
  getSupplyDomainData,
  getDemandDomainData,
  getProcessingDomainData,
  getSecurityDomainData,
} from "./data-layer";
import {
  detectPriceTrendSignals,
  detectSupplyImbalanceSignals,
  detectProcessingBottleneck,
  detectSecurityDisruptions,
  detectSeasonalDemand,
} from "./engine";
import {
  IntelligenceSignal,
  IntelligenceRecommendation,
} from "./types";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 1. RECORD OBSERVATION ACTION
 */
export async function recordObservationAction(
  rawInput: unknown
): Promise<ActionResult<{ observationId: string }>> {
  try {
    const user = await requireAuth();
    const parsed = intelligenceObservationSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
    }

    const {
      agentId,
      domainSource,
      sourceId,
      commodity,
      category,
      state,
      lga,
      corridor,
      summary,
      details,
      observedValue,
      baselineValue,
      unit,
      confidence,
      evidence,
      observedAt,
    } = parsed.data;

    if (commodity) {
      assertNoProhibitedProduce(commodity, "Observation commodity");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_intelligence_observations")
      .insert({
        agent_id: agentId,
        domain_source: domainSource,
        source_id: sourceId || null,
        commodity: commodity || null,
        category: category || null,
        state: state || null,
        lga: lga || null,
        corridor: corridor || null,
        summary,
        details: (details || {}) as Json,
        observed_value: observedValue != null ? observedValue : null,
        baseline_value: baselineValue != null ? baselineValue : null,
        unit: unit || null,
        confidence,
        evidence: evidence as unknown as Json,
        observed_at: observedAt || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to record observation" };
    }

    await recordAuditLog({
      actorId: user.id,
      action: "INTELLIGENCE_OBSERVATION_RECORDED",
      resourceType: "agricultural_intelligence_observations",
      resourceId: data.id,
      newValues: { domainSource, commodity, state, confidence },
    });

    revalidatePath("/admin/intelligence");
    return { success: true, data: { observationId: data.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

/**
 * 2. EMIT SIGNAL ACTION
 */
export async function emitSignalAction(
  rawInput: unknown
): Promise<ActionResult<{ signalId: string }>> {
  try {
    const user = await requireAuth();
    const parsed = intelligenceSignalSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
    }

    const {
      agentId,
      signalType,
      commodity,
      category,
      state,
      lga,
      corridor,
      magnitude,
      confidence,
      source,
      evidence,
      supportingObservationIds,
      observedAt,
      expiresAt,
    } = parsed.data;

    assertNoProhibitedProduce(commodity, "Signal commodity");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_intelligence_signals")
      .insert({
        agent_id: agentId,
        signal_type: signalType,
        commodity,
        category: category || null,
        state,
        lga: lga || null,
        corridor: corridor || null,
        magnitude,
        confidence,
        source,
        evidence: evidence as unknown as Json,
        supporting_observation_ids: supportingObservationIds || [],
        observed_at: observedAt || new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to emit signal" };
    }

    await recordAuditLog({
      actorId: user.id,
      action: "INTELLIGENCE_SIGNAL_EMITTED",
      resourceType: "agricultural_intelligence_signals",
      resourceId: data.id,
      newValues: { signalType, commodity, state, magnitude, confidence },
    });

    revalidatePath("/admin/intelligence");
    return { success: true, data: { signalId: data.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

/**
 * 3. CREATE RECOMMENDATION ACTION
 */
export async function createRecommendationAction(
  rawInput: unknown
): Promise<ActionResult<{ recommendationId: string }>> {
  try {
    const user = await requireAuth();
    const parsed = intelligenceRecommendationSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
    }

    const {
      agentId,
      objective,
      title,
      recommendation,
      evidence,
      confidence,
      expectedImpact,
      affectedActors,
      affectedCommodities,
      affectedLocations,
      status,
      expiresAt,
    } = parsed.data;

    for (const c of affectedCommodities) {
      assertNoProhibitedProduce(c, "Affected commodity");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_intelligence_recommendations")
      .insert({
        agent_id: agentId,
        objective,
        title,
        recommendation,
        evidence: evidence as unknown as Json,
        confidence,
        expected_impact: expectedImpact as unknown as Json,
        affected_actors: affectedActors,
        affected_commodities: affectedCommodities,
        affected_locations: affectedLocations,
        status,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to create recommendation" };
    }

    await recordAuditLog({
      actorId: user.id,
      action: "INTELLIGENCE_RECOMMENDATION_CREATED",
      resourceType: "agricultural_intelligence_recommendations",
      resourceId: data.id,
      newValues: { objective, title, status },
    });

    revalidatePath("/admin/intelligence");
    return { success: true, data: { recommendationId: data.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

/**
 * 4. HUMAN-IN-THE-LOOP: REVIEW RECOMMENDATION ACTION
 */
export async function reviewRecommendationAction(
  rawInput: unknown
): Promise<ActionResult<{ recommendationId: string; newStatus: string }>> {
  try {
    const user = await requireAuth();
    const parsed = recommendationReviewSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
    }

    const { recommendationId, decision, reviewNotes } = parsed.data;
    const supabase = await createClient();

    // Fetch existing recommendation
    const { data: rec, error: fetchErr } = await supabase
      .from("agricultural_intelligence_recommendations")
      .select("id, status, objective, title")
      .eq("id", recommendationId)
      .single();

    if (fetchErr || !rec) {
      return { success: false, error: "Recommendation not found" };
    }

    const action = decision === "APPROVED" ? "APPROVE" : "REJECT";
    const newStatus = validateRecommendationTransition(rec.status, action);

    const { error: updateErr } = await supabase
      .from("agricultural_intelligence_recommendations")
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_decision: decision,
        review_notes: reviewNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recommendationId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    await recordAuditLog({
      actorId: user.id,
      action: `RECOMMENDATION_${decision}`,
      resourceType: "agricultural_intelligence_recommendations",
      resourceId: recommendationId,
      oldValues: { status: rec.status },
      newValues: { status: newStatus, reviewDecision: decision, reviewNotes },
    });

    revalidatePath("/admin/intelligence");
    return { success: true, data: { recommendationId, newStatus } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

/**
 * 5. RECORD PREDICTION ACTION
 */
export async function recordPredictionAction(
  rawInput: unknown
): Promise<ActionResult<{ predictionId: string }>> {
  try {
    const user = await requireAuth();
    const parsed = intelligencePredictionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
    }

    const {
      agentId,
      recommendationId,
      commodity,
      state,
      lga,
      metricName,
      baselineValue,
      predictedValue,
      predictedRangeLow,
      predictedRangeHigh,
      confidence,
      targetDate,
    } = parsed.data;

    assertNoProhibitedProduce(commodity, "Prediction commodity");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_intelligence_predictions")
      .insert({
        agent_id: agentId,
        recommendation_id: recommendationId || null,
        commodity,
        state,
        lga: lga || null,
        metric_name: metricName,
        baseline_value: baselineValue,
        predicted_value: predictedValue,
        predicted_range_low: predictedRangeLow != null ? predictedRangeLow : null,
        predicted_range_high: predictedRangeHigh != null ? predictedRangeHigh : null,
        confidence,
        target_date: targetDate,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Failed to record prediction" };
    }

    await recordAuditLog({
      actorId: user.id,
      action: "INTELLIGENCE_PREDICTION_RECORDED",
      resourceType: "agricultural_intelligence_predictions",
      resourceId: data.id,
      newValues: { commodity, state, predictedValue, targetDate },
    });

    revalidatePath("/admin/intelligence");
    return { success: true, data: { predictionId: data.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

/**
 * 6. RECORD OUTCOME AND RUN DETERMINISTIC EVALUATION
 */
export async function recordOutcomeAndEvaluateAction(
  rawInput: unknown
): Promise<ActionResult<{ outcomeId: string; evaluationId: string; score: number }>> {
  try {
    const user = await requireAuth();
    const parsed = intelligenceOutcomeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || "Validation failed" };
    }

    const { predictionId, actualValue, observedAt, sourceDomain, sourceId, notes } = parsed.data;
    const supabase = await createClient();

    // Fetch the prediction record
    const { data: prediction, error: predErr } = await supabase
      .from("agricultural_intelligence_predictions")
      .select("*")
      .eq("id", predictionId)
      .single();

    if (predErr || !prediction) {
      return { success: false, error: "Prediction record not found" };
    }

    // Insert actual outcome
    const { data: outcome, error: outcomeErr } = await supabase
      .from("agricultural_intelligence_outcomes")
      .insert({
        prediction_id: predictionId,
        actual_value: actualValue,
        observed_at: observedAt || new Date().toISOString(),
        source_domain: sourceDomain,
        source_id: sourceId || null,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (outcomeErr || !outcome) {
      return { success: false, error: outcomeErr?.message || "Failed to record outcome" };
    }

    // Deterministically compute evaluation metrics
    const evalResult = evaluatePredictionOutcome({
      prediction: {
        id: prediction.id,
        agentId: prediction.agent_id,
        recommendationId: prediction.recommendation_id,
        commodity: prediction.commodity,
        state: prediction.state,
        lga: prediction.lga,
        metricName: prediction.metric_name,
        baselineValue: Number(prediction.baseline_value),
        predictedValue: Number(prediction.predicted_value),
        predictedRangeLow: prediction.predicted_range_low != null ? Number(prediction.predicted_range_low) : null,
        predictedRangeHigh: prediction.predicted_range_high != null ? Number(prediction.predicted_range_high) : null,
        confidence: Number(prediction.confidence),
        targetDate: prediction.target_date,
        status: prediction.status,
        createdAt: prediction.created_at,
      },
      outcome: {
        id: outcome.id,
        predictionId,
        actualValue,
        observedAt: observedAt || new Date().toISOString(),
        sourceDomain,
        sourceId: sourceId || null,
        notes: notes || null,
        createdAt: new Date().toISOString(),
      },
    });

    // Store evaluation
    const { data: savedEval, error: evalErr } = await supabase
      .from("agricultural_intelligence_evaluations")
      .insert({
        prediction_id: predictionId,
        outcome_id: outcome.id,
        predicted_value: evalResult.predictedValue,
        actual_value: evalResult.actualValue,
        absolute_error: evalResult.absoluteError,
        percentage_error: evalResult.percentageError,
        direction_accurate: evalResult.directionAccurate,
        within_predicted_range: evalResult.withinPredictedRange,
        evaluation_score: evalResult.evaluationScore,
        evaluated_at: evalResult.evaluatedAt,
      })
      .select("id")
      .single();

    if (evalErr || !savedEval) {
      return { success: false, error: evalErr?.message || "Failed to save evaluation" };
    }

    // Mark prediction as EVALUATED
    await supabase
      .from("agricultural_intelligence_predictions")
      .update({ status: "EVALUATED" })
      .eq("id", predictionId);

    await recordAuditLog({
      actorId: user.id,
      action: "PREDICTION_EVALUATED",
      resourceType: "agricultural_intelligence_evaluations",
      resourceId: savedEval.id,
      newValues: {
        predictedValue: evalResult.predictedValue,
        actualValue: evalResult.actualValue,
        score: evalResult.evaluationScore,
      },
    });

    revalidatePath("/admin/intelligence");
    return {
      success: true,
      data: {
        outcomeId: outcome.id,
        evaluationId: savedEval.id,
        score: evalResult.evaluationScore,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

/**
 * 7. RUN DETERMINISTIC PIPELINE FOR A REGIONAL COMMODITY
 * Evaluates live data sources across market, supply, demand, processing, security, and seasonality.
 */
export async function runDeterministicPipelineAction(
  commodity: string,
  state: string
): Promise<
  ActionResult<{
    signals: IntelligenceSignal[];
    recommendations: IntelligenceRecommendation[];
  }>
> {
  try {
    assertNoProhibitedProduce(commodity, "Commodity");
    await requireAuth();

    // 1. Gather live domain snapshots
    const [marketData, supplyData, demandData, processingData, securityData] =
      await Promise.all([
        getMarketDomainData(commodity, state),
        getSupplyDomainData(commodity, state),
        getDemandDomainData(commodity, state),
        getProcessingDomainData(commodity, state),
        getSecurityDomainData(state, commodity),
      ]);

    const generatedSignals: IntelligenceSignal[] = [];

    // 2. Rule: Price Trend Analysis
    if (
      marketData.recentObservations.length > 0 &&
      marketData.historicalBaselinePrice
    ) {
      const latestPrice = marketData.recentObservations[0].price;
      const priceSignal = detectPriceTrendSignals({
        commodity,
        state,
        recentPrice: latestPrice,
        baselinePrice: marketData.historicalBaselinePrice,
        observationsCount: marketData.recentObservations.length,
      });
      if (priceSignal) generatedSignals.push(priceSignal);
    }

    // 3. Rule: Supply vs Demand Imbalance
    const totalSupply = supplyData.availableOutputs.reduce(
      (acc, o) => acc + o.quantity,
      0
    );
    const totalDemand =
      demandData.b2bDemands.reduce((acc, d) => acc + d.quantity, 0) +
      demandData.orderVolumeTotal * 20; // 20kg avg order multiplier
    if (totalDemand > 0 && totalSupply > 0) {
      const supplySignal = detectSupplyImbalanceSignals({
        commodity,
        state,
        totalSupplyAvailable: totalSupply,
        totalDemandExpected: totalDemand,
      });
      if (supplySignal) generatedSignals.push(supplySignal);
    }

    // 4. Rule: Processing Bottleneck
    if (processingData.queuedOutputVolume > 0) {
      const procSignal = detectProcessingBottleneck({
        commodity,
        state,
        queuedSupplyVolume: processingData.queuedOutputVolume,
        dailyFacilityCapacity: processingData.totalCapacity,
      });
      if (procSignal) generatedSignals.push(procSignal);
    }

    // 5. Rule: Agricultural Security Notice Correlation
    for (const incident of securityData.recentIncidents) {
      const secSignal = detectSecurityDisruptions({
        state,
        incidentId: incident.id,
        incidentTitle: incident.title,
        severity: incident.severity,
        affectedCommodity: commodity,
        publishedAt: incident.publishedAt,
        movementImpact: incident.movementImpact,
      });
      if (secSignal) generatedSignals.push(secSignal);
    }

    // 6. Rule: Seasonal Demand Cycle
    const seasonSignal = detectSeasonalDemand({
      commodity,
      state,
    });
    if (seasonSignal) generatedSignals.push(seasonSignal);

    // 7. Formulate Advisory Recommendations for detected signals
    const generatedRecommendations: IntelligenceRecommendation[] =
      generatedSignals.map((sig) => generateAdvisoryRecommendation(sig));

    return {
      success: true,
      data: {
        signals: generatedSignals,
        recommendations: generatedRecommendations,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}
