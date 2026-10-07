/**
 * AgroMarket Phase 3.2: Normalized Decision Context Builder
 * Multi-Domain Synthesis Tailored by Stakeholder Actor Role with Privacy Protection
 *
 * SAFETY INVARIANTS:
 * 1. COMMERCIAL PRIVACY: Zero PII, private phone numbers, farm coordinates, or private buyer identities.
 * 2. ROLE MINIMUM PRINCIPLE: Only contains intelligence necessary for the user's specific role decision.
 * 3. ANTI-PORK INVARIANT: Complete prohibition of swine/pig references across all queries & signals.
 * 4. DETERMINISTIC FOUNDATION: Authentic multi-domain signals only.
 */

import { AgentOutputContribution, SpecializedAgentDomain } from "@/features/orchestration/types";
import {
  ActorRole,
  NormalizedDecisionContext,
  UrgencyLevel,
  UserIntelligencePreferences,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";

export interface BuildDecisionContextOptions {
  actorRole: ActorRole;
  state?: string | null;
  lga?: string | null;
  monitoredCommodities?: string[];
  preferences?: UserIntelligencePreferences | null;
  rawSignals?: AgentOutputContribution[];
}

/**
 * Filter domains relevant to specific actor types
 */
export function getRelevantDomainsForRole(role: ActorRole): SpecializedAgentDomain[] {
  switch (role) {
    case "FARMER":
      return ["MARKET", "PRODUCTION", "DEMAND", "SUPPLY", "LOGISTICS", "DISEASE_BIOSECURITY", "FOOD_SECURITY"];
    case "BUYER":
      return ["SUPPLY", "DEMAND", "MARKET", "PROCUREMENT", "LOGISTICS"];
    case "BUSINESS":
      return ["PROCUREMENT", "DEMAND", "SUPPLY", "MARKET", "LOGISTICS", "FOOD_SECURITY"];
    case "SERVICE_PROVIDER":
      return ["PRODUCTION", "LOGISTICS", "DEMAND", "MARKET"];
    case "EQUIPMENT_OWNER":
      return ["PRODUCTION", "LOGISTICS", "DEMAND"];
    case "EXPERT":
      return ["DISEASE_BIOSECURITY", "FOOD_SECURITY", "PRODUCTION", "MARKET"];
    case "ADMIN":
    default:
      return [
        "MARKET",
        "PRODUCTION",
        "DEMAND",
        "SUPPLY",
        "PROCUREMENT",
        "FOOD_SECURITY",
        "LOGISTICS",
        "DISEASE_BIOSECURITY",
      ];
  }
}

/**
 * Strips PII and sensitive parameters from raw records
 */
function sanitizeSignalText(text: string): string {
  // Redact potential phone numbers (e.g., Nigerian 080..., +234...)
  const phoneRegex = /(\+?234|0)[789][01]\d{8}/g;
  // Redact potential coordinates like lat,lng
  const coordRegex = /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/g;

  return text
    .replace(phoneRegex, "[REDACTED_CONTACT]")
    .replace(coordRegex, "[REGIONAL_COORDINATES_PROTECTED]");
}

/**
 * Builds normalized decision context strictly for the target user's role and geography
 */
export function buildNormalizedDecisionContext(
  options: BuildDecisionContextOptions
): NormalizedDecisionContext {
  const {
    actorRole,
    state,
    lga,
    monitoredCommodities = [],
    preferences,
    rawSignals = [],
  } = options;

  // Validate anti-pork on commodities
  for (const c of monitoredCommodities) {
    assertNoProhibitedProduce(c, "Monitored Commodity");
  }

  const allowedDomains = new Set(getRelevantDomainsForRole(actorRole));
  const preferredStates = preferences?.preferredStates || (state ? [state] : []);
  const preferredCommodities = preferences?.monitoredCommodities.length
    ? preferences.monitoredCommodities
    : monitoredCommodities;

  // Filter signals matching role relevance and user filters
  const filteredSignals = rawSignals.filter((signal) => {
    // 1. Role domain relevance
    if (!allowedDomains.has(signal.domain)) return false;

    // 2. Anti-pork check
    if (signal.commodity) {
      assertNoProhibitedProduce(signal.commodity, "Signal Commodity");
    }

    // 3. State filtering if user has selected preferred states
    if (preferredStates.length > 0 && signal.state) {
      const stateMatch = preferredStates.some(
        (s) => s.toLowerCase() === signal.state?.toLowerCase()
      );
      if (!stateMatch) return false;
    }

    // 4. Commodity filtering if user has selected monitored commodities
    if (preferredCommodities.length > 0 && signal.commodity) {
      const commMatch = preferredCommodities.some((c) =>
        signal.commodity?.toLowerCase().includes(c.toLowerCase())
      );
      if (!commMatch) return false;
    }

    return true;
  });

  // Calculate domain specific counts
  let marketPressureCount = 0;
  let demandSignalCount = 0;
  let supplySignalCount = 0;
  let procurementRiskCount = 0;
  let logisticsBottleneckCount = 0;
  let biosecurityAlertCount = 0;
  let foodSecurityContextCount = 0;

  const sanitizedSignals = filteredSignals.map((s, index) => {
    switch (s.domain) {
      case "MARKET":
        marketPressureCount++;
        break;
      case "DEMAND":
        demandSignalCount++;
        break;
      case "SUPPLY":
        supplySignalCount++;
        break;
      case "PROCUREMENT":
        procurementRiskCount++;
        break;
      case "LOGISTICS":
        logisticsBottleneckCount++;
        break;
      case "DISEASE_BIOSECURITY":
        biosecurityAlertCount++;
        break;
      case "FOOD_SECURITY":
        foodSecurityContextCount++;
        break;
      case "PRODUCTION":
        break;
    }

    const urgency: UrgencyLevel =
      s.severity === "CRITICAL"
        ? "CRITICAL"
        : s.severity === "HIGH"
        ? "HIGH"
        : s.severity === "MEDIUM"
        ? "MEDIUM"
        : "LOW";

    const cleanSummary = sanitizeSignalText(
      `${s.signalType.replace(/_/g, " ")} observed in ${s.state || "National Scope"}${
        s.commodity ? ` for ${s.commodity}` : ""
      }. Score: ${s.score.toFixed(0)}.`
    );

    return {
      id: `${s.agentId}-${index}`,
      domain: s.domain,
      signalType: s.signalType,
      severity: urgency,
      commodity: s.commodity,
      state: s.state,
      summary: cleanSummary,
      confidence: s.confidence,
    };
  });

  const activeOpportunitiesCount =
    actorRole === "FARMER"
      ? demandSignalCount + marketPressureCount
      : actorRole === "BUYER" || actorRole === "BUSINESS"
      ? supplySignalCount
      : actorRole === "SERVICE_PROVIDER" || actorRole === "EQUIPMENT_OWNER"
      ? demandSignalCount
      : 0;

  return {
    actorRole,
    state: state || null,
    lga: lga || null,
    selectedCommodities: preferredCommodities,
    marketPressureCount,
    demandSignalCount,
    supplySignalCount,
    procurementRiskCount,
    logisticsBottleneckCount,
    biosecurityAlertCount,
    foodSecurityContextCount,
    activeOpportunitiesCount,
    contributingAgents: Array.from(allowedDomains),
    latestGeneratedAt: new Date().toISOString(),
    signals: sanitizedSignals,
  };
}
