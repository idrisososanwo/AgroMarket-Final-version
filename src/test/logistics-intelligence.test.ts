import { describe, it, expect, vi } from "vitest";
import {
  calculateLogisticsPressureIndex,
  calculateLogisticsResilienceScore,
  detectCorridorDependencies,
  detectLogisticsBottlenecks,
  correlateSecurityToLogisticsImpact,
} from "@/features/logistics-intelligence/calculations";
import { runLogisticsIntelligenceAgent } from "@/features/logistics-intelligence/agent";

describe("Phase 2.9: Logistics Intelligence & Movement Resilience Agent Deterministic Engine", () => {
  describe("Logistics Pressure Index Calculation", () => {
    it("strictly bounds pressure scores between 0.0 and 100.0", () => {
      const maxParams = {
        commodity: "White Maize",
        state: "Kano",
        corridor: "Kano-Kaduna Expressway",
        activeMovementDemandRatio: 1.0,
        capacityUtilizationRatio: 1.0,
        delayedDeliveriesRatio: 1.0,
        corridorConcentrationRatio: 1.0,
        securityFrictionReported: true,
        processingMovementFriction: true,
        alternativeProvidersCount: 0,
      };

      const maxResult = calculateLogisticsPressureIndex(maxParams);
      expect(maxResult.score).toBeGreaterThanOrEqual(0);
      expect(maxResult.score).toBeLessThanOrEqual(100);
      expect(maxResult.score).toBe(100); // 20 + 20 + 15 + 15 + 10 + 10 + 10 = 100
      expect(maxResult.level).toBe("CRITICAL_PRESSURE");

      const minParams = {
        commodity: "Sorghum",
        state: "Kaduna",
        corridor: "Kaduna-Zaria Route",
        activeMovementDemandRatio: 0.0,
        capacityUtilizationRatio: 0.0,
        delayedDeliveriesRatio: 0.0,
        corridorConcentrationRatio: 0.0,
        securityFrictionReported: false,
        processingMovementFriction: false,
        alternativeProvidersCount: 5,
      };

      const minResult = calculateLogisticsPressureIndex(minParams);
      expect(minResult.score).toBeGreaterThanOrEqual(0);
      expect(minResult.score).toBeLessThanOrEqual(100);
      expect(minResult.level).toBe("LOW_PRESSURE");
    });

    it("records missing evidence and penalizes confidence when signals are absent", () => {
      const sparseResult = calculateLogisticsPressureIndex({
        commodity: "Soybeans",
        state: "Benue",
      });

      expect(sparseResult.missingEvidence.length).toBeGreaterThan(0);
      expect(sparseResult.confidence).toBeLessThan(1.0);
      expect(sparseResult.level).toBe("INSUFFICIENT_DATA");
    });

    it("evaluates intermediate pressure levels accurately", () => {
      const moderate = calculateLogisticsPressureIndex({
        commodity: "Cowpea",
        state: "Niger",
        corridor: "Minna-Bida Corridor",
        activeMovementDemandRatio: 0.5, // 10
        capacityUtilizationRatio: 0.5,  // 10
        delayedDeliveriesRatio: 0.2,    // 3
        corridorConcentrationRatio: 0.6,// 9
        securityFrictionReported: false,// 0
        processingMovementFriction: false,// 0
        alternativeProvidersCount: 2,  // 4
      });

      expect(moderate.score).toBeGreaterThanOrEqual(35);
      expect(moderate.score).toBeLessThan(55);
      expect(moderate.level).toBe("MODERATE_PRESSURE");
    });
  });

  describe("Agricultural Logistics Resilience Scoring", () => {
    it("strictly bounds resilience scores between 0.0 and 100.0", () => {
      const highResilience = calculateLogisticsResilienceScore({
        commodity: "Sesame",
        state: "Jigawa",
        providerCount: 5,
        dominantProviderShare: 0.3,
        activeCorridorsCount: 4,
        regionalAlternativeRoutesCount: 3,
        connectedProcessingFacilitiesCount: 4,
        aggregationHubsConnectedCount: 3,
        destinationMarketsCount: 4,
        availableTruckCapacityUnits: 15,
        disruptionRecoveryEventsCount: 3,
      });

      expect(highResilience.score).toBeGreaterThanOrEqual(0);
      expect(highResilience.score).toBeLessThanOrEqual(100);
      expect(highResilience.score).toBeGreaterThanOrEqual(75);
      expect(highResilience.level).toBe("HIGH_RESILIENCE");
      expect(highResilience.adaptiveCapacities.length).toBeGreaterThan(0);

      const vulnerableResilience = calculateLogisticsResilienceScore({
        commodity: "Sesame",
        state: "Jigawa",
        providerCount: 1,
        dominantProviderShare: 0.95,
        activeCorridorsCount: 1,
        regionalAlternativeRoutesCount: 0,
        connectedProcessingFacilitiesCount: 0,
        aggregationHubsConnectedCount: 0,
        destinationMarketsCount: 1,
        availableTruckCapacityUnits: 1,
        disruptionRecoveryEventsCount: 0,
      });

      expect(vulnerableResilience.score).toBeLessThan(50);
      expect(vulnerableResilience.level).toMatch(/VULNERABLE|CRITICALLY_VULNERABLE/);
      expect(vulnerableResilience.vulnerabilityFactors.length).toBeGreaterThan(0);
    });
  });

  describe("Corridor & Provider Dependency Detection", () => {
    it("detects corridor dependency when movement share is >= 75%", () => {
      const deps = detectCorridorDependencies({
        corridor: "Kano-Maiduguri Highway",
        state: "Kano",
        commodity: "White Maize",
        corridorMovementShare: 85,
        dominantProviderName: "Northern Freight Logistics",
        dominantProviderShare: 40,
        alternativeOptionsCount: 2,
      });

      expect(deps.length).toBe(1);
      expect(deps[0].dependencyType).toBe("CORRIDOR_DEPENDENCY");
      expect(deps[0].movementShare).toBe(85);
      expect(deps[0].thresholdExceeded).toBe(75);
    });

    it("detects provider concentration when dominant carrier has >= 80% share", () => {
      const deps = detectCorridorDependencies({
        corridor: "Lagos-Ibadan Expressway",
        state: "Oyo",
        commodity: "Cassava",
        corridorMovementShare: 50,
        dominantProviderName: "Speedy Haulage",
        dominantProviderShare: 88,
        alternativeOptionsCount: 1,
      });

      expect(deps.length).toBe(1);
      expect(deps[0].dependencyType).toBe("HIGH_PROVIDER_DEPENDENCY");
      expect(deps[0].dominantEntity).toBe("Speedy Haulage");
    });

    it("detects regional alternative scarcity when alternative options count is 0", () => {
      const deps = detectCorridorDependencies({
        corridor: "Sokoto-Illela Route",
        state: "Sokoto",
        alternativeOptionsCount: 0,
      });

      expect(deps.some((d) => d.dependencyType === "REGIONAL_ALTERNATIVE_SCARCITY")).toBe(true);
    });

    it("returns empty dependencies when all indicators are within nominal bounds", () => {
      const deps = detectCorridorDependencies({
        corridor: "Abuja-Keffi Corridor",
        state: "Nasarawa",
        corridorMovementShare: 50,
        dominantProviderShare: 35,
        alternativeOptionsCount: 4,
      });

      expect(deps.length).toBe(0);
    });
  });

  describe("Logistics Bottleneck Detection", () => {
    it("detects recurring delay patterns when delay rate is >= 30%", () => {
      const bottlenecks = detectLogisticsBottlenecks({
        state: "Kaduna",
        delayRatePercent: 42,
        activeProvidersCount: 3,
      });

      expect(bottlenecks.some((b) => b.bottleneckType === "RECURRING_DELAY_PATTERN")).toBe(true);
    });

    it("detects regional capacity shortages when zero providers are registered", () => {
      const bottlenecks = detectLogisticsBottlenecks({
        state: "Zamfara",
        activeProvidersCount: 0,
      });

      expect(bottlenecks.some((b) => b.bottleneckType === "REGIONAL_CAPACITY_SHORTAGE")).toBe(true);
      expect(bottlenecks.find((b) => b.bottleneckType === "REGIONAL_CAPACITY_SHORTAGE")?.severity).toBe("CRITICAL");
    });

    it("detects corridor bottlenecks when active security incidents are reported", () => {
      const bottlenecks = detectLogisticsBottlenecks({
        state: "Plateau",
        activeSecurityIncidentsCount: 2,
      });

      expect(bottlenecks.some((b) => b.bottleneckType === "CORRIDOR_BOTTLENECK")).toBe(true);
    });
  });

  describe("Security Event -> Logistics Impact Correlation Chain", () => {
    it("strictly labels security-linked impacts as CORRELATED_SIGNAL and POTENTIAL_IMPACT", () => {
      const result = correlateSecurityToLogisticsImpact({
        incidentId: "sec-789",
        state: "Kaduna",
        corridor: "Kaduna-Abuja Expressway",
        severity: "CRITICAL",
        affectedCommodity: "Tomatoes",
        activeDeliveriesInTransitCount: 4,
      });

      expect(result.correlationType).toBe("CORRELATED_SIGNAL");
      expect(result.projectedSeverity).toBe("HIGH");
      expect(result.correlationExplanation).toContain("POTENTIAL_IMPACT");
      expect(result.correlationExplanation).toContain("correlation does not confirm direct causation");
      expect(result.disclaimer).toContain("AgroMarket does not provide road-safety ratings");
    });
  });

  describe("Anti-Pork Hard Invariant", () => {
    it("proactively rejects pig, pork, swine, bacon, ham, lard across calculations", () => {
      expect(() => {
        calculateLogisticsPressureIndex({
          commodity: "Pork Meat",
          state: "Kano",
        });
      }).toThrow(/prohibited/i);

      expect(() => {
        calculateLogisticsResilienceScore({
          commodity: "Swine Products",
          state: "Lagos",
        });
      }).toThrow(/prohibited/i);

      expect(() => {
        detectCorridorDependencies({
          corridor: "Ibadan Corridor",
          state: "Oyo",
          commodity: "Bacon Slices",
        });
      }).toThrow(/prohibited/i);

      expect(() => {
        detectLogisticsBottlenecks({
          state: "Benue",
          commodity: "Pig Fat",
        });
      }).toThrow(/prohibited/i);

      expect(() => {
        correlateSecurityToLogisticsImpact({
          incidentId: "sec-1",
          state: "Plateau",
          severity: "HIGH",
          affectedCommodity: "Pork Sausage",
          activeDeliveriesInTransitCount: 2,
        });
      }).toThrow(/prohibited/i);
    });
  });

  describe("Autonomous-Free Early Warning & Coordination Orchestrator", () => {
    it("runs agent without AI when skipAIEvaluation is set to true", async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "mock-logistics-snap-id" }, error: null }),
            })),
          })),
        })),
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      };

      const result = await runLogisticsIntelligenceAgent({
        state: "Kano",
        commodity: "White Maize",
        skipAIEvaluation: true,
        supabaseClient: mockSupabase,
      });

      expect(result.success).toBe(true);
      expect(result.pressureIndex).toBeDefined();
      expect(result.resilienceAssessment).toBeDefined();
      expect(result.recommendations).toBeDefined();
      result.recommendations.forEach((rec) => {
        expect(rec.status).toBe("PROPOSED");
      });
    });

    it("proactively blocks prohibited pork commodities at the agent boundary", async () => {
      await expect(
        runLogisticsIntelligenceAgent({
          state: "Benue",
          commodity: "Fresh Pork",
          skipAIEvaluation: true,
        })
      ).rejects.toThrow(/prohibited/i);
    });
  });
});
