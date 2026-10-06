import { describe, it, expect, vi } from "vitest";
import {
  calculateProcurementPriority,
  classifyProcurementStrategy,
  analyzeSupplierDiversification,
  assessProcurementRisk,
  calculateCostIntelligence,
  determineOpportunityStatus,
} from "@/features/procurement-intelligence/calculations";
import { runProcurementIntelligenceAgent } from "@/features/procurement-intelligence/agent";
import { PORK_PROHIBITED_REGEX, assertNoProhibitedProduce } from "@/features/intelligence/validation";

describe("Phase 2.7: Procurement Intelligence Deterministic Calculations", () => {
  describe("Procurement Priority Scoring", () => {
    it("strictly bounds priority scores between 0.0 and 100.0", () => {
      const maxed = calculateProcurementPriority({
        targetQuantity: 1000,
        matchedQuantity: 0,
        desiredDeliveryDate: new Date(Date.now() + 86400000).toISOString(), // 1 day out
        demandPressureScore: 100,
        marketPressureScore: 100,
        matchScore: 100,
        leadTimeDays: 0,
        securityDisruptionReported: true,
      });

      expect(maxed.score).toBeGreaterThanOrEqual(0);
      expect(maxed.score).toBeLessThanOrEqual(100);
      expect(maxed.score).toBe(100); // 25 + 20 + 15 + 15 + 10 + 10 + 5 = 100
      expect(maxed.level).toBe("CRITICAL");

      const minimized = calculateProcurementPriority({
        targetQuantity: 1000,
        matchedQuantity: 1000, // 100% fulfilled
        desiredDeliveryDate: new Date(Date.now() + 86400000 * 60).toISOString(), // 60 days out
        demandPressureScore: 0,
        marketPressureScore: 0,
        matchScore: 0,
        leadTimeDays: 30,
        securityDisruptionReported: false,
      });

      expect(minimized.score).toBeGreaterThanOrEqual(0);
      expect(minimized.score).toBeLessThanOrEqual(100);
      expect(minimized.level).toBe("LOW");
    });

    it("evaluates demand urgency based on delivery horizon", () => {
      const imminent = calculateProcurementPriority({
        targetQuantity: 500,
        matchedQuantity: 200,
        desiredDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      });
      expect(imminent.components.demandUrgency).toBe(25);

      const moderate = calculateProcurementPriority({
        targetQuantity: 500,
        matchedQuantity: 200,
        desiredDeliveryDate: new Date(Date.now() + 86400000 * 10).toISOString(),
      });
      expect(moderate.components.demandUrgency).toBe(15);

      const distant = calculateProcurementPriority({
        targetQuantity: 500,
        matchedQuantity: 200,
        desiredDeliveryDate: new Date(Date.now() + 86400000 * 45).toISOString(),
      });
      expect(distant.components.demandUrgency).toBe(5);
    });

    it("records missing evidence when required parameters are absent", () => {
      const sparse = calculateProcurementPriority({
        targetQuantity: 1000,
        matchedQuantity: 500,
      });

      expect(sparse.missingEvidence.length).toBeGreaterThan(0);
      expect(sparse.confidence).toBeLessThan(1.0);
    });
  });

  describe("Strategy Classification", () => {
    it("classifies DIRECT_SUPPLIER when a single supplier meets >= 95% of demand", () => {
      const strategy = classifyProcurementStrategy({
        commodity: "Sorghum",
        targetQuantity: 1000,
        matchedQuantity: 1000,
        candidateCount: 1,
        maxSingleSupplierQuantity: 1000,
      });
      expect(strategy).toBe("DIRECT_SUPPLIER");
    });

    it("classifies MULTI_SUPPLIER when volume is spread across multiple suppliers", () => {
      const strategy = classifyProcurementStrategy({
        commodity: "Soybeans",
        targetQuantity: 5000,
        matchedQuantity: 4500,
        candidateCount: 2,
        maxSingleSupplierQuantity: 2500,
      });
      expect(strategy).toBe("MULTI_SUPPLIER");
    });

    it("classifies AGGREGATED_PROCUREMENT when pooling or 3+ smallholders participate", () => {
      const strategy = classifyProcurementStrategy({
        commodity: "Sesame",
        targetQuantity: 3000,
        matchedQuantity: 2500,
        candidateCount: 4,
        maxSingleSupplierQuantity: 800,
        isAggregatedPoolPresent: true,
      });
      expect(strategy).toBe("AGGREGATED_PROCUREMENT");
    });

    it("classifies PROCESSING_REQUIRED when commodity requires processing", () => {
      const strategy = classifyProcurementStrategy({
        commodity: "Cassava",
        targetQuantity: 2000,
        matchedQuantity: 2000,
        candidateCount: 1,
        maxSingleSupplierQuantity: 2000,
        requiresProcessing: true,
      });
      expect(strategy).toBe("PROCESSING_REQUIRED");
    });

    it("classifies REGIONAL_ALTERNATIVE when local supply is under 30% but corridor alternative exists", () => {
      const strategy = classifyProcurementStrategy({
        commodity: "Tomato",
        targetQuantity: 10000,
        matchedQuantity: 2000,
        candidateCount: 1,
        maxSingleSupplierQuantity: 2000,
        alternativeRegionalSupplyAvailable: true,
      });
      expect(strategy).toBe("REGIONAL_ALTERNATIVE");
    });

    it("classifies WAIT_AND_MONITOR when upcoming harvest forecast covers deficit", () => {
      const strategy = classifyProcurementStrategy({
        commodity: "Yam",
        targetQuantity: 10000,
        matchedQuantity: 1000,
        candidateCount: 1,
        maxSingleSupplierQuantity: 1000,
        upcomingHarvestForecastQuantity: 8000,
      });
      expect(strategy).toBe("WAIT_AND_MONITOR");
    });

    it("classifies INSUFFICIENT_DATA when target quantity is invalid or zero", () => {
      const strategy = classifyProcurementStrategy({
        commodity: "Cowpea",
        targetQuantity: 0,
        matchedQuantity: 0,
        candidateCount: 0,
        maxSingleSupplierQuantity: 0,
      });
      expect(strategy).toBe("INSUFFICIENT_DATA");
    });
  });

  describe("Supplier Diversification & Concentration", () => {
    it("flags SUPPLY_CONCENTRATION_RISK when one supplier exceeds 80% allocation", () => {
      const analysis = analyzeSupplierDiversification([
        { supplierId: "sup-1", supplierName: "Mega Farm", allocatedQuantity: 900 },
        { supplierId: "sup-2", supplierName: "Small Farm", allocatedQuantity: 100 },
      ]);

      expect(analysis.concentrationDetected).toBe(true);
      expect(analysis.concentrationRatio).toBe(90);
      expect(analysis.notes.some((n) => n.includes("SUPPLY_CONCENTRATION_RISK"))).toBe(true);
    });

    it("confirms balanced diversification across suppliers", () => {
      const analysis = analyzeSupplierDiversification([
        { supplierId: "sup-1", supplierName: "Farm A", allocatedQuantity: 400 },
        { supplierId: "sup-2", supplierName: "Farm B", allocatedQuantity: 350 },
        { supplierId: "sup-3", supplierName: "Farm C", allocatedQuantity: 250 },
      ]);

      expect(analysis.concentrationDetected).toBe(false);
      expect(analysis.concentrationRatio).toBe(40);
      expect(analysis.notes[0]).toContain("Healthy allocation spread");
    });

    it("handles zero allocations gracefully", () => {
      const analysis = analyzeSupplierDiversification([]);
      expect(analysis.concentrationDetected).toBe(false);
      expect(analysis.supplierCount).toBe(0);
      expect(analysis.concentrationRatio).toBe(0);
    });
  });

  describe("Procurement Risk Assessment", () => {
    it("escalates risk when security disruption and severe supply deficits exist", () => {
      const risk = assessProcurementRisk({
        commodity: "Onions",
        targetQuantity: 1000,
        matchedQuantity: 100, // 90% deficit
        concentrationDetected: true,
        securityDisruptionReported: true,
        corridorDisruptionReported: true,
        processingBottleneckDetected: false,
        confidence: 0.9,
      });

      expect(risk.riskLevel).toBe("CRITICAL");
      expect(risk.riskFactors).toContain("SEVERE_SUPPLY_DEFICIT");
      expect(risk.riskFactors).toContain("SECURITY_DISRUPTION_REPORTED");
      expect(risk.riskFactors).toContain("SUPPLIER_CONCENTRATION_RISK");
    });

    it("maintains low risk for well-matched supply without disruptions", () => {
      const risk = assessProcurementRisk({
        commodity: "Maize",
        targetQuantity: 1000,
        matchedQuantity: 1000,
        concentrationDetected: false,
        securityDisruptionReported: false,
        corridorDisruptionReported: false,
        processingBottleneckDetected: false,
        confidence: 0.95,
      });

      expect(risk.riskLevel).toBe("LOW");
      expect(risk.riskFactors.length).toBe(0);
    });
  });

  describe("Cost Intelligence & Real Market Price Integrity", () => {
    it("never creates fake prices when observations are absent", () => {
      const cost = calculateCostIntelligence({
        commodity: "Millet",
        state: "Sokoto",
        unit: "KG",
        targetQuantity: 5000,
        observations: [],
      });

      expect(cost.observedPriceMin).toBeNull();
      expect(cost.observedPriceMax).toBeNull();
      expect(cost.observedPriceMedian).toBeNull();
      expect(cost.estimatedProcurementCost).toBeNull();
      expect(cost.notes[0]).toContain("Estimated procurement cost withheld to prevent hallucination");
    });

    it("computes accurate min, max, median, and trend from real price observations", () => {
      const cost = calculateCostIntelligence({
        commodity: "Ginger",
        state: "Kaduna",
        unit: "KG",
        targetQuantity: 100,
        observations: [
          { pricePerUnit: 1200, observedAt: "2026-09-01T00:00:00Z" },
          { pricePerUnit: 1400, observedAt: "2026-09-10T00:00:00Z" },
          { pricePerUnit: 1500, observedAt: "2026-09-20T00:00:00Z" },
        ],
      });

      expect(cost.observedPriceMin).toBe(1200);
      expect(cost.observedPriceMax).toBe(1500);
      expect(cost.observedPriceMedian).toBe(1400);
      expect(cost.estimatedProcurementCost).toBe(140000); // 100 * 1400
      expect(cost.priceTrend).toBe("INCREASING");
      expect(cost.observationCount).toBe(3);
    });
  });

  describe("Opportunity Status Determination", () => {
    it("identifies SOURCED when fulfillment meets 98%", () => {
      expect(determineOpportunityStatus(1000, 1000, [])).toBe("SOURCED");
      expect(determineOpportunityStatus(1000, 985, [])).toBe("SOURCED");
    });

    it("identifies CONSTRAINED when security notices are active", () => {
      expect(determineOpportunityStatus(1000, 500, ["SECURITY_DISRUPTION_REPORTED"])).toBe("CONSTRAINED");
    });

    it("identifies PARTIALLY_SOURCED when partial volume matched without severe constraint", () => {
      expect(determineOpportunityStatus(1000, 500, [])).toBe("PARTIALLY_SOURCED");
    });
  });

  describe("Anti-Pork / Halal Invariant Enforcement", () => {
    it("rejects prohibited pig/pork terms in calculations and agent invocations", () => {
      expect(() => {
        assertNoProhibitedProduce("Pork Tenderloin", "Commodity");
      }).toThrow(/prohibited produce terms/i);

      expect(() => {
        classifyProcurementStrategy({
          commodity: "Swine Meat",
          targetQuantity: 100,
          matchedQuantity: 100,
          candidateCount: 1,
          maxSingleSupplierQuantity: 100,
        });
      }).toThrow(/prohibited produce terms/i);

      expect(PORK_PROHIBITED_REGEX.test("Bacon Chunks")).toBe(true);
      expect(PORK_PROHIBITED_REGEX.test("Smoked Ham")).toBe(true);
      expect(PORK_PROHIBITED_REGEX.test("Hog Ribs")).toBe(true);
      expect(PORK_PROHIBITED_REGEX.test("White Maize")).toBe(false);
      expect(PORK_PROHIBITED_REGEX.test("Broiler Chicken")).toBe(false);
    });
  });

  describe("Agent Orchestration with AI Gateway Fallback", () => {
    it("executes successfully with graceful AI fallback when AI is skipped", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "test-snapshot-uuid" } }),
            }),
          }),
        }),
      };

      const result = await runProcurementIntelligenceAgent({
        commodity: "Yellow Cassava",
        state: "Ogun",
        targetQuantity: 2000,
        unit: "KG",
        skipAIEvaluation: true,
        supabaseClient: mockSupabase,
      });

      expect(result.success).toBe(true);
      expect(result.commodity).toBe("Yellow Cassava");
      expect(result.snapshot.target_quantity).toBe(2000);
      expect(result.aiSkippedOrFailed).toBe(true);
      expect(result.aiInterpretation).toBeNull();
      expect(result.snapshot.procurement_priority_score).toBeGreaterThanOrEqual(0);
      expect(result.snapshot.procurement_priority_score).toBeLessThanOrEqual(100);
    });
  });
});
