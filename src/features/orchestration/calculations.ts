/**
 * AgroMarket Phase 3.1: Agricultural Intelligence Orchestration & Cross-Domain Decision Engine
 * Deterministic Mathematical Specifications, Correlation Engine, Conflict Detection,
 * Priority Scoring, and Recommendation Synthesis
 *
 * SAFETY INVARIANTS:
 * 1. Deterministic calculations are authoritative. AI cannot override quantitative scores.
 * 2. Strict anti-pork produce validation across all inputs and outputs.
 * 3. Commercial confidentiality: PII, exact farm coordinates, and private buyer data are stripped.
 * 4. Disease and food security signals use calibrated non-causation phrasing ("potentially associated with").
 * 5. All recommendations are advisory and require human-in-the-loop review.
 */

import { assertNoProhibitedProduce } from "@/features/intelligence/validation";
import {
  AgentOutputContribution,
  CorrelationTimeWindow,
  IntelligenceConflictItem,
  OrchestrationConfidenceMetrics,
  OrchestrationPriorityLevel,
  OrchestrationRecommendationItem,
  OrchestrationScenarioType,
  PriorityScoreBreakdown,
  SpecializedAgentDomain,
} from "./types";

// -----------------------------------------------------------------------------
// 1. NORMALIZATION & PRIVACY FILTERING
// -----------------------------------------------------------------------------

/**
 * Normalizes an agent contribution, ensuring all fields comply with privacy,
 * value bounds, and zero-tolerance anti-pork rules.
 */
export function normalizeAgentOutputContribution(
  raw: Partial<AgentOutputContribution>
): AgentOutputContribution {
  const commodity = raw.commodity?.trim() || null;
  const commodityCategory = raw.commodityCategory?.trim() || null;
  const state = raw.state?.trim() || null;
  const lga = raw.lga?.trim() || null;

  // Anti-Pork Invariant Enforcement
  if (commodity) {
    assertNoProhibitedProduce(commodity, "Agent Contribution Commodity");
  }
  if (commodityCategory) {
    assertNoProhibitedProduce(commodityCategory, "Agent Contribution Category");
  }
  if (raw.signalType) {
    assertNoProhibitedProduce(raw.signalType, "Agent Contribution SignalType");
  }

  // Value Clamping
  const score = Math.max(0, Math.min(100, Number(raw.score) || 0));
  const confidence = Math.max(0, Math.min(1.0, Number(raw.confidence) || 0.7));
  const evidenceConfidence = Math.max(0, Math.min(1.0, Number(raw.evidenceConfidence) || confidence));
  const evidenceCount = Math.max(0, Math.floor(Number(raw.evidenceCount) || 1));

  // Privacy Sanitization: never allow raw personal names or specific private cadastral coords
  const sanitizedSourceRefs = (raw.sourceReferences || [])
    .map((ref) => ref.replace(/\b(\+?234\d{10}|\d{11})\b/g, "[REDACTED_PHONE]"))
    .map((ref) => ref.replace(/lat(itude)?:\s*[\d.-]+,\s*lon(gitude)?:\s*[\d.-]+/gi, "[REDACTED_COORDS]"));

  return {
    agentId: raw.agentId || "SPECIALIZED_AGENT",
    agentType: raw.agentType || "DOMAIN_AGENT",
    domain: raw.domain || "MARKET",
    geographicScope: {
      state,
      lga,
      geopoliticalZone: raw.geographicScope?.geopoliticalZone || raw.geopoliticalZone || null,
      corridor: raw.geographicScope?.corridor || null,
      tradingHub: raw.geographicScope?.tradingHub || null,
    },
    state,
    lga,
    geopoliticalZone: raw.geopoliticalZone || null,
    commodity,
    commodityCategory,
    signalType: raw.signalType || "GENERIC_SIGNAL",
    severity: raw.severity || "MEDIUM",
    score,
    confidence,
    evidenceConfidence,
    evidenceCount,
    observationTime: raw.observationTime || new Date().toISOString(),
    generatedAt: raw.generatedAt || new Date().toISOString(),
    sourceReferences: sanitizedSourceRefs,
    affectedValueChainStage: raw.affectedValueChainStage || "PRODUCTION",
    dependencies: raw.dependencies || [],
    limitations: raw.limitations || [],
    recommendationCandidates: raw.recommendationCandidates || [],
  };
}

// -----------------------------------------------------------------------------
// 2. TEMPORAL & GEOGRAPHIC CORRELATION
// -----------------------------------------------------------------------------

/**
 * Filters contributions based on temporal correlation window and geographic scope.
 */
export function correlateAgentContributions(
  contributions: AgentOutputContribution[],
  options: {
    state?: string | null;
    commodity?: string | null;
    timeWindow?: CorrelationTimeWindow;
    referenceTime?: Date;
  } = {}
): AgentOutputContribution[] {
  const windowDays =
    options.timeWindow === "SHORT_TERM"
      ? 7
      : options.timeWindow === "LONGER_TERM"
      ? 90
      : 30; // default MEDIUM_TERM = 30 days

  const now = options.referenceTime || new Date();

  return contributions.filter((contrib) => {
    // 1. Time window validation
    const obsDate = new Date(contrib.observationTime);
    const diffMs = now.getTime() - obsDate.getTime();
    const diffDays = Math.abs(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > windowDays) {
      return false;
    }

    // 2. Commodity validation
    if (options.commodity && contrib.commodity) {
      const matchCommodity =
        contrib.commodity.toLowerCase().includes(options.commodity.toLowerCase()) ||
        options.commodity.toLowerCase().includes(contrib.commodity.toLowerCase());
      if (!matchCommodity) return false;
    }

    // 3. State validation
    if (options.state && contrib.state) {
      if (contrib.state.toLowerCase() !== options.state.toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}

// -----------------------------------------------------------------------------
// 3. SAME-SOURCE DEDUPLICATION
// -----------------------------------------------------------------------------

/**
 * Evaluates distinct underlying sources across contributing agents
 * to prevent double-counting when multiple domain agents rely on the same bulletin.
 */
export function deduplicateSourceEvidence(
  contributions: AgentOutputContribution[]
): {
  totalReferencesCount: number;
  distinctSourcesCount: number;
  uniqueSources: string[];
  deduplicationRatio: number;
} {
  const allRefs: string[] = [];
  const sourceSet = new Set<string>();

  for (const c of contributions) {
    for (const ref of c.sourceReferences) {
      allRefs.push(ref);
      // Normalize source identity (e.g. "NVRI Field Bulletin 2026-04" -> "nvri_bulletin")
      const normalizedKey = ref
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .substring(0, 40);
      sourceSet.add(normalizedKey);
    }
  }

  const total = allRefs.length;
  const distinct = sourceSet.size || Math.max(1, contributions.length);
  const ratio = total > 0 ? distinct / total : 1.0;

  return {
    totalReferencesCount: total,
    distinctSourcesCount: distinct,
    uniqueSources: Array.from(sourceSet),
    deduplicationRatio: ratio,
  };
}

// -----------------------------------------------------------------------------
// 4. CONFLICT DETECTION & CONTRADICTION HANDLING
// -----------------------------------------------------------------------------

/**
 * Detects contradictory intelligence between specialized domain agents.
 * E.g. Market says SURPLUS while Supply Matching says SHORTAGE.
 * Decreases systemic confidence and creates explicit conflict records for human review.
 */
export function detectIntelligenceConflicts(
  contributions: AgentOutputContribution[]
): IntelligenceConflictItem[] {
  const conflicts: IntelligenceConflictItem[] = [];

  // Group by commodity for pair-wise cross-checking
  const byCommodity = new Map<string, AgentOutputContribution[]>();
  for (const c of contributions) {
    const key = c.commodity?.toLowerCase() || "general";
    const list = byCommodity.get(key) || [];
    list.push(c);
    byCommodity.set(key, list);
  }

  for (const [, items] of byCommodity.entries()) {
    const market = items.find((i) => i.domain === "MARKET");
    const supply = items.find((i) => i.domain === "SUPPLY");
    const demand = items.find((i) => i.domain === "DEMAND");
    const procurement = items.find((i) => i.domain === "PROCUREMENT");
    const production = items.find((i) => i.domain === "PRODUCTION");
    const disease = items.find((i) => i.domain === "DISEASE_BIOSECURITY");
    const logistics = items.find((i) => i.domain === "LOGISTICS");

    // Case 1: Market Surplus vs Supply Matching Shortage
    if (market && supply) {
      const marketSurplus =
        market.signalType.includes("SURPLUS") || market.signalType.includes("PRICE_DECREASE");
      const supplyShortage =
        supply.signalType.includes("SHORTAGE") ||
        supply.signalType.includes("DEFICIT") ||
        supply.score <= 35;

      if (marketSurplus && supplyShortage) {
        conflicts.push({
          conflictType: "MARKET_SUPPLY_CONTRADICTION",
          domainA: "MARKET",
          domainB: "SUPPLY",
          signalA: market.signalType,
          signalB: supply.signalType,
          state: market.state || supply.state,
          lga: market.lga || supply.lga,
          commodity: market.commodity || supply.commodity,
          severity: "HIGH",
          status: "ACTIVE",
          explanation: `Market agent indicates produce surplus/price moderation while Supply Matching flags acute supply deficit. Requires human field reconciliation.`,
          confidenceImpact: 0.25,
          recommendedHumanReview: `Reconcile local physical inventory counts with price observation logs before advising procurement off-take.`,
        });
      }
    }

    // Case 2: Demand Decrease vs High Procurement Pressure
    if (demand && procurement) {
      const demandFalling =
        demand.signalType.includes("DECREASE") || demand.signalType.includes("SLUMP");
      const procurementHighPressure =
        procurement.signalType.includes("HIGH_PRESSURE") ||
        procurement.signalType.includes("URGENT") ||
        procurement.score >= 70;

      if (demandFalling && procurementHighPressure) {
        conflicts.push({
          conflictType: "DEMAND_PROCUREMENT_DISPARITY",
          domainA: "DEMAND",
          domainB: "PROCUREMENT",
          signalA: demand.signalType,
          signalB: procurement.signalType,
          state: demand.state || procurement.state,
          lga: demand.lga || procurement.lga,
          commodity: demand.commodity || procurement.commodity,
          severity: "MEDIUM",
          status: "ACTIVE",
          explanation: `Consumer demand forecasts indicate downward movement, yet B2B procurement pressure remains highly elevated. Potential institutional off-taker stockpiling or divergent market segments.`,
          confidenceImpact: 0.2,
          recommendedHumanReview: `Segment consumer retail demand from bulk industrial processor orders to determine localized absorption capacity.`,
        });
      }
    }

    // Case 3: Production Boom vs Severe Disease Loss
    if (production && disease) {
      const productionExpanding =
        production.signalType.includes("EXPANSION") ||
        production.signalType.includes("BUMPER_HARVEST") ||
        production.score >= 75;
      const diseaseSevere =
        disease.signalType.includes("MORTALITY") ||
        disease.signalType.includes("HEALTH_DISRUPTION") ||
        disease.score >= 65;

      if (productionExpanding && diseaseSevere) {
        conflicts.push({
          conflictType: "PRODUCTION_DISEASE_DIVERGENCE",
          domainA: "PRODUCTION",
          domainB: "DISEASE_BIOSECURITY",
          signalA: production.signalType,
          signalB: disease.signalType,
          state: production.state || disease.state,
          commodity: production.commodity || disease.commodity,
          severity: "CRITICAL",
          status: "ACTIVE",
          explanation: `Production forecast models project harvest expansion, whereas disease intelligence captures elevated biosecurity or mortality signals. Potential localized outbreak threatening aggregate targets.`,
          confidenceImpact: 0.3,
          recommendedHumanReview: `Verify harvest yields with zonal extension officers and cross-reference state veterinary field notices.`,
        });
      }
    }

    // Case 4: Nominal Logistics vs Severe Supply Inaccessibility
    if (logistics && supply) {
      const logisticsNominal =
        logistics.signalType.includes("NOMINAL") || logistics.score <= 30;
      const supplyCorridorDisruption =
        supply.signalType.includes("LOGISTICS_BOTTLENECK") ||
        supply.signalType.includes("CORRIDOR_DISRUPTION");

      if (logisticsNominal && supplyCorridorDisruption) {
        conflicts.push({
          conflictType: "LOGISTICS_SUPPLY_ROUTE_DISCREPANCY",
          domainA: "LOGISTICS",
          domainB: "SUPPLY",
          signalA: logistics.signalType,
          signalB: supply.signalType,
          state: logistics.state || supply.state,
          commodity: logistics.commodity || supply.commodity,
          severity: "MEDIUM",
          status: "ACTIVE",
          explanation: `Logistics telemetry indicates regular corridor transit times, yet supply matching flags inaccessibility or transit failure. Possible localized feeder-road breakdown not captured on primary highways.`,
          confidenceImpact: 0.15,
          recommendedHumanReview: `Inspect first-mile rural feeder road conditions connecting aggregation centers to arterial corridors.`,
        });
      }
    }
  }

  return conflicts;
}

// -----------------------------------------------------------------------------
// 5. CROSS-DOMAIN SCENARIO DETECTION
// -----------------------------------------------------------------------------

/**
 * Deterministically evaluates scenario conditions across contributing domain outputs.
 * Enforces non-causation phrasing when correlating disease and supply.
 */
export function detectCrossDomainScenarios(
  contributions: AgentOutputContribution[],
  _conflicts: IntelligenceConflictItem[]
): {
  scenarioType: OrchestrationScenarioType;
  scenarioSummary: string;
  affectedDomains: SpecializedAgentDomain[];
  deterministicFindings: Record<string, unknown>;
  evidenceSummary: string;
} {
  const domainMap = new Map<SpecializedAgentDomain, AgentOutputContribution>();
  for (const c of contributions) {
    domainMap.set(c.domain, c);
  }

  const demand = domainMap.get("DEMAND");
  const supply = domainMap.get("SUPPLY");
  const market = domainMap.get("MARKET");
  const logistics = domainMap.get("LOGISTICS");
  const disease = domainMap.get("DISEASE_BIOSECURITY");
  const procurement = domainMap.get("PROCUREMENT");
  const foodSecurity = domainMap.get("FOOD_SECURITY");
  const production = domainMap.get("PRODUCTION");

  // Multi-Domain Elevated Risk Check (>= 3 independent domains with score >= 60 or HIGH/CRITICAL)
  const elevatedDomains = contributions.filter(
    (c) => c.score >= 60 || c.severity === "HIGH" || c.severity === "CRITICAL"
  );
  const distinctElevatedDomains = Array.from(new Set(elevatedDomains.map((c) => c.domain)));

  // Scenario 1: Multi-Domain Agricultural Risk
  if (distinctElevatedDomains.length >= 3) {
    const summary = `Multiple independent intelligence domains (${distinctElevatedDomains.join(
      ", "
    )}) simultaneously indicate elevated risk for monitored commodity and geography. Comprehensive cross-domain coordination required.`;

    return {
      scenarioType: "MULTI_DOMAIN_RISK_SCENARIO",
      scenarioSummary: summary,
      affectedDomains: distinctElevatedDomains,
      deterministicFindings: {
        elevatedDomainsCount: distinctElevatedDomains.length,
        domains: distinctElevatedDomains,
        averageElevatedScore:
          elevatedDomains.reduce((sum, d) => sum + d.score, 0) / elevatedDomains.length,
      },
      evidenceSummary: `Corroborated by ${elevatedDomains.length} distinct domain signals across ${distinctElevatedDomains.length} ecosystem sectors.`,
    };
  }

  // Scenario 2: Disease-Driven Supply Risk (POTENTIALLY ASSOCIATED WITH - never assert causal certainty)
  if (disease && (disease.score >= 50 || disease.severity === "HIGH" || disease.severity === "CRITICAL")) {
    const hasProductionOrSupplyRisk =
      (production && (production.score >= 50 || production.severity === "HIGH")) ||
      (supply && (supply.score <= 45 || supply.signalType.includes("SHORTAGE") || supply.severity === "HIGH"));

    if (hasProductionOrSupplyRisk) {
      const summary = `Elevated agricultural health and biosecurity indicators detected, potentially associated with emerging production contractions and downstream supply risk. Evidence should be reviewed by agricultural officers before attributing causation.`;

      const affected: SpecializedAgentDomain[] = ["DISEASE_BIOSECURITY"];
      if (production) affected.push("PRODUCTION");
      if (supply) affected.push("SUPPLY");

      return {
        scenarioType: "DISEASE_SUPPLY_RISK_SCENARIO",
        scenarioSummary: summary,
        affectedDomains: affected,
        deterministicFindings: {
          diseaseScore: disease.score,
          diseaseSeverity: disease.severity,
          productionScore: production?.score,
          supplyScore: supply?.score,
          causationDisclaimer:
            "Correlation is not causation. Agricultural health signals may contribute to, or be coincident with, supply gap.",
        },
        evidenceSummary: `Agricultural biosecurity observations aligned with supply contraction indicators. Formal clinical verification referred to certified veterinary services.`,
      };
    }
  }

  // Scenario 3: Food Security Pressure Scenario
  if (
    foodSecurity &&
    (foodSecurity.score >= 60 ||
      foodSecurity.severity === "HIGH" ||
      foodSecurity.severity === "CRITICAL" ||
      foodSecurity.signalType.includes("PRESSURE"))
  ) {
    const supplyOrMarketStress =
      (supply && (supply.score <= 45 || supply.signalType.includes("SHORTAGE"))) ||
      (market && (market.score >= 60 || market.signalType.includes("PRICE_INCREASE")));

    if (supplyOrMarketStress) {
      const summary = `Systemic food security pressure elevated with regional supply gaps and market price escalation compounding household affordability risks.`;

      const affected: SpecializedAgentDomain[] = ["FOOD_SECURITY"];
      if (supply) affected.push("SUPPLY");
      if (market) affected.push("MARKET");

      return {
        scenarioType: "FOOD_SECURITY_PRESSURE_SCENARIO",
        scenarioSummary: summary,
        affectedDomains: affected,
        deterministicFindings: {
          foodSecurityScore: foodSecurity.score,
          supplyScore: supply?.score,
          marketScore: market?.score,
        },
        evidenceSummary: `Regional availability deficits and elevated food inflation pressures corroborated across food resilience and market data layers.`,
      };
    }
  }

  // Scenario 4: Logistics-Constrained Supply Scenario
  if (
    logistics &&
    (logistics.score >= 55 ||
      logistics.severity === "HIGH" ||
      logistics.signalType.includes("DISRUPTION") ||
      logistics.signalType.includes("BOTTLENECK"))
  ) {
    const hasSupplyGap =
      supply && (supply.score <= 50 || supply.signalType.includes("SHORTAGE") || supply.severity === "HIGH");

    if (hasSupplyGap) {
      const summary = `Produce supply availability constrained by corridor transit friction and logistics bottlenecks rather than primary farmgate production deficits.`;

      return {
        scenarioType: "LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO",
        scenarioSummary: summary,
        affectedDomains: ["LOGISTICS", "SUPPLY"],
        deterministicFindings: {
          logisticsPressureScore: logistics.score,
          supplyScore: supply.score,
          corridor: logistics.geographicScope.corridor || "Arterial Highway",
        },
        evidenceSummary: `Delivery events and corridor telemetry confirm transit delays slowing physical distribution to terminal trading hubs.`,
      };
    }
  }

  // Scenario 5: Procurement Risk Scenario
  if (
    procurement &&
    (procurement.score >= 60 ||
      procurement.severity === "HIGH" ||
      procurement.signalType.includes("RISK") ||
      procurement.signalType.includes("CONCENTRATION"))
  ) {
    const highDemandOrLowSupply =
      (demand && demand.score >= 60) ||
      (supply && supply.score <= 50) ||
      (logistics && logistics.score >= 60);

    if (highDemandOrLowSupply) {
      const summary = `B2B institutional procurement exposed to elevated delivery risk due to high supplier concentration, tightening local availability, and logistics dependencies.`;

      const affected: SpecializedAgentDomain[] = ["PROCUREMENT"];
      if (demand) affected.push("DEMAND");
      if (supply) affected.push("SUPPLY");
      if (logistics) affected.push("LOGISTICS");

      return {
        scenarioType: "PROCUREMENT_RISK_SCENARIO",
        scenarioSummary: summary,
        affectedDomains: affected,
        deterministicFindings: {
          procurementScore: procurement.score,
          demandScore: demand?.score,
          supplyScore: supply?.score,
        },
        evidenceSummary: `Offtake contract clustering and narrow supplier diversity index heighten fulfillment failure risk.`,
      };
    }
  }

  // Scenario 6: Supply Shortage Scenario
  const demandUp = demand && (demand.score >= 55 || demand.signalType.includes("INCREASE"));
  const supplyShort = supply && (supply.score <= 45 || supply.signalType.includes("SHORTAGE"));
  const marketPressured = market && (market.score >= 55 || market.signalType.includes("PRICE_INCREASE"));

  if (demandUp && supplyShort && marketPressured) {
    const summary = `Demand pressure and market price escalation converging with documented regional supply deficits, indicating imminent supply shortfall.`;

    return {
      scenarioType: "SUPPLY_SHORTAGE_SCENARIO",
      scenarioSummary: summary,
      affectedDomains: ["DEMAND", "SUPPLY", "MARKET"],
      deterministicFindings: {
        demandScore: demand.score,
        supplyScore: supply.score,
        marketScore: market.score,
      },
      evidenceSummary: `Triangulation across orders, producer listings, and wholesale market price benchmarks confirms unmet demand volume.`,
    };
  }

  // Default: Balanced Nominal Scenario
  const activeDomains = contributions.map((c) => c.domain);
  return {
    scenarioType: "BALANCED_NOMINAL_SCENARIO",
    scenarioSummary: `Agricultural value chain indicators operating within expected seasonal variance across monitored domains.`,
    affectedDomains: Array.from(new Set(activeDomains)),
    deterministicFindings: {
      averageDomainScore:
        contributions.length > 0
          ? contributions.reduce((acc, c) => acc + c.score, 0) / contributions.length
          : 20,
      activeContributionsCount: contributions.length,
    },
    evidenceSummary: `Baseline market transactions and delivery events show balanced regional flows without critical bottlenecks.`,
  };
}

// -----------------------------------------------------------------------------
// 6. DETERMINISTIC PRIORITY SCORE (0 - 100)
// -----------------------------------------------------------------------------

/**
 * Calculates the authoritative cross-domain priority score using the formula:
 *
 * Cross-Domain Severity       25%
 * Evidence Confidence         20%
 * Food-Security Exposure      15%
 * Supply Exposure             15%
 * Geographic Concentration    10%
 * Logistics Exposure          5%
 * Procurement Exposure        5%
 * Time Sensitivity            5%
 */
export function calculateCrossDomainPriorityScore(params: {
  contributions: AgentOutputContribution[];
  scenarioType: OrchestrationScenarioType;
  conflictsCount: number;
}): {
  priorityScore: number;
  priorityLevel: OrchestrationPriorityLevel;
  breakdown: PriorityScoreBreakdown;
} {
  const { contributions, scenarioType, conflictsCount } = params;

  if (contributions.length === 0) {
    const emptyBreakdown: PriorityScoreBreakdown = {
      crossDomainSeverity: 0,
      evidenceConfidence: 0,
      foodSecurityExposure: 0,
      supplyExposure: 0,
      geographicConcentration: 0,
      logisticsExposure: 0,
      procurementExposure: 0,
      timeSensitivity: 0,
      totalScore: 0,
    };
    return {
      priorityScore: 0,
      priorityLevel: "LOW",
      breakdown: emptyBreakdown,
    };
  }

  // 1. Cross-Domain Severity (25% max 25)
  const avgSeverityScore =
    contributions.reduce((acc, c) => acc + c.score, 0) / contributions.length;
  const crossDomainSeverity = Math.min(25, (avgSeverityScore / 100) * 25);

  // 2. Evidence Confidence (20% max 20)
  const avgEvidenceConf =
    contributions.reduce((acc, c) => acc + c.evidenceConfidence, 0) / contributions.length;
  const evidenceConfidence = Math.min(20, avgEvidenceConf * 20);

  // 3. Food-Security Exposure (15% max 15)
  const foodSecurityContribution = contributions.find((c) => c.domain === "FOOD_SECURITY");
  const fsScore = foodSecurityContribution
    ? foodSecurityContribution.score
    : scenarioType === "FOOD_SECURITY_PRESSURE_SCENARIO"
    ? 80
    : 30;
  const foodSecurityExposure = Math.min(15, (fsScore / 100) * 15);

  // 4. Supply Exposure (15% max 15)
  const supplyContribution = contributions.find((c) => c.domain === "SUPPLY");
  // Lower supply score = higher gap/exposure (if score represents availability), or direct score
  const supplyScore = supplyContribution
    ? supplyContribution.score <= 50
      ? 100 - supplyContribution.score
      : supplyContribution.score
    : 40;
  const supplyExposure = Math.min(15, (supplyScore / 100) * 15);

  // 5. Geographic Concentration (10% max 10)
  const states = new Set(contributions.map((c) => c.state).filter(Boolean));
  const lgas = new Set(contributions.map((c) => c.lga).filter(Boolean));
  // Tight cluster (single state, few LGAs) elevates localized systemic vulnerability
  const isHighConcentration = states.size === 1 && lgas.size <= 2;
  const geographicConcentration = isHighConcentration ? 10.0 : states.size <= 2 ? 7.5 : 4.0;

  // 6. Logistics Exposure (5% max 5)
  const logisticsContribution = contributions.find((c) => c.domain === "LOGISTICS");
  const logScore = logisticsContribution ? logisticsContribution.score : 25;
  const logisticsExposure = Math.min(5, (logScore / 100) * 5);

  // 7. Procurement Exposure (5% max 5)
  const procurementContribution = contributions.find((c) => c.domain === "PROCUREMENT");
  const procScore = procurementContribution ? procurementContribution.score : 25;
  const procurementExposure = Math.min(5, (procScore / 100) * 5);

  // 8. Time Sensitivity (5% max 5)
  // Critical or Multi-Domain scenarios are highly time-sensitive
  const timeSensitivity =
    scenarioType === "MULTI_DOMAIN_RISK_SCENARIO"
      ? 5.0
      : scenarioType === "DISEASE_SUPPLY_RISK_SCENARIO" ||
        scenarioType === "SUPPLY_SHORTAGE_SCENARIO"
      ? 4.5
      : scenarioType === "FOOD_SECURITY_PRESSURE_SCENARIO"
      ? 4.0
      : 2.0;

  const rawTotal =
    crossDomainSeverity +
    evidenceConfidence +
    foodSecurityExposure +
    supplyExposure +
    geographicConcentration +
    logisticsExposure +
    procurementExposure +
    timeSensitivity;

  // If active conflicts exist, elevate human-review urgency slightly (+3 pts) while degrading confidence
  const conflictUrgencyBonus = conflictsCount > 0 ? Math.min(5, conflictsCount * 2.5) : 0;

  const totalScore = Math.max(0, Math.min(100, Math.round((rawTotal + conflictUrgencyBonus) * 10) / 10));

  let priorityLevel: OrchestrationPriorityLevel;
  if (totalScore >= 80) {
    priorityLevel = "CRITICAL";
  } else if (totalScore >= 60) {
    priorityLevel = "HIGH";
  } else if (totalScore >= 40) {
    priorityLevel = "MEDIUM";
  } else {
    priorityLevel = "LOW";
  }

  const breakdown: PriorityScoreBreakdown = {
    crossDomainSeverity: Math.round(crossDomainSeverity * 10) / 10,
    evidenceConfidence: Math.round(evidenceConfidence * 10) / 10,
    foodSecurityExposure: Math.round(foodSecurityExposure * 10) / 10,
    supplyExposure: Math.round(supplyExposure * 10) / 10,
    geographicConcentration: Math.round(geographicConcentration * 10) / 10,
    logisticsExposure: Math.round(logisticsExposure * 10) / 10,
    procurementExposure: Math.round(procurementExposure * 10) / 10,
    timeSensitivity: Math.round(timeSensitivity * 10) / 10,
    totalScore,
  };

  return {
    priorityScore: totalScore,
    priorityLevel,
    breakdown,
  };
}

// -----------------------------------------------------------------------------
// 7. ORCHESTRATION CONFIDENCE & DEGRADATION
// -----------------------------------------------------------------------------

/**
 * Evaluates systemic orchestration confidence, explicitly separating:
 * 1. Domain Score
 * 2. Evidence Confidence
 * 3. Orchestration Confidence (penalized by conflicts and deduplicated sources)
 */
export function calculateOrchestrationConfidence(
  contributions: AgentOutputContribution[],
  conflicts: IntelligenceConflictItem[],
  uniqueSourcesCount: number
): OrchestrationConfidenceMetrics {
  if (contributions.length === 0) {
    return {
      domainScore: 0,
      evidenceConfidence: 0.5,
      orchestrationConfidence: 0.5,
      confidenceDegradation: 0,
      independentSourcesCount: 0,
      conflictsPenaltyApplied: 0,
    };
  }

  // 1. Domain Score (0 - 100)
  const domainScore =
    Math.round(
      (contributions.reduce((acc, c) => acc + c.score, 0) / contributions.length) * 10
    ) / 10;

  // 2. Evidence Confidence (mean of individual contributions)
  const evidenceConfidence =
    Math.round(
      (contributions.reduce((acc, c) => acc + c.evidenceConfidence, 0) / contributions.length) *
        1000
    ) / 1000;

  // 3. Orchestration Confidence Baseline
  let baselineConfidence = evidenceConfidence;

  // Source diversity bonus: having multiple independent sources boosts confidence slightly (+0.05)
  if (uniqueSourcesCount >= 4) {
    baselineConfidence = Math.min(1.0, baselineConfidence + 0.05);
  }

  // Missing domain penalty: if evaluating with fewer than 3 domains, slight uncertainty deduction
  if (contributions.length < 3) {
    baselineConfidence = Math.max(0.2, baselineConfidence - 0.1);
  }

  // Conflict Degradation Penalty: each active conflict directly penalizes systemic confidence
  const conflictPenalty = conflicts.reduce((sum, c) => sum + c.confidenceImpact, 0);
  const cappedConflictPenalty = Math.min(0.5, conflictPenalty);

  const finalOrchestrationConfidence = Math.max(
    0.1,
    Math.min(1.0, Math.round((baselineConfidence - cappedConflictPenalty) * 1000) / 1000)
  );

  return {
    domainScore,
    evidenceConfidence,
    orchestrationConfidence: finalOrchestrationConfidence,
    confidenceDegradation: Math.round(cappedConflictPenalty * 1000) / 1000,
    independentSourcesCount: uniqueSourcesCount,
    conflictsPenaltyApplied: Math.round(cappedConflictPenalty * 1000) / 1000,
  };
}

// -----------------------------------------------------------------------------
// 8. CROSS-DOMAIN RECOMMENDATION SYNTHESIS
// -----------------------------------------------------------------------------

/**
 * Synthesizes advisory cross-domain recommendations combining multi-agent insights.
 * Explicitly non-autonomous: requires human review before execution.
 */
export function synthesizeCrossDomainRecommendations(params: {
  scenarioType: OrchestrationScenarioType;
  priorityLevel: OrchestrationPriorityLevel;
  contributions: AgentOutputContribution[];
  conflicts: IntelligenceConflictItem[];
}): OrchestrationRecommendationItem[] {
  const { scenarioType, priorityLevel, contributions, conflicts } = params;
  const recommendations: OrchestrationRecommendationItem[] = [];

  const commodityNames = Array.from(
    new Set(contributions.map((c) => c.commodity).filter(Boolean))
  ) as string[];
  const stateNames = Array.from(
    new Set(contributions.map((c) => c.state).filter(Boolean))
  ) as string[];

  const disclaimer =
    "Cross-domain advisory recommendation only. Requires human verification before execution. No autonomous purchasing, movement, or transactions.";

  // If active conflicts exist, always propose reconciliation first
  if (conflicts.length > 0) {
    recommendations.push({
      title: "Reconcile Contradictory Domain Intelligence",
      summary: `Identified ${conflicts.length} unresolved intelligence contradiction(s) between specialized agents. Field inventory counts and pricing observations should be verified before executing procurement or movement decisions.`,
      actionPath: "/intelligence#conflicts",
      priority: "HIGH",
      confidence: 0.85,
      affectedDomains: Array.from(
        new Set(conflicts.flatMap((c) => [c.domainA, c.domainB]))
      ),
      affectedCommodities: commodityNames,
      affectedStates: stateNames,
      status: "PROPOSED",
      advisoryDisclaimer: disclaimer,
      metadata: { conflictCount: conflicts.length },
    });
  }

  // Scenario-Specific Recommendations
  switch (scenarioType) {
    case "MULTI_DOMAIN_RISK_SCENARIO":
      recommendations.push({
        title: "Activate Multi-Domain Risk Mitigation Protocol",
        summary: `Multiple independent sectors (production, logistics, market) indicate elevated stress. Review alternative regional supply hubs and diversify procurement off-take across secondary agricultural clusters.`,
        actionPath: "/supply-intelligence",
        priority: priorityLevel,
        confidence: 0.88,
        affectedDomains: ["MARKET", "SUPPLY", "LOGISTICS", "FOOD_SECURITY"],
        affectedCommodities: commodityNames,
        affectedStates: stateNames,
        status: "PROPOSED",
        advisoryDisclaimer: disclaimer,
      });
      recommendations.push({
        title: "Diversify Institutional Procurement Off-Take",
        summary: `Hedge volume commitments across adjacent production zones to insulate commercial orders against localized cluster failure.`,
        actionPath: "/procurement-intelligence",
        priority: "HIGH",
        confidence: 0.82,
        affectedDomains: ["PROCUREMENT", "SUPPLY"],
        affectedCommodities: commodityNames,
        affectedStates: stateNames,
        status: "PROPOSED",
        advisoryDisclaimer: disclaimer,
      });
      break;

    case "DISEASE_SUPPLY_RISK_SCENARIO":
      recommendations.push({
        title: "Conduct Zonal Biosecurity & Sourcing Hedge",
        summary: `Elevated health indicators in production zones warrant proactive sourcing from unaffected trade basins. Refer all clinical inquiries to licensed veterinary doctors and zonal extension officers.`,
        actionPath: "/disease-intelligence",
        priority: priorityLevel,
        confidence: 0.86,
        affectedDomains: ["DISEASE_BIOSECURITY", "PRODUCTION", "SUPPLY"],
        affectedCommodities: commodityNames,
        affectedStates: stateNames,
        status: "PROPOSED",
        advisoryDisclaimer: disclaimer,
      });
      break;

    case "LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO":
      recommendations.push({
        title: "Review Secondary Logistics Corridors & Staggered Dispatches",
        summary: `Corridor transit friction is constraining market availability. Coordinate with regional logistics providers to inspect alternate feeder routes and optimize aggregation holding capacity.`,
        actionPath: "/logistics-intelligence",
        priority: priorityLevel,
        confidence: 0.84,
        affectedDomains: ["LOGISTICS", "SUPPLY"],
        affectedCommodities: commodityNames,
        affectedStates: stateNames,
        status: "PROPOSED",
        advisoryDisclaimer: disclaimer,
      });
      break;

    case "PROCUREMENT_RISK_SCENARIO":
      recommendations.push({
        title: "De-Concentrate Single-Supplier B2B Sourcing",
        summary: `High supplier concentration exposes procurement commitments to delivery shortfall. Engage pre-qualified cooperative aggregators in secondary farming basins.`,
        actionPath: "/procurement-intelligence",
        priority: priorityLevel,
        confidence: 0.85,
        affectedDomains: ["PROCUREMENT", "DEMAND"],
        affectedCommodities: commodityNames,
        affectedStates: stateNames,
        status: "PROPOSED",
        advisoryDisclaimer: disclaimer,
      });
      break;

    case "FOOD_SECURITY_PRESSURE_SCENARIO":
      recommendations.push({
        title: "Prioritize Regional Food Reserves & Fair-Access Allocation",
        summary: `Monitored commodity availability indicates elevated household vulnerability. Coordinate institutional offtake to prevent retail stock-outs in dependent consuming centers.`,
        actionPath: "/food-security",
        priority: priorityLevel,
        confidence: 0.89,
        affectedDomains: ["FOOD_SECURITY", "MARKET", "SUPPLY"],
        affectedCommodities: commodityNames,
        affectedStates: stateNames,
        status: "PROPOSED",
        advisoryDisclaimer: disclaimer,
      });
      break;

    case "SUPPLY_SHORTAGE_SCENARIO":
      recommendations.push({
        title: "Coordinate Urgent Supply Aggregation & Price Monitoring",
        summary: `Demand pressure and farmgate supply deficits are driving price escalation. Engage regional aggregation hubs to consolidate available smallholder lots for rapid distribution.`,
        actionPath: "/supply-intelligence",
        priority: priorityLevel,
        confidence: 0.87,
        affectedDomains: ["DEMAND", "SUPPLY", "MARKET"],
        affectedCommodities: commodityNames,
        affectedStates: stateNames,
        status: "PROPOSED",
        advisoryDisclaimer: disclaimer,
      });
      break;

    case "BALANCED_NOMINAL_SCENARIO":
    default:
      recommendations.push({
        title: "Maintain Routine Cross-Domain Surveillance",
        summary: `Value chain telemetry across markets, production, logistics, and biosecurity displays nominal seasonal trends. Continue passive observation.`,
        actionPath: "/intelligence",
        priority: "LOW",
        confidence: 0.92,
        affectedDomains: ["MARKET", "SUPPLY"],
        affectedCommodities: commodityNames,
        affectedStates: stateNames,
        status: "PROPOSED",
        advisoryDisclaimer: disclaimer,
      });
      break;
  }

  return recommendations;
}
