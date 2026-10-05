import { describe, it, expect } from "vitest";
import {
  ECOSYSTEM_ACTOR_TYPES,
  PRODUCTION_UNIT_TYPES,
  PRODUCTION_OUTPUT_TYPES,
  PROCESSING_FACILITY_TYPES,
  PROCESS_TYPES,
  VALUE_CHAIN_EVENT_TYPES,
  B2BDemand,
  MatchingCandidateSupply,
  MatchingCandidateFacility,
  MatchingCandidateLogistics,
} from "@/features/ecosystem/types";
import {
  ecosystemActorSchema,
  productionUnitSchema,
  productionOutputSchema,
  aggregationPoolSchema,
  aggregationContributionSchema,
  processingFacilitySchema,
  processingEventSchema,
  valueChainEventSchema,
  b2bDemandSchema,
} from "@/features/ecosystem/validation";
import {
  matchSupplyDemand,
  computeProximityTier,
  areStatesInSameCorridor,
} from "@/features/ecosystem/matching";
import { getCanonicalValueChainTemplates } from "@/features/ecosystem/queries";
import { containsProhibitedProduce } from "@/features/marketplace/validation";

describe("Phase 2.0 Agricultural Ecosystem Domain Tests", () => {
  describe("1. Strict Anti-Pork Policy Compliance Across All Primitives", () => {
    const prohibitedTerms = [
      "Pork",
      "pork chops",
      "Live Pig",
      "Swine breeding stock",
      "Piglet feed",
      "Smoked bacon",
      "Ham cuts",
      "Pure lard",
      "Hog livestock",
      "Boar",
    ];

    it("detects and rejects any porcine keyword in helper validator", () => {
      prohibitedTerms.forEach((term) => {
        expect(containsProhibitedProduce(term)).toBe(true);
        expect(containsProhibitedProduce(`Organic ${term} wholesale`)).toBe(true);
      });
    });

    it("permits permitted crop, livestock, aquaculture, and dairy produce", () => {
      const allowed = [
        "Broiler Chicken",
        "Sokoto Red Goat",
        "White Fulani Cattle",
        "African Catfish",
        "Tilapia Fingerlings",
        "Fresh Cow Milk",
        "White Maize",
        "Cassava Tubers",
        "Garri Ijebu",
        "Roma Tomatoes",
        "Oloyin Beans",
        "Snail Giant African",
      ];
      allowed.forEach((item) => {
        expect(containsProhibitedProduce(item)).toBe(false);
      });
    });

    it("rejects pork terms in Ecosystem Actor schemas", () => {
      const invalid = ecosystemActorSchema.safeParse({
        actorType: "FARMER",
        displayName: "Abuja Pig & Pork Farm",
        state: "FCT - Abuja",
        lga: "Gwagwalada",
        capabilities: ["Livestock"],
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects pork terms in Production Unit schemas", () => {
      const invalid = productionUnitSchema.safeParse({
        name: "Lagos Pig Farm Facility",
        unitType: "FARM",
        state: "Lagos",
        lga: "Epe",
        commodities: ["Live Swine"],
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects pork terms in Production Output schemas", () => {
      const invalid = productionOutputSchema.safeParse({
        commodityName: "Pork Carcass",
        outputType: "CARCASS",
        quantity: 50,
        unit: "kg",
        state: "Oyo",
        lga: "Ibadan North",
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects pork terms in Aggregation Pool schemas", () => {
      const invalid = aggregationPoolSchema.safeParse({
        title: "Pooled Pork Meat Aggregation",
        commodity: "Pork",
        targetQuantity: 1000,
        unit: "kg",
        state: "Delta",
        lga: "Warri South",
        expectedAvailabilityDate: "2026-11-01",
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects pork terms in Processing Facility schemas", () => {
      const invalid = processingFacilitySchema.safeParse({
        name: "Central Pork Slaughterhouse",
        facilityType: "ABATTOIR",
        state: "Kaduna",
        lga: "Kaduna North",
        supportedCommodities: ["Swine", "Pork"],
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects pork terms in Processing Event schemas", () => {
      const invalid = processingEventSchema.safeParse({
        processType: "SLAUGHTER_AND_DRESS",
        inputDescription: "Live pig batches",
        inputQuantity: 10,
        inputUnit: "Heads",
        outputDescription: "Pork sides",
        outputQuantity: 600,
        outputUnit: "kg",
      });
      expect(invalid.success).toBe(false);
    });

    it("rejects pork terms in B2B Demand schemas", () => {
      const invalid = b2bDemandSchema.safeParse({
        title: "Weekly Restaurant Bacon Supply",
        commodityOrProduct: "Smoked Bacon",
        quantity: 100,
        unit: "kg",
        state: "Lagos",
        lga: "Ikeja",
        desiredDeliveryDate: "2026-10-25",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("2. Core Domain 1: Reusable Ecosystem Actors", () => {
    it("defines all canonical actor types without requiring separate auth roles", () => {
      expect(ECOSYSTEM_ACTOR_TYPES).toContain("FARMER");
      expect(ECOSYSTEM_ACTOR_TYPES).toContain("AGGREGATOR");
      expect(ECOSYSTEM_ACTOR_TYPES).toContain("PROCESSOR");
      expect(ECOSYSTEM_ACTOR_TYPES).toContain("PACKAGING_PROVIDER");
      expect(ECOSYSTEM_ACTOR_TYPES).toContain("LOGISTICS_PROVIDER");
      expect(ECOSYSTEM_ACTOR_TYPES).toContain("COLD_CHAIN_PROVIDER");
      expect(ECOSYSTEM_ACTOR_TYPES).toContain("VETERINARY_PROVIDER");
      expect(ECOSYSTEM_ACTOR_TYPES).toContain("INPUT_SUPPLIER");
      expect(ECOSYSTEM_ACTOR_TYPES).toContain("RESTAURANT");
      expect(ECOSYSTEM_ACTOR_TYPES).toContain("INSTITUTIONAL_BUYER");
    });

    it("successfully validates an actor with multiple capabilities", () => {
      const validActor = ecosystemActorSchema.safeParse({
        actorType: "PROCESSOR",
        displayName: "Abeokuta Cold Blasting & Meat Dressing Co.",
        description: "Specialized cold blast freezing and poultry abattoir services.",
        capabilities: ["ABATTOIR", "COLD_CHAIN_STORAGE", "BLAST_FREEZING"],
        state: "Ogun",
        lga: "Abeokuta South",
      });

      expect(validActor.success).toBe(true);
      if (validActor.success) {
        expect(validActor.data.capabilities).toHaveLength(3);
        expect(validActor.data.capabilities).toContain("COLD_CHAIN_STORAGE");
      }
    });
  });

  describe("3. Core Domain 2 & 3: Production Units & Production Outputs", () => {
    it("validates production unit types", () => {
      expect(PRODUCTION_UNIT_TYPES).toContain("FARM");
      expect(PRODUCTION_UNIT_TYPES).toContain("POULTRY_FARM");
      expect(PRODUCTION_UNIT_TYPES).toContain("FISH_FARM");
      expect(PRODUCTION_UNIT_TYPES).toContain("DAIRY_OPERATION");
      expect(PRODUCTION_UNIT_TYPES).toContain("RANCH");
    });

    it("validates a livestock production unit without exposing sensitive private address", () => {
      const unit = productionUnitSchema.safeParse({
        name: "Shika Livestock & Dairy Research Farm",
        unitType: "DAIRY_OPERATION",
        state: "Kaduna",
        lga: "Giwa",
        generalArea: "Shika Agricultural Corridor",
        commodities: ["Cow Milk", "White Fulani Cattle"],
        capacityValue: 500,
        capacityUnit: "LITRES_PER_DAY",
      });

      expect(unit.success).toBe(true);
    });

    it("verifies production output is separable from final marketplace products", () => {
      expect(PRODUCTION_OUTPUT_TYPES).toContain("RAW_HARVEST");
      expect(PRODUCTION_OUTPUT_TYPES).toContain("LIVE_ANIMALS");
      expect(PRODUCTION_OUTPUT_TYPES).toContain("CARCASS");
      expect(PRODUCTION_OUTPUT_TYPES).toContain("RAW_MILK");
      expect(PRODUCTION_OUTPUT_TYPES).toContain("RAW_TUBERS");

      const broilerOutput = productionOutputSchema.safeParse({
        commodityName: "Broiler Chickens (Live)",
        outputType: "LIVE_ANIMALS",
        quantity: 1200,
        unit: "Birds",
        qualityGrade: "PREMIUM",
        state: "Oyo",
        lga: "Akinyele",
        batchNumber: "BATCH-BROILER-2026-10",
      });

      expect(broilerOutput.success).toBe(true);
    });

    it("enforces positive quantities on production outputs", () => {
      const invalid = productionOutputSchema.safeParse({
        commodityName: "White Maize",
        outputType: "GRAIN",
        quantity: -10, // Invalid
        unit: "Tons",
        state: "Kano",
        lga: "Dambatta",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("4. Core Domain 4: Aggregation Pools & Contributions", () => {
    it("validates aggregation pool creation", () => {
      const pool = aggregationPoolSchema.safeParse({
        title: "Iseyin Maize Smallholder Cluster Aggregation",
        commodity: "White Maize",
        targetQuantity: 50,
        unit: "Metric Tons",
        state: "Oyo",
        lga: "Iseyin",
        collectionCenterName: "Iseyin Farm Settlement Warehouse A",
        expectedAvailabilityDate: "2026-11-15",
      });

      expect(pool.success).toBe(true);
    });

    it("rejects non-positive pool target quantities", () => {
      const invalid = aggregationPoolSchema.safeParse({
        title: "Zero Quantity Pool",
        commodity: "Soybeans",
        targetQuantity: 0,
        unit: "Bags",
        state: "Benue",
        lga: "Makurdi",
        expectedAvailabilityDate: "2026-12-01",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates supplier contribution to pool", () => {
      const contrib = aggregationContributionSchema.safeParse({
        poolId: "a0000000-0000-0000-0000-000000000001",
        quantity: 5,
        unit: "Metric Tons",
        notes: "Moisture content certified below 13%",
      });
      expect(contrib.success).toBe(true);
    });
  });

  describe("5. Core Domain 5 & 6: Processing Facilities & Transformation Events", () => {
    it("validates processing facility types and parameters", () => {
      expect(PROCESSING_FACILITY_TYPES).toContain("POULTRY_PROCESSOR");
      expect(PROCESSING_FACILITY_TYPES).toContain("ABATTOIR");
      expect(PROCESSING_FACILITY_TYPES).toContain("FISH_PROCESSOR");
      expect(PROCESSING_FACILITY_TYPES).toContain("CROP_PROCESSOR");

      const facility = processingFacilitySchema.safeParse({
        name: "Ibadan Automated Poultry Dressing Plant",
        facilityType: "POULTRY_PROCESSOR",
        servicesOffered: ["SLAUGHTERING", "DEFEATHERING", "BLAST_FREEZING", "PORTIONING"],
        processingCapacityValue: 5000,
        processingCapacityUnit: "BIRDS_PER_DAY",
        supportedCommodities: ["Broiler Chicken", "Spent Layers", "Turkeys"],
        state: "Oyo",
        lga: "Egbeda",
      });

      expect(facility.success).toBe(true);
    });

    it("validates processing transformation event (Input -> Process -> Output)", () => {
      expect(PROCESS_TYPES).toContain("SLAUGHTER_AND_DRESS");
      expect(PROCESS_TYPES).toContain("PORTIONING");
      expect(PROCESS_TYPES).toContain("MILLING");
      expect(PROCESS_TYPES).toContain("FERMENTATION");

      const event = processingEventSchema.safeParse({
        processType: "SLAUGHTER_AND_DRESS",
        inputDescription: "1,000 Live Broilers (avg 2.0kg)",
        inputQuantity: 2000,
        inputUnit: "kg",
        outputDescription: "Dressed Whole Chickens & Portions",
        outputQuantity: 1560,
        outputUnit: "kg",
        yieldPercentage: 78.0,
        batchReference: "P-DRESS-BATCH-88",
      });

      expect(event.success).toBe(true);
      if (event.success) {
        expect(event.data.yieldPercentage).toBe(78);
      }
    });
  });

  describe("6. Core Domain 7: Value-Chain Events Ledger", () => {
    it("contains append-only event lifecycle stages", () => {
      expect(VALUE_CHAIN_EVENT_TYPES).toEqual([
        "PRODUCED",
        "HARVESTED",
        "AGGREGATED",
        "TRANSPORTED",
        "RECEIVED",
        "PROCESSED",
        "INSPECTED",
        "PACKAGED",
        "STORED",
        "DISPATCHED",
        "DELIVERED",
      ]);
    });

    it("validates value chain event appending", () => {
      const event = valueChainEventSchema.safeParse({
        eventType: "PROCESSED",
        entityType: "PRODUCTION_OUTPUT",
        entityId: "b0000000-0000-0000-0000-000000000002",
        eventTitle: "Dressed and Blast Frozen at Ibadan Processing Plant",
        state: "Oyo",
        lga: "Egbeda",
        eventDetails: { temperature: "-18C", inspectedBy: "Dr. Alabi (Veterinary Officer)" },
      });

      expect(event.success).toBe(true);
    });
  });

  describe("7. Core Domain 8: B2B Offtake Demand", () => {
    it("validates structured B2B demand parameters", () => {
      const demand = b2bDemandSchema.safeParse({
        title: "Weekly Blast Frozen Broiler Cuts for Victoria Island Hotel",
        commodityOrProduct: "Broiler Chicken",
        quantity: 500,
        unit: "kg",
        targetPricePerUnit: 3500,
        state: "Lagos",
        lga: "Eti-Osa",
        desiredDeliveryDate: "2026-10-30",
        frequency: "WEEKLY",
        specifications: {
          packaging: "10kg cartons",
          cuts: "Mixed breasts and thighs",
          freezing: "Blast frozen",
        },
      });

      expect(demand.success).toBe(true);
      if (demand.success) {
        expect(demand.data.frequency).toBe("WEEKLY");
      }
    });

    it("rejects invalid date format", () => {
      const invalid = b2bDemandSchema.safeParse({
        title: "Cassava Tubers Demand",
        commodityOrProduct: "Cassava Tubers",
        quantity: 10,
        unit: "Tons",
        state: "Ogun",
        lga: "Obafemi Owode",
        desiredDeliveryDate: "30-10-2026", // Wrong format
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("8. Core Domain 9: Deterministic Supply / Demand Matching Foundation", () => {
    it("accurately classifies proximity tiers and geopolitical corridors", () => {
      expect(computeProximityTier("Lagos", "Lagos")).toBe("SAME_STATE");
      expect(computeProximityTier("Lagos", "Ogun")).toBe("REGIONAL_CORRIDOR"); // South-West corridor
      expect(computeProximityTier("Lagos", "Oyo")).toBe("REGIONAL_CORRIDOR");
      expect(computeProximityTier("Lagos", "Kano")).toBe("NATIONAL"); // Interstate trans-regional
      expect(areStatesInSameCorridor("Kaduna", "Kano")).toBe(true); // North-West corridor
    });

    it("evaluates multi-actor alignment score for B2B demand", () => {
      const sampleDemand: B2BDemand = {
        id: "d-1",
        buyerId: "buyer-1",
        title: "500kg Broiler Chicken Lagos",
        commodityOrProduct: "Broiler Chicken",
        quantity: 500,
        unit: "kg",
        specifications: {},
        state: "Lagos",
        lga: "Ikeja",
        desiredDeliveryDate: "2026-11-01",
        frequency: "WEEKLY",
        status: "ACTIVE",
        createdAt: "2026-10-05T00:00:00Z",
        updatedAt: "2026-10-05T00:00:00Z",
      };

      const candidateSupplies: MatchingCandidateSupply[] = [
        {
          id: "sup-1",
          sourceType: "PRODUCTION_OUTPUT",
          commodity: "Broiler Chicken",
          availableQuantity: 600,
          unit: "kg",
          state: "Ogun", // Regional corridor to Lagos
          lga: "Sagamu",
          producerOrAggregatorName: "Remo Poultry Cluster",
          readyDate: "2026-10-28",
        },
      ];

      const candidateFacilities: MatchingCandidateFacility[] = [
        {
          id: "fac-1",
          name: "Ibafo Halal Poultry Dressing Plant",
          facilityType: "POULTRY_PROCESSOR",
          servicesOffered: ["SLAUGHTERING", "DRESSING", "BLAST_FREEZING"],
          capacityValue: 2000,
          capacityUnit: "BIRDS_PER_DAY",
          supportedCommodities: ["Broiler Chicken"],
          state: "Ogun",
          lga: "Obafemi Owode",
        },
      ];

      const candidateLogistics: MatchingCandidateLogistics[] = [
        {
          id: "log-1",
          companyName: "Swift Cold-Chain Freight",
          vehicleTypes: ["Refrigerated Reefer Van"],
          coverageStates: ["Lagos", "Ogun", "Oyo"],
          maxWeightKg: 5000,
          hasRefrigeration: true,
        },
      ];

      const matchResult = matchSupplyDemand(
        sampleDemand,
        candidateSupplies,
        candidateFacilities,
        candidateLogistics
      );

      expect(matchResult.demandId).toBe("d-1");
      expect(matchResult.commodity).toBe("Broiler Chicken");
      expect(matchResult.supplyMatches).toHaveLength(1);
      expect(matchResult.processingFacilityMatches).toHaveLength(1);
      expect(matchResult.logisticsMatches).toHaveLength(1);

      // Score should be high (> 70) due to corridor match + cold-chain reefer + processing support
      expect(matchResult.totalMatchScore).toBeGreaterThanOrEqual(70);
      expect(matchResult.supplyMatches[0].corridorProximity).toBe("REGIONAL_CORRIDOR");
      expect(matchResult.logisticsMatches[0].logistics.hasRefrigeration).toBe(true);
      expect(matchResult.logisticsMatches[0].logistics.companyName).toBe("Swift Cold-Chain Freight");
      expect(matchResult.matchSummary).toContain("certified third-party logistics carrier(s)");
    });
  });

  describe("9. Core Domain 10: Value-Chain Templates & Product Transformations", () => {
    it("provides canonical value-chain templates for multiple commodities", () => {
      const templates = getCanonicalValueChainTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(5);

      const commodities = templates.map((t) => t.commodity);
      expect(commodities).toContain("Broiler Chicken");
      expect(commodities).toContain("Beef Cattle");
      expect(commodities).toContain("African Catfish (Clarias)");
      expect(commodities).toContain("Cassava Tubers");
      expect(commodities).toContain("Cow Milk");

      // Verify no prohibited commodities in templates
      templates.forEach((t) => {
        expect(containsProhibitedProduce(t.name)).toBe(false);
        expect(containsProhibitedProduce(t.summary)).toBe(false);
        t.stages.forEach((st) => {
          expect(containsProhibitedProduce(st.label)).toBe(false);
          expect(containsProhibitedProduce(st.description)).toBe(false);
        });
      });
    });

    it("verifies stages include primary production, aggregation, processing, logistics, and market", () => {
      const poultryTemplate = getCanonicalValueChainTemplates().find(
        (t) => t.id === "vc-poultry"
      );
      expect(poultryTemplate).toBeDefined();

      const stageLabels = poultryTemplate!.stages.map((s) => s.label);
      expect(stageLabels).toContain("Breeding & Brooding");
      expect(stageLabels).toContain("Supply Aggregation");
      expect(stageLabels).toContain("Halal Abattoir Processing");
      expect(stageLabels).toContain("Blast Freezing & Packaging");
      expect(stageLabels).toContain("Refrigerated Logistics");
      expect(stageLabels).toContain("Commercial & Retail Markets");
    });
  });
});
