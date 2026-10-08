/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search & Retrieval Foundation
 * Domain Contracts, Types, and Interfaces
 */

import { NigerianState } from "@/features/marketplace/constants";
import { KnowledgeProvenance, KnowledgeConfidence, KnowledgeGeographicScope } from "@/features/knowledge-graph/types";

// -----------------------------------------------------------------------------
// 1. SEARCHABLE SOURCE TAXONOMY
// -----------------------------------------------------------------------------

export const SEARCH_SOURCE_TYPES = [
  "KNOWLEDGE_CONTENT",
  "KNOWLEDGE_CONCEPT",
  "KNOWLEDGE_RELATIONSHIP",
  "PRODUCT",
  "CATEGORY",
  "PRODUCTION_CONTEXT",
  "MARKET_CONTEXT",
  "FOOD_SECURITY_CONTEXT",
  "DISEASE_BIOSECURITY_CONTEXT",
  "LOGISTICS_CONTEXT",
  "PROCESSING_CONTEXT",
  "AGRICULTURAL_PRACTICE",
] as const;

export type SearchSourceType = (typeof SEARCH_SOURCE_TYPES)[number];

// -----------------------------------------------------------------------------
// 2. VISIBILITY & PUBLICATION LIFECYCLE
// -----------------------------------------------------------------------------

export const SEARCH_VISIBILITY_STATUSES = [
  "PUBLIC",
  "AUTHENTICATED",
  "ADMIN_ONLY",
  "RESTRICTED",
] as const;

export type SearchVisibilityStatus = (typeof SEARCH_VISIBILITY_STATUSES)[number];

export const SEARCH_PUBLICATION_STATUSES = [
  "DRAFT",
  "REVIEW",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type SearchPublicationStatus = (typeof SEARCH_PUBLICATION_STATUSES)[number];

export const RETRIEVAL_MODES = [
  "LEXICAL",
  "ONTOLOGY_EXPANDED",
  "HYBRID",
  "SEMANTIC",
] as const;

export type RetrievalMode = (typeof RETRIEVAL_MODES)[number];

export const EMBEDDING_PROVIDER_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "UNAVAILABLE",
] as const;

export type EmbeddingProviderStatus = (typeof EMBEDDING_PROVIDER_STATUSES)[number];

export const TEMPORAL_SEARCH_MODES = [
  "CURRENT",
  "HISTORICAL",
  "ALL",
] as const;

export type TemporalSearchMode = (typeof TEMPORAL_SEARCH_MODES)[number];

// -----------------------------------------------------------------------------
// 3. RANKING REASONS
// -----------------------------------------------------------------------------

export const RANKING_REASON_CODES = [
  "EXACT_TITLE_MATCH",
  "EXACT_COMMODITY_MATCH",
  "ONTOLOGY_EXPANSION_MATCH",
  "LEXICAL_BM25_MATCH",
  "SEMANTIC_SIMILARITY_MATCH",
  "HIGH_CONFIDENCE_SOURCE",
  "RECENT_UPDATE",
  "STATE_EXACT_MATCH",
  "LGA_EXACT_MATCH",
  "CANONICAL_CONCEPT_MATCH",
] as const;

export type RankingReasonCode = (typeof RANKING_REASON_CODES)[number];

export interface SearchRankingExplanation {
  code: RankingReasonCode;
  description: string;
  weight: number;
}

// -----------------------------------------------------------------------------
// 4. CANONICAL SEARCH DOCUMENT
// -----------------------------------------------------------------------------

export interface AgriculturalSearchDocument {
  id: string;
  documentKey: string;
  sourceType: SearchSourceType;
  sourceEntityId: string;
  title: string;
  searchableText: string;
  normalizedText: string;
  conceptIds: string[];
  commodityTerms: string[];
  geographicScope: KnowledgeGeographicScope;
  locationState: NigerianState | string | null;
  locationLga: string | null;
  sourceProvenance: KnowledgeProvenance;
  confidence: KnowledgeConfidence;
  visibilityStatus: SearchVisibilityStatus;
  publicationStatus: SearchPublicationStatus;
  validFrom: string;
  validUntil: string | null;
  language: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgriculturalSearchEmbedding {
  id: string;
  documentId: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingVersion: string;
  dimensions: number;
  embeddingStatus: EmbeddingProviderStatus;
  embeddingError: string | null;
  embeddingVector: number[] | null;
  embeddedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchIndexEvent {
  id: string;
  eventType: "INDEX_CREATED" | "INDEX_UPDATED" | "INDEX_DELETED" | "REINDEX_ALL" | "VISIBILITY_CHANGED";
  documentId: string | null;
  sourceType: SearchSourceType;
  sourceEntityId: string;
  triggeredByUserId: string | null;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  details: Record<string, unknown>;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// 5. SEARCH RESULT & RESPONSE CONTRACTS
// -----------------------------------------------------------------------------

export interface AgriculturalSearchResult {
  resultId: string;
  documentId: string;
  sourceType: SearchSourceType;
  sourceEntityId: string;
  title: string;
  sanitizedSnippet: string;
  score: number;
  rankingReasons: SearchRankingExplanation[];
  matchedConcepts: string[];
  matchedCommodities: string[];
  geographicScope: KnowledgeGeographicScope;
  locationState: NigerianState | string | null;
  locationLga: string | null;
  sourceProvenance: KnowledgeProvenance;
  confidence: KnowledgeConfidence;
  validityStatus: "ACTIVE" | "EXPIRED" | "FUTURE";
  validFrom: string;
  validUntil: string | null;
  metadata: Record<string, unknown>;
}

export interface StructuredSearchFilters {
  sourceTypes?: SearchSourceType[];
  conceptTypes?: string[];
  commodity?: string;
  state?: NigerianState | string;
  lga?: string;
  confidence?: KnowledgeConfidence;
  provenance?: KnowledgeProvenance;
  visibility?: SearchVisibilityStatus;
  publicationStatus?: SearchPublicationStatus;
  temporalMode?: TemporalSearchMode;
  limit?: number;
  offset?: number;
}

export interface AgriculturalSearchResponse {
  query: string;
  retrievalMode: RetrievalMode;
  totalMatched: number;
  results: AgriculturalSearchResult[];
  appliedFilters: StructuredSearchFilters;
  expandedConcepts: Array<{
    conceptId: string;
    conceptKey: string;
    name: string;
    relationshipType?: string;
  }>;
  providerNotice: string;
  advisoryDisclaimer: string;
  executionTimeMs: number;
}

// -----------------------------------------------------------------------------
// 6. EMBEDDING PROVIDER ABSTRACTION
// -----------------------------------------------------------------------------

export interface EmbeddingProvider {
  providerName(): string;
  getDimensions(): number;
  isAvailable(): boolean;
  embedDocument(text: string): Promise<number[] | null>;
  embedQuery(query: string): Promise<number[] | null>;
}
