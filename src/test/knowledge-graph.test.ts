/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Graph & Ontology Test Suite
 * Comprehensive Domain, Traversal, Privacy, Anti-Pork, and Governance Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createKnowledgeConceptInputSchema,
  createKnowledgeRelationshipInputSchema,
  createEntityLinkInputSchema,
  assertNoProhibitedProduceKnowledge,
} from "../features/knowledge-graph/validation";
import {
  detectHierarchyCycle,
  traverseHierarchyInMemory,
} from "../features/knowledge-graph/hierarchy-engine";
import {
  traverseNeighborhoodInMemory,
  findKnowledgePathInMemory,
} from "../features/knowledge-graph/graph-traversal";
import {
  assembleKnowledgeContextPackage,
} from "../features/knowledge-graph/context-assembly";
import {
  sanitizeKnowledgeMetadata,
} from "../features/knowledge-graph/privacy";
import {
  resetInMemoryKnowledgeGraph,
} from "../features/knowledge-graph/data-layer";
import {
  getKnowledgeConcept,
  getCommodityKnowledgeContext,
  getKnowledgeOverviewMetrics,
} from "../features/knowledge-graph/queries";
import {
  createKnowledgeConceptAction,
} from "../features/knowledge-graph/actions";
import {
  KnowledgeConcept,
  KnowledgeRelationship,
} from "../features/knowledge-graph/types";
import { isValidActionRoute } from "../features/action-integration/validation";
import * as authServer from "@/lib/auth/server";
import * as governancePolicyEngine from "@/features/intelligence-governance/policy-engine";
import { AuthUser } from "@/types/auth";

describe("Phase 3.13: Agricultural Knowledge Graph & Ontology Foundation", () => {
  beforeEach(() => {
    resetInMemoryKnowledgeGraph();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. ANTI-PORK ZERO TOLERANCE INVARIANTS
  // ---------------------------------------------------------------------------
  describe("Anti-Pork Policy Invariants", () => {
    it("rejects prohibited porcine keywords in concept creation validation", () => {
      const prohibitedKeywords = ["pork", "swine", "pig", "bacon", "ham", "porcine"];

      for (const kw of prohibitedKeywords) {
        expect(() => {
          assertNoProhibitedProduceKnowledge(kw, "Test Produce");
        }).toThrow(/Zero-tolerance policy violation/i);

        const invalidInput = {
          conceptKey: `crop:${kw}`,
          canonicalName: `Farm ${kw}`,
          displayName: `Fresh ${kw}`,
          conceptType: "COMMODITY" as const,
        };

        const result = createKnowledgeConceptInputSchema.safeParse(invalidInput);
        expect(result.success).toBe(false);
      }
    });

    it("allows valid halal agricultural commodities", () => {
      const validCommodities = ["Cassava", "Yam", "Maize", "Rice", "Tomato", "Sorghum", "Cowpea", "Tilapia"];

      for (const commodity of validCommodities) {
        expect(() => {
          assertNoProhibitedProduceKnowledge(commodity, "Valid Produce");
        }).not.toThrow();

        const result = createKnowledgeConceptInputSchema.safeParse({
          conceptKey: `crop:${commodity.toLowerCase()}`,
          canonicalName: commodity,
          displayName: `Nigerian ${commodity}`,
          conceptType: "CROP" as const,
        });

        expect(result.success).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. SCHEMA & VALIDATION GUARDRAILS
  // ---------------------------------------------------------------------------
  describe("Concept & Relationship Validation", () => {
    it("rejects self-referencing relationships (source === target)", () => {
      const sameId = "11111111-1111-1111-1111-111111111111";
      const result = createKnowledgeRelationshipInputSchema.safeParse({
        sourceConceptId: sameId,
        relationshipType: "IS_A",
        targetConceptId: sameId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/no self-loops/i);
      }
    });

    it("validates temporal validity window (validUntil >= validFrom)", () => {
      const past = "2026-01-01T00:00:00.000Z";
      const future = "2026-12-31T00:00:00.000Z";

      // Valid: future > past
      const validRes = createKnowledgeConceptInputSchema.safeParse({
        conceptKey: "crop:millet",
        canonicalName: "Millet",
        displayName: "Pearl Millet",
        conceptType: "CROP",
        validFrom: past,
        validUntil: future,
      });
      expect(validRes.success).toBe(true);

      // Invalid: until < from
      const invalidRes = createKnowledgeConceptInputSchema.safeParse({
        conceptKey: "crop:millet-invalid",
        canonicalName: "Millet Invalid",
        displayName: "Millet Invalid",
        conceptType: "CROP",
        validFrom: future,
        validUntil: past,
      });
      expect(invalidRes.success).toBe(false);
    });

    it("validates entity link input schema", () => {
      const validLink = {
        conceptId: "11111111-1111-1111-1111-111111111111",
        entityType: "PRODUCT" as const,
        entityId: "prod-local-rice-01",
        linkNature: "CANONICAL" as const,
      };

      const result = createEntityLinkInputSchema.safeParse(validLink);
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. HIERARCHY ENGINE & CYCLE DETECTION
  // ---------------------------------------------------------------------------
  describe("Hierarchy Engine & Cycle Prevention", () => {
    it("detects direct and indirect hierarchy cycles", () => {
      const map = new Map<string, KnowledgeConcept>([
        ["id-agriculture", { id: "id-agriculture", parentConceptId: null } as KnowledgeConcept],
        ["id-crops", { id: "id-crops", parentConceptId: "id-agriculture" } as KnowledgeConcept],
        ["id-cereals", { id: "id-cereals", parentConceptId: "id-crops" } as KnowledgeConcept],
        ["id-rice", { id: "id-rice", parentConceptId: "id-cereals" } as KnowledgeConcept],
      ]);

      // Direct self-parent
      expect(detectHierarchyCycle("id-rice", "id-rice", map)).toBe(true);

      // Indirect cycle: making Agriculture child of Rice
      expect(detectHierarchyCycle("id-agriculture", "id-rice", map)).toBe(true);

      // Valid parent: Rice under Crops
      expect(detectHierarchyCycle("id-rice", "id-crops", map)).toBe(false);
    });

    it("traverses ancestors correctly up to root", () => {
      const concepts: KnowledgeConcept[] = [
        {
          id: "root-agri",
          conceptKey: "domain:agriculture",
          canonicalName: "Agriculture",
          displayName: "Agriculture",
          conceptType: "KNOWLEDGE_TOPIC",
          parentConceptId: null,
          status: "PUBLISHED",
          validUntil: null,
        } as KnowledgeConcept,
        {
          id: "node-crops",
          conceptKey: "sub:crops",
          canonicalName: "Crop Production",
          displayName: "Crop Production",
          conceptType: "PRODUCTION_SYSTEM",
          parentConceptId: "root-agri",
          status: "PUBLISHED",
          validUntil: null,
        } as KnowledgeConcept,
        {
          id: "node-rice",
          conceptKey: "crop:rice",
          canonicalName: "Rice",
          displayName: "Rice Grain",
          conceptType: "CROP",
          parentConceptId: "node-crops",
          status: "PUBLISHED",
          validUntil: null,
        } as KnowledgeConcept,
      ];

      const ancestors = traverseHierarchyInMemory({
        rootConceptId: "node-rice",
        direction: "ANCESTORS",
        concepts,
      });

      expect(ancestors).toHaveLength(3);
      expect(ancestors[0].conceptId).toBe("node-rice");
      expect(ancestors[1].conceptId).toBe("node-crops");
      expect(ancestors[2].conceptId).toBe("root-agri");
      expect(ancestors[2].parentConceptId).toBeNull();
    });

    it("traverses descendants cleanly", () => {
      const concepts: KnowledgeConcept[] = [
        {
          id: "root-livestock",
          conceptKey: "domain:livestock",
          canonicalName: "Livestock",
          displayName: "Livestock",
          conceptType: "PRODUCTION_SYSTEM",
          parentConceptId: null,
          status: "PUBLISHED",
          validUntil: null,
        } as KnowledgeConcept,
        {
          id: "node-poultry",
          conceptKey: "livestock:poultry",
          canonicalName: "Poultry",
          displayName: "Poultry Farming",
          conceptType: "POULTRY",
          parentConceptId: "root-livestock",
          status: "PUBLISHED",
          validUntil: null,
        } as KnowledgeConcept,
        {
          id: "node-broiler",
          conceptKey: "poultry:broiler",
          canonicalName: "Broiler",
          displayName: "Broiler Chicken",
          conceptType: "POULTRY",
          parentConceptId: "node-poultry",
          status: "PUBLISHED",
          validUntil: null,
        } as KnowledgeConcept,
      ];

      const descendants = traverseHierarchyInMemory({
        rootConceptId: "root-livestock",
        direction: "DESCENDANTS",
        concepts,
      });

      expect(descendants).toHaveLength(3);
      expect(descendants[0].conceptId).toBe("root-livestock");
      expect(descendants.map((d) => d.conceptId)).toContain("node-broiler");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. GRAPH TRAVERSAL & PATHFINDING
  // ---------------------------------------------------------------------------
  describe("Neighborhood Traversal & Pathfinding", () => {
    it("explores semantic neighborhood within depth limits", () => {
      const concepts: KnowledgeConcept[] = [
        { id: "c-tomato", conceptKey: "crop:tomato", canonicalName: "Tomato", displayName: "Tomato", conceptType: "CROP", status: "PUBLISHED" } as KnowledgeConcept,
        { id: "c-kaduna", conceptKey: "region:kaduna", canonicalName: "Kaduna", displayName: "Kaduna State", conceptType: "STATE", status: "PUBLISHED" } as KnowledgeConcept,
        { id: "c-tuta", conceptKey: "disease:tuta_absoluta", canonicalName: "Tuta Absoluta", displayName: "Tomato Leafminer", conceptType: "DISEASE", status: "PUBLISHED" } as KnowledgeConcept,
      ];

      const relationships: KnowledgeRelationship[] = [
        {
          id: "rel-1",
          sourceConceptId: "c-tomato",
          relationshipType: "GROWS_IN",
          targetConceptId: "c-kaduna",
          relationshipStrength: "STRONG",
          confidence: "HIGH",
          status: "PUBLISHED",
        } as KnowledgeRelationship,
        {
          id: "rel-2",
          sourceConceptId: "c-tomato",
          relationshipType: "AFFECTED_BY",
          targetConceptId: "c-tuta",
          relationshipStrength: "CRITICAL",
          confidence: "HIGH",
          status: "PUBLISHED",
        } as KnowledgeRelationship,
      ];

      const neighborhood = traverseNeighborhoodInMemory({
        conceptId: "c-tomato",
        concepts,
        relationships,
        maxDepth: 2,
      });

      expect(neighborhood).toHaveLength(2);
      expect(neighborhood.map((n) => n.targetKey)).toContain("region:kaduna");
      expect(neighborhood.map((n) => n.targetKey)).toContain("disease:tuta_absoluta");
    });

    it("finds multi-hop semantic path between concepts", () => {
      const concepts: KnowledgeConcept[] = [
        { id: "c-1", conceptKey: "k-1", canonicalName: "1", displayName: "1", conceptType: "CROP", status: "PUBLISHED" } as KnowledgeConcept,
        { id: "c-2", conceptKey: "k-2", canonicalName: "2", displayName: "2", conceptType: "PROCESS", status: "PUBLISHED" } as KnowledgeConcept,
        { id: "c-3", conceptKey: "k-3", canonicalName: "3", displayName: "3", conceptType: "MARKET", status: "PUBLISHED" } as KnowledgeConcept,
      ];

      const relationships: KnowledgeRelationship[] = [
        { id: "r-12", sourceConceptId: "c-1", targetConceptId: "c-2", relationshipType: "PROCESSED_BY", status: "PUBLISHED" } as KnowledgeRelationship,
        { id: "r-23", sourceConceptId: "c-2", targetConceptId: "c-3", relationshipType: "SOLD_IN", status: "PUBLISHED" } as KnowledgeRelationship,
      ];

      const path = findKnowledgePathInMemory({
        sourceConceptId: "c-1",
        targetConceptId: "c-3",
        concepts,
        relationships,
        maxDepth: 3,
      });

      expect(path).not.toBeNull();
      expect(path).toHaveLength(2);
      expect(path![0].id).toBe("r-12");
      expect(path![1].id).toBe("r-23");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. TEMPORAL VALIDITY & EXPIRED EXCLUSION
  // ---------------------------------------------------------------------------
  describe("Temporal Validity & Historical Separation", () => {
    it("excludes expired relationships from active queries", () => {
      const concepts: KnowledgeConcept[] = [
        { id: "c-a", conceptKey: "k-a", canonicalName: "A", displayName: "A", conceptType: "CROP", status: "PUBLISHED" } as KnowledgeConcept,
        { id: "c-b", conceptKey: "k-b", canonicalName: "B", displayName: "B", conceptType: "STATE", status: "PUBLISHED" } as KnowledgeConcept,
      ];

      const relationships: KnowledgeRelationship[] = [
        {
          id: "r-expired",
          sourceConceptId: "c-a",
          targetConceptId: "c-b",
          relationshipType: "COMMON_IN",
          validFrom: "2020-01-01T00:00:00.000Z",
          validUntil: "2021-01-01T00:00:00.000Z", // EXPIRED
          status: "PUBLISHED",
        } as KnowledgeRelationship,
      ];

      const active = traverseNeighborhoodInMemory({
        conceptId: "c-a",
        concepts,
        relationships,
        includeHistorical: false,
      });
      expect(active).toHaveLength(0);

      const withHistorical = traverseNeighborhoodInMemory({
        conceptId: "c-a",
        concepts,
        relationships,
        includeHistorical: true,
      });
      expect(withHistorical).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. PRIVACY & PII SANITIZATION
  // ---------------------------------------------------------------------------
  describe("Privacy & Confidentiality Layer", () => {
    it("strips confidential commercial pricing, GPS, and phone numbers from metadata", () => {
      const metadata = {
        agronomicFamily: "Solanaceae",
        soilType: "Loamy",
        phone: "+2348012345678",
        sellerPrice: 50000,
        gpsLatitude: 11.9804,
        exactAddress: "Secret Farm Road 4",
      };

      const clean = sanitizeKnowledgeMetadata(metadata);
      expect(clean.agronomicFamily).toBe("Solanaceae");
      expect(clean.soilType).toBe("Loamy");
      expect(clean.phone).toBeUndefined();
      expect(clean.sellerPrice).toBeUndefined();
      expect(clean.gpsLatitude).toBeUndefined();
      expect(clean.exactAddress).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. CONTEXT ASSEMBLY & ADVISORY NOTICES
  // ---------------------------------------------------------------------------
  describe("Context Assembly Engine", () => {
    it("assembles rich deterministic evidence package with proper disclaimers", () => {
      const rootCrop: KnowledgeConcept = {
        id: "crop-yam",
        conceptKey: "crop:yam",
        canonicalName: "Yam",
        displayName: "White Yam (Dioscorea rotundata)",
        conceptType: "CROP",
        description: null,
        parentConceptId: null,
        status: "PUBLISHED",
        provenance: "EDITORIAL",
        confidence: "HIGH",
        geographicScope: "NATIONAL",
        sourceReference: "National Root Crops Research Institute",
        metadata: { variety: "Heda" },
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };

      const diseaseConcept: KnowledgeConcept = {
        id: "dis-anthracnose",
        conceptKey: "disease:yam_anthracnose",
        canonicalName: "Yam Anthracnose",
        displayName: "Yam Anthracnose (Colletotrichum gloeosporioides)",
        conceptType: "DISEASE",
        description: null,
        parentConceptId: null,
        status: "PUBLISHED",
        provenance: "EXTERNAL_SOURCE",
        confidence: "HIGH",
        geographicScope: "NATIONAL",
        sourceReference: "IITA",
        metadata: {},
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };

      const rel: KnowledgeRelationship = {
        id: "rel-yam-dis",
        sourceConceptId: "crop-yam",
        relationshipType: "AFFECTED_BY",
        targetConceptId: "dis-anthracnose",
        inverseRelationshipType: "AFFECTS",
        relationshipStrength: "STRONG",
        confidence: "HIGH",
        provenance: "EXTERNAL_SOURCE",
        geographicScope: "NATIONAL",
        locationState: null,
        locationLga: null,
        status: "PUBLISHED",
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: null,
        metadata: {},
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };

      const pkg = assembleKnowledgeContextPackage({
        rootConcept: rootCrop,
        allConcepts: [rootCrop, diseaseConcept],
        allRelationships: [rel],
        allLinks: [],
      });

      expect(pkg.concept.canonicalName).toBe("Yam");
      expect(pkg.contextMetadata.hasBiosecurityRisk).toBe(true);
      expect(pkg.contextMetadata.advisoryNotice).toMatch(/strictly informational and advisory/i);
      expect(pkg.contextMetadata.advisoryNotice).toMatch(/Disease and biosecurity associations/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. GOVERNANCE EVALUATION ON CONSEQUENTIAL MUTATIONS
  // ---------------------------------------------------------------------------
  describe("Consequential Action Governance Integration", () => {
    it("blocks createKnowledgeConceptAction when governance policy returns DENY", async () => {
      const mockUser: AuthUser = {
        id: "expert-user-01",
        email: "expert@agromarket.test",
        phone: null,
        fullName: "Dr. Agronomist",
        state: "Oyo",
        lga: "Ibadan",
        roles: ["EXPERT"],
        isEmailVerified: true,
        isPhoneVerified: false,
        isVerified: true,
        isOnboarded: true,
        createdAt: new Date().toISOString(),
      };
      vi.spyOn(authServer, "getCurrentUser").mockResolvedValue(mockUser);

      // Mock governance policy returning DENY
      vi.spyOn(governancePolicyEngine, "evaluateGovernancePolicy").mockReturnValue({
        id: "eval-deny-kg",
        recommendationId: null,
        scenarioId: null,
        agentId: "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
        domain: "AGRICULTURAL_COORDINATION",
        actionIntent: "EXECUTE_COORDINATED_FULFILMENT",
        actorRole: "EXPERT",
        riskLevel: "HIGH",
        autonomyLevel: "REQUIRE_HUMAN_APPROVAL",
        decision: "DENY",
        requiredReviewLevel: "PLATFORM_REVIEW",
        reasons: ["Policy block: Knowledge mutation blocked pending verification window"],
        policyVersion: "3.8.0",
        isProhibitedAction: false,
        evidenceCount: 1,
        confidenceScore: 0.9,
        contextMetadata: {},
        evaluatedAt: new Date().toISOString(),
      });

      const res = await createKnowledgeConceptAction({
        conceptKey: "crop:ginger",
        canonicalName: "Ginger",
        displayName: "Kaduna Fresh Ginger",
        conceptType: "CROP",
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Governance Denied/i);
      expect(res.code).toBe("GOVERNANCE_DENIED");
    });
  });

  // ---------------------------------------------------------------------------
  // 9. ACTION INTEGRATION ROUTE WHITELIST
  // ---------------------------------------------------------------------------
  describe("Action Integration Routing", () => {
    it("validates /knowledge-graph as a valid AgroMarket action route", () => {
      expect(isValidActionRoute("/knowledge-graph")).toBe(true);
      expect(isValidActionRoute("/knowledge-graph?topic=crop")).toBe(true);
      expect(isValidActionRoute("/fake-ai-bot")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. EMPTY STATE & NON-FABRICATION
  // ---------------------------------------------------------------------------
  describe("Empty State & Non-Fabrication Verification", () => {
    it("returns clean empty metrics without fabricating synthetic nodes", async () => {
      const metrics = await getKnowledgeOverviewMetrics();
      expect(metrics.totalConcepts).toBe(0);
      expect(metrics.totalRelationships).toBe(0);
      expect(metrics.recentVerifiedConcepts).toHaveLength(0);
    });

    it("returns null for non-existent concepts without hallucinating facts", async () => {
      const res = await getKnowledgeConcept("non-existent-crop-999");
      expect(res).toBeNull();

      const context = await getCommodityKnowledgeContext("non-existent-commodity");
      expect(context).toBeNull();
    });
  });
});
