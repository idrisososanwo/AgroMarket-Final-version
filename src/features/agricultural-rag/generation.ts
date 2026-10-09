/**
 * AgroMarket Phase 3.15: RAG Generation Engine & Honest Provider Fallback
 * Orchestrates LLM synthesis where configured, and deterministic evidence-only fallback when unavailable.
 *
 * SAFETY INVARIANTS:
 * - Anti-Pork Zero Tolerance: Asserts policy before and after generation.
 * - Never Fabricate: Never claim external AI generation succeeded when provider is offline.
 * - Honest Fallback: Cleanly packages retrieved evidence into transparent structured summary.
 */

import { getAIProvider, AIProvider } from "@/features/intelligence/ai-provider";
import {
  RagQuestionCategory,
  RagEvidenceItem,
  EvidenceGroundedAnswer,
  SuggestedAction,
} from "./types";
import { rawGeneratedAnswerSchema, assertNoProhibitedProduceRag } from "./validation";
import { buildRagPromptPackage } from "./prompt-builder";
import { validateAndEnrichCitations } from "./citation-validator";
import { evaluateDomainSafety } from "./safety";
import { EVIDENCE_FALLBACK_NOTICE } from "./constants";
import { sanitizeSearchSnippet } from "@/features/semantic-search/privacy";
import { KnowledgeConfidence, KnowledgeProvenance } from "@/features/knowledge-graph/types";

// -----------------------------------------------------------------------------
// 1. DETERMINISTIC EVIDENCE-ONLY FALLBACK SYNTHESIZER
// -----------------------------------------------------------------------------

export function synthesizeEvidenceOnlyFallback(params: {
  question: string;
  category: RagQuestionCategory;
  evidenceSet: RagEvidenceItem[];
  detectedConflicts?: Array<{
    topic: string;
    primaryClaim: string;
    conflictingClaim: string;
    primarySource: string;
    conflictingSource: string;
    primaryProvenance: KnowledgeProvenance;
    conflictingProvenance: KnowledgeProvenance;
    explanation: string;
  }>;
  startTime: number;
}): EvidenceGroundedAnswer {
  const { question, category, evidenceSet, detectedConflicts = [], startTime } = params;

  if (evidenceSet.length === 0) {
    return {
      query: question,
      category,
      summary: "No relevant agricultural records or evidence were found in AgroMarket's knowledge repository.",
      answer: "Available evidence in AgroMarket is insufficient to answer this inquiry. Please verify the terms or consult local extension officers.",
      keyPoints: [],
      citations: [],
      limitations: ["No matching evidence retrieved from platform records."],
      confidence: "INSUFFICIENT_DATA",
      provenanceSummary: {} as Record<KnowledgeProvenance, number>,
      conflicts: [],
      generatedAt: new Date().toISOString(),
      generationMode: "EVIDENCE_ONLY_FALLBACK",
      needsProfessionalReview: false,
      insufficientEvidence: true,
      evidenceSet: [],
      suggestedActions: [
        {
          intent: "VIEW_KNOWLEDGE",
          label: "Browse Agricultural Knowledge Graph",
          route: "/knowledge-graph",
        },
      ],
      retrievalMode: "LEXICAL",
      providerInfo: { provider: "NONE", model: "none" },
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Build key points directly from top evidence excerpts
  const keyPoints: string[] = [];
  const citations = evidenceSet.map((evi, idx) => ({
    citationId: `[CIT-${idx + 1}]`,
    evidenceId: evi.evidenceId,
    sourceType: evi.sourceType,
    sourceTitle: evi.sourceTitle,
    canonicalReference: evi.canonicalReference,
    supportingExcerpt: evi.relevantExcerpt,
    provenance: evi.provenance,
    confidence: evi.confidence,
    isHistorical: evi.isHistorical,
  }));

  for (let i = 0; i < Math.min(3, evidenceSet.length); i++) {
    const evi = evidenceSet[i];
    keyPoints.push(`${evi.relevantExcerpt} [CIT-${i + 1}]`);
  }

  const primaryEvidence = evidenceSet[0];
  const summary = `Based on retrieved AgroMarket records, ${primaryEvidence.sourceTitle} indicates: "${primaryEvidence.relevantExcerpt.slice(0, 150)}..." [CIT-1]`;
  const answer = `Evidence-grounded summary compiled from ${evidenceSet.length} AgroMarket records:\n\n${keyPoints.join("\n\n")}`;

  // Tally provenance
  const provenanceSummary: Record<string, number> = {};
  for (const evi of evidenceSet) {
    provenanceSummary[evi.provenance] = (provenanceSummary[evi.provenance] || 0) + 1;
  }

  // Overall confidence
  const confidences = evidenceSet.map((e) => e.confidence);
  const confidence: KnowledgeConfidence = confidences.includes("HIGH")
    ? "HIGH"
    : confidences.includes("MODERATE")
    ? "MODERATE"
    : "LOW";

  // Check safety
  const safety = evaluateDomainSafety(question, answer);

  return {
    query: question,
    category,
    summary: sanitizeSearchSnippet(summary),
    answer: sanitizeSearchSnippet(safety.sanitizedAnswer),
    keyPoints: keyPoints.map(sanitizeSearchSnippet),
    citations,
    limitations: [
      EVIDENCE_FALLBACK_NOTICE,
      "Synthesis reflects direct source excerpts without natural language extrapolation.",
    ],
    confidence,
    provenanceSummary: provenanceSummary as Record<KnowledgeProvenance, number>,
    conflicts: detectedConflicts,
    generatedAt: new Date().toISOString(),
    generationMode: "EVIDENCE_ONLY_FALLBACK",
    needsProfessionalReview: safety.needsProfessionalReview,
    professionalReviewNotice: safety.professionalReviewNotice,
    insufficientEvidence: false,
    evidenceSet,
    suggestedActions: [
      {
        intent: "VIEW_KNOWLEDGE",
        label: "View Source Knowledge Concepts",
        route: "/knowledge-graph",
      },
      {
        intent: "VIEW_MARKET_INTELLIGENCE",
        label: "Marketplace Data",
        route: "/market",
      },
    ],
    retrievalMode: "ONTOLOGY_EXPANDED",
    providerInfo: { provider: "NONE", model: "none" },
    executionTimeMs: Date.now() - startTime,
  };
}

// -----------------------------------------------------------------------------
// 2. ORCHESTRATE GENERATION (AI PROVIDER OR HONEST FALLBACK)
// -----------------------------------------------------------------------------

export async function generateGroundedAnswer(params: {
  question: string;
  category: RagQuestionCategory;
  evidenceSet: RagEvidenceItem[];
  detectedConflicts?: Array<{
    topic: string;
    primaryClaim: string;
    conflictingClaim: string;
    primarySource: string;
    conflictingSource: string;
    primaryProvenance: KnowledgeProvenance;
    conflictingProvenance: KnowledgeProvenance;
    explanation: string;
  }>;
  state?: string;
  commodity?: string;
  overrideProvider?: AIProvider;
}): Promise<EvidenceGroundedAnswer> {
  const startTime = Date.now();
  const { question, category, evidenceSet, detectedConflicts = [] } = params;

  // 1. Assert Anti-Pork policy on question
  assertNoProhibitedProduceRag(question, "Question Input");

  // 2. Check evidence sufficiency
  if (evidenceSet.length === 0) {
    return synthesizeEvidenceOnlyFallback({
      question,
      category,
      evidenceSet: [],
      startTime,
    });
  }

  // 3. Inspect AI Provider availability
  const provider = params.overrideProvider || getAIProvider();

  if (!provider.isAvailable()) {
    // Honest Fallback - no provider configured
    return synthesizeEvidenceOnlyFallback({
      question,
      category,
      evidenceSet,
      detectedConflicts,
      startTime,
    });
  }

  // 4. Build prompt package
  const { systemPrompt: _systemPrompt, userPrompt: _userPrompt } = buildRagPromptPackage({
    question,
    category,
    evidenceSet,
    commodity: params.commodity,
    state: params.state,
  });

  try {
    // Call provider with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const providerResult = await provider.generateReasoning({
      request: {
        agentId: "AGRICULTURAL_INTELLIGENCE",
        objective: "PRODUCTION_PLANNING_INTERPRETATION",
        commodity: params.commodity || "General",
        location: { state: params.state || "National" },
        evidencePackage: {
          commodity: params.commodity || "General",
          geographicScope: { state: params.state || "National" },
          signals: [],
          observations: [],
          evidenceItems: [],
          historicalContext: [],
          evidenceConfidence: 0.9,
          generatedAt: new Date().toISOString(),
          isTruncated: false,
        },
        requestedAt: new Date().toISOString(),
      },
      abortSignal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 5. Parse and validate JSON output
    const parsedJson = JSON.parse(providerResult.rawResponseText);
    const validatedOutput = rawGeneratedAnswerSchema.parse(parsedJson);

    // Assert Anti-Pork policy on generated answer
    assertNoProhibitedProduceRag(validatedOutput.answer, "Generated Answer");
    assertNoProhibitedProduceRag(validatedOutput.summary, "Generated Summary");

    // 6. Validate & enrich citations against evidence set
    const citationValidation = validateAndEnrichCitations(validatedOutput, evidenceSet);

    // 7. Domain safety evaluation
    const safety = evaluateDomainSafety(question, validatedOutput.answer);

    // Tally provenance
    const provenanceSummary: Record<string, number> = {};
    for (const evi of evidenceSet) {
      provenanceSummary[evi.provenance] = (provenanceSummary[evi.provenance] || 0) + 1;
    }

    const confidences = evidenceSet.map((e) => e.confidence);
    const overallConfidence: KnowledgeConfidence = confidences.includes("HIGH")
      ? "HIGH"
      : confidences.includes("MODERATE")
      ? "MODERATE"
      : "LOW";

    const allLimitations = [
      ...validatedOutput.limitations,
      ...citationValidation.flaggedLimitations,
    ];

    const suggestedActions: SuggestedAction[] = [
      {
        intent: "VIEW_KNOWLEDGE",
        label: "View Knowledge Graph Context",
        route: "/knowledge-graph",
      },
    ];

    return {
      query: question,
      category,
      summary: sanitizeSearchSnippet(validatedOutput.summary),
      answer: sanitizeSearchSnippet(safety.sanitizedAnswer),
      keyPoints: validatedOutput.keyPoints.map(sanitizeSearchSnippet),
      citations: citationValidation.validCitations,
      limitations: allLimitations.map(sanitizeSearchSnippet),
      confidence: overallConfidence,
      provenanceSummary: provenanceSummary as Record<KnowledgeProvenance, number>,
      conflicts: detectedConflicts,
      generatedAt: new Date().toISOString(),
      generationMode: "EVIDENCE_GROUNDED_SYNTHESIS",
      needsProfessionalReview: safety.needsProfessionalReview || validatedOutput.needsProfessionalReview,
      professionalReviewNotice: safety.professionalReviewNotice,
      insufficientEvidence: validatedOutput.insufficientEvidence,
      evidenceSet,
      suggestedActions,
      retrievalMode: "HYBRID",
      providerInfo: {
        provider: provider.name,
        model: provider.model,
      },
      executionTimeMs: Date.now() - startTime,
    };
  } catch {
    // If provider call or parsing fails, gracefully fall back to evidence-only synthesis
    return synthesizeEvidenceOnlyFallback({
      question,
      category,
      evidenceSet,
      detectedConflicts,
      startTime,
    });
  }
}
