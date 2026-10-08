/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search Constants & Configuration
 */

// -----------------------------------------------------------------------------
// 1. LIMITS & BOUNDS
// -----------------------------------------------------------------------------

export const DEFAULT_SEARCH_LIMIT = 20;
export const MAX_SEARCH_LIMIT = 50;
export const MIN_SEARCH_LIMIT = 1;

export const DEFAULT_MAX_EXPANSION_DEPTH = 2;
export const MAX_EXPANDED_CONCEPTS = 50;

export const MAX_QUERY_LENGTH = 300;
export const MIN_QUERY_LENGTH = 1;

// -----------------------------------------------------------------------------
// 2. ADVISORY NOTICES & DISCLAIMERS
// -----------------------------------------------------------------------------

export const SEARCH_ADVISORY_DISCLAIMER =
  "Agricultural search results are retrieved informational projections. " +
  "They do not constitute live price guarantees, binding inventory commitments, veterinary certification, " +
  "or autonomous procurement. Operational commitments require verification with authoritative platform records.";

export const NO_PROVIDER_NOTICE =
  "Semantic embedding vector provider is not configured in this environment. " +
  "Search is operating in deterministic lexical and ontology-expanded matching mode.";

export const NO_RESULTS_MESSAGE =
  "No sufficiently relevant agricultural knowledge or intelligence records were found matching your search criteria.";

export const INSUFFICIENT_EVIDENCE_MESSAGE =
  "Available evidence is insufficient to support a reliable answer for this query.";

// -----------------------------------------------------------------------------
// 3. RANKING WEIGHTS (DETERMINISTIC & EXPLAINABLE)
// -----------------------------------------------------------------------------

export const RANKING_WEIGHTS = {
  EXACT_TITLE: 0.35,
  EXACT_COMMODITY: 0.25,
  ONTOLOGY_EXPANSION: 0.20,
  LEXICAL_BODY: 0.15,
  STATE_MATCH: 0.15,
  LGA_MATCH: 0.10,
  HIGH_CONFIDENCE: 0.10,
  RECENT_UPDATE: 0.05,
} as const;
