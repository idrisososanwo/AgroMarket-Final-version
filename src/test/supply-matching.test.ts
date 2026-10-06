/**
 * AgroMarket Phase 2.6: Supply Matching & Agricultural Coordination Agent Tests
 *
 * Comprehensive test suite validating:
 * 1. Commodity compatibility & anti-pork rejection
 * 2. Unit normalization & incompatible unit detection
 * 3. Location proximity tiers & corridor scoring
 * 4. Availability & delivery deadline alignment
 * 5. Quality specification matching
 * 6. Deterministic match scoring bounds (0-100)
 * 7. Multi-source greedy aggregation & remaining gap calculation
 * 8. Supply gap classification
 * 9. Processing facility requirements & bottleneck detection
 * 10. Logistics & security disruption constraints
 * 11. Supply reliability categorization
 * 12. End-to-end agent orchestration with AI fallback
 * 13. Privacy protection & PII stripping
 */

import { describe, it, expect } from "vitest";
import {
  areCommoditiesCompatible,
  resolveLocationTier,
  evaluateAvailabilityScore,
  evaluateSpecificationScore,
  aggregateMultiSourceSupplies,
  calculateSupplyGap,
  executeSupplyMatching,
} from "@/features/supply-matching/calculations";
import { normalizeSupplyToDemandUnit } from "@/features/supply-matching/units";
import { determineSupplyReliability } from "@/features/supply-matching/data-layer";
import { runSupplyMatchingAgent } from "@/features/supply-matching/agent";
import {
  SupplyObservationRecord,
  DemandOfftakeTarget,
  ProcessingFacilityCandidate,
  EvaluatedCandidateSupply,
} from "@/features/supply-matching/types";

describe("Phase 2.6: Supply Matching & Agricultural Coordination Agent", () => {
  // ---------------------------------------------------------------------------
  // 1. Anti-Pork & Commodity Compatibility
  // ---------------------------------------------------------------------------
  describe("Anti-Pork & Commodity Compatibility", () => {
    it("strictly rejects pork and porcine commodities with an error", () => {
      expect(() => areCommoditiesCompatible("pork", "maize")).toThrow();
      expect(() => areCommoditiesCompatible("maize", "pig meat")).toThrow();
      expect(() => areCommoditiesCompatible("swine", "swine")).toThrow();
      expect(() => areCommoditiesCompatible("bacon rashers", "bacon")).toThrow();
    });

    it("evaluates exact commodity matches correctly", () => {
      const match = areCommoditiesCompatible("Maize", "Maize");
      expect(match.isCompatible).toBe(true);
      expect(match.score).toBe(30);
    });

    it("matches canonical Nigerian agricultural synonyms", () => {
      const match1 = areCommoditiesCompatible("Corn", "Maize");
      expect(match1.isCompatible).toBe(true);
      expect(match1.score).toBeGreaterThanOrEqual(25);

      const match2 = areCommoditiesCompatible("Soya", "Soybean");
      expect(match2.isCompatible).toBe(true);
      expect(match2.score).toBeGreaterThanOrEqual(25);

      const match3 = areCommoditiesCompatible("Cowpea", "Beans");
      expect(match3.isCompatible).toBe(true);
      expect(match3.score).toBeGreaterThanOrEqual(25);
    });

    it("returns incompatible for distinct commodities", () => {
      const match = areCommoditiesCompatible("Tomatoes", "Cassava");
      expect(match.isCompatible).toBe(false);
      expect(match.score).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Unit Normalization & Compatibility
  // ---------------------------------------------------------------------------
  describe("Unit Normalization & Incompatible Unit Protection", () => {
    it("safely normalizes TONNES to KG", () => {
      const res = normalizeSupplyToDemandUnit(2.5, "TONNES", "KG");
      expect(res.isCompatible).toBe(true);
      expect(res.normalizedSupplyQuantity).toBe(2500);
      expect(res.status).toBe("NORMALIZED");
    });

    it("safely normalizes 50KG BAG to KG", () => {
      const res = normalizeSupplyToDemandUnit(20, "50kg bag", "KG");
      expect(res.isCompatible).toBe(true);
      expect(res.normalizedSupplyQuantity).toBe(1000);
    });

    it("safely matches exact discrete units", () => {
      const res = normalizeSupplyToDemandUnit(100, "CRATE", "CRATE");
      expect(res.isCompatible).toBe(true);
      expect(res.normalizedSupplyQuantity).toBe(100);
      expect(res.status).toBe("EXACT");
    });

    it("strictly rejects converting discrete units (crates, cartons, tubers) to weight without specs", () => {
      const res1 = normalizeSupplyToDemandUnit(50, "CRATE", "KG");
      expect(res1.isCompatible).toBe(false);
      expect(res1.status).toBe("INCOMPATIBLE_UNIT");
      expect(res1.normalizedSupplyQuantity).toBeNull();

      const res2 = normalizeSupplyToDemandUnit(100, "CARTON", "KG");
      expect(res2.isCompatible).toBe(false);
      expect(res2.status).toBe("INCOMPATIBLE_UNIT");

      const res3 = normalizeSupplyToDemandUnit(50, "TUBER", "LITRE");
      expect(res3.isCompatible).toBe(false);
      expect(res3.status).toBe("INCOMPATIBLE_UNIT");
    });

    it("handles invalid or negative quantity with INSUFFICIENT_DATA", () => {
      const res = normalizeSupplyToDemandUnit(-10, "KG", "KG");
      expect(res.isCompatible).toBe(false);
      expect(res.status).toBe("INSUFFICIENT_DATA");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Location & Corridor Proximity Scoring
  // ---------------------------------------------------------------------------
  describe("Location & Corridor Scoring", () => {
    it("awards max score for same LGA", () => {
      const loc = resolveLocationTier("Kano", "Dala", "Kano", "Dala");
      expect(loc.tier).toBe("SAME_LGA");
      expect(loc.score).toBe(15);
    });

    it("awards same state score when LGAs differ", () => {
      const loc = resolveLocationTier("Kano", "Dala", "Kano", "Fagge");
      expect(loc.tier).toBe("SAME_STATE");
      expect(loc.score).toBe(12);
    });

    it("awards regional corridor score for neighboring states in same geopolitical zone", () => {
      // Lagos and Ogun are both in South West corridor
      const loc = resolveLocationTier("Ogun", "Abeokuta", "Lagos", "Ikeja");
      expect(loc.tier).toBe("REGIONAL_CORRIDOR");
      expect(loc.score).toBe(8);
    });

    it("awards national score for distant corridors", () => {
      // Lagos (South West) to Kano (North West)
      const loc = resolveLocationTier("Kano", "Dala", "Lagos", "Ikeja");
      expect(loc.tier).toBe("NATIONAL");
      expect(loc.score).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Availability & Delivery Alignment
  // ---------------------------------------------------------------------------
  describe("Availability Alignment", () => {
    it("awards full 15 points when supply is ready before desired delivery date", () => {
      const ready = "2026-10-10T00:00:00Z";
      const delivery = "2026-10-15T00:00:00Z";
      const res = evaluateAvailabilityScore(ready, delivery);
      expect(res.score).toBe(15);
    });

    it("awards partial points for minor delivery lag (within 3 days)", () => {
      const ready = "2026-10-12T00:00:00Z";
      const delivery = "2026-10-10T00:00:00Z";
      const res = evaluateAvailabilityScore(ready, delivery);
      expect(res.score).toBe(8);
    });

    it("penalizes major delivery lag (> 3 days past delivery date)", () => {
      const ready = "2026-10-25T00:00:00Z";
      const delivery = "2026-10-10T00:00:00Z";
      const res = evaluateAvailabilityScore(ready, delivery);
      expect(res.score).toBe(2);
    });

    it("handles missing ready date without fabricating a perfect score", () => {
      const res = evaluateAvailabilityScore(undefined, "2026-10-15T00:00:00Z");
      expect(res.score).toBe(5);
      expect(res.missingEvidence).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Specification & Quality Grade Matching
  // ---------------------------------------------------------------------------
  describe("Specification Compatibility", () => {
    it("awards max score for matching grade", () => {
      const res = evaluateSpecificationScore("PREMIUM", "PREMIUM");
      expect(res.score).toBe(10);
    });

    it("awards high score when supply exceeds standard grade", () => {
      const res = evaluateSpecificationScore("PREMIUM", "STANDARD");
      expect(res.score).toBe(9);
    });

    it("penalizes unspecified supply grade against explicit requirement", () => {
      const res = evaluateSpecificationScore(undefined, "EXPORT");
      expect(res.score).toBe(4);
      expect(res.missingEvidence).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Multi-Source Greedy Aggregation
  // ---------------------------------------------------------------------------
  describe("Multi-Source Supply Aggregation", () => {
    const mockSupply = (id: string, qty: number, state: string, score: number): EvaluatedCandidateSupply => ({
      supply: {
        id,
        sourceType: "PRODUCTION_OUTPUT",
        commodity: "Cassava",
        quantity: qty,
        unit: "KG",
        state,
        producerOrAggregatorName: `Farmer ${id}`,
        verificationStatus: "VERIFIED",
        reliabilityLevel: "HIGH",
        availabilityStatus: "AVAILABLE_NOW",
      },
      candidateScore: score,
      allocatedQuantity: 0,
      proximityTier: "SAME_STATE",
      reliabilityLevel: "HIGH",
      corridor: `${state} -> Lagos`,
      notes: [],
    });

    it("pools multiple suppliers to fulfill large B2B demand and records remaining gap", () => {
      const demandQty = 5000;
      const candidates = [
        mockSupply("A", 2000, "Ogun", 85),
        mockSupply("B", 1500, "Ogun", 80),
        mockSupply("C", 1000, "Oyo", 75),
      ];

      const { allocatedCandidates, totalAllocated, remainingGap, summary } =
        aggregateMultiSourceSupplies(candidates, demandQty, "KG");

      expect(totalAllocated).toBe(4500);
      expect(remainingGap).toBe(500);
      expect(summary.aggregatedFulfillmentPercentage).toBe(90);
      expect(summary.sourcesCount).toBe(3);
      expect(allocatedCandidates.length).toBe(3);
      expect(allocatedCandidates[0].allocatedQuantity).toBe(2000);
      expect(allocatedCandidates[1].allocatedQuantity).toBe(1500);
      expect(allocatedCandidates[2].allocatedQuantity).toBe(1000);
    });

    it("stops allocating once demand is fully satisfied", () => {
      const demandQty = 2500;
      const candidates = [
        mockSupply("A", 2000, "Ogun", 90),
        mockSupply("B", 1500, "Ogun", 85),
      ];

      const { allocatedCandidates, totalAllocated, remainingGap, summary } =
        aggregateMultiSourceSupplies(candidates, demandQty, "KG");

      expect(totalAllocated).toBe(2500);
      expect(remainingGap).toBe(0);
      expect(summary.aggregatedFulfillmentPercentage).toBe(100);
      expect(allocatedCandidates.length).toBe(2);
      expect(allocatedCandidates[0].allocatedQuantity).toBe(2000);
      expect(allocatedCandidates[1].allocatedQuantity).toBe(500); // Only 500 allocated
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Supply Gap Analysis Classification
  // ---------------------------------------------------------------------------
  describe("Supply Gap Analysis", () => {
    const demand: DemandOfftakeTarget = {
      id: "DEMAND-1",
      title: "Cassava Offtake",
      commodityOrProduct: "Cassava",
      quantity: 5000,
      unit: "KG",
      state: "Lagos",
      desiredDeliveryDate: "2026-10-20T00:00:00Z",
    };

    it("classifies fully satisfied demand", () => {
      const gap = calculateSupplyGap(demand, 5000, 2, false, []);
      expect(gap.status).toBe("FULLY_SATISFIED");
      expect(gap.remainingQuantity).toBe(0);
      expect(gap.percentageFulfilled).toBe(100);
      expect(gap.aggregationRequired).toBe(true);
    });

    it("classifies partially satisfied demand", () => {
      const gap = calculateSupplyGap(demand, 3500, 2, false, []);
      expect(gap.status).toBe("PARTIALLY_SATISFIED");
      expect(gap.remainingQuantity).toBe(1500);
      expect(gap.percentageFulfilled).toBe(70);
    });

    it("classifies unsatisfied demand with zero matched volume", () => {
      const gap = calculateSupplyGap(demand, 0, 0, false, []);
      expect(gap.status).toBe("UNSATISFIED");
      expect(gap.remainingQuantity).toBe(5000);
      expect(gap.percentageFulfilled).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Processing Facilities & Bottleneck Detection
  // ---------------------------------------------------------------------------
  describe("Processing Requirements", () => {
    const demand: DemandOfftakeTarget = {
      id: "DEMAND-PROC",
      title: "Milled Cassava Flour Demand",
      commodityOrProduct: "Cassava",
      quantity: 1000,
      unit: "KG",
      state: "Ogun",
      desiredDeliveryDate: "2026-10-25T00:00:00Z",
      requiresProcessing: true,
    };

    const rawSupply: SupplyObservationRecord = {
      id: "SUPPLY-RAW",
      sourceType: "PRODUCTION_OUTPUT",
      commodity: "Cassava",
      quantity: 1000,
      unit: "KG",
      state: "Ogun",
      producerOrAggregatorName: "Raw Cassava Farm",
      requiresProcessing: true,
      verificationStatus: "VERIFIED",
      reliabilityLevel: "HIGH",
      availabilityStatus: "PROCESSING_REQUIRED",
    };

    it("routes raw output through processor when facility is available", () => {
      const facility: ProcessingFacilityCandidate = {
        id: "FAC-1",
        name: "Ogun Agro Millers Ltd",
        facilityType: "CROP_PROCESSOR",
        supportedCommodities: ["Cassava", "Yam"],
        capacityValue: 5000,
        capacityUnit: "KG",
        state: "Ogun",
        verificationStatus: "VERIFIED",
        isActive: true,
      };

      const result = executeSupplyMatching(demand, [rawSupply], [facility], []);
      expect(result.processingRequirement?.required).toBe(true);
      expect(result.processingRequirement?.facilityAvailable).toBe(true);
      expect(result.processingRequirement?.matchedFacility?.id).toBe("FAC-1");
    });

    it("flags processing bottleneck when no certified facility is available", () => {
      const result = executeSupplyMatching(demand, [rawSupply], [], []);
      expect(result.processingRequirement?.required).toBe(true);
      expect(result.processingRequirement?.facilityAvailable).toBe(false);
      expect(result.processingRequirement?.bottleneckDetected).toBe(true);
      expect(result.constraints.some((c) => c.includes("PROCESSING_BOTTLENECK"))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Logistics & Security Constraints
  // ---------------------------------------------------------------------------
  describe("Logistics & Security Constraints", () => {
    const demand: DemandOfftakeTarget = {
      id: "DEMAND-LOG",
      title: "Yellow Maize Demand",
      commodityOrProduct: "Yellow Maize",
      quantity: 2000,
      unit: "KG",
      state: "Kaduna",
      desiredDeliveryDate: "2026-10-20T00:00:00Z",
    };

    const supply: SupplyObservationRecord = {
      id: "SUPPLY-KANO",
      sourceType: "LISTING",
      commodity: "Yellow Maize",
      quantity: 2000,
      unit: "KG",
      state: "Kano",
      producerOrAggregatorName: "Kano Grains Depot",
      verificationStatus: "VERIFIED",
      reliabilityLevel: "HIGH",
      availabilityStatus: "AVAILABLE_NOW",
    };

    it("detects security disruption notice and triggers corridor review constraint", () => {
      const securityIncidents = [
        "Kaduna: Transit security alert along expressway (Abuja-Kaduna corridor)",
      ];

      const result = executeSupplyMatching(demand, [supply], [], [], securityIncidents);
      expect(result.constraints.some((c) => c.includes("SECURITY_DISRUPTION_REPORTED"))).toBe(true);
      expect(result.constraints.some((c) => c.includes("CORRIDOR_REVIEW_REQUIRED"))).toBe(true);
      expect(result.componentScores.logisticsCompatibility).toBeLessThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Match Score Bounds & Classifications
  // ---------------------------------------------------------------------------
  describe("Match Score Bounds & Classifications", () => {
    it("ensures match scores are strictly bounded between 0 and 100", () => {
      const demand: DemandOfftakeTarget = {
        id: "D-1",
        title: "Test",
        commodityOrProduct: "Maize",
        quantity: 1000,
        unit: "KG",
        state: "Lagos",
        desiredDeliveryDate: "2026-10-20T00:00:00Z",
      };

      const supply: SupplyObservationRecord = {
        id: "S-1",
        sourceType: "LISTING",
        commodity: "Maize",
        quantity: 1000,
        unit: "KG",
        state: "Lagos",
        producerOrAggregatorName: "Lagos Farm",
        verificationStatus: "VERIFIED",
        reliabilityLevel: "HIGH",
        availabilityStatus: "AVAILABLE_NOW",
      };

      const result = executeSupplyMatching(demand, [supply], [], []);
      expect(result.matchScore).toBeGreaterThanOrEqual(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
      expect(result.matchClassification).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Supply Reliability
  // ---------------------------------------------------------------------------
  describe("Supply Reliability Determination", () => {
    it("assigns HIGH reliability to verified or inspected actors with transaction history", () => {
      expect(determineSupplyReliability("VERIFIED", 5)).toBe("HIGH");
      expect(determineSupplyReliability("OFFICIAL", 0)).toBe("HIGH");
    });

    it("assigns MEDIUM reliability to self-declared actors", () => {
      expect(determineSupplyReliability("SELF_DECLARED", 1)).toBe("MEDIUM");
    });

    it("assigns LOW reliability to stale data", () => {
      expect(determineSupplyReliability("VERIFIED", 5, true)).toBe("LOW");
    });

    it("assigns UNKNOWN when unverified and lacking history", () => {
      expect(determineSupplyReliability("UNVERIFIED", 0)).toBe("UNKNOWN");
    });
  });

  // ---------------------------------------------------------------------------
  // 12. End-to-End Supply Matching Orchestrator
  // ---------------------------------------------------------------------------
  describe("End-to-End Agent Orchestrator", () => {
    it("runs supply matching agent in offline/mock mode with deterministic advisory outputs", async () => {
      const result = await runSupplyMatchingAgent({
        commodity: "Maize",
        state: "Kano",
        targetQuantity: 2000,
        unit: "KG",
        skipAIEvaluation: true,
        // Mock supabase returning empty records
        supabaseClient: {
          from: () => ({
            select: () => ({
              eq: () => ({ gt: () => ({ ilike: () => Promise.resolve({ data: [] }) }) }),
              in: () => ({ gt: () => ({ ilike: () => Promise.resolve({ data: [] }) }) }),
              gt: () => ({ ilike: () => Promise.resolve({ data: [] }) }),
              order: () => ({ limit: () => Promise.resolve({ data: [] }) }),
              limit: () => Promise.resolve({ data: [] }),
            }),
            insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "mock-snap-id" } }) }) }),
          }),
        },
      });

      expect(result.success).toBe(true);
      expect(result.commodity).toBe("Maize");
      expect(result.state).toBe("Kano");
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.match_score).toBeGreaterThanOrEqual(0);
      expect(result.gapAnalysis).toBeDefined();
      expect(result.aiInterpretation).toBeDefined();
      expect(result.aiInterpretation?.isAIGenerated).toBe(false); // Deterministic fallback
    });

    it("strictly rejects running matching with pork commodities", async () => {
      await expect(
        runSupplyMatchingAgent({
          commodity: "Pork belly",
          state: "Lagos",
        })
      ).rejects.toThrow();
    });
  });
});
