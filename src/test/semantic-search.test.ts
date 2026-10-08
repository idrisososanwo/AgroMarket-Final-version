/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search & Retrieval Foundation Test Suite
 * Comprehensive verification of validation, anti-pork invariants, privacy, hybrid retrieval,
 * ontology expansion, ranking explainability, governance, embedding honesty, and fallbacks.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  searchQueryInputSchema,
  assertNoProhibitedProduceSearch,
} from "../features/semantic-search/validation";
import {
  setEmbeddingProvider,
  resetEmbeddingProvider,
  getEmbeddingProvider,
  generateDocumentEmbedding,
  generateQueryEmbedding,
} from "../features/semantic-search/embeddings";
import {
  sanitizeSearchSnippet,
  sanitizeSearchMetadata,
  sanitizeSearchResult,
} from "../features/semantic-search/privacy";
import {
  calculateDocumentScore,
  rankSearchResults,
} from "../features/semantic-search/ranking";
import {
  applyStructuredFilters,
  matchesTemporalValidity,
} from "../features/semantic-search/filters";
import {
  indexSearchDocument,
  updateSearchVisibility,
  resetInMemorySearchStore,
  buildSearchDocumentFromConcept,
  buildSearchDocumentFromContext,
  getInMemorySearchDocuments,
} from "../features/semantic-search/indexing";
import {
  executeAgriculturalSearch,
  expandQueryOntology,
} from "../features/semantic-search/retrieval";
import {
  retrieveCommodityContext,
  retrieveProductionContext,
  retrieveMarketContext,
  retrieveDiseaseContext,
  retrieveFoodSecurityContext,
  retrieveLogisticsContext,
  retrieveProcessingContext,
  retrieveRegionalContext,
  getSearchIndexMetrics,
} from "../features/semantic-search/queries";
import {
  indexKnowledgeDocumentAction,
  executeAgriculturalSearchAction,
} from "../features/semantic-search/actions";
import {
  AgriculturalSearchDocument,
  AgriculturalSearchResult,
  EmbeddingProvider,
} from "../features/semantic-search/types";
import { isValidActionRoute } from "../features/action-integration/validation";
import * as authServer from "@/lib/auth/server";
import * as governancePolicyEngine from "@/features/intelligence-governance/policy-engine";
import { AuthUser } from "@/types/auth";
import { resetInMemoryKnowledgeGraph, saveKnowledgeConcept } from "@/features/knowledge-graph/data-layer";
import { KnowledgeConcept } from "@/features/knowledge-graph/types";

describe("Phase 3.14: Agricultural Semantic Search & Retrieval Foundation", () => {
  beforeEach(() => {
    resetInMemorySearchStore();
    resetInMemoryKnowledgeGraph();
    resetEmbeddingProvider();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. SCHEMA & QUERY VALIDATION (Tests 1-3, 38-39)
  // ---------------------------------------------------------------------------
  describe("Search Query Schema & Bounds", () => {
    it("validates a standard agricultural query with default bounds", () => {
      const parsed = searchQueryInputSchema.safeParse({ query: "sorghum storage in Kano" });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.limit).toBe(20);
        expect(parsed.data.temporalMode).toBe("CURRENT");
        expect(parsed.data.visibility).toBe("PUBLIC");
      }
    });

    it("enforces maximum query length limit (300 characters)", () => {
      const longQuery = "a".repeat(301);
      const parsed = searchQueryInputSchema.safeParse({ query: longQuery });
      expect(parsed.success).toBe(false);
    });

    it("enforces minimum query length limit (non-empty)", () => {
      const parsed = searchQueryInputSchema.safeParse({ query: "" });
      expect(parsed.success).toBe(false);
    });

    it("enforces result limit bounds (min 1, max 50)", () => {
      const low = searchQueryInputSchema.safeParse({ query: "cassava", limit: 0 });
      expect(low.success).toBe(false);

      const high = searchQueryInputSchema.safeParse({ query: "cassava", limit: 51 });
      expect(high.success).toBe(false);

      const valid = searchQueryInputSchema.safeParse({ query: "cassava", limit: 50 });
      expect(valid.success).toBe(true);
    });

    it("handles malformed query objects gracefully", () => {
      const parsed = searchQueryInputSchema.safeParse({ query: null });
      expect(parsed.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. ANTI-PORK ZERO TOLERANCE INVARIANTS (Tests 19-21)
  // ---------------------------------------------------------------------------
  describe("Anti-Pork Policy Invariants", () => {
    const prohibitedTerms = ["pork", "swine", "pig", "bacon", "ham", "porcine"];

    it("rejects search queries containing prohibited porcine terms", () => {
      for (const term of prohibitedTerms) {
        expect(() => assertNoProhibitedProduceSearch(`best ${term} feed`, "Query")).toThrow(
          /Zero-tolerance policy violation/i
        );

        const schemaResult = searchQueryInputSchema.safeParse({ query: `market prices for ${term}` });
        expect(schemaResult.success).toBe(false);
      }
    });

    it("rejects indexing documents containing prohibited porcine terms", async () => {
      for (const term of prohibitedTerms) {
        await expect(
          indexSearchDocument({
            documentKey: `doc:test:${term}`,
            sourceType: "KNOWLEDGE_CONTENT",
            sourceEntityId: `ent-${term}`,
            title: `Guide to ${term} farming`,
            searchableText: `Detailed guide on raising healthy ${term}.`,
            visibilityStatus: "PUBLIC",
            publicationStatus: "PUBLISHED",
          })
        ).rejects.toThrow(/Zero-tolerance policy violation/i);
      }
    });

    it("rejects commodity filter with prohibited produce in search action", async () => {
      const res = await executeAgriculturalSearchAction("feed options", {
        commodity: "pork",
      });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/prohibited produce/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PRIVACY & SANITIZATION (Tests 22, 24)
  // ---------------------------------------------------------------------------
  describe("Privacy & Confidentiality Sanitization", () => {
    it("redacts Nigerian phone numbers, coordinates, and emails from snippets", () => {
      const rawText =
        "Contact merchant at 08031234567 or +2348098765432. Farm located at 7.3775, 3.9470. Email: test@farmer.ng";
      const sanitized = sanitizeSearchSnippet(rawText);

      expect(sanitized).not.toContain("08031234567");
      expect(sanitized).not.toContain("+2348098765432");
      expect(sanitized).not.toContain("7.3775");
      expect(sanitized).not.toContain("test@farmer.ng");
      expect(sanitized).toContain("[PHONE REDACTED]");
      expect(sanitized).toContain("[COORDINATES REDACTED]");
      expect(sanitized).toContain("[EMAIL REDACTED]");
    });

    it("strips confidential pricing and banking info from metadata", () => {
      const meta = {
        commodity: "Yellow Maize",
        farmerPrice: 450000,
        cost: 380000,
        accountNumber: "0123456789",
        bvn: "12345678901",
        season: "Dry Season 2026",
      };

      const clean = sanitizeSearchMetadata(meta);
      expect(clean.commodity).toBe("Yellow Maize");
      expect(clean.season).toBe("Dry Season 2026");
      expect(clean.farmerPrice).toBeUndefined();
      expect(clean.cost).toBeUndefined();
      expect(clean.accountNumber).toBeUndefined();
      expect(clean.bvn).toBeUndefined();
    });

    it("sanitizes search results prior to returning to clients", () => {
      const result: AgriculturalSearchResult = {
        resultId: "res-1",
        documentId: "doc-1",
        sourceType: "PRODUCT",
        sourceEntityId: "prod-1",
        title: "Grain Depot Call 08023456789",
        sanitizedSnippet: "Call 08023456789 at 6.5243, 3.3792 for rates.",
        score: 0.85,
        rankingReasons: [],
        matchedConcepts: [],
        matchedCommodities: ["Maize"],
        geographicScope: "STATE",
        locationState: "Kano",
        locationLga: "Dawanau",
        sourceProvenance: "OBSERVED",
        confidence: "HIGH",
        validityStatus: "ACTIVE",
        validFrom: "2026-01-01T00:00:00Z",
        validUntil: null,
        metadata: { sellerPrice: 50000 },
      };

      const sanitized = sanitizeSearchResult(result);
      expect(sanitized.title).toContain("[PHONE REDACTED]");
      expect(sanitized.sanitizedSnippet).toContain("[PHONE REDACTED]");
      expect(sanitized.sanitizedSnippet).toContain("[COORDINATES REDACTED]");
      expect(sanitized.metadata.sellerPrice).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. EMBEDDING ABSTRACTION & HONESTY (Tests 7-9, 33)
  // ---------------------------------------------------------------------------
  describe("Embedding Provider Abstraction & Honesty", () => {
    it("reports unavailable status when default Noop provider is active", () => {
      const provider = getEmbeddingProvider();
      expect(provider.isAvailable()).toBe(false);
      expect(provider.providerName()).toBe("NONE");
    });

    it("never generates fake vectors when provider is unavailable", async () => {
      const res = await generateDocumentEmbedding("Cassava root processing techniques");
      expect(res.status).toBe("UNAVAILABLE");
      expect(res.vector).toBeNull();
      expect(res.error).toMatch(/No active embedding provider configured/i);
    });

    it("generates authentic query embedding only when custom provider is registered", async () => {
      class MockValidProvider implements EmbeddingProvider {
        providerName() {
          return "MOCK_TEST_PROVIDER";
        }
        getDimensions() {
          return 3;
        }
        isAvailable() {
          return true;
        }
        async embedDocument(_text: string) {
          return [0.1, 0.2, 0.3];
        }
        async embedQuery(_query: string) {
          return [0.4, 0.5, 0.6];
        }
      }

      setEmbeddingProvider(new MockValidProvider());
      const queryVector = await generateQueryEmbedding("white maize");
      expect(queryVector).toEqual([0.4, 0.5, 0.6]);

      const docRes = await generateDocumentEmbedding("white maize storage");
      expect(docRes.status).toBe("COMPLETED");
      expect(docRes.vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("switches search retrieval mode to LEXICAL or ONTOLOGY_EXPANDED when provider unavailable", async () => {
      resetEmbeddingProvider();
      await indexSearchDocument({
        documentKey: "doc:lexical:1",
        sourceType: "KNOWLEDGE_CONTENT",
        sourceEntityId: "kc-1",
        title: "Tomato Post-Harvest Loss Mitigation",
        searchableText: "Post-harvest cold chain logistics for fresh tomatoes in Kaduna.",
        commodityTerms: ["Tomato"],
        locationState: "Kaduna",
      });

      const response = await executeAgriculturalSearch("Tomato");
      expect(response.retrievalMode).toBe("LEXICAL");
      expect(response.providerNotice).toMatch(/Semantic embedding vector provider is not configured/i);
      expect(response.results.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. DETERMINISTIC RANKING & EXPLANATIONS (Tests 10-11, 37)
  // ---------------------------------------------------------------------------
  describe("Deterministic Hybrid Ranking & Explainability", () => {
    const sampleDoc: AgriculturalSearchDocument = {
      id: "doc-sample-1",
      documentKey: "doc:sample:1",
      sourceType: "KNOWLEDGE_CONTENT",
      sourceEntityId: "kc-sample",
      title: "Yellow Maize Flour Processing",
      searchableText: "Industrial milling and post-harvest drying for yellow maize in Niger state.",
      normalizedText: "yellow maize flour processing industrial milling and post-harvest drying for yellow maize in niger state.",
      conceptIds: ["cid-maize-1"],
      commodityTerms: ["Yellow Maize"],
      geographicScope: "STATE",
      locationState: "Niger",
      locationLga: "Bida",
      sourceProvenance: "EDITORIAL",
      confidence: "HIGH",
      visibilityStatus: "PUBLIC",
      publicationStatus: "PUBLISHED",
      validFrom: "2026-01-01T00:00:00Z",
      validUntil: null,
      language: "en",
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("generates transparent ranking explanations for matching factors", () => {
      const { score, explanations } = calculateDocumentScore(
        sampleDoc,
        "yellow maize flour processing",
        ["yellow", "maize", "flour"],
        ["cid-maize-1"],
        0
      );

      expect(score).toBeGreaterThan(0.5);
      const codes = explanations.map((e) => e.code);
      expect(codes).toContain("EXACT_TITLE_MATCH");
      expect(codes).toContain("EXACT_COMMODITY_MATCH");
      expect(codes).toContain("LEXICAL_BM25_MATCH");
      expect(codes).toContain("HIGH_CONFIDENCE_SOURCE");
      expect(codes).toContain("RECENT_UPDATE");

      // Verify non-empty descriptive text for each explanation
      for (const exp of explanations) {
        expect(exp.description.length).toBeGreaterThan(5);
        expect(exp.weight).toBeGreaterThan(0);
      }
    });

    it("ranks candidates in strictly deterministic order", () => {
      const r1: AgriculturalSearchResult = {
        resultId: "r1",
        documentId: "doc-1",
        sourceType: "PRODUCT",
        sourceEntityId: "p1",
        title: "Maize Grade A",
        sanitizedSnippet: "High grade maize",
        score: 0.9,
        rankingReasons: [],
        matchedConcepts: [],
        matchedCommodities: ["Maize"],
        geographicScope: "NATIONAL",
        locationState: null,
        locationLga: null,
        sourceProvenance: "OBSERVED",
        confidence: "HIGH",
        validityStatus: "ACTIVE",
        validFrom: "2026-02-01T00:00:00Z",
        validUntil: null,
        metadata: {},
      };

      const r2: AgriculturalSearchResult = {
        ...r1,
        resultId: "r2",
        documentId: "doc-2",
        score: 0.75,
        title: "Maize Grade B",
      };

      const r3: AgriculturalSearchResult = {
        ...r1,
        resultId: "r3",
        documentId: "doc-3",
        score: 0.9,
        title: "Maize Seed Stock",
        validFrom: "2026-03-01T00:00:00Z", // Newer validFrom breaks tie
      };

      const ranked = rankSearchResults([r2, r1, r3]);
      expect(ranked[0].documentId).toBe("doc-3");
      expect(ranked[1].documentId).toBe("doc-1");
      expect(ranked[2].documentId).toBe("doc-2");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. ONTOLOGY EXPANSION & GRAPH INTEGRATION (Tests 5, 16-18)
  // ---------------------------------------------------------------------------
  describe("Knowledge Graph & Ontology Expansion", () => {
    it("expands query tokens through related active concepts", async () => {
      // Seed knowledge concepts
      const maizeConcept: KnowledgeConcept = {
        id: "c-maize-01",
        conceptKey: "crop.cereal.maize",
        canonicalName: "Zea mays",
        displayName: "Maize",
        conceptType: "COMMODITY",
        description: "Key cereal crop grown across Middle Belt and Northern Nigeria.",
        parentConceptId: null,
        status: "VERIFIED",
        provenance: "EDITORIAL",
        confidence: "HIGH",
        geographicScope: "NATIONAL",
        sourceReference: null,
        metadata: {},
        validFrom: "2026-01-01T00:00:00Z",
        validUntil: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };
      await saveKnowledgeConcept(maizeConcept);

      const expanded = await expandQueryOntology(["maize"]);
      expect(expanded.length).toBeGreaterThan(0);
      expect(expanded[0].conceptId).toBe("c-maize-01");
      expect(expanded[0].conceptKey).toBe("crop.cereal.maize");
    });

    it("respects max expansion depth and node ceilings (<= 50)", async () => {
      // Test expansion boundedness
      const expanded = await expandQueryOntology(["unknown_term_xyz"], 2);
      expect(expanded.length).toBeLessThanOrEqual(50);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. STRUCTURED & TEMPORAL FILTERS (Tests 6, 14-15)
  // ---------------------------------------------------------------------------
  describe("Structured Filtering & Temporal Boundaries", () => {
    const pastDate = "2025-01-01T00:00:00Z";
    const expireDate = "2025-12-31T23:59:59Z";
    const futureDate = "2027-01-01T00:00:00Z";
    const nowRef = new Date("2026-06-01T00:00:00Z");

    const currentDoc: AgriculturalSearchDocument = {
      id: "doc-curr",
      documentKey: "doc:curr",
      sourceType: "MARKET_CONTEXT",
      sourceEntityId: "mc-1",
      title: "Current Market Report",
      searchableText: "Active market conditions for Oyo state cassava.",
      normalizedText: "active market conditions for oyo state cassava.",
      conceptIds: [],
      commodityTerms: ["Cassava"],
      geographicScope: "STATE",
      locationState: "Oyo",
      locationLga: "Ibadan",
      sourceProvenance: "OBSERVED",
      confidence: "HIGH",
      visibilityStatus: "PUBLIC",
      publicationStatus: "PUBLISHED",
      validFrom: pastDate,
      validUntil: futureDate,
      language: "en",
      metadata: {},
      createdAt: pastDate,
      updatedAt: pastDate,
    };

    const historicalDoc: AgriculturalSearchDocument = {
      ...currentDoc,
      id: "doc-hist",
      documentKey: "doc:hist",
      title: "Historical 2025 Market Report",
      validFrom: pastDate,
      validUntil: expireDate, // Expired before nowRef
    };

    it("separates current active documents from expired historical memory", () => {
      expect(matchesTemporalValidity(currentDoc, "CURRENT", nowRef)).toBe(true);
      expect(matchesTemporalValidity(historicalDoc, "CURRENT", nowRef)).toBe(false);

      expect(matchesTemporalValidity(historicalDoc, "HISTORICAL", nowRef)).toBe(true);
      expect(matchesTemporalValidity(currentDoc, "HISTORICAL", nowRef)).toBe(false);

      expect(matchesTemporalValidity(currentDoc, "ALL", nowRef)).toBe(true);
      expect(matchesTemporalValidity(historicalDoc, "ALL", nowRef)).toBe(true);
    });

    it("applies structured state and commodity filters deterministically", () => {
      const docs = [currentDoc, historicalDoc];
      const resState = applyStructuredFilters(docs, { state: "Oyo" }, nowRef);
      expect(resState.matchedDocuments.length).toBe(1); // Only currentDoc matches CURRENT temporal mode
      expect(resState.matchedDocuments[0].id).toBe("doc-curr");

      const resMismatchState = applyStructuredFilters(docs, { state: "Kano" }, nowRef);
      expect(resMismatchState.matchedDocuments.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. INDEXING IDEMPOTENCY & RE-INDEXING (Tests 25-26, 35-36)
  // ---------------------------------------------------------------------------
  describe("Indexing Pipeline & Idempotency", () => {
    it("is idempotent: re-indexing the same documentKey updates rather than duplicates", async () => {
      const input = {
        documentKey: "doc:idempotent:1",
        sourceType: "KNOWLEDGE_CONTENT" as const,
        sourceEntityId: "entity-idem-1",
        title: "Soybean Inoculation Techniques",
        searchableText: "Rhizobium inoculation best practices for high-yield soybean production in Benue.",
        commodityTerms: ["Soybean"],
        locationState: "Benue",
        visibilityStatus: "PUBLIC" as const,
        publicationStatus: "PUBLISHED" as const,
      };

      const doc1 = await indexSearchDocument(input);
      expect(doc1.documentKey).toBe("doc:idempotent:1");

      const doc2 = await indexSearchDocument({
        ...input,
        title: "Updated Soybean Inoculation Techniques",
      });

      expect(doc2.id).toBe(doc1.id);
      expect(doc2.title).toBe("Updated Soybean Inoculation Techniques");

      const allDocs = getInMemorySearchDocuments();
      expect(allDocs.filter((d) => d.documentKey === "doc:idempotent:1").length).toBe(1);
    });

    it("updates document visibility and publication status cleanly", async () => {
      const doc = await indexSearchDocument({
        documentKey: "doc:visibility:1",
        sourceType: "PRODUCT" as const,
        sourceEntityId: "prod-vis-1",
        title: "Private Seed Consignment",
        searchableText: "Restricted seed stock",
        visibilityStatus: "PUBLIC" as const,
      });

      const updated = await updateSearchVisibility(doc.id, "RESTRICTED", "ARCHIVED");
      expect(updated).not.toBeNull();
      expect(updated?.visibilityStatus).toBe("RESTRICTED");
      expect(updated?.publicationStatus).toBe("ARCHIVED");
    });
  });

  // ---------------------------------------------------------------------------
  // 9. GOVERNANCE & SERVER ACTIONS (Tests 27-28)
  // ---------------------------------------------------------------------------
  describe("Governance Policy Enforcement", () => {
    it("denies indexing when governance policy returns DENY", async () => {
      vi.spyOn(authServer, "getCurrentUser").mockResolvedValue({
        id: "user-123",
        email: "user@agromarket.ng",
        roles: ["FARMER"],
      } as AuthUser);

      vi.spyOn(governancePolicyEngine, "evaluateGovernancePolicy").mockReturnValue({
        id: "gov-deny-1",
        recommendationId: null,
        scenarioId: null,
        agentId: "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
        domain: "AGRICULTURAL_COORDINATION",
        actionIntent: "EXECUTE_COORDINATED_FULFILMENT",
        actorRole: "FARMER",
        riskLevel: "CRITICAL",
        autonomyLevel: "PROHIBITED",
        decision: "DENY",
        requiredReviewLevel: "PLATFORM_REVIEW",
        reasons: ["Policy restriction: Unauthorized indexing mutation."],
        policyVersion: "3.8.0",
        isProhibitedAction: true,
        evidenceCount: 0,
        confidenceScore: 0.95,
        contextMetadata: {},
        evaluatedAt: new Date().toISOString(),
      });

      const result = await indexKnowledgeDocumentAction({
        documentKey: "doc:gov:test",
        sourceType: "KNOWLEDGE_CONTENT",
        sourceEntityId: "e-gov",
        title: "Gov Test Title",
        searchableText: "Gov test body",
        visibilityStatus: "PUBLIC",
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("GOVERNANCE_DENIED");
      expect(result.error).toMatch(/Governance Denied/i);
    });

    it("allows indexing when governance policy returns ALLOW and user is authenticated", async () => {
      vi.spyOn(authServer, "getCurrentUser").mockResolvedValue({
        id: "admin-456",
        email: "admin@agromarket.ng",
        roles: ["ADMIN"],
      } as AuthUser);

      vi.spyOn(governancePolicyEngine, "evaluateGovernancePolicy").mockReturnValue({
        id: "gov-allow-1",
        recommendationId: null,
        scenarioId: null,
        agentId: "AGRICULTURAL_INTELLIGENCE_ORCHESTRATOR",
        domain: "AGRICULTURAL_COORDINATION",
        actionIntent: "EXECUTE_COORDINATED_FULFILMENT",
        actorRole: "ADMIN",
        riskLevel: "LOW",
        autonomyLevel: "RECOMMEND",
        decision: "ALLOW",
        requiredReviewLevel: "NO_REVIEW_REQUIRED",
        reasons: ["Admin authorization granted."],
        policyVersion: "3.8.0",
        isProhibitedAction: false,
        evidenceCount: 1,
        confidenceScore: 0.95,
        contextMetadata: {},
        evaluatedAt: new Date().toISOString(),
      });

      const result = await indexKnowledgeDocumentAction({
        documentKey: "doc:gov:allow",
        sourceType: "KNOWLEDGE_CONTENT",
        sourceEntityId: "e-allow",
        title: "Authorized Rice Processing Manual",
        searchableText: "Comprehensive rice parboiling protocol for Kebbi state mills.",
        visibilityStatus: "PUBLIC",
      });

      expect(result.success).toBe(true);
      expect(result.data?.documentKey).toBe("doc:gov:allow");
    });
  });

  // ---------------------------------------------------------------------------
  // 10. ACTION INTEGRATION & ROUTE ALLOWLISTING (Tests 29-30)
  // ---------------------------------------------------------------------------
  describe("Action Route Whitelisting", () => {
    it("validates that /semantic-search is a registered valid AgroMarket action route", () => {
      expect(isValidActionRoute("/semantic-search")).toBe(true);
      expect(isValidActionRoute("/semantic-search?q=maize")).toBe(true);
    });

    it("rejects unauthorized or arbitrary URLs", () => {
      expect(isValidActionRoute("https://external-site.com/search")).toBe(false);
      expect(isValidActionRoute("/unauthorized-arbitrary-route")).toBe(false);
      expect(isValidActionRoute("javascript:alert(1)")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. INTELLIGENCE RETRIEVAL PACKAGES (Tests 12-13, 31-32)
  // ---------------------------------------------------------------------------
  describe("Intelligence Retrieval Packages", () => {
    beforeEach(async () => {
      await indexSearchDocument({
        documentKey: "doc:disease:1",
        sourceType: "DISEASE_BIOSECURITY_CONTEXT",
        sourceEntityId: "dis-01",
        title: "Fall Armyworm Prevention in Maize",
        searchableText: "Early scouting and pheromone trap deployment for fall armyworm in Kaduna and Plateau.",
        commodityTerms: ["Maize"],
        locationState: "Kaduna",
        confidence: "HIGH",
        sourceProvenance: "EDITORIAL",
      });

      await indexSearchDocument({
        documentKey: "doc:proc:1",
        sourceType: "PROCESSING_CONTEXT",
        sourceEntityId: "proc-01",
        title: "Cassava Starch Extraction Protocol",
        searchableText: "Flash drying standards and wet milling process for cassava roots in Ogun state.",
        commodityTerms: ["Cassava"],
        locationState: "Ogun",
        confidence: "HIGH",
        sourceProvenance: "OBSERVED",
      });
    });

    it("retrieves disease biosecurity context with preserved provenance and confidence", async () => {
      const pkg = await retrieveDiseaseContext("Fall Armyworm");
      expect(pkg.domain).toBe("DISEASE_BIOSECURITY");
      expect(pkg.evidenceFound).toBe(true);
      expect(pkg.confidenceSummary.high).toBeGreaterThan(0);
      expect(pkg.provenanceBreakdown.EDITORIAL).toBeGreaterThan(0);
      expect(pkg.results[0].title).toContain("Fall Armyworm");
      expect(pkg.advisoryLimitations).toMatch(/Advisory decision support/i);
    });

    it("retrieves processing context with evidence breakdown", async () => {
      const pkg = await retrieveProcessingContext("Cassava");
      expect(pkg.domain).toBe("PROCESSING");
      expect(pkg.evidenceFound).toBe(true);
      expect(pkg.results[0].title).toContain("Cassava Starch");
    });

    it("handles zero results honestly with empty evidenceFound flag", async () => {
      const pkg = await retrieveCommodityContext("NonExistentCrop123");
      expect(pkg.evidenceFound).toBe(false);
      expect(pkg.results.length).toBe(0);
      expect(pkg.confidenceSummary.high).toBe(0);
    });

    it("provides accurate index health metrics", async () => {
      const metrics = await getSearchIndexMetrics();
      expect(metrics.totalDocuments).toBeGreaterThanOrEqual(2);
      expect(metrics.activeEmbeddingProvider).toBe("NONE");
      expect(metrics.providerAvailable).toBe(false);
    });

    it("retrieves food security and logistics context packages", async () => {
      await indexSearchDocument({
        documentKey: "doc:foodsec:1",
        sourceType: "FOOD_SECURITY_CONTEXT",
        sourceEntityId: "fs-1",
        title: "Grain Reserve Balance",
        searchableText: "Strategic grain reserves in Kano and Borno states.",
        locationState: "Kano",
      });

      await indexSearchDocument({
        documentKey: "doc:logistics:1",
        sourceType: "LOGISTICS_CONTEXT",
        sourceEntityId: "log-1",
        title: "Lagos-Ibadan Freight Corridor",
        searchableText: "Transit security and cold storage availability along the expressway.",
        locationState: "Lagos",
      });

      const fsPkg = await retrieveFoodSecurityContext("Grain Reserve");
      expect(fsPkg.domain).toBe("FOOD_SECURITY");
      expect(fsPkg.evidenceFound).toBe(true);

      const logPkg = await retrieveLogisticsContext("Freight Corridor");
      expect(logPkg.domain).toBe("LOGISTICS");
      expect(logPkg.evidenceFound).toBe(true);

      const regPkg = await retrieveRegionalContext("Lagos");
      expect(regPkg.domain).toBe("REGIONAL");
      expect(regPkg.evidenceFound).toBe(true);
    });

    it("retrieves production and market context packages", async () => {
      await indexSearchDocument({
        documentKey: "doc:prod:1",
        sourceType: "PRODUCTION_CONTEXT",
        sourceEntityId: "p-ctx-1",
        title: "Drip Irrigation Agronomy",
        searchableText: "Water use efficiency protocols for dry season tomato in Kano.",
        commodityTerms: ["Tomato"],
      });

      const prodPkg = await retrieveProductionContext("Drip Irrigation");
      expect(prodPkg.domain).toBe("PRODUCTION");
      expect(prodPkg.evidenceFound).toBe(true);

      const mktPkg = await retrieveMarketContext("Tomato");
      expect(mktPkg.domain).toBe("MARKET");
    });
  });

  // ---------------------------------------------------------------------------
  // 12. DOCUMENT BUILDERS & CONCURRENT INDEXING SAFETY (Tests 4, 40)
  // ---------------------------------------------------------------------------
  describe("Document Builders & Concurrency Safety", () => {
    it("builds canonical search document from concept", () => {
      const concept: KnowledgeConcept = {
        id: "c-yam-01",
        conceptKey: "crop.tuber.yam",
        canonicalName: "Dioscorea rotundata",
        displayName: "White Yam",
        conceptType: "COMMODITY",
        description: "Staple tuber crop grown across Benue, Taraba, and Niger states.",
        parentConceptId: null,
        status: "VERIFIED",
        provenance: "EDITORIAL",
        confidence: "HIGH",
        geographicScope: "NATIONAL",
        sourceReference: "NRCRI Umudike",
        metadata: {},
        validFrom: "2026-01-01T00:00:00Z",
        validUntil: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      const doc = buildSearchDocumentFromConcept(concept);
      expect(doc.documentKey).toBe("doc:knowledge-concept:c-yam-01");
      expect(doc.title).toBe("White Yam");
      expect(doc.commodityTerms).toContain("Dioscorea rotundata");
    });

    it("builds canonical search document from context helper", () => {
      const doc = buildSearchDocumentFromContext({
        sourceType: "AGRICULTURAL_PRACTICE",
        sourceEntityId: "practice-01",
        title: "Zero-Tillage Soil Conservation",
        body: "Minimizing soil disturbance to improve moisture retention in savannas.",
        commodityTerms: ["Maize", "Cowpea"],
        state: "Kaduna",
      });

      expect(doc.documentKey).toBe("doc:agricultural-practice:practice-01");
      expect(doc.locationState).toBe("Kaduna");
      expect(doc.geographicScope).toBe("STATE");
    });

    it("handles concurrent document indexing safely without state corruption", async () => {
      const inputs = [1, 2, 3, 4, 5].map((i) => ({
        documentKey: `doc:concurrent:${i}`,
        sourceType: "KNOWLEDGE_CONTENT" as const,
        sourceEntityId: `ent-conc-${i}`,
        title: `Concurrent Document Title ${i}`,
        searchableText: `Searchable body text for concurrent worker ${i}.`,
      }));

      const results = await Promise.all(inputs.map((inp) => indexSearchDocument(inp)));
      expect(results.length).toBe(5);

      const all = getInMemorySearchDocuments();
      for (let i = 1; i <= 5; i++) {
        expect(all.some((d) => d.documentKey === `doc:concurrent:${i}`)).toBe(true);
      }
    });
  });
});
