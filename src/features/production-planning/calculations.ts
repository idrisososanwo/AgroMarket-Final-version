/**
 * AgroMarket Phase 2.4: Deterministic Production Planning Calculations
 *
 * Implements pure mathematical & domain evaluations for:
 * 1. Agricultural Domain Classification (Crops, Livestock, Poultry, Aquaculture).
 * 2. Seasonal Planting/Harvest Alignment based on verifiable Nigerian calendars.
 * 3. Deterministic Production Opportunity Scoring (0-100).
 * 4. Deterministic Production Risk Scoring (0-100).
 * 5. Downstream & Input Constraint Analysis.
 *
 * CRITICAL SAFETY RULES:
 * - Anti-pork enforcement across all commodity evaluations.
 * - No yield or profit fabrication. Returns INSUFFICIENT_DATA when evidence is sparse.
 * - Calibrated non-speculative language ("Potential production opportunity", not "guaranteed profit").
 * - Non-diagnostic disease boundary.
 */

import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { NIGERIAN_SEASONAL_PATTERNS } from "@/features/intelligence/engine";
import { MarketIntelligenceSnapshot } from "@/features/market-intelligence/types";
import {
  ProductionDomain,
  OpportunityLevel,
  ProductionRiskLevel,
  SeasonalAlignment,
  ProductionOpportunityScore,
  ProductionRiskScore,
  ProductionConstraintsSummary,
  ProductionContextSummary,
} from "./types";

/**
 * Classifies an agricultural commodity into its primary production domain
 */
export function inferProductionDomain(commodity: string): ProductionDomain {
  assertNoProhibitedProduce(commodity, "Commodity");
  const lower = commodity.toLowerCase();

  if (
    lower.includes("chicken") ||
    lower.includes("broiler") ||
    lower.includes("layer") ||
    lower.includes("poultry") ||
    lower.includes("turkey") ||
    lower.includes("egg")
  ) {
    return "POULTRY";
  }

  if (
    lower.includes("cattle") ||
    lower.includes("beef") ||
    lower.includes("cow") ||
    lower.includes("goat") ||
    lower.includes("sheep") ||
    lower.includes("ram") ||
    lower.includes("dairy")
  ) {
    return "LIVESTOCK";
  }

  if (
    lower.includes("catfish") ||
    lower.includes("tilapia") ||
    lower.includes("fish") ||
    lower.includes("aquaculture") ||
    lower.includes("fingerling")
  ) {
    return "AQUACULTURE";
  }

  return "CROPS";
}

/**
 * Evaluates empirical seasonal alignment based on the Nigerian agricultural calendar
 */
export function evaluateSeasonalAlignment(
  commodity: string,
  targetDate: Date = new Date()
): { alignment: SeasonalAlignment; rationale: string } {
  assertNoProhibitedProduce(commodity, "Commodity");

  // Lookup in canonical seasonal patterns
  const match = Object.entries(NIGERIAN_SEASONAL_PATTERNS).find(([k]) =>
    commodity.toLowerCase().includes(k.toLowerCase())
  );

  if (!match) {
    return {
      alignment: "INSUFFICIENT_DATA",
      rationale:
        "No verified Nigerian seasonal calendar record mapped for this commodity. Off-cycle or continuous irrigation production must be confirmed locally.",
    };
  }

  const currentMonth = targetDate.getMonth(); // 0 to 11
  const { peakMonths, rationale } = match[1];

  if (peakMonths.includes(currentMonth)) {
    return {
      alignment: "PEAK_WINDOW",
      rationale: `Current month falls within peak seasonal window. ${rationale}`,
    };
  }

  // Check adjacent months (month before or after)
  const isAdjacent = peakMonths.some(
    (m) => Math.abs(m - currentMonth) === 1 || Math.abs(m - currentMonth) === 11
  );

  if (isAdjacent) {
    return {
      alignment: "ACTIVE_SEASON",
      rationale: `Active seasonal shoulder period. ${rationale}`,
    };
  }

  return {
    alignment: "OFF_SEASON",
    rationale: `Currently outside primary historical peak aggregation months. ${rationale}`,
  };
}

/**
 * Calculates Deterministic Production Opportunity Score (0 - 100)
 *
 * Formula:
 * Opportunity = 0.30 * DemandFactor + 0.25 * PriceFactor + 0.20 * ShortageFactor + 0.15 * SeasonalFit + 0.10 * InfrastructureSupport
 */
export function calculateProductionOpportunityScore(params: {
  commodity: string;
  state: string;
  domain: ProductionDomain;
  marketSnapshot?: MarketIntelligenceSnapshot;
  seasonalAlignment: SeasonalAlignment;
  productionContext: ProductionContextSummary;
  constraints: ProductionConstraintsSummary;
}): ProductionOpportunityScore {
  assertNoProhibitedProduce(params.commodity, "Commodity");
  const drivers: string[] = [];

  // A. Market Demand Factor (0 - 100, weight: 30%)
  let marketDemandFactor = 40.0;
  if (params.marketSnapshot) {
    const dStatus = params.marketSnapshot.demandAnalysis.status;
    if (dStatus === "SURGING") {
      marketDemandFactor = 95.0;
      drivers.push("Surging wholesale and B2B offtake demand in market");
    } else if (dStatus === "ELEVATED") {
      marketDemandFactor = 75.0;
      drivers.push("Firm and rising buyer orders above baseline");
    } else if (dStatus === "NORMAL") {
      marketDemandFactor = 50.0;
    } else if (dStatus === "DECLINING") {
      marketDemandFactor = 20.0;
    }
  }

  // B. Price Incentive Factor (0 - 100, weight: 25%)
  let priceIncentiveFactor = 40.0;
  if (params.marketSnapshot) {
    const pTrend = params.marketSnapshot.priceTrend.percentageChange30d;
    if (pTrend !== null && pTrend !== undefined) {
      if (pTrend >= 20) {
        priceIncentiveFactor = 90.0;
        drivers.push(`Wholesale prices increased by +${pTrend}% over 30 days`);
      } else if (pTrend >= 8) {
        priceIncentiveFactor = 70.0;
        drivers.push(`Positive price appreciation (+${pTrend}%)`);
      } else if (pTrend <= -10) {
        priceIncentiveFactor = 15.0;
      }
    }
  }

  // C. Supply Shortage Factor (0 - 100, weight: 20%)
  let supplyShortageFactor = 35.0;
  if (params.marketSnapshot) {
    const sStatus = params.marketSnapshot.supplyAnalysis.status;
    if (sStatus === "SHORTAGE") {
      supplyShortageFactor = 90.0;
      drivers.push("Observed regional supply deficit across aggregation points");
    } else if (sStatus === "BALANCED") {
      supplyShortageFactor = 45.0;
    } else if (sStatus === "SURPLUS") {
      supplyShortageFactor = 15.0;
    }
  }

  // D. Seasonal Fit Factor (0 - 100, weight: 15%)
  let seasonalFitFactor = 50.0;
  if (params.seasonalAlignment === "PEAK_WINDOW") {
    seasonalFitFactor = 95.0;
    drivers.push("Optimal agro-ecological seasonal harvest/production cycle");
  } else if (params.seasonalAlignment === "ACTIVE_SEASON") {
    seasonalFitFactor = 75.0;
    drivers.push("Favorable seasonal production shoulder window");
  } else if (params.seasonalAlignment === "OFF_SEASON") {
    seasonalFitFactor = 25.0;
  }

  // E. Infrastructure Support Factor (0 - 100, weight: 10%)
  let infrastructureSupportFactor = 40.0;
  if (
    params.constraints.processingConstraintLevel === "NONE" &&
    params.constraints.inputConstraintLevel === "NONE"
  ) {
    infrastructureSupportFactor = 85.0;
    drivers.push("Adequate downstream processing access and input availability");
  } else if (params.constraints.processingConstraintLevel === "BOTTLENECK") {
    infrastructureSupportFactor = 20.0;
  }

  const rawScore =
    0.30 * marketDemandFactor +
    0.25 * priceIncentiveFactor +
    0.20 * supplyShortageFactor +
    0.15 * seasonalFitFactor +
    0.10 * infrastructureSupportFactor;

  const opportunityScore = Number(Math.max(0, Math.min(100, rawScore)).toFixed(1));

  let opportunityLevel: OpportunityLevel = "LOW";
  if (opportunityScore >= 80) opportunityLevel = "HIGH_OPPORTUNITY";
  else if (opportunityScore >= 60) opportunityLevel = "ATTRACTIVE";
  else if (opportunityScore >= 40) opportunityLevel = "MODERATE";
  else opportunityLevel = "LOW";

  // Calibrated notice (NEVER claim guaranteed yield or profit)
  const calibratedNotice =
    opportunityScore >= 60
      ? `Observed evidence indicates favorable market conditions and supply deficit for ${params.commodity} in ${params.state}. Production expansion or harvest aggregation may warrant review, subject to input costs and local production constraints.`
      : `Market observations indicate standard or constrained production incentive for ${params.commodity} in ${params.state}. Producers are advised to maintain balanced pacing and verify localized offtake contracts before committing additional capital.`;

  const confidence = params.marketSnapshot ? params.marketSnapshot.marketPressure.confidence : 0.4;

  return {
    commodity: params.commodity,
    state: params.state,
    domain: params.domain,
    opportunityScore,
    opportunityLevel,
    marketDemandFactor: Number(marketDemandFactor.toFixed(1)),
    priceIncentiveFactor: Number(priceIncentiveFactor.toFixed(1)),
    supplyShortageFactor: Number(supplyShortageFactor.toFixed(1)),
    seasonalFitFactor: Number(seasonalFitFactor.toFixed(1)),
    infrastructureSupportFactor: Number(infrastructureSupportFactor.toFixed(1)),
    confidence,
    drivers: Array.from(new Set(drivers)),
    calibratedNotice,
  };
}

/**
 * Calculates Deterministic Production Risk Score (0 - 100)
 *
 * Formula:
 * Risk = 0.25 * InputConstraints + 0.25 * DownstreamBottlenecks + 0.20 * Disruptions + 0.15 * MarketSoftness + 0.15 * DiseaseAdvisory
 */
export function calculateProductionRiskScore(params: {
  commodity: string;
  state: string;
  domain: ProductionDomain;
  marketSnapshot?: MarketIntelligenceSnapshot;
  constraints: ProductionConstraintsSummary;
}): ProductionRiskScore {
  assertNoProhibitedProduce(params.commodity, "Commodity");
  const riskDrivers: string[] = [];
  const mitigations: string[] = [];

  // A. Input Constraint Factor (0 - 100, weight: 25%)
  let inputConstraintFactor = 20.0;
  if (params.constraints.inputConstraintLevel === "SEVERE") {
    inputConstraintFactor = 90.0;
    riskDrivers.push("Critical shortages of primary inputs (feed, seed, or specialized equipment)");
    mitigations.push("Secure input commitments or shared rental reservations prior to cycle launch");
  } else if (params.constraints.inputConstraintLevel === "MODERATE") {
    inputConstraintFactor = 55.0;
    riskDrivers.push("Moderate input cost inflation or delivery delays reported");
  }

  // B. Downstream Bottleneck Factor (0 - 100, weight: 25%)
  let downstreamBottleneckFactor = 20.0;
  if (params.constraints.processingConstraintLevel === "BOTTLENECK") {
    downstreamBottleneckFactor = 85.0;
    riskDrivers.push("Downstream processing facility capacity queues exceeding standard turnaround");
    mitigations.push("Negotiate forward offtake or cold-chain holding arrangements to mitigate spoilage");
  } else if (params.constraints.processingConstraintLevel === "MODERATE") {
    downstreamBottleneckFactor = 45.0;
  }

  // C. Disruption Factor (0 - 100, weight: 20%)
  let disruptionFactor = 15.0;
  if (params.constraints.securityIncidentsCount > 0) {
    disruptionFactor = Math.min(100, 40 + params.constraints.securityIncidentsCount * 25);
    riskDrivers.push("Security incidents reported along key regional agricultural transit corridors");
    mitigations.push("Consult authoritative local security notices and explore alternative feeder corridors");
  }
  if (params.constraints.logisticsDelayEventsCount > 0) {
    disruptionFactor = Math.max(disruptionFactor, 50.0);
    riskDrivers.push("Haulage transit delay incidents reported in the corridor");
  }

  // D. Market Softness Factor (0 - 100, weight: 15%)
  let marketSoftnessFactor = 20.0;
  if (params.marketSnapshot) {
    if (params.marketSnapshot.demandAnalysis.status === "DECLINING") {
      marketSoftnessFactor = 75.0;
      riskDrivers.push("Softened buyer inquiry and demand contraction observed in terminal markets");
      mitigations.push("Avoid uncontracted speculative volume expansion");
    } else if (params.marketSnapshot.supplyAnalysis.status === "SURPLUS") {
      marketSoftnessFactor = 65.0;
      riskDrivers.push("Excess market supply resulting in farm gate price discounting");
    }
  }

  // E. Disease Advisory Factor (0 - 100, weight: 15%)
  let diseaseAdvisoryFactor = 10.0;
  if (params.constraints.diseaseSignalsCount > 0) {
    diseaseAdvisoryFactor = 75.0;
    riskDrivers.push(
      "Verified agricultural disease-risk advisory active in state or neighboring corridor"
    );
    mitigations.push(
      "Reinforce biosecurity protocols and consult certified veterinary/agronomy professionals (non-diagnostic advisory)"
    );
  }

  const rawRisk =
    0.25 * inputConstraintFactor +
    0.25 * downstreamBottleneckFactor +
    0.20 * disruptionFactor +
    0.15 * marketSoftnessFactor +
    0.15 * diseaseAdvisoryFactor;

  const riskScore = Number(Math.max(0, Math.min(100, rawRisk)).toFixed(1));

  let riskLevel: ProductionRiskLevel = "LOW";
  if (riskScore >= 75) riskLevel = "HIGH_RISK";
  else if (riskScore >= 50) riskLevel = "ELEVATED";
  else if (riskScore >= 30) riskLevel = "MODERATE";
  else riskLevel = "LOW";

  const confidence = params.marketSnapshot ? params.marketSnapshot.marketPressure.confidence : 0.5;

  return {
    commodity: params.commodity,
    state: params.state,
    domain: params.domain,
    riskScore,
    riskLevel,
    inputConstraintFactor: Number(inputConstraintFactor.toFixed(1)),
    downstreamBottleneckFactor: Number(downstreamBottleneckFactor.toFixed(1)),
    disruptionFactor: Number(disruptionFactor.toFixed(1)),
    marketSoftnessFactor: Number(marketSoftnessFactor.toFixed(1)),
    diseaseAdvisoryFactor: Number(diseaseAdvisoryFactor.toFixed(1)),
    confidence,
    riskDrivers: Array.from(new Set(riskDrivers)),
    mitigations: Array.from(new Set(mitigations)),
  };
}
