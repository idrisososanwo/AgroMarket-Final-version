/**
 * AgroMarket Phase 3.12: Agricultural Dependency Graph & Network Intelligence Tests
 *
 * Verifies:
 * 1. Domain relationship validation, typing, and temporal validity
 * 2. Dependency vs Association distinction
 * 3. Anti-Pork zero-tolerance invariant across relationships, filters, and assessments
 * 4. Deterministic concentration analysis (supplier, processor, corridor, region)
 * 5. Minimum sample size rule (enforcing INSUFFICIENT_DATA when sample < 3)
 * 6. Single point of failure (SPOF) identification (>= 75% threshold)
 * 7. Bounded cascade traversal, max depth clamping, and circular dependency cycle mitigation
 * 8. Downstream exposure aggregation and risk ranking
 * 9. Structural alternative paths with unverified capacity warnings
 * 10. Privacy sanitization for non-admin viewers
 * 11. Consequential governance evaluation blocking on DENY
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createDependencyRelationshipInputSchema,
  traverseDependencyCascadeInputSchema,
  assertNoProhibitedProduceDependency,
} from "../features/dependency-graph/validation";
import {
  calculateConcentrationRisk,
  classifyConcentrationRatio,
} from "../features/dependency-graph/concentration-engine";
import {
  traverseDependencyCascade,
} from "../features/dependency-graph/graph-traversal";
import {
  identifyPotentialAlternatives,
} from "../features/dependency-graph/alternative-paths";
import {
  sanitizeDependencyRelationshipForViewer,
} from "../features/dependency-graph/privacy";
import {
  saveDependencyAssessment,
  resetInMemoryDependencyGraph,
} from "../features/dependency-graph/data-layer";
import {
  getCriticalDependencies,
} from "../features/dependency-graph/queries";
import {
  createDependencyRelationshipAction,
} from "../features/dependency-graph/actions";
import {
  DependencyRelationship,
  DependencyNode,
} from "../features/dependency-graph/types";
import {
  ALTERNATIVE_PATH_CAVEAT,
  DEPENDENCY_ADVISORY_DISCLAIMER,
} from "../features/dependency-graph/constants";
import * as authServer from "@/lib/auth/server";
import * as governancePolicyEngine from "@/features/intelligence-governance/policy-engine";
import { AuthUser } from "@/types/auth";

describe("Phase 3.12 — Agricultural Dependency Graph & Network Intelligence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetInMemoryDependencyGraph();
  });

  // ---------------------------------------------------------------------------
  // 1. DOMAIN VALIDATION & ANTI-PORK ZERO TOLERANCE
  // ---------------------------------------------------------------------------
  describe("Domain Validation & Anti-Pork Invariant", () => {
    it("validates well-formed dependency relationships", () => {
      const validRel = {
        sourceNodeType: "PRODUCER" as const,
        sourceNodeId: "farmer-101",
        relationshipType: "PRODUCES" as const,
        targetNodeType: "COMMODITY" as const,
        targetNodeId: "commodity-cassava",
        relationshipNature: "DEPENDENCY" as const,
        dependencyStrength: "HIGH" as const,
        confidence: "HIGH" as const,
        provenance: "OBSERVED" as const,
        commodity: "Cassava",
        geographicScope: "STATE" as const,
        locationState: "Oyo",
        flowShare: 80,
      };

      const parsed = createDependencyRelationshipInputSchema.safeParse(validRel);
      expect(parsed.success).toBe(true);
    });

    it("rejects self-referential relationships", () => {
      const selfRef = {
        sourceNodeType: "PROCESSING_FACILITY" as const,
        sourceNodeId: "mill-01",
        relationshipType: "DEPENDS_ON" as const,
        targetNodeType: "PROCESSING_FACILITY" as const,
        targetNodeId: "mill-01",
      };

      const parsed = createDependencyRelationshipInputSchema.safeParse(selfRef);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("Self-referential dependency relationship is invalid");
      }
    });

    it("rejects inverted temporal validity (validUntil before validFrom)", () => {
      const invertedTimes = {
        sourceNodeType: "PRODUCER" as const,
        sourceNodeId: "f-1",
        relationshipType: "SUPPLIES" as const,
        targetNodeType: "AGGREGATION_POOL" as const,
        targetNodeId: "p-1",
        validFrom: "2026-11-01T00:00:00.000Z",
        validUntil: "2026-10-01T00:00:00.000Z",
      };

      const parsed = createDependencyRelationshipInputSchema.safeParse(invertedTimes);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("validUntil timestamp cannot precede validFrom");
      }
    });

    it("strictly rejects porcine produce references under Anti-Pork policy", () => {
      expect(() =>
        assertNoProhibitedProduceDependency("Pork Belly", "Test Context")
      ).toThrow(/Anti-Pork/i);

      expect(() =>
        assertNoProhibitedProduceDependency("Swine livestock", "Test Context")
      ).toThrow(/Anti-Pork/i);

      const porcineRel = {
        sourceNodeType: "PRODUCER" as const,
        sourceNodeId: "f-1",
        relationshipType: "PRODUCES" as const,
        targetNodeType: "COMMODITY" as const,
        targetNodeId: "pork",
        commodity: "pork carcasses",
      };

      const parsedRel = createDependencyRelationshipInputSchema.safeParse(porcineRel);
      expect(parsedRel.success).toBe(false);

      const porcineCascade = {
        rootNodeType: "REGION" as const,
        rootNodeId: "Oyo",
        commodity: "bacon strips",
      };
      const parsedCascade = traverseDependencyCascadeInputSchema.safeParse(porcineCascade);
      expect(parsedCascade.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CONCENTRATION & BOTTLENECK ANALYSIS
  // ---------------------------------------------------------------------------
  describe("Concentration & Bottleneck Analysis Engine", () => {
    it("returns INSUFFICIENT_DATA when sample size is below threshold (3)", () => {
      const sparseObservations = [
        { entityId: "supplier-1", sharePercentage: 80 },
        { entityId: "supplier-2", sharePercentage: 20 },
      ];

      const result = calculateConcentrationRisk({
        subjectType: "B2B_DEMAND",
        subjectId: "demand-brewery-1",
        concentrationType: "SUPPLIER",
        observations: sparseObservations,
      });

      expect(result.status).toBe("INSUFFICIENT_DATA");
      expect(result.classification).toBe("INSUFFICIENT_DATA");
      expect(result.concentrationRatio).toBeNull();
      expect(result.isSinglePointOfFailure).toBe(false);
      expect(result.advisoryGuidance).toContain("Insufficient historical observations");
    });

    it("identifies CRITICAL_DEPENDENCY and single point of failure when ratio >= 75%", () => {
      const observations = [
        { entityId: "mill-alpha", entityLabel: "Alpha Grain Mill Ltd", sharePercentage: 82.5 },
        { entityId: "mill-beta", entityLabel: "Beta Processing Co", sharePercentage: 10.0 },
        { entityId: "mill-gamma", entityLabel: "Gamma Millers", sharePercentage: 7.5 },
      ];

      const result = calculateConcentrationRisk({
        subjectType: "PROCESSING_FACILITY",
        subjectId: "state-kano-wheat",
        concentrationType: "PROCESSING",
        observations,
      });

      expect(result.status).toBe("COMPUTED");
      expect(result.classification).toBe("CRITICAL_DEPENDENCY");
      expect(result.concentrationRatio).toBe(82.5);
      expect(result.dominantEntityId).toBe("mill-alpha");
      expect(result.dominantEntityLabel).toBe("Alpha Grain Mill Ltd");
      expect(result.isSinglePointOfFailure).toBe(true);
      expect(result.advisoryGuidance).toContain("Critical processing bottleneck (82.5%)");
    });

    it("correctly classifies brackets: HIGH_DEPENDENCY (50-74.9%), CONCENTRATED (30-49.9%), and NORMAL (<30%)", () => {
      expect(classifyConcentrationRatio(76)).toBe("CRITICAL_DEPENDENCY");
      expect(classifyConcentrationRatio(60)).toBe("HIGH_DEPENDENCY");
      expect(classifyConcentrationRatio(45)).toBe("CONCENTRATED");
      expect(classifyConcentrationRatio(22)).toBe("NORMAL");

      // Test with absolute quantities
      const quantObservations = [
        { entityId: "c-1", absoluteQuantity: 600 },
        { entityId: "c-2", absoluteQuantity: 250 },
        { entityId: "c-3", absoluteQuantity: 150 },
      ]; // Total = 1000, c-1 = 60% -> HIGH_DEPENDENCY

      const result = calculateConcentrationRisk({
        subjectType: "LOGISTICS_CORRIDOR",
        subjectId: "corridor-lagos-ibadan",
        concentrationType: "CORRIDOR",
        observations: quantObservations,
      });

      expect(result.status).toBe("COMPUTED");
      expect(result.classification).toBe("HIGH_DEPENDENCY");
      expect(result.concentrationRatio).toBe(60);
      expect(result.dominantEntityId).toBe("c-1");
      expect(result.isSinglePointOfFailure).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. BOUNDED CASCADE TRAVERSAL & CYCLE MITIGATION
  // ---------------------------------------------------------------------------
  describe("Bounded Cascade Traversal Engine", () => {
    const mockRelationships: DependencyRelationship[] = [
      // Hop 1: Producer -> Aggregation Pool
      {
        id: "rel-1",
        sourceNodeType: "PRODUCER",
        sourceNodeId: "farmer-01",
        relationshipType: "CONTRIBUTES_TO",
        targetNodeType: "AGGREGATION_POOL",
        targetNodeId: "pool-01",
        relationshipNature: "DEPENDENCY",
        dependencyStrength: "HIGH",
        confidence: "HIGH",
        provenance: "OBSERVED",
        commodity: "Cassava",
        geographicScope: "STATE",
        locationState: "Oyo",
        isActive: true,
        validFrom: "2026-01-01T00:00:00Z",
        metadata: {},
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      // Hop 2: Aggregation Pool -> Processing Facility
      {
        id: "rel-2",
        sourceNodeType: "AGGREGATION_POOL",
        sourceNodeId: "pool-01",
        relationshipType: "SUPPLIES",
        targetNodeType: "PROCESSING_FACILITY",
        targetNodeId: "mill-01",
        relationshipNature: "DEPENDENCY",
        dependencyStrength: "CRITICAL",
        confidence: "HIGH",
        provenance: "OBSERVED",
        commodity: "Cassava",
        geographicScope: "STATE",
        locationState: "Oyo",
        isActive: true,
        validFrom: "2026-01-01T00:00:00Z",
        metadata: {},
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      // Hop 3: Processing Facility -> B2B Demand
      {
        id: "rel-3",
        sourceNodeType: "PROCESSING_FACILITY",
        sourceNodeId: "mill-01",
        relationshipType: "SUPPLIES",
        targetNodeType: "B2B_DEMAND",
        targetNodeId: "demand-brewery-01",
        relationshipNature: "DEPENDENCY",
        dependencyStrength: "HIGH",
        confidence: "MODERATE",
        provenance: "DERIVED",
        commodity: "Cassava Starch",
        geographicScope: "NATIONAL",
        locationState: "Lagos",
        isActive: true,
        validFrom: "2026-01-01T00:00:00Z",
        metadata: {},
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      // Circular edge: B2B Demand -> Producer (Cycle)
      {
        id: "rel-cycle",
        sourceNodeType: "B2B_DEMAND",
        sourceNodeId: "demand-brewery-01",
        relationshipType: "DEMANDS",
        targetNodeType: "PRODUCER",
        targetNodeId: "farmer-01",
        relationshipNature: "ASSOCIATION",
        dependencyStrength: "LOW",
        confidence: "LOW",
        provenance: "CORRELATED",
        commodity: "Cassava",
        geographicScope: "NATIONAL",
        isActive: true,
        validFrom: "2026-01-01T00:00:00Z",
        metadata: {},
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    it("traverses multi-hop cascade paths accurately up to bounded depth", () => {
      const cascade = traverseDependencyCascade({
        rootNodeType: "PRODUCER",
        rootNodeId: "farmer-01",
        relationships: mockRelationships,
        maxDepth: 3,
      });

      expect(cascade.traversedNodesCount).toBe(4);
      expect(cascade.steps.length).toBe(3);
      expect(cascade.maxDepthEnforced).toBe(3);
      expect(cascade.downstreamExposures.length).toBe(3);

      // Check exposure hops
      const poolExp = cascade.downstreamExposures.find((e) => e.nodeId === "pool-01");
      expect(poolExp?.shortestDepth).toBe(1);

      const millExp = cascade.downstreamExposures.find((e) => e.nodeId === "mill-01");
      expect(millExp?.shortestDepth).toBe(2);
      expect(millExp?.maxStrength).toBe("CRITICAL");

      const demandExp = cascade.downstreamExposures.find((e) => e.nodeId === "demand-brewery-01");
      expect(demandExp?.shortestDepth).toBe(3);
      expect(demandExp?.maxStrength).toBe("HIGH");
    });

    it("safely detects circular relationships without infinite recursion", () => {
      // Traverse with depth 5 so it would cycle if unhandled
      const cascade = traverseDependencyCascade({
        rootNodeType: "PRODUCER",
        rootNodeId: "farmer-01",
        relationships: mockRelationships,
        maxDepth: 5,
      });

      expect(cascade.cycleDetected).toBe(true);
      // Traversal terminates safely
      expect(cascade.traversedEdgesCount).toBeLessThan(10);
      expect(cascade.advisoryDisclaimer).toContain(DEPENDENCY_ADVISORY_DISCLAIMER);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. STRUCTURAL ALTERNATIVE PATHS & CAVEAT ENFORCEMENT
  // ---------------------------------------------------------------------------
  describe("Structural Alternative Paths", () => {
    const relationships: DependencyRelationship[] = [
      {
        id: "rel-alt-1",
        sourceNodeType: "PROCESSING_FACILITY",
        sourceNodeId: "mill-primary",
        relationshipType: "ALTERNATIVE_TO",
        targetNodeType: "PROCESSING_FACILITY",
        targetNodeId: "mill-backup",
        relationshipNature: "ASSOCIATION",
        dependencyStrength: "MODERATE",
        confidence: "HIGH",
        provenance: "OBSERVED",
        commodity: "Cassava",
        geographicScope: "STATE",
        locationState: "Oyo",
        isActive: true,
        validFrom: "2026-01-01T00:00:00Z",
        metadata: { capacityVerified: false },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    const availableNodes: DependencyNode[] = [
      {
        type: "PROCESSING_FACILITY",
        id: "mill-peer-3",
        label: "Iseyin Agro Processing Plant",
        state: "Oyo",
        lga: "Iseyin",
        commodity: "Cassava",
        metadata: { capacityVerified: false },
      },
    ];

    it("identifies direct alternatives and capable peers with explicit UNVERIFIED_CAPACITY status", () => {
      const result = identifyPotentialAlternatives({
        targetNodeType: "PROCESSING_FACILITY",
        targetNodeId: "mill-primary",
        relationships,
        availableNodes,
        commodityFilter: "Cassava",
      });

      expect(result.alternatives.length).toBe(2);

      // Direct alternative
      const direct = result.alternatives.find((a) => a.nodeId === "mill-backup");
      expect(direct?.relationshipNature).toBe("DIRECT_ALTERNATIVE");
      expect(direct?.capacityEvidenceStatus).toBe("UNVERIFIED_CAPACITY");

      // Capable peer
      const peer = result.alternatives.find((a) => a.nodeId === "mill-peer-3");
      expect(peer?.relationshipNature).toBe("CAPABLE_PEER");
      expect(peer?.capacityEvidenceStatus).toBe("UNVERIFIED_CAPACITY");

      // Mandated caveat
      expect(result.caveat).toBe(ALTERNATIVE_PATH_CAVEAT);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. PRIVACY SANITIZATION
  // ---------------------------------------------------------------------------
  describe("Privacy & Information Masking", () => {
    const rawRel: DependencyRelationship = {
      id: "rel-priv-1",
      sourceNodeType: "PRODUCER",
      sourceNodeId: "producer-user-uuid-99",
      relationshipType: "SUPPLIES",
      targetNodeType: "PROCESSING_FACILITY",
      targetNodeId: "mill-public-1",
      relationshipNature: "DEPENDENCY",
      dependencyStrength: "HIGH",
      confidence: "HIGH",
      provenance: "OBSERVED",
      commodity: "Yam",
      geographicScope: "STATE",
      locationState: "Benue",
      isActive: true,
      validFrom: "2026-01-01T00:00:00Z",
      metadata: {
        privatePricePerTon: 450000,
        privateContactPhone: "08031234567",
        warehouseCode: "WH-9081",
        safeCategory: "TUBERS",
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    it("sanitizes producer ID and scrubs private commercial metadata for peer viewers", () => {
      const sanitized = sanitizeDependencyRelationshipForViewer(rawRel, "peer-user-123", false);

      expect(sanitized.sourceNodeId).toContain("masked-");
      expect(sanitized.sourceLabel).toBe("Producer (Benue)");
      // Private metadata stripped
      expect(sanitized.metadata.privatePricePerTon).toBeUndefined();
      expect(sanitized.metadata.privateContactPhone).toBeUndefined();
      // Safe metadata preserved
      expect(sanitized.metadata.safeCategory).toBe("TUBERS");
      // Structural topology preserved
      expect(sanitized.targetNodeId).toBe("mill-public-1");
      expect(sanitized.commodity).toBe("Yam");
    });

    it("preserves full details for platform administrator", () => {
      const adminView = sanitizeDependencyRelationshipForViewer(rawRel, "admin-user", true);

      expect(adminView.sourceNodeId).toBe("producer-user-uuid-99");
      expect(adminView.metadata.privatePricePerTon).toBe(450000);
      expect(adminView.metadata.privateContactPhone).toBe("08031234567");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. AGENT QUERY INTEGRATION
  // ---------------------------------------------------------------------------
  describe("Agent Query Integration", () => {
    it("persists and queries critical dependencies through getCriticalDependencies", async () => {
      await saveDependencyAssessment({
        id: "assess-1",
        entityType: "PROCESSING_FACILITY",
        entityId: "mill-kaduna-1",
        assessmentType: "PROCESSING_BOTTLENECK",
        classification: "CRITICAL_DEPENDENCY",
        concentrationRatio: 88,
        affectedCommodity: "Maize",
        locationState: "Kaduna",
        riskSummary: "Single mill handles 88% of Kaduna maize processing.",
        confidence: "HIGH",
        provenance: "OBSERVED",
        cascadeDepth: 1,
        metadata: {},
        assessedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      const criticalList = await getCriticalDependencies({ commodity: "Maize" });
      expect(criticalList.length).toBe(1);
      expect(criticalList[0].entityId).toBe("mill-kaduna-1");
      expect(criticalList[0].classification).toBe("CRITICAL_DEPENDENCY");
    });
  });

  // ---------------------------------------------------------------------------
  // 7. GOVERNANCE EVALUATION INTEGRATION
  // ---------------------------------------------------------------------------
  describe("Consequential Action Governance Integration", () => {
    it("blocks createDependencyRelationshipAction when governance returns DENY", async () => {
      const mockUser: AuthUser = {
        id: "user-test",
        email: "user@agromarket.test",
        phone: null,
        fullName: "Test Coordinator",
        state: "Oyo",
        lga: "Ibadan",
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
        reasons: ["Biosecurity restriction active in transit corridor."],
        policyVersion: "1.0.0",
        isProhibitedAction: false,
        evidenceCount: 1,
        confidenceScore: 0.95,
        contextMetadata: {},
        evaluatedAt: new Date().toISOString(),
      });

      const result = await createDependencyRelationshipAction({
        sourceNodeType: "PRODUCER",
        sourceNodeId: "farmer-blocked",
        relationshipType: "SUPPLIES",
        targetNodeType: "PROCESSING_FACILITY",
        targetNodeId: "mill-blocked",
        commodity: "Soybeans",
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("GOVERNANCE_DENIED");
      expect(result.error).toContain("Governance Denied:");
      expect(result.error).toContain("Biosecurity restriction active in transit corridor.");
    });
  });
});
