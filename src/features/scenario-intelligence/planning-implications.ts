/**
 * AgroMarket Phase 3.7: Forward Planning Implications Synthesizer
 * Formulates structured planning guidance across controlled action categories and planning horizons.
 *
 * SAFETY INVARIANTS:
 * 1. ADVISORY ONLY: Generates recommendations for HUMAN decision-makers. Never executes autonomous transactions.
 * 2. CONTROLLED ACTION CATEGORIES: MONITOR, VERIFY, DIVERSIFY, AGGREGATE, PROCURE, PROCESS, REDIRECT, PREPARE, ESCALATE_FOR_REVIEW, WAIT_AND_MONITOR, INSUFFICIENT_DATA.
 * 3. NO FINANCIAL FABRICATION: Never claims guaranteed profits, savings, or returns.
 * 4. MANDATORY SAFETY DISCLAIMERS:
 *    - Logistics: CORRIDOR_REVIEW_REQUIRED.
 *    - Biosecurity: Non-diagnostic indicator disclaimer.
 *    - Food Security: Mandatory human-in-the-loop review.
 *    - Asset-Light: Coordination only; does not own physical assets or fleets.
 */

import {
  ScenarioPlanningImplication,
  ScenarioType,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";

export interface GeneratePlanningImplicationsParams {
  scenarioType: ScenarioType;
  commodity: string;
  state: string;
  lga?: string | null;
  priorityScore?: number;
}

const BASE_ADVISORY_DISCLAIMER =
  "Advisory planning intelligence only. AgroMarket does not execute autonomous transactions, buy/sell commodities, or move goods. Requires human verification before operational commitment.";

const LOGISTICS_DISCLAIMER =
  "Advisory transit guidance. CORRIDOR_REVIEW_REQUIRED. AgroMarket does not operate vehicle fleets or guarantee route safety or travel times.";

const BIOSECURITY_DISCLAIMER =
  "Analytical health indicator only. Does not diagnose disease, prescribe chemicals, declare outbreaks, or replace registered veterinary/agronomic authorities.";

const FOOD_SECURITY_DISCLAIMER =
  "Analytical resilience assessment. Requires designated coordinator review prior to any external public communication or intervention.";

/**
 * Derives structured forward planning implications based on scenario classification
 */
export function generatePlanningImplications(
  params: GeneratePlanningImplicationsParams
): ScenarioPlanningImplication[] {
  const { scenarioType, commodity, state, lga } = params;
  assertNoProhibitedProduce(commodity, "Generate Planning Implications");

  const locationLabel = lga ? `${lga}, ${state}` : state;
  const implications: ScenarioPlanningImplication[] = [];

  switch (scenarioType) {
    case "DEMAND_SURGE_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "AGGREGATE",
        planningHorizon: "IMMEDIATE",
        title: `Consolidate Farm-Gate ${commodity} Volumes`,
        guidance: `Coordinate smallholder aggregation across ${locationLabel} to fulfill surging spot and wholesale off-taker demand at premium prices.`,
        targetRole: "AGGREGATOR",
        priority: "HIGH",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "PROCURE",
        planningHorizon: "NEAR_TERM",
        title: `Secure Forward Off-Take Contracts`,
        guidance: `Commercial buyers should review forward commitments with verified farmer clusters in ${locationLabel} before spot prices rise further.`,
        targetRole: "BUYER",
        priority: "MEDIUM",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      break;

    case "SUPPLY_SHORTAGE_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "DIVERSIFY",
        planningHorizon: "IMMEDIATE",
        title: `Activate Secondary Sourcing Corridors`,
        guidance: `Commercial procurement teams should explore secondary producing zones outside ${locationLabel} to cover projected supply shortfalls for ${commodity}.`,
        targetRole: "BUYER",
        priority: "HIGH",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "PREPARE",
        planningHorizon: "NEAR_TERM",
        title: `Inventory Preservation & Buffer Allocation`,
        guidance: `Processors and distributors holding ${commodity} stock should manage release schedules to mitigate local scarcity.`,
        targetRole: "PROCESSOR",
        priority: "MEDIUM",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      break;

    case "SUPPLY_SURPLUS_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "PROCESS",
        planningHorizon: "IMMEDIATE",
        title: `Mobilize Regional Processing & Drying Capacity`,
        guidance: `Producers in ${locationLabel} should engage local drying, milling, and preservation facilities to prevent post-harvest spoilage of surplus ${commodity}.`,
        targetRole: "FARMER",
        priority: "HIGH",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "REDIRECT",
        planningHorizon: "NEAR_TERM",
        title: `Explore Inter-State Terminal Markets`,
        guidance: `Identify consuming metropolitan centers with deficit balances for ${commodity} to absorb surplus volume.`,
        targetRole: "AGGREGATOR",
        priority: "MEDIUM",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      break;

    case "LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "REDIRECT",
        planningHorizon: "IMMEDIATE",
        title: `Review Alternative Transit Routes`,
        guidance: `Carriers and aggregators moving ${commodity} from ${locationLabel} must evaluate secondary highway corridors to bypass identified bottlenecks.`,
        targetRole: "LOGISTICS_OPERATOR",
        priority: "HIGH",
        advisoryDisclaimer: LOGISTICS_DISCLAIMER,
      });
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "PREPARE",
        planningHorizon: "NEAR_TERM",
        title: `Intermediate Hub Storage Staging`,
        guidance: `Staging shipments in intermediate regional consolidation warehouses avoids road stranding and cargo degradation.`,
        targetRole: "AGGREGATOR",
        priority: "MEDIUM",
        advisoryDisclaimer: LOGISTICS_DISCLAIMER,
      });
      break;

    case "PROCESSING_BOTTLENECK_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "PROCESS",
        planningHorizon: "IMMEDIATE",
        title: `Optimize Plant Utilization & Shift Scheduling`,
        guidance: `Processing facilities handling ${commodity} in ${locationLabel} should review maintenance windows and line throughput to absorb incoming deliveries.`,
        targetRole: "PROCESSOR",
        priority: "HIGH",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "VERIFY",
        planningHorizon: "NEAR_TERM",
        title: `Verify Inflow Delivery Staggering`,
        guidance: `Coordinate with supplying aggregators to pace arrival schedules and prevent dockside congestion.`,
        targetRole: "COORDINATOR",
        priority: "MEDIUM",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      break;

    case "DISEASE_SUPPLY_RISK_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "VERIFY",
        planningHorizon: "IMMEDIATE",
        title: `Request Veterinary / Extension Field Inspection`,
        guidance: `Advise registered veterinary and agronomic officers to verify health indicators for ${commodity} farms in ${locationLabel}.`,
        targetRole: "COORDINATOR",
        priority: "CRITICAL",
        advisoryDisclaimer: BIOSECURITY_DISCLAIMER,
      });
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "MONITOR",
        planningHorizon: "NEAR_TERM",
        title: `Heightened Transit & Farm-Gate Surveillance`,
        guidance: `Maintain voluntary biosecurity hygiene protocols at aggregation points; monitor adjacent LGA boundary movements.`,
        targetRole: "AGGREGATOR",
        priority: "HIGH",
        advisoryDisclaimer: BIOSECURITY_DISCLAIMER,
      });
      break;

    case "PROCUREMENT_RISK_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "DIVERSIFY",
        planningHorizon: "IMMEDIATE",
        title: `Broaden Qualified Supplier Base`,
        guidance: `B2B procurement teams must onboard additional certified cooperatives for ${commodity} to reduce single-source dependency in ${locationLabel}.`,
        targetRole: "BUYER",
        priority: "HIGH",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "PROCURE",
        planningHorizon: "NEAR_TERM",
        title: `Establish Staggered Multi-Tranche Deliveries`,
        guidance: `Structure purchase agreements into multi-phase tranches to accommodate localized supplier fulfillment limits.`,
        targetRole: "BUYER",
        priority: "MEDIUM",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      break;

    case "FOOD_SECURITY_PRESSURE_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "ESCALATE_FOR_REVIEW",
        planningHorizon: "IMMEDIATE",
        title: `Escalate to Agricultural Resilience Coordinator`,
        guidance: `Human coordinator review required: assess staple supply reserves and market access metrics for ${commodity} in ${locationLabel}.`,
        targetRole: "COORDINATOR",
        priority: "CRITICAL",
        advisoryDisclaimer: FOOD_SECURITY_DISCLAIMER,
      });
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "MONITOR",
        planningHorizon: "NEAR_TERM",
        title: `Daily Staple Price & Corridor Tracking`,
        guidance: `Track wholesale price volatility and transit availability to identify early stabilization opportunities.`,
        targetRole: "COORDINATOR",
        priority: "HIGH",
        advisoryDisclaimer: FOOD_SECURITY_DISCLAIMER,
      });
      break;

    case "RESILIENCE_STRESS_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "DIVERSIFY",
        planningHorizon: "NEAR_TERM",
        title: `Mitigate Single-Point Ecosystem Vulnerability`,
        guidance: `Ecosystem partners in ${locationLabel} should establish backup logistics routes, secondary off-take buyers, and multi-hub aggregation for ${commodity}.`,
        targetRole: "COORDINATOR",
        priority: "MEDIUM",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      break;

    case "MULTI_DOMAIN_RISK_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "ESCALATE_FOR_REVIEW",
        planningHorizon: "IMMEDIATE",
        title: `Cross-Domain Strategy Review`,
        guidance: `Convene cross-functional coordinator review: simultaneous friction across transport, supply, and biosecurity requires coordinated oversight.`,
        targetRole: "COORDINATOR",
        priority: "CRITICAL",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "PREPARE",
        planningHorizon: "NEAR_TERM",
        title: `Formulate Contingency Buffer Plans`,
        guidance: `Review secondary warehousing, multi-corridor transit, and emergency procurement arrangements across adjacent states.`,
        targetRole: "BUYER",
        priority: "HIGH",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      break;

    case "MARKET_PRESSURE_SCENARIO":
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "MONITOR",
        planningHorizon: "IMMEDIATE",
        title: `Frequent Wholesale Price Discovery`,
        guidance: `Market participants trading ${commodity} in ${locationLabel} should cross-check real-time spot benchmark prices before locking transactions.`,
        targetRole: "BUYER",
        priority: "MEDIUM",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      break;

    case "BALANCED_NOMINAL_SCENARIO":
    default:
      implications.push({
        id: crypto.randomUUID(),
        actionCategory: "WAIT_AND_MONITOR",
        planningHorizon: "IMMEDIATE",
        title: `Maintain Routine Surveillance`,
        guidance: `Market and production conditions for ${commodity} in ${locationLabel} are nominal within historical baselines. Continue standard operational workflows.`,
        targetRole: "FARMER",
        priority: "LOW",
        advisoryDisclaimer: BASE_ADVISORY_DISCLAIMER,
      });
      break;
  }

  return implications;
}
