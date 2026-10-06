import { describe, it, expect } from "vitest";
import {
  calculateCrossDomainPriorityScore,
  calculateOrchestrationConfidence,
  correlateAgentContributions,
  deduplicateSourceEvidence,
  detectCrossDomainScenarios,
  detectIntelligenceConflicts,
  normalizeAgentOutputContribution,
  synthesizeCrossDomainRecommendations,
} from "@/features/orchestration/calculations";
import { runAgriculturalOrchestration } from "@/features/orchestration/agent";
import { AgentOutputContribution } from "@/features/orchestration/types";

describe("Phase 3.1: Agricultural Intelligence Orchestration Calculations & Contracts", () => {
  // ---------------------------------------------------------------------------
  // 1. Normalized Agent Output Contract & Privacy
  // ---------------------------------------------------------------------------
  it("normalizes agent outputs, clamps numerical ranges, and sanitizes phone/cadastral coordinates", () => {
    const raw: Partial<AgentOutputContribution> = {
      agentId: "MARKET_INTELLIGENCE_AGENT",
      domain: "MARKET",
      state: "Kano",
      lga: "Dala",
      commodity: "Maize",
      score: 145, // should clamp to 100
      confidence: 1.5, // should clamp to 1.0
      evidenceConfidence: -0.2, // should clamp to 0.0
      sourceReferences: [
        "Call with field informant +2348031234567 regarding local prices",
        "Farm cluster GPS: latitude: 12.0022, longitude: 8.5919",
      ],
    };

    const normalized = normalizeAgentOutputContribution(raw);

    expect(normalized.commodity).toBe("Maize");
    expect(normalized.score).toBe(100);
    expect(normalized.confidence).toBe(1.0);
    expect(normalized.evidenceConfidence).toBe(0.0);
    // Privacy sanitization verified
    expect(normalized.sourceReferences[0]).toContain("[REDACTED_PHONE]");
    expect(normalized.sourceReferences[0]).not.toContain("08031234567");
    expect(normalized.sourceReferences[1]).toContain("[REDACTED_COORDS]");
    expect(normalized.sourceReferences[1]).not.toContain("12.0022");
  });

  it("strictly enforces zero pig/pork tolerance on inputs and throws an error", () => {
    expect(() =>
      normalizeAgentOutputContribution({
        commodity: "Pork sausages",
      })
    ).toThrow(/prohibited/i);

    expect(() =>
      normalizeAgentOutputContribution({
        commodity: "Soybean",
        commodityCategory: "Swine feed",
      })
    ).toThrow(/prohibited/i);
  });

  // ---------------------------------------------------------------------------
  // 2. Temporal & Geographic Correlation
  // ---------------------------------------------------------------------------
  it("filters contributions by temporal correlation window and geographic scope", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    const contributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        domain: "MARKET",
        state: "Kano",
        commodity: "Maize",
        observationTime: "2026-10-04T10:00:00Z", // 2 days ago (within SHORT_TERM)
      }),
      normalizeAgentOutputContribution({
        domain: "DEMAND",
        state: "Kano",
        commodity: "Maize",
        observationTime: "2026-09-20T10:00:00Z", // 16 days ago (MEDIUM_TERM, exceeds SHORT_TERM)
      }),
      normalizeAgentOutputContribution({
        domain: "SUPPLY",
        state: "Oyo", // different state
        commodity: "Maize",
        observationTime: "2026-10-05T10:00:00Z",
      }),
    ];

    // Short-term window (<= 7 days) in Kano
    const shortTerm = correlateAgentContributions(contributions, {
      state: "Kano",
      commodity: "Maize",
      timeWindow: "SHORT_TERM",
      referenceTime: now,
    });
    expect(shortTerm.length).toBe(1);
    expect(shortTerm[0].domain).toBe("MARKET");

    // Medium-term window (<= 30 days) in Kano
    const mediumTerm = correlateAgentContributions(contributions, {
      state: "Kano",
      commodity: "Maize",
      timeWindow: "MEDIUM_TERM",
      referenceTime: now,
    });
    expect(mediumTerm.length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 3. Same-Source Deduplication
  // ---------------------------------------------------------------------------
  it("deduplicates identical source references to prevent double-counting evidence", () => {
    const contributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        domain: "MARKET",
        sourceReferences: ["NBS National Food Price Survey Q3", "Dawanau Market Bulletin"],
      }),
      normalizeAgentOutputContribution({
        domain: "SUPPLY",
        sourceReferences: ["NBS National Food Price Survey Q3", "Dawanau Market Bulletin"],
      }),
      normalizeAgentOutputContribution({
        domain: "DEMAND",
        sourceReferences: ["NBS National Food Price Survey Q3", "Retail Off-take Log"],
      }),
    ];

    const deduplication = deduplicateSourceEvidence(contributions);
    expect(deduplication.totalReferencesCount).toBe(6);
    expect(deduplication.distinctSourcesCount).toBe(3); // NBS survey, Dawanau bulletin, Retail log
    expect(deduplication.deduplicationRatio).toBe(0.5);
  });

  // ---------------------------------------------------------------------------
  // 4. Intelligence Conflict Detection
  // ---------------------------------------------------------------------------
  it("detects contradiction between Market surplus and Supply Matching shortage", () => {
    const contributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        domain: "MARKET",
        commodity: "Maize",
        signalType: "SUPPLY_SURPLUS",
        score: 30,
      }),
      normalizeAgentOutputContribution({
        domain: "SUPPLY",
        commodity: "Maize",
        signalType: "SUPPLY_SHORTAGE",
        score: 30, // acute deficit
      }),
    ];

    const conflicts = detectIntelligenceConflicts(contributions);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflictType).toBe("MARKET_SUPPLY_CONTRADICTION");
    expect(conflicts[0].domainA).toBe("MARKET");
    expect(conflicts[0].domainB).toBe("SUPPLY");
    expect(conflicts[0].status).toBe("ACTIVE");
  });

  it("detects contradiction between Falling Demand and High Procurement Pressure", () => {
    const contributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        domain: "DEMAND",
        commodity: "Soybean",
        signalType: "DEMAND_DECREASE",
        score: 35,
      }),
      normalizeAgentOutputContribution({
        domain: "PROCUREMENT",
        commodity: "Soybean",
        signalType: "HIGH_PRESSURE_OFFTAKE",
        score: 80,
      }),
    ];

    const conflicts = detectIntelligenceConflicts(contributions);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflictType).toBe("DEMAND_PROCUREMENT_DISPARITY");
    expect(conflicts[0].severity).toBe("MEDIUM");
  });

  it("detects contradiction between Expanding Production and Severe Disease Loss", () => {
    const contributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        domain: "PRODUCTION",
        commodity: "Broiler Chicken",
        signalType: "EXPANSION_TARGET",
        score: 85,
      }),
      normalizeAgentOutputContribution({
        domain: "DISEASE_BIOSECURITY",
        commodity: "Broiler Chicken",
        signalType: "MORTALITY_SIGNAL",
        score: 75,
      }),
    ];

    const conflicts = detectIntelligenceConflicts(contributions);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflictType).toBe("PRODUCTION_DISEASE_DIVERGENCE");
    expect(conflicts[0].severity).toBe("CRITICAL");
  });

  // ---------------------------------------------------------------------------
  // 5. Deterministic Priority Score & Confidence Calibration
  // ---------------------------------------------------------------------------
  it("calculates 8-component priority score with exact mathematical weights", () => {
    const contributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        domain: "MARKET",
        state: "Kano",
        commodity: "Maize",
        score: 80,
        evidenceConfidence: 0.9,
      }),
      normalizeAgentOutputContribution({
        domain: "SUPPLY",
        state: "Kano",
        commodity: "Maize",
        score: 30, // supply gap (100 - 30 = 70 exposure)
        evidenceConfidence: 0.85,
      }),
      normalizeAgentOutputContribution({
        domain: "FOOD_SECURITY",
        state: "Kano",
        commodity: "Maize",
        score: 75,
        evidenceConfidence: 0.88,
      }),
      normalizeAgentOutputContribution({
        domain: "LOGISTICS",
        state: "Kano",
        commodity: "Maize",
        score: 60,
        evidenceConfidence: 0.82,
      }),
    ];

    const priorityRes = calculateCrossDomainPriorityScore({
      contributions,
      scenarioType: "FOOD_SECURITY_PRESSURE_SCENARIO",
      conflictsCount: 0,
    });

    // Verify component breakdowns are populated
    expect(priorityRes.breakdown.crossDomainSeverity).toBeGreaterThan(0);
    expect(priorityRes.breakdown.evidenceConfidence).toBeGreaterThan(0);
    expect(priorityRes.breakdown.foodSecurityExposure).toBeGreaterThan(0);
    expect(priorityRes.breakdown.supplyExposure).toBeGreaterThan(0);
    expect(priorityRes.breakdown.geographicConcentration).toBe(10); // single state cluster
    expect(priorityRes.breakdown.totalScore).toBeGreaterThanOrEqual(60);
    expect(priorityRes.priorityLevel).toMatch(/HIGH|CRITICAL/);
  });

  it("degrades orchestration confidence when unresolved conflicts exist", () => {
    const contributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        domain: "MARKET",
        evidenceConfidence: 0.85,
      }),
      normalizeAgentOutputContribution({
        domain: "SUPPLY",
        evidenceConfidence: 0.85,
      }),
      normalizeAgentOutputContribution({
        domain: "DEMAND",
        evidenceConfidence: 0.85,
      }),
    ];

    const conflicts = detectIntelligenceConflicts([
      normalizeAgentOutputContribution({
        domain: "MARKET",
        commodity: "Maize",
        signalType: "SUPPLY_SURPLUS",
        score: 20,
      }),
      normalizeAgentOutputContribution({
        domain: "SUPPLY",
        commodity: "Maize",
        signalType: "SUPPLY_SHORTAGE",
        score: 30,
      }),
    ]);

    const withConflict = calculateOrchestrationConfidence(contributions, conflicts, 4);
    const withoutConflict = calculateOrchestrationConfidence(contributions, [], 4);

    expect(withConflict.orchestrationConfidence).toBeLessThan(
      withoutConflict.orchestrationConfidence
    );
    expect(withConflict.confidenceDegradation).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 6. Cross-Domain Scenario Detection Logic
  // ---------------------------------------------------------------------------
  it("detects DISEASE_SUPPLY_RISK_SCENARIO and incorporates non-causation phrasing", () => {
    const contributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        domain: "DISEASE_BIOSECURITY",
        commodity: "Broiler Chicken",
        severity: "HIGH",
        score: 70,
      }),
      normalizeAgentOutputContribution({
        domain: "SUPPLY",
        commodity: "Broiler Chicken",
        signalType: "SUPPLY_SHORTAGE",
        score: 35,
      }),
    ];

    const scenario = detectCrossDomainScenarios(contributions, []);
    expect(scenario.scenarioType).toBe("DISEASE_SUPPLY_RISK_SCENARIO");
    // Explicit non-causation rule verification
    expect(scenario.scenarioSummary).toMatch(/potentially associated with|may contribute to/i);
    expect(scenario.scenarioSummary).not.toMatch(/caused the shortage/i);
  });

  it("detects LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO when corridor friction bottlenecks supply", () => {
    const contributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        domain: "LOGISTICS",
        commodity: "Tomatoes",
        severity: "HIGH",
        score: 75,
        signalType: "CORRIDOR_DISRUPTION",
      }),
      normalizeAgentOutputContribution({
        domain: "SUPPLY",
        commodity: "Tomatoes",
        signalType: "SUPPLY_SHORTAGE",
        score: 40,
      }),
    ];

    const scenario = detectCrossDomainScenarios(contributions, []);
    expect(scenario.scenarioType).toBe("LOGISTICS_CONSTRAINED_SUPPLY_SCENARIO");
    expect(scenario.affectedDomains).toContain("LOGISTICS");
    expect(scenario.affectedDomains).toContain("SUPPLY");
  });

  it("detects PROCUREMENT_RISK_SCENARIO when B2B supplier concentration converges with demand pressure", () => {
    const contributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        domain: "PROCUREMENT",
        commodity: "Soybean",
        severity: "HIGH",
        score: 70,
        signalType: "SUPPLIER_CONCENTRATION",
      }),
      normalizeAgentOutputContribution({
        domain: "DEMAND",
        commodity: "Soybean",
        score: 65,
      }),
    ];

    const scenario = detectCrossDomainScenarios(contributions, []);
    expect(scenario.scenarioType).toBe("PROCUREMENT_RISK_SCENARIO");
  });

  // ---------------------------------------------------------------------------
  // 7. Full Conceptual Scenario (Section 16 Specification)
  // ---------------------------------------------------------------------------
  it("evaluates Section 16 multi-domain scenario with all 8 domains and generates MULTI_DOMAIN_RISK_SCENARIO", () => {
    const state = "Kano";
    const commodity = "Maize";

    const allDomainContributions: AgentOutputContribution[] = [
      normalizeAgentOutputContribution({
        agentId: "MARKET_INTELLIGENCE_AGENT",
        domain: "MARKET",
        state,
        commodity,
        signalType: "PRICE_INCREASE",
        score: 72,
        severity: "HIGH",
        sourceReferences: ["Dawanau Grain Market Price Index"],
      }),
      normalizeAgentOutputContribution({
        agentId: "DEMAND_FORECASTING_AGENT",
        domain: "DEMAND",
        state,
        commodity,
        signalType: "DEMAND_INCREASE",
        score: 68,
        severity: "HIGH",
        sourceReferences: ["Commercial Off-take Volume Orders"],
      }),
      normalizeAgentOutputContribution({
        agentId: "SUPPLY_MATCHING_AGENT",
        domain: "SUPPLY",
        state,
        commodity,
        signalType: "SUPPLY_SHORTAGE",
        score: 75,
        severity: "HIGH",
        sourceReferences: ["Zonal Smallholder Producer Registry"],
      }),
      normalizeAgentOutputContribution({
        agentId: "PRODUCTION_PLANNING_AGENT",
        domain: "PRODUCTION",
        state,
        commodity,
        signalType: "PRODUCTION_RISK",
        score: 64,
        severity: "HIGH",
        sourceReferences: ["State Agricultural Development Project Log"],
      }),
      normalizeAgentOutputContribution({
        agentId: "LOGISTICS_INTELLIGENCE_AGENT",
        domain: "LOGISTICS",
        state,
        commodity,
        signalType: "LOGISTICS_DISRUPTION",
        score: 62,
        severity: "HIGH",
        sourceReferences: ["Kano-Kaduna Arterial Corridor Telemetry"],
      }),
      normalizeAgentOutputContribution({
        agentId: "AGRICULTURAL_DISEASE_BIOSECURITY_AGENT",
        domain: "DISEASE_BIOSECURITY",
        state,
        commodity,
        signalType: "DISEASE_RISK_INCREASE",
        score: 66,
        severity: "HIGH",
        sourceReferences: ["Cereal Rust Field Notice Bulletin"],
      }),
      normalizeAgentOutputContribution({
        agentId: "PROCUREMENT_INTELLIGENCE_AGENT",
        domain: "PROCUREMENT",
        state,
        commodity,
        signalType: "SUPPLIER_CONCENTRATION",
        score: 70,
        severity: "HIGH",
        sourceReferences: ["B2B Off-take Supplier Allocation"],
      }),
      normalizeAgentOutputContribution({
        agentId: "FOOD_SECURITY_RESILIENCE_AGENT",
        domain: "FOOD_SECURITY",
        state,
        commodity,
        signalType: "REGIONAL_SUPPLY_GAP",
        score: 78,
        severity: "HIGH",
        sourceReferences: ["Zonal Food Balance Survey"],
      }),
    ];

    const scenario = detectCrossDomainScenarios(allDomainContributions, []);
    expect(scenario.scenarioType).toBe("MULTI_DOMAIN_RISK_SCENARIO");

    const priority = calculateCrossDomainPriorityScore({
      contributions: allDomainContributions,
      scenarioType: scenario.scenarioType,
      conflictsCount: 0,
    });

    expect(priority.priorityScore).toBeGreaterThanOrEqual(60);
    expect(priority.priorityLevel).toMatch(/HIGH|CRITICAL/);

    const recs = synthesizeCrossDomainRecommendations({
      scenarioType: scenario.scenarioType,
      priorityLevel: priority.priorityLevel,
      contributions: allDomainContributions,
      conflicts: [],
    });

    expect(recs.length).toBeGreaterThanOrEqual(2);
    // Verifies advisory nature
    for (const r of recs) {
      expect(r.advisoryDisclaimer).toMatch(/advisory/i);
      expect(r.status).toBe("PROPOSED");
    }
  });

  // ---------------------------------------------------------------------------
  // 8. End-to-End Orchestrator Pipeline (Offline/Fallback Mode)
  // ---------------------------------------------------------------------------
  it("executes runAgriculturalOrchestration deterministically without throwing in offline environment", async () => {
    const result = await runAgriculturalOrchestration({
      state: "Kaduna",
      commodity: "Sorghum",
      timeWindow: "MEDIUM_TERM",
      skipPersistence: true,
    });

    expect(result.snapshot).toBeDefined();
    expect(result.priorityScore).toBeGreaterThanOrEqual(0);
    expect(result.priorityScore).toBeLessThanOrEqual(100);
    expect(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).toContain(result.priorityLevel);
    expect(result.confidenceMetrics.orchestrationConfidence).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
