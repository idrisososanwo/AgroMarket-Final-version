/**
 * AgroMarket Phase 3.7: Master Scenario Modeling Engine
 * Orchestrates multi-horizon forecasts, cross-domain conflict detection,
 * deterministic trigger rules, and forward planning implications.
 *
 * Implements:
 * CURRENT CONDITIONS + FORECASTS -> CROSS-HORIZON REASONING -> SCENARIO CANDIDATE ->
 * CONFLICT PENALTIES -> PLANNING IMPLICATIONS -> IMMUTABLE SCENARIO ARTIFACT
 */

import {
  AgriculturalScenario,
  ScenarioDependency,
  ScenarioEvidenceItem,
  ScenarioGenerationOptions,
  ScenarioStatus,
  ScenarioType,
} from "./types";
import {
  assertNoPrivateInformation,
  assertNoProhibitedProduce,
  resolveScenarioHorizonDates,
  scenarioGenerationOptionsSchema,
} from "./validation";
import { synthesizeCrossHorizonForecasts } from "./cross-horizon";
import {
  calculateScenarioNetConfidence,
  detectScenarioConflicts,
} from "./conflict-detection";
import { evaluateScenarioTriggerRules } from "./scenario-rules";
import { generatePlanningImplications } from "./planning-implications";
import { getForecastsByCommodity } from "@/features/forecasting/data-layer";
import { MultiHorizonForecast } from "@/features/forecasting/types";

export interface GenerateScenarioParams extends ScenarioGenerationOptions {
  evidence?: ScenarioEvidenceItem[];
  knownForecasts?: MultiHorizonForecast[];
  dependencies?: ScenarioDependency[];
  constraints?: string[];
}

/**
 * Generates an authoritative, immutable AgriculturalScenario
 */
export async function generateAgriculturalScenario(
  params: GenerateScenarioParams
): Promise<AgriculturalScenario> {
  // 1. Validate inputs
  assertNoProhibitedProduce(params, "Generate Agricultural Scenario");
  assertNoPrivateInformation(params, "Generate Agricultural Scenario");
  scenarioGenerationOptionsSchema.parse(params);

  const {
    domain,
    commodity,
    category = null,
    state,
    lga = null,
    horizon = "CROSS_HORIZON",
    customStartDate,
    customEndDate,
    dependencies = [],
    constraints = [],
  } = params;

  // 2. Fetch or reuse supporting forecasts
  let forecasts: MultiHorizonForecast[] = params.knownForecasts || [];
  if (forecasts.length === 0) {
    try {
      const allCommodityForecasts = await getForecastsByCommodity(commodity);
      forecasts = allCommodityForecasts.filter((f) => !state || f.state === state);
    } catch {
      forecasts = [];
    }
  }

  // 3. Assemble evidence items from forecasts and parameters
  const evidence: ScenarioEvidenceItem[] = [...(params.evidence || [])];
  for (const fc of forecasts) {
    evidence.push({
      id: crypto.randomUUID(),
      sourceType: "FORECAST",
      sourceId: fc.id,
      domain: fc.domain,
      summary: `[${fc.timeHorizon}] ${fc.metricName}: ${fc.direction} (Predicted: ${fc.predictedValue ?? "N/A"})`,
      timestamp: fc.createdAt,
      confidence: fc.confidence ?? 0.5,
      dataQualityScore: fc.dataCompleteness,
      metricName: fc.metricName,
      observedValue: fc.predictedValue ?? undefined,
      timeHorizon: fc.timeHorizon,
    });
  }

  // 4. Synthesize Cross-Horizon Reasoning
  const crossHorizon = synthesizeCrossHorizonForecasts(forecasts, commodity);

  // 5. Detect Cross-Domain and Horizon Conflicts
  const conflicts = detectScenarioConflicts({
    commodity,
    state,
    evidence,
    crossHorizonSynthesis: crossHorizon,
  });

  // 6. Evaluate Deterministic Trigger Rules
  const triggerEval = evaluateScenarioTriggerRules({
    commodity,
    state,
    evidence,
    crossHorizonSynthesis: crossHorizon,
  });

  // 7. Calculate Net Confidence after conflict penalties
  const netConfidence = calculateScenarioNetConfidence(
    triggerEval.confidenceScore,
    conflicts
  );

  // Re-map confidence level after penalty if applicable
  let confidenceLevel = triggerEval.confidenceLevel;
  if (confidenceLevel !== "INSUFFICIENT_DATA") {
    if (netConfidence >= 0.7) confidenceLevel = "HIGH";
    else if (netConfidence >= 0.4) confidenceLevel = "MODERATE";
    else confidenceLevel = "LOW";
  }

  // 8. Resolve horizon dates
  const { startDate, endDate } = resolveScenarioHorizonDates(
    horizon,
    customStartDate,
    customEndDate
  );

  // 9. Derive Forward Planning Implications
  const planningImplications = generatePlanningImplications({
    scenarioType: triggerEval.matchedType,
    commodity,
    state,
    lga,
    priorityScore: netConfidence * 100,
  });

  // 10. Default dependencies and constraints if none provided
  const resolvedDependencies: ScenarioDependency[] = [...dependencies];
  if (resolvedDependencies.length === 0) {
    resolvedDependencies.push({
      dependencyId: `dep-${state.toLowerCase()}-corridor`,
      dependencyType: "CORRIDOR",
      name: `${state} Transport & Inter-State Transit Corridor`,
      state,
      criticality: "HIGH",
      status: conflicts.some((c) => c.conflictType === "LOGISTICS_SUPPLY_CONFLICT")
        ? "CONSTRAINED"
        : "OPERATIONAL",
      description: "Primary regional logistics arterial connecting local aggregation hubs to terminal markets.",
    });
  }

  const resolvedConstraints: string[] = [...constraints];
  if (triggerEval.matchedType === "LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO") {
    resolvedConstraints.push("CORRIDOR_REVIEW_REQUIRED: Transit route requires logistics operator confirmation.");
  }
  if (triggerEval.matchedType === "DISEASE_SUPPLY_RISK_SCENARIO") {
    resolvedConstraints.push("BIOSECURITY_RESTRICTION: Movement health certificates recommended prior to shipment.");
  }

  // Determine expected direction from forecasts or trigger rules
  const expectedDirection =
    crossHorizon.shortTermForecast?.direction ||
    (triggerEval.matchedType === "SUPPLY_SHORTAGE_SCENARIO" || triggerEval.matchedType === "DEMAND_SURGE_SCENARIO"
      ? "INCREASING"
      : triggerEval.matchedType === "SUPPLY_SURPLUS_SCENARIO"
      ? "DECREASING"
      : "STABLE");

  // Title and Description
  const title = formatScenarioTitle(triggerEval.matchedType, commodity, state);
  const description = `${title}. Expected impact: ${triggerEval.expectedImpact}`;

  // Initial status: FOOD_SECURITY requires human REVIEW; otherwise ACTIVE (or INSUFFICIENT_DATA)
  let initialStatus: ScenarioStatus = "ACTIVE";
  if (triggerEval.probabilityClass === "INSUFFICIENT_DATA") {
    initialStatus = "DRAFT";
  } else if (triggerEval.matchedType === "FOOD_SECURITY_PRESSURE_SCENARIO") {
    initialStatus = "REVIEW";
  }

  return {
    id: crypto.randomUUID(),
    scenarioType: triggerEval.matchedType,
    title,
    description,
    domain,
    commodity,
    category,
    state,
    lga,
    horizon,
    startDate,
    endDate,
    probabilityClass: triggerEval.probabilityClass,
    confidence: netConfidence,
    confidenceLevel,
    evidence,
    triggeringConditions: triggerEval.triggeringConditions,
    supportingForecastIds: forecasts.map((f) => f.id),
    dependencies: resolvedDependencies,
    constraints: resolvedConstraints,
    expectedDirection,
    expectedImpact: triggerEval.expectedImpact,
    foodSecurityImplication: triggerEval.foodSecurityImplication,
    marketImplication: triggerEval.marketImplication,
    productionImplication: triggerEval.productionImplication,
    demandImplication: triggerEval.demandImplication,
    logisticsImplication: triggerEval.logisticsImplication,
    procurementImplication: triggerEval.procurementImplication,
    diseaseOrBiosecurityImplication: triggerEval.diseaseOrBiosecurityImplication,
    resilienceImplication: triggerEval.resilienceImplication,
    planningImplications,
    status: initialStatus,
    version: 1,
    previousScenarioId: null,
    evaluationStatus: "PENDING",
    evaluationId: null,
    supersededAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates an immutable new version of an existing scenario
 */
export async function createScenarioVersion(
  existingScenario: AgriculturalScenario,
  updatedOptions: Partial<GenerateScenarioParams>
): Promise<AgriculturalScenario> {
  assertNoProhibitedProduce(existingScenario.commodity, "Scenario Versioning");

  const newScenario = await generateAgriculturalScenario({
    domain: existingScenario.domain,
    commodity: existingScenario.commodity,
    category: existingScenario.category || undefined,
    state: existingScenario.state,
    lga: existingScenario.lga || undefined,
    horizon: existingScenario.horizon,
    ...updatedOptions,
  });

  return {
    ...newScenario,
    id: crypto.randomUUID(),
    version: existingScenario.version + 1,
    previousScenarioId: existingScenario.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validates and applies server-authoritative lifecycle transitions
 */
export function transitionScenarioStatus(
  currentStatus: ScenarioStatus,
  targetStatus: ScenarioStatus
): { isValid: boolean; error?: string } {
  const validTransitions: Record<ScenarioStatus, ScenarioStatus[]> = {
    DRAFT: ["REVIEW", "ACTIVE", "CANCELLED"],
    REVIEW: ["ACTIVE", "CANCELLED"],
    ACTIVE: ["EXPIRED", "EVALUATED", "ARCHIVED", "CANCELLED"],
    EXPIRED: ["EVALUATED", "ARCHIVED", "CANCELLED"],
    EVALUATED: ["ARCHIVED"],
    ARCHIVED: [],
    CANCELLED: [],
  };

  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      isValid: false,
      error: `Illegal state transition from ${currentStatus} to ${targetStatus}.`,
    };
  }

  return { isValid: true };
}

function formatScenarioTitle(type: ScenarioType, commodity: string, state: string): string {
  const typeMap: Record<ScenarioType, string> = {
    BALANCED_NOMINAL_SCENARIO: "Balanced Market Outlook",
    DEMAND_SURGE_SCENARIO: "Demand Surge Outlook",
    SUPPLY_SHORTAGE_SCENARIO: "Supply Shortage Risk",
    SUPPLY_SURPLUS_SCENARIO: "Harvest Surplus Outlook",
    MARKET_PRESSURE_SCENARIO: "Wholesale Market Volatility",
    LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO: "Transit Corridor Supply Bottleneck",
    PROCESSING_BOTTLENECK_SCENARIO: "Processing Capacity Bottleneck",
    DISEASE_SUPPLY_RISK_SCENARIO: "Biosecurity Supply Exposure Advisory",
    PROCUREMENT_RISK_SCENARIO: "B2B Procurement Deficit Risk",
    FOOD_SECURITY_PRESSURE_SCENARIO: "Regional Food Security Pressure Advisory",
    RESILIENCE_STRESS_SCENARIO: "Corridor Resilience Stress Advisory",
    MULTI_DOMAIN_RISK_SCENARIO: "Multi-Domain Systemic Risk Advisory",
  };

  return `${commodity} in ${state}: ${typeMap[type] || type}`;
}
