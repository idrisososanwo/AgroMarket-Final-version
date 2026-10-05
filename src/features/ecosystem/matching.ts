/**
 * AgroMarket Phase 2.0: Supply / Demand Matching Foundation
 *
 * Deterministic service layer coordinating:
 * DEMAND <-> AVAILABLE SUPPLY <-> PROCESSING CAPACITY <-> LOGISTICS CAPABILITY
 *
 * Designed to provide transparent matching scores and actionable explanations
 * without relying on probabilistic black-box models.
 */

import {
  B2BDemand,
  MatchingCandidateSupply,
  MatchingCandidateFacility,
  MatchingCandidateLogistics,
  ValueChainMatchResult,
} from "./types";

// Nigerian Geopolitical Corridors for Deterministic Proximity Scoring
const REGIONAL_CORRIDORS: Record<string, string[]> = {
  SOUTH_WEST: ["Lagos", "Ogun", "Oyo", "Osun", "Ondo", "Ekiti"],
  SOUTH_SOUTH: ["Rivers", "Delta", "Akwa Ibom", "Bayelsa", "Cross River", "Edo"],
  SOUTH_EAST: ["Anambra", "Enugu", "Imo", "Abia", "Ebonyi"],
  NORTH_CENTRAL: ["Benue", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau", "FCT - Abuja"],
  NORTH_WEST: ["Kaduna", "Kano", "Katsina", "Kebbi", "Jigawa", "Sokoto", "Zamfara"],
  NORTH_EAST: ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
};

export function areStatesInSameCorridor(stateA: string, stateB: string): boolean {
  if (stateA.toLowerCase() === stateB.toLowerCase()) return true;
  for (const corridor of Object.values(REGIONAL_CORRIDORS)) {
    const hasA = corridor.some((s) => s.toLowerCase() === stateA.toLowerCase());
    const hasB = corridor.some((s) => s.toLowerCase() === stateB.toLowerCase());
    if (hasA && hasB) return true;
  }
  return false;
}

export function computeProximityTier(
  originState: string,
  destinationState: string
): "SAME_STATE" | "REGIONAL_CORRIDOR" | "NATIONAL" {
  if (originState.toLowerCase() === destinationState.toLowerCase()) {
    return "SAME_STATE";
  }
  if (areStatesInSameCorridor(originState, destinationState)) {
    return "REGIONAL_CORRIDOR";
  }
  return "NATIONAL";
}

/**
 * Match a B2B Demand against available candidate supplies, processing facilities,
 * and vetted third-party logistics providers.
 */
export function matchSupplyDemand(
  demand: B2BDemand,
  candidateSupplies: MatchingCandidateSupply[],
  candidateFacilities: MatchingCandidateFacility[],
  candidateLogistics: MatchingCandidateLogistics[]
): ValueChainMatchResult {
  const normCommodity = demand.commodityOrProduct.toLowerCase().trim();

  // 1. Match Supply
  const scoredSupplies = candidateSupplies
    .filter((supply) => {
      const supplyComm = supply.commodity.toLowerCase().trim();
      return supplyComm.includes(normCommodity) || normCommodity.includes(supplyComm);
    })
    .map((supply) => {
      let score = 0;
      const proximity = computeProximityTier(supply.state, demand.state);

      // Location proximity score (max 40 pts)
      if (proximity === "SAME_STATE") score += 40;
      else if (proximity === "REGIONAL_CORRIDOR") score += 25;
      else score += 10;

      // Quantity sufficiency ratio (max 40 pts)
      const ratio = Math.min(supply.availableQuantity / demand.quantity, 1.5);
      if (ratio >= 1.0) score += 40;
      else score += Math.round(ratio * 40);

      // Ready date timeliness (max 20 pts)
      const demandDate = new Date(demand.desiredDeliveryDate).getTime();
      const supplyDate = new Date(supply.readyDate).getTime();
      if (!isNaN(demandDate) && !isNaN(supplyDate)) {
        if (supplyDate <= demandDate) score += 20;
        else score += 5;
      } else {
        score += 10;
      }

      return {
        supply,
        score: Math.min(score, 100),
        corridorProximity: proximity,
        quantitySufficiencyRatio: Number((supply.availableQuantity / demand.quantity).toFixed(2)),
      };
    })
    .sort((a, b) => b.score - a.score);

  // 2. Match Processing Facilities
  const scoredFacilities = candidateFacilities
    .filter((facility) => {
      return facility.supportedCommodities.some(
        (c) => c.toLowerCase().includes(normCommodity) || normCommodity.includes(c.toLowerCase())
      );
    })
    .map((facility) => {
      let score = 50; // base score for supporting the commodity
      const proximity = computeProximityTier(facility.state, demand.state);
      if (proximity === "SAME_STATE") score += 35;
      else if (proximity === "REGIONAL_CORRIDOR") score += 20;
      else score += 5;

      if (facility.capacityValue && facility.capacityValue >= demand.quantity) {
        score += 15;
      }

      return {
        facility,
        score: Math.min(score, 100),
        supportsProcessing: true,
      };
    })
    .sort((a, b) => b.score - a.score);

  // 3. Match Logistics Capabilities
  const isPerishableOrLivestock = /chicken|poultry|beef|fish|dairy|milk|meat|egg/i.test(normCommodity);
  const scoredLogistics = candidateLogistics
    .filter((carrier) => {
      // Must cover destination state or origin state
      const coversDest = carrier.coverageStates.some(
        (st) => st.toLowerCase() === demand.state.toLowerCase()
      );
      return coversDest || carrier.coverageStates.length === 0;
    })
    .map((carrier) => {
      let score = 40;
      const coversDest = carrier.coverageStates.some(
        (st) => st.toLowerCase() === demand.state.toLowerCase()
      );
      if (coversDest) score += 30;

      if (isPerishableOrLivestock && carrier.hasRefrigeration) {
        score += 30;
      } else if (!isPerishableOrLivestock) {
        score += 20;
      }

      return {
        logistics: carrier,
        score: Math.min(score, 100),
        routeFeasibility: coversDest ? ("DIRECT" as const) : ("REGIONAL" as const),
      };
    })
    .sort((a, b) => b.score - a.score);

  // Total ecosystem coordination match score (weighted composite)
  const topSupplyScore = scoredSupplies[0]?.score ?? 0;
  const topFacilityScore = scoredFacilities[0]?.score ?? 0;
  const topLogisticsScore = scoredLogistics[0]?.score ?? 0;

  // When processing is needed vs raw
  const hasProcessingNeed = scoredFacilities.length > 0;
  let totalMatchScore = 0;
  if (hasProcessingNeed) {
    totalMatchScore = Math.round(
      topSupplyScore * 0.5 + topFacilityScore * 0.25 + topLogisticsScore * 0.25
    );
  } else {
    totalMatchScore = Math.round(topSupplyScore * 0.7 + topLogisticsScore * 0.3);
  }

  // Summary generation
  let matchSummary = `Coordinated matching evaluation for ${demand.commodityOrProduct} (${demand.quantity} ${demand.unit}) in ${demand.state}.`;
  if (scoredSupplies.length > 0) {
    matchSummary += ` Found ${scoredSupplies.length} supply source(s) with up to ${topSupplyScore}% alignment.`;
  } else {
    matchSummary += " No direct producer supply pools currently open for this commodity.";
  }

  if (scoredFacilities.length > 0) {
    matchSummary += ` ${scoredFacilities.length} specialized processor(s) identified.`;
  }

  if (scoredLogistics.length > 0) {
    matchSummary += ` ${scoredLogistics.length} certified third-party logistics carrier(s) available on this corridor.`;
  }

  return {
    demandId: demand.id,
    demandTitle: demand.title,
    commodity: demand.commodityOrProduct,
    requiredQuantity: demand.quantity,
    unit: demand.unit,
    demandState: demand.state,
    totalMatchScore,
    supplyMatches: scoredSupplies,
    processingFacilityMatches: scoredFacilities,
    logisticsMatches: scoredLogistics,
    matchSummary,
  };
}
