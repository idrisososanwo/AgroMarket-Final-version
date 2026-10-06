import { describe, it, expect, vi } from "vitest";
import {
  calculateDiseaseRiskIndex,
  calculateBiosecurityResilienceScore,
  detectSignalConvergence,
  detectBiosecurityDependencies,
  evaluateValueChainImpact,
} from "@/features/disease-biosecurity/calculations";
import { runAgriculturalDiseaseAgent } from "@/features/disease-biosecurity/agent";
import {
  DiseaseObservationItem,
} from "@/features/disease-biosecurity/types";

// Mock Supabase to keep tests completely deterministic and offline
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "mock-snap-id" }, error: null }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } } }),
    },
  }),
}));

describe("Phase 3.0: Agricultural Disease & Biosecurity Intelligence Agent Deterministic Engine", () => {
  const sampleObservations: DiseaseObservationItem[] = [
    {
      observationType: "MORTALITY_SIGNAL",
      sourceName: "National Veterinary Research Institute Bulletin",
      sourceType: "RESEARCH_INSTITUTE",
      verificationStatus: "OFFICIAL",
      reportingAuthority: "NVRI Vom",
      state: "Kano",
      commodity: "Broiler Chicken",
      evidenceSummary: "Abnormal avian mortality cluster verified in commercial layer flocks",
      observedAt: new Date().toISOString(),
      confidence: 0.9,
    },
    {
      observationType: "SURVEILLANCE_NOTICE",
      sourceName: "Kano State Ministry of Agriculture Extension Log",
      sourceType: "EXTENSION_OFFICER",
      verificationStatus: "VERIFIED",
      reportingAuthority: "State Epidemiology Unit",
      state: "Kano",
      commodity: "Broiler Chicken",
      evidenceSummary: "Active veterinary surveillance initiated across central LGA aggregations",
      observedAt: new Date().toISOString(),
      confidence: 0.85,
    },
  ];

  describe("Agricultural Disease Risk Index Calculation", () => {
    it("strictly bounds risk scores between 0.0 and 100.0", () => {
      const highRisk = calculateDiseaseRiskIndex({
        state: "Kano",
        commodity: "Broiler Chicken",
        observations: sampleObservations,
        observedMortalityRatePercent: 18.0,
        productionDisruptionObserved: true,
        movementRestrictionReported: true,
        supplyAvailabilityDropPercent: 25.0,
        regionalConcentrationRatio: 0.95,
      });

      expect(highRisk.score).toBeGreaterThanOrEqual(0.0);
      expect(highRisk.score).toBeLessThanOrEqual(100.0);
      expect(highRisk.score).toBeGreaterThan(60.0);
      expect(highRisk.level).toBe("CRITICAL_RISK");
      expect(highRisk.keyDrivers.length).toBeGreaterThan(0);
    });

    it("returns INSUFFICIENT_DATA when zero valid observations are provided", () => {
      const emptyResult = calculateDiseaseRiskIndex({
        state: "Kano",
        commodity: "Maize",
        observations: [],
      });

      expect(emptyResult.level).toBe("INSUFFICIENT_DATA");
      expect(emptyResult.missingEvidence).toContain(
        "No verified or secondary disease observations recorded for region"
      );
    });

    it("ignores SIMULATED observations from generating real agricultural risk", () => {
      const simulatedObs: DiseaseObservationItem[] = [
        {
          observationType: "MORTALITY_SIGNAL",
          sourceName: "Test Harness Simulation Engine",
          sourceType: "SIMULATED",
          verificationStatus: "SIMULATED",
          state: "Kano",
          commodity: "Broiler Chicken",
          evidenceSummary: "Synthetic disease outbreak simulation payload",
          observedAt: new Date().toISOString(),
          confidence: 0.99,
        },
      ];

      const result = calculateDiseaseRiskIndex({
        state: "Kano",
        commodity: "Broiler Chicken",
        observations: simulatedObs,
      });

      // Filtered out, so behaves as zero observations
      expect(result.level).toBe("INSUFFICIENT_DATA");
      expect(result.components.evidenceStrength).toBe(0);
    });

    it("penalizes confidence when critical evidence components are missing", () => {
      const minimalObs: DiseaseObservationItem[] = [
        {
          observationType: "PRODUCTION_HEALTH_DISRUPTION",
          sourceName: "Local Cooperative Chatter",
          sourceType: "COOPERATIVE_REPORT",
          verificationStatus: "UNVERIFIED",
          state: "Kano",
          commodity: "Maize",
          evidenceSummary: "Unconfirmed crop leaf discoloration rumors",
          observedAt: new Date().toISOString(),
          confidence: 0.5,
        },
      ];

      const lowConfidenceResult = calculateDiseaseRiskIndex({
        state: "Kano",
        commodity: "Maize",
        observations: minimalObs,
      });

      expect(lowConfidenceResult.missingEvidence.length).toBeGreaterThanOrEqual(2);
      expect(lowConfidenceResult.confidence).toBeLessThan(0.7);
    });
  });

  describe("Signal Convergence Detection", () => {
    it("deduplicates repeated reports from the same source to prevent false convergence", () => {
      const duplicateReports: DiseaseObservationItem[] = [
        {
          observationType: "MORTALITY_SIGNAL",
          sourceName: "Single Local Media Outlet",
          sourceType: "PUBLIC_MEDIA",
          verificationStatus: "SECONDARY",
          state: "Kano",
          commodity: "Broiler Chicken",
          evidenceSummary: "Report 1 on poultry health",
          observedAt: new Date().toISOString(),
          confidence: 0.7,
        },
        {
          observationType: "MORTALITY_SIGNAL",
          sourceName: "Single Local Media Outlet",
          sourceType: "PUBLIC_MEDIA",
          verificationStatus: "SECONDARY",
          state: "Kano",
          commodity: "Broiler Chicken",
          evidenceSummary: "Report 2 on the same issue re-broadcasted",
          observedAt: new Date().toISOString(),
          confidence: 0.7,
        },
      ];

      const convergence = detectSignalConvergence(duplicateReports);
      expect(convergence.independentSourceCount).toBe(1);
      expect(convergence.isConvergent).toBe(false);
      expect(convergence.convergenceScore).toBeLessThan(10);
    });

    it("confirms convergence when independent official and extension sources align", () => {
      const convergence = detectSignalConvergence(sampleObservations);
      expect(convergence.independentSourceCount).toBe(2);
      expect(convergence.isConvergent).toBe(true);
      expect(convergence.verifiedSourcesCount).toBeGreaterThanOrEqual(1);
      expect(convergence.convergenceScore).toBeGreaterThanOrEqual(14);
    });
  });

  describe("Agricultural Biosecurity Resilience Scoring", () => {
    it("strictly bounds resilience scores between 0.0 and 100.0", () => {
      const highResilience = calculateBiosecurityResilienceScore({
        state: "Kano",
        commodity: "Broiler Chicken",
        activeProducersCount: 25,
        regionalSourcesCount: 5,
        supplierDiversityRatio: 0.85,
        movementAlternativesCount: 4,
        aggregationPointsCount: 4,
        processingFacilitiesCount: 4,
        marketDestinationsCount: 5,
        extensionSupportPresent: true,
      });

      expect(highResilience.score).toBeGreaterThanOrEqual(0.0);
      expect(highResilience.score).toBeLessThanOrEqual(100.0);
      expect(highResilience.score).toBeGreaterThanOrEqual(75.0);
      expect(highResilience.level).toBe("HIGH_RESILIENCE");
      expect(highResilience.adaptiveCapacities.length).toBeGreaterThan(0);
    });

    it("evaluates vulnerable biosecurity score when trade basin is concentrated and isolated", () => {
      const lowResilience = calculateBiosecurityResilienceScore({
        state: "Yobe",
        commodity: "Sorghum",
        activeProducersCount: 1,
        regionalSourcesCount: 1,
        supplierDiversityRatio: 0.2,
        movementAlternativesCount: 0,
        aggregationPointsCount: 1,
        processingFacilitiesCount: 0,
        marketDestinationsCount: 1,
        extensionSupportPresent: false,
      });

      expect(lowResilience.score).toBeLessThan(35.0);
      expect(lowResilience.level).toBe("CRITICALLY_VULNERABLE");
      expect(lowResilience.vulnerabilityFactors.length).toBeGreaterThan(0);
    });
  });

  describe("Biosecurity Dependencies Detection", () => {
    it("detects regional production concentration when cluster share is >= 75%", () => {
      const deps = detectBiosecurityDependencies({
        state: "Oyo",
        commodity: "Layer Poultry",
        productionConcentrationPercent: 82.5,
        dominantProducerEntity: "Awe Farm Settlement Cluster",
      });

      expect(deps.some((d) => d.dependencyType === "REGIONAL_PRODUCTION_CONCENTRATION")).toBe(true);
      const dep = deps.find((d) => d.dependencyType === "REGIONAL_PRODUCTION_CONCENTRATION");
      expect(dep?.concentrationPercentage).toBe(82.5);
      expect(dep?.severity).toBe("HIGH");
    });

    it("detects movement dependency when single corridor transit share is >= 75%", () => {
      const deps = detectBiosecurityDependencies({
        state: "Kaduna",
        commodity: "Maize",
        corridorConcentrationPercent: 88.0,
        dominantCorridorName: "Kaduna-Zaria Arterial Highway",
      });

      expect(deps.some((d) => d.dependencyType === "MOVEMENT_DEPENDENCY")).toBe(true);
    });
  });

  describe("Value-Chain Impact & Causation Disclaimers", () => {
    it("strictly includes the mandatory causation disclaimer across impact assessments", () => {
      const mockRisk = calculateDiseaseRiskIndex({
        state: "Kano",
        commodity: "Broiler Chicken",
        observations: sampleObservations,
      });
      const impact = evaluateValueChainImpact(mockRisk, []);

      expect(impact.causationDisclaimer).toContain("Correlation is not causation");
      expect(impact.causationDisclaimer).toContain("require verification by official agricultural and veterinary authorities");
    });
  });

  describe("Anti-Pork Hard Invariant", () => {
    it("strictly rejects pig, pork, swine, bacon, ham, lard terms across calculations", () => {
      expect(() => {
        calculateDiseaseRiskIndex({
          state: "Benue",
          commodity: "Pork Meat",
          observations: [],
        });
      }).toThrow(/prohibited produce/i);

      expect(() => {
        calculateBiosecurityResilienceScore({
          state: "Plateau",
          commodity: "Swine Feeds",
        });
      }).toThrow(/prohibited produce/i);

      expect(() => {
        detectBiosecurityDependencies({
          state: "Lagos",
          commodity: "Bacon Slices",
          productionConcentrationPercent: 80,
        });
      }).toThrow(/prohibited produce/i);
    });
  });

  describe("Autonomous-Free Early Warning Orchestrator", () => {
    it("runs agent with deterministic-only fallback when skipAIEvaluation is true", async () => {
      const result = await runAgriculturalDiseaseAgent({
        state: "Kano",
        commodity: "Broiler Chicken",
        category: "POULTRY",
        domain: "LIVESTOCK",
        newObservations: sampleObservations,
        skipAIEvaluation: true,
      });

      expect(result.success).toBe(true);
      expect(result.riskIndex).toBeDefined();
      expect(result.resilienceAssessment).toBeDefined();
      expect(result.convergence.isConvergent).toBe(true);
      expect(result.aiReasoning).toBeUndefined();
    });

    it("proactively blocks prohibited pork commodities at the agent orchestrator boundary", async () => {
      await expect(
        runAgriculturalDiseaseAgent({
          state: "Edo",
          commodity: "Pig Livestock",
          skipAIEvaluation: true,
        })
      ).rejects.toThrow(/prohibited produce/i);
    });

    it("generates early-warning alert in REVIEW status rather than auto-published", async () => {
      const result = await runAgriculturalDiseaseAgent({
        state: "Kano",
        commodity: "Broiler Chicken",
        newObservations: sampleObservations,
        skipAIEvaluation: true,
      });

      if (result.alerts.length > 0) {
        expect(result.alerts[0].status).toBe("REVIEW");
        expect(result.alerts[0].status).not.toBe("PUBLISHED");
        expect(result.alerts[0].officialConsultationAdvice).toContain("consult certified veterinary doctors");
      }
    });
  });
});
