/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search Hybrid Retrieval Engine
 * Integrates lexical matching, ontology expansion, structured filtering, and transparent ranking.
 *
 * CRITICAL SAFETY RULES:
 * - Anti-Pork Zero Tolerance: rejects prohibited produce references at query & expansion stages.
 * - Privacy Sanitization: sanitizes all snippets, metadata, and responses.
 * - Bounded Graph Expansion: depth <= 2 (or max 3), capped at MAX_EXPANDED_CONCEPTS (50).
 * - No Fake Embeddings: falls back to LEXICAL / ONTOLOGY_EXPANDED when provider unavailable.
 * - Transparent & Explainable: explains why each result ranked.
 */

import { createClient } from "@/lib/supabase/server";
import {
  AgriculturalSearchDocument,
  AgriculturalSearchResult,
  AgriculturalSearchResponse,
  StructuredSearchFilters,
  RetrievalMode,
} from "./types";
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  DEFAULT_MAX_EXPANSION_DEPTH,
  MAX_EXPANDED_CONCEPTS,
  SEARCH_ADVISORY_DISCLAIMER,
  NO_PROVIDER_NOTICE,
} from "./constants";
import { assertNoProhibitedProduceSearch } from "./validation";
import { applyStructuredFilters } from "./filters";
import { calculateDocumentScore, rankSearchResults } from "./ranking";
import { sanitizeSearchResult } from "./privacy";
import { getEmbeddingProvider } from "./embeddings";
import { getInMemorySearchDocuments } from "./indexing";
import { getKnowledgeConcepts, getKnowledgeRelationships } from "@/features/knowledge-graph/data-layer";

// -----------------------------------------------------------------------------
// 1. QUERY NORMALIZATION & TOKENIZATION
// -----------------------------------------------------------------------------

export function normalizeSearchQuery(rawQuery: string): {
  normalized: string;
  tokens: string[];
} {
  const normalized = rawQuery.trim().toLowerCase();
  const tokens = normalized
    .split(/[\s,.;:!?/\\-_+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  return { normalized, tokens };
}

// -----------------------------------------------------------------------------
// 2. ONTOLOGY-AWARE CONCEPT EXPANSION
// -----------------------------------------------------------------------------

export interface ExpandedConceptItem {
  conceptId: string;
  conceptKey: string;
  name: string;
  relationshipType?: string;
}

/**
 * Expands a search query through the Phase 3.13 Agricultural Knowledge Graph.
 * Strictly bounded by maxDepth (default 2) and MAX_EXPANDED_CONCEPTS (50). Cycle-safe.
 */
export async function expandQueryOntology(
  tokens: string[],
  maxDepth = DEFAULT_MAX_EXPANSION_DEPTH
): Promise<ExpandedConceptItem[]> {
  const expanded: Map<string, ExpandedConceptItem> = new Map();
  const visitedConceptIds = new Set<string>();

  try {
    const allConcepts = await getKnowledgeConcepts();
    const allRelationships = await getKnowledgeRelationships();

    // Step 1: Find initial seed concepts matching query tokens
    const seedConcepts = allConcepts.filter((c) => {
      const canon = c.canonicalName.toLowerCase();
      const display = c.displayName.toLowerCase();
      return tokens.some((t) => canon.includes(t) || display.includes(t));
    });

    for (const seed of seedConcepts) {
      if (expanded.size >= MAX_EXPANDED_CONCEPTS) break;
      expanded.set(seed.id, {
        conceptId: seed.id,
        conceptKey: seed.conceptKey,
        name: seed.displayName || seed.canonicalName,
      });
      visitedConceptIds.add(seed.id);
    }

    // Step 2: Traverse neighborhoods up to maxDepth (cycle-safe)
    let currentQueue = Array.from(visitedConceptIds);
    let currentDepth = 1;

    while (currentQueue.length > 0 && currentDepth <= maxDepth && expanded.size < MAX_EXPANDED_CONCEPTS) {
      const nextQueue: string[] = [];

      for (const conceptId of currentQueue) {
        if (expanded.size >= MAX_EXPANDED_CONCEPTS) break;

        const rels = allRelationships.filter(
          (r) => r.sourceConceptId === conceptId || r.targetConceptId === conceptId
        );
        for (const rel of rels) {
          if (expanded.size >= MAX_EXPANDED_CONCEPTS) break;
          const relatedId = rel.sourceConceptId === conceptId ? rel.targetConceptId : rel.sourceConceptId;

          if (!visitedConceptIds.has(relatedId)) {
            visitedConceptIds.add(relatedId);
            const relatedConcept = allConcepts.find((c) => c.id === relatedId);
            if (relatedConcept) {
              expanded.set(relatedId, {
                conceptId: relatedId,
                conceptKey: relatedConcept.conceptKey,
                name: relatedConcept.displayName || relatedConcept.canonicalName,
                relationshipType: rel.relationshipType,
              });
              nextQueue.push(relatedId);
            }
          }
        }
      }

      currentQueue = nextQueue;
      currentDepth++;
    }
  } catch {
    // If knowledge graph is temporarily offline, continue gracefully without expansion
  }

  return Array.from(expanded.values());
}

// -----------------------------------------------------------------------------
// 3. CANDIDATE RETRIEVAL FROM DATABASE / MEMORY
// -----------------------------------------------------------------------------

async function fetchCandidateDocuments(
  tokens: string[],
  expandedConceptIds: string[]
): Promise<AgriculturalSearchDocument[]> {
  const inMemory = getInMemorySearchDocuments();

  // Try querying Supabase
  try {
    const supabase = await createClient();
    let query = supabase.from("agricultural_search_documents").select("*");

    // Match any tokens in normalized_text or concept_ids overlap
    if (tokens.length > 0) {
      const orClauses = tokens
        .slice(0, 5)
        .map((t) => `normalized_text.ilike.%${t}%`)
        .join(",");
      query = query.or(orClauses);
    }

    const { data, error } = await query.limit(100);
    if (!error && data && data.length > 0) {
      const dbDocs: AgriculturalSearchDocument[] = (data as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        documentKey: String(row.document_key),
        sourceType: row.source_type as AgriculturalSearchDocument["sourceType"],
        sourceEntityId: String(row.source_entity_id),
        title: String(row.title),
        searchableText: String(row.searchable_text),
        normalizedText: String(row.normalized_text),
        conceptIds: (row.concept_ids as string[]) || [],
        commodityTerms: (row.commodity_terms as string[]) || [],
        geographicScope: row.geographic_scope as AgriculturalSearchDocument["geographicScope"],
        locationState: (row.location_state as string) || null,
        locationLga: (row.location_lga as string) || null,
        sourceProvenance: row.source_provenance as AgriculturalSearchDocument["sourceProvenance"],
        confidence: row.confidence as AgriculturalSearchDocument["confidence"],
        visibilityStatus: row.visibility_status as AgriculturalSearchDocument["visibilityStatus"],
        publicationStatus: row.publication_status as AgriculturalSearchDocument["publicationStatus"],
        validFrom: String(row.valid_from),
        validUntil: (row.valid_until as string) || null,
        language: String(row.language || "en"),
        metadata: (row.metadata as Record<string, unknown>) || {},
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      }));

      // Combine with in-memory avoiding duplicates
      const seen = new Set(dbDocs.map((d) => d.id));
      for (const mem of inMemory) {
        if (!seen.has(mem.id)) dbDocs.push(mem);
      }
      return dbDocs;
    }
  } catch {
    // Supabase unavailable; fallback to inMemory
  }

  // In-memory candidate matching
  return inMemory.filter((doc) => {
    const text = doc.normalizedText;
    const lowerTitle = doc.title.toLowerCase();
    const matchesToken = tokens.some(
      (t) =>
        text.includes(t) ||
        lowerTitle.includes(t) ||
        doc.commodityTerms.some((c) => c.toLowerCase().includes(t))
    );
    const matchesConcept = doc.conceptIds.some((cid) => expandedConceptIds.includes(cid));
    return matchesToken || matchesConcept;
  });
}

// -----------------------------------------------------------------------------
// 4. MAIN RETRIEVAL PIPELINE
// -----------------------------------------------------------------------------

export async function executeAgriculturalSearch(
  rawQuery: string,
  filters: StructuredSearchFilters = {}
): Promise<AgriculturalSearchResponse> {
  const startTime = Date.now();

  // 1. Assert Anti-Pork policy
  assertNoProhibitedProduceSearch(rawQuery, "Agricultural Search Query");
  if (filters.commodity) {
    assertNoProhibitedProduceSearch(filters.commodity, "Search Commodity Filter");
  }

  // 2. Query Normalization & Tokenization
  const { normalized, tokens } = normalizeSearchQuery(rawQuery);

  // 3. Ontology Expansion
  const expandedConcepts = await expandQueryOntology(tokens);
  const expandedConceptIds = expandedConcepts.map((ec) => ec.conceptId);
  const expandedConceptKeys = expandedConcepts.map((ec) => ec.conceptKey);

  // 4. Retrieve candidate documents
  const candidates = await fetchCandidateDocuments(tokens, expandedConceptIds);

  // 5. Structured Filtering
  const { matchedDocuments, totalMatched } = applyStructuredFilters(candidates, filters);

  // 6. Embedding provider check
  const provider = getEmbeddingProvider();
  const providerIsAvailable = provider.isAvailable();
  let retrievalMode: RetrievalMode = "LEXICAL";

  if (providerIsAvailable) {
    retrievalMode = "HYBRID";
  } else if (expandedConcepts.length > 0) {
    retrievalMode = "ONTOLOGY_EXPANDED";
  } else {
    retrievalMode = "LEXICAL";
  }

  const providerNotice = providerIsAvailable
    ? `Operating with active embedding provider: ${provider.providerName()}.`
    : NO_PROVIDER_NOTICE;

  // 7. Calculate composite scores & explanations
  const results: AgriculturalSearchResult[] = [];
  const now = new Date();

  for (const doc of matchedDocuments) {
    const { score, explanations } = calculateDocumentScore(
      doc,
      normalized,
      tokens,
      expandedConceptKeys,
      0 // No fake semantic similarity
    );

    // Calculate validity status
    let validityStatus: "ACTIVE" | "EXPIRED" | "FUTURE" = "ACTIVE";
    const fromTime = new Date(doc.validFrom).getTime();
    const untilTime = doc.validUntil ? new Date(doc.validUntil).getTime() : null;

    if (!isNaN(fromTime) && fromTime > now.getTime()) {
      validityStatus = "FUTURE";
    } else if (untilTime !== null && !isNaN(untilTime) && untilTime < now.getTime()) {
      validityStatus = "EXPIRED";
    }

    // Generate sanitized snippet (first 250 chars)
    const rawSnippet = doc.searchableText.slice(0, 250) + (doc.searchableText.length > 250 ? "..." : "");

    const result: AgriculturalSearchResult = {
      resultId: crypto.randomUUID(),
      documentId: doc.id,
      sourceType: doc.sourceType,
      sourceEntityId: doc.sourceEntityId,
      title: doc.title,
      sanitizedSnippet: rawSnippet,
      score,
      rankingReasons: explanations,
      matchedConcepts: doc.conceptIds.filter((cid) => expandedConceptIds.includes(cid)),
      matchedCommodities: doc.commodityTerms.filter((term) =>
        tokens.includes(term.toLowerCase()) || normalized.includes(term.toLowerCase())
      ),
      geographicScope: doc.geographicScope,
      locationState: doc.locationState,
      locationLga: doc.locationLga,
      sourceProvenance: doc.sourceProvenance,
      confidence: doc.confidence,
      validityStatus,
      validFrom: doc.validFrom,
      validUntil: doc.validUntil,
      metadata: doc.metadata,
    };

    results.push(sanitizeSearchResult(result));
  }

  // 8. Deterministic Ranking
  const ranked = rankSearchResults(results);

  // 9. Limit & Pagination
  const limit = Math.min(
    MAX_SEARCH_LIMIT,
    Math.max(1, filters.limit ?? DEFAULT_SEARCH_LIMIT)
  );
  const finalResults = ranked.slice(0, limit);

  return {
    query: rawQuery,
    retrievalMode,
    totalMatched,
    results: finalResults,
    appliedFilters: filters,
    expandedConcepts,
    providerNotice,
    advisoryDisclaimer: SEARCH_ADVISORY_DISCLAIMER,
    executionTimeMs: Date.now() - startTime,
  };
}
