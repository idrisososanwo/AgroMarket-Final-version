/**
 * AgroMarket Phase 3.15: RAG Intelligence Queries
 * High-level query pipelines integrating semantic search, evidence selection, and answer synthesis.
 *
 * SAFETY INVARIANTS:
 * - Read-only query execution: never triggers consequential transactions or actions.
 * - Anti-Pork Zero Tolerance: validates inquiries before retrieval.
 * - Privacy Preserved: sanitizes outputs and hides personal identifiers.
 */

import { executeAgriculturalSearch } from "@/features/semantic-search/retrieval";
import { selectAndStructureEvidence } from "./evidence-selector";
import { generateGroundedAnswer } from "./generation";
import {
  RagQueryOptions,
  EvidenceGroundedAnswer,
  RagQuestionCategory,
  RagGenerationMode,
  RagQueryMetrics,
} from "./types";
import { ragQueryInputSchema, assertNoProhibitedProduceRag } from "./validation";
import { AIProvider } from "@/features/intelligence/ai-provider";
import { createClient } from "@/lib/supabase/server";

// -----------------------------------------------------------------------------
// 1. IN-MEMORY METRICS STORE (FOR TESTING & RESILIENCE)
// -----------------------------------------------------------------------------

const inMemoryQueries: Array<{
  category: RagQuestionCategory;
  generationMode: string;
  hasConflicts: boolean;
  needsProfessionalReview: boolean;
  insufficientEvidence: boolean;
}> = [];

export function resetInMemoryRagQueries(): void {
  inMemoryQueries.length = 0;
}

// -----------------------------------------------------------------------------
// 2. PRIMARY QUESTION PIPELINE
// -----------------------------------------------------------------------------

export async function askAgriculturalAssistant(
  question: string,
  options: RagQueryOptions = {},
  overrideProvider?: AIProvider
): Promise<EvidenceGroundedAnswer> {
  // 1. Validate query schema & anti-pork invariant
  const parsed = ragQueryInputSchema.parse({
    question,
    category: options.category || "GENERAL_AGRONOMIC",
    state: options.state,
    lga: options.lga,
    commodity: options.commodity,
    includeHistorical: options.includeHistorical || false,
    maxEvidenceCount: options.maxEvidenceCount || 8,
  });

  assertNoProhibitedProduceRag(parsed.question, "Agricultural Question");

  // 2. Retrieve candidate records via Phase 3.14 Semantic Search
  const temporalMode = parsed.includeHistorical ? "ALL" : "CURRENT";
  const searchResponse = await executeAgriculturalSearch(parsed.question, {
    state: parsed.state,
    lga: parsed.lga,
    commodity: parsed.commodity,
    temporalMode,
    limit: 10,
  });

  // 3. Select, deduplicate, and structure evidence
  const { evidenceSet, detectedConflicts, isInsufficientEvidence } =
    selectAndStructureEvidence(searchResponse.results, parsed.maxEvidenceCount);

  // 4. Generate evidence-grounded synthesis or honest fallback
  const answer = await generateGroundedAnswer({
    question: parsed.question,
    category: parsed.category,
    evidenceSet,
    detectedConflicts,
    state: parsed.state,
    commodity: parsed.commodity,
    overrideProvider,
  });

  // Attach search response retrieval mode
  answer.retrievalMode = searchResponse.retrievalMode;
  if (isInsufficientEvidence) {
    answer.insufficientEvidence = true;
  }

  // 5. Audit persistence (Non-blocking Supabase write with in-memory fallback)
  inMemoryQueries.push({
    category: answer.category,
    generationMode: answer.generationMode,
    hasConflicts: answer.conflicts.length > 0,
    needsProfessionalReview: answer.needsProfessionalReview,
    insufficientEvidence: answer.insufficientEvidence,
  });

  try {
    const supabase = await createClient();
    await supabase.from("agricultural_rag_queries").insert({
      question_text: parsed.question,
      question_category: parsed.category,
      retrieval_mode: searchResponse.retrievalMode,
      generation_mode: answer.generationMode,
      evidence_count: evidenceSet.length,
      evidence_ids: evidenceSet.map((e) => e.evidenceId),
      provider: answer.providerInfo.provider,
      model: answer.providerInfo.model,
      citation_count: answer.citations.length,
      has_conflicts: answer.conflicts.length > 0,
      needs_professional_review: answer.needsProfessionalReview,
      insufficient_evidence: answer.insufficientEvidence,
      confidence: answer.confidence,
      status: answer.insufficientEvidence ? "INSUFFICIENT_EVIDENCE" : "COMPLETED",
    });
  } catch {
    // In-memory fallback succeeds silently
  }

  return answer;
}

// -----------------------------------------------------------------------------
// 3. DOMAIN-SPECIFIC SPECIALIZED RETRIEVAL QUERIES
// -----------------------------------------------------------------------------

/**
 * Explains a crop production or agronomic practice.
 */
export async function explainCropPractice(
  practiceOrCrop: string,
  state?: string,
  overrideProvider?: AIProvider
): Promise<EvidenceGroundedAnswer> {
  return askAgriculturalAssistant(
    `Explain agronomic practices for ${practiceOrCrop}`,
    { category: "CROP_PRODUCTION", state, commodity: practiceOrCrop },
    overrideProvider
  );
}

/**
 * Summarizes retrieved market observations and price liquidity.
 */
export async function summarizeMarketObservations(
  commodity: string,
  state?: string,
  overrideProvider?: AIProvider
): Promise<EvidenceGroundedAnswer> {
  return askAgriculturalAssistant(
    `Summarize market conditions and observations for ${commodity}`,
    { category: "MARKET_OBSERVATION", state, commodity },
    overrideProvider
  );
}

/**
 * Explains supply-chain dependencies and processing relationships.
 */
export async function explainSupplyChainRelationship(
  conceptOrCommodity: string,
  overrideProvider?: AIProvider
): Promise<EvidenceGroundedAnswer> {
  return askAgriculturalAssistant(
    `Explain supply chain and value chain relationships for ${conceptOrCommodity}`,
    { category: "SUPPLY_CHAIN_RELATIONSHIP", commodity: conceptOrCommodity },
    overrideProvider
  );
}

/**
 * Summarizes published disease, pest, and biosecurity information with veterinary disclaimers.
 */
export async function summarizeDiseaseBiosecurityInfo(
  topic: string,
  overrideProvider?: AIProvider
): Promise<EvidenceGroundedAnswer> {
  return askAgriculturalAssistant(
    `Summarize disease and biosecurity guidelines for ${topic}`,
    { category: "DISEASE_BIOSECURITY" },
    overrideProvider
  );
}

/**
 * Summarizes regional food security indicators and resilience assessments.
 */
export async function summarizeRegionalFoodSecurity(
  state: string,
  overrideProvider?: AIProvider
): Promise<EvidenceGroundedAnswer> {
  return askAgriculturalAssistant(
    `Summarize food security and harvest outlook in ${state}`,
    { category: "REGIONAL_FOOD_SECURITY", state },
    overrideProvider
  );
}

/**
 * Returns summary counts and health metrics for the RAG assistant.
 */
export async function getRagQueryMetrics(): Promise<RagQueryMetrics> {
  const byCategory: Record<string, number> = {};
  const byGenerationMode: Record<string, number> = {};
  let professionalReviewCount = 0;
  let conflictsDetectedCount = 0;
  let insufficientEvidenceCount = 0;

  for (const q of inMemoryQueries) {
    byCategory[q.category] = (byCategory[q.category] || 0) + 1;
    byGenerationMode[q.generationMode] = (byGenerationMode[q.generationMode] || 0) + 1;
    if (q.needsProfessionalReview) professionalReviewCount++;
    if (q.hasConflicts) conflictsDetectedCount++;
    if (q.insufficientEvidence) insufficientEvidenceCount++;
  }

  return {
    totalQueries: inMemoryQueries.length,
    byCategory: byCategory as Record<RagQuestionCategory, number>,
    byGenerationMode: byGenerationMode as Record<RagGenerationMode, number>,
    professionalReviewCount,
    conflictsDetectedCount,
    insufficientEvidenceCount,
  };
}
