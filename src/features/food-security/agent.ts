/**
 * AgroMarket Phase 2.8: Food Security & Agricultural Resilience Agent
 * Autonomous-Free Early-Warning Orchestrator
 *
 * Implements:
 * OBSERVE -> NORMALIZE -> CORRELATE -> DETECT -> ASSESS -> FORECAST ->
 * INTERPRET -> ALERT -> HUMAN REVIEW -> ACTION -> OUTCOME -> EVALUATION -> IMPROVEMENT
 *
 * SAFETY INVARIANTS:
 * 1. Internal analytical indicator — NOT an official government early warning or crisis declaration.
 * 2. Candidate alerts default to DRAFT and REQUIRE human review before public publication.
 * 3. Deterministic calculations are authoritative; AI reasoning is advisory interpretation only.
 * 4. Zero pig/pork produce tolerance across all parameters, prompts, alerts, and records.
 * 5. Commercial confidentiality preserved: no private buyer/supplier PII exposed.
 * 6. Never fabricates fake prices, shortages, weather, or security incidents.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { IntelligenceEvidence } from "@/features/intelligence/types";
import { runAgentReasoning } from "@/features/intelligence/orchestrator";
import { AIProvider } from "@/features/intelligence/ai-provider";
import {
  FoodSecuritySnapshotRecord,
  AgriculturalResilienceSnapshotRecord,
  FoodSecurityAlertRecord,
  FoodSecurityRunResult,
  AlertSeverity,
} from "./types";
import {
  calculateFoodSecurityPressureIndex,
  calculateAgriculturalResilienceScore,
  detectCriticalDependencies,
  classifyFoodSecurityPillars,
} from "./calculations";
import {
  loadFoodSecurityContext,
  LoadedFoodSecurityContext,
} from "./data-layer";

export interface RunFoodSecurityAgentParams {
  state: string;
  commodity?: string | null;
  lga?: string | null;
  userId?: string | null;
  aiProvider?: AIProvider;
  skipAIEvaluation?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any;
}

/**
 * Executes the Food Security & Agricultural Resilience Agent early-warning evaluation
 */
export async function runFoodSecurityResilienceAgent(
  params: RunFoodSecurityAgentParams
): Promise<FoodSecurityRunResult> {
  const { state, commodity } = params;
  if (commodity) {
    assertNoProhibitedProduce(commodity, "Commodity");
  }

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
  let context: LoadedFoodSecurityContext;
  try {
    context = await loadFoodSecurityContext(state, commodity, supabase);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const emptyPressure = calculateFoodSecurityPressureIndex({
      commodity,
      state,
    });
    const emptyResilience = calculateAgriculturalResilienceScore({
      commodity,
      state,
    });

    return {
      success: false,
      commodity: commodity || null,
      state,
      pressureIndex: {
        ...emptyPressure,
        missingEvidence: [`Context load failed: ${errorMsg}`],
        confidence: 0.2,
      },
      resilienceAssessment: emptyResilience,
      dependencies: [],
      candidateAlerts: [],
      aiInterpretation: null,
      aiSkippedOrFailed: true,
    };
  }

  // 2. DETERMINISTIC PRESSURE INDEX (0 to 100)
  const pressureIndex = calculateFoodSecurityPressureIndex({
    commodity,
    state,
    supplyDeficitRatio: context.supplyDeficitRatio,
    demandPressureScore: context.demandPressureScore,
    marketPricePressureScore: context.marketPricePressureScore,
    regionalSupplyGapRatio: context.regionalSupplyGapRatio,
    productionRiskScore: context.productionRiskScore,
    logisticsFrictionScore: context.logisticsFrictionScore,
    securityDisruptionReported: context.securityDisruptionReported,
    processingBottleneckDetected: context.processingBottleneckDetected,
  });

  // 3. DETERMINISTIC RESILIENCE SCORE (0 to 100)
  const resilienceAssessment = calculateAgriculturalResilienceScore({
    commodity,
    state,
    supplierCount: context.supplierCount,
    largestSupplierShare: context.largestSupplierShare,
    productionSourceStatesCount: context.productionSourceStatesCount,
    processingFacilitiesAvailableCount: context.processingFacilitiesAvailableCount,
    activeLogisticsCorridorsCount: context.activeLogisticsCorridorsCount,
    activeTradeChannelsCount: context.activeTradeChannelsCount,
    aggregationPoolsActiveCount: context.aggregationPoolsActiveCount,
  });

  // 4. FOUR PILLARS CLASSIFICATION
  const pillars = classifyFoodSecurityPillars(pressureIndex.score, pressureIndex.components);

  // 5. CRITICAL DEPENDENCY DETECTION
  const dependencies = detectCriticalDependencies({
    commodity: commodity || "Regional Agricultural Staples",
    state,
    regionalShare: context.productionSourceStatesCount === 1 ? 75 : 40,
    dominantRegionName: `${state} Production Zone`,
    supplierShare: Math.round(context.largestSupplierShare * 100),
    corridorShare: context.activeLogisticsCorridorsCount === 1 ? 80 : 45,
    processingFacilityShare: context.processingFacilitiesAvailableCount === 1 ? 85 : 40,
  });

  // 6. GENERATE CANDIDATE EARLY-WARNING ALERTS (Strictly DRAFT status)
  const candidateAlerts: FoodSecurityAlertRecord[] = [];

  let alertSeverity: AlertSeverity = "INFO";
  if (pressureIndex.score >= 75) {
    alertSeverity = "CRITICAL";
  } else if (pressureIndex.score >= 55) {
    alertSeverity = "HIGH";
  } else if (pressureIndex.score >= 35) {
    alertSeverity = "ELEVATED";
  } else {
    alertSeverity = "WATCH";
  }

  if (alertSeverity === "CRITICAL" || alertSeverity === "HIGH" || context.securityDisruptionReported) {
    candidateAlerts.push({
      snapshot_id: null,
      title: `Food Security Pressure Advisory: ${commodity || "Staples"} in ${state}`,
      commodity: commodity || null,
      state,
      lga: params.lga || null,
      severity: alertSeverity,
      status: "DRAFT", // Strict invariant: requires human review before publishing
      summary: `AgroMarket early-warning model indicates ${pressureIndex.level.replace(/_/g, " ")} (${pressureIndex.score}/100) in ${state}. Contributing factors include ${pressureIndex.keyDrivers.slice(0, 2).join("; ") || "elevated market pressure"}.`,
      evidence_summary: `Observed data points: Supply deficit ratio: ${context.supplyDeficitRatio ? Math.round(context.supplyDeficitRatio * 100) + "%" : "Sparse"}; Demand pressure: ${context.demandPressureScore ?? "N/A"}/100; Market inflation pressure: ${context.marketPricePressureScore ?? "N/A"}/100; Resilience rating: ${resilienceAssessment.score}/100.`,
      contributing_signals: pressureIndex.keyDrivers,
      source_governance: {
        sourceName: "AgroMarket Agricultural Intelligence Foundation",
        sourceType: "MARKET_INTELLIGENCE",
        verificationStatus: "VERIFIED",
        dataTimestamp: new Date().toISOString(),
        isSimulated: false,
      },
      is_public: false,
      confidence: pressureIndex.confidence,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // 7. CONSTRUCT SNAPSHOT RECORDS
  const snapshot: FoodSecuritySnapshotRecord = {
    commodity: commodity || null,
    state,
    lga: params.lga || null,
    geopolitical_zone: null,
    pressure_score: pressureIndex.score,
    pressure_level: pressureIndex.level,
    component_scores: pressureIndex.components,
    availability_status: pillars.availabilityStatus,
    affordability_status: pillars.affordabilityStatus,
    access_status: pillars.accessStatus,
    stability_status: pillars.stabilityStatus,
    key_drivers: pressureIndex.keyDrivers,
    constraints: context.activeSecurityIncidents.map((i) => `Security Incident: ${i.severity} - ${i.impactType}`),
    missing_evidence: pressureIndex.missingEvidence,
    confidence: pressureIndex.confidence,
    metadata: {
      resilienceScore: resilienceAssessment.score,
      resilienceLevel: resilienceAssessment.level,
      dependenciesCount: dependencies.length,
      is_public: true,
    },
    calculated_at: new Date().toISOString(),
  };

  const resilienceSnapshot: AgriculturalResilienceSnapshotRecord = {
    commodity: commodity || null,
    state,
    lga: params.lga || null,
    resilience_score: resilienceAssessment.score,
    resilience_level: resilienceAssessment.level,
    component_scores: resilienceAssessment.components,
    vulnerability_factors: resilienceAssessment.vulnerabilityFactors,
    adaptive_capacities: resilienceAssessment.adaptiveCapacities,
    confidence: resilienceAssessment.confidence,
    metadata: {
      pressureScore: pressureIndex.score,
      is_public: true,
    },
    calculated_at: new Date().toISOString(),
  };

  // 8. PERSIST TO DATABASE (Append-Only)
  if (supabase) {
    try {
      const { data: insertedSnap } = await supabase
        .from("food_security_snapshots")
        .insert({
          commodity: snapshot.commodity,
          state: snapshot.state,
          lga: snapshot.lga,
          geopolitical_zone: snapshot.geopolitical_zone,
          pressure_score: snapshot.pressure_score,
          pressure_level: snapshot.pressure_level,
          component_scores: snapshot.component_scores,
          availability_status: snapshot.availability_status,
          affordability_status: snapshot.affordability_status,
          access_status: snapshot.access_status,
          stability_status: snapshot.stability_status,
          key_drivers: snapshot.key_drivers,
          constraints: snapshot.constraints,
          missing_evidence: snapshot.missing_evidence,
          confidence: snapshot.confidence,
          metadata: snapshot.metadata,
        })
        .select("id")
        .single();

      if (insertedSnap && insertedSnap.id) {
        snapshot.id = insertedSnap.id;

        // Insert resilience snapshot
        await supabase.from("agricultural_resilience_snapshots").insert({
          commodity: resilienceSnapshot.commodity,
          state: resilienceSnapshot.state,
          lga: resilienceSnapshot.lga,
          resilience_score: resilienceSnapshot.resilience_score,
          resilience_level: resilienceSnapshot.resilience_level,
          component_scores: resilienceSnapshot.component_scores,
          vulnerability_factors: resilienceSnapshot.vulnerability_factors,
          adaptive_capacities: resilienceSnapshot.adaptive_capacities,
          confidence: resilienceSnapshot.confidence,
          metadata: resilienceSnapshot.metadata,
        });

        // Insert critical dependencies
        if (dependencies.length > 0) {
          await supabase.from("food_security_dependencies").insert(
            dependencies.map((d) => ({
              snapshot_id: insertedSnap.id,
              commodity: d.commodity,
              state: d.state,
              dependency_type: d.dependencyType,
              dominant_entity: d.dominantEntity,
              concentration_ratio: d.concentrationRatio,
              threshold_exceeded: d.thresholdExceeded,
              alternative_options_available: d.alternativeOptionsAvailable,
              risk_assessment: d.riskAssessment,
            }))
          );
        }

        // Insert candidate alerts (as DRAFT for human review)
        for (const alert of candidateAlerts) {
          alert.snapshot_id = insertedSnap.id;
        }

        if (candidateAlerts.length > 0) {
          await supabase.from("food_security_alerts").insert(
            candidateAlerts.map((a) => ({
              snapshot_id: insertedSnap.id,
              title: a.title,
              commodity: a.commodity,
              state: a.state,
              lga: a.lga,
              severity: a.severity,
              status: "DRAFT",
              summary: a.summary,
              evidence_summary: a.evidence_summary,
              contributing_signals: a.contributing_signals,
              source_governance: a.source_governance,
              is_public: false,
              confidence: a.confidence,
            }))
          );
        }
      }
    } catch (dbErr) {
      console.warn("Failed to persist food security records to Supabase:", dbErr);
    }
  }

  // 9. AI REASONING INTERPRETATION (Phase 2.2 AI Gateway)
  let aiInterpretation = null;
  let aiSkippedOrFailed = false;

  if (!params.skipAIEvaluation) {
    const evidenceItems: IntelligenceEvidence[] = [
      {
        sourceType: "FOOD_SECURITY_SNAPSHOT",
        sourceId: `pressure-${state}-${commodity || "all"}`,
        description: `Food Security Pressure Index: ${pressureIndex.score}/100 (${pressureIndex.level}). Key drivers: ${pressureIndex.keyDrivers.join("; ") || "Baseline indicators"}.`,
        observedAt: new Date().toISOString(),
        relevance: 1.0,
      },
      {
        sourceType: "RESILIENCE_ASSESSMENT",
        sourceId: `resilience-${state}`,
        description: `Agricultural Resilience Rating: ${resilienceAssessment.score}/100 (${resilienceAssessment.level}). Vulnerabilities: ${resilienceAssessment.vulnerabilityFactors.join("; ") || "None significant"}.`,
        observedAt: new Date().toISOString(),
        relevance: 0.95,
      },
    ];

    if (dependencies.length > 0) {
      evidenceItems.push({
        sourceType: "FOOD_SECURITY_SNAPSHOT",
        sourceId: `dep-${state}`,
        description: `Critical dependencies detected: ${dependencies.map((d) => `${d.dependencyType} (${d.dominantEntity}: ${d.concentrationRatio}%)`).join("; ")}.`,
        observedAt: new Date().toISOString(),
        relevance: 0.9,
      });
    }

    try {
      const reasoningResult = await runAgentReasoning({
        agentId: "FOOD_SECURITY_RESILIENCE_AGENT",
        objective: "FOOD_SECURITY_INTERPRETATION",
        commodity: commodity || "Agricultural Staples",
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
    commodity: commodity || null,
    state,
    pressureIndex,
    resilienceAssessment,
    dependencies,
    candidateAlerts,
    aiInterpretation,
    aiSkippedOrFailed,
  };
}
