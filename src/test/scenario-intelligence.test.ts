/**
 * AgroMarket Phase 3.7: Cross-Horizon Scenario Modeling & Forward Planning Tests
 * Comprehensive deterministic test suite verifying:
 * 1. All 12 canonical scenario types
 * 2. Cross-horizon convergence & trajectory reasoning
 * 3. Conflicting forecasts & cross-domain conflict penalties
 * 4. Insufficient data governance (< 2 signals)
 * 5. Confidence calculation & calibration
 * 6. Evidence provenance & traceability
 * 7. Scenario immutability, lineage, and versioning
 * 8. Server-authoritative lifecycle transitions
 * 9. Evaluation & Phase 3.4 learning signal integration
 * 10. Anti-pork, Privacy, Security, Disease, Food Security, and Asset-Light invariants
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateAgriculturalScenario,
  createScenarioVersion,
  transitionScenarioStatus,
} from "@/features/scenario-intelligence/scenario-engine";
import {
  synthesizeCrossHorizonForecasts,
} from "@/features/scenario-intelligence/cross-horizon";
import {
  detectScenarioConflicts,
  calculateScenarioNetConfidence,
} from "@/features/scenario-intelligence/conflict-detection";
import {
  evaluateScenarioTriggerRules,
} from "@/features/scenario-intelligence/scenario-rules";
import {
  generatePlanningImplications,
} from "@/features/scenario-intelligence/planning-implications";
import {
  evaluateScenarioAgainstOutcome,
} from "@/features/scenario-intelligence/evaluation";
import {
  assertNoPrivateInformation,
  assertNoProhibitedProduce,
  containsPrivateInformation,
  isProhibitedProduce,
  scenarioGenerationOptionsSchema,
  resolveScenarioHorizonDates,
} from "@/features/scenario-intelligence/validation";
import {
  saveScenario,
  getScenarioById,
  getScenariosByCommodity,
  getScenariosByDomain,
  getScenarioHistory,
  updateScenarioStatus,
  saveScenarioConflict,
  seedInMemoryScenarios,
  clearInMemoryScenarios,
} from "@/features/scenario-intelligence/data-layer";
import { MultiHorizonForecast } from "@/features/forecasting/types";
import { clearInMemoryForecasts } from "@/features/forecasting/data-layer";
import { ScenarioEvidenceItem } from "@/features/scenario-intelligence/types";

describe("Phase 3.7: Cross-Horizon Scenario Modeling & Forward Planning Intelligence", () => {
  beforeEach(() => {
    clearInMemoryForecasts();
    clearInMemoryScenarios();
  });

  // Helper to generate mock forecast
  function createMockForecast(
    horizon: "SHORT_TERM_0_7D" | "MEDIUM_TERM_8_30D" | "LONG_TERM_31_90D",
    direction: "INCREASING" | "DECREASING" | "STABLE" | "VOLATILE",
    domain: "MARKET" | "DEMAND" | "SUPPLY" | "LOGISTICS" = "MARKET"
  ): MultiHorizonForecast {
    return {
      id: crypto.randomUUID(),
      domain,
      metricName: "WHOLESALE_PRICE",
      commodity: "White Maize",
      state: "Kaduna",
      timeHorizon: horizon,
      forecastPeriodDays: horizon === "SHORT_TERM_0_7D" ? 7 : horizon === "MEDIUM_TERM_8_30D" ? 30 : 90,
      forecastStartDate: new Date().toISOString(),
      forecastEndDate: new Date().toISOString(),
      targetDate: new Date().toISOString(),
      currentValue: 1200,
      baselineValue: 1150,
      predictedValue: 1300,
      predictedRangeLow: 1250,
      predictedRangeHigh: 1350,
      expectedDelta: 100,
      expectedPercentageDelta: 8.3,
      direction,
      confidence: 0.8,
      confidenceLevel: "HIGH",
      sampleSize: 10,
      dataCompleteness: 0.9,
      methodName: "TREND_EXTRAPOLATION",
      evidence: [],
      status: "ACTIVE",
      version: 1,
      evaluationStatus: "PENDING",
      explanation: "Mock forecast",
      limitations: "None",
      governanceNote: "Advisory only",
      agentId: "MARKET_INTELLIGENCE_AGENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Helper to generate mock evidence
  function createMockEvidence(domain: string, summary: string, confidence: number = 0.8): ScenarioEvidenceItem {
    return {
      id: crypto.randomUUID(),
      sourceType: "OBSERVATION",
      sourceId: "obs-1",
      domain,
      summary,
      timestamp: new Date().toISOString(),
      confidence,
    };
  }

  // ---------------------------------------------------------------------------
  // 1. All 12 Canonical Scenario Types
  // ---------------------------------------------------------------------------
  describe("12 Canonical Scenario Types Triggering", () => {
    it("1. triggers BALANCED_NOMINAL_SCENARIO when indicators are within baseline bands", async () => {
      const evidence = [
        createMockEvidence("MARKET", "Prices are stable and within 5% of 30-day baseline."),
        createMockEvidence("SUPPLY", "Harvest arrivals are normal."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "White Maize",
        state: "Kaduna",
        evidence,
      });
      expect(evaluation.matchedType).toBe("BALANCED_NOMINAL_SCENARIO");
      expect(evaluation.probabilityClass).toBe("LOW_LIKELIHOOD");
    });

    it("2. triggers DEMAND_SURGE_SCENARIO when demand increases faster than supply", () => {
      const evidence = [
        createMockEvidence("DEMAND", "Buyer search volume and order velocity surge by 45%."),
        createMockEvidence("MARKET", "Spot inquiries increasing."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "Soybeans",
        state: "Benue",
        evidence,
      });
      expect(evaluation.matchedType).toBe("DEMAND_SURGE_SCENARIO");
      expect(evaluation.probabilityClass).toBe("ELEVATED");
    });

    it("3. triggers SUPPLY_SHORTAGE_SCENARIO when supply volumes trend below baseline", () => {
      const evidence = [
        createMockEvidence("SUPPLY", "Wholesale supply deficit observed; arrivals down 35%."),
        createMockEvidence("MARKET", "Wholesale inventory depleting rapidly."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "Dry Onions",
        state: "Kano",
        evidence,
      });
      expect(evaluation.matchedType).toBe("SUPPLY_SHORTAGE_SCENARIO");
      expect(evaluation.probabilityClass).toBe("ELEVATED");
    });

    it("4. triggers SUPPLY_SURPLUS_SCENARIO when harvest inflow exceeds absorption", () => {
      const evidence = [
        createMockEvidence("SUPPLY", "Massive harvest surplus arriving at farm gate."),
        createMockEvidence("MARKET", "Aggregator holding excess volume."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "Fresh Tomatoes",
        state: "Kano",
        evidence,
      });
      expect(evaluation.matchedType).toBe("SUPPLY_SURPLUS_SCENARIO");
      expect(evaluation.probabilityClass).toBe("PLAUSIBLE");
    });

    it("5. triggers MARKET_PRESSURE_SCENARIO when price volatility is elevated", () => {
      const evidence = [
        createMockEvidence("MARKET", "Sharp price volatility and market pressure observed."),
        createMockEvidence("MARKET", "Wholesale spreads widening across trading spots."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "Sorghum",
        state: "Katsina",
        evidence,
      });
      expect(evaluation.matchedType).toBe("MARKET_PRESSURE_SCENARIO");
    });

    it("6. triggers LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO when transit delays restrict supply", () => {
      const evidence = [
        createMockEvidence("LOGISTICS", "Major corridor transit delay and haulage constrained."),
        createMockEvidence("SUPPLY", "Crop harvest is available at farm gate."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "Yam Tubers",
        state: "Benue",
        evidence,
      });
      expect(evaluation.matchedType).toBe("LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO");
    });

    it("7. triggers PROCESSING_BOTTLENECK_SCENARIO when arrivals exceed mill capacity", () => {
      const evidence = [
        createMockEvidence("PROCESSING", "Milling capacity bottleneck; daily intake at 100% capacity."),
        createMockEvidence("SUPPLY", "Additional unharvested paddy waiting in field."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "Paddy Rice",
        state: "Kebbi",
        evidence,
      });
      expect(evaluation.matchedType).toBe("PROCESSING_BOTTLENECK_SCENARIO");
    });

    it("8. triggers DISEASE_SUPPLY_RISK_SCENARIO when biosecurity risk is elevated", () => {
      const evidence = [
        createMockEvidence("DISEASE_BIOSECURITY", "Biosecurity alert: elevated fungal rust indicators reported."),
        createMockEvidence("PRODUCTION", "Local agronomic surveillance monitoring crop health."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "Cassava",
        state: "Oyo",
        evidence,
      });
      expect(evaluation.matchedType).toBe("DISEASE_SUPPLY_RISK_SCENARIO");
    });

    it("9. triggers PROCUREMENT_RISK_SCENARIO when B2B contracts face fulfillment deficits", () => {
      const evidence = [
        createMockEvidence("PROCUREMENT", "B2B off-taker contract deficit risk; supplier shortfall."),
        createMockEvidence("DEMAND", "Commercial processors demand 500 MT unfilled."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "Cashew Nuts",
        state: "Kogi",
        evidence,
      });
      expect(evaluation.matchedType).toBe("PROCUREMENT_RISK_SCENARIO");
    });

    it("10. triggers FOOD_SECURITY_PRESSURE_SCENARIO when food access indicators converge", () => {
      const evidence = [
        createMockEvidence("FOOD_SECURITY", "Staple food security vulnerability gap detected."),
        createMockEvidence("SUPPLY", "Acute grain shortage in urban retail markets."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "Millet",
        state: "Borno",
        evidence,
      });
      expect(evaluation.matchedType).toBe("FOOD_SECURITY_PRESSURE_SCENARIO");
    });

    it("11. triggers RESILIENCE_STRESS_SCENARIO on single-source dependency", () => {
      const evidence = [
        createMockEvidence("RESILIENCE", "Network dependency on single off-taker cooperative exceeds 70%."),
        createMockEvidence("LOGISTICS", "Sole arterial bridge undergoing structural maintenance."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "Cocoa",
        state: "Ondo",
        evidence,
      });
      expect(evaluation.matchedType).toBe("RESILIENCE_STRESS_SCENARIO");
    });

    it("12. triggers MULTI_DOMAIN_RISK_SCENARIO when >= 3 independent risk domains converge", () => {
      const evidence = [
        createMockEvidence("DISEASE_BIOSECURITY", "Elevated biological indicator in western LGA."),
        createMockEvidence("LOGISTICS", "Corridor transit constrained due to washouts."),
        createMockEvidence("SUPPLY", "Wholesale supply deficit observed at aggregation hubs."),
      ];
      const evaluation = evaluateScenarioTriggerRules({
        commodity: "White Maize",
        state: "Niger",
        evidence,
      });
      expect(evaluation.matchedType).toBe("MULTI_DOMAIN_RISK_SCENARIO");
      expect(evaluation.probabilityClass).toBe("HIGH_CONCERN");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Cross-Horizon Reasoning & Trajectory Classification
  // ---------------------------------------------------------------------------
  describe("Cross-Horizon Synthesis & Reasoning", () => {
    it("classifies STRUCTURAL_DEFICIT when supply decreases across short, medium, and long horizons", () => {
      const fShort = createMockForecast("SHORT_TERM_0_7D", "DECREASING", "SUPPLY");
      const fMed = createMockForecast("MEDIUM_TERM_8_30D", "DECREASING", "SUPPLY");
      const fLong = createMockForecast("LONG_TERM_31_90D", "DECREASING", "SUPPLY");

      const synthesis = synthesizeCrossHorizonForecasts([fShort, fMed, fLong], "White Maize");
      expect(synthesis.trajectoryType).toBe("STRUCTURAL_DEFICIT");
      expect(synthesis.convergenceScore).toBeGreaterThanOrEqual(0.9);
      expect(synthesis.hasHorizonConflict).toBe(false);
    });

    it("classifies TRANSIENT_SPIKE when short-term increases but medium-term remains stable", () => {
      const fShort = createMockForecast("SHORT_TERM_0_7D", "INCREASING", "MARKET");
      const fMed = createMockForecast("MEDIUM_TERM_8_30D", "STABLE", "MARKET");

      const synthesis = synthesizeCrossHorizonForecasts([fShort, fMed], "Soybeans");
      expect(synthesis.trajectoryType).toBe("TRANSIENT_SPIKE");
      expect(synthesis.hasHorizonConflict).toBe(false);
    });

    it("detects COUNTER_CYCLICAL_DIVERGENCE and horizon conflict when horizons contradict", () => {
      const fShort = createMockForecast("SHORT_TERM_0_7D", "DECREASING", "MARKET");
      const fMed = createMockForecast("MEDIUM_TERM_8_30D", "INCREASING", "MARKET");

      const synthesis = synthesizeCrossHorizonForecasts([fShort, fMed], "Cassava");
      expect(synthesis.trajectoryType).toBe("COUNTER_CYCLICAL_DIVERGENCE");
      expect(synthesis.hasHorizonConflict).toBe(true);
      expect(synthesis.conflictSummary).toContain("Short-term forecast indicates DECREASING while medium-term indicates INCREASING");
    });

    it("returns INSUFFICIENT_HORIZON_DATA if fewer than 2 active forecasts are present", () => {
      const fShort = createMockForecast("SHORT_TERM_0_7D", "INCREASING");
      const synthesis = synthesizeCrossHorizonForecasts([fShort], "Sesame Seeds");
      expect(synthesis.trajectoryType).toBe("INSUFFICIENT_HORIZON_DATA");
      expect(synthesis.convergenceScore).toBe(0.0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Conflict Detection & Confidence Penalties
  // ---------------------------------------------------------------------------
  describe("Cross-Domain Conflict Detection & Penalties", () => {
    it("detects DEMAND_SUPPLY_CONFLICT and applies confidence impact", () => {
      const evidence = [
        createMockEvidence("DEMAND", "Surge in buyer demand."),
        createMockEvidence("SUPPLY", "Surplus crop volume in warehouse."),
      ];
      const conflicts = detectScenarioConflicts({
        commodity: "Paddy Rice",
        state: "Kebbi",
        evidence,
      });
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].conflictType).toBe("DEMAND_SUPPLY_CONFLICT");

      const netConf = calculateScenarioNetConfidence(0.8, conflicts);
      expect(netConf).toBeLessThan(0.8);
      expect(netConf).toBe(0.55); // 0.8 - 0.25 penalty
    });

    it("detects DISEASE_PRODUCTION_CONFLICT and flags critical severity", () => {
      const evidence = [
        createMockEvidence("DISEASE_BIOSECURITY", "Elevated biological risk warning in zone."),
        createMockEvidence("PRODUCTION", "Aggressive planting expansion planned."),
      ];
      const conflicts = detectScenarioConflicts({
        commodity: "Cassava",
        state: "Oyo",
        evidence,
      });
      expect(conflicts.some((c) => c.conflictType === "DISEASE_PRODUCTION_CONFLICT")).toBe(true);
      expect(conflicts[0].severity).toBe("CRITICAL");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Insufficient Data Governance
  // ---------------------------------------------------------------------------
  describe("Insufficient Data Governance", () => {
    it("strictly returns INSUFFICIENT_DATA when evidence count is < 2", async () => {
      const scenario = await generateAgriculturalScenario({
        domain: "MARKET",
        commodity: "White Maize",
        state: "Kaduna",
        evidence: [createMockEvidence("MARKET", "Single isolated observation.", 0.5)],
      });

      expect(scenario.probabilityClass).toBe("INSUFFICIENT_DATA");
      expect(scenario.confidenceLevel).toBe("INSUFFICIENT_DATA");
      expect(scenario.confidence).toBe(0.0);
      expect(scenario.status).toBe("DRAFT");
      expect(scenario.triggeringConditions[0]).toContain("Insufficient evidence");
    });

    it("returns empty learning signals when evaluating an INSUFFICIENT_DATA scenario", async () => {
      const scenario = await generateAgriculturalScenario({
        domain: "MARKET",
        commodity: "White Maize",
        state: "Kaduna",
        evidence: [],
      });

      const evalResult = await evaluateScenarioAgainstOutcome(scenario, {
        actualDirection: "INCREASING",
        actualImpactSummary: "Market rose",
        actualDisruptionOccurred: true,
        observedAt: new Date().toISOString(),
        sourceDomain: "MARKET",
      });

      expect(evalResult.evaluationStatus).toBe("INSUFFICIENT_DATA");
      expect(evalResult.learningSignalsFlagged).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Forward Planning Implications
  // ---------------------------------------------------------------------------
  describe("Forward Planning Implications", () => {
    it("generates controlled planning action categories and horizons", () => {
      const implications = generatePlanningImplications({
        scenarioType: "DEMAND_SURGE_SCENARIO",
        commodity: "White Maize",
        state: "Kaduna",
      });

      expect(implications.length).toBeGreaterThanOrEqual(2);
      expect(implications[0].actionCategory).toBe("AGGREGATE");
      expect(implications[0].planningHorizon).toBe("IMMEDIATE");
      expect(implications[1].actionCategory).toBe("PROCURE");
      expect(implications[1].planningHorizon).toBe("NEAR_TERM");
    });

    it("attaches mandatory logistics and biosecurity safety disclaimers", () => {
      const logisticsImp = generatePlanningImplications({
        scenarioType: "LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO",
        commodity: "Yam Tubers",
        state: "Benue",
      });
      expect(logisticsImp[0].advisoryDisclaimer).toContain("CORRIDOR_REVIEW_REQUIRED");

      const bioImp = generatePlanningImplications({
        scenarioType: "DISEASE_SUPPLY_RISK_SCENARIO",
        commodity: "Cassava",
        state: "Oyo",
      });
      expect(bioImp[0].advisoryDisclaimer).toContain("Does not diagnose disease");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Scenario Lifecycle & Versioning
  // ---------------------------------------------------------------------------
  describe("Scenario Lifecycle & Versioning", () => {
    it("validates server-authoritative status transitions", () => {
      expect(transitionScenarioStatus("DRAFT", "ACTIVE").isValid).toBe(true);
      expect(transitionScenarioStatus("ACTIVE", "EXPIRED").isValid).toBe(true);
      expect(transitionScenarioStatus("EXPIRED", "EVALUATED").isValid).toBe(true);
      expect(transitionScenarioStatus("EVALUATED", "ARCHIVED").isValid).toBe(true);

      // Illegal backward transition
      expect(transitionScenarioStatus("ARCHIVED", "ACTIVE").isValid).toBe(false);
      expect(transitionScenarioStatus("EVALUATED", "DRAFT").isValid).toBe(false);
    });

    it("creates an immutable new version preserving lineage and incrementing version number", async () => {
      const v1 = await generateAgriculturalScenario({
        domain: "MARKET",
        commodity: "White Maize",
        state: "Kaduna",
        evidence: [
          createMockEvidence("MARKET", "Baseline trend."),
          createMockEvidence("DEMAND", "Steady off-take."),
        ],
      });
      expect(v1.version).toBe(1);
      expect(v1.previousScenarioId).toBeNull();

      const v2 = await createScenarioVersion(v1, {
        evidence: [
          createMockEvidence("MARKET", "Surge in spot demand."),
          createMockEvidence("DEMAND", "Wholesale order spike."),
        ],
      });

      expect(v2.version).toBe(2);
      expect(v2.previousScenarioId).toBe(v1.id);
      expect(v2.id).not.toBe(v1.id);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Evaluation & Phase 3.4 Learning Loop Integration
  // ---------------------------------------------------------------------------
  describe("Evaluation & Learning Loop Integration", () => {
    it("evaluates accurate scenario and computes high score", async () => {
      const scenario = await generateAgriculturalScenario({
        domain: "MARKET",
        commodity: "White Maize",
        state: "Kaduna",
        knownForecasts: [createMockForecast("SHORT_TERM_0_7D", "INCREASING")],
        evidence: [
          createMockEvidence("DEMAND", "Surging demand."),
          createMockEvidence("MARKET", "Prices increasing rapidly."),
        ],
      });

      const now = new Date();
      const midHorizon = new Date(now.getTime() + 10 * 86400000).toISOString();

      const evalResult = await evaluateScenarioAgainstOutcome(scenario, {
        actualDirection: "INCREASING",
        actualImpactSummary: "Demand and prices surged by 20%.",
        actualDisruptionOccurred: true,
        observedAt: midHorizon,
        sourceDomain: "MARKET",
      });

      expect(evalResult.evaluationStatus).toBe("EVALUATED");
      expect(evalResult.directionalAccuracy).toBe(true);
      expect(evalResult.score).toBeGreaterThanOrEqual(70.0);
      expect(evalResult.isFalsePositive).toBe(false);
      expect(evalResult.isFalseNegative).toBe(false);
    });

    it("flags FALSE_POSITIVE_SIGNAL when scenario warned of disruption but none occurred", async () => {
      const scenario = await generateAgriculturalScenario({
        domain: "SUPPLY",
        commodity: "Dry Onions",
        state: "Kano",
        evidence: [
          createMockEvidence("SUPPLY", "Wholesale supply deficit observed."),
          createMockEvidence("MARKET", "Inventories running low."),
        ],
      });

      const evalResult = await evaluateScenarioAgainstOutcome(scenario, {
        actualDirection: "STABLE",
        actualImpactSummary: "Normal trade continued without disruption.",
        actualDisruptionOccurred: false,
        observedAt: new Date().toISOString(),
        sourceDomain: "SUPPLY",
      });

      expect(evalResult.isFalsePositive).toBe(true);
      expect(evalResult.learningSignalsFlagged).toBe(true);
      expect(evalResult.score).toBeLessThanOrEqual(50.0);
    });

    it("flags FALSE_NEGATIVE_SIGNAL when nominal scenario missed acute disruption", async () => {
      const scenario = await generateAgriculturalScenario({
        domain: "MARKET",
        commodity: "White Maize",
        state: "Kaduna",
        evidence: [
          createMockEvidence("MARKET", "Conditions nominal."),
          createMockEvidence("SUPPLY", "Stable supply arrivals."),
        ],
      });

      const evalResult = await evaluateScenarioAgainstOutcome(scenario, {
        actualDirection: "DECREASING",
        actualImpactSummary: "Major unanticipated supply collapse.",
        actualDisruptionOccurred: true,
        observedAt: new Date().toISOString(),
        sourceDomain: "MARKET",
      });

      expect(evalResult.isFalseNegative).toBe(true);
      expect(evalResult.learningSignalsFlagged).toBe(true);
      expect(evalResult.score).toBeLessThanOrEqual(50.0);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Security, Privacy, and Anti-Pork Invariants
  // ---------------------------------------------------------------------------
  describe("Security, Privacy, and Anti-Pork Invariants", () => {
    it("strictly rejects pork/pig commodities at validation and runtime", async () => {
      expect(isProhibitedProduce("Pork Chop")).toBe(true);
      expect(isProhibitedProduce("Swine Feed")).toBe(true);
      expect(isProhibitedProduce("Smoked Bacon")).toBe(true);
      expect(isProhibitedProduce("White Maize")).toBe(false);

      expect(() => {
        assertNoProhibitedProduce("pork ribs", "Scenario test");
      }).toThrow(/Anti-Pork Policy Violation/);

      await expect(
        generateAgriculturalScenario({
          domain: "MARKET",
          commodity: "Pork Meat",
          state: "Benue",
        })
      ).rejects.toThrow();
    });

    it("strictly rejects private phone numbers and GPS coordinates", () => {
      expect(containsPrivateInformation("Contact 08023456789")).toBe(true);
      expect(containsPrivateInformation("+2348031234567")).toBe(true);
      expect(containsPrivateInformation("Coordinates at 9.0820, 8.6753")).toBe(true);
      expect(containsPrivateInformation("Dawanau Market, Kano State")).toBe(false);

      expect(() => {
        assertNoPrivateInformation({ phone: "08034567890" }, "Privacy test");
      }).toThrow(/Privacy Violation/);
    });

    it("enforces food security coordinator human review prior to public dissemination", async () => {
      const scenario = await generateAgriculturalScenario({
        domain: "FOOD_SECURITY",
        commodity: "Millet",
        state: "Borno",
        evidence: [
          createMockEvidence("FOOD_SECURITY", "Staple food security vulnerability gap detected."),
          createMockEvidence("SUPPLY", "Acute grain shortage in urban retail markets."),
        ],
      });

      expect(scenario.scenarioType).toBe("FOOD_SECURITY_PRESSURE_SCENARIO");
      // Must NOT be ACTIVE autonomously; must be held in REVIEW status for human coordinator
      expect(scenario.status).toBe("REVIEW");
    });

    it("verifies asset-light invariant: planning guidance is advisory without autonomous execution", async () => {
      const scenario = await generateAgriculturalScenario({
        domain: "LOGISTICS",
        commodity: "Yam Tubers",
        state: "Benue",
        evidence: [
          createMockEvidence("LOGISTICS", "Major corridor transit delay and haulage constrained."),
          createMockEvidence("SUPPLY", "Crop harvest is available at farm gate."),
        ],
      });

      for (const imp of scenario.planningImplications) {
        expect(imp.advisoryDisclaimer).toContain("Advisory");
        expect(imp.advisoryDisclaimer).not.toContain("AgroMarket has purchased");
        expect(imp.advisoryDisclaimer).not.toContain("AgroMarket has moved");
      }
    });

    it("validates scenario options with Zod schema and date resolvers", () => {
      const valid = scenarioGenerationOptionsSchema.parse({
        domain: "MARKET",
        commodity: "Sesame Seeds",
        state: "Nasarawa",
        horizon: "SHORT_TERM_0_7D",
      });
      expect(valid.commodity).toBe("Sesame Seeds");

      const dates = resolveScenarioHorizonDates("SHORT_TERM_0_7D");
      expect(dates.startDate).toBeDefined();
      expect(dates.endDate).toBeDefined();
      expect(new Date(dates.endDate).getTime()).toBeGreaterThan(new Date(dates.startDate).getTime());
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Data Layer Persistence & Queries
  // ---------------------------------------------------------------------------
  describe("Data Layer Persistence & Queries", () => {
    it("saves and retrieves scenarios by ID, commodity, and domain", async () => {
      const scenario = await generateAgriculturalScenario({
        domain: "MARKET",
        commodity: "Sesame Seeds",
        state: "Nasarawa",
        evidence: [
          createMockEvidence("MARKET", "Export demand rising."),
          createMockEvidence("SUPPLY", "Harvest arrivals active."),
        ],
      });

      await saveScenario(scenario);

      const byId = await getScenarioById(scenario.id);
      expect(byId).not.toBeNull();
      expect(byId!.commodity).toBe("Sesame Seeds");

      const byCommodity = await getScenariosByCommodity("Sesame Seeds");
      expect(byCommodity.length).toBeGreaterThanOrEqual(1);

      const byDomain = await getScenariosByDomain("MARKET");
      expect(byDomain.length).toBeGreaterThanOrEqual(1);

      const updated = await updateScenarioStatus(scenario.id, "EXPIRED");
      expect(updated).toBe(true);

      const afterUpdate = await getScenarioById(scenario.id);
      expect(afterUpdate!.status).toBe("EXPIRED");

      // Verify history query
      const history = await getScenarioHistory("Sesame Seeds", "Nasarawa");
      expect(history.length).toBeGreaterThanOrEqual(1);

      // Verify seeding
      seedInMemoryScenarios([{ ...scenario, id: "seeded-scenario-1" }]);
      const seeded = await getScenarioById("seeded-scenario-1");
      expect(seeded).not.toBeNull();
    });

    it("saves and retrieves scenario conflict items", async () => {
      const conflict = {
        id: crypto.randomUUID(),
        conflictType: "DEMAND_SUPPLY_CONFLICT" as const,
        domainA: "DEMAND",
        domainB: "SUPPLY",
        signalA: "DEMAND_SURGE",
        signalB: "SUPPLY_SURPLUS",
        state: "Kano",
        commodity: "White Maize",
        severity: "HIGH" as const,
        confidenceImpact: 0.25,
        explanation: "Test conflict",
        recommendedReview: "Human verification required",
      };

      const saved = await saveScenarioConflict(conflict);
      expect(saved).toBe(true);
    });
  });
});
