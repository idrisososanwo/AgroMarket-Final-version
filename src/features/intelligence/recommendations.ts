/**
 * AgroMarket Phase 2.1: Agricultural Recommendations & Human-in-the-Loop State Machine
 *
 * All recommendations are strictly ADVISORY.
 * The system NEVER executes autonomous financial transfers, livestock dispatch,
 * or veterinary assertions without human review.
 *
 * State Machine Flow:
 * PROPOSED -> REVIEWED -> APPROVED -> EXECUTED (or EXPIRED)
 * PROPOSED -> REJECTED
 */

import {
  IntelligenceRecommendation,
  IntelligenceSignal,
  RecommendationObjective,
  RecommendationStatus,
  ExpectedImpact,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";

export class InvalidStatusTransitionError extends Error {
  constructor(from: RecommendationStatus, to: string) {
    super(`Invalid recommendation state transition from ${from} to ${to}`);
    this.name = "InvalidStatusTransitionError";
  }
}

/**
 * Validates state transitions for human-in-the-loop oversight
 */
export function validateRecommendationTransition(
  currentStatus: RecommendationStatus,
  action: "REVIEW" | "APPROVE" | "REJECT" | "EXECUTE" | "EXPIRE"
): RecommendationStatus {
  switch (currentStatus) {
    case "PROPOSED":
      if (action === "REVIEW") return "REVIEWED";
      if (action === "APPROVE") return "APPROVED";
      if (action === "REJECT") return "REJECTED";
      if (action === "EXPIRE") return "EXPIRED";
      break;

    case "REVIEWED":
      if (action === "APPROVE") return "APPROVED";
      if (action === "REJECT") return "REJECTED";
      if (action === "EXPIRE") return "EXPIRED";
      break;

    case "APPROVED":
      if (action === "EXECUTE") return "EXECUTED";
      if (action === "EXPIRE") return "EXPIRED";
      break;

    case "REJECTED":
    case "EXECUTED":
    case "EXPIRED":
      // Terminal states
      throw new InvalidStatusTransitionError(currentStatus, action);
  }

  throw new InvalidStatusTransitionError(currentStatus, action);
}

/**
 * Deterministically constructs an advisory recommendation from a detected signal
 */
export function generateAdvisoryRecommendation(
  signal: IntelligenceSignal
): IntelligenceRecommendation {
  assertNoProhibitedProduce(signal.commodity, "Signal commodity");

  let objective: RecommendationObjective = "STABILIZE_SUPPLY";
  let title = "";
  let recommendation = "";
  let affectedActors: string[] = ["FARMER", "AGGREGATOR"];
  let expectedImpact: ExpectedImpact = {
    primaryMetric: "SUPPLY_FLOW",
    estimatedChange: "Balanced offtake",
    timeframeDays: 7,
    qualitativeSummary: "Aligns farm gate supply with regional demand centers.",
  };

  switch (signal.signalType) {
    case "SUPPLY_SHORTAGE":
    case "PRICE_INCREASE":
      objective = "DEMAND_FULFILLMENT";
      title = `Coordinate Emergency Offtake for ${signal.commodity} in ${signal.state}`;
      recommendation = `Observed supply deficit of ${signal.magnitude}% for ${signal.commodity}. Aggregators and farmers in neighboring production clusters are advised to pool available harvest batches to stabilize wholesale terminal prices.`;
      affectedActors = ["FARMER", "AGGREGATOR", "WHOLESALER"];
      expectedImpact = {
        primaryMetric: "PRICE_STABILITY",
        estimatedChange: "-5% to -10% price moderation",
        timeframeDays: 7,
        qualitativeSummary: "Relieves wholesale deficit and moderates terminal price inflation.",
      };
      break;

    case "SUPPLY_SURPLUS":
    case "PRICE_DECREASE":
      objective = "PREVENT_SPOILAGE";
      title = `Mobilize Cold Storage & Industrial Offtake for ${signal.commodity} in ${signal.state}`;
      recommendation = `Observed supply surplus of ${signal.magnitude}%. Producers and aggregators should route unallocated yields into cold storage facilities or negotiate industrial processing offtake to prevent distress selling.`;
      affectedActors = ["FARMER", "PROCESSOR", "COLD_CHAIN_PROVIDER"];
      expectedImpact = {
        primaryMetric: "POST_HARVEST_LOSS_PREVENTION",
        estimatedChange: "Reduce perishability spoilage by up to 25%",
        timeframeDays: 5,
        qualitativeSummary: "Absorbs excess farm gate yields into preserved processing batches.",
      };
      break;

    case "PROCESSING_BOTTLENECK":
      objective = "FACILITY_OFFTAKE";
      title = `Divert Processing Batches for ${signal.commodity} in ${signal.state}`;
      recommendation = `Local processing facilities report backlog capacity delays. Sourcing coordinators should divert queued ${signal.commodity} harvest pools to secondary verified abattoir or milling facilities in adjacent LGAs.`;
      affectedActors = ["AGGREGATOR", "PROCESSOR", "LOGISTICS_PROVIDER"];
      expectedImpact = {
        primaryMetric: "TURNAROUND_TIME",
        estimatedChange: "Restore processing throughput to <24h",
        timeframeDays: 3,
        qualitativeSummary: "Eliminates abattoir queue congestion.",
      };
      break;

    case "LOGISTICS_DISRUPTION":
      objective = "REROUTE_LOGISTICS";
      title = `Reroute Freight Transit along ${signal.corridor || signal.state} Corridor`;
      recommendation = `Transit exception rate reached ${signal.magnitude}%. Third-party logistics carriers transporting ${signal.commodity} are advised to use vetted bypass corridors and schedule daylight dispatches.`;
      affectedActors = ["LOGISTICS_PROVIDER", "AGGREGATOR"];
      expectedImpact = {
        primaryMetric: "ON_TIME_DELIVERY",
        estimatedChange: "Avoid corridor bottlenecks and reduce spoilage risk",
        timeframeDays: 4,
        qualitativeSummary: "Maintains delivery predictability across agricultural corridors.",
      };
      break;

    case "SECURITY_DISRUPTION":
      objective = "SECURITY_ADVISORY";
      title = `Security Advisory: Exercise Precaution around Agricultural Operations in ${signal.state}`;
      recommendation = `Verified agricultural security notice impacting ${signal.commodity} farm gates. Ecosystem participants are advised to coordinate consolidated convoy movements and defer non-essential late-hour transit.`;
      affectedActors = ["FARMER", "LOGISTICS_PROVIDER", "AGGREGATOR"];
      expectedImpact = {
        primaryMetric: "RISK_EXPOSURE",
        estimatedChange: "Minimize farm gate disruption exposure",
        timeframeDays: 5,
        qualitativeSummary: "Advisory risk mitigation for food security corridors.",
      };
      break;

    case "DISEASE_RISK":
      objective = "RISK_MITIGATION";
      title = `Biosecurity Advisory: Reported Disease Risk for ${signal.commodity} in ${signal.state}`;
      recommendation = `Reported agricultural disease risk affecting ${signal.commodity} in ${signal.state}. Farm managers are advised to tighten gate sanitation, isolate incoming livestock batches, and consult registered extension agents.`;
      affectedActors = ["FARMER", "VETERINARY_PROVIDER"];
      expectedImpact = {
        primaryMetric: "BIOSECURITY_COMPLIANCE",
        estimatedChange: "Containment of localized contagion spread",
        timeframeDays: 14,
        qualitativeSummary: "Proactive biosecurity containment.",
      };
      break;

    case "SEASONAL_DEMAND":
    case "DEMAND_INCREASE":
    default:
      objective = "OPTIMIZE_PRICING";
      title = `Prepare Advance Aggregation for ${signal.commodity} in ${signal.state}`;
      recommendation = `Seasonal and forward demand signals project high offtake velocity. Aggregation clusters are advised to contract farm batches 2 weeks in advance to meet commercial fulfillment windows.`;
      affectedActors = ["AGGREGATOR", "FARMER", "INSTITUTIONAL_BUYER"];
      expectedImpact = {
        primaryMetric: "ORDER_FULFILLMENT_RATE",
        estimatedChange: "+15% prompt fulfillment compliance",
        timeframeDays: 10,
        qualitativeSummary: "Secures contracted bulk volume ahead of terminal market surges.",
      };
      break;
  }

  return {
    id: `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    agentId: signal.agentId || "AGRICULTURAL_INTELLIGENCE",
    objective,
    title,
    recommendation,
    evidence: signal.evidence,
    confidence: signal.confidence,
    expectedImpact,
    affectedActors,
    affectedCommodities: [signal.commodity],
    affectedLocations: [signal.state],
    status: "PROPOSED",
    expiresAt: signal.expiresAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
