/**
 * AgroMarket Phase 3.8: Action Classification & Governance Taxonomy
 * Classifies all action intents into deterministic risk levels, autonomy limits,
 * required approval hierarchies, and permitted actor roles.
 * Unknown actions or prohibited autonomous actions fail closed.
 */

import {
  ActionGovernanceClassification,
  PROHIBITED_AUTONOMOUS_ACTIONS,
} from "./types";
import { ACTOR_ROLES } from "@/features/decision-intelligence/types";

// -----------------------------------------------------------------------------
// 1. CANONICAL ACTION CLASSIFICATION REGISTRY
// -----------------------------------------------------------------------------

export const ACTION_CLASSIFICATION_REGISTRY: Record<
  string,
  ActionGovernanceClassification
> = {
  // Informational / Read-Only Intelligence Views (LOW Risk)
  VIEW_MARKETPLACE: {
    actionIntent: "VIEW_MARKETPLACE",
    domain: "MARKETPLACE",
    description: "Browse verified produce listings on the marketplace",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_SUPPLY_OPTIONS: {
    actionIntent: "VIEW_SUPPLY_OPTIONS",
    domain: "SUPPLY_INTELLIGENCE",
    description: "Inspect regional harvest supply aggregation opportunities",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: ["BUYER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_DEMAND_OPPORTUNITIES: {
    actionIntent: "VIEW_DEMAND_OPPORTUNITIES",
    domain: "DEMAND_INTELLIGENCE",
    description: "Inspect unmet market demand signals across urban centers",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: ["FARMER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_PROCUREMENT_OPTIONS: {
    actionIntent: "VIEW_PROCUREMENT_OPTIONS",
    domain: "PROCUREMENT_INTELLIGENCE",
    description: "Review potential procurement bulk purchase structures",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: ["BUYER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_ALTERNATIVE_SUPPLIERS: {
    actionIntent: "VIEW_ALTERNATIVE_SUPPLIERS",
    domain: "PROCUREMENT_INTELLIGENCE",
    description: "Inspect verified alternative suppliers across safe corridors",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: ["BUYER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_AGGREGATION_OPTIONS: {
    actionIntent: "VIEW_AGGREGATION_OPTIONS",
    domain: "SUPPLY_INTELLIGENCE",
    description: "Inspect local cooperative aggregation pools",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: ["FARMER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_LOGISTICS_OPTIONS: {
    actionIntent: "VIEW_LOGISTICS_OPTIONS",
    domain: "LOGISTICS",
    description: "Inspect third-party haulage and cold chain options",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_MARKET_INTELLIGENCE: {
    actionIntent: "VIEW_MARKET_INTELLIGENCE",
    domain: "MARKET_INTELLIGENCE",
    description: "View wholesale and retail commodity pricing benchmarks",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_PRODUCTION_INTELLIGENCE: {
    actionIntent: "VIEW_PRODUCTION_INTELLIGENCE",
    domain: "PRODUCTION_INTELLIGENCE",
    description: "View crop calendar, planting window, and yield estimates",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: ["FARMER", "EXPERT", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_DEMAND_INTELLIGENCE: {
    actionIntent: "VIEW_DEMAND_INTELLIGENCE",
    domain: "DEMAND_INTELLIGENCE",
    description: "View institutional and commercial demand forecasts",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_SUPPLY_INTELLIGENCE: {
    actionIntent: "VIEW_SUPPLY_INTELLIGENCE",
    domain: "SUPPLY_INTELLIGENCE",
    description: "View regional supply availability projections",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_PROCUREMENT_INTELLIGENCE: {
    actionIntent: "VIEW_PROCUREMENT_INTELLIGENCE",
    domain: "PROCUREMENT_INTELLIGENCE",
    description: "View procurement optimization insights",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: ["BUYER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_FOOD_SECURITY: {
    actionIntent: "VIEW_FOOD_SECURITY",
    domain: "FOOD_SECURITY",
    description: "View staple food vulnerability and availability indices",
    defaultRiskLevel: "MODERATE",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_DISEASE_INTELLIGENCE: {
    actionIntent: "VIEW_DISEASE_INTELLIGENCE",
    domain: "DISEASE_BIOSECURITY",
    description: "View observational pest and disease surveillance summaries",
    defaultRiskLevel: "MODERATE",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_AGRICULTURAL_SECURITY: {
    actionIntent: "VIEW_AGRICULTURAL_SECURITY",
    domain: "SECURITY",
    description: "View observational transport corridor friction alerts",
    defaultRiskLevel: "MODERATE",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_EXPERT_ADVICE: {
    actionIntent: "VIEW_EXPERT_ADVICE",
    domain: "KNOWLEDGE",
    description: "Read extension articles and verified agronomic guides",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  SEEK_EXPERT: {
    actionIntent: "SEEK_EXPERT",
    domain: "KNOWLEDGE",
    description: "Request consultation with verified extension or veterinary expert",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VIEW_FOOD_HEALTH: {
    actionIntent: "VIEW_FOOD_HEALTH",
    domain: "FOOD_HEALTH",
    description: "View nutritional information and food storage guidelines",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  REVIEW_RECOMMENDATION: {
    actionIntent: "REVIEW_RECOMMENDATION",
    domain: "MY_INTELLIGENCE",
    description: "Inspect full recommendation evidence and context",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  CONTINUE_MONITORING: {
    actionIntent: "CONTINUE_MONITORING",
    domain: "MY_INTELLIGENCE",
    description: "Acknowledge recommendation and defer action while monitoring",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  INSUFFICIENT_DATA: {
    actionIntent: "INSUFFICIENT_DATA",
    domain: "MY_INTELLIGENCE",
    description: "Signal that observation data is inadequate for recommendation",
    defaultRiskLevel: "LOW",
    autonomyLevel: "ANALYZE_ONLY",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },

  // Forward Planning Actions (Phase 3.7)
  MONITOR: {
    actionIntent: "MONITOR",
    domain: "MY_INTELLIGENCE",
    description: "Ongoing observational monitoring of price or supply trends",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  VERIFY: {
    actionIntent: "VERIFY",
    domain: "KNOWLEDGE",
    description: "Field verification of crop condition or supply availability",
    defaultRiskLevel: "MODERATE",
    autonomyLevel: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  DIVERSIFY: {
    actionIntent: "DIVERSIFY",
    domain: "PROCUREMENT_INTELLIGENCE",
    description: "Supplier or production diversification planning",
    defaultRiskLevel: "MODERATE",
    autonomyLevel: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "HUMAN_APPROVAL",
    permittedActorRoles: ["BUYER", "BUSINESS", "FARMER"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },
  AGGREGATE: {
    actionIntent: "AGGREGATE",
    domain: "SUPPLY_INTELLIGENCE",
    description: "Organize farmer harvest aggregation at designated regional hub",
    defaultRiskLevel: "HIGH",
    autonomyLevel: "REQUIRE_HUMAN_APPROVAL",
    requiredReviewLevel: "HUMAN_APPROVAL",
    permittedActorRoles: ["FARMER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },
  PROCURE: {
    actionIntent: "PROCURE",
    domain: "PROCUREMENT_INTELLIGENCE",
    description: "Commercial procurement batch initiation",
    defaultRiskLevel: "HIGH",
    autonomyLevel: "REQUIRE_HUMAN_APPROVAL",
    requiredReviewLevel: "HUMAN_APPROVAL",
    permittedActorRoles: ["BUYER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },
  PROCESS: {
    actionIntent: "PROCESS",
    domain: "PRODUCTION_INTELLIGENCE",
    description: "Value-add food processing scheduling and capacity booking",
    defaultRiskLevel: "HIGH",
    autonomyLevel: "REQUIRE_HUMAN_APPROVAL",
    requiredReviewLevel: "HUMAN_APPROVAL",
    permittedActorRoles: ["BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },
  REDIRECT: {
    actionIntent: "REDIRECT",
    domain: "LOGISTICS",
    description: "Human-directed route or corridor logistics adjustment",
    defaultRiskLevel: "HIGH",
    autonomyLevel: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "AUTHORITY_REVIEW",
    permittedActorRoles: ["BUSINESS", "SERVICE_PROVIDER", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },
  PREPARE: {
    actionIntent: "PREPARE",
    domain: "PRODUCTION_INTELLIGENCE",
    description: "Farm seasonal preparation and land cultivation planning",
    defaultRiskLevel: "MODERATE",
    autonomyLevel: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "HUMAN_APPROVAL",
    permittedActorRoles: ["FARMER", "BUSINESS"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  ESCALATE_FOR_REVIEW: {
    actionIntent: "ESCALATE_FOR_REVIEW",
    domain: "MY_INTELLIGENCE",
    description: "Escalate complex multi-domain disruption to human coordinator",
    defaultRiskLevel: "HIGH",
    autonomyLevel: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "PLATFORM_REVIEW",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },
  WAIT_AND_MONITOR: {
    actionIntent: "WAIT_AND_MONITOR",
    domain: "MY_INTELLIGENCE",
    description: "Wait for secondary signal confirmation before committing resources",
    defaultRiskLevel: "LOW",
    autonomyLevel: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: false,
  },

  // Consequential Operational Action Intents (HIGH Risk - Require Human Action/Approval)
  CREATE_B2B_DEMAND: {
    actionIntent: "CREATE_B2B_DEMAND",
    domain: "DEMAND_INTELLIGENCE",
    description: "Publish commercial procurement demand requirement",
    defaultRiskLevel: "HIGH",
    autonomyLevel: "REQUIRE_HUMAN_APPROVAL",
    requiredReviewLevel: "HUMAN_APPROVAL",
    permittedActorRoles: ["BUYER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },
  CREATE_LISTING: {
    actionIntent: "CREATE_LISTING",
    domain: "MARKETPLACE",
    description: "Create produce marketplace listing with pricing and quantity",
    defaultRiskLevel: "HIGH",
    autonomyLevel: "REQUIRE_HUMAN_APPROVAL",
    requiredReviewLevel: "HUMAN_APPROVAL",
    permittedActorRoles: ["FARMER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },
  JOIN_SHARED_PURCHASE: {
    actionIntent: "JOIN_SHARED_PURCHASE",
    domain: "SHARED_PURCHASE",
    description: "Join collective group purchase pool with financial commitment",
    defaultRiskLevel: "HIGH",
    autonomyLevel: "REQUIRE_HUMAN_APPROVAL",
    requiredReviewLevel: "HUMAN_APPROVAL",
    permittedActorRoles: ["BUYER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },
  REQUEST_EQUIPMENT: {
    actionIntent: "REQUEST_EQUIPMENT",
    domain: "EQUIPMENT",
    description: "Submit tractor or processing equipment rental booking request",
    defaultRiskLevel: "HIGH",
    autonomyLevel: "REQUIRE_HUMAN_APPROVAL",
    requiredReviewLevel: "HUMAN_APPROVAL",
    permittedActorRoles: ["FARMER", "BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },
  REQUEST_SERVICE: {
    actionIntent: "REQUEST_SERVICE",
    domain: "SERVICES",
    description: "Request agricultural service or expert extension engagement",
    defaultRiskLevel: "HIGH",
    autonomyLevel: "REQUIRE_HUMAN_APPROVAL",
    requiredReviewLevel: "HUMAN_APPROVAL",
    permittedActorRoles: [...ACTOR_ROLES],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },

  // Disease & Biosecurity Execution Action Intent (CRITICAL Risk)
  DISEASE_REVIEW: {
    actionIntent: "DISEASE_REVIEW",
    domain: "DISEASE_BIOSECURITY",
    description: "Review disease risk alert with qualified veterinary/extension expert",
    defaultRiskLevel: "CRITICAL",
    autonomyLevel: "REQUIRE_AUTHORITY_APPROVAL",
    requiredReviewLevel: "PROFESSIONAL_REVIEW",
    permittedActorRoles: ["FARMER", "EXPERT", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },

  // Security & Corridor Review Action Intent (CRITICAL Risk)
  SECURITY_REVIEW: {
    actionIntent: "SECURITY_REVIEW",
    domain: "SECURITY",
    description: "Review corridor security situation with relevant authority context",
    defaultRiskLevel: "CRITICAL",
    autonomyLevel: "REQUIRE_AUTHORITY_APPROVAL",
    requiredReviewLevel: "AUTHORITY_REVIEW",
    permittedActorRoles: ["BUSINESS", "SERVICE_PROVIDER", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },

  // Food Security Emergency Review Action Intent (CRITICAL Risk)
  FOOD_SECURITY_REVIEW: {
    actionIntent: "FOOD_SECURITY_REVIEW",
    domain: "FOOD_SECURITY",
    description: "Review staple food shortage risk with designated platform coordinator",
    defaultRiskLevel: "CRITICAL",
    autonomyLevel: "REQUIRE_AUTHORITY_APPROVAL",
    requiredReviewLevel: "PLATFORM_REVIEW",
    permittedActorRoles: ["BUSINESS", "ADMIN"],
    isProhibitedAutonomousAction: false,
    requiresAffirmativeApproval: true,
  },
};

/**
 * Checks whether an action intent matches any item on the explicit prohibited autonomous actions denylist.
 */
export function isProhibitedAction(actionIntent: string): boolean {
  const normalized = actionIntent.trim().toUpperCase();
  if (
    (PROHIBITED_AUTONOMOUS_ACTIONS as readonly string[]).includes(normalized)
  ) {
    return true;
  }

  // Regex pattern matching on prohibited autonomous actions
  const prohibitedPattern =
    /\b(AUTONOMOUS_PURCHASE|AUTONOMOUS_SELL|TRANSFER_MONEY|RELEASE_SETTLEMENT|ISSUE_REFUND|QUARANTINE_FARM|ORDER_CULLING|PRESCRIBE_TREATMENT|PRESCRIBE_CHEMICALS|DECLARE_OUTBREAK|DECLARE_EMERGENCY|GUARANTEE_ROUTE_SAFETY|DISPATCH_VEHICLE|AUTONOMOUS_REROUTE|ISSUE_HALAL|ISSUE_FOOD_SAFETY)\b/i;

  return prohibitedPattern.test(normalized);
}

/**
 * Resolves an action intent to its governance classification.
 * Unknown action intents fail closed and return null.
 */
export function getActionClassification(
  actionIntent: string
): ActionGovernanceClassification | null {
  if (isProhibitedAction(actionIntent)) {
    return {
      actionIntent,
      domain: "DENIED",
      description: "Explicitly prohibited autonomous action",
      defaultRiskLevel: "CRITICAL",
      autonomyLevel: "PROHIBITED",
      requiredReviewLevel: "AUTHORITY_REVIEW",
      permittedActorRoles: [],
      isProhibitedAutonomousAction: true,
      requiresAffirmativeApproval: true,
    };
  }

  return ACTION_CLASSIFICATION_REGISTRY[actionIntent] || null;
}
