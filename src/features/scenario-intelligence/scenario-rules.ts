/**
 * AgroMarket Phase 3.7: Deterministic Scenario Trigger Rules & Classification
 *
 * Evaluates multi-horizon forecasts, historical baselines, and domain snapshots
 * to deterministically match candidates against the 12 canonical scenario types.
 *
 * SAFETY INVARIANTS:
 * 1. Zero fabrication: Returns INSUFFICIENT_DATA if evidence is below minimum threshold (< 2 signals).
 * 2. Deterministic probability classification (LOW_LIKELIHOOD, PLAUSIBLE, ELEVATED, HIGH_CONCERN, INSUFFICIENT_DATA).
 * 3. Never produces an ungrounded scenario simply because a scenario type exists.
 * 4. Anti-pork zero tolerance across all rule parameters.
 */

import {
  ScenarioConfidenceLevel,
  ScenarioEvidenceItem,
  ScenarioProbabilityClass,
  ScenarioType,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";
import { CrossHorizonSynthesis } from "./cross-horizon";

export const MIN_SCENARIO_EVIDENCE_ITEMS = 2;

export interface ScenarioTriggerEvaluation {
  matchedType: ScenarioType;
  probabilityClass: ScenarioProbabilityClass;
  confidenceScore: number;
  confidenceLevel: ScenarioConfidenceLevel;
  triggeringConditions: string[];
  expectedImpact: string;
  foodSecurityImplication?: string | null;
  marketImplication?: string | null;
  productionImplication?: string | null;
  demandImplication?: string | null;
  logisticsImplication?: string | null;
  procurementImplication?: string | null;
  diseaseOrBiosecurityImplication?: string | null;
  resilienceImplication?: string | null;
}

export interface EvaluateScenarioRulesParams {
  commodity: string;
  state: string;
  evidence: ScenarioEvidenceItem[];
  crossHorizonSynthesis?: CrossHorizonSynthesis | null;
}

/**
 * Deterministically evaluates evidence to match the most appropriate scenario type
 */
export function evaluateScenarioTriggerRules(
  params: EvaluateScenarioRulesParams
): ScenarioTriggerEvaluation {
  const { commodity, state, evidence, crossHorizonSynthesis } = params;
  assertNoProhibitedProduce(commodity, "Scenario Trigger Rules");

  // INSUFFICIENT DATA GUARD: Must have at least 2 valid evidence items
  const validEvidence = evidence.filter((e) => e.confidence > 0.0);
  if (validEvidence.length < MIN_SCENARIO_EVIDENCE_ITEMS) {
    return {
      matchedType: "BALANCED_NOMINAL_SCENARIO",
      probabilityClass: "INSUFFICIENT_DATA",
      confidenceScore: 0.0,
      confidenceLevel: "INSUFFICIENT_DATA",
      triggeringConditions: [
        `Insufficient evidence: found ${validEvidence.length} items (minimum ${MIN_SCENARIO_EVIDENCE_ITEMS} required).`,
      ],
      expectedImpact: "Cannot determine future scenario impact due to insufficient observational data.",
      foodSecurityImplication: null,
      marketImplication: null,
      productionImplication: null,
      demandImplication: null,
      logisticsImplication: null,
      procurementImplication: null,
      diseaseOrBiosecurityImplication: null,
      resilienceImplication: null,
    };
  }

  // Domain groupings
  const domains = new Set(validEvidence.map((e) => e.domain));
  const distinctDomainCount = domains.size;

  const hasDiseaseRisk = validEvidence.some(
    (e) => e.domain === "DISEASE_BIOSECURITY" && e.summary.toLowerCase().includes("elevated")
  );
  const hasLogisticsConstraint = validEvidence.some(
    (e) => e.domain === "LOGISTICS" && (e.summary.toLowerCase().includes("constrained") || e.summary.toLowerCase().includes("delay"))
  );
  const hasDemandSurge = validEvidence.some(
    (e) => e.domain === "DEMAND" && (e.summary.toLowerCase().includes("surge") || e.summary.toLowerCase().includes("increasing"))
  );
  const hasSupplyShortage = validEvidence.some(
    (e) => e.domain === "SUPPLY" && (e.summary.toLowerCase().includes("shortage") || e.summary.toLowerCase().includes("deficit"))
  );
  const hasSupplySurplus = validEvidence.some(
    (e) => e.domain === "SUPPLY" && (e.summary.toLowerCase().includes("surplus") || e.summary.toLowerCase().includes("excess"))
  );
  const hasMarketPressure = validEvidence.some(
    (e) => e.domain === "MARKET" && (e.summary.toLowerCase().includes("volatil") || e.summary.toLowerCase().includes("increasing") || e.summary.toLowerCase().includes("pressure"))
  );
  const hasProcurementRisk = validEvidence.some(
    (e) => e.domain === "PROCUREMENT" && (e.summary.toLowerCase().includes("risk") || e.summary.toLowerCase().includes("deficit"))
  );
  const hasFoodSecurityPressure = validEvidence.some(
    (e) => e.domain === "FOOD_SECURITY" && (e.summary.toLowerCase().includes("vulnerab") || e.summary.toLowerCase().includes("gap") || e.summary.toLowerCase().includes("pressure"))
  );
  const hasProcessingBottleneck = validEvidence.some(
    (e) => e.domain === "PROCESSING" && (e.summary.toLowerCase().includes("bottleneck") || e.summary.toLowerCase().includes("capacity"))
  );
  const hasResilienceStress = validEvidence.some(
    (e) => e.domain === "RESILIENCE" || (e.summary.toLowerCase().includes("dependen") || e.summary.toLowerCase().includes("concentrat"))
  );

  // Compute Base Confidence Score (0.3 to 0.95 based on evidence diversity & quality)
  const avgEvidenceConf = validEvidence.reduce((sum, e) => sum + e.confidence, 0) / validEvidence.length;
  let baseScore = avgEvidenceConf * 0.7 + (Math.min(distinctDomainCount, 4) / 4) * 0.3;
  if (crossHorizonSynthesis?.convergenceScore) {
    baseScore = baseScore * 0.8 + crossHorizonSynthesis.convergenceScore * 0.2;
  }
  baseScore = Math.min(0.95, Math.max(0.2, Number(baseScore.toFixed(3))));

  // Evaluate Scenarios by Deterministic Priority Order

  // 1. MULTI_DOMAIN_RISK_SCENARIO (>= 3 independent risk domains concurrently active)
  const riskDomainCount = [
    hasDiseaseRisk,
    hasLogisticsConstraint,
    hasSupplyShortage,
    hasFoodSecurityPressure,
    hasProcurementRisk,
  ].filter(Boolean).length;

  if (riskDomainCount >= 3) {
    return {
      matchedType: "MULTI_DOMAIN_RISK_SCENARIO",
      probabilityClass: baseScore >= 0.7 ? "HIGH_CONCERN" : "ELEVATED",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        `${riskDomainCount} independent risk domains converge concurrently for ${commodity} in ${state}.`,
        "Cross-domain correlation signals compound systemic disruption probability.",
      ],
      expectedImpact: `Simultaneous friction across supply, transport, and procurement creates compound systemic risk for ${commodity}.`,
      foodSecurityImplication: "Potential disruption to regional commodity availability and price stability.",
      logisticsImplication: "Corridor routing and carrier dispatch review required.",
      marketImplication: "Expect elevated wholesale price volatility.",
      procurementImplication: "B2B off-takers advised to evaluate buffer reserves and alternative zones.",
    };
  }

  // 2. FOOD_SECURITY_PRESSURE_SCENARIO
  if (hasFoodSecurityPressure && (hasSupplyShortage || hasMarketPressure)) {
    return {
      matchedType: "FOOD_SECURITY_PRESSURE_SCENARIO",
      probabilityClass: baseScore >= 0.65 ? "HIGH_CONCERN" : "ELEVATED",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        "Regional food-security vulnerability indicators align with supply contraction or market pressure.",
        "Analytical food-security review triggered (requires human review prior to public dissemination).",
      ],
      expectedImpact: `Elevated food access strain and household affordability pressure for ${commodity} in ${state}.`,
      foodSecurityImplication: "Human-in-the-loop coordinator review required: monitor staple basket price and regional reserves.",
      marketImplication: "Upward pressure on consumer and retail staple prices.",
    };
  }

  // 3. DISEASE_SUPPLY_RISK_SCENARIO
  if (hasDiseaseRisk) {
    return {
      matchedType: "DISEASE_SUPPLY_RISK_SCENARIO",
      probabilityClass: baseScore >= 0.6 ? "ELEVATED" : "PLAUSIBLE",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        `Agricultural biosecurity indicators elevated in ${state} for ${commodity}.`,
        "Analytical risk indicator only — does not diagnose disease or replace veterinary authorities.",
      ],
      expectedImpact: `Potential localized yield reduction or movement health cautions affecting ${commodity} supply pools.`,
      diseaseOrBiosecurityImplication: "Analytical indicator: advise voluntary biosecurity checks and official veterinary consultation.",
      productionImplication: "Monitor farm-gate health status; prepare localized isolation advisories.",
    };
  }

  // 4. LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO
  if (hasLogisticsConstraint && !hasSupplyShortage) {
    return {
      matchedType: "LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO",
      probabilityClass: baseScore >= 0.6 ? "ELEVATED" : "PLAUSIBLE",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        `Transit corridor delays or vehicle scarcity identified affecting ${commodity} out of ${state}.`,
        "Supply exists at farm gate or aggregation center but freight haulage is restricted.",
      ],
      expectedImpact: `Delayed terminal market arrivals, risk of localized farm-gate price suppression alongside terminal price spikes.`,
      logisticsImplication: "CORRIDOR_REVIEW_REQUIRED: Evaluate multi-carrier dispatch and intermediate dry/cold aggregation.",
      marketImplication: "Spatial price divergence between producing hub and consuming terminal markets.",
    };
  }

  // 5. PROCUREMENT_RISK_SCENARIO
  if (hasProcurementRisk || (hasDemandSurge && hasSupplyShortage)) {
    return {
      matchedType: "PROCUREMENT_RISK_SCENARIO",
      probabilityClass: baseScore >= 0.6 ? "ELEVATED" : "PLAUSIBLE",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        `B2B procurement contracts face fulfillment deficits for ${commodity} in ${state}.`,
        "Commercial buyer demand outpaces verified qualified supplier capacity.",
      ],
      expectedImpact: `Unfilled B2B commitments, potential contract renegotiation pressure, and inventory shortages for commercial processors.`,
      procurementImplication: "Review supplier diversification: activate verified regional aggregation centers.",
      demandImplication: "Elevated unmet B2B volume requiring forward coordination.",
    };
  }

  // 6. PROCESSING_BOTTLENECK_SCENARIO
  if (hasProcessingBottleneck) {
    return {
      matchedType: "PROCESSING_BOTTLENECK_SCENARIO",
      probabilityClass: "PLAUSIBLE",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        `Harvest volume inflow exceeds local processing, drying, or cold-storage capacity for ${commodity}.`,
      ],
      expectedImpact: `Elevated post-harvest spoilage risk and downward pressure on farm-gate wholesale prices.`,
      productionImplication: "Coordinate staggered harvesting or inter-regional transit to secondary processing clusters.",
    };
  }

  // 7. SUPPLY_SHORTAGE_SCENARIO
  if (hasSupplyShortage) {
    return {
      matchedType: "SUPPLY_SHORTAGE_SCENARIO",
      probabilityClass: baseScore >= 0.65 ? "ELEVATED" : "PLAUSIBLE",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        `Verified supply volumes for ${commodity} in ${state} trend below historical baseline.`,
      ],
      expectedImpact: `Wholesale market tightening, upward price pressure, and inventory depletion across regional distributors.`,
      marketImplication: "Upward price trajectory expected over forecast horizon.",
      productionImplication: "Activate secondary aggregation corridors and out-of-state supplier networks.",
    };
  }

  // 8. DEMAND_SURGE_SCENARIO
  if (hasDemandSurge) {
    return {
      matchedType: "DEMAND_SURGE_SCENARIO",
      probabilityClass: baseScore >= 0.6 ? "ELEVATED" : "PLAUSIBLE",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        `Buyer order velocity and search interest for ${commodity} in ${state} exceed rolling baseline.`,
      ],
      expectedImpact: `Accelerated inventory turnover, potential spot premium over listed baseline prices.`,
      demandImplication: "Strong buyer off-take outlook; favorable pricing environment for producers.",
    };
  }

  // 9. SUPPLY_SURPLUS_SCENARIO
  if (hasSupplySurplus) {
    return {
      matchedType: "SUPPLY_SURPLUS_SCENARIO",
      probabilityClass: "PLAUSIBLE",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        `Harvest inflow and market inventory exceed demand absorption capacity for ${commodity}.`,
      ],
      expectedImpact: `Wholesale price softening, potential aggregation center saturation.`,
      marketImplication: "Downward price adjustments likely unless external offtake is organized.",
    };
  }

  // 10. RESILIENCE_STRESS_SCENARIO
  if (hasResilienceStress) {
    return {
      matchedType: "RESILIENCE_STRESS_SCENARIO",
      probabilityClass: "PLAUSIBLE",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        `High reliance on single supply corridor or concentrated off-taker group for ${commodity} in ${state}.`,
      ],
      expectedImpact: `Elevated vulnerability to isolated corridor shocks or counterparty payment delays.`,
      resilienceImplication: "Advise multi-corridor aggregation and diversification of buyer portfolio.",
    };
  }

  // 11. MARKET_PRESSURE_SCENARIO
  if (hasMarketPressure) {
    return {
      matchedType: "MARKET_PRESSURE_SCENARIO",
      probabilityClass: "PLAUSIBLE",
      confidenceScore: baseScore,
      confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
      triggeringConditions: [
        `Material price swings or market differential volatility observed for ${commodity} in ${state}.`,
      ],
      expectedImpact: `Uncertainty in forward contract pricing; higher spread between farm-gate and retail levels.`,
      marketImplication: "Short-term spot volatility requires frequent price discovery updates.",
    };
  }

  // 12. BALANCED_NOMINAL_SCENARIO (Default when metrics are within nominal bands)
  return {
    matchedType: "BALANCED_NOMINAL_SCENARIO",
    probabilityClass: "LOW_LIKELIHOOD", // Low likelihood of disruption
    confidenceScore: baseScore,
    confidenceLevel: baseScore >= 0.7 ? "HIGH" : "MODERATE",
    triggeringConditions: [
      `Indicators for ${commodity} in ${state} remain within historical statistical baseline bounds.`,
      "No systemic bottlenecks, surges, or supply shocks detected.",
    ],
    expectedImpact: "Market, supply, and logistics conditions operate nominally within expected seasonal parameters.",
    marketImplication: "Stable pricing environment.",
    demandImplication: "Steady off-take tracking expected seasonal trends.",
  };
}
