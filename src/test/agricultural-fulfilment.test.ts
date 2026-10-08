/**
 * AgroMarket Phase 3.11 — Agricultural Commitment Fulfilment, Reconciliation & Reliability Tests
 *
 * Verifies:
 * 1. Fulfilment readiness lifecycle & state transitions
 * 2. Evidence validation, provenance taxonomy, and anti-pork enforcement
 * 3. Quantity reconciliation math (exact, under-fulfilled, over-fulfilled, zero fulfilment)
 * 4. Partial fulfilment and remaining quantity calculation
 * 5. Opportunity shortfall accounting (REQUIRED - FULFILLED = SHORTFALL)
 * 6. Participant reliability metrics (enforcing INSUFFICIENT_DATA when sample < 3)
 * 7. Privacy masking (sanitizeEvidenceForViewer)
 * 8. Concurrency & atomic fulfilment protection
 * 9. Consequential governance evaluation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  canTransitionReadiness,
  validateReadinessTransition,
  isReadinessTerminal,
} from "../features/agricultural-coordination/state-machine";
import {
  reconcileCommitmentQuantity,
  calculateCoordinationShortfall,
  calculateParticipantReliabilityMetrics,
} from "../features/agricultural-coordination/calculations";
import {
  sanitizeEvidenceForViewer,
} from "../features/agricultural-coordination/privacy";
import {
  submitFulfilmentEvidenceInputSchema,
  recordCommitmentFulfilmentInputSchema,
  recordCommitmentFailureInputSchema,
} from "../features/agricultural-coordination/validation";
import {
  saveCoordinationOpportunity,
  saveSupplyCommitment,
  getSupplyCommitmentById,
  atomicRecordCommitmentFulfilment,
} from "../features/agricultural-coordination/data-layer";
import {
  recordCommitmentFulfilmentAction,
} from "../features/agricultural-coordination/actions";
import {
  SupplyCommitment,
  CoordinationOpportunity,
  CommitmentEvidence,
} from "../features/agricultural-coordination/types";
import * as authServer from "@/lib/auth/server";
import * as governancePolicyEngine from "@/features/intelligence-governance/policy-engine";
import { AuthUser } from "@/types/auth";

describe("Phase 3.11 — Agricultural Fulfilment, Reconciliation & Reliability", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. READINESS LIFECYCLE & STATE MACHINE
  // ---------------------------------------------------------------------------
  describe("Readiness State Machine", () => {
    it("allows valid forward readiness transitions", () => {
      expect(canTransitionReadiness("NOT_READY", "READY_FOR_AGGREGATION")).toBe(true);
      expect(canTransitionReadiness("NOT_READY", "READY_FOR_LOGISTICS")).toBe(true);
      expect(canTransitionReadiness("NOT_READY", "READY_FOR_PROCESSING")).toBe(true);
      expect(canTransitionReadiness("READY_FOR_AGGREGATION", "IN_FULFILMENT")).toBe(true);
      expect(canTransitionReadiness("IN_FULFILMENT", "PARTIALLY_FULFILLED")).toBe(true);
      expect(canTransitionReadiness("PARTIALLY_FULFILLED", "IN_FULFILMENT")).toBe(true);
      expect(canTransitionReadiness("IN_FULFILMENT", "FULFILLED")).toBe(true);
    });

    it("allows transitioning to FAILED or CANCELLED from non-terminal states", () => {
      expect(canTransitionReadiness("NOT_READY", "CANCELLED")).toBe(true);
      expect(canTransitionReadiness("READY_FOR_LOGISTICS", "FAILED")).toBe(true);
      expect(canTransitionReadiness("IN_FULFILMENT", "FAILED")).toBe(true);
    });

    it("rejects backwards or illegal transitions from terminal states", () => {
      expect(isReadinessTerminal("FULFILLED")).toBe(true);
      expect(isReadinessTerminal("CANCELLED")).toBe(true);
      expect(isReadinessTerminal("NOT_READY")).toBe(false);

      expect(canTransitionReadiness("FULFILLED", "NOT_READY")).toBe(false);
      expect(canTransitionReadiness("CANCELLED", "IN_FULFILMENT")).toBe(false);
      expect(() => validateReadinessTransition("FULFILLED", "IN_FULFILMENT")).toThrow(
        /Invalid fulfilment readiness state transition/
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 2. EVIDENCE VALIDATION & ANTI-PORK ZERO TOLERANCE
  // ---------------------------------------------------------------------------
  describe("Evidence Validation & Provenance Taxonomy", () => {
    it("validates well-formed evidence submission inputs", () => {
      const validEvidence = {
        commitmentId: "11111111-1111-1111-1111-111111111111",
        evidenceCategory: "DELIVERY_CONFIRMATION",
        provenance: "TRANSACTION_OBSERVED",
        referenceType: "DELIVERY_EVENT",
        referenceId: "22222222-2222-2222-2222-222222222222",
        quantityObserved: 2500,
        unit: "KG",
        notes: "Waybill signed at warehouse depot in Kano.",
      };
      const parsed = submitFulfilmentEvidenceInputSchema.safeParse(validEvidence);
      expect(parsed.success).toBe(true);
    });

    it("strictly rejects porcine references in evidence notes under Anti-Pork policy", () => {
      const porcineEvidence = {
        commitmentId: "11111111-1111-1111-1111-111111111111",
        evidenceCategory: "DELIVERY_CONFIRMATION",
        provenance: "SELF_REPORTED",
        notes: "Truck contained frozen pork carcasses along with cassava bags",
      };
      const result = submitFulfilmentEvidenceInputSchema.safeParse(porcineEvidence);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Anti-Pork Policy Violation");
      }
    });

    it("validates well-formed fulfilment submission inputs", () => {
      const validFulfilment = {
        commitmentId: "11111111-1111-1111-1111-111111111111",
        fulfilledQuantity: 1500,
        unit: "KG",
        evidenceCategory: "DELIVERY_CONFIRMATION",
        provenance: "TRANSACTION_OBSERVED",
        notes: "Driver handed over delivery note.",
      };
      const result = recordCommitmentFulfilmentInputSchema.safeParse(validFulfilment);
      expect(result.success).toBe(true);
    });

    it("rejects porcine descriptions in failure reporting notes", () => {
      const invalidFailure = {
        commitmentId: "11111111-1111-1111-1111-111111111111",
        failureReason: "QUALITY_REQUIREMENT_UNMET",
        notes: "Contaminated by bacon grease",
      };
      const result = recordCommitmentFailureInputSchema.safeParse(invalidFailure);
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. QUANTITY RECONCILIATION MATH
  // ---------------------------------------------------------------------------
  describe("Quantity Reconciliation Mathematics", () => {
    it("correctly identifies EXACT fulfilment when fulfilled matches committed", () => {
      const result = reconcileCommitmentQuantity({
        commitmentId: "test-commit-1",
        committedQuantity: 5000,
        fulfilledQuantity: 5000,
        confirmedQuantity: 5000,
        unit: "KG",
      });

      expect(result.outcome).toBe("EXACT");
      expect(result.varianceQuantity).toBe(0);
      expect(result.variancePercentage).toBe(0);
      expect(result.isPartial).toBe(false);
    });

    it("correctly identifies UNDER_FULFILLED and records negative variance", () => {
      const result = reconcileCommitmentQuantity({
        commitmentId: "test-commit-2",
        committedQuantity: 5000,
        fulfilledQuantity: 4200,
        confirmedQuantity: 4500,
        unit: "KG",
      });

      expect(result.outcome).toBe("UNDER_FULFILLED");
      expect(result.varianceQuantity).toBe(-800);
      expect(result.variancePercentage).toBe(-16);
      expect(result.isPartial).toBe(true);
    });

    it("blocks over-fulfilment variance (OVER_FULFILLED_BLOCKED)", () => {
      const result = reconcileCommitmentQuantity({
        commitmentId: "test-commit-3",
        committedQuantity: 2000,
        fulfilledQuantity: 2500,
        unit: "KG",
      });

      expect(result.outcome).toBe("OVER_FULFILLED_BLOCKED");
      expect(result.varianceQuantity).toBe(500);
      expect(result.variancePercentage).toBe(25);
    });

    it("identifies NO_FULFILMENT when fulfilled is 0", () => {
      const result = reconcileCommitmentQuantity({
        commitmentId: "test-commit-4",
        committedQuantity: 1000,
        fulfilledQuantity: 0,
        unit: "KG",
      });

      expect(result.outcome).toBe("NO_FULFILMENT");
      expect(result.varianceQuantity).toBe(-1000);
      expect(result.variancePercentage).toBe(-100);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. COORDINATION SHORTFALL CALCULATION
  // ---------------------------------------------------------------------------
  describe("Coordination Shortfall Accounting", () => {
    it("calculates exact shortfall for an opportunity", () => {
      const shortfall = calculateCoordinationShortfall({
        opportunityId: "opp-shortfall-1",
        requiredQuantity: 10000,
        fulfilledQuantity: 6500,
        unit: "KG",
      });

      expect(shortfall.requiredQuantity).toBe(10000);
      expect(shortfall.fulfilledQuantity).toBe(6500);
      // Shortfall = 10000 - 6500 = 3500
      expect(shortfall.shortfallQuantity).toBe(3500);
      expect(shortfall.hasShortfall).toBe(true);
    });

    it("reports zero shortfall when fulfilled quantity meets or exceeds required", () => {
      const shortfall = calculateCoordinationShortfall({
        opportunityId: "opp-full",
        requiredQuantity: 5000,
        fulfilledQuantity: 5000,
        unit: "KG",
      });

      expect(shortfall.shortfallQuantity).toBe(0);
      expect(shortfall.hasShortfall).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. PARTICIPANT RELIABILITY METRICS & INSUFFICIENT DATA RULE
  // ---------------------------------------------------------------------------
  describe("Participant Reliability Metrics Engine", () => {
    it("returns INSUFFICIENT_DATA and null rates when participant has fewer than 3 commitments", () => {
      const sparseCommitments = [
        {
          status: "FULFILLED" as const,
          committedQuantity: 1000,
          fulfilledQuantity: 1000,
          availabilityDate: "2026-10-10",
          updatedAt: "2026-10-10T12:00:00Z",
        },
      ];

      const metrics = calculateParticipantReliabilityMetrics({
        participantId: "farmer-sparse",
        commitments: sparseCommitments,
      });

      expect(metrics.status).toBe("INSUFFICIENT_DATA");
      expect(metrics.totalCommitments).toBe(1);
      expect(metrics.fulfilmentRate).toBeNull();
      expect(metrics.onTimeRate).toBeNull();
      expect(metrics.averageVariancePercentage).toBeNull();
    });

    it("calculates accurate deterministic reliability rates when sample size >= 3", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const futureDate = new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0];

      const ampleCommitments = [
        // 1. Fulfilled on time, exact
        {
          status: "FULFILLED" as const,
          committedQuantity: 1000,
          fulfilledQuantity: 1000,
          availabilityDate: futureDate,
          updatedAt: new Date().toISOString(),
        },
        // 2. Fulfilled under
        {
          status: "FULFILLED" as const,
          committedQuantity: 2000,
          fulfilledQuantity: 1600,
          availabilityDate: futureDate,
          updatedAt: new Date().toISOString(),
        },
        // 3. Failed commitment
        {
          status: "FAILED" as const,
          committedQuantity: 1000,
          fulfilledQuantity: 0,
          availabilityDate: pastDate,
          updatedAt: new Date().toISOString(),
        },
      ];

      const metrics = calculateParticipantReliabilityMetrics({
        participantId: "farmer-proven",
        commitments: ampleCommitments,
      });

      expect(metrics.status).toBe("ADEQUATE_HISTORY");
      expect(metrics.totalCommitments).toBe(3);
      expect(metrics.fulfilledCommitments).toBe(2);
      expect(metrics.failedCommitments).toBe(1);
      // Fulfilment rate: 2 fulfilled / 3 closed = 66.7%
      expect(metrics.fulfilmentRate).toBe(66.7);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. PRIVACY & EVIDENCE SANITIZATION
  // ---------------------------------------------------------------------------
  describe("Evidence Privacy & Information Masking", () => {
    const rawEvidence: CommitmentEvidence = {
      id: "ev-secret-123",
      commitmentId: "commit-secret-123",
      opportunityId: "opp-123",
      submittedBy: "farmer-secret-owner",
      evidenceCategory: "DELIVERY_CONFIRMATION",
      provenance: "TRANSACTION_OBSERVED",
      referenceType: "DELIVERY_EVENT",
      referenceId: "dev-999",
      quantityObserved: 1200,
      unit: "KG",
      notes: "Private truck driver phone: 08031234567, private warehouse entry code 8821.",
      metadata: {},
      createdAt: new Date().toISOString(),
    };

    it("masks private notes and identifiers for peer participants", () => {
      const sanitized = sanitizeEvidenceForViewer(
        rawEvidence,
        "peer-viewer-random",
        false
      );

      expect(sanitized.notes).toBeNull();
      expect(sanitized.submittedBy).toContain("masked-");
      expect(sanitized.referenceId).toBeNull();
      // Physical measurements remain visible for transparency
      expect(sanitized.quantityObserved).toBe(1200);
      expect(sanitized.evidenceCategory).toBe("DELIVERY_CONFIRMATION");
    });

    it("preserves full details for commitment owner or coordinator", () => {
      const ownerView = sanitizeEvidenceForViewer(
        rawEvidence,
        "farmer-secret-owner",
        false
      );
      expect(ownerView.notes).toContain("Private truck driver phone");
      expect(ownerView.referenceId).toBe("dev-999");

      const coordinatorView = sanitizeEvidenceForViewer(
        rawEvidence,
        "coord-admin-user",
        true
      );
      expect(coordinatorView.notes).toContain("private warehouse entry code");
    });
  });

  // ---------------------------------------------------------------------------
  // 7. CONCURRENCY & ATOMIC FULFILMENT EXECUTION
  // ---------------------------------------------------------------------------
  describe("Concurrency & Atomic Fulfilment Logic", () => {
    it("atomically records partial and subsequent fulfilment, preventing over-fulfilment", async () => {
      const oppId = "opp-atomic-1";
      const opp: CoordinationOpportunity = {
        id: oppId,
        creatorId: "coord-user",
        title: "Test Coordination",
        commodity: "Millet",
        requiredQuantity: 3000,
        unit: "KG",
        canonicalQuantityKg: 3000,
        acceptedQuantity: 2000,
        fulfilledQuantity: 0,
        targetState: "Kano",
        targetLga: "Dala",
        deliveryWindowStart: "2026-10-25",
        deliveryWindowEnd: "2026-11-05",
        qualityGrade: "STANDARD",
        processingRequired: false,
        logisticsRequired: false,
        status: "IN_FULFILMENT",
        coverageStatus: "PARTIALLY_COVERED",
        governanceDecision: "ALLOW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveCoordinationOpportunity(opp);

      const commit: SupplyCommitment = {
        id: "commit-atomic-1",
        opportunityId: oppId,
        participantId: "farmer-atomic",
        commodity: "Millet",
        committedQuantity: 2000,
        unit: "KG",
        canonicalQuantityKg: 2000,
        qualityGrade: "STANDARD",
        availabilityDate: "2026-10-30",
        locationState: "Kano",
        locationLga: "Dala",
        status: "CONFIRMED",
        readinessStatus: "READY_FOR_LOGISTICS",
        confirmedQuantity: 2000,
        fulfilledQuantity: 0,
        remainingQuantity: 2000,
        reconciliationStatus: "PENDING",
        governanceDecision: "ALLOW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveSupplyCommitment(commit);

      // 1. First fulfilment increment: 1,200 kg of 2,000 kg -> Partial
      const res1 = await atomicRecordCommitmentFulfilment({
        commitmentId: commit.id,
        actorId: "farmer-atomic",
        fulfilledQuantity: 1200,
        evidenceCategory: "LOGISTICS_HANDOFF",
        provenance: "TRANSACTION_OBSERVED",
        notes: "First batch picked up by carrier.",
      });

      expect(res1.success).toBe(true);
      expect(res1.fulfilledQuantity).toBe(1200);
      expect(res1.remainingQuantity).toBe(800);
      expect(res1.reconciliationStatus).toBe("UNDER_FULFILLED");
      expect(res1.readinessStatus).toBe("PARTIALLY_FULFILLED");

      // Verify in-store update
      const updated = await getSupplyCommitmentById(commit.id);
      expect(updated?.fulfilledQuantity).toBe(1200);
      expect(updated?.remainingQuantity).toBe(800);

      // 2. Second fulfilment increment that would exceed commitment: 900 kg (1200 + 900 = 2100 > 2000)
      const resExceed = await atomicRecordCommitmentFulfilment({
        commitmentId: commit.id,
        actorId: "farmer-atomic",
        fulfilledQuantity: 900,
        evidenceCategory: "DELIVERY_CONFIRMATION",
        provenance: "TRANSACTION_OBSERVED",
      });

      expect(resExceed.success).toBe(false);
      expect(resExceed.code).toBe("OVER_FULFILLED_BLOCKED");
      expect(resExceed.error).toContain("Fulfilment would exceed committed quantity");

      // Verify committed quantity remained unmutated
      const afterFailed = await getSupplyCommitmentById(commit.id);
      expect(afterFailed?.fulfilledQuantity).toBe(1200);
      expect(afterFailed?.remainingQuantity).toBe(800);

      // 3. Final fulfilment increment: exactly 800 kg remaining -> Complete FULFILLED
      const resFinal = await atomicRecordCommitmentFulfilment({
        commitmentId: commit.id,
        actorId: "farmer-atomic",
        fulfilledQuantity: 800,
        evidenceCategory: "DELIVERY_CONFIRMATION",
        provenance: "AUTHORIZED_REVIEW",
      });

      expect(resFinal.success).toBe(true);
      expect(resFinal.fulfilledQuantity).toBe(2000);
      expect(resFinal.remainingQuantity).toBe(0);
      expect(resFinal.reconciliationStatus).toBe("EXACT");
      expect(resFinal.readinessStatus).toBe("FULFILLED");
    });
  });

  // ---------------------------------------------------------------------------
  // 8. GOVERNANCE EVALUATION INTEGRATION
  // ---------------------------------------------------------------------------
  describe("Consequential Action Governance Evaluation", () => {
    it("blocks recordCommitmentFulfilmentAction when governance evaluates to DENY", async () => {
      // Mock authenticated farmer session
      const mockUser: AuthUser = {
        id: "farmer-user-gov",
        email: "farmer@agromarket.test",
        phone: null,
        fullName: "Test Farmer",
        state: "Kano",
        lga: "Dala",
        roles: ["FARMER"],
        isEmailVerified: true,
        isPhoneVerified: false,
        isVerified: true,
        isOnboarded: true,
        createdAt: new Date().toISOString(),
      };
      vi.spyOn(authServer, "getCurrentUser").mockResolvedValue(mockUser);

      // Mock governance engine returning DENY
      vi.spyOn(governancePolicyEngine, "evaluateGovernancePolicy").mockReturnValue({
        id: "eval-deny-1",
        recommendationId: null,
        scenarioId: null,
        agentId: "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
        domain: "AGRICULTURAL_COORDINATION",
        actionIntent: "EXECUTE_COORDINATED_FULFILMENT",
        actorRole: "FARMER",
        riskLevel: "HIGH",
        autonomyLevel: "PROHIBITED",
        decision: "DENY",
        requiredReviewLevel: "PLATFORM_REVIEW",
        reasons: ["Biosecurity red-line active in transit LGA."],
        policyVersion: "1.0.0",
        isProhibitedAction: false,
        evidenceCount: 1,
        confidenceScore: 0.95,
        contextMetadata: {},
        evaluatedAt: new Date().toISOString(),
      });

      const govOppId = "11111111-1111-1111-1111-111111111111";
      await saveCoordinationOpportunity({
        id: govOppId,
        creatorId: "coord-user",
        title: "Gov Test Opportunity",
        commodity: "Soybeans",
        requiredQuantity: 2000,
        unit: "KG",
        canonicalQuantityKg: 2000,
        acceptedQuantity: 2000,
        fulfilledQuantity: 0,
        targetState: "Kano",
        targetLga: "Dala",
        deliveryWindowStart: "2026-10-25",
        deliveryWindowEnd: "2026-11-05",
        qualityGrade: "STANDARD",
        processingRequired: false,
        logisticsRequired: false,
        status: "IN_FULFILMENT",
        coverageStatus: "FULLY_COVERED",
        governanceDecision: "ALLOW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const govCommitId = "33333333-3333-3333-3333-333333333333";
      await saveSupplyCommitment({
        id: govCommitId,
        opportunityId: govOppId,
        participantId: "farmer-user-gov",
        commodity: "Soybeans",
        committedQuantity: 2000,
        unit: "KG",
        canonicalQuantityKg: 2000,
        qualityGrade: "STANDARD",
        availabilityDate: "2026-10-30",
        locationState: "Kano",
        locationLga: "Dala",
        status: "CONFIRMED",
        readinessStatus: "READY_FOR_LOGISTICS",
        confirmedQuantity: 2000,
        fulfilledQuantity: 0,
        remainingQuantity: 2000,
        reconciliationStatus: "PENDING",
        governanceDecision: "ALLOW",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await recordCommitmentFulfilmentAction({
        commitmentId: govCommitId,
        fulfilledQuantity: 500,
        unit: "KG",
        evidenceCategory: "DELIVERY_CONFIRMATION",
        provenance: "AUTHORIZED_REVIEW",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Governance Denied:");
      expect(result.error).toContain("Biosecurity red-line active in transit LGA.");
    });
  });
});
