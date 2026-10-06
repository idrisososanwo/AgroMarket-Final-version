import { describe, it, expect, vi } from "vitest";
import {
  calculateFoodSecurityPressureIndex,
  calculateAgriculturalResilienceScore,
  detectCriticalDependencies,
  evaluateSecurityToSupplyImpact,
  classifyFoodSecurityPillars,
} from "@/features/food-security/calculations";
import { runFoodSecurityResilienceAgent } from "@/features/food-security/agent";

describe("Phase 2.8: Food Security & Agricultural Resilience Agent Deterministic Engine", () => {
  describe("Food Security Pressure Index Calculation", () => {
    it("strictly bounds pressure scores between 0.0 and 100.0", () => {
      const maxParams = {
        commodity: "White Maize",
        state: "Kano",
        supplyDeficitRatio: 1.0,
        demandPressureScore: 100,
        marketPricePressureScore: 100,
        regionalSupplyGapRatio: 1.0,
        productionRiskScore: 100,
        logisticsFrictionScore: 100,
        securityDisruptionReported: true,
        processingBottleneckDetected: true,
      };

      const maxResult = calculateFoodSecurityPressureIndex(maxParams);
      expect(maxResult.score).toBeGreaterThanOrEqual(0);
      expect(maxResult.score).toBeLessThanOrEqual(100);
      expect(maxResult.score).toBe(100); // 25 + 15 + 15 + 15 + 10 + 10 + 5 + 5
      expect(maxResult.level).toBe("CRITICAL_PRESSURE");

      const minParams = {
        commodity: "Sorghum",
        state: "Kaduna",
        supplyDeficitRatio: 0.0,
        demandPressureScore: 0,
        marketPricePressureScore: 0,
        regionalSupplyGapRatio: 0.0,
        productionRiskScore: 0,
        logisticsFrictionScore: 0,
        securityDisruptionReported: false,
        processingBottleneckDetected: false,
      };

      const minResult = calculateFoodSecurityPressureIndex(minParams);
      expect(minResult.score).toBeGreaterThanOrEqual(0);
      expect(minResult.score).toBeLessThanOrEqual(100);
      expect(minResult.score).toBe(0);
      expect(minResult.level).toBe("LOW_PRESSURE");
    });

    it("records missing evidence and penalizes confidence when signals are absent", () => {
      const sparseResult = calculateFoodSecurityPressureIndex({
        commodity: "Cassava",
        state: "Benue",
      });

      expect(sparseResult.missingEvidence.length).toBeGreaterThan(0);
      expect(sparseResult.confidence).toBeLessThan(1.0);
      expect(sparseResult.level).toBe("INSUFFICIENT_DATA");
    });

    it("evaluates intermediate pressure levels accurately", () => {
      const moderate = calculateFoodSecurityPressureIndex({
        commodity: "Soybeans",
        state: "Niger",
        supplyDeficitRatio: 0.45,
        demandPressureScore: 40,
        marketPricePressureScore: 40,
        regionalSupplyGapRatio: 0.4,
        productionRiskScore: 30,
        logisticsFrictionScore: 30,
        securityDisruptionReported: false,
        processingBottleneckDetected: false,
      });

      expect(moderate.score).toBeGreaterThanOrEqual(35);
      expect(moderate.score).toBeLessThan(55);
      expect(moderate.level).toBe("MODERATE_PRESSURE");
    });
  });

  describe("Agricultural Resilience Scoring", () => {
    it("strictly bounds resilience scores between 0.0 and 100.0", () => {
      const highResilience = calculateAgriculturalResilienceScore({
        commodity: "Sesame",
        state: "Jigawa",
        largestSupplierShare: 0.25,
        productionSourceStatesCount: 5,
        processingFacilitiesAvailableCount: 4,
        activeLogisticsCorridorsCount: 4,
        activeTradeChannelsCount: 3,
        aggregationPoolsActiveCount: 3,
      });

      expect(highResilience.score).toBeGreaterThanOrEqual(0);
      expect(highResilience.score).toBeLessThanOrEqual(100);
      expect(highResilience.score).toBeGreaterThanOrEqual(75);
      expect(highResilience.level).toBe("HIGH_RESILIENCE");
      expect(highResilience.adaptiveCapacities.length).toBeGreaterThan(0);

      const vulnerableResilience = calculateAgriculturalResilienceScore({
        commodity: "Sesame",
        state: "Jigawa",
        largestSupplierShare: 0.95,
        productionSourceStatesCount: 1,
        processingFacilitiesAvailableCount: 0,
        activeLogisticsCorridorsCount: 1,
        activeTradeChannelsCount: 1,
        aggregationPoolsActiveCount: 0,
      });

      expect(vulnerableResilience.score).toBeLessThan(50);
      expect(vulnerableResilience.level).toMatch(/VULNERABLE|CRITICALLY_VULNERABLE/);
      expect(vulnerableResilience.vulnerabilityFactors.length).toBeGreaterThan(0);
    });
  });

  describe("Critical Dependency Detection", () => {
    it("detects regional concentration when share is >= 70%", () => {
      const deps = detectCriticalDependencies({
        commodity: "White Maize",
        state: "Kano",
        regionalShare: 85,
        dominantRegionName: "Dawanau Market Basin",
      });

      expect(deps.length).toBe(1);
      expect(deps[0].dependencyType).toBe("REGIONAL_SUPPLY_CONCENTRATION");
      expect(deps[0].dominantEntity).toBe("Dawanau Market Basin");
      expect(deps[0].thresholdExceeded).toBe(70);
    });

    it("detects supplier concentration when dominant producer has >= 80% share", () => {
      const deps = detectCriticalDependencies({
        commodity: "Rice",
        state: "Kebbi",
        supplierShare: 90,
        dominantSupplierName: "Mega Agro Producer",
      });

      expect(deps.length).toBe(1);
      expect(deps[0].dependencyType).toBe("SUPPLIER_CONCENTRATION_DEPENDENCY");
      expect(deps[0].concentrationRatio).toBe(90);
    });

    it("detects corridor and processing bottlenecks above respective thresholds", () => {
      const deps = detectCriticalDependencies({
        commodity: "Cowpea",
        state: "Borno",
        corridorShare: 80,
        dominantCorridorName: "Maiduguri-Kano Transit Route",
        processingFacilityShare: 85,
        dominantFacilityName: "Central Grain Processing Plant",
      });

      expect(deps.length).toBe(2);
      expect(deps.some((d) => d.dependencyType === "CORRIDOR_TRANSIT_DEPENDENCY")).toBe(true);
      expect(deps.some((d) => d.dependencyType === "PROCESSING_BOTTLENECK_DEPENDENCY")).toBe(true);
    });

    it("returns empty dependencies when thresholds are not exceeded", () => {
      const deps = detectCriticalDependencies({
        commodity: "Yam",
        state: "Benue",
        regionalShare: 50,
        supplierShare: 40,
        corridorShare: 50,
        processingFacilityShare: 40,
      });

      expect(deps.length).toBe(0);
    });
  });

  describe("Security Event -> Supply Impact Correlation Chain", () => {
    it("strictly labels security-linked impacts as CORRELATED_SIGNAL and POTENTIAL_IMPACT", () => {
      const result = evaluateSecurityToSupplyImpact({
        incidentId: "inc-123",
        state: "Kaduna",
        corridor: "Kaduna-Abuja Expressway",
        severity: "CRITICAL",
        affectedCommodity: "Tomatoes",
        currentSupplyDeficitRatio: 0.6,
      });

      expect(result.correlationType).toBe("CORRELATED_SIGNAL");
      expect(result.projectedSeverity).toBe("HIGH");
      expect(result.correlationExplanation).toContain("POTENTIAL_IMPACT");
      expect(result.correlationExplanation).toContain("correlation does not confirm direct causation");
    });
  });

  describe("Four Pillars Classification (Availability, Affordability, Access, Stability)", () => {
    it("classifies all 4 dimensions deterministically", () => {
      const pillars = classifyFoodSecurityPillars(80, {
        supplyPressure: 22,
        demandPressure: 14,
        marketPricePressure: 14,
        regionalSupplyGap: 13,
        productionRisk: 8,
        logisticsRisk: 9,
        securityRisk: 4,
        processingBottleneck: 4,
      });

      expect(pillars.availabilityStatus).toBe("SEVERE_DEFICIT");
      expect(pillars.affordabilityStatus).toBe("SEVERE_PRESSURE");
      expect(pillars.accessStatus).toBe("ACCESS_CONSTRAINT");
      expect(pillars.stabilityStatus).toBe("SEVERE_VOLATILITY");
    });
  });

  describe("Anti-Pork Hard Invariant", () => {
    it("proactively rejects pig, pork, swine, bacon, ham, lard across calculations", () => {
      expect(() => {
        calculateFoodSecurityPressureIndex({
          commodity: "Pork Chop",
          state: "Kano",
        });
      }).toThrow(/prohibited/i);

      expect(() => {
        calculateAgriculturalResilienceScore({
          commodity: "Swine Meat",
          state: "Lagos",
        });
      }).toThrow(/prohibited/i);

      expect(() => {
        detectCriticalDependencies({
          commodity: "Bacon Strips",
          state: "Oyo",
        });
      }).toThrow(/prohibited/i);

      expect(() => {
        evaluateSecurityToSupplyImpact({
          incidentId: "inc-1",
          state: "Plateau",
          severity: "HIGH",
          affectedCommodity: "Pig Feed",
          currentSupplyDeficitRatio: 0.5,
        });
      }).toThrow(/prohibited/i);
    });
  });

  describe("Autonomous-Free Early Warning Orchestrator", () => {
    it("runs agent without AI when skipAIEvaluation is set to true", async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "mock-snap-id" }, error: null }),
            })),
          })),
        })),
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      };

      const result = await runFoodSecurityResilienceAgent({
        state: "Kano",
        commodity: "White Maize",
        skipAIEvaluation: true,
        supabaseClient: mockSupabase,
      });

      expect(result.success).toBe(true);
      expect(result.pressureIndex).toBeDefined();
      expect(result.resilienceAssessment).toBeDefined();
      expect(result.candidateAlerts).toBeDefined();
      // Candidate alerts must default to DRAFT and NOT be public
      result.candidateAlerts.forEach((alert) => {
        expect(alert.status).toBe("DRAFT");
        expect(alert.is_public).toBe(false);
      });
    });

    it("proactively blocks prohibited pork commodities at the agent boundary", async () => {
      await expect(
        runFoodSecurityResilienceAgent({
          state: "Benue",
          commodity: "Fresh Pork",
          skipAIEvaluation: true,
        })
      ).rejects.toThrow(/prohibited/i);
    });
  });
});
