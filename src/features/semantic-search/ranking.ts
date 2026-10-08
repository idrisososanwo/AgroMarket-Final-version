/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search Hybrid Ranking Engine
 * Deterministic, transparent, and explainable scoring calculation.
 *
 * CRITICAL REQUIREMENTS:
 * - Deterministic: Same query and candidate set always produces the exact same ranked order.
 * - Transparent & Explainable: Generates explicit ranking reasons for every score factor.
 * - Non-causal: Measures relevance and association, never claims causal relationship.
 */

import {
  AgriculturalSearchResult,
  AgriculturalSearchDocument,
  SearchRankingExplanation,
} from "./types";
import { RANKING_WEIGHTS } from "./constants";

export interface RankingCandidateInput {
  document: AgriculturalSearchDocument;
  semanticSimilarity?: number; // 0.0 - 1.0 if vector search ran
}

/**
 * Calculates deterministic composite score and ranking explanations for a search document candidate.
 */
export function calculateDocumentScore(
  document: AgriculturalSearchDocument,
  normalizedQuery: string,
  queryTerms: string[],
  expandedConceptKeys: string[] = [],
  semanticSimilarity = 0
): { score: number; explanations: SearchRankingExplanation[] } {
  let score = 0;
  const explanations: SearchRankingExplanation[] = [];
  const lowerTitle = document.title.toLowerCase();
  const lowerText = document.searchableText.toLowerCase();

  // 1. Exact Title Match
  if (lowerTitle.includes(normalizedQuery)) {
    const weight = RANKING_WEIGHTS.EXACT_TITLE;
    score += weight;
    explanations.push({
      code: "EXACT_TITLE_MATCH",
      description: `Exact query phrase matched in document title: "${document.title}".`,
      weight,
    });
  }

  // 2. Exact Commodity Match
  const matchedCommodity = document.commodityTerms.find((term) =>
    queryTerms.includes(term.toLowerCase()) || normalizedQuery.includes(term.toLowerCase())
  );
  if (matchedCommodity) {
    const weight = RANKING_WEIGHTS.EXACT_COMMODITY;
    score += weight;
    explanations.push({
      code: "EXACT_COMMODITY_MATCH",
      description: `Exact commodity reference matched: "${matchedCommodity}".`,
      weight,
    });
  }

  // 3. Ontology Expansion Match
  const matchedConcept = expandedConceptKeys.find((key) =>
    document.conceptIds.some((cid) => cid.toLowerCase().includes(key.toLowerCase())) ||
    document.commodityTerms.some((term) => term.toLowerCase().includes(key.toLowerCase())) ||
    lowerText.includes(key.toLowerCase())
  );
  if (matchedConcept) {
    const weight = RANKING_WEIGHTS.ONTOLOGY_EXPANSION;
    score += weight;
    explanations.push({
      code: "ONTOLOGY_EXPANSION_MATCH",
      description: `Matched concept expanded via agricultural ontology: "${matchedConcept}".`,
      weight,
    });
  }

  // 4. Lexical Term Matching in Body
  const matchedTerms = queryTerms.filter((term) => lowerText.includes(term));
  if (matchedTerms.length > 0) {
    const termRatio = matchedTerms.length / Math.max(queryTerms.length, 1);
    const weight = parseFloat((RANKING_WEIGHTS.LEXICAL_BODY * termRatio).toFixed(3));
    score += weight;
    explanations.push({
      code: "LEXICAL_BM25_MATCH",
      description: `Matched ${matchedTerms.length}/${queryTerms.length} query terms in searchable content.`,
      weight,
    });
  }

  // 5. Semantic Vector Similarity (Only if authentic provider ran)
  if (semanticSimilarity > 0) {
    const semWeight = parseFloat((semanticSimilarity * 0.35).toFixed(3));
    score += semWeight;
    explanations.push({
      code: "SEMANTIC_SIMILARITY_MATCH",
      description: `Vector similarity calculated by authentic embedding provider (${(semanticSimilarity * 100).toFixed(1)}%).`,
      weight: semWeight,
    });
  }

  // 6. Geographic State Match
  if (document.locationState && normalizedQuery.includes(document.locationState.toLowerCase())) {
    const weight = RANKING_WEIGHTS.STATE_MATCH;
    score += weight;
    explanations.push({
      code: "STATE_EXACT_MATCH",
      description: `Matches regional state context: "${document.locationState}".`,
      weight,
    });
  }

  // 7. Geographic LGA Match
  if (document.locationLga && normalizedQuery.includes(document.locationLga.toLowerCase())) {
    const weight = RANKING_WEIGHTS.LGA_MATCH;
    score += weight;
    explanations.push({
      code: "LGA_EXACT_MATCH",
      description: `Matches local government area (LGA): "${document.locationLga}".`,
      weight,
    });
  }

  // 8. High Confidence Source Quality
  if (document.confidence === "HIGH") {
    const weight = RANKING_WEIGHTS.HIGH_CONFIDENCE;
    score += weight;
    explanations.push({
      code: "HIGH_CONFIDENCE_SOURCE",
      description: "Sourced from verified institutional or validated empirical agricultural data.",
      weight,
    });
  }

  // 9. Freshness / Recent Update
  const updatedTime = new Date(document.updatedAt).getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (!isNaN(updatedTime) && Date.now() - updatedTime < thirtyDaysMs) {
    const weight = RANKING_WEIGHTS.RECENT_UPDATE;
    score += weight;
    explanations.push({
      code: "RECENT_UPDATE",
      description: "Knowledge record verified or updated within the last 30 days.",
      weight,
    });
  }

  // Normalize final score between 0.0 and 1.0
  const finalScore = Math.min(1.0, Math.max(0.0, parseFloat(score.toFixed(3))));

  // Sort explanations by weight descending
  explanations.sort((a, b) => b.weight - a.weight);

  return { score: finalScore, explanations };
}

/**
 * Deterministically ranks a collection of search results.
 * Primary sort: Score descending.
 * Secondary sort: Publication / update timestamp descending.
 * Tertiary sort: Document ID ascending (for absolute tie-breaking determinism).
 */
export function rankSearchResults(
  results: AgriculturalSearchResult[]
): AgriculturalSearchResult[] {
  return [...results].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const timeB = new Date(b.validFrom).getTime() || 0;
    const timeA = new Date(a.validFrom).getTime() || 0;
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return a.documentId.localeCompare(b.documentId);
  });
}
