/**
 * AgroMarket Phase 3.0: Agricultural Disease & Biosecurity Intelligence Agent
 * Autonomous-Free Early-Warning & Decision Support Orchestrator
 *
 * Implements:
 * OBSERVE -> NORMALIZE -> CORRELATE -> DETECT -> ASSESS -> RECOMMEND ->
 * HUMAN REVIEW -> ACTION -> OUTCOME -> EVALUATION -> IMPROVEMENT
 *
 * SAFETY INVARIANTS:
 * 1. Internal analytical coordination indicator — NOT a veterinary or medical diagnostic service.
 * 2. Alerts default to DRAFT/REVIEW and REQUIRE human review before public publication.
 * 3. Deterministic calculations are authoritative; AI reasoning is advisory interpretation only.
 * 4. Zero pig/pork produce tolerance across all parameters, prompts, alerts, and records.
 * 5. Commercial confidentiality preserved: no private farm coordinates or identities exposed.
 * 6. Never fabricates fake disease events, laboratory results, or veterinary diagnoses.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { runAgentReasoning } from "@/features/intelligence/orchestrator";
import { AIProvider } from "@/features/intelligence/ai-provider";
import {
  DiseaseObservationItem,
  DiseaseRunResult,
  DiseaseSnapshotRecord,
  DiseaseAlertItem,
  BiosecurityDependencyItem,
} from "./types";
import {
  calculateDiseaseRiskIndex,
  calculateBiosecurityResilienceScore,
  detectSignalConvergence,
  detectBiosecurityDependencies,
  evaluateValueChainImpact,
} from "./calculations";
import { fetchDiseaseBiosecurityContext } from "./data-layer";

export interface RunDiseaseAgentParams {
  state: string;
  lga?: string | null;
  commodity?: string | null;
  category?: string | null;
  domain?: "LIVESTOCK" | "CROPS" | "AQUACULTURE" | "BIOSECURITY";
  newObservations?: DiseaseObservationItem[];
  skipAIEvaluation?: boolean;
  aiProvider?: AIProvider;
  userId?: string | null;
}

export async function runAgriculturalDiseaseAgent(
  params: RunDiseaseAgentParams
): Promise<DiseaseRunResult> {
  // 1. Hard Anti-Pork Invariant Enforcement
  if (params.commodity) {
    assertNoProhibitedProduce(params.commodity, "Commodity");
  }
  if (params.category) {
    assertNoProhibitedProduce(params.category, "Category");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = null;
  try {
    supabase = await createClient();
  } catch {
    supabase = null;
  }

  // 2. OBSERVE & NORMALIZE: Fetch real context from data layer
  let context = {
    state: params.state,
    lga: params.lga || null,
    commodity: params.commodity || null,
    category: params.category || null,
    observations: params.newObservations || [],
    observedMortalityRatePercent: undefined as number | undefined,
    productionDisruptionObserved: undefined as boolean | undefined,
    movementRestrictionReported: undefined as boolean | undefined,
    supplyAvailabilityDropPercent: undefined as number | undefined,
    regionalConcentrationRatio: 0.5,
    activeProducersCount: 10,
    regionalSourcesCount: 3,
    supplierDiversityRatio: 0.7,
    movementAlternativesCount: 3,
    aggregationPointsCount: 2,
    processingFacilitiesCount: 1,
    marketDestinationsCount: 3,
    extensionSupportPresent: true,
    existingDependencies: [] as BiosecurityDependencyItem[],
  };

  if (supabase) {
    try {
      const fetched = await fetchDiseaseBiosecurityContext(supabase, {
        state: params.state,
        lga: params.lga,
        commodity: params.commodity,
        category: params.category,
      });
      context = {
        ...context,
        ...fetched,
        observations: [...(params.newObservations || []), ...fetched.observations],
      };
    } catch (err) {
      console.warn("Failed to fetch database context for disease agent; proceeding with local data:", err);
    }
  }

  // 3. DETECT & ASSESS: Authoritative Deterministic Disease Risk Index
  const riskIndex = calculateDiseaseRiskIndex({
    state: context.state,
    lga: context.lga,
    commodity: context.commodity,
    category: context.category,
    observations: context.observations,
    observedMortalityRatePercent: context.observedMortalityRatePercent,
    productionDisruptionObserved: context.productionDisruptionObserved,
    movementRestrictionReported: context.movementRestrictionReported,
    supplyAvailabilityDropPercent: context.supplyAvailabilityDropPercent,
    regionalConcentrationRatio: context.regionalConcentrationRatio,
  });

  // 4. RESILIENCE: Deterministic Biosecurity Resilience Score
  const resilienceAssessment = calculateBiosecurityResilienceScore({
    state: context.state,
    commodity: context.commodity,
    activeProducersCount: context.activeProducersCount,
    regionalSourcesCount: context.regionalSourcesCount,
    supplierDiversityRatio: context.supplierDiversityRatio,
    movementAlternativesCount: context.movementAlternativesCount,
    aggregationPointsCount: context.aggregationPointsCount,
    processingFacilitiesCount: context.processingFacilitiesCount,
    marketDestinationsCount: context.marketDestinationsCount,
    extensionSupportPresent: context.extensionSupportPresent,
  });

  // 5. CORRELATE: Detect signal convergence across independent sources
  const convergence = detectSignalConvergence(context.observations);

  // 6. DEPENDENCIES: Detect regional concentration and single-source bottlenecks
  const detectedDependencies = detectBiosecurityDependencies({
    state: context.state,
    commodity: context.commodity,
    productionConcentrationPercent: context.activeProducersCount < 3 ? 80 : 45,
    corridorConcentrationPercent: context.movementAlternativesCount === 1 ? 85 : 40,
    supplierConcentrationPercent: context.supplierDiversityRatio < 0.4 ? 82 : 35,
    singleProcessingFacilityPercent: context.processingFacilitiesCount === 1 ? 85 : 30,
  });

  // 7. VALUE-CHAIN IMPACT EVALUATION
  const valueChainImpact = evaluateValueChainImpact(riskIndex, detectedDependencies);

  // 8. ADVISORY AI REASONING (Strictly Advisory Interpretation)
  let aiReasoningResult: DiseaseRunResult["aiReasoning"] | undefined = undefined;

  if (!params.skipAIEvaluation) {
    try {
      const evidenceItems = [
        {
          sourceType: "RESILIENCE_ASSESSMENT" as const,
          sourceId: `biosecurity-${context.state}`,
          description: `Biosecurity Resilience Score evaluated at ${resilienceAssessment.score}/100 (${resilienceAssessment.level}).`,
          observedAt: new Date().toISOString(),
          relevance: 0.9,
        },
        ...context.observations.slice(0, 4).map((obs) => ({
          sourceType: "DISEASE_OBSERVATION" as const,
          sourceId: obs.id || `obs-${obs.sourceName}`,
          description: `[${obs.verificationStatus}] ${obs.sourceName}: ${obs.evidenceSummary}`,
          observedAt: obs.observedAt || new Date().toISOString(),
          relevance: obs.confidence,
        })),
      ];

      const reasoningRes = await runAgentReasoning({
        agentId: "AGRICULTURAL_DISEASE_BIOSECURITY_AGENT",
        objective: "DISEASE_RISK_INTERPRETATION",
        commodity: context.commodity || "Agricultural Produce",
        location: {
          state: context.state,
        },
        signals: [],
        observations: [],
        evidenceItems,
        provider: params.aiProvider,
        supabaseClient: supabase,
      });

      if (reasoningRes.success && reasoningRes.output?.interpretation) {
        aiReasoningResult = {
          interpretation: reasoningRes.output.interpretation,
          confidence: reasoningRes.modelConfidence || reasoningRes.evidenceConfidence || 0.8,
          uncertaintyAnalysis:
            "AI interpretation is strictly advisory. Official disease diagnosis and veterinary prescription must be conducted by certified state/federal veterinary services.",
          missingEvidence: riskIndex.missingEvidence,
          recommendedHumanInvestigation: [
            "Verify field observations with zonal agricultural extension officers",
            "Cross-reference mortality notices with federal epidemiology surveillance bulletins",
          ],
        };
      }
    } catch (err: unknown) {
      console.warn("AI reasoning failed for disease agent; falling back to deterministic-only:", err);
    }
  }

  // 9. GOVERNED EARLY-WARNING ALERTS CREATION (Lifecycle: DRAFT -> REVIEW)
  const alerts: DiseaseAlertItem[] = [];
  if (riskIndex.score >= 50 || riskIndex.level === "CRITICAL_RISK" || riskIndex.level === "HIGH_RISK") {
    const alertCode = `BIO-${context.state.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const severity =
      riskIndex.level === "CRITICAL_RISK"
        ? "CRITICAL"
        : riskIndex.level === "HIGH_RISK"
        ? "HIGH"
        : "ELEVATED";

    alerts.push({
      alertCode,
      title: `Potential Agricultural Health Signal in ${context.state}${context.commodity ? ` (${context.commodity})` : ""}`,
      severity,
      status: "REVIEW", // Never autonomous published; requires human review
      state: context.state,
      lga: context.lga,
      commodity: context.commodity,
      category: context.category,
      summary: `Deterministic Disease Risk Index recorded at ${riskIndex.score}/100 (${riskIndex.level}). ${convergence.convergenceNotes}`,
      evidenceSources: context.observations.map((o) => ({
        sourceName: o.sourceName,
        sourceType: o.sourceType,
        verificationStatus: o.verificationStatus,
        url: o.sourceUrl,
        publicationDate: o.publishedAt,
      })),
      verificationStatus: context.observations.some((o) => o.verificationStatus === "OFFICIAL")
        ? "OFFICIAL"
        : "SECONDARY",
      limitations:
        "This alert is an analytical early-warning indicator. AgroMarket does not provide veterinary diagnostic certifications or official disease declarations.",
      officialConsultationAdvice:
        "Farmers and logistics handlers should consult certified veterinary doctors and state ministry extension personnel before initiating commercial or sanitation interventions.",
      confidence: riskIndex.confidence,
      createdAt: new Date().toISOString(),
    });
  }

  // 10. PERSISTENCE: Save snapshot and alerts if Supabase is connected
  if (supabase) {
    try {
      const snapshot: DiseaseSnapshotRecord = {
        state: context.state,
        lga: context.lga,
        geopolitical_zone: null,
        commodity: context.commodity || null,
        category: context.category || null,
        risk_score: riskIndex.score,
        risk_level: riskIndex.level,
        resilience_score: resilienceAssessment.score,
        resilience_level: resilienceAssessment.level,
        risk_components: riskIndex.components,
        resilience_components: resilienceAssessment.components,
        evidence_strength: riskIndex.components.evidenceStrength,
        signal_convergence: riskIndex.components.signalConvergence,
        production_impact: riskIndex.components.productionImpactEvidence,
        movement_exposure: riskIndex.components.movementBiosecurityExposure,
        supply_impact: riskIndex.components.supplyImpactEvidence,
        key_drivers: riskIndex.keyDrivers,
        missing_evidence: riskIndex.missingEvidence,
        vulnerability_factors: resilienceAssessment.vulnerabilityFactors,
        adaptive_capacities: resilienceAssessment.adaptiveCapacities,
        confidence: riskIndex.confidence,
        calculated_at: new Date().toISOString(),
      };

      const { data: insertedSnap } = await supabase
        .from("agricultural_disease_snapshots")
        .insert(snapshot)
        .select("id")
        .single();

      if (insertedSnap?.id && alerts.length > 0) {
        for (const alert of alerts) {
          await supabase.from("agricultural_disease_alerts").insert({
            snapshot_id: insertedSnap.id,
            alert_code: alert.alertCode,
            title: alert.title,
            severity: alert.severity,
            status: alert.status,
            state: alert.state,
            lga: alert.lga,
            commodity: alert.commodity,
            category: alert.category,
            summary: alert.summary,
            evidence_sources: alert.evidenceSources,
            verification_status: alert.verificationStatus,
            limitations: alert.limitations,
            official_consultation_advice: alert.officialConsultationAdvice,
            confidence: alert.confidence,
          });
        }
      }
    } catch (persistErr) {
      console.warn("Failed to persist disease intelligence records to Supabase:", persistErr);
    }
  }

  return {
    success: true,
    state: context.state,
    commodity: context.commodity,
    riskIndex,
    resilienceAssessment,
    convergence,
    valueChainImpact,
    observations: context.observations,
    dependencies: detectedDependencies,
    alerts,
    aiReasoning: aiReasoningResult,
  };
}
