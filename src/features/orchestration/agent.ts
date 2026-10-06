/**
 * AgroMarket Phase 3.1: Agricultural Intelligence Orchestration & Cross-Domain Decision Engine
 * Master Autonomous-Free Orchestration Pipeline & Cross-Domain Coordination Agent
 *
 * Implements:
 * OBSERVE -> NORMALIZE -> CORRELATE -> DETECT CONFLICTS -> DETECT SCENARIOS ->
 * PRIORITIZE -> INTERPRET (Advisory AI) -> RECOMMEND -> PERSIST (Immutable Snapshots)
 *
 * SAFETY INVARIANTS:
 * 1. Coordination layer above specialized domain agents.
 * 2. Deterministic calculations are authoritative for quantitative priority and conflicts.
 * 3. AI Gateway reasoning is strictly advisory interpretation.
 * 4. Human review is required for all recommendations.
 * 5. Commercial confidentiality preserved: no farmer identities, coordinates, or buyer PII.
 * 6. Zero pig/pork tolerance across all parameters, prompts, alerts, and records.
 * 7. Never fabricates fake evidence or causal connections.
 */

import { createClient } from "@/lib/supabase/server";
import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { runAgentReasoning } from "@/features/intelligence/orchestrator";
import { AIProvider } from "@/features/intelligence/ai-provider";
import {
  AgentOutputContribution,
  CorrelationTimeWindow,
  OrchestrationRunResult,
  OrchestrationSnapshotRecord,
} from "./types";
import {
  calculateCrossDomainPriorityScore,
  calculateOrchestrationConfidence,
  correlateAgentContributions,
  deduplicateSourceEvidence,
  detectIntelligenceConflicts,
  detectCrossDomainScenarios,
  normalizeAgentOutputContribution,
  synthesizeCrossDomainRecommendations,
} from "./calculations";
import { fetchCrossDomainAgentOutputs } from "./data-layer";

export interface RunOrchestrationParams {
  state?: string | null;
  lga?: string | null;
  commodity?: string | null;
  timeWindow?: CorrelationTimeWindow;
  newContributions?: AgentOutputContribution[];
  aiProvider?: AIProvider;
  skipPersistence?: boolean;
}

/**
 * Executes the complete Agricultural Intelligence Orchestration pipeline.
 */
export async function runAgriculturalOrchestration(
  params: RunOrchestrationParams
): Promise<OrchestrationRunResult> {
  const state = params.state?.trim() || null;
  const lga = params.lga?.trim() || null;
  const commodity = params.commodity?.trim() || null;
  const timeWindow = params.timeWindow || "MEDIUM_TERM";

  // Anti-Pork Invariant Enforcement
  if (commodity) {
    assertNoProhibitedProduce(commodity, "Orchestration Pipeline Commodity");
  }

  // Helper to obtain supabase client if available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = null;
  try {
    supabase = await createClient();
  } catch {
    supabase = null;
  }

  // 1. OBSERVE: Gather multi-agent outputs from data layer
  let contributions: AgentOutputContribution[] = [];
  try {
    contributions = await fetchCrossDomainAgentOutputs(supabase, {
      state,
      lga,
      commodity,
      limit: 30,
    });
  } catch (err) {
    console.warn("Failed fetching domain outputs; proceeding with local items:", err);
  }

  // Integrate caller-supplied new contributions
  if (params.newContributions && params.newContributions.length > 0) {
    const normalizedNew = params.newContributions.map(normalizeAgentOutputContribution);
    contributions = [...normalizedNew, ...contributions];
  }

  // 2. NORMALIZE & CORRELATE: Apply time-window and geographic filtering
  const correlatedContributions = correlateAgentContributions(contributions, {
    state,
    commodity,
    timeWindow,
  });

  // Ensure at least minimal normalized contributions exist
  const finalContributions =
    correlatedContributions.length > 0 ? correlatedContributions : contributions;

  // 3. DEDUPLICATE: Prevent double-counting of same-source evidence
  const deduplication = deduplicateSourceEvidence(finalContributions);

  // 4. DETECT CONFLICTS: Check for contradictions between domain outputs
  const conflicts = detectIntelligenceConflicts(finalContributions);

  // 5. DETECT SCENARIOS: Identify cross-domain systemic situation
  const scenarioDetection = detectCrossDomainScenarios(finalContributions, conflicts);

  // 6. PRIORITIZE: Authoritative deterministic priority score (0 - 100)
  const priorityCalculation = calculateCrossDomainPriorityScore({
    contributions: finalContributions,
    scenarioType: scenarioDetection.scenarioType,
    conflictsCount: conflicts.length,
  });

  // 7. CONFIDENCE CALIBRATION: Evaluate systemic confidence with conflict degradation
  const confidenceMetrics = calculateOrchestrationConfidence(
    finalContributions,
    conflicts,
    deduplication.distinctSourcesCount
  );

  // 8. RECOMMEND: Synthesize advisory cross-domain recommendations
  const recommendations = synthesizeCrossDomainRecommendations({
    scenarioType: scenarioDetection.scenarioType,
    priorityLevel: priorityCalculation.priorityLevel,
    contributions: finalContributions,
    conflicts,
  });

  // 9. ADVISORY AI REASONING (Phase 2.2 Integration)
  let aiInterpretation: OrchestrationRunResult["aiInterpretation"] = null;

  if (params.aiProvider) {
    try {
      const evidenceItems = finalContributions.slice(0, 10).map((c) => ({
        sourceType: "CROSS_DOMAIN_SIGNAL" as const,
        sourceId: `${c.agentId}-${c.signalType}`,
        description: `Domain: ${c.domain}. Signal: ${c.signalType}. Severity: ${c.severity}. Score: ${c.score}/100. Sources: ${c.sourceReferences.join(", ")}`,
        observedAt: c.observationTime,
        relevance: c.evidenceConfidence,
      }));

      const reasoningRes = await runAgentReasoning({
        agentId: "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
        objective: "CROSS_DOMAIN_ORCHESTRATION",
        commodity: commodity || "Agricultural Produce",
        location: {
          state: state || "NATIONAL",
        },
        signals: [],
        observations: [],
        evidenceItems,
        provider: params.aiProvider,
        supabaseClient: supabase,
      });

      if (reasoningRes.success && reasoningRes.output?.interpretation) {
        aiInterpretation = {
          summary: reasoningRes.output.interpretation,
          strategicContext: `Deterministic Priority: ${priorityCalculation.priorityScore}/100 (${priorityCalculation.priorityLevel}). Detected Scenario: ${scenarioDetection.scenarioType}. Active Conflicts: ${conflicts.length}.`,
          confidence: reasoningRes.modelConfidence || reasoningRes.evidenceConfidence || 0.85,
          uncertaintyAnalysis:
            "AI interpretation is strictly advisory. Cross-domain coordination indicators must be verified by agricultural administrators before executing procurement or movement decisions.",
          suggestedHumanActions: [
            "Review flagged intelligence conflicts between market and physical supply layers",
            "Evaluate regional alternative suppliers in adjacent agricultural basins",
          ],
        };
      }
    } catch (err: unknown) {
      console.warn("AI reasoning failed for orchestrator; falling back to deterministic-only:", err);
    }
  }

  // 10. PREPARE IMMUTABLE SNAPSHOT RECORD
  const contributingAgents = Array.from(new Set(finalContributions.map((c) => c.agentId)));
  const affectedDomains = scenarioDetection.affectedDomains;

  const snapshot: OrchestrationSnapshotRecord = {
    scenario_type: scenarioDetection.scenarioType,
    priority_score: priorityCalculation.priorityScore,
    priority_level: priorityCalculation.priorityLevel,
    orchestration_confidence: confidenceMetrics.orchestrationConfidence,
    domain_score: confidenceMetrics.domainScore,
    evidence_confidence: confidenceMetrics.evidenceConfidence,
    geographic_scope: state ? (lga ? `${state}:${lga}` : state) : "NATIONAL",
    state: state || null,
    lga: lga || null,
    geopolitical_zone: finalContributions[0]?.geopoliticalZone || null,
    commodity: commodity || null,
    commodity_category: finalContributions[0]?.commodityCategory || null,
    affected_domains: affectedDomains,
    contributing_agents: contributingAgents,
    contributing_signals: finalContributions.map((c) => ({
      domain: c.domain,
      signalType: c.signalType,
      score: c.score,
      severity: c.severity,
      sources: c.sourceReferences,
    })),
    scenario_summary: scenarioDetection.scenarioSummary,
    deterministic_findings: {
      ...scenarioDetection.deterministicFindings,
      deduplication,
      confidenceMetrics,
      conflictsCount: conflicts.length,
    },
    conflict_detected: conflicts.length > 0,
    conflict_details: conflicts.length > 0 ? (conflicts as unknown as Record<string, unknown>) : null,
    evidence_summary: scenarioDetection.evidenceSummary,
    component_breakdown: priorityCalculation.breakdown,
    generated_at: new Date().toISOString(),
  };

  // 11. PERSISTENCE (Append-only snapshots, conflicts, recommendations)
  if (supabase && !params.skipPersistence) {
    try {
      // Insert immutable snapshot
      const { data: insertedSnap } = await supabase
        .from("agricultural_orchestration_snapshots")
        .insert({
          scenario_type: snapshot.scenario_type,
          priority_score: snapshot.priority_score,
          priority_level: snapshot.priority_level,
          orchestration_confidence: snapshot.orchestration_confidence,
          domain_score: snapshot.domain_score,
          evidence_confidence: snapshot.evidence_confidence,
          geographic_scope: snapshot.geographic_scope,
          state: snapshot.state,
          lga: snapshot.lga,
          geopolitical_zone: snapshot.geopolitical_zone,
          commodity: snapshot.commodity,
          commodity_category: snapshot.commodity_category,
          affected_domains: snapshot.affected_domains,
          contributing_agents: snapshot.contributing_agents,
          contributing_signals: snapshot.contributing_signals,
          scenario_summary: snapshot.scenario_summary,
          deterministic_findings: snapshot.deterministic_findings,
          conflict_detected: snapshot.conflict_detected,
          conflict_details: snapshot.conflict_details,
          evidence_summary: snapshot.evidence_summary,
          component_breakdown: snapshot.component_breakdown,
          generated_at: snapshot.generated_at,
        })
        .select("id")
        .single();

      const snapshotId = insertedSnap?.id || null;
      if (snapshotId) {
        snapshot.id = snapshotId;

        // Insert active conflicts
        if (conflicts.length > 0) {
          await supabase.from("agricultural_intelligence_conflicts").insert(
            conflicts.map((c) => ({
              snapshot_id: snapshotId,
              conflict_type: c.conflictType,
              domain_a: c.domainA,
              domain_b: c.domainB,
              signal_a: c.signalA,
              signal_b: c.signalB,
              state: c.state || null,
              lga: c.lga || null,
              commodity: c.commodity || null,
              severity: c.severity,
              status: c.status,
              explanation: c.explanation,
              confidence_impact: c.confidenceImpact,
              recommended_human_review: c.recommendedHumanReview,
            }))
          );
        }

        // Insert recommendations
        if (recommendations.length > 0) {
          await supabase.from("agricultural_orchestration_recommendations").insert(
            recommendations.map((r) => ({
              snapshot_id: snapshotId,
              title: r.title,
              summary: r.summary,
              action_path: r.actionPath,
              priority: r.priority,
              confidence: r.confidence,
              affected_domains: r.affectedDomains,
              affected_commodities: r.affectedCommodities,
              affected_states: r.affectedStates,
              status: r.status,
              advisory_disclaimer: r.advisoryDisclaimer,
              metadata: r.metadata || {},
            }))
          );
        }
      }
    } catch (persistErr) {
      console.warn("Failed persisting orchestration records to database:", persistErr);
    }
  }

  return {
    snapshot,
    scenarioType: scenarioDetection.scenarioType,
    priorityScore: priorityCalculation.priorityScore,
    priorityLevel: priorityCalculation.priorityLevel,
    confidenceMetrics,
    breakdown: priorityCalculation.breakdown,
    conflicts,
    recommendations,
    aiInterpretation,
  };
}
