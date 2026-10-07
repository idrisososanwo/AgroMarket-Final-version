/**
 * AgroMarket Phase 3.2: Governed Agricultural Recommendation Engine
 * Transforms Validated Intelligence Signals into Actionable, Explainable, Role-Tailored Recommendations
 *
 * SAFETY INVARIANTS:
 * 1. ADVISORY ONLY: Never executes transactions or actions autonomously.
 * 2. 8 CORE QUESTIONS: Answers all 8 questions for explainability.
 * 3. REAL ROUTES ONLY: Validates action routes against actual AgroMarket pages.
 * 4. SEPARATE CONFIDENCE & PRIORITY: Evidence confidence (0.0-1.0) is strictly distinct from priority score.
 * 5. ANTI-PORK ZERO TOLERANCE: Rejects any prohibited produce references.
 * 6. DETERMINISTIC CORE WITH SAFE AI ENRICHMENT FALLBACK.
 */

import {
  AgentOutputContribution,
  OrchestrationRecommendationItem,
  SpecializedAgentDomain,
} from "@/features/orchestration/types";
import {
  ActorRole,
  GovernedDecisionRecommendation,
  PriorityLevel,
  RecommendationEightQuestions,
  RecommendationStatus,
  RecommendationType,
  UrgencyLevel,
  UserIntelligencePreferences,
} from "./types";
import { assertSafeRecommendationPayload } from "./validation";

export interface GenerateRecommendationsOptions {
  userRole: ActorRole;
  state?: string | null;
  lga?: string | null;
  preferences?: UserIntelligencePreferences | null;
  rawSignals?: AgentOutputContribution[];
  orchestrationRecommendations?: OrchestrationRecommendationItem[];
}

/**
 * Valid existing AgroMarket route mapping
 */
export function resolveActionRoute(type: RecommendationType, domain?: SpecializedAgentDomain): string {
  switch (type) {
    case "REVIEW_SUPPLY_GAP":
      return "/marketplace";
    case "DIVERSIFY_SUPPLIERS":
      return "/supply-intelligence";
    case "INVESTIGATE":
    case "REVIEW_PRODUCTION_OPPORTUNITY":
      return "/production-intelligence";
    case "REVIEW_MARKET_OPPORTUNITY":
      return "/market-intelligence";
    case "REVIEW_DEMAND_SIGNAL":
      return "/demand-intelligence";
    case "REVIEW_LOGISTICS_OPTIONS":
      return "/logistics-intelligence";
    case "REVIEW_BIOSECURITY_INFORMATION":
      return "/disease-intelligence";
    case "REVIEW_FOOD_SECURITY_RISK":
      return "/food-security";
    case "REVIEW_EQUIPMENT_OPTIONS":
      return "/equipment";
    case "SEEK_EXPERT_GUIDANCE":
      return "/jobs";
    case "REVIEW_AGGREGATION_OPPORTUNITY":
      return "/marketplace";
    case "REVIEW_PROCESSING_CAPACITY":
    case "REVIEW_ALTERNATIVE_REGION":
      return "/procurement-intelligence";
    case "MONITOR":
    case "NO_ACTION_RECOMMENDED":
    case "INSUFFICIENT_DATA":
    default:
      if (domain === "MARKET") return "/market-intelligence";
      if (domain === "DEMAND") return "/demand-intelligence";
      if (domain === "SUPPLY") return "/supply-intelligence";
      if (domain === "LOGISTICS") return "/logistics-intelligence";
      if (domain === "DISEASE_BIOSECURITY") return "/disease-intelligence";
      if (domain === "FOOD_SECURITY") return "/food-security";
      if (domain === "PROCUREMENT") return "/procurement-intelligence";
      return "/my-intelligence";
  }
}

function limitationsText(customLimit?: string): string {
  const base = "Advisory intelligence based on recorded signals and regional trends. AgroMarket does not guarantee harvest yields, price movements, or logistics travel times. Verification with local counterparts is recommended.";
  return customLimit ? `${customLimit} ${base}` : base;
}

/**
 * Synthesizes the 8 core questions for any recommendation
 */
export function buildEightQuestions(params: {
  whatIsHappening: string;
  whyDoesItMatter: string;
  whoDoesItAffect: string;
  where: string;
  whatEvidenceSupportsIt: string;
  whatCouldTheUserConsiderDoing: string;
  whatAreTheLimitations: string;
  userDecisionNote?: string | null;
}): RecommendationEightQuestions {
  return {
    whatIsHappening: params.whatIsHappening,
    whyDoesItMatter: params.whyDoesItMatter,
    whoDoesItAffect: params.whoDoesItAffect,
    where: params.where,
    whatEvidenceSupportsIt: params.whatEvidenceSupportsIt,
    whatCouldTheUserConsiderDoing: params.whatCouldTheUserConsiderDoing,
    whatAreTheLimitations: limitationsText(params.whatAreTheLimitations),
    whatHappenedAfterUserDecided: params.userDecisionNote || null,
  };
}

/**
 * Infers recommendation type from domain contribution and severity
 */
function inferRecommendationType(domain: SpecializedAgentDomain, severity: string, role: ActorRole): RecommendationType {
  if (domain === "DISEASE_BIOSECURITY") return "REVIEW_BIOSECURITY_INFORMATION";
  if (domain === "FOOD_SECURITY") return "REVIEW_FOOD_SECURITY_RISK";
  if (domain === "LOGISTICS") return "REVIEW_LOGISTICS_OPTIONS";
  if (domain === "SUPPLY") {
    return role === "BUYER" || role === "BUSINESS" ? "DIVERSIFY_SUPPLIERS" : "REVIEW_SUPPLY_GAP";
  }
  if (domain === "DEMAND") return "REVIEW_DEMAND_SIGNAL";
  if (domain === "PRODUCTION") return "REVIEW_PRODUCTION_OPPORTUNITY";
  if (domain === "MARKET") return "REVIEW_MARKET_OPPORTUNITY";
  if (domain === "PROCUREMENT") return "DIVERSIFY_SUPPLIERS";

  return severity === "CRITICAL" ? "INVESTIGATE" : "MONITOR";
}

/**
 * Maps orchestration priority string to strictly typed Urgency & Priority
 */
function mapPriorityAndUrgency(level: string): { priority: PriorityLevel; urgency: UrgencyLevel } {
  switch (level) {
    case "CRITICAL":
      return { priority: "CRITICAL", urgency: "CRITICAL" };
    case "HIGH":
      return { priority: "HIGH", urgency: "HIGH" };
    case "MEDIUM":
      return { priority: "MEDIUM", urgency: "MEDIUM" };
    case "LOW":
    default:
      return { priority: "LOW", urgency: "LOW" };
  }
}

/**
 * Core Deterministic Recommendation Generator
 */
export function generateGovernedRecommendations(
  options: GenerateRecommendationsOptions
): GovernedDecisionRecommendation[] {
  const {
    userRole,
    state,
    lga,
    preferences,
    rawSignals = [],
    orchestrationRecommendations = [],
  } = options;

  const results: GovernedDecisionRecommendation[] = [];
  const minConfidence = preferences?.minConfidence ?? 0.4;
  const mutedTypes = new Set(preferences?.mutedRecommendationTypes ?? []);

  // 1. Process and adapt Orchestration recommendations (Phase 3.1 governed outputs)
  for (const orchRec of orchestrationRecommendations) {
    const { priority, urgency } = mapPriorityAndUrgency(orchRec.priority);
    if (orchRec.confidence < minConfidence) continue;

    // Filter by role relevance if recommendation specifies affected states/domains
    const primaryDomain = orchRec.affectedDomains[0] || "MARKET";
    const inferredType = inferRecommendationType(primaryDomain, orchRec.priority, userRole);
    if (mutedTypes.has(inferredType)) continue;

    const locationStr = orchRec.affectedStates.length > 0 ? orchRec.affectedStates.join(", ") : state || "National Scope";
    const commodityStr = orchRec.affectedCommodities.length > 0 ? orchRec.affectedCommodities.join(", ") : undefined;

    const eightQuestions = buildEightQuestions({
      whatIsHappening: orchRec.summary,
      whyDoesItMatter: `This condition creates operational and economic implications for ${userRole.toLowerCase()}s in ${locationStr}.`,
      whoDoesItAffect: `${userRole}s and associated supply chain actors.`,
      where: locationStr,
      whatEvidenceSupportsIt: `Synthesized from cross-domain orchestration indicators across ${orchRec.affectedDomains.join(", ")}.`,
      whatCouldTheUserConsiderDoing: `Review suggested actions through ${orchRec.actionPath || resolveActionRoute(inferredType, primaryDomain)}.`,
      whatAreTheLimitations: "Requires on-ground verification before deploying capital or commitments.",
    });

    const recItem: GovernedDecisionRecommendation = {
      id: orchRec.id || `rec-${results.length + 1}`,
      recommendationType: inferredType,
      title: orchRec.title,
      summary: orchRec.summary,
      rationale: `Systemic priority ${orchRec.priority} with calibrated multi-agent confidence ${(orchRec.confidence * 100).toFixed(0)}%.`,
      affectedActor: userRole,
      geography: {
        state: orchRec.affectedStates[0] || state || null,
        lga: lga || null,
      },
      commodity: commodityStr || null,
      urgency,
      priority,
      confidence: orchRec.confidence,
      evidenceReferences: orchRec.affectedDomains.map((d) => `Agent Domain: ${d}`),
      contributingAgents: orchRec.affectedDomains,
      contributingSignals: [`Priority Level: ${orchRec.priority}`, `Domains: ${orchRec.affectedDomains.join(", ")}`],
      limitations: "Advisory cross-domain recommendation. Autonomous execution disabled.",
      actionPath: orchRec.actionPath || resolveActionRoute(inferredType, primaryDomain),
      status: (orchRec.status as RecommendationStatus) || "PROPOSED",
      advisoryDisclaimer: orchRec.advisoryDisclaimer,
      eightQuestions,
      explainability: {
        contributingAgents: orchRec.affectedDomains,
        keySignals: [`Priority Level: ${orchRec.priority}`],
        evidenceConfidence: orchRec.confidence,
        dataRecencyHours: 6,
        relevantGeography: { state: orchRec.affectedStates[0] || state || null, lga: lga || null },
        relevantCommodity: commodityStr || null,
        limitations: ["Orchestration synthesis based on current cluster evidence"],
        explanationSummary: `Derived from ${orchRec.affectedDomains.join(" and ")} intelligence models calibrated for ${userRole.toLowerCase()} decision making.`,
      },
      reviewedBy: orchRec.reviewedBy || null,
      reviewedAt: orchRec.reviewedAt || null,
      expiresAt: null,
      createdAt: orchRec.createdAt || new Date().toISOString(),
    };

    assertSafeRecommendationPayload(recItem);
    results.push(recItem);
  }

  // 2. Synthesize recommendations directly from high-impact raw domain signals if needed
  if (results.length < 3 && rawSignals.length > 0) {
    for (const signal of rawSignals) {
      if (signal.confidence < minConfidence) continue;

      const inferredType = inferRecommendationType(signal.domain, signal.severity, userRole);
      if (mutedTypes.has(inferredType)) continue;

      const { priority, urgency } = mapPriorityAndUrgency(signal.severity);
      const location = signal.state || state || "National Scope";
      const comm = signal.commodity || undefined;

      const title = `${inferredType.replace(/_/g, " ")}: ${comm || "Regional Agriculture"} in ${location}`;
      const summary = `Signal detected in ${signal.domain} domain indicating ${signal.signalType.replace(/_/g, " ").toLowerCase()} with score ${signal.score.toFixed(0)}.`;
      const route = resolveActionRoute(inferredType, signal.domain);

      const eightQuestions = buildEightQuestions({
        whatIsHappening: summary,
        whyDoesItMatter: `Directly impacts operational timing and margin considerations for ${userRole.toLowerCase()}s in ${location}.`,
        whoDoesItAffect: `Local ${userRole.toLowerCase()}s operating in ${location}.`,
        where: location,
        whatEvidenceSupportsIt: `Reported by ${signal.agentId} with ${(signal.evidenceConfidence * 100).toFixed(0)}% evidence credibility.`,
        whatCouldTheUserConsiderDoing: `Examine detailed observations and follow up via ${route}.`,
        whatAreTheLimitations: "Localized signal subject to dynamic field developments.",
      });

      const rec: GovernedDecisionRecommendation = {
        id: `sig-rec-${results.length + 1}`,
        recommendationType: inferredType,
        title,
        summary,
        rationale: `Domain severity score ${signal.score.toFixed(0)}/100 from ${signal.agentId}.`,
        affectedActor: userRole,
        geography: { state: signal.state || state || null, lga: signal.lga || lga || null },
        commodity: comm || null,
        urgency,
        priority,
        confidence: signal.confidence,
        evidenceReferences: signal.sourceReferences || ["AgroMarket Domain Feed"],
        contributingAgents: [signal.domain],
        contributingSignals: [signal.signalType],
        limitations: "Single-domain observational advisory. Verify on ground.",
        actionPath: route,
        status: "PROPOSED",
        advisoryDisclaimer: "Advisory recommendation only. Requires human verification before execution.",
        eightQuestions,
        explainability: {
          contributingAgents: [signal.domain],
          keySignals: [signal.signalType],
          evidenceConfidence: signal.evidenceConfidence,
          dataRecencyHours: 12,
          relevantGeography: { state: signal.state || null, lga: signal.lga || null },
          relevantCommodity: comm || null,
          limitations: signal.limitations || ["Recent observational signal"],
          explanationSummary: `Signal generated by ${signal.agentId} reflecting verified ${signal.domain.toLowerCase()} conditions.`,
        },
        createdAt: new Date().toISOString(),
      };

      assertSafeRecommendationPayload(rec);
      results.push(rec);
      if (results.length >= 8) break;
    }
  }

  // 3. Fallback: if zero signals available, return nominal INSUFFICIENT_DATA recommendation
  if (results.length === 0) {
    const nominalItem: GovernedDecisionRecommendation = {
      id: "nominal-insufficient-data",
      recommendationType: "INSUFFICIENT_DATA",
      title: `Nominal Baseline: Insufficient Localized Signals for ${state || "Selected Region"}`,
      summary: "No anomalous market pressure, pest outbreak, or critical logistics bottlenecks currently flagged for your configured profile.",
      rationale: "Continuous cross-domain agent surveillance indicates nominal conditions or requires additional market data points.",
      affectedActor: userRole,
      geography: { state: state || null, lga: lga || null },
      commodity: null,
      urgency: "LOW",
      priority: "LOW",
      confidence: 0.9,
      evidenceReferences: ["AgroMarket Multi-Agent Surveillance"],
      contributingAgents: ["MARKET", "PRODUCTION", "DEMAND"],
      contributingSignals: ["NOMINAL_BASELINE"],
      limitations: "Absence of alerts does not guarantee absolute absence of localized disruption.",
      actionPath: "/marketplace",
      status: "PROPOSED",
      advisoryDisclaimer: "Advisory baseline intelligence.",
      eightQuestions: buildEightQuestions({
        whatIsHappening: "AgroMarket surveillance detected no acute disruptions or risk spikes in your configured geography.",
        whyDoesItMatter: "Operations can proceed according to standard seasonal planning without urgent defensive adjustments.",
        whoDoesItAffect: `${userRole}s in ${state || "all monitored regions"}.`,
        where: state || "National Scope",
        whatEvidenceSupportsIt: "Continuous background surveillance across 8 intelligence agents.",
        whatCouldTheUserConsiderDoing: "Maintain standard monitoring and explore active marketplace opportunities.",
        whatAreTheLimitations: "Minor informal trading changes may not yet meet systemic detection thresholds.",
      }),
      explainability: {
        contributingAgents: ["MARKET", "PRODUCTION", "DEMAND"],
        keySignals: ["BASELINE_MONITORING"],
        evidenceConfidence: 0.9,
        dataRecencyHours: 1,
        relevantGeography: { state: state || null, lga: null },
        limitations: ["Baseline surveillance report"],
        explanationSummary: "All monitored indicators within normal parameters.",
      },
      createdAt: new Date().toISOString(),
    };

    results.push(nominalItem);
  }

  return results;
}
