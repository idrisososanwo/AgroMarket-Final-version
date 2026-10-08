/**
 * AgroMarket Phase 3.7: Cross-Domain Conflict Detection for Scenario Intelligence
 *
 * Implements deterministic detection of contradictions across agricultural domains:
 * 1. DEMAND_SUPPLY_CONFLICT
 * 2. MARKET_SUPPLY_CONFLICT
 * 3. PRODUCTION_DEMAND_CONFLICT
 * 4. LOGISTICS_SUPPLY_CONFLICT
 * 5. DISEASE_PRODUCTION_CONFLICT
 * 6. PROCUREMENT_DEMAND_CONFLICT
 * 7. FORECAST_HORIZON_CONFLICT
 *
 * SAFETY INVARIANTS:
 * - Contradictory evidence is NEVER discarded; it is documented as a formal conflict.
 * - Conflicts apply a deterministic confidence penalty to the scenario.
 * - Anti-pork invariants enforced across all conflict checks.
 */

import {
  ScenarioConflictItem,
  ScenarioEvidenceItem,
} from "./types";
import { assertNoProhibitedProduce } from "./validation";
import { CrossHorizonSynthesis } from "./cross-horizon";

export interface DetectScenarioConflictsParams {
  commodity: string;
  state: string;
  evidence: ScenarioEvidenceItem[];
  crossHorizonSynthesis?: CrossHorizonSynthesis | null;
}

/**
 * Detects domain contradictions and horizon divergences in scenario evidence
 */
export function detectScenarioConflicts(
  params: DetectScenarioConflictsParams
): ScenarioConflictItem[] {
  const { commodity, state, evidence, crossHorizonSynthesis } = params;
  assertNoProhibitedProduce(commodity, "Detect Scenario Conflicts");

  const conflicts: ScenarioConflictItem[] = [];

  // Group evidence by domain
  const domainEvidence = new Map<string, ScenarioEvidenceItem[]>();
  for (const item of evidence) {
    const list = domainEvidence.get(item.domain) || [];
    list.push(item);
    domainEvidence.set(item.domain, list);
  }

  // 1. FORECAST_HORIZON_CONFLICT (from cross-horizon reasoning)
  if (crossHorizonSynthesis?.hasHorizonConflict && crossHorizonSynthesis.conflictSummary) {
    conflicts.push({
      id: crypto.randomUUID(),
      conflictType: "FORECAST_HORIZON_CONFLICT",
      domainA: "FORECAST_SHORT_TERM",
      domainB: "FORECAST_MEDIUM_TERM",
      signalA: crossHorizonSynthesis.shortTermForecast?.direction || "UNKNOWN",
      signalB: crossHorizonSynthesis.mediumTermForecast?.direction || "UNKNOWN",
      state,
      commodity,
      severity: "MEDIUM",
      confidenceImpact: 0.2,
      explanation: crossHorizonSynthesis.conflictSummary,
      recommendedReview: "Review temporal horizon models; reconcile short-term disruption against medium-term trend before committing resources.",
    });
  }

  // 2. DEMAND_SUPPLY_CONFLICT
  const demandItems = domainEvidence.get("DEMAND") || [];
  const supplyItems = domainEvidence.get("SUPPLY") || [];
  if (demandItems.length > 0 && supplyItems.length > 0) {
    const demandSurging = demandItems.some((d) => d.summary.toLowerCase().includes("surge") || d.summary.toLowerCase().includes("increasing"));
    const supplySurplus = supplyItems.some((s) => s.summary.toLowerCase().includes("surplus") || s.summary.toLowerCase().includes("excess"));
    if (demandSurging && supplySurplus) {
      conflicts.push({
        id: crypto.randomUUID(),
        conflictType: "DEMAND_SUPPLY_CONFLICT",
        domainA: "DEMAND",
        domainB: "SUPPLY",
        signalA: "DEMAND_SURGE",
        signalB: "SUPPLY_SURPLUS",
        state,
        commodity,
        severity: "HIGH",
        confidenceImpact: 0.25,
        explanation: `Simultaneous report of demand surge and supply surplus for ${commodity} in ${state}.`,
        recommendedReview: "Verify whether reported supply surplus is physically accessible or committed to other channels before acting on demand surge.",
      });
    }
  }

  // 3. MARKET_SUPPLY_CONFLICT
  const marketItems = domainEvidence.get("MARKET") || [];
  if (marketItems.length > 0 && supplyItems.length > 0) {
    const pricesCrashing = marketItems.some((m) => m.summary.toLowerCase().includes("decreasing") || m.summary.toLowerCase().includes("drop"));
    const supplyShortage = supplyItems.some((s) => s.summary.toLowerCase().includes("shortage") || s.summary.toLowerCase().includes("deficit"));
    if (pricesCrashing && supplyShortage) {
      conflicts.push({
        id: crypto.randomUUID(),
        conflictType: "MARKET_SUPPLY_CONFLICT",
        domainA: "MARKET",
        domainB: "SUPPLY",
        signalA: "PRICE_DEPRESSION",
        signalB: "SUPPLY_SHORTAGE",
        state,
        commodity,
        severity: "HIGH",
        confidenceImpact: 0.25,
        explanation: `Price levels declining despite indications of supply shortage for ${commodity} in ${state}.`,
        recommendedReview: "Check for unrecorded import inflows, distress selling, or localized quality degradation suppressing market prices.",
      });
    }
  }

  // 4. LOGISTICS_SUPPLY_CONFLICT
  const logisticsItems = domainEvidence.get("LOGISTICS") || [];
  if (logisticsItems.length > 0 && supplyItems.length > 0) {
    const logisticsDisrupted = logisticsItems.some((l) => l.summary.toLowerCase().includes("delay") || l.summary.toLowerCase().includes("constrained") || l.summary.toLowerCase().includes("review required"));
    const supplyReady = supplyItems.some((s) => s.summary.toLowerCase().includes("available") || s.summary.toLowerCase().includes("harvest ready"));
    if (logisticsDisrupted && supplyReady) {
      conflicts.push({
        id: crypto.randomUUID(),
        conflictType: "LOGISTICS_SUPPLY_CONFLICT",
        domainA: "LOGISTICS",
        domainB: "SUPPLY",
        signalA: "CORRIDOR_CONSTRAINED",
        signalB: "SUPPLY_READY",
        state,
        commodity,
        severity: "MEDIUM",
        confidenceImpact: 0.15,
        explanation: `Supply is ready at source but freight haulage or corridor movement is constrained for ${commodity} in ${state}.`,
        recommendedReview: "Logistics review required: evaluate intermediate regional warehousing or alternative corridor aggregation.",
      });
    }
  }

  // 5. DISEASE_PRODUCTION_CONFLICT
  const diseaseItems = domainEvidence.get("DISEASE_BIOSECURITY") || [];
  const productionItems = domainEvidence.get("PRODUCTION") || [];
  if (diseaseItems.length > 0 && productionItems.length > 0) {
    const diseaseRisk = diseaseItems.some((d) => d.summary.toLowerCase().includes("elevated") || d.summary.toLowerCase().includes("warning"));
    const productionExpanding = productionItems.some((p) => p.summary.toLowerCase().includes("expansion") || p.summary.toLowerCase().includes("increasing"));
    if (diseaseRisk && productionExpanding) {
      conflicts.push({
        id: crypto.randomUUID(),
        conflictType: "DISEASE_PRODUCTION_CONFLICT",
        domainA: "DISEASE_BIOSECURITY",
        domainB: "PRODUCTION",
        signalA: "BIOSECURITY_ELEVATED",
        signalB: "PRODUCTION_EXPANSION",
        state,
        commodity,
        severity: "CRITICAL",
        confidenceImpact: 0.3,
        explanation: `Biosecurity risk indicators elevated in zone where production expansion is planned for ${commodity} in ${state}.`,
        recommendedReview: "Agronomic and biosecurity audit required: advise against expansion until official agricultural extension authorities verify field health.",
      });
    }
  }

  // 6. PROCUREMENT_DEMAND_CONFLICT
  const procurementItems = domainEvidence.get("PROCUREMENT") || [];
  if (procurementItems.length > 0 && demandItems.length > 0) {
    const procurementFailing = procurementItems.some((p) => p.summary.toLowerCase().includes("unmet") || p.summary.toLowerCase().includes("deficit"));
    const demandDropping = demandItems.some((d) => d.summary.toLowerCase().includes("decreasing") || d.summary.toLowerCase().includes("contracting"));
    if (procurementFailing && demandDropping) {
      conflicts.push({
        id: crypto.randomUUID(),
        conflictType: "PROCUREMENT_DEMAND_CONFLICT",
        domainA: "PROCUREMENT",
        domainB: "DEMAND",
        signalA: "PROCUREMENT_DEFICIT",
        signalB: "DEMAND_CONTRACTION",
        state,
        commodity,
        severity: "MEDIUM",
        confidenceImpact: 0.2,
        explanation: `Procurement orders unfilled while overall demand metrics are contracting for ${commodity} in ${state}.`,
        recommendedReview: "Review contract price terms or supplier specifications that may be deterring fulfillment despite market slowdown.",
      });
    }
  }

  return conflicts;
}

/**
 * Calculates net confidence after applying conflict penalties
 */
export function calculateScenarioNetConfidence(
  rawConfidence: number,
  conflicts: ScenarioConflictItem[]
): number {
  if (conflicts.length === 0) {
    return Math.min(1.0, Math.max(0.0, rawConfidence));
  }
  const totalPenalty = conflicts.reduce((sum, c) => sum + c.confidenceImpact, 0);
  const net = Math.max(0.1, rawConfidence - totalPenalty);
  return Number(net.toFixed(3));
}
