/**
 * AgroMarket Phase 2.6: Supply Matching Deterministic Calculation Engine
 *
 * Implements transparent, explainable value-chain matching:
 * 1. Commodity compatibility (exact, synonyms, strict anti-pork rejection)
 * 2. Quantity compatibility & unit normalization
 * 3. Nigerian corridor proximity scoring (LGA -> State -> Corridor -> National)
 * 4. Availability & delivery window alignment
 * 5. Specification, quality grade, and MOQ compatibility
 * 6. Processing facility detection & capacity checks
 * 7. Multi-source greedy aggregation & supply gap analysis
 * 8. Logistics capability & security disruption constraint detection
 * 9. Deterministic 0-100 bounded scoring formula
 */

import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import { areStatesInSameCorridor } from "@/features/ecosystem/matching";
import { normalizeSupplyToDemandUnit } from "./units";
import {
  SupplyObservationRecord,
  DemandOfftakeTarget,
  ProcessingFacilityCandidate,
  LogisticsRouteCandidate,
  EvaluatedCandidateSupply,
  SupplyMatchResult,
  SupplyGapAnalysis,
  MultiSourceAggregationSummary,
  ProcessingRequirementSummary,
  MatchClassification,
  CoordinationType,
  ProximityTier,
} from "./types";

// Commodity Synonyms Table for Nigerian Agriculture
const COMMODITY_SYNONYMS: Record<string, string[]> = {
  maize: ["corn", "yellow maize", "white maize", "maize grain"],
  corn: ["maize", "yellow maize", "white maize", "maize grain"],
  cassava: ["cassava tubers", "raw cassava", "cassava root", "garri", "fufu"],
  "cassava tubers": ["cassava", "raw cassava", "cassava root"],
  yam: ["white yam", "yellow yam", "yam tubers", "raw yam"],
  rice: ["paddy rice", "milled rice", "brown rice", "parboiled rice"],
  sorghum: ["guinea corn", "sorghum grain"],
  millet: ["pearl millet", "finger millet"],
  soybean: ["soya beans", "soya", "soybeans"],
  soya: ["soybean", "soya beans", "soybeans"],
  cowpea: ["beans", "brown beans", "white beans", "iron beans", "honey beans"],
  beans: ["cowpea", "brown beans", "white beans", "iron beans", "honey beans", "oloyin"],
  tomato: ["fresh tomatoes", "tomatoes", "roma tomatoes"],
  tomatoes: ["tomato", "fresh tomatoes", "roma tomatoes"],
  pepper: ["tatase", "rodo", "scotch bonnet", "habanero", "chili pepper", "bell pepper"],
  onion: ["red onions", "white onions", "onions"],
  poultry: ["broilers", "layers", "live chicken", "dressed chicken", "cockerels"],
  chicken: ["poultry", "broilers", "layers", "live chicken", "dressed chicken"],
  fish: ["catfish", "tilapia", "smoked fish", "live catfish", "table size catfish"],
  catfish: ["fish", "live catfish", "table size catfish", "smoked catfish"],
  egg: ["eggs", "table eggs", "crate of eggs"],
  eggs: ["egg", "table eggs", "crate of eggs"],
};

export function areCommoditiesCompatible(demandCommodity: string, supplyCommodity: string): {
  isCompatible: boolean;
  score: number;
  reason: string;
} {
  assertNoProhibitedProduce(demandCommodity, "Demand Commodity");
  assertNoProhibitedProduce(supplyCommodity, "Supply Commodity");

  const dNorm = demandCommodity.trim().toLowerCase();
  const sNorm = supplyCommodity.trim().toLowerCase();

  // 1. Exact match
  if (dNorm === sNorm) {
    return { isCompatible: true, score: 30, reason: "Exact commodity match" };
  }

  // 2. Direct substring match
  if (dNorm.includes(sNorm) || sNorm.includes(dNorm)) {
    return { isCompatible: true, score: 27, reason: "Direct derivative/subtype commodity match" };
  }

  // 3. Synonym lookup
  const dSynonyms = COMMODITY_SYNONYMS[dNorm] || [];
  const sSynonyms = COMMODITY_SYNONYMS[sNorm] || [];

  if (dSynonyms.includes(sNorm) || sSynonyms.includes(dNorm)) {
    return { isCompatible: true, score: 28, reason: "Canonical agricultural synonym match" };
  }

  const hasIntersection = dSynonyms.some((syn) => sSynonyms.includes(syn));
  if (hasIntersection) {
    return { isCompatible: true, score: 25, reason: "Shared commodity cluster match" };
  }

  return { isCompatible: false, score: 0, reason: "Incompatible agricultural commodities" };
}

/**
 * Computes proximity tier between supply location and demand location
 */
export function resolveLocationTier(
  supplyState: string,
  supplyLga: string | undefined,
  demandState: string,
  demandLga: string | undefined
): { tier: ProximityTier; score: number } {
  const sameState = supplyState.trim().toLowerCase() === demandState.trim().toLowerCase();
  const sameLga =
    sameState &&
    Boolean(supplyLga && demandLga && supplyLga.trim().toLowerCase() === demandLga.trim().toLowerCase());

  if (sameLga) {
    return { tier: "SAME_LGA", score: 15 };
  }
  if (sameState) {
    return { tier: "SAME_STATE", score: 12 };
  }
  if (areStatesInSameCorridor(supplyState, demandState)) {
    return { tier: "REGIONAL_CORRIDOR", score: 8 };
  }
  return { tier: "NATIONAL", score: 3 };
}

/**
 * Evaluates date availability alignment
 */
export function evaluateAvailabilityScore(
  readyDateStr: string | undefined,
  desiredDeliveryDateStr: string
): { score: number; missingEvidence?: string; note: string } {
  if (!readyDateStr) {
    return {
      score: 5,
      missingEvidence: "Supply ready date not provided by supplier",
      note: "Availability assumed but unconfirmed",
    };
  }

  const readyDate = new Date(readyDateStr).getTime();
  const deliveryDate = new Date(desiredDeliveryDateStr).getTime();

  if (isNaN(readyDate) || isNaN(deliveryDate)) {
    return {
      score: 6,
      missingEvidence: "Invalid ISO date format encountered",
      note: "Date comparison indeterminate",
    };
  }

  const diffMs = deliveryDate - readyDate;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 0) {
    // Supply is ready on or before the demand deadline
    return { score: 15, note: `Supply ready ${diffDays} day(s) before delivery deadline` };
  } else if (diffDays >= -3) {
    // Supply ready within 3 days after deadline
    return { score: 8, note: `Minor availability lag of ${Math.abs(diffDays)} day(s)` };
  } else {
    // Significant lag
    return { score: 2, note: `Supply availability is ${Math.abs(diffDays)} days past deadline` };
  }
}

/**
 * Evaluates specification and quality grade alignment
 */
export function evaluateSpecificationScore(
  supplyGrade?: string,
  demandGradeRequirement?: string
): { score: number; missingEvidence?: string; note: string } {
  if (!demandGradeRequirement) {
    // Standard market grade acceptable
    if (supplyGrade) {
      return { score: 10, note: `Supply specifies grade: ${supplyGrade}` };
    }
    return {
      score: 8,
      missingEvidence: "No strict quality grade specified by buyer or supplier",
      note: "Standard commercial grade assumed",
    };
  }

  if (!supplyGrade) {
    return {
      score: 4,
      missingEvidence: "Supplier has not stated quality specification grade",
      note: "Unspecified supply grade against explicit requirement",
    };
  }

  const normDemand = demandGradeRequirement.trim().toUpperCase();
  const normSupply = supplyGrade.trim().toUpperCase();

  if (normDemand === normSupply) {
    return { score: 10, note: `Exact specification match: ${normSupply}` };
  }

  const premiumGrades = ["PREMIUM", "GRADE_A", "EXPORT"];
  if (premiumGrades.includes(normSupply)) {
    return { score: 9, note: `Higher grade offered: ${normSupply} for ${normDemand}` };
  }

  return { score: 5, note: `Specification variance: supply (${normSupply}) vs required (${normDemand})` };
}

/**
 * Score an individual supply candidate against a demand target
 */
export function evaluateCandidateSupply(
  supply: SupplyObservationRecord,
  demand: DemandOfftakeTarget,
  carrierOptions: LogisticsRouteCandidate[],
  securityConstraints: string[]
): EvaluatedCandidateSupply {
  assertNoProhibitedProduce(supply.commodity, "Candidate Supply Commodity");
  assertNoProhibitedProduce(demand.commodityOrProduct, "Demand Commodity");

  const notes: string[] = [];

  // 1. Commodity compatibility (0 to 30)
  const commCompat = areCommoditiesCompatible(demand.commodityOrProduct, supply.commodity);
  notes.push(commCompat.reason);

  // 2. Unit & Quantity compatibility (0 to 20)
  const unitResult = normalizeSupplyToDemandUnit(supply.quantity, supply.unit, demand.unit);
  let qtyScore = 0;
  let normalizedQuantity = 0;

  if (unitResult.isCompatible && unitResult.normalizedSupplyQuantity !== null) {
    normalizedQuantity = unitResult.normalizedSupplyQuantity;
    const ratio = Math.min(normalizedQuantity / demand.quantity, 1.0);
    qtyScore = Math.round(ratio * 20);
    notes.push(`Quantity sufficiency: ${(ratio * 100).toFixed(0)}% (${normalizedQuantity} ${demand.unit})`);
  } else {
    notes.push(unitResult.reason || "Incompatible packaging units");
  }

  // 3. Location proximity (0 to 15)
  const locResult = resolveLocationTier(supply.state, supply.lga, demand.state, demand.lga);
  notes.push(`Location tier: ${locResult.tier} (${supply.state} -> ${demand.state})`);

  // 4. Availability alignment (0 to 15)
  const availResult = evaluateAvailabilityScore(supply.readyDate, demand.desiredDeliveryDate);
  notes.push(availResult.note);

  // 5. Specification alignment (0 to 10)
  const specResult = evaluateSpecificationScore(supply.qualityGrade, demand.qualityGradeRequirement);
  notes.push(specResult.note);

  // 6. Processing fit (0 to 5)
  let procScore = 5;
  if (demand.requiresProcessing && !supply.requiresProcessing) {
    procScore = 5;
  } else if (demand.requiresProcessing && supply.requiresProcessing) {
    procScore = 3;
    notes.push("Raw supply will require intermediate processing step");
  }

  // 7. Logistics compatibility (0 to 5)
  let logScore = 4;
  const corridorKey = `${supply.state} -> ${demand.state}`;
  const isSecurityDisrupted = securityConstraints.some(
    (c) =>
      c.toLowerCase().includes(supply.state.toLowerCase()) ||
      c.toLowerCase().includes(demand.state.toLowerCase())
  );

  if (isSecurityDisrupted) {
    logScore = 1;
    notes.push("SECURITY_DISRUPTION_REPORTED on corridor; manual movement verification required");
  } else {
    const hasRefrigerationNeed = supply.perishability === "HIGH";
    const matchingCarrier = carrierOptions.find(
      (c) =>
        c.coverageStates.some((s) => s.toLowerCase() === supply.state.toLowerCase()) ||
        c.coverageStates.some((s) => s.toLowerCase() === demand.state.toLowerCase())
    );

    if (matchingCarrier) {
      if (hasRefrigerationNeed && !matchingCarrier.hasRefrigeration) {
        logScore = 2;
        notes.push("Carrier lacks required cold chain refrigeration");
      } else {
        logScore = 5;
        notes.push("Vetted logistics carrier available on transit corridor");
      }
    }
  }

  const candidateScore = Math.max(
    0,
    Math.min(
      100,
      commCompat.score +
        qtyScore +
        locResult.score +
        availResult.score +
        specResult.score +
        procScore +
        logScore
    )
  );

  return {
    supply,
    candidateScore,
    allocatedQuantity: 0, // Assigned during aggregation step
    proximityTier: locResult.tier,
    reliabilityLevel: supply.reliabilityLevel,
    corridor: corridorKey,
    notes,
  };
}

/**
 * Greedily aggregates multiple candidate supplies to satisfy a demand target
 */
export function aggregateMultiSourceSupplies(
  candidates: EvaluatedCandidateSupply[],
  requestedQuantity: number,
  demandUnit: string
): {
  allocatedCandidates: EvaluatedCandidateSupply[];
  totalAllocated: number;
  remainingGap: number;
  summary: MultiSourceAggregationSummary;
} {
  let remainingNeeded = requestedQuantity;
  let totalAllocated = 0;
  const primaryStates = new Set<string>();

  // Sort candidates by score descending
  const sorted = [...candidates].sort((a, b) => b.candidateScore - a.candidateScore);
  const allocatedCandidates: EvaluatedCandidateSupply[] = [];

  for (const candidate of sorted) {
    if (remainingNeeded <= 0) break;

    const unitResult = normalizeSupplyToDemandUnit(
      candidate.supply.quantity,
      candidate.supply.unit,
      demandUnit
    );

    if (!unitResult.isCompatible || unitResult.normalizedSupplyQuantity === null) {
      continue;
    }

    const availableNormalized = unitResult.normalizedSupplyQuantity;
    const allocated = Math.min(availableNormalized, remainingNeeded);

    if (allocated > 0) {
      candidate.allocatedQuantity = Number(allocated.toFixed(2));
      totalAllocated += allocated;
      remainingNeeded -= allocated;
      primaryStates.add(candidate.supply.state);
      allocatedCandidates.push(candidate);
    }
  }

  const roundedAllocated = Number(totalAllocated.toFixed(2));
  const roundedGap = Number(Math.max(0, requestedQuantity - totalAllocated).toFixed(2));
  const fulfillmentPct =
    requestedQuantity > 0
      ? Number(Math.min(100, (totalAllocated / requestedQuantity) * 100).toFixed(2))
      : 0;

  const statesArray = Array.from(primaryStates);
  const sourcesCount = allocatedCandidates.length;

  let coordinationDifficulty: "LOW" | "MODERATE" | "HIGH" = "LOW";
  if (sourcesCount > 4 || statesArray.length > 2) {
    coordinationDifficulty = "HIGH";
  } else if (sourcesCount > 1 || statesArray.length > 1) {
    coordinationDifficulty = "MODERATE";
  }

  const summary: MultiSourceAggregationSummary = {
    sourcesCount,
    totalAggregatedQuantity: roundedAllocated,
    requiredQuantity: requestedQuantity,
    aggregatedFulfillmentPercentage: fulfillmentPct,
    remainingGap: roundedGap,
    primaryStates: statesArray,
    aggregationCenterRecommended: statesArray[0] ? `${statesArray[0]} Central Hub` : undefined,
    coordinationDifficulty,
  };

  return {
    allocatedCandidates,
    totalAllocated: roundedAllocated,
    remainingGap: roundedGap,
    summary,
  };
}

/**
 * Calculates comprehensive supply gap analysis
 */
export function calculateSupplyGap(
  demand: DemandOfftakeTarget,
  matchedQuantity: number,
  candidateCount: number,
  requiresProcessing: boolean,
  constraints: string[]
): SupplyGapAnalysis {
  const reqQty = demand.quantity;
  const remQty = Math.max(0, Number((reqQty - matchedQuantity).toFixed(2)));
  const pct = reqQty > 0 ? Number(Math.min(100, (matchedQuantity / reqQty) * 100).toFixed(2)) : 0;

  let status: "FULLY_SATISFIED" | "PARTIALLY_SATISFIED" | "UNSATISFIED" | "INSUFFICIENT_DATA" =
    "UNSATISFIED";

  if (reqQty <= 0) {
    status = "INSUFFICIENT_DATA";
  } else if (pct >= 99.9) {
    status = "FULLY_SATISFIED";
  } else if (pct > 0) {
    status = "PARTIALLY_SATISFIED";
  } else {
    status = "UNSATISFIED";
  }

  return {
    demandId: demand.id,
    requestedQuantity: reqQty,
    matchedQuantity: Number(matchedQuantity.toFixed(2)),
    remainingQuantity: remQty,
    percentageFulfilled: pct,
    numberOfSupplySources: candidateCount,
    aggregationRequired: candidateCount > 1,
    processingRequired: requiresProcessing,
    logisticsRequired: true,
    constraints,
    status,
  };
}

/**
 * Top-level deterministic matching engine for a Demand Offtake Target
 */
export function executeSupplyMatching(
  demand: DemandOfftakeTarget,
  supplies: SupplyObservationRecord[],
  facilities: ProcessingFacilityCandidate[],
  carriers: LogisticsRouteCandidate[],
  securityIncidents: string[] = []
): SupplyMatchResult {
  assertNoProhibitedProduce(demand.commodityOrProduct, "Demand Commodity");

  const missingEvidence: string[] = [];
  const constraints: string[] = [];

  // Filter supplies for anti-pork and compatible commodity
  const compatibleSupplies = supplies.filter((s) => {
    try {
      assertNoProhibitedProduce(s.commodity, "Supply Commodity");
      const compat = areCommoditiesCompatible(demand.commodityOrProduct, s.commodity);
      return compat.isCompatible;
    } catch {
      return false;
    }
  });

  if (compatibleSupplies.length === 0) {
    return {
      demandId: demand.id,
      commodity: demand.commodityOrProduct,
      targetQuantity: demand.quantity,
      matchedQuantity: 0,
      remainingGap: demand.quantity,
      unit: demand.unit,
      fulfillmentPercentage: 0,
      matchScore: 0,
      componentScores: {
        commodityCompatibility: 0,
        quantityCompatibility: 0,
        locationCompatibility: 0,
        availabilityCompatibility: 0,
        specificationCompatibility: 0,
        processingAggregationFit: 0,
        logisticsCompatibility: 0,
      },
      matchClassification: "NO_MATCH",
      coordinationType: "UNSATISFIED",
      confidence: 0.85,
      candidates: [],
      constraints: ["No compatible supply sources observed on platform"],
      missingEvidence: ["No active listings, inventory, or aggregation pools for this commodity"],
      coordinationOpportunitySummary: `Zero matching supply identified for ${demand.commodityOrProduct} (${demand.quantity} ${demand.unit}). Aggregation pools or farm contracts required.`,
    };
  }

  // Evaluate each candidate
  const evaluatedCandidates = compatibleSupplies.map((s) =>
    evaluateCandidateSupply(s, demand, carriers, securityIncidents)
  );

  // Multi-source aggregation
  const { allocatedCandidates, totalAllocated, remainingGap, summary: aggSummary } =
    aggregateMultiSourceSupplies(evaluatedCandidates, demand.quantity, demand.unit);

  // Processing assessment
  let processingReq: ProcessingRequirementSummary | undefined;
  if (demand.requiresProcessing) {
    const matchedFac = facilities.find((f) =>
      f.supportedCommodities.some(
        (c) =>
          c.toLowerCase().includes(demand.commodityOrProduct.toLowerCase()) ||
          demand.commodityOrProduct.toLowerCase().includes(c.toLowerCase())
      ) && f.isActive
    );

    if (matchedFac) {
      processingReq = {
        required: true,
        facilityAvailable: true,
        matchedFacility: matchedFac,
        estimatedLeadDays: 2,
        bottleneckDetected: false,
      };
    } else {
      constraints.push("PROCESSING_BOTTLENECK: No certified processing facility found in corridor");
      processingReq = {
        required: true,
        facilityAvailable: false,
        estimatedLeadDays: 5,
        bottleneckDetected: true,
      };
    }
  }

  // Security constraints check
  const affectedBySecurity = securityIncidents.some(
    (inc) =>
      inc.toLowerCase().includes(demand.state.toLowerCase()) ||
      aggSummary.primaryStates.some((st) => inc.toLowerCase().includes(st.toLowerCase()))
  );

  if (affectedBySecurity) {
    constraints.push("SECURITY_DISRUPTION_REPORTED: Transit corridor review required before dispatch");
    constraints.push("CORRIDOR_REVIEW_REQUIRED");
  }

  // Calculate component scores based on the top candidate or aggregated set
  const topCandidate = evaluatedCandidates.sort((a, b) => b.candidateScore - a.candidateScore)[0];
  const fulfillmentPct = aggSummary.aggregatedFulfillmentPercentage;

  const commodityScore = topCandidate
    ? areCommoditiesCompatible(demand.commodityOrProduct, topCandidate.supply.commodity).score
    : 0;

  const quantityScore = Math.min(20, Math.round((fulfillmentPct / 100) * 20));

  const locationScore = topCandidate
    ? resolveLocationTier(topCandidate.supply.state, topCandidate.supply.lga, demand.state, demand.lga).score
    : 0;

  const availabilityScore = topCandidate
    ? evaluateAvailabilityScore(topCandidate.supply.readyDate, demand.desiredDeliveryDate).score
    : 5;

  const specScore = topCandidate
    ? evaluateSpecificationScore(topCandidate.supply.qualityGrade, demand.qualityGradeRequirement).score
    : 5;

  const procScore = processingReq ? (processingReq.facilityAvailable ? 5 : 1) : 5;
  const logScore = affectedBySecurity ? 1 : 5;

  const totalMatchScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        commodityScore +
          quantityScore +
          locationScore +
          availabilityScore +
          specScore +
          procScore +
          logScore
      )
    )
  );

  // Classification
  let classification: MatchClassification = "LOW_CONFIDENCE_MATCH";
  if (totalMatchScore >= 85) classification = "EXCELLENT_MATCH";
  else if (totalMatchScore >= 70) classification = "GOOD_MATCH";
  else if (totalMatchScore >= 45) classification = "PARTIAL_MATCH";
  else if (totalMatchScore >= 20) classification = "LOW_CONFIDENCE_MATCH";
  else classification = "NO_MATCH";

  // Coordination type
  let coordType: CoordinationType = "DIRECT_SINGLE_SOURCE";
  if (demand.requiresProcessing) {
    coordType = "PROCESSING_REQUIRED";
  } else if (aggSummary.sourcesCount > 1) {
    coordType = "MULTI_SOURCE_AGGREGATION";
  } else if (aggSummary.sourcesCount === 1) {
    coordType = "DIRECT_SINGLE_SOURCE";
  } else {
    coordType = "UNSATISFIED";
  }

  // Confidence calculation
  let confidence = 0.85;
  if (missingEvidence.length > 0) confidence -= 0.15;
  if (constraints.length > 0) confidence -= 0.1;
  confidence = Math.max(0.3, Number(confidence.toFixed(2)));

  // Generate explainable coordination summary
  let coordSummary = `Demand for ${demand.commodityOrProduct} (${demand.quantity} ${demand.unit}) in ${demand.state}: `;
  if (classification === "EXCELLENT_MATCH" || classification === "GOOD_MATCH") {
    coordSummary += `Satisfied with ${fulfillmentPct}% alignment across ${aggSummary.sourcesCount} verified source(s).`;
  } else if (classification === "PARTIAL_MATCH") {
    coordSummary += `Partially satisfied (${totalAllocated} ${demand.unit} matched, ${remainingGap} ${demand.unit} remaining gap).`;
  } else {
    coordSummary += `Low matching alignment. Major constraints or supply deficits detected.`;
  }

  if (aggSummary.sourcesCount > 1) {
    coordSummary += ` Aggregation required across ${aggSummary.primaryStates.join(", ")}.`;
  }

  if (processingReq?.required) {
    coordSummary += processingReq.facilityAvailable
      ? ` Route through verified processor: ${processingReq.matchedFacility?.name}.`
      : ` Intermediate processing required but no local facility available.`;
  }

  return {
    demandId: demand.id,
    commodity: demand.commodityOrProduct,
    targetQuantity: demand.quantity,
    matchedQuantity: totalAllocated,
    remainingGap,
    unit: demand.unit,
    fulfillmentPercentage: fulfillmentPct,
    matchScore: totalMatchScore,
    componentScores: {
      commodityCompatibility: commodityScore,
      quantityCompatibility: quantityScore,
      locationCompatibility: locationScore,
      availabilityCompatibility: availabilityScore,
      specificationCompatibility: specScore,
      processingAggregationFit: procScore,
      logisticsCompatibility: logScore,
    },
    matchClassification: classification,
    coordinationType: coordType,
    confidence,
    candidates: allocatedCandidates.length > 0 ? allocatedCandidates : evaluatedCandidates,
    aggregationSummary: aggSummary,
    processingRequirement: processingReq,
    logisticsCorridor: topCandidate?.corridor,
    constraints,
    missingEvidence,
    coordinationOpportunitySummary: coordSummary,
  };
}
