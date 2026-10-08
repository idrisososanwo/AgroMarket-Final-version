// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateCoordinationCoverage,
  validateCommitmentCapacity,
} from "@/features/agricultural-coordination/calculations";
import {
  canTransitionOpportunity,
  validateOpportunityTransition,
  canTransitionCommitment,
  validateCommitmentTransition,
} from "@/features/agricultural-coordination/state-machine";
import {
  assertNoProhibitedProduceCoordination,
  resolveCanonicalQuantityKg,
} from "@/features/agricultural-coordination/validation";
import {
  sanitizeSupplyCommitmentForViewer,
  sanitizeParticipantForViewer,
} from "@/features/agricultural-coordination/privacy";
import {
  clearInMemoryCoordinationStore,
  saveCoordinationOpportunity,
  saveSupplyCommitment,
  getCoordinationOpportunityById,
  atomicAcceptSupplyCommitment,
} from "@/features/agricultural-coordination/data-layer";
import {
  CoordinationOpportunity,
  SupplyCommitment,
  CoordinationParticipant,
} from "@/features/agricultural-coordination/types";
import { resolveRecommendationAction } from "@/features/action-integration/intent-mapper";

describe("Phase 3.10: Multi-Party Agricultural Coordination Foundation", () => {
  beforeEach(() => {
    clearInMemoryCoordinationStore();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. QUANTITY ACCOUNTING & CANONICAL NORMALIZATION
  // ---------------------------------------------------------------------------
  describe("Quantity Accounting & Unit Normalization", () => {
    it("normalizes standard mass units safely to canonical KG", () => {
      const tonRes = resolveCanonicalQuantityKg(5, "TONNES");
      expect(tonRes.canonicalKg).toBe(5000);

      const bagRes = resolveCanonicalQuantityKg(20, "50KG BAG");
      expect(bagRes.canonicalKg).toBe(1000);

      const kgRes = resolveCanonicalQuantityKg(750, "KG");
      expect(kgRes.canonicalKg).toBe(750);
      expect(kgRes.isExact).toBe(true);
    });

    it("rejects incompatible or nonsensical units fail-closed", () => {
      expect(() => resolveCanonicalQuantityKg(100, "CRATE")).toThrow(
        /Incompatible or unsupported unit/
      );
      expect(() => resolveCanonicalQuantityKg(50, "PIECE")).toThrow(
        /Incompatible or unsupported unit/
      );
    });

    it("calculates multi-producer coverage percentage and status accurately", () => {
      const opportunityId = "opp-cassava-5000";
      const requiredKg = 5000;

      // 0 kg committed
      const cov0 = calculateCoordinationCoverage({
        opportunityId,
        requiredQuantityKg: requiredKg,
        acceptedCommitments: [],
      });
      expect(cov0.coveragePercentage).toBe(0);
      expect(cov0.coverageStatus).toBe("NO_COVERAGE");
      expect(cov0.remainingCapacityKg).toBe(5000);

      // Partial commitment (Farmer A: 1,500 kg, Farmer B: 1,000 kg -> 2,500 kg = 50%)
      const covPartial = calculateCoordinationCoverage({
        opportunityId,
        requiredQuantityKg: requiredKg,
        acceptedCommitments: [
          { canonicalQuantityKg: 1500, status: "ACCEPTED" },
          { canonicalQuantityKg: 1000, status: "ACCEPTED" },
        ],
      });
      expect(covPartial.coveragePercentage).toBe(50);
      expect(covPartial.coverageStatus).toBe("PARTIALLY_COVERED");
      expect(covPartial.remainingCapacityKg).toBe(2500);

      // Full commitment (Farmer C adds 2,500 kg -> 5,000 kg = 100%)
      const covFull = calculateCoordinationCoverage({
        opportunityId,
        requiredQuantityKg: requiredKg,
        acceptedCommitments: [
          { canonicalQuantityKg: 1500, status: "ACCEPTED" },
          { canonicalQuantityKg: 1000, status: "ACCEPTED" },
          { canonicalQuantityKg: 2500, status: "ACCEPTED" },
        ],
      });
      expect(covFull.coveragePercentage).toBe(100);
      expect(covFull.coverageStatus).toBe("FULLY_COVERED");
      expect(covFull.remainingCapacityKg).toBe(0);
    });

    it("detects over-commitment when accepted quantity exceeds required", () => {
      const covOver = calculateCoordinationCoverage({
        opportunityId: "opp-over",
        requiredQuantityKg: 1000,
        acceptedCommitments: [
          { canonicalQuantityKg: 1200, status: "ACCEPTED" },
        ],
      });
      expect(covOver.coverageStatus).toBe("OVER_COMMITTED_BLOCKED");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CONCURRENCY SAFEGUARDS & OVERCOMMITMENT PREVENTION
  // ---------------------------------------------------------------------------
  describe("Concurrency Safeguards & Atomic Acceptance", () => {
    it("prevents committing beyond remaining opportunity capacity", () => {
      const check1 = validateCommitmentCapacity({
        requiredQuantityKg: 5000,
        currentAcceptedQuantityKg: 3500,
        newCommitmentQuantityKg: 1000,
      });
      expect(check1.canAccept).toBe(true);
      expect(check1.remainingCapacityKg).toBe(500);

      const check2 = validateCommitmentCapacity({
        requiredQuantityKg: 5000,
        currentAcceptedQuantityKg: 3500,
        newCommitmentQuantityKg: 2000,
      });
      expect(check2.canAccept).toBe(false);
      expect(check2.reason).toContain("Overcommitment prevented");
    });

    it("atomically accepts first valid commitment and rejects simultaneous over-capacity commitment", async () => {
      const oppId = "opp-atomic-test";
      const opp: CoordinationOpportunity = {
        id: oppId,
        creatorId: "coord-user",
        title: "5,000 kg Cassava Aggregation",
        commodity: "Cassava",
        requiredQuantity: 5000,
        unit: "KG",
        canonicalQuantityKg: 5000,
        acceptedQuantity: 0,
        fulfilledQuantity: 0,
        targetState: "Oyo",
        targetLga: "Iseyin",
        deliveryWindowStart: "2026-10-15",
        deliveryWindowEnd: "2026-10-25",
        qualityGrade: "STANDARD",
        processingRequired: false,
        logisticsRequired: false,
        status: "OPEN",
        coverageStatus: "NO_COVERAGE",
        governanceDecision: "ALLOW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveCoordinationOpportunity(opp);

      // Farmer A offers 3,000 kg
      const commitA: SupplyCommitment = {
        id: "commit-farmer-a",
        opportunityId: oppId,
        participantId: "farmer-a",
        commodity: "Cassava",
        committedQuantity: 3000,
        unit: "KG",
        canonicalQuantityKg: 3000,
        qualityGrade: "STANDARD",
        availabilityDate: "2026-10-18",
        locationState: "Oyo",
        locationLga: "Iseyin",
        status: "OFFERED",
        readinessStatus: "NOT_READY",
        confirmedQuantity: null,
        fulfilledQuantity: 0,
        remainingQuantity: 3000,
        reconciliationStatus: "PENDING",
        governanceDecision: "ALLOW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveSupplyCommitment(commitA);

      // Farmer B offers 3,000 kg
      const commitB: SupplyCommitment = {
        id: "commit-farmer-b",
        opportunityId: oppId,
        participantId: "farmer-b",
        commodity: "Cassava",
        committedQuantity: 3000,
        unit: "KG",
        canonicalQuantityKg: 3000,
        qualityGrade: "STANDARD",
        availabilityDate: "2026-10-19",
        locationState: "Oyo",
        locationLga: "Ogbomoso",
        status: "OFFERED",
        readinessStatus: "NOT_READY",
        confirmedQuantity: null,
        fulfilledQuantity: 0,
        remainingQuantity: 3000,
        reconciliationStatus: "PENDING",
        governanceDecision: "ALLOW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveSupplyCommitment(commitB);

      // 1. Accept Farmer A (3,000 kg of 5,000 kg -> accepted)
      const resA = await atomicAcceptSupplyCommitment({
        commitmentId: commitA.id,
        coordinatorId: "coord-user",
      });
      expect(resA.success).toBe(true);
      expect(resA.acceptedQuantityKg).toBe(3000);
      expect(resA.opportunityStatus).toBe("PARTIALLY_COMMITTED");

      // Verify updated opportunity state in store
      const updatedOpp = await getCoordinationOpportunityById(oppId);
      expect(updatedOpp?.acceptedQuantity).toBe(3000);

      // 2. Attempt to accept Farmer B (3,000 kg + 3,000 kg = 6,000 kg > 5,000 kg -> blocked)
      const resB = await atomicAcceptSupplyCommitment({
        commitmentId: commitB.id,
        coordinatorId: "coord-user",
      });
      expect(resB.success).toBe(false);
      expect(resB.code).toBe("OVERCOMMITMENT_BLOCKED");
      expect(resB.error).toContain("Overcommitment prevented");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. STATE MACHINES & LIFECYCLE CONTROLS
  // ---------------------------------------------------------------------------
  describe("State Machines & Lifecycle Transitions", () => {
    it("allows valid opportunity lifecycle progressions", () => {
      expect(canTransitionOpportunity("OPEN", "COORDINATING")).toBe(true);
      expect(canTransitionOpportunity("OPEN", "PARTIALLY_COMMITTED")).toBe(true);
      expect(canTransitionOpportunity("PARTIALLY_COMMITTED", "FULLY_COMMITTED")).toBe(true);
      expect(canTransitionOpportunity("FULLY_COMMITTED", "IN_FULFILMENT")).toBe(true);
      expect(canTransitionOpportunity("IN_FULFILMENT", "COMPLETED")).toBe(true);
    });

    it("rejects invalid or backwards opportunity transitions", () => {
      expect(canTransitionOpportunity("COMPLETED", "OPEN")).toBe(false);
      expect(() => validateOpportunityTransition("COMPLETED", "OPEN")).toThrow(
        /Invalid coordination opportunity state transition/
      );
      expect(canTransitionOpportunity("CANCELLED", "IN_FULFILMENT")).toBe(false);
    });

    it("allows valid commitment transitions and rejects illegal mutations", () => {
      expect(canTransitionCommitment("OFFERED", "ACCEPTED")).toBe(true);
      expect(canTransitionCommitment("ACCEPTED", "CONFIRMED")).toBe(true);
      expect(canTransitionCommitment("CONFIRMED", "FULFILMENT_PENDING")).toBe(true);
      expect(canTransitionCommitment("FULFILMENT_PENDING", "FULFILLED")).toBe(true);

      // Cannot unfulfill or accept directly from cancelled
      expect(canTransitionCommitment("FULFILLED", "OFFERED")).toBe(false);
      expect(canTransitionCommitment("CANCELLED", "ACCEPTED")).toBe(false);
      expect(() => validateCommitmentTransition("CANCELLED", "ACCEPTED")).toThrow(
        /Invalid supply commitment state transition/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. ANTI-PORK ZERO TOLERANCE INVARIANT
  // ---------------------------------------------------------------------------
  describe("Anti-Pork Invariant Enforcement", () => {
    it("rejects prohibited porcine produce across all inputs", () => {
      expect(() =>
        assertNoProhibitedProduceCoordination("pork belly", "Test")
      ).toThrow(/Anti-Pork/i);

      expect(() =>
        assertNoProhibitedProduceCoordination("swine livestock", "Test")
      ).toThrow(/Anti-Pork/i);

      expect(() =>
        assertNoProhibitedProduceCoordination("smoked bacon strips", "Test")
      ).toThrow(/Anti-Pork/i);
    });

    it("allows halal and approved agricultural commodities", () => {
      expect(() => assertNoProhibitedProduceCoordination("Cassava", "Test")).not.toThrow();
      expect(() => assertNoProhibitedProduceCoordination("Broiler Chicken", "Test")).not.toThrow();
      expect(() => assertNoProhibitedProduceCoordination("Sorghum", "Test")).not.toThrow();
      expect(() => assertNoProhibitedProduceCoordination("Goat Meat", "Test")).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. PRIVACY & INFORMATION ISOLATION
  // ---------------------------------------------------------------------------
  describe("Privacy & Information Isolation", () => {
    const rawCommitment: SupplyCommitment = {
      id: "commit-123",
      opportunityId: "opp-123",
      participantId: "producer-user-456",
      commodity: "Yam",
      committedQuantity: 500,
      unit: "KG",
      canonicalQuantityKg: 500,
      qualityGrade: "GRADE_A",
      availabilityDate: "2026-10-20",
      locationState: "Benue",
      locationLga: "Gboko",
      status: "ACCEPTED",
      readinessStatus: "NOT_READY",
      confirmedQuantity: null,
      fulfilledQuantity: 0,
      remainingQuantity: 500,
      reconciliationStatus: "PENDING",
      notes: "Private warehouse storage key: #4092, negotiable price N850/kg",
      governanceDecision: "ALLOW",
      participantDisplayName: "Ibrahim Farms Ltd",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("sanitizes peer producer commitments to preserve commercial privacy", () => {
      const sanitized = sanitizeSupplyCommitmentForViewer(
        rawCommitment,
        "peer-farmer-789", // Viewer is not owner or coordinator
        false
      );

      // Strips private notes
      expect(sanitized.notes).toBeNull();
      // Masks participant ID
      expect(sanitized.participantId).toContain("masked-");
      // Anonymizes display name
      expect(sanitized.participantDisplayName).toContain("Producer (Benue)");
    });

    it("preserves full details for commitment owner or opportunity coordinator", () => {
      const ownerView = sanitizeSupplyCommitmentForViewer(
        rawCommitment,
        "producer-user-456", // Viewer is owner
        false
      );
      expect(ownerView.notes).toContain("Private warehouse storage key");
      expect(ownerView.participantDisplayName).toBe("Ibrahim Farms Ltd");

      const coordinatorView = sanitizeSupplyCommitmentForViewer(
        rawCommitment,
        "coordinator-999",
        true // Is coordinator
      );
      expect(coordinatorView.notes).toContain("negotiable price");
    });

    it("sanitizes participant records for peer viewing", () => {
      const participant: CoordinationParticipant = {
        id: "part-1",
        opportunityId: "opp-1",
        userId: "user-private-id-99",
        actorRole: "FARMER",
        status: "ACTIVE",
        joinedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        displayName: "Private Farmer Contact",
      };

      const peerView = sanitizeParticipantForViewer(
        participant,
        "other-user",
        false
      );
      expect(peerView.userId).toContain("masked-");
      expect(peerView.displayName).toBe("Participant (FARMER)");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. ACTION INTEGRATION RESOLUTION
  // ---------------------------------------------------------------------------
  describe("Action Integration Resolution", () => {
    it("routes aggregation recommendations for farmers/businesses to /coordination", () => {
      const route = resolveRecommendationAction({
        recommendationType: "REVIEW_AGGREGATION_OPPORTUNITY",
        actorRole: "FARMER",
        context: {
          recommendationId: "rec-test-123",
          commodity: "Cassava",
          state: "Oyo",
        },
      });

      expect(route.intent).toBe("VIEW_COORDINATION_OPPORTUNITY");
      expect(route.destinationType).toBe("COORDINATION");
      expect(route.url).toContain("/coordination");
      expect(route.buttonLabel).toBe("View Coordination Hub");
      expect(route.requiresRevalidation).toBe(true);
    });
  });
});
