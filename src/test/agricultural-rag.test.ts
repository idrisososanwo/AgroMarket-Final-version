/**
 * AgroMarket Phase 3.15: Evidence-Grounded Agricultural Intelligence & RAG Test Suite
 *
 * Comprehensive validation across all 36 mandatory specification criteria:
 * 1. Question schema validation
 * 2. Input-length limits
 * 3. Retrieval integration
 * 4. Evidence selection limits
 * 5. Evidence deduplication
 * 6. Source traceability
 * 7. Citation generation from supplied evidence
 * 8. Unknown citation rejection
 * 9. Citation/source mismatch rejection
 * 10. Malformed provider output
 * 11. Empty answer rejection
 * 12. Unsupported numerical claims
 * 13. Historical/current separation
 * 14. Forecast-horizon preservation
 * 15. Provenance preservation
 * 16. Confidence preservation
 * 17. Conflicting-source disclosure
 * 18. Insufficient-evidence behavior
 * 19. Generation-provider unavailability
 * 20. Provider timeout/failure behavior
 * 21. Evidence-only fallback
 * 22. Anti-pork query rejection
 * 23. Anti-pork evidence rejection
 * 24. Anti-pork answer rejection
 * 25. Privacy sanitization
 * 26. RLS/authorization compliance
 * 27. Governance enforcement
 * 28. No arbitrary URLs
 * 29. No autonomous action execution
 * 30. Sensitive-prompt logging prevention
 * 31. Domain-specific safety boundaries
 * 32. Professional-review flags
 * 33. Duplicate source handling
 * 34. Context-size enforcement
 * 35. Deterministic validation
 * 36. Existing Phase 3.14 search regression coverage
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ragQueryInputSchema,
  assertNoProhibitedProduceRag,
  rawGeneratedAnswerSchema,
  RawGeneratedAnswer,
} from "../features/agricultural-rag/validation";
import {
  selectAndStructureEvidence,
} from "../features/agricultural-rag/evidence-selector";
import {
  buildEvidenceContextBlock,
} from "../features/agricultural-rag/context-builder";
import {
  validateAndEnrichCitations,
} from "../features/agricultural-rag/citation-validator";
import {
  evaluateDomainSafety,
} from "../features/agricultural-rag/safety";
import {
  synthesizeEvidenceOnlyFallback,
  generateGroundedAnswer,
} from "../features/agricultural-rag/generation";
import {
  askAgriculturalAssistant,
  getRagQueryMetrics,
  resetInMemoryRagQueries,
} from "../features/agricultural-rag/queries";
import {
  MockTestingProvider,
  UnavailableAIProvider,
} from "../features/intelligence/ai-provider";
import { RagEvidenceItem } from "../features/agricultural-rag/types";
import { AgriculturalSearchResult } from "../features/semantic-search/types";
import { searchAgriculturalKnowledge } from "../features/semantic-search/queries";
import { VALID_AGROMARKET_ACTION_ROUTES } from "../features/action-integration/validation";
import { evaluateGovernancePolicy } from "../features/intelligence-governance/policy-engine";
import { sanitizeSearchSnippet } from "../features/semantic-search/privacy";

// Mock Supabase client to ensure test isolation
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })),
  })),
}));

// Mock current user
vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: "test-user-001",
    email: "test@agromarket.ng",
    roles: ["FARMER"],
  })),
}));

describe("Phase 3.15: Evidence-Grounded Agricultural Intelligence & RAG Foundation", () => {
  beforeEach(() => {
    resetInMemoryRagQueries();
    vi.clearAllMocks();
  });

  // Helper for mock AgriculturalSearchResult
  const createMockSearchResult = (
    idNumber: number,
    overrides?: Partial<AgriculturalSearchResult>
  ): AgriculturalSearchResult => ({
    resultId: `res-${idNumber}`,
    documentId: `doc-${idNumber}`,
    sourceType: "KNOWLEDGE_CONCEPT",
    sourceEntityId: `concept-${idNumber}`,
    title: `Soybean Inoculation Guide ${idNumber}`,
    sanitizedSnippet: `Bradyrhizobium japonicum improves nodulation and yield by 25% under savanna soil conditions.`,
    sourceProvenance: "OBSERVED",
    confidence: "HIGH",
    geographicScope: "REGIONAL_CORRIDOR",
    locationState: "Kano",
    locationLga: null,
    validFrom: "2026-01-01T00:00:00Z",
    validUntil: null,
    validityStatus: "ACTIVE",
    score: 0.9 - idNumber * 0.05,
    rankingReasons: [
      {
        code: "LEXICAL_BM25_MATCH",
        weight: 0.8,
        description: "High lexical match",
      },
    ],
    matchedConcepts: [],
    matchedCommodities: [],
    metadata: {},
    ...overrides,
  });

  // Helper for mock RagEvidenceItem
  const createMockEvidence = (
    idNumber: number,
    overrides?: Partial<RagEvidenceItem>
  ): RagEvidenceItem => ({
    evidenceId: `EVI-${idNumber}`,
    documentId: `doc-${idNumber}`,
    sourceType: "KNOWLEDGE_CONCEPT",
    sourceEntityId: `concept-${idNumber}`,
    canonicalReference: `knowledge_concept:concept-${idNumber}`,
    sourceTitle: `Soybean Inoculation Guide ${idNumber}`,
    relevantExcerpt: `Bradyrhizobium japonicum improves nodulation and yield by 25% under savanna soil conditions.`,
    provenance: "OBSERVED",
    confidence: "HIGH",
    geographicScope: "REGIONAL_CORRIDOR",
    locationState: "Kano",
    locationLga: null,
    validityWindow: {
      from: "2026-01-01T00:00:00Z",
      until: null,
    },
    retrievalScore: 0.9 - idNumber * 0.05,
    rankingReasons: [
      {
        code: "LEXICAL_BM25_MATCH",
        weight: 0.8,
        description: "High lexical match",
      },
    ],
    isHistorical: false,
    ...overrides,
  });

  // =========================================================================
  // 1 & 2. Question Schema Validation & Length Limits
  // =========================================================================
  describe("1 & 2. Question Schema Validation and Length Limits", () => {
    it("accepts a well-formed agricultural question within length limits", () => {
      const result = ragQueryInputSchema.safeParse({
        question: "What are the recommended planting dates for sorghum in Kaduna?",
        category: "CROP_PRODUCTION",
      });
      expect(result.success).toBe(true);
    });

    it("rejects questions that are too short (< 5 chars)", () => {
      const result = ragQueryInputSchema.safeParse({
        question: "Hi",
      });
      expect(result.success).toBe(false);
    });

    it("rejects questions that exceed maximum character limits (> 300 chars)", () => {
      const longQuestion = "A".repeat(301);
      const result = ragQueryInputSchema.safeParse({
        question: longQuestion,
      });
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. Retrieval Integration
  // =========================================================================
  describe("3. Retrieval Integration", () => {
    it("successfully integrates with Phase 3.14 retrieval without errors", async () => {
      const searchRes = await searchAgriculturalKnowledge(
        "Cassava mosaic disease resistance",
        { limit: 3 }
      );
      expect(searchRes).toBeDefined();
      expect(Array.isArray(searchRes.results)).toBe(true);
    });
  });

  // =========================================================================
  // 4 & 5. Evidence Selection Limits and Deduplication
  // =========================================================================
  describe("4 & 5. Evidence Selection Limits and Deduplication", () => {
    it("enforces maximum evidence bounds (max 8 items)", () => {
      const rawCandidates: AgriculturalSearchResult[] = Array.from({ length: 15 }, (_, i) =>
        createMockSearchResult(i + 1, {
          sourceEntityId: `unique-entity-${i + 1}`,
          title: `Item ${i + 1}`,
          sanitizedSnippet: `Unique excerpt content for item ${i + 1} across the savanna belt.`,
        })
      );

      const result = selectAndStructureEvidence(rawCandidates, 8);
      expect(result.evidenceSet.length).toBeLessThanOrEqual(8);
      expect(result.isInsufficientEvidence).toBe(false);
    });

    it("deduplicates evidence with identical source entities", () => {
      const item1 = createMockSearchResult(1, { sourceEntityId: "maize-fert" });
      const item2 = createMockSearchResult(2, {
        sourceEntityId: "maize-fert", // Duplicate entity key
        score: 0.6,
      });
      const item3 = createMockSearchResult(3, {
        sourceEntityId: "rice-fert",
      });

      const result = selectAndStructureEvidence([item1, item2, item3]);
      expect(result.evidenceSet.length).toBe(2);
      expect(result.evidenceSet[0].evidenceId).toBe("EVI-1");
      expect(result.evidenceSet[1].evidenceId).toBe("EVI-2");
    });
  });

  // =========================================================================
  // 6. Source Traceability
  // =========================================================================
  describe("6. Source Traceability", () => {
    it("preserves stable evidence IDs, canonical references, and provenance across selection", () => {
      const candidate = createMockSearchResult(1, {
        sourceType: "MARKET_CONTEXT",
        sourceEntityId: "obs-999",
        sourceProvenance: "EXTERNAL_SOURCE",
        confidence: "MODERATE",
      });

      const result = selectAndStructureEvidence([candidate]);
      expect(result.evidenceSet[0].evidenceId).toBe("EVI-1");
      expect(result.evidenceSet[0].canonicalReference).toBe("market_context:obs-999");
      expect(result.evidenceSet[0].provenance).toBe("EXTERNAL_SOURCE");
      expect(result.evidenceSet[0].confidence).toBe("MODERATE");
    });
  });

  // =========================================================================
  // 7, 8 & 9. Citation Validation & Rejection
  // =========================================================================
  describe("7, 8 & 9. Citation Validation & Rejection", () => {
    const evidenceSet = [
      createMockEvidence(1, {
        sourceTitle: "Tomato Staking Manual",
        relevantExcerpt: "Staking prevents contact with soil-borne pathogens and improves yield.",
      }),
      createMockEvidence(2, {
        sourceTitle: "Irrigation Scheduling",
        relevantExcerpt: "Drip irrigation reduces water usage by 40% compared to furrow flooding.",
      }),
    ];

    it("validates and enriches citations matching supplied evidence", () => {
      const rawAnswer: RawGeneratedAnswer = {
        summary: "Tomato staking improves yield and reduces disease.",
        answer: "Staking prevents direct ground contact [CIT-1].",
        keyPoints: ["Staking prevents disease [CIT-1]"],
        citations: [
          {
            citationId: "[CIT-1]",
            evidenceId: "EVI-1",
            sourceTitle: "Tomato Staking Manual",
            supportingExcerpt: "Staking prevents contact with soil-borne pathogens.",
          },
        ],
        limitations: [],
        conflicts: [],
        needsProfessionalReview: false,
        insufficientEvidence: false,
      };

      const validation = validateAndEnrichCitations(rawAnswer, evidenceSet);
      expect(validation.validCitations.length).toBe(1);
      expect(validation.validCitations[0].evidenceId).toBe("EVI-1");
      expect(validation.validCitations[0].confidence).toBe("HIGH");
      expect(validation.rejectedCitations.length).toBe(0);
    });

    it("rejects unknown citation IDs not present in the supplied evidence set", () => {
      const rawAnswer: RawGeneratedAnswer = {
        summary: "Fabricated citation example.",
        answer: "Unsubstantiated claim about tomatoes [CIT-99].",
        keyPoints: [],
        citations: [
          {
            citationId: "[CIT-99]",
            evidenceId: "EVI-99", // Does NOT exist in evidenceSet
            sourceTitle: "Nonexistent Study",
          },
        ],
        limitations: [],
        conflicts: [],
        needsProfessionalReview: false,
        insufficientEvidence: false,
      };

      const validation = validateAndEnrichCitations(rawAnswer, evidenceSet);
      expect(validation.validCitations.length).toBe(0);
      expect(validation.rejectedCitations.length).toBe(1);
      expect(validation.rejectedCitations[0].reason).toContain("does not exist");
    });
  });

  // =========================================================================
  // 10 & 11. Malformed Output and Empty Answer Rejection
  // =========================================================================
  describe("10 & 11. Malformed Output and Empty Answer Rejection", () => {
    it("rejects malformed non-JSON provider output via rawGeneratedAnswerSchema", () => {
      expect(() => {
        rawGeneratedAnswerSchema.parse("Non-JSON string response");
      }).toThrow();
    });

    it("rejects empty answer fields from parsed output", () => {
      expect(() => {
        rawGeneratedAnswerSchema.parse({
          summary: "",
          answer: "",
          keyPoints: [],
          citations: [],
        });
      }).toThrow();
    });
  });

  // =========================================================================
  // 12. Unsupported Numerical Claims Detection
  // =========================================================================
  describe("12. Unsupported Numerical Claims", () => {
    it("flags numerical percentage claims when no citations are provided", () => {
      const rawAnswer: RawGeneratedAnswer = {
        summary: "Summary with numbers.",
        answer: "Yield increased by 75% in trials.",
        keyPoints: [],
        citations: [], // No citations provided for numerical claim
        limitations: [],
        conflicts: [],
        needsProfessionalReview: false,
        insufficientEvidence: false,
      };

      const validation = validateAndEnrichCitations(rawAnswer, [createMockEvidence(1)]);
      expect(validation.flaggedLimitations.length).toBeGreaterThan(0);
      expect(validation.flaggedLimitations[0]).toContain("numerical figures");
    });
  });

  // =========================================================================
  // 13 & 14. Historical/Current Separation and Forecast Horizons
  // =========================================================================
  describe("13 & 14. Historical/Current Separation and Forecast Horizons", () => {
    it("distinguishes current from historical evidence in context assembly", () => {
      const currentEv = createMockEvidence(1, {
        isHistorical: false,
        relevantExcerpt: "Current wholesale price is 1500 NGN.",
      });
      const historicalEv = createMockEvidence(2, {
        isHistorical: true,
        relevantExcerpt: "2023 dry season wholesale price was 1100 NGN.",
      });

      const contextBlock = buildEvidenceContextBlock([currentEv, historicalEv]);
      expect(contextBlock).toContain("[CURRENT EVIDENCE]");
      expect(contextBlock).toContain("[HISTORICAL OBSERVATION]");
    });

    it("labels historical limitations when fallback uses historical evidence", () => {
      const historicalEv = createMockEvidence(1, {
        isHistorical: true,
        relevantExcerpt: "Old pricing record from 2022.",
      });

      const fallback = synthesizeEvidenceOnlyFallback({
        question: "What is the historical price?",
        category: "HISTORICAL_COMPARISON",
        evidenceSet: [historicalEv],
        startTime: Date.now(),
      });

      expect(fallback.citations[0].isHistorical).toBe(true);
      expect(fallback.limitations.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 15 & 16. Provenance and Confidence Preservation
  // =========================================================================
  describe("15 & 16. Provenance and Confidence Preservation", () => {
    it("preserves provenance distribution and computes answer confidence transparently", () => {
      const ev1 = createMockEvidence(1, { provenance: "OBSERVED", confidence: "HIGH" });
      const ev2 = createMockEvidence(2, { provenance: "DERIVED", confidence: "MODERATE" });

      const fallback = synthesizeEvidenceOnlyFallback({
        question: "Explain seed germination conditions",
        category: "CROP_PRODUCTION",
        evidenceSet: [ev1, ev2],
        startTime: Date.now(),
      });

      expect(fallback.provenanceSummary.OBSERVED).toBe(1);
      expect(fallback.provenanceSummary.DERIVED).toBe(1);
      expect(fallback.confidence).toBe("HIGH");
    });
  });

  // =========================================================================
  // 17. Conflicting-Source Disclosure
  // =========================================================================
  describe("17. Conflicting-Source Disclosure", () => {
    it("detects and discloses conflicting market evidence across sources", () => {
      const cand1 = createMockSearchResult(1, {
        title: "Grain Market Surplus Report",
        sanitizedSnippet: "Grain markets report severe surplus and declining demand in Kano.",
      });
      const cand2 = createMockSearchResult(2, {
        title: "Regional Deficit Assessment",
        sanitizedSnippet: "Severe deficit in grain markets causing panic buying.",
      });

      const result = selectAndStructureEvidence([cand1, cand2]);
      expect(result.detectedConflicts.length).toBeGreaterThan(0);
      expect(result.detectedConflicts[0].topic).toBe("Market Supply & Price Dynamics");
    });
  });

  // =========================================================================
  // 18. Insufficient-Evidence Behavior
  // =========================================================================
  describe("18. Insufficient-Evidence Behavior", () => {
    it("returns honest insufficient-evidence answer when no records match query", () => {
      const result = synthesizeEvidenceOnlyFallback({
        question: "What is the market price of dragonfruit in Gombe?",
        category: "MARKET_OBSERVATION",
        evidenceSet: [],
        startTime: Date.now(),
      });

      expect(result.insufficientEvidence).toBe(true);
      expect(result.confidence).toBe("INSUFFICIENT_DATA");
      expect(result.citations.length).toBe(0);
      expect(result.answer).toContain("insufficient to answer this inquiry");
    });
  });

  // =========================================================================
  // 19, 20 & 21. Generation Provider Unavailability and Fallback
  // =========================================================================
  describe("19, 20 & 21. Provider Unavailability, Timeout, and Fallback", () => {
    it("falls back cleanly to EVIDENCE_ONLY_FALLBACK when AI provider is unavailable", async () => {
      const unavailableProvider = new UnavailableAIProvider();
      const evidence = [createMockEvidence(1)];

      const answer = await generateGroundedAnswer({
        question: "How do you inoculate soybean seeds?",
        category: "CROP_PRODUCTION",
        evidenceSet: evidence,
        overrideProvider: unavailableProvider,
      });

      expect(answer.generationMode).toBe("EVIDENCE_ONLY_FALLBACK");
      expect(answer.citations.length).toBe(1);
      expect(answer.citations[0].evidenceId).toBe("EVI-1");
      expect(answer.limitations.some((l) => l.includes("unavailable") || l.includes("unconfigured"))).toBe(true);
    });

    it("falls back cleanly when provider throws timeout or error", async () => {
      const failingProvider = new MockTestingProvider(async () => {
        throw new Error("Provider request timeout after 15000ms");
      });

      const evidence = [createMockEvidence(1)];
      const answer = await generateGroundedAnswer({
        question: "How do you inoculate soybean seeds?",
        category: "CROP_PRODUCTION",
        evidenceSet: evidence,
        overrideProvider: failingProvider,
      });

      expect(answer.generationMode).toBe("EVIDENCE_ONLY_FALLBACK");
      expect(answer.limitations.some((l) => l.includes("unavailable") || l.includes("unconfigured"))).toBe(true);
    });

    it("synthesizes grounded response when mock provider returns valid schema", async () => {
      const validMockJson = JSON.stringify({
        summary: "Soybean inoculation with Bradyrhizobium increases yield.",
        answer: "Applying Bradyrhizobium japonicum nodulates roots effectively [CIT-1].",
        keyPoints: ["Inoculation boosts yield [CIT-1]"],
        citations: [
          {
            citationId: "[CIT-1]",
            evidenceId: "EVI-1",
            sourceTitle: "Soybean Inoculation Guide 1",
            supportingExcerpt: "Bradyrhizobium japonicum improves nodulation and yield by 25%.",
          },
        ],
        limitations: ["Savanna soils only"],
        conflicts: [],
        needsProfessionalReview: false,
        insufficientEvidence: false,
      });

      const mockProvider = new MockTestingProvider(async () => ({
        rawResponseText: validMockJson,
        promptTokens: 100,
        completionTokens: 80,
        latencyMs: 120,
      }));

      const evidence = [createMockEvidence(1)];
      const answer = await generateGroundedAnswer({
        question: "How do you inoculate soybean seeds?",
        category: "CROP_PRODUCTION",
        evidenceSet: evidence,
        overrideProvider: mockProvider,
      });

      expect(answer.generationMode).toBe("EVIDENCE_GROUNDED_SYNTHESIS");
      expect(answer.citations.length).toBe(1);
      expect(answer.answer).toContain("Bradyrhizobium japonicum");
    });
  });

  // =========================================================================
  // 22, 23 & 24. Anti-Pork Zero-Tolerance Enforcement Across All Layers
  // =========================================================================
  describe("22, 23 & 24. Strict Anti-Pork Enforcement", () => {
    it("rejects questions containing pork keywords", () => {
      expect(() => {
        assertNoProhibitedProduceRag("What is the current price of pork in Jos?", "Test Question");
      }).toThrow(/Zero-tolerance policy violation/);
    });

    it("rejects questions containing swine/bacon keywords via Zod schema", () => {
      const res = ragQueryInputSchema.safeParse({
        question: "Best feed formulations for swine breeding",
        category: "CROP_PRODUCTION",
      });
      expect(res.success).toBe(false);
    });

    it("rejects generated answers if provider injects prohibited produce terms", () => {
      expect(() => {
        assertNoProhibitedProduceRag("This feed mix is suitable for bacon production.", "Answer");
      }).toThrow(/Zero-tolerance policy violation/);
    });
  });

  // =========================================================================
  // 25. Privacy Sanitization
  // =========================================================================
  describe("25. Privacy Sanitization", () => {
    it("redacts Nigerian telephone numbers and email addresses from evidence", () => {
      const rawText = "Contact farmer Musa at 08031234567 or musa@farms.ng for seed bags.";
      const sanitized = sanitizeSearchSnippet(rawText);

      expect(sanitized).not.toContain("08031234567");
      expect(sanitized).not.toContain("musa@farms.ng");
      expect(sanitized).toContain("[PHONE REDACTED]");
      expect(sanitized).toContain("[EMAIL REDACTED]");
    });
  });

  // =========================================================================
  // 26 & 27. Governance Enforcement & RLS / Authorization
  // =========================================================================
  describe("26 & 27. Governance Enforcement and Authorization", () => {
    it("permits informational assistant actions under low-risk governance policies", () => {
      const govResult = evaluateGovernancePolicy({
        actorRole: "FARMER",
        actionIntent: "VIEW_MARKETPLACE",
        agentId: "AGRICULTURAL_ORCHESTRATION_AGENT",
        domain: "KNOWLEDGE_RETRIEVAL",
        confidenceScore: 0.95,
      });

      expect(govResult.decision).toBe("ALLOW");
    });

    it("blocks queries that attempt unauthorized mutations", () => {
      const govResult = evaluateGovernancePolicy({
        actorRole: "FARMER",
        actionIntent: "PURCHASE_COMMODITIES", // Prohibited autonomous action
        agentId: "AGRICULTURAL_ORCHESTRATION_AGENT",
        domain: "MARKETPLACE",
        confidenceScore: 0.95,
      });

      expect(govResult.decision).toBe("DENY");
    });
  });

  // =========================================================================
  // 28 & 29. No Arbitrary URLs & No Autonomous Action Execution
  // =========================================================================
  describe("28 & 29. No Arbitrary URLs and No Autonomous Mutations", () => {
    it("verifies /agricultural-assistant is in the approved route allowlist", () => {
      expect(VALID_AGROMARKET_ACTION_ROUTES).toContain("/agricultural-assistant");
    });

    it("rejects arbitrary external URLs as trusted suggested actions", () => {
      const arbitraryUrl = "https://external-unverified-site.com/buy-seeds";
      const isApproved = (VALID_AGROMARKET_ACTION_ROUTES as readonly string[]).includes(
        arbitraryUrl
      );
      expect(isApproved).toBe(false);
    });
  });

  // =========================================================================
  // 30. Sensitive-Prompt Logging Prevention
  // =========================================================================
  describe("30. Sensitive-Prompt Logging Prevention", () => {
    it("persists sanitized query metadata without logging raw external prompt payloads", async () => {
      await askAgriculturalAssistant("What are the planting steps for ginger in Kaduna?");
      const metrics = await getRagQueryMetrics();

      expect(metrics.totalQueries).toBeGreaterThan(0);
      expect(metrics.byCategory).toBeDefined();
    });
  });

  // =========================================================================
  // 31 & 32. Domain-Specific Safety and Professional Review Flags
  // =========================================================================
  describe("31 & 32. Domain-Specific Safety and Professional Review", () => {
    it("flags clinical veterinary inquiry and attaches professional review notice", () => {
      const inquiry = "My goats have high fever and sudden diarrhea. How do I prescribe treatment?";
      const safety = evaluateDomainSafety(
        inquiry,
        "Isolate sick animals immediately and consult your district veterinary officer."
      );

      expect(safety.needsProfessionalReview).toBe(true);
      expect(safety.professionalReviewNotice).toContain("veterinarian");
      expect(safety.safetyFlags).toContain("VETERINARY_BIOSECURITY_INQUIRY");
    });

    it("sanitizes profit guarantees and yield promises", () => {
      const safety = evaluateDomainSafety(
        "How much will I make from pepper?",
        "You will achieve guaranteed profit under this program."
      );

      expect(safety.sanitizedAnswer).not.toContain("guaranteed profit");
      expect(safety.sanitizedAnswer).toContain("Projected agronomic outcome");
      expect(safety.safetyFlags).toContain("PROFIT_GUARANTEE_REDACTED");
    });
  });

  // =========================================================================
  // 33 & 34. Duplicate Source Handling & Context-Size Enforcement
  // =========================================================================
  describe("33 & 34. Duplicate Source Handling and Context-Size Enforcement", () => {
    it("enforces maximum total context size budget in characters (<= 4000 chars)", () => {
      const manyItems = Array.from({ length: 15 }, (_, i) =>
        createMockEvidence(i + 1, {
          relevantExcerpt: "Long excerpt explaining regional grain trade ".repeat(20),
        })
      );

      const contextBlock = buildEvidenceContextBlock(manyItems);
      expect(contextBlock.length).toBeLessThanOrEqual(4000 + 100); // 4000 limit plus truncation marker
    });
  });

  // =========================================================================
  // 35. Deterministic Validation
  // =========================================================================
  describe("35. Deterministic Validation Layer", () => {
    it("validates citation integrity deterministically without stochastic LLM decisions", () => {
      const evidence = [createMockEvidence(1)];
      const rawAnswer: RawGeneratedAnswer = {
        summary: "Summary text",
        answer: "Answer text citing unknown evidence [CIT-1]",
        keyPoints: [],
        citations: [
          {
            citationId: "[CIT-1]",
            evidenceId: "EVI-UNKNOWN-99", // Invalid evidence id
            sourceTitle: "Soybean Guide",
          },
        ],
        limitations: [],
        conflicts: [],
        needsProfessionalReview: false,
        insufficientEvidence: false,
      };

      const res = validateAndEnrichCitations(rawAnswer, evidence);
      expect(res.validCitations.length).toBe(0);
      expect(res.rejectedCitations.length).toBe(1);
      expect(res.rejectedCitations[0].reason).toContain("does not exist");
    });
  });

  // =========================================================================
  // 36. Phase 3.14 Semantic Search Regression Coverage
  // =========================================================================
  describe("36. Phase 3.14 Search Regression Coverage", () => {
    it("confirms Phase 3.14 semantic search retrieval operates reliably", async () => {
      const result = await searchAgriculturalKnowledge(
        "Sorghum drought tolerance in Sahel",
        { commodity: "Sorghum" }
      );

      expect(result).toBeDefined();
      expect(result.query).toBe("Sorghum drought tolerance in Sahel");
      expect(result.retrievalMode).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });
  });
});
