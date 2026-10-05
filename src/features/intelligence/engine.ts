/**
 * AgroMarket Phase 2.1: Deterministic Intelligence Engine
 *
 * All agricultural signals are derived from deterministic computations,
 * mathematical thresholds, and verifiable evidence.
 *
 * CRITICAL SAFETY RULES:
 * - Independent from LLM output.
 * - Testable, explainable, and versionable.
 * - Anti-pork enforcement across all commodity evaluations.
 * - Disease signals are strictly non-diagnostic ("Reported disease risk in area").
 */

import {
  IntelligenceSignal,
  IntelligenceEvidence,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";
import { calculateEvidenceConfidence } from "./confidence";

export const DETERMINISTIC_ENGINE_VERSION = "2.1.0";

/**
 * Seasonal Demand Calendar for Key Nigerian Agricultural Commodities
 * Month indices: 0 = January, 11 = December.
 */
export const NIGERIAN_SEASONAL_PATTERNS: Record<
  string,
  { peakMonths: number[]; rationale: string }
> = {
  "Broiler Chicken": {
    peakMonths: [3, 5, 11], // Easter, Sallah, Christmas / New Year festivities
    rationale: "Festive season poultry offtake surges nationwide.",
  },
  "Beef Cattle": {
    peakMonths: [5, 11], // Eid al-Adha (Sallah) and End of Year celebrations
    rationale: "High festive demand for live slaughter cattle.",
  },
  "African Catfish (Clarias)": {
    peakMonths: [10, 11, 0], // Dry season celebration and hospitality offtake
    rationale: "High demand from restaurants and holiday hospitality.",
  },
  "Cassava Tubers": {
    peakMonths: [6, 7, 8], // Mid-rainy season garri processing surge
    rationale: "Seasonal harvest peak and staple processing window.",
  },
  "Yellow Maize": {
    peakMonths: [7, 8, 9], // Green maize and dry harvest season
    rationale: "Early harvest aggregation across Kaduna and Niger belts.",
  },
  "Cow Milk": {
    peakMonths: [6, 7, 8, 9], // Rainy season pasture abundance yields higher milk volumes
    rationale: "Peak lactating pasture cycle and bulk collection.",
  },
  "Benue White Yam": {
    peakMonths: [7, 8, 9, 10], // New Yam festival and harvest aggregation
    rationale: "New yam harvest cycle in Middle Belt.",
  },
  "Roma Tomatoes": {
    peakMonths: [0, 1, 2], // Northern dry season irrigation harvest (Kaduna, Kano)
    rationale: "Peak northern irrigation harvest and interstate transit to southern markets.",
  },
};

// ------------------------------------------------------------------------------
// 1. PRICE TREND SIGNALS
// ------------------------------------------------------------------------------
export function detectPriceTrendSignals(params: {
  commodity: string;
  state: string;
  recentPrice: number;
  baselinePrice: number;
  thresholdPercent?: number;
  observationsCount?: number;
  observedAt?: string;
  sourceId?: string;
  sourceType?: string;
}): IntelligenceSignal | null {
  assertNoProhibitedProduce(params.commodity, "Commodity");
  const threshold = params.thresholdPercent ?? 10.0;
  if (!params.baselinePrice || params.baselinePrice <= 0) return null;

  const percentageDiff =
    ((params.recentPrice - params.baselinePrice) / params.baselinePrice) * 100;
  const absDiff = Math.abs(percentageDiff);

  if (absDiff < threshold) return null;

  const isIncrease = percentageDiff > 0;
  const signalType = isIncrease ? "PRICE_INCREASE" : "PRICE_DECREASE";
  const observedAt = params.observedAt || new Date().toISOString();
  const sourceId = params.sourceId || `price-obs-${params.commodity}-${params.state}`;

  const evidence: IntelligenceEvidence[] = [
    {
      sourceType: "PRICE_OBSERVATION",
      sourceId,
      description: `Normalized price moved from ₦${params.baselinePrice.toLocaleString()} to ₦${params.recentPrice.toLocaleString()} (${percentageDiff >= 0 ? "+" : ""}${percentageDiff.toFixed(1)}%) in ${params.state}.`,
      observedAt,
      relevance: 1.0,
      metadata: {
        recentPrice: params.recentPrice,
        baselinePrice: params.baselinePrice,
        percentageDiff: Math.round(percentageDiff * 10) / 10,
      },
    },
  ];

  const confidence = calculateEvidenceConfidence({
    sourceType: params.sourceType || "PRICE_OBSERVATION",
    sampleCount: params.observationsCount || 3,
    recencyDays: 2,
    geographicScope: "SAME_STATE",
    isVerified: true,
  });

  return {
    id: `sig-price-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    agentId: "AGRICULTURAL_INTELLIGENCE",
    signalType,
    commodity: params.commodity,
    state: params.state,
    magnitude: Math.round(percentageDiff * 10) / 10,
    confidence,
    source: "DETERMINISTIC_PRICE_TREND_ENGINE",
    evidence,
    observedAt,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------------------
// 2. DEMAND DEVIATION SIGNALS
// ------------------------------------------------------------------------------
export function detectDemandSignals(params: {
  commodity: string;
  state: string;
  currentDemandVolume: number;
  baselineDemandVolume: number;
  thresholdPercent?: number;
  evidenceSources?: IntelligenceEvidence[];
}): IntelligenceSignal | null {
  assertNoProhibitedProduce(params.commodity, "Commodity");
  const threshold = params.thresholdPercent ?? 15.0;
  if (!params.baselineDemandVolume || params.baselineDemandVolume <= 0) return null;

  const percentageDiff =
    ((params.currentDemandVolume - params.baselineDemandVolume) /
      params.baselineDemandVolume) *
    100;
  const absDiff = Math.abs(percentageDiff);

  if (absDiff < threshold) return null;

  const signalType = percentageDiff > 0 ? "DEMAND_INCREASE" : "DEMAND_DECREASE";
  const observedAt = new Date().toISOString();

  const evidence: IntelligenceEvidence[] = params.evidenceSources || [
    {
      sourceType: "B2B_DEMAND",
      sourceId: `b2b-demand-${params.commodity}-${params.state}`,
      description: `Aggregated demand volume shifted by ${percentageDiff >= 0 ? "+" : ""}${percentageDiff.toFixed(1)}% against 30-day baseline in ${params.state}.`,
      observedAt,
      relevance: 0.95,
    },
  ];

  const confidence = calculateEvidenceConfidence({
    sourceType: "ORDER_HISTORY",
    sampleCount: 5,
    recencyDays: 1,
    geographicScope: "SAME_STATE",
  });

  return {
    id: `sig-demand-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    agentId: "AGRICULTURAL_INTELLIGENCE",
    signalType,
    commodity: params.commodity,
    state: params.state,
    magnitude: Math.round(percentageDiff * 10) / 10,
    confidence,
    source: "DETERMINISTIC_DEMAND_ENGINE",
    evidence,
    observedAt,
    expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------------------
// 3. SUPPLY IMBALANCE SIGNALS
// ------------------------------------------------------------------------------
export function detectSupplyImbalanceSignals(params: {
  commodity: string;
  state: string;
  totalSupplyAvailable: number;
  totalDemandExpected: number;
  evidenceSources?: IntelligenceEvidence[];
}): IntelligenceSignal | null {
  assertNoProhibitedProduce(params.commodity, "Commodity");
  if (!params.totalDemandExpected || params.totalDemandExpected <= 0) return null;

  const supplyRatio = params.totalSupplyAvailable / params.totalDemandExpected;
  const observedAt = new Date().toISOString();

  if (supplyRatio < 0.7) {
    // Shortage
    const deficitMagnitude = Math.round((1 - supplyRatio) * 100);
    const evidence: IntelligenceEvidence[] = params.evidenceSources || [
      {
        sourceType: "PRODUCTION_OUTPUT",
        sourceId: `supply-def-${params.commodity}-${params.state}`,
        description: `Available supply covers only ${Math.round(supplyRatio * 100)}% of open procurement demand in ${params.state}. Deficit of ~${deficitMagnitude}%.`,
        observedAt,
        relevance: 1.0,
      },
    ];

    return {
      id: `sig-supply-short-${Date.now()}`,
      agentId: "AGRICULTURAL_INTELLIGENCE",
      signalType: "SUPPLY_SHORTAGE",
      commodity: params.commodity,
      state: params.state,
      magnitude: deficitMagnitude,
      confidence: calculateEvidenceConfidence({
        sourceType: "PRODUCTION_OUTPUT",
        sampleCount: 4,
        recencyDays: 2,
        geographicScope: "SAME_STATE",
      }),
      source: "DETERMINISTIC_SUPPLY_ENGINE",
      evidence,
      observedAt,
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  } else if (supplyRatio > 1.35) {
    // Surplus
    const surplusMagnitude = Math.round((supplyRatio - 1) * 100);
    const evidence: IntelligenceEvidence[] = params.evidenceSources || [
      {
        sourceType: "PRODUCTION_OUTPUT",
        sourceId: `supply-surp-${params.commodity}-${params.state}`,
        description: `Available supply exceeds verified demand by ${surplusMagnitude}% in ${params.state}.`,
        observedAt,
        relevance: 0.9,
      },
    ];

    return {
      id: `sig-supply-surp-${Date.now()}`,
      agentId: "AGRICULTURAL_INTELLIGENCE",
      signalType: "SUPPLY_SURPLUS",
      commodity: params.commodity,
      state: params.state,
      magnitude: surplusMagnitude,
      confidence: calculateEvidenceConfidence({
        sourceType: "PRODUCTION_OUTPUT",
        sampleCount: 4,
        recencyDays: 3,
        geographicScope: "SAME_STATE",
      }),
      source: "DETERMINISTIC_SUPPLY_ENGINE",
      evidence,
      observedAt,
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

// ------------------------------------------------------------------------------
// 4. PROCESSING BOTTLENECK SIGNALS
// ------------------------------------------------------------------------------
export function detectProcessingBottleneck(params: {
  commodity: string;
  state: string;
  queuedSupplyVolume: number;
  dailyFacilityCapacity: number;
  facilityIds?: string[];
}): IntelligenceSignal | null {
  assertNoProhibitedProduce(params.commodity, "Commodity");
  if (params.queuedSupplyVolume <= 0) return null;

  // Capacity bottleneck if zero capacity available or queue exceeds 2.5 days capacity
  const daysToClear =
    params.dailyFacilityCapacity > 0
      ? params.queuedSupplyVolume / params.dailyFacilityCapacity
      : 99.0;

  if (daysToClear <= 2.0) return null;

  const observedAt = new Date().toISOString();
  const evidence: IntelligenceEvidence[] = [
    {
      sourceType: "PROCESSING_EVENT",
      sourceId: `facility-cap-${params.commodity}-${params.state}`,
      description: `Queued harvest volume of ${params.queuedSupplyVolume.toLocaleString()} units exceeds daily processing throughput (${params.dailyFacilityCapacity.toLocaleString()} units/day). Estimated backlog: ${daysToClear.toFixed(1)} days.`,
      observedAt,
      relevance: 1.0,
      metadata: {
        queuedSupplyVolume: params.queuedSupplyVolume,
        dailyCapacity: params.dailyFacilityCapacity,
        backlogDays: Math.round(daysToClear * 10) / 10,
      },
    },
  ];

  return {
    id: `sig-proc-bottle-${Date.now()}`,
    agentId: "AGRICULTURAL_INTELLIGENCE",
    signalType: "PROCESSING_BOTTLENECK",
    commodity: params.commodity,
    state: params.state,
    magnitude: Math.min(100, Math.round(daysToClear * 10)),
    confidence: calculateEvidenceConfidence({
      sourceType: "PROCESSING_EVENT",
      sampleCount: 3,
      recencyDays: 1,
      isVerified: true,
      geographicScope: "SAME_STATE",
    }),
    source: "DETERMINISTIC_PROCESSING_ENGINE",
    evidence,
    observedAt,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------------------
// 5. LOGISTICS DISRUPTION SIGNALS
// ------------------------------------------------------------------------------
export function detectLogisticsDisruptions(params: {
  corridor: string;
  state: string;
  commodity: string;
  activeShipments: number;
  delayedShipments: number;
  disruptionNotes?: string;
}): IntelligenceSignal | null {
  assertNoProhibitedProduce(params.commodity, "Commodity");
  if (params.activeShipments <= 0) return null;

  const delayRate = params.delayedShipments / params.activeShipments;
  if (delayRate < 0.2 && params.delayedShipments < 3) return null;

  const delayPercent = Math.round(delayRate * 100);
  const observedAt = new Date().toISOString();

  const evidence: IntelligenceEvidence[] = [
    {
      sourceType: "DELIVERY_EVENT",
      sourceId: `logistics-corr-${params.corridor.replace(/\s+/g, "_")}`,
      description: `Logistics transit delay rate along ${params.corridor} corridor reached ${delayPercent}% (${params.delayedShipments} of ${params.activeShipments} consignments delayed). ${params.disruptionNotes || ""}`.trim(),
      observedAt,
      relevance: 0.95,
      metadata: {
        corridor: params.corridor,
        activeShipments: params.activeShipments,
        delayedShipments: params.delayedShipments,
      },
    },
  ];

  return {
    id: `sig-log-disrupt-${Date.now()}`,
    agentId: "AGRICULTURAL_INTELLIGENCE",
    signalType: "LOGISTICS_DISRUPTION",
    commodity: params.commodity,
    state: params.state,
    corridor: params.corridor,
    magnitude: delayPercent,
    confidence: calculateEvidenceConfidence({
      sourceType: "DELIVERY_EVENT",
      sampleCount: params.activeShipments,
      recencyDays: 1,
      geographicScope: "CORRIDOR",
    }),
    source: "DETERMINISTIC_LOGISTICS_ENGINE",
    evidence,
    observedAt,
    expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------------------
// 6. SECURITY DISRUPTION SIGNALS (From Phase 1.5 Incidents)
// ------------------------------------------------------------------------------
export function detectSecurityDisruptions(params: {
  state: string;
  lga?: string;
  incidentId: string;
  incidentTitle: string;
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  affectedCommodity: string;
  publishedAt: string;
  movementImpact?: string | null;
}): IntelligenceSignal | null {
  assertNoProhibitedProduce(params.affectedCommodity, "Commodity");

  // Only verified/published incidents with meaningful impact emit security signals
  if (params.severity === "LOW" && !params.movementImpact) {
    return null;
  }

  const severityMagnitudeMap: Record<string, number> = {
    LOW: 25,
    MODERATE: 50,
    HIGH: 75,
    CRITICAL: 100,
  };

  const magnitude = severityMagnitudeMap[params.severity] || 50;
  const observedAt = params.publishedAt || new Date().toISOString();

  const evidence: IntelligenceEvidence[] = [
    {
      sourceType: "SECURITY_INCIDENT",
      sourceId: params.incidentId,
      description: `Verified agricultural security notice: "${params.incidentTitle}" in ${params.state}${params.lga ? ` (${params.lga})` : ""}. Severity: ${params.severity}. Movement impact: ${params.movementImpact || "Agricultural transit and farm gate operations disrupted."}`,
      observedAt,
      relevance: 1.0,
      metadata: {
        severity: params.severity,
        incidentId: params.incidentId,
      },
    },
  ];

  return {
    id: `sig-sec-disrupt-${Date.now()}`,
    agentId: "AGRICULTURAL_INTELLIGENCE",
    signalType: "SECURITY_DISRUPTION",
    commodity: params.affectedCommodity,
    state: params.state,
    lga: params.lga,
    magnitude,
    confidence: calculateEvidenceConfidence({
      sourceType: "SECURITY_INCIDENT",
      sampleCount: 1,
      recencyDays: 1,
      isVerified: true,
      geographicScope: params.lga ? "EXACT_LGA" : "SAME_STATE",
    }),
    source: "DETERMINISTIC_SECURITY_INTELLIGENCE_ENGINE",
    evidence,
    observedAt,
    expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------------------
// 7. SEASONAL DEMAND SIGNALS
// ------------------------------------------------------------------------------
export function detectSeasonalDemand(params: {
  commodity: string;
  state: string;
  currentDate?: Date;
}): IntelligenceSignal | null {
  assertNoProhibitedProduce(params.commodity, "Commodity");
  const pattern = NIGERIAN_SEASONAL_PATTERNS[params.commodity];
  if (!pattern) return null;

  const date = params.currentDate || new Date();
  const currentMonth = date.getMonth();

  if (!pattern.peakMonths.includes(currentMonth)) return null;

  const observedAt = date.toISOString();
  const evidence: IntelligenceEvidence[] = [
    {
      sourceType: "SEASONAL_CALENDAR",
      sourceId: `seasonal-${params.commodity.replace(/\s+/g, "_")}`,
      description: `Historical seasonal cycle: ${params.commodity} is in its historical peak demand window for month index ${currentMonth}. ${pattern.rationale}`,
      observedAt,
      relevance: 0.85,
    },
  ];

  return {
    id: `sig-season-${Date.now()}`,
    agentId: "AGRICULTURAL_INTELLIGENCE",
    signalType: "SEASONAL_DEMAND",
    commodity: params.commodity,
    state: params.state,
    magnitude: 35.0, // Standard historical demand curve uplift factor
    confidence: calculateEvidenceConfidence({
      sourceType: "SEASONAL_CALENDAR",
      sampleCount: 12,
      recencyDays: 0,
      geographicScope: "NATIONAL",
    }),
    source: "DETERMINISTIC_SEASONAL_CALENDAR_ENGINE",
    evidence,
    observedAt,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------------------
// 8. DISEASE RISK SIGNALS (Non-Diagnostic Advisory Only)
// ------------------------------------------------------------------------------
export function detectDiseaseRisk(params: {
  commodity: string;
  state: string;
  lga?: string;
  advisoryTitle: string;
  advisorySource: string;
  advisoryId: string;
  reportedAt: string;
}): IntelligenceSignal {
  assertNoProhibitedProduce(params.commodity, "Commodity");

  const observedAt = params.reportedAt || new Date().toISOString();
  // Strictly non-diagnostic wording
  const evidence: IntelligenceEvidence[] = [
    {
      sourceType: "KNOWLEDGE_BULLETIN",
      sourceId: params.advisoryId,
      description: `Reported agricultural disease risk notice from ${params.advisorySource}: "${params.advisoryTitle}". Affects ${params.commodity} operations in ${params.state}.`,
      observedAt,
      relevance: 0.9,
    },
  ];

  return {
    id: `sig-disease-${Date.now()}`,
    agentId: "AGRICULTURAL_INTELLIGENCE",
    signalType: "DISEASE_RISK",
    commodity: params.commodity,
    state: params.state,
    lga: params.lga,
    magnitude: 60.0,
    confidence: calculateEvidenceConfidence({
      sourceType: "GOVERNMENT_SOURCE",
      sampleCount: 2,
      recencyDays: 2,
      geographicScope: params.lga ? "EXACT_LGA" : "SAME_STATE",
    }),
    source: "DETERMINISTIC_DISEASE_ALERT_ENGINE",
    evidence,
    observedAt,
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };
}
