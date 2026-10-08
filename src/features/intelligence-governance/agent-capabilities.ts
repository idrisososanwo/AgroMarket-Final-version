/**
 * AgroMarket Phase 3.8: Agent Capability Registry
 * Enforces explicit capability scopes, risk ceilings, autonomy limits, and statutory constraints
 * across all 9 canonical agricultural intelligence agents.
 */

import {
  AgentCapabilityDefinition,
  CanonicalGovernanceAgent,
  CANONICAL_GOVERNANCE_AGENTS,
} from "./types";
import { AGENT_ALIAS_MAP } from "./constants";

export const AGENT_CAPABILITY_REGISTRY: Record<
  CanonicalGovernanceAgent,
  AgentCapabilityDefinition
> = {
  MARKET_INTELLIGENCE_AGENT: {
    agentId: "MARKET_INTELLIGENCE_AGENT",
    displayName: "Market Intelligence Agent",
    domain: "MARKET",
    capabilityScope: [
      "Wholesale and retail price observation tracking",
      "Spatial price spread analysis across Nigerian states and corridors",
      "Volatility modeling and seasonal price indices",
    ],
    allowedOutputs: [
      "Historical price trends and statistical summaries",
      "Observed spatial arbitrage spreads",
      "Seasonal price movement scenarios",
    ],
    forbiddenOutputs: [
      "Binding price fixing or mandated selling prices",
      "Guaranteed forward commercial returns",
      "Autonomous commodity sales or purchase execution",
    ],
    riskCeiling: "MODERATE",
    maxPermittedAutonomy: "RECOMMEND",
    requiredReviewLevel: "NO_REVIEW_REQUIRED",
    statutoryConstraints: [
      "Must not engage in anti-competitive price signaling",
      "Must not publish speculative market manipulation claims",
    ],
  },

  PRODUCTION_PLANNING_AGENT: {
    agentId: "PRODUCTION_PLANNING_AGENT",
    displayName: "Production Planning Agent",
    domain: "PRODUCTION",
    capabilityScope: [
      "Agro-ecological planting window modeling",
      "Harvest yield estimation across crop cycles",
      "Input requirement and crop rotation optimization",
    ],
    allowedOutputs: [
      "Advisory planting and harvesting dates",
      "Estimated yield ranges with uncertainty intervals",
      "Crop diversification suggestions",
    ],
    forbiddenOutputs: [
      "Compulsory production quotas for farmers",
      "Guaranteed crop harvest volumes",
      "Autonomous purchasing of seeds, fertilizers, or agrochemicals",
    ],
    riskCeiling: "HIGH",
    maxPermittedAutonomy: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "HUMAN_APPROVAL",
    statutoryConstraints: [
      "Must advise farmers to consult local state agricultural extension services",
      "Must respect land use rights and farmer sovereignty",
    ],
  },

  DEMAND_FORECASTING_AGENT: {
    agentId: "DEMAND_FORECASTING_AGENT",
    displayName: "Demand Forecasting Agent",
    domain: "DEMAND",
    capabilityScope: [
      "Urban consumption trend tracking",
      "B2B institutional buyer demand aggregation",
      "Multi-horizon demand volume projections",
    ],
    allowedOutputs: [
      "Projected consumption trends across commodities",
      "Aggregated commercial buyer demand signals",
      "Seasonal demand peak notifications",
    ],
    forbiddenOutputs: [
      "Binding institutional purchase commitments",
      "Automated procurement contract execution",
      "Autonomous debiting of buyer bank accounts or payment gateways",
    ],
    riskCeiling: "HIGH",
    maxPermittedAutonomy: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "HUMAN_APPROVAL",
    statutoryConstraints: [
      "Commercial privacy: Do not disclose confidential institutional contract terms",
    ],
  },

  SUPPLY_MATCHING_AGENT: {
    agentId: "SUPPLY_MATCHING_AGENT",
    displayName: "Supply Matching Agent",
    domain: "SUPPLY",
    capabilityScope: [
      "Smallholder farmer harvest aggregation modeling",
      "Buyer-seller proximity and quality compatibility scoring",
      "Regional supply deficit and surplus identification",
    ],
    allowedOutputs: [
      "Recommended aggregation hubs and pooling opportunities",
      "Supplier compatibility match recommendations",
      "Surplus harvest notification alerts",
    ],
    forbiddenOutputs: [
      "Forced pooling or compulsory cooperative aggregation",
      "Autonomous booking of farmer harvest without consent",
      "Creation of binding supply exclusivity obligations",
    ],
    riskCeiling: "HIGH",
    maxPermittedAutonomy: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "HUMAN_APPROVAL",
    statutoryConstraints: [
      "Farmer data privacy: Never expose raw farmer residential coordinates or phone numbers",
    ],
  },

  PROCUREMENT_INTELLIGENCE_AGENT: {
    agentId: "PROCUREMENT_INTELLIGENCE_AGENT",
    displayName: "Procurement Intelligence Agent",
    domain: "PROCUREMENT",
    capabilityScope: [
      "B2B bulk purchase cost modeling",
      "Supplier diversification risk analysis",
      "Shared purchase pool optimization for retail and SME buyers",
    ],
    allowedOutputs: [
      "Bulk purchasing cost comparison summaries",
      "Alternative verified supplier suggestions",
      "Shared purchase cluster formation recommendations",
    ],
    forbiddenOutputs: [
      "Autonomous fund disbursement or escrow transfer",
      "Creation of binding financial loans, BNPL, or credit commitments",
      "Execution of purchase orders without explicit human affirmative approval",
    ],
    riskCeiling: "HIGH",
    maxPermittedAutonomy: "REQUIRE_HUMAN_APPROVAL",
    requiredReviewLevel: "HUMAN_APPROVAL",
    statutoryConstraints: [
      "All financial commitments require compliance with Nigerian financial regulations",
    ],
  },

  FOOD_SECURITY_RESILIENCE_AGENT: {
    agentId: "FOOD_SECURITY_RESILIENCE_AGENT",
    displayName: "Food Security & Resilience Agent",
    domain: "FOOD_SECURITY",
    capabilityScope: [
      "Regional staple food availability modeling",
      "Market accessibility and caloric resilience tracking",
      "Supply vulnerability and early warning screening",
    ],
    allowedOutputs: [
      "Staple commodity vulnerability index scores",
      "Regional supply stress warnings",
      "Buffer stock allocation recommendations",
    ],
    forbiddenOutputs: [
      "Unilateral declaration of statutory food emergencies",
      "Autonomous publication of alarmist emergency public alerts",
      "Unilateral redirection of government strategic grain reserves",
    ],
    riskCeiling: "CRITICAL",
    maxPermittedAutonomy: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "PLATFORM_REVIEW",
    statutoryConstraints: [
      "Statutory emergency declarations remain the sole authority of the Federal/State Ministries of Agriculture",
    ],
  },

  LOGISTICS_INTELLIGENCE_AGENT: {
    agentId: "LOGISTICS_INTELLIGENCE_AGENT",
    displayName: "Logistics Intelligence Agent",
    domain: "LOGISTICS",
    capabilityScope: [
      "Agricultural transport corridor friction tracking",
      "Cold chain integrity and transit spoilage modeling",
      "Haulage capacity matching recommendations",
    ],
    allowedOutputs: [
      "Corridor transit delay and friction estimates",
      "Cold chain temperature risk alerts",
      "Carrier aggregation and return-trip coordination advice",
    ],
    forbiddenOutputs: [
      "Route physical security guarantees or '100% safe road' claims",
      "Tactical armed conflict evasion or border checkpoint avoidance routing",
      "Autonomous vehicle dispatch or third-party fleet rerouting",
    ],
    riskCeiling: "CRITICAL",
    maxPermittedAutonomy: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "AUTHORITY_REVIEW",
    statutoryConstraints: [
      "Physical transportation and road security are advisory only; logistics operators retain carrier liability",
    ],
  },

  AGRICULTURAL_DISEASE_BIOSECURITY_AGENT: {
    agentId: "AGRICULTURAL_DISEASE_BIOSECURITY_AGENT",
    displayName: "Disease & Biosecurity Intelligence Agent",
    domain: "DISEASE_BIOSECURITY",
    capabilityScope: [
      "Crop pest and livestock epidemiological observation tracking",
      "Regional disease spread risk modeling",
      "Biosecurity containment hygiene protocol distribution",
    ],
    allowedOutputs: [
      "Regional biosecurity risk screening advisories",
      "Pest and disease symptom observational reports",
      "Standard sanitary preventive measures and extension contacts",
    ],
    forbiddenOutputs: [
      "Definitive veterinary diagnosis or statutory disease outbreak declarations",
      "Prescription of regulated veterinary drugs, antibiotics, or synthetic chemicals",
      "Compulsory animal culling orders or farm quarantine mandates",
    ],
    riskCeiling: "CRITICAL",
    maxPermittedAutonomy: "REQUIRE_HUMAN_REVIEW",
    requiredReviewLevel: "PROFESSIONAL_REVIEW",
    statutoryConstraints: [
      "Official disease diagnosis and quarantine mandates require licensed veterinary / extension authorities under the Animal Disease (Control) Act",
    ],
  },

  AGRICULTURAL_ORCHESTRATION_AGENT: {
    agentId: "AGRICULTURAL_ORCHESTRATION_AGENT",
    displayName: "Agricultural Intelligence Orchestration Agent",
    domain: "ORCHESTRATION",
    capabilityScope: [
      "Cross-domain multi-horizon signal correlation",
      "Cross-agent conflict detection and net confidence adjustment",
      "Synthesized forward-looking action prioritization",
    ],
    allowedOutputs: [
      "Multi-domain orchestration snapshots",
      "Synthesized forward-planning recommendations",
      "Cross-agent conflict notifications",
    ],
    forbiddenOutputs: [
      "Autonomous ecosystem-wide market interventions",
      "Unilateral policy overrides or automated trade execution",
      "Bypassing human review for high or critical risk recommendations",
    ],
    riskCeiling: "CRITICAL",
    maxPermittedAutonomy: "REQUIRE_HUMAN_APPROVAL",
    requiredReviewLevel: "PLATFORM_REVIEW",
    statutoryConstraints: [
      "All cross-domain syntheses remain non-autonomous decision support for human operators",
    ],
  },
};

/**
 * Resolves an agent identifier to its canonical capability definition.
 * Normalizes aliases and fails closed (returns null) for unknown agents.
 */
export function getAgentCapability(agentId: string): AgentCapabilityDefinition | null {
  const canonicalId = AGENT_ALIAS_MAP[agentId] || (agentId as CanonicalGovernanceAgent);
  if (!CANONICAL_GOVERNANCE_AGENTS.includes(canonicalId)) {
    return null;
  }
  return AGENT_CAPABILITY_REGISTRY[canonicalId] || null;
}
