/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search Intelligence Query Layer
 * Exposes reusable retrieval pipelines for UI and autonomous agricultural intelligence systems.
 *
 * SAFETY INVARIANTS:
 * - Advisory-only: Hand off evidence and context to existing intelligence agents without autonomous actions.
 * - Non-causal: Returns associations, confidence, and provenance; never claims causal certainty.
 * - Zero-tolerance Anti-Pork: Every input is strictly validated before querying.
 */

import { executeAgriculturalSearch } from "./retrieval";
import {
  AgriculturalSearchResponse,
  StructuredSearchFilters,
  SearchSourceType,
  SearchVisibilityStatus,
} from "./types";
import { assertNoProhibitedProduceSearch } from "./validation";
import { getInMemorySearchDocuments } from "./indexing";
import { createClient } from "@/lib/supabase/server";

export interface IntelligenceContextPackage {
  domain: string;
  query: string;
  evidenceFound: boolean;
  results: AgriculturalSearchResponse["results"];
  expandedConcepts: AgriculturalSearchResponse["expandedConcepts"];
  provenanceBreakdown: Record<string, number>;
  confidenceSummary: {
    high: number;
    medium: number;
    low: number;
  };
  retrievalMode: string;
  advisoryLimitations: string;
}

function buildIntelligencePackage(
  domain: string,
  searchResponse: AgriculturalSearchResponse
): IntelligenceContextPackage {
  const provenanceBreakdown: Record<string, number> = {};
  const confidenceSummary = { high: 0, medium: 0, low: 0 };

  for (const r of searchResponse.results) {
    provenanceBreakdown[r.sourceProvenance] = (provenanceBreakdown[r.sourceProvenance] || 0) + 1;
    if (r.confidence === "HIGH") confidenceSummary.high++;
    else if (r.confidence === "MODERATE") confidenceSummary.medium++;
    else confidenceSummary.low++;
  }

  return {
    domain,
    query: searchResponse.query,
    evidenceFound: searchResponse.results.length > 0,
    results: searchResponse.results,
    expandedConcepts: searchResponse.expandedConcepts,
    provenanceBreakdown,
    confidenceSummary,
    retrievalMode: searchResponse.retrievalMode,
    advisoryLimitations:
      "Context retrieved for advisory decision support. Operational transactions require explicit user confirmation.",
  };
}

/**
 * Universal agricultural knowledge search query.
 */
export async function searchAgriculturalKnowledge(
  query: string,
  filters: StructuredSearchFilters = {}
): Promise<AgriculturalSearchResponse> {
  assertNoProhibitedProduceSearch(query, "Knowledge Search Query");
  return executeAgriculturalSearch(query, filters);
}

/**
 * Retrieves context for a specific agricultural commodity.
 */
export async function retrieveCommodityContext(
  commodity: string,
  state?: string
): Promise<IntelligenceContextPackage> {
  assertNoProhibitedProduceSearch(commodity, "Commodity Context Query");
  const response = await executeAgriculturalSearch(commodity, {
    commodity,
    state,
    sourceTypes: ["KNOWLEDGE_CONTENT", "KNOWLEDGE_CONCEPT", "PRODUCT"],
  });
  return buildIntelligencePackage("COMMODITY", response);
}

/**
 * Retrieves production and agronomic intelligence context.
 */
export async function retrieveProductionContext(
  topic: string,
  state?: string
): Promise<IntelligenceContextPackage> {
  assertNoProhibitedProduceSearch(topic, "Production Context Query");
  const response = await executeAgriculturalSearch(topic, {
    state,
    sourceTypes: ["PRODUCTION_CONTEXT", "AGRICULTURAL_PRACTICE", "KNOWLEDGE_CONTENT"],
  });
  return buildIntelligencePackage("PRODUCTION", response);
}

/**
 * Retrieves market intelligence context.
 */
export async function retrieveMarketContext(
  marketOrCommodity: string,
  state?: string
): Promise<IntelligenceContextPackage> {
  assertNoProhibitedProduceSearch(marketOrCommodity, "Market Context Query");
  const response = await executeAgriculturalSearch(marketOrCommodity, {
    state,
    sourceTypes: ["MARKET_CONTEXT", "PRODUCT", "CATEGORY"],
  });
  return buildIntelligencePackage("MARKET", response);
}

/**
 * Retrieves disease, pest, and biosecurity risk context.
 */
export async function retrieveDiseaseContext(
  diseaseOrBiosecurityTopic: string
): Promise<IntelligenceContextPackage> {
  assertNoProhibitedProduceSearch(diseaseOrBiosecurityTopic, "Disease Context Query");
  const response = await executeAgriculturalSearch(diseaseOrBiosecurityTopic, {
    sourceTypes: ["DISEASE_BIOSECURITY_CONTEXT", "KNOWLEDGE_CONCEPT", "KNOWLEDGE_CONTENT"],
  });
  return buildIntelligencePackage("DISEASE_BIOSECURITY", response);
}

/**
 * Retrieves food security intelligence context.
 */
export async function retrieveFoodSecurityContext(
  topic: string,
  state?: string
): Promise<IntelligenceContextPackage> {
  assertNoProhibitedProduceSearch(topic, "Food Security Context Query");
  const response = await executeAgriculturalSearch(topic, {
    state,
    sourceTypes: ["FOOD_SECURITY_CONTEXT", "MARKET_CONTEXT"],
  });
  return buildIntelligencePackage("FOOD_SECURITY", response);
}

/**
 * Retrieves logistics, transport, and freight corridor context.
 */
export async function retrieveLogisticsContext(
  corridorOrTopic: string
): Promise<IntelligenceContextPackage> {
  assertNoProhibitedProduceSearch(corridorOrTopic, "Logistics Context Query");
  const response = await executeAgriculturalSearch(corridorOrTopic, {
    sourceTypes: ["LOGISTICS_CONTEXT", "AGRICULTURAL_PRACTICE"],
  });
  return buildIntelligencePackage("LOGISTICS", response);
}

/**
 * Retrieves processing, value addition, and milling context.
 */
export async function retrieveProcessingContext(
  cropOrOutput: string
): Promise<IntelligenceContextPackage> {
  assertNoProhibitedProduceSearch(cropOrOutput, "Processing Context Query");
  const response = await executeAgriculturalSearch(cropOrOutput, {
    sourceTypes: ["PROCESSING_CONTEXT", "AGRICULTURAL_PRACTICE", "KNOWLEDGE_CONTENT"],
  });
  return buildIntelligencePackage("PROCESSING", response);
}

/**
 * Retrieves regional context by state and LGA.
 */
export async function retrieveRegionalContext(
  state: string,
  lga?: string
): Promise<IntelligenceContextPackage> {
  assertNoProhibitedProduceSearch(state, "Regional State Query");
  const response = await executeAgriculturalSearch(`${state} ${lga || ""}`.trim(), {
    state,
    lga,
  });
  return buildIntelligencePackage("REGIONAL", response);
}

/**
 * Returns summary counts and health metrics of the search index.
 */
export async function getSearchIndexMetrics(): Promise<{
  totalDocuments: number;
  bySourceType: Record<SearchSourceType, number>;
  byVisibility: Record<SearchVisibilityStatus, number>;
  activeEmbeddingProvider: string;
  providerAvailable: boolean;
}> {
  const inMemory = getInMemorySearchDocuments();
  let totalDocuments = inMemory.length;
  const bySourceType: Record<string, number> = {};
  const byVisibility: Record<string, number> = {};

  for (const doc of inMemory) {
    bySourceType[doc.sourceType] = (bySourceType[doc.sourceType] || 0) + 1;
    byVisibility[doc.visibilityStatus] = (byVisibility[doc.visibilityStatus] || 0) + 1;
  }

  // Attempt database count if available
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("agricultural_search_documents")
      .select("*", { count: "exact", head: true });
    if (!error && count !== null && count > totalDocuments) {
      totalDocuments = count;
    }
  } catch {
    // In-memory count is used
  }

  return {
    totalDocuments,
    bySourceType: bySourceType as Record<SearchSourceType, number>,
    byVisibility: byVisibility as Record<SearchVisibilityStatus, number>,
    activeEmbeddingProvider: "NONE",
    providerAvailable: false,
  };
}
