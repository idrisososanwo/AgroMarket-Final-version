/**
 * AgroMarket Phase 3.8: Governance Constants, Defaults, Policy Versions, and Disclaimers
 */

import { CanonicalGovernanceAgent } from "./types";

export const CURRENT_GOVERNANCE_POLICY_VERSION = "v1.0.0";

export const DEFAULT_APPROVAL_TTL_HOURS = 24;
export const CRITICAL_APPROVAL_TTL_HOURS = 6;
export const MAX_APPROVAL_TTL_HOURS = 72;

export const MIN_REQUIRED_EVIDENCE_FOR_HIGH_RISK = 2;
export const MIN_CONFIDENCE_THRESHOLD = 0.35;

/**
 * Normalizes canonical agent identifiers and handles orchestrator aliases cleanly.
 */
export const AGENT_ALIAS_MAP: Record<string, CanonicalGovernanceAgent> = {
  AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR: "AGRICULTURAL_ORCHESTRATION_AGENT",
  AGRICULTURAL_ORCHESTRATION_AGENT: "AGRICULTURAL_ORCHESTRATION_AGENT",
  MARKET_INTELLIGENCE_AGENT: "MARKET_INTELLIGENCE_AGENT",
  PRODUCTION_PLANNING_AGENT: "PRODUCTION_PLANNING_AGENT",
  DEMAND_FORECASTING_AGENT: "DEMAND_FORECASTING_AGENT",
  SUPPLY_MATCHING_AGENT: "SUPPLY_MATCHING_AGENT",
  PROCUREMENT_INTELLIGENCE_AGENT: "PROCUREMENT_INTELLIGENCE_AGENT",
  FOOD_SECURITY_RESILIENCE_AGENT: "FOOD_SECURITY_RESILIENCE_AGENT",
  LOGISTICS_INTELLIGENCE_AGENT: "LOGISTICS_INTELLIGENCE_AGENT",
  AGRICULTURAL_DISEASE_BIOSECURITY_AGENT: "AGRICULTURAL_DISEASE_BIOSECURITY_AGENT",
};

export const GOVERNANCE_DISCLAIMERS = {
  ADVISORY_ONLY:
    "AgroMarket intelligence is strictly advisory and intended solely for human decision support. AgroMarket does not autonomously execute purchases, sales, financial disbursements, or physical logistics operations.",
  BIOSECURITY:
    "Agricultural disease alerts represent observational risk screening. They do not constitute a definitive veterinary or phytosanitary diagnosis, and cannot order culling, farm quarantine, or chemical treatments without qualified professional/authority review.",
  LOGISTICS_CORRIDOR:
    "Logistics intelligence reports observed transit friction and advisory corridor patterns. It does not provide tactical evasion routing or guarantee road security. Physical transportation decisions remain the sole operational responsibility of third-party logistics operators.",
  FOOD_SECURITY:
    "Food security assessments model regional supply resilience and pressure indicators. Platform models cannot declare statutory food security emergencies without designated human coordinator and public authority authorization.",
  FINANCIAL:
    "AgroMarket intelligence cannot initiate, commit, settle, or refund funds autonomously. All financial commitments require human review and server-authoritative payment execution via authorized providers.",
  ASSET_LIGHT:
    "AgroMarket coordinates ecosystem actors and does not own or operate farms, processing plants, cold chains, warehouses, or transport fleets.",
} as const;
