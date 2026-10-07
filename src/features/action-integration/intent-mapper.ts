/**
 * AgroMarket Phase 3.3: Governed Recommendation to Action-Intent Mapper
 * Deterministically connects recommendation categories to legitimate AgroMarket product workflows.
 * Enforces real routes, safe deep-link parameter passing, and contextual guidance copy.
 */

import { ActorRole, RecommendationType } from "@/features/decision-intelligence/types";
import {
  ActionContextPayload,
  ActionIntent,
  ActionResolvedRoute,
  DestinationType,
} from "./types";
import {
  assertNoProhibitedProduce,
  assertSafeDeepLinkParameters,
  isValidActionRoute,
} from "./validation";

export interface ResolveActionOptions {
  recommendationType: RecommendationType;
  actorRole: ActorRole;
  context: ActionContextPayload;
}

/**
 * Resolves deterministic action intent, target destination, and copy for a recommendation
 */
export function resolveRecommendationAction(options: ResolveActionOptions): ActionResolvedRoute {
  const { recommendationType, actorRole, context } = options;

  // Zero-tolerance validation on any incoming context
  assertNoProhibitedProduce(context, "Resolving recommendation action");

  let intent: ActionIntent;
  let destinationType: DestinationType;
  let baseRoute: string;
  let buttonLabel: string;
  let guidanceText: string;
  let requiresRevalidation = false;
  let bannerText = "";

  const commodity = context.commodity || "agricultural produce";
  const region = context.state ? ` in ${context.state}` : "";

  switch (recommendationType) {
    case "REVIEW_SUPPLY_GAP":
      if (actorRole === "FARMER") {
        intent = "CREATE_LISTING";
        destinationType = "MARKETPLACE";
        baseRoute = "/farmer/listings/new";
        buttonLabel = "Create Farm Listing";
        guidanceText = `A supply gap exists for ${commodity}${region}. Consider listing ready inventory to meet active demand.`;
        bannerText = `You're creating a listing because AgroMarket intelligence identified an active regional supply gap for ${commodity}.`;
      } else {
        intent = "VIEW_SUPPLY_OPTIONS";
        destinationType = "MARKETPLACE";
        baseRoute = "/marketplace";
        buttonLabel = "View Available Supply";
        guidanceText = `Review verified active supply for ${commodity}${region} to fulfill sourcing deficits.`;
        bannerText = `You're viewing available supply because AgroMarket intelligence identified a supply gap for ${commodity}.`;
        requiresRevalidation = true;
      }
      break;

    case "DIVERSIFY_SUPPLIERS":
      intent = "VIEW_ALTERNATIVE_SUPPLIERS";
      destinationType = "PROCUREMENT_INTELLIGENCE";
      baseRoute = "/procurement-intelligence";
      buttonLabel = "Review Alternative Suppliers";
      guidanceText = `Supplier concentration is elevated. Review diversified producer networks and procurement tenders.`;
      bannerText = `You're reviewing suppliers because intelligence detected elevated supplier concentration for ${commodity}.`;
      break;

    case "REVIEW_ALTERNATIVE_REGION":
      intent = "VIEW_SUPPLY_OPTIONS";
      destinationType = "SUPPLY_INTELLIGENCE";
      baseRoute = "/supply-intelligence";
      buttonLabel = "Explore Regional Supply";
      guidanceText = `Explore alternative agricultural clusters and trading hubs with available volume for ${commodity}.`;
      bannerText = `You're exploring regional supply because alternative production hubs were identified for ${commodity}.`;
      break;

    case "REVIEW_PROCESSING_CAPACITY":
      intent = "VIEW_SUPPLY_OPTIONS";
      destinationType = "SUPPLY_INTELLIGENCE";
      baseRoute = "/supply-intelligence";
      buttonLabel = "Review Processing Supply";
      guidanceText = `Assess industrial processing demand and commodity throughput requirements for ${commodity}.`;
      bannerText = `You're reviewing processing capacity alignment for ${commodity}.`;
      break;

    case "REVIEW_LOGISTICS_OPTIONS":
      intent = "VIEW_LOGISTICS_OPTIONS";
      destinationType = "LOGISTICS";
      baseRoute = "/logistics-intelligence";
      buttonLabel = "Review Logistics Options";
      guidanceText = `Freight rate pressure or corridor delay detected. Evaluate carrier capacity and transit corridors.`;
      bannerText = `You're reviewing logistics options because transit pressure was identified on this agricultural corridor.`;
      break;

    case "REVIEW_PRODUCTION_OPPORTUNITY":
      intent = "VIEW_PRODUCTION_INTELLIGENCE";
      destinationType = "PRODUCTION_INTELLIGENCE";
      baseRoute = "/production-intelligence";
      buttonLabel = "Explore Production Outlook";
      guidanceText = `Favorable seasonal window or yield opportunity detected for ${commodity}${region}.`;
      bannerText = `You're reviewing production intelligence for planting and harvest planning on ${commodity}.`;
      break;

    case "REVIEW_MARKET_OPPORTUNITY":
      intent = "VIEW_MARKET_INTELLIGENCE";
      destinationType = "MARKET_INTELLIGENCE";
      baseRoute = "/market-intelligence";
      buttonLabel = "View Market Opportunities";
      guidanceText = `Wholesale price disparity or premium buyer demand detected for ${commodity}.`;
      bannerText = `You're reviewing market prices because price anomalies were detected for ${commodity}.`;
      break;

    case "REVIEW_DEMAND_SIGNAL":
      intent = "VIEW_DEMAND_INTELLIGENCE";
      destinationType = "DEMAND_INTELLIGENCE";
      baseRoute = "/demand-intelligence";
      buttonLabel = "View Demand Signals";
      guidanceText = `Institutional or wholesale buyer demand trends are surging for ${commodity}.`;
      bannerText = `You're viewing demand signals because strong buyer interest was identified for ${commodity}.`;
      break;

    case "REVIEW_BIOSECURITY_INFORMATION":
      intent = "VIEW_DISEASE_INTELLIGENCE";
      destinationType = "DISEASE_BIOSECURITY";
      baseRoute = "/disease-intelligence";
      buttonLabel = "Review Biosecurity Guidance";
      guidanceText = `Pest or disease vector advisory active in your zone. Review prevention protocols and verified health guidance.`;
      bannerText = `You're reviewing biosecurity alerts because disease risk indicators were detected in this region.`;
      break;

    case "REVIEW_FOOD_SECURITY_RISK":
      intent = "VIEW_FOOD_SECURITY";
      destinationType = "FOOD_SECURITY";
      baseRoute = "/food-security";
      buttonLabel = "Review Food Security Outlook";
      guidanceText = `Regional staple commodity stress detected. Review community resilience and strategic reserves.`;
      bannerText = `You're viewing food security intelligence because regional staple supply vulnerability was flagged.`;
      break;

    case "SEEK_EXPERT_GUIDANCE":
      intent = "SEEK_EXPERT";
      destinationType = "KNOWLEDGE";
      baseRoute = "/learn/expert-advice";
      buttonLabel = "Seek Expert Guidance";
      guidanceText = `Complex agronomic or market condition. Consult verified agricultural extension agents and specialists.`;
      bannerText = `You're viewing expert advice because specialized agricultural guidance was recommended.`;
      break;

    case "REVIEW_EQUIPMENT_OPTIONS":
      intent = "REQUEST_EQUIPMENT";
      destinationType = "EQUIPMENT";
      baseRoute = "/equipment";
      buttonLabel = "Browse Equipment";
      guidanceText = `Mechanization window open. Browse verified tractors, harvesters, and processing equipment rentals.`;
      bannerText = `You're browsing equipment rentals because mechanization opportunities were identified.`;
      requiresRevalidation = true;
      break;

    case "REVIEW_AGGREGATION_OPPORTUNITY":
      intent = "VIEW_AGGREGATION_OPTIONS";
      destinationType = "SHARED_PURCHASE";
      baseRoute = "/shared-purchases";
      buttonLabel = "Explore Aggregation Pools";
      guidanceText = `Pooled buyer demand or farmer cooperative aggregation can reduce unit logistics and procurement costs.`;
      bannerText = `You're exploring shared purchases because volume aggregation was recommended for ${commodity}.`;
      requiresRevalidation = true;
      break;

    case "INVESTIGATE":
      intent = "REVIEW_RECOMMENDATION";
      destinationType = "MY_INTELLIGENCE";
      baseRoute = "/my-intelligence";
      buttonLabel = "Investigate Signals";
      guidanceText = `Multi-agent anomaly requires thorough review of contributing indicators.`;
      bannerText = `You're reviewing this intelligence investigation because cross-domain anomalies require inspection.`;
      break;

    case "MONITOR":
    case "NO_ACTION_RECOMMENDED":
    case "INSUFFICIENT_DATA":
    default:
      intent = "CONTINUE_MONITORING";
      destinationType = "MY_INTELLIGENCE";
      baseRoute = "/my-intelligence";
      buttonLabel = "Continue Monitoring";
      guidanceText = `No immediate commercial intervention required. Maintain observation as new market signals arrive.`;
      bannerText = `You're monitoring this signal because no immediate action is currently required.`;
      break;
  }

  // Construct safe deep-link URL with sanitized query parameters
  const deepLinkUrl = buildSafeDeepLink(baseRoute, {
    commodity: context.commodity,
    state: context.state,
    intel_ref: context.recommendationId,
    dec_ref: context.decisionId,
  });

  return {
    intent,
    destinationType,
    url: deepLinkUrl,
    buttonLabel,
    guidanceText,
    requiresRevalidation,
    contextBannerText: bannerText,
  };
}

/**
 * Constructs a deep-link URL preserving non-sensitive context while stripping private data
 */
export function buildSafeDeepLink(
  baseRoute: string,
  params: {
    commodity?: string | null;
    state?: string | null;
    intel_ref?: string | null;
    dec_ref?: string | null;
  }
): string {
  // Validate route
  if (!isValidActionRoute(baseRoute)) {
    return "/my-intelligence";
  }

  const queryParams = new URLSearchParams();

  if (params.commodity && params.commodity.trim()) {
    const cleanComm = params.commodity.trim().toLowerCase();
    assertNoProhibitedProduce(cleanComm, "Deep link commodity");
    queryParams.set("commodity", cleanComm);
  }

  if (params.state && params.state.trim()) {
    queryParams.set("state", params.state.trim());
  }

  if (params.intel_ref) {
    queryParams.set("intel_ref", params.intel_ref);
  }

  if (params.dec_ref) {
    queryParams.set("dec_ref", params.dec_ref);
  }

  // Double check privacy guardrails
  const paramRecord: Record<string, string> = {};
  queryParams.forEach((v, k) => {
    paramRecord[k] = v;
  });
  assertSafeDeepLinkParameters(paramRecord);

  const queryString = queryParams.toString();
  return queryString ? `${baseRoute}?${queryString}` : baseRoute;
}
