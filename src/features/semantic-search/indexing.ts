/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search Indexing Pipeline
 * Idempotent, deterministic projection of canonical knowledge and intelligence into search documents.
 *
 * SAFETY INVARIANTS:
 * - Anti-Pork Zero Tolerance: rejects prohibited produce references at all stages.
 * - Privacy Sanitization: sanitizes PII, phone numbers, exact GPS, and private commercial pricing.
 * - Idempotent: Unique on (sourceType, sourceEntityId) and documentKey.
 * - Provenance Preserved: Preserves original source, confidence, and temporal validity.
 */

import { createClient } from "@/lib/supabase/server";
import {
  AgriculturalSearchDocument,
  AgriculturalSearchEmbedding,
  SearchIndexEvent,
  SearchSourceType,
  SearchVisibilityStatus,
  SearchPublicationStatus,
} from "./types";
import { indexDocumentInputSchema, assertNoProhibitedProduceSearch } from "./validation";
import { sanitizeSearchDocument, sanitizeSearchMetadata } from "./privacy";
import { generateDocumentEmbedding } from "./embeddings";
import { KnowledgeConcept } from "@/features/knowledge-graph/types";

// -----------------------------------------------------------------------------
// 1. IN-MEMORY STORES FOR TESTING & OFFLINE RESILIENCE
// -----------------------------------------------------------------------------

const inMemoryDocuments = new Map<string, AgriculturalSearchDocument>();
const inMemoryEmbeddings = new Map<string, AgriculturalSearchEmbedding>();
const inMemoryEvents: SearchIndexEvent[] = [];

export function resetInMemorySearchStore(): void {
  inMemoryDocuments.clear();
  inMemoryEmbeddings.clear();
  inMemoryEvents.length = 0;
}

export function getInMemorySearchDocuments(): AgriculturalSearchDocument[] {
  return Array.from(inMemoryDocuments.values());
}

export function setInMemorySearchDocument(doc: AgriculturalSearchDocument): void {
  inMemoryDocuments.set(doc.id, doc);
}

// -----------------------------------------------------------------------------
// 2. DOCUMENT KEY GENERATOR
// -----------------------------------------------------------------------------

export function buildSearchDocumentKey(
  sourceType: SearchSourceType,
  sourceEntityId: string
): string {
  const cleanType = sourceType.toLowerCase().replace(/_/g, "-");
  const cleanId = sourceEntityId.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `doc:${cleanType}:${cleanId}`;
}

// -----------------------------------------------------------------------------
// 3. CANONICAL DOCUMENT BUILDERS
// -----------------------------------------------------------------------------

/**
 * Builds a search document from an Agricultural Knowledge Concept (Phase 3.13).
 */
export function buildSearchDocumentFromConcept(
  concept: KnowledgeConcept
): AgriculturalSearchDocument {
  assertNoProhibitedProduceSearch(concept.canonicalName, "Concept Canonical Name");
  assertNoProhibitedProduceSearch(concept.displayName, "Concept Display Name");
  assertNoProhibitedProduceSearch(concept.description, "Concept Description");

  const documentKey = buildSearchDocumentKey("KNOWLEDGE_CONCEPT", concept.id);
  const searchableText = [
    concept.canonicalName,
    concept.displayName,
    concept.conceptType,
    concept.description || "",
    concept.sourceReference || "",
  ]
    .filter(Boolean)
    .join(" ");

  const doc: AgriculturalSearchDocument = {
    id: crypto.randomUUID(),
    documentKey,
    sourceType: "KNOWLEDGE_CONCEPT",
    sourceEntityId: concept.id,
    title: concept.displayName || concept.canonicalName,
    searchableText,
    normalizedText: searchableText.toLowerCase(),
    conceptIds: [concept.id],
    commodityTerms: concept.conceptType === "COMMODITY" ? [concept.canonicalName] : [],
    geographicScope: concept.geographicScope,
    locationState: null,
    locationLga: null,
    sourceProvenance: concept.provenance,
    confidence: concept.confidence,
    visibilityStatus: "PUBLIC",
    publicationStatus:
      concept.status === "PUBLISHED" || concept.status === "VERIFIED"
        ? "PUBLISHED"
        : "DRAFT",
    validFrom: concept.validFrom,
    validUntil: concept.validUntil,
    language: "en",
    metadata: sanitizeSearchMetadata({
      conceptKey: concept.conceptKey,
      conceptType: concept.conceptType,
      parentConceptId: concept.parentConceptId,
      ...concept.metadata,
    }),
    createdAt: concept.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return sanitizeSearchDocument(doc);
}

/**
 * Builds a search document from an arbitrary operational or intelligence context.
 */
export function buildSearchDocumentFromContext(params: {
  sourceType: SearchSourceType;
  sourceEntityId: string;
  title: string;
  body: string;
  commodityTerms?: string[];
  conceptIds?: string[];
  state?: string | null;
  lga?: string | null;
  provenance?: AgriculturalSearchDocument["sourceProvenance"];
  confidence?: AgriculturalSearchDocument["confidence"];
  visibilityStatus?: SearchVisibilityStatus;
  publicationStatus?: SearchPublicationStatus;
  validFrom?: string;
  validUntil?: string | null;
  metadata?: Record<string, unknown>;
}): AgriculturalSearchDocument {
  assertNoProhibitedProduceSearch(params.title, "Context Document Title");
  assertNoProhibitedProduceSearch(params.body, "Context Document Body");
  if (params.commodityTerms) {
    for (const term of params.commodityTerms) {
      assertNoProhibitedProduceSearch(term, "Context Commodity Term");
    }
  }

  const documentKey = buildSearchDocumentKey(params.sourceType, params.sourceEntityId);
  const searchableText = `${params.title} ${params.body}`.trim();

  const doc: AgriculturalSearchDocument = {
    id: crypto.randomUUID(),
    documentKey,
    sourceType: params.sourceType,
    sourceEntityId: params.sourceEntityId,
    title: params.title,
    searchableText,
    normalizedText: searchableText.toLowerCase(),
    conceptIds: params.conceptIds || [],
    commodityTerms: params.commodityTerms || [],
    geographicScope: params.state ? "STATE" : "NATIONAL",
    locationState: params.state || null,
    locationLga: params.lga || null,
    sourceProvenance: params.provenance || "EDITORIAL",
    confidence: params.confidence || "HIGH",
    visibilityStatus: params.visibilityStatus || "PUBLIC",
    publicationStatus: params.publicationStatus || "PUBLISHED",
    validFrom: params.validFrom || new Date().toISOString(),
    validUntil: params.validUntil || null,
    language: "en",
    metadata: sanitizeSearchMetadata(params.metadata || {}),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return sanitizeSearchDocument(doc);
}

// -----------------------------------------------------------------------------
// 4. INDEX SEARCH DOCUMENT (IDEMPOTENT PERSISTENCE)
// -----------------------------------------------------------------------------

export async function indexSearchDocument(
  rawInput: unknown,
  triggeredByUserId: string | null = null
): Promise<AgriculturalSearchDocument> {
  // 1. Zod validation
  const parsed = indexDocumentInputSchema.parse(rawInput);

  // 2. Anti-pork check
  assertNoProhibitedProduceSearch(parsed.title, "Index Search Document Title");
  assertNoProhibitedProduceSearch(parsed.searchableText, "Index Search Document Searchable Text");

  // 3. Document entity construction
  const documentKey = parsed.documentKey || buildSearchDocumentKey(parsed.sourceType, parsed.sourceEntityId);
  const now = new Date().toISOString();

  const domainDoc: AgriculturalSearchDocument = {
    id: crypto.randomUUID(),
    documentKey,
    sourceType: parsed.sourceType,
    sourceEntityId: parsed.sourceEntityId,
    title: parsed.title,
    searchableText: parsed.searchableText,
    normalizedText: `${parsed.title} ${parsed.normalizedText || parsed.searchableText}`.toLowerCase(),
    conceptIds: parsed.conceptIds,
    commodityTerms: parsed.commodityTerms,
    geographicScope: parsed.geographicScope,
    locationState: parsed.locationState || null,
    locationLga: parsed.locationLga || null,
    sourceProvenance: parsed.sourceProvenance,
    confidence: parsed.confidence,
    visibilityStatus: parsed.visibilityStatus,
    publicationStatus: parsed.publicationStatus,
    validFrom: parsed.validFrom || now,
    validUntil: parsed.validUntil || null,
    language: parsed.language,
    metadata: sanitizeSearchMetadata(parsed.metadata),
    createdAt: now,
    updatedAt: now,
  };

  const cleanDoc = sanitizeSearchDocument(domainDoc);

  // 4. Supabase persistence with in-memory fallback
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agricultural_search_documents")
      .upsert(
        {
          document_key: cleanDoc.documentKey,
          source_type: cleanDoc.sourceType,
          source_entity_id: cleanDoc.sourceEntityId,
          title: cleanDoc.title,
          searchable_text: cleanDoc.searchableText,
          normalized_text: cleanDoc.normalizedText,
          concept_ids: cleanDoc.conceptIds,
          commodity_terms: cleanDoc.commodityTerms,
          geographic_scope: cleanDoc.geographicScope,
          location_state: cleanDoc.locationState,
          location_lga: cleanDoc.locationLga,
          source_provenance: cleanDoc.sourceProvenance,
          confidence: cleanDoc.confidence,
          visibility_status: cleanDoc.visibilityStatus,
          publication_status: cleanDoc.publicationStatus,
          valid_from: cleanDoc.validFrom,
          valid_until: cleanDoc.validUntil,
          language: cleanDoc.language,
          metadata: cleanDoc.metadata,
          updated_at: now,
        },
        { onConflict: "document_key" }
      )
      .select()
      .single();

    if (!error && data) {
      cleanDoc.id = data.id;
    }
  } catch {
    // In-memory fallback
  }

  // Check if existing document with same key already exists in-memory
  const existingId = Array.from(inMemoryDocuments.entries()).find(
    ([, d]) => d.documentKey === cleanDoc.documentKey
  )?.[0];
  if (existingId) {
    cleanDoc.id = existingId;
  }
  inMemoryDocuments.set(cleanDoc.id, cleanDoc);

  // 5. Embedding step (Safe honest fallback)
  const embeddingResult = await generateDocumentEmbedding(cleanDoc.searchableText);
  const embeddingRecord: AgriculturalSearchEmbedding = {
    id: crypto.randomUUID(),
    documentId: cleanDoc.id,
    embeddingProvider: embeddingResult.provider,
    embeddingModel: embeddingResult.model,
    embeddingVersion: embeddingResult.version,
    dimensions: embeddingResult.dimensions,
    embeddingStatus: embeddingResult.status,
    embeddingError: embeddingResult.error,
    embeddingVector: embeddingResult.vector,
    embeddedAt: embeddingResult.status === "COMPLETED" ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  inMemoryEmbeddings.set(cleanDoc.id, embeddingRecord);

  // 6. Record Index Event
  const event: SearchIndexEvent = {
    id: crypto.randomUUID(),
    eventType: existingId ? "INDEX_UPDATED" : "INDEX_CREATED",
    documentId: cleanDoc.id,
    sourceType: cleanDoc.sourceType,
    sourceEntityId: cleanDoc.sourceEntityId,
    triggeredByUserId,
    status: "SUCCESS",
    details: {
      documentKey: cleanDoc.documentKey,
      embeddingStatus: embeddingResult.status,
    },
    createdAt: now,
  };
  inMemoryEvents.push(event);

  return cleanDoc;
}

// -----------------------------------------------------------------------------
// 5. UPDATE VISIBILITY & RE-INDEXING OPERATIONS
// -----------------------------------------------------------------------------

export async function updateSearchVisibility(
  documentId: string,
  visibilityStatus: SearchVisibilityStatus,
  publicationStatus?: SearchPublicationStatus,
  triggeredByUserId: string | null = null
): Promise<AgriculturalSearchDocument | null> {
  const doc = inMemoryDocuments.get(documentId);
  if (!doc) return null;

  doc.visibilityStatus = visibilityStatus;
  if (publicationStatus) {
    doc.publicationStatus = publicationStatus;
  }
  doc.updatedAt = new Date().toISOString();

  try {
    const supabase = await createClient();
    await supabase
      .from("agricultural_search_documents")
      .update({
        visibility_status: doc.visibilityStatus,
        publication_status: doc.publicationStatus,
        updated_at: doc.updatedAt,
      })
      .eq("id", documentId);
  } catch {
    // In-memory fallback
  }

  inMemoryDocuments.set(documentId, doc);

  const event: SearchIndexEvent = {
    id: crypto.randomUUID(),
    eventType: "VISIBILITY_CHANGED",
    documentId,
    sourceType: doc.sourceType,
    sourceEntityId: doc.sourceEntityId,
    triggeredByUserId,
    status: "SUCCESS",
    details: { visibilityStatus, publicationStatus },
    createdAt: new Date().toISOString(),
  };
  inMemoryEvents.push(event);

  return doc;
}
