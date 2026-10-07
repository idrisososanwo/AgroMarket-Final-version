/**
 * AgroMarket Phase 3.2: Agricultural Decision Intelligence Dashboard Queries
 * Aggregates Personalized Intelligence, Normalized Context, Governed Recommendations,
 * Actionable Domain Feeds, Notifications, Decisions, and Outcomes for /my-intelligence
 */

import { createClient } from "@/lib/supabase/server";
import { fetchCrossDomainAgentOutputs } from "@/features/orchestration/data-layer";
import { getOrchestrationRecommendations } from "@/features/orchestration/queries";
import { buildNormalizedDecisionContext } from "./context-builder";
import {
  getUserActions,
  getUserDecisions,
  getUserGovernedNotifications,
  getUserIntelligencePreferences,
  getLinkedOutcomesForRecommendations,
} from "./data-layer";
import { generateGovernedRecommendations } from "./recommendation-engine";
import {
  ActorRole,
  DecisionOutcomeRecord,
  GovernedDecisionRecommendation,
  MyIntelligenceDashboardData,
  UrgencyLevel,
} from "./types";

export interface FetchDashboardOptions {
  userId?: string;
  roleOverride?: ActorRole;
  stateOverride?: string;
  lgaOverride?: string;
}

/**
 * Main aggregator for the /my-intelligence user dashboard
 */
export async function getMyIntelligenceDashboardData(
  options: FetchDashboardOptions = {}
): Promise<MyIntelligenceDashboardData> {
  const supabase = await createClient().catch(() => null);

  // 1. Resolve User ID and Primary Role
  let effectiveUserId = options.userId || "";
  let detectedRole: ActorRole = options.roleOverride || "FARMER";
  let userProfileState: string | undefined = options.stateOverride;
  let userProfileLga: string | undefined = options.lgaOverride;

  if (supabase && !effectiveUserId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        effectiveUserId = user.id;

        // Fetch user profile and roles
        const [profileRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("state, lga").eq("id", user.id).maybeSingle(),
          supabase.from("user_roles").select("role_code").eq("user_id", user.id),
        ]);

        if (profileRes.data) {
          userProfileState = userProfileState || profileRes.data.state;
          userProfileLga = userProfileLga || profileRes.data.lga;
        }

        if (!options.roleOverride && rolesRes.data && rolesRes.data.length > 0) {
          const roleCode = rolesRes.data[0].role_code;
          if (
            [
              "FARMER",
              "BUYER",
              "BUSINESS",
              "SERVICE_PROVIDER",
              "EQUIPMENT_OWNER",
              "EXPERT",
              "ADMIN",
            ].includes(roleCode)
          ) {
            detectedRole = roleCode as ActorRole;
          }
        }
      }
    } catch (authErr) {
      console.warn("Could not retrieve authenticated user in intelligence query:", authErr);
    }
  }

  // Fallback demo user ID if unauthenticated
  if (!effectiveUserId) {
    effectiveUserId = "00000000-0000-0000-0000-000000000001";
  }

  // 2. Fetch User Intelligence Preferences
  const preferences = await getUserIntelligencePreferences(
    supabase,
    effectiveUserId,
    detectedRole
  );

  const activeRole: ActorRole = options.roleOverride || preferences.primaryRole || detectedRole;
  const activeState = options.stateOverride || preferences.preferredStates[0] || userProfileState || null;
  const activeLga = options.lgaOverride || preferences.preferredLgas[0] || userProfileLga || null;

  // 3. Concurrently fetch domain outputs, orchestration recommendations, decisions, actions, notifications
  const [rawSignals, orchRecs, userDecisions, userActions, notifications] = await Promise.all([
    fetchCrossDomainAgentOutputs(supabase, {
      state: activeState,
      lga: activeLga,
      limit: 50,
    }).catch(() => []),
    getOrchestrationRecommendations({
      limit: 20,
    }).catch(() => []),
    getUserDecisions(supabase, effectiveUserId, 50).catch(() => []),
    getUserActions(supabase, effectiveUserId, 50).catch(() => []),
    getUserGovernedNotifications(supabase, effectiveUserId, 20).catch(() => []),
  ]);

  // 4. Build Normalized Decision Context
  const decisionContext = buildNormalizedDecisionContext({
    actorRole: activeRole,
    state: activeState,
    lga: activeLga,
    monitoredCommodities: preferences.monitoredCommodities,
    preferences,
    rawSignals,
  });

  // 5. Generate Governed Recommendations answering 8 core questions
  const generatedRecs = generateGovernedRecommendations({
    userRole: activeRole,
    state: activeState,
    lga: activeLga,
    preferences,
    rawSignals,
    orchestrationRecommendations: orchRecs,
  });

  // 6. Link User Decisions and Outcomes to Recommendations
  const recIds = generatedRecs.map((r) => r.id);
  const outcomesMap: Record<string, DecisionOutcomeRecord> =
    await getLinkedOutcomesForRecommendations(supabase, recIds).catch(
      () => ({} as Record<string, DecisionOutcomeRecord>)
    );

  const decisionsByRecId = new Map(userDecisions.map((d) => [d.recommendationId, d]));
  const actionsByRecId = new Map<string, typeof userActions>();
  for (const act of userActions) {
    const list = actionsByRecId.get(act.recommendationId) || [];
    list.push(act);
    actionsByRecId.set(act.recommendationId, list);
  }

  const enrichedRecommendations: GovernedDecisionRecommendation[] = generatedRecs.map((rec) => {
    const dec = decisionsByRecId.get(rec.id) || null;
    const acts = actionsByRecId.get(rec.id) || [];
    const outcome = outcomesMap[rec.id] || null;

    if (dec && rec.eightQuestions) {
      rec.eightQuestions.whatHappenedAfterUserDecided = `User recorded decision: ${dec.decision} at ${
        dec.decidedAt ? new Date(dec.decidedAt).toLocaleDateString() : "recently"
      }. Notes: ${dec.decisionNotes || "None provided"}`;
    }

    return {
      ...rec,
      userDecision: dec,
      userActions: acts,
      outcome,
    };
  });

  // 7. Extract Role-Specific Domain Signals
  // A. Market Signals
  const marketSignals = rawSignals
    .filter((s) => s.domain === "MARKET")
    .slice(0, 8)
    .map((s, idx) => ({
      id: `mkt-sig-${idx}`,
      commodity: s.commodity || "Staple Produce",
      state: s.state || activeState || "National Hub",
      pressureType: s.signalType.replace(/_/g, " "),
      trend: s.score > 60 ? "HIGH_PRESSURE" : s.score > 35 ? "MODERATE_PRESSURE" : "STABLE",
      confidence: s.confidence,
      severity: (s.severity as UrgencyLevel) || "MEDIUM",
      updatedAt: s.observationTime || new Date().toISOString(),
    }));

  // B. Supply & Demand
  const supplyGaps = rawSignals
    .filter((s) => s.domain === "SUPPLY" || s.signalType.includes("SHORTAGE"))
    .slice(0, 6)
    .map((s) => ({
      commodity: s.commodity || "Cassava Roots",
      state: s.state || activeState || "Regional Hub",
      shortageLevel: s.severity,
      confidence: s.confidence,
      actionUrl: "/marketplace",
    }));

  const demandPeaks = rawSignals
    .filter((s) => s.domain === "DEMAND" || s.signalType.includes("DEMAND"))
    .slice(0, 6)
    .map((s) => ({
      commodity: s.commodity || "White Maize",
      volumeEstimate: s.score > 70 ? "High Bulk Volume" : "Commercial Volume",
      timing: "Upcoming 14-30 Days",
      confidence: s.confidence,
    }));

  // C. Procurement Opportunities
  const procurementOpportunities = rawSignals
    .filter((s) => s.domain === "PROCUREMENT" || s.domain === "DEMAND")
    .slice(0, 6)
    .map((s, idx) => ({
      id: `proc-opp-${idx}`,
      title: `Bulk Procurement Window: ${s.commodity || "Produce"} in ${s.state || "Active Hubs"}`,
      commodity: s.commodity || "Grain & Pulses",
      volume: `${Math.round(s.score * 5)} Metric Tonnes`,
      urgency: (s.severity as UrgencyLevel) || "MEDIUM",
      deadline: "Within 14 Days",
      actionUrl: "/procurement-intelligence",
    }));

  // D. Logistics Alerts
  const logisticsAlerts = rawSignals
    .filter((s) => s.domain === "LOGISTICS")
    .slice(0, 6)
    .map((s, idx) => ({
      id: `log-alert-${idx}`,
      corridor: `${s.state || "Transit"} Corridor Corridor Route`,
      status: s.severity === "CRITICAL" ? "Severe Bottleneck" : "Transit Delay Observed",
      severity: (s.severity as UrgencyLevel) || "MEDIUM",
      summary: s.limitations?.[0] || "Transit time elevated due to seasonal checkpoints or road surface conditions.",
      actionUrl: "/logistics-intelligence",
    }));

  // E. Biosecurity Advisories
  const biosecurityAdvisories = rawSignals
    .filter((s) => s.domain === "DISEASE_BIOSECURITY")
    .slice(0, 6)
    .map((s, idx) => ({
      id: `bio-adv-${idx}`,
      threatName: s.signalType.replace(/_/g, " "),
      affectedSpecies: s.commodity || "Crop / Livestock",
      state: s.state || activeState || "Surveillance Zone",
      advisoryType: "Precautionary Monitoring",
      urgency: (s.severity as UrgencyLevel) || "HIGH",
      actionUrl: "/disease-intelligence",
    }));

  // F. Cross-Cutting Opportunities
  const opportunities = [
    {
      id: "opp-1",
      title: "Commercial Farm Input & Aggregation Hub",
      category: "AGGREGATION",
      summary: "Consolidate produce with neighboring producers to reduce freight costs by up to 25%.",
      actionUrl: "/marketplace",
      actionLabel: "Explore Aggregation",
    },
    {
      id: "opp-2",
      title: "Tractor & Implement Rental Availability",
      category: "EQUIPMENT",
      summary: "Lease plowing and harvesting machinery before peak seasonal tariff surges.",
      actionUrl: "/equipment",
      actionLabel: "View Equipment",
    },
    {
      id: "opp-3",
      title: "Agronomic Advisory & Extension Support",
      category: "EXPERT_ADVICE",
      summary: "Connect with accredited extension agronomists for localized crop health management.",
      actionUrl: "/jobs",
      actionLabel: "Browse Agronomists",
    },
  ];

  // 8. Extract outcomes list
  const outcomesList = Object.values(outcomesMap);

  return {
    userRole: activeRole,
    preferences,
    decisionContext,
    recommendations: enrichedRecommendations,
    marketSignals,
    supplyAndDemand: {
      supplyGaps,
      demandPeaks,
    },
    procurementOpportunities,
    logisticsAlerts,
    biosecurityAdvisories,
    opportunities,
    notifications,
    decisions: userDecisions,
    actions: userActions,
    outcomes: outcomesList,
  };
}
