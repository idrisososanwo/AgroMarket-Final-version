# AgroMarket Agricultural Semantic Search & Retrieval Foundation

> **Phase 3.14 Architectural Specification & Technical Reference**
>
> **Notice:** *This phase provides retrieval infrastructure, not generative AI answers.*

---

## 1. Executive Summary

AgroMarket Phase 3.14 establishes the backend and operational retrieval foundation for semantic and structured search across AgroMarket's agricultural knowledge, agronomic concepts, biosecurity risks, regional intelligence, and supply chain dependencies.

### Core Principles & Boundaries
1. **Retrieval, Not Generation:** Search outputs are retrieved informational projections. There is **NO consumer AI chatbot** and **NO autonomous generative RAG**.
2. **Deterministic Fallback & Vector Honesty:** If an authentic semantic vector embedding provider is not configured, the engine operates honestly in `LEXICAL` or `ONTOLOGY_EXPANDED` mode. It **never manufactures fake vectors** or random similarity metrics.
3. **Zero-Tolerance Anti-Pork Policy:** Every query, indexed document, snippet, commodity filter, and ranking explanation strictly enforces AgroMarket's anti-pork invariant.
4. **Privacy & Confidentiality First:** Personal phone numbers, high-precision GPS coordinates, email addresses, and private commercial pricing are redacted across snippets, metadata, and responses.
5. **Advisory Decision Support:** Search results are strictly non-binding and non-causal. Operational transactions, physical commitments, and veterinary decisions require canonical platform verification and explicit human consent.

---

## 2. System Architecture

The semantic search foundation sits above AgroMarket's operational database records and Phase 3.13 Agricultural Knowledge Graph:

```
+-------------------------------------------------------------------------------+
|                      Operational Search Surface (/semantic-search)             |
|              +--------------------+   +----------------------------------+    |
|              |  Search Input Bar  |   |  Structured Filter Controls      |    |
|              +--------------------+   +----------------------------------+    |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                 Hybrid Retrieval Engine (retrieval.ts)                        |
|                                                                               |
|   1. Query Normalization & Tokenization                                       |
|   2. Anti-Pork Validation Assertion                                           |
|   3. Bounded Ontology Graph Expansion (maxDepth: 2, maxConcepts: 50)          |
|   4. Candidate Retrieval (Database & Memory Projection)                       |
|   5. Structured Filtering (State, Commodity, Source, Temporal Validity)      |
|   6. Embedding Vector Check (Noop / Authentic Provider)                       |
|   7. Deterministic Composite Scoring & Explainable Reasons                   |
|   8. Deterministic Ranking & Privacy Sanitization                             |
+-------------------+-----------------------------------+-----------------------+
                    |                                   |
                    v                                   v
+------------------------------------+ +----------------------------------------+
| Phase 3.13 Knowledge Graph         | | PostgreSQL / Supabase Storage          |
| - Concepts & Ontologies            | | - agricultural_search_documents        |
| - Semantic Relationships           | | - agricultural_search_embeddings       |
| - Entity Links                     | | - agricultural_search_index_events     |
+------------------------------------+ +----------------------------------------+
```

---

## 3. Searchable Source Taxonomy

The system defines 12 controlled domain sources (`SearchSourceType`):

| Source Type | Description | Visibility Scope |
| :--- | :--- | :--- |
| `KNOWLEDGE_CONTENT` | Editorial agronomic guides, best practices, and pest manuals | PUBLIC / AUTHENTICATED |
| `KNOWLEDGE_CONCEPT` | Canonical concepts from Phase 3.13 (commodities, inputs, risks) | PUBLIC |
| `KNOWLEDGE_RELATIONSHIP` | Relationships connecting ontology entities | PUBLIC |
| `PRODUCT` | Standardized marketplace products and specifications | PUBLIC |
| `CATEGORY` | AgroMarket commodity categories and taxonomies | PUBLIC |
| `PRODUCTION_CONTEXT` | Agronomic production benchmarks and planting windows | AUTHENTICATED |
| `MARKET_CONTEXT` | Aggregated market price indices and liquidity conditions | PUBLIC / AUTHENTICATED |
| `FOOD_SECURITY_CONTEXT` | Vulnerability indicators and harvest outlooks | AUTHENTICATED / ADMIN |
| `DISEASE_BIOSECURITY_CONTEXT` | Outbreak alerts, quarantine zones, and disease symptoms | PUBLIC / AUTHENTICATED |
| `LOGISTICS_CONTEXT` | Freight corridors, transit times, and cold-chain checkpoints | AUTHENTICATED |
| `PROCESSING_CONTEXT` | Industrial milling, transformation ratios, and drying protocols| AUTHENTICATED |
| `AGRICULTURAL_PRACTICE` | Regenerative practices, pest IPM, and soil management | PUBLIC |

---

## 4. Search Document Model

Canonical search documents are modeled by `AgriculturalSearchDocument`:

```typescript
export interface AgriculturalSearchDocument {
  id: string;
  documentKey: string;           // Stable unique key: doc:<sourceType>:<sourceEntityId>
  sourceType: SearchSourceType;
  sourceEntityId: string;
  title: string;
  searchableText: string;
  normalizedText: string;
  conceptIds: string[];
  commodityTerms: string[];
  geographicScope: KnowledgeGeographicScope;
  locationState: string | null;
  locationLga: string | null;
  sourceProvenance: KnowledgeProvenance; // OBSERVED | DERIVED | CORRELATED | ESTIMATED | EDITORIAL
  confidence: KnowledgeConfidence;       // HIGH | MEDIUM | LOW
  visibilityStatus: SearchVisibilityStatus;
  publicationStatus: SearchPublicationStatus;
  validFrom: string;
  validUntil: string | null;
  language: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

The database table `agricultural_search_documents` enforces idempotency via unique constraints on `(source_type, source_entity_id)` and `document_key`.

---

## 5. Embedding Provider Abstraction

The search layer is decoupled from specific vector providers via `EmbeddingProvider`:

```typescript
export interface EmbeddingProvider {
  providerName(): string;
  getDimensions(): number;
  isAvailable(): boolean;
  embedDocument(text: string): Promise<number[] | null>;
  embedQuery(query: string): Promise<number[] | null>;
}
```

### Zero Fake Vectors Policy
- Default provider: `NoopEmbeddingProvider` (`providerName: "NONE"`, `isAvailable: false`).
- If no authentic provider is configured, document embedding returns `status: "UNAVAILABLE"` and `vector: null`.
- The system **never fabricates random embeddings** or synthetic coordinates.
- Retrieval mode gracefully falls back to `LEXICAL` or `ONTOLOGY_EXPANDED`.

---

## 6. Retrieval Modes & Fallbacks

| Mode | Trigger Condition | Capabilities |
| :--- | :--- | :--- |
| `LEXICAL` | No embedding provider and no ontology concepts matched | GIN full-text search, term matching in title & body |
| `ONTOLOGY_EXPANDED` | No embedding provider, but query expanded via Phase 3.13 graph | Lexical matching + concept synonym and related term expansion |
| `HYBRID` | Authentic embedding provider is active | Lexical + ontology expansion + cosine vector similarity |
| `SEMANTIC` | Pure vector similarity threshold matching | Used alongside structured filters |

---

## 7. Deterministic Hybrid Ranking

The scoring engine (`ranking.ts`) calculates composite scores between `0.0` and `1.0` using explicit, transparent weights:

| Factor | Code | Weight | Rationale |
| :--- | :--- | :--- | :--- |
| **Exact Title Match** | `EXACT_TITLE_MATCH` | +0.35 | Query phrase directly matches document title |
| **Exact Commodity** | `EXACT_COMMODITY_MATCH` | +0.25 | Query mentions specific canonical commodity |
| **Ontology Expansion** | `ONTOLOGY_EXPANSION_MATCH` | +0.20 | Document linked to concepts expanded from query |
| **Lexical Body Match** | `LEXICAL_BM25_MATCH` | Up to +0.15 | Ratio of query tokens matched in searchable text |
| **Geographic State** | `STATE_EXACT_MATCH` | +0.15 | Document matches queried Nigerian state |
| **Geographic LGA** | `LGA_EXACT_MATCH` | +0.10 | Document matches queried Local Government Area |
| **High Confidence** | `HIGH_CONFIDENCE_SOURCE` | +0.10 | Verified institutional or empirical source |
| **Recent Update** | `RECENT_UPDATE` | +0.05 | Record updated within last 30 days |

Every search result includes `rankingReasons: SearchRankingExplanation[]` with human-readable descriptions of why the record ranked.

---

## 8. Temporal Search Separation

Search documents feature temporal validity bounds:
- **`CURRENT` (Default):** Documents where `validFrom <= now` and (`validUntil IS NULL` or `validUntil >= now`).
- **`HISTORICAL`:** Documents where `validUntil < now`. Integrates with historical memory without polluting current active intelligence.
- **`ALL`:** Unbounded temporal retrieval for research and auditing.

---

## 9. Intelligence Integration Functions

For autonomous and semi-autonomous agricultural intelligence agents, `queries.ts` provides domain-specific retrieval packages:

- `retrieveCommodityContext(commodity, state?)`
- `retrieveProductionContext(topic, state?)`
- `retrieveMarketContext(marketOrCommodity, state?)`
- `retrieveDiseaseContext(diseaseOrBiosecurityTopic)`
- `retrieveFoodSecurityContext(topic, state?)`
- `retrieveLogisticsContext(corridorOrTopic)`
- `retrieveProcessingContext(cropOrOutput)`
- `retrieveRegionalContext(state, lga?)`

Each returned package exposes:
- `evidenceFound: boolean` (honest empty state handling)
- `provenanceBreakdown: Record<string, number>`
- `confidenceSummary: { high, medium, low }`
- `retrievalMode: string`
- `advisoryLimitations: string`

---

## 10. Privacy & Governance Integration

- **Privacy Sanitization:** Text snippets, metadata, and responses pass through `sanitizeSearchResult()`. Phone numbers are replaced with `[PHONE REDACTED]`, GPS numbers with `[COORDINATES REDACTED]`, and emails with `[EMAIL REDACTED]`.
- **Governance Gate:** Indexing and visibility mutations invoke `evaluateGovernancePolicy()` with role validation. Governance `DENY` rejects indexing operations before state mutation.
- **Action Route Whitelisting:** `/semantic-search` is whitelisted in `VALID_AGROMARKET_ACTION_ROUTES`.

---

## 11. Explicit Scope Boundaries

This phase explicitly excludes:
- Consumer AI chatbot or conversational chat interface
- Generative RAG response synthesis
- Autonomous purchase, order placement, or payment triggers
- Automated veterinary diagnosis or statutory quarantine execution
- Financial lending or insurance auto-decisions
- Price speculation or automated arbitrage
