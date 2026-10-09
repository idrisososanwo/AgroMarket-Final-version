# AgroMarket Evidence-Grounded Agricultural Intelligence & RAG Foundation

> **Phase 3.15 Architectural Specification & Technical Reference**
>
> **Notice:** *This phase provides evidence-grounded agricultural answer synthesis. It does not provide autonomous agricultural decision-making or guarantee that every generated statement is correct.*

---

## 1. Executive Summary

AgroMarket Phase 3.15 establishes the backend and operational intelligence layer for **Evidence-Grounded Agricultural Retrieval-Augmented Generation (RAG)**. Built directly on top of the Phase 3.14 semantic search retrieval foundation, Phase 3.13 Agricultural Knowledge Graph, and Phase 3.12 Agricultural Dependency Intelligence, this phase enables synthesized, evidence-backed explanations and summaries for bounded Nigerian agricultural inquiries.

### Core Principles & Boundaries
1. **Evidence-Grounded Synthesis, Not Speculation:** Generated statements must be explicitly derived from retrieved platform evidence. The system refuses to invent facts, figures, studies, or URLs.
2. **Honest Provider Fallback:** When an external AI provider (OpenAI / Gemini) is unconfigured or unavailable, the system cleanly falls back to `EVIDENCE_ONLY_FALLBACK`. It **never manufactures fake AI completions**.
3. **Deterministic Citation Validation:** Every citation is verified against supplied evidence items. Mismatched or unknown citation references are rejected deterministically before answers are delivered.
4. **Strict Anti-Pork Zero Tolerance:** The anti-pork invariant is rigorously enforced across user queries, retrieved evidence, context building, model prompts, generated outputs, citations, and metadata.
5. **Privacy & Redaction:** Sensitive phone numbers, high-precision farm coordinates, email addresses, and private commercial pricing are redacted from all evidence snippets and contexts.
6. **Domain Safety Boundaries:** The system explicitly avoids acting as a veterinarian, physician, or statutory certifier. Clinical animal health inquiries trigger mandatory professional review flags.

---

## 2. System Architecture

The RAG pipeline operates as a strictly sequential, governed flow:

```
[User Question]
       │
       ▼
1. Query Validation & Anti-Pork Assertion (validation.ts)
       │
       ▼
2. Existing Hybrid Retrieval (Phase 3.14 searchAgriculturalKnowledge)
       │
       ▼
3. Deterministic Evidence Selection & Deduplication (evidence-selector.ts)
       │
       ▼
4. Bounded Context Assembly & Temporal Tagging (context-builder.ts)
       │
       ▼
5. Governed Generation / Honest Fallback (generation.ts)
       ├── Provider Online? ──> Structured Prompt & LLM Generation
       └── Provider Offline? ──> Deterministic Evidence-Only Fallback
       │
       ▼
6. Deterministic Citation Validation & Claim Audit (citation-validator.ts)
       │
       ▼
7. Domain-Specific Safety & Professional Review Evaluation (safety.ts)
       │
       ▼
8. Anti-Pork Re-verification & Privacy Sanitization
       │
       ▼
9. Audit Logging & Persisted Metadata (Supabase agricultural_rag_queries)
       │
       ▼
[Structured EvidenceGroundedAnswer]
```

---

## 3. Retrieval Integration

Phase 3.15 reuses existing Phase 3.14 retrieval functions without duplicating search indexes:
- `searchAgriculturalKnowledge(...)`
- `retrieveCommodityContext(...)`
- `retrieveProductionContext(...)`
- `retrieveMarketContext(...)`
- `retrieveDiseaseContext(...)`
- `retrieveFoodSecurityContext(...)`
- `retrieveLogisticsContext(...)`
- `retrieveProcessingContext(...)`
- `retrieveRegionalContext(...)`

The language model is never permitted to execute unrestricted SQL queries or bypass Row Level Security (RLS). All data provided to the context builder is filtered through existing privacy and visibility controls.

---

## 4. Evidence Selection & Bounded Context

To avoid hallucination and stay within strict computational limits, evidence is deterministically filtered:
- **Maximum Evidence Items:** Bounded to 8 items per query.
- **Deduplication:** Collapses items sharing identical canonical references or text excerpts.
- **Excerpt Truncation:** Excerpts are capped at 300 characters each.
- **Total Context Budget:** Total context text block is strictly capped at 4,000 characters.
- **Traceability Metadata:** Each item preserves its stable evidence ID (`EVI-X`), canonical reference, source type, title, provenance, confidence, geographic scope, retrieval score, ranking explanation, and temporal classification (`CURRENT` vs `HISTORICAL`).

---

## 5. Generation Provider Abstraction & Honest Fallback

Phase 3.15 reuses the Phase 2.2 `AIProvider` abstraction (`src/features/intelligence/ai-provider.ts`):
- **Provider Adapters:** Integrates with OpenAI and Gemini where configured in `.env.local`.
- **Unavailable State:** When no provider API key is configured, `getAIProvider()` returns `UnavailableAIProvider`.
- **Honest Fallback:** When the provider is offline or times out (15,000 ms ceiling), the engine synthesizes an `EVIDENCE_ONLY_FALLBACK` response containing retrieved source references and a clear disclosure that generative synthesis is offline. Fake completions are strictly forbidden.

---

## 6. Structured Answer Contract

All responses conform to the `EvidenceGroundedAnswer` interface:
```typescript
interface EvidenceGroundedAnswer {
  query: string;
  category: RagQuestionCategory;
  summary: string;
  answer: string;
  keyPoints: string[];
  citations: RagCitation[];
  limitations: string[];
  confidence: KnowledgeConfidence;
  provenanceSummary: Record<KnowledgeProvenance, number>;
  conflicts: RagConflictDisclosure[];
  generatedAt: string;
  generationMode: RagGenerationMode; // "EVIDENCE_GROUNDED_SYNTHESIS" | "EVIDENCE_ONLY_FALLBACK"
  needsProfessionalReview: boolean;
  professionalReviewNotice?: string;
  insufficientEvidence: boolean;
  latencyMs: number;
  providerModel?: string;
  suggestedActions?: SuggestedAction[];
}
```

---

## 7. Deterministic Citation Validation

Every generated citation is audited against the evidence context before acceptance:
1. **Citation ID Exists:** Every `[CIT-X]` must resolve to an authentic `EVI-X` in the supplied evidence set.
2. **Title Match:** The source title cited by the model must match the retrieved document title.
3. **Excerpt Cross-Reference:** Supporting excerpts must be present within the source evidence.
4. **Numerical Claims Audit:** Answers containing specific percentage or numerical claims (e.g., `+25%`, `95%`) are audited against the text of the supplied evidence. Any ungrounded numerical claim is explicitly flagged in the answer limitations.

---

## 8. Provenance and Confidence Preservation

Evidence provenance and confidence tiers are preserved and summarized:
- **Provenance Categories:** `OBSERVED`, `DERIVED`, `CORRELATED`, `ESTIMATED`, `EXTERNAL_SOURCE`, `EDITORIAL`, `SYSTEM_IMPORTED`, `INSUFFICIENT_DATA`.
- **Confidence Levels:** `HIGH`, `MODERATE`, `LOW`, `INSUFFICIENT_DATA`.
- Retrieval scores are **never** directly conflated with factual confidence. If all retrieved sources are low confidence or estimated, the final answer's confidence rating reflects that uncertainty.

---

## 9. Historical vs Current Evidence Separation

Temporal scope is maintained across the entire pipeline:
- Context items are explicitly tagged with `[CURRENT]` or `[HISTORICAL]`.
- Current queries regarding market pricing or active harvest availability are prioritized with current operational observations.
- When historical data is used, answers explicitly state the historical timeframe and note that past conditions do not guarantee current market realities.

---

## 10. Conflicting Evidence Disclosure

When retrieved documents present opposing guidance (e.g. conflicting sowing dates across agro-ecological zones, or divergent yield forecasts), the engine does not discard either source:
- Opposing claims are detected via `detectEvidenceConflicts(...)`.
- A structured conflict disclosure is added to `conflicts: RagConflictDisclosure[]`.
- Both perspectives are cited with their respective provenance and agro-ecological context.

---

## 11. Domain-Specific Safety Boundaries

1. **Agricultural Production:** Explains documented agronomic practices. Does not guarantee yields, financial returns, or specific harvest dates.
2. **Disease and Biosecurity:** Summarizes published biosecurity and symptom identification protocols. Clinical diagnosis inquiries trigger `needsProfessionalReview: true` and direct farmers to qualified veterinary officers.
3. **Food Security:** Explains documented regional indicators without claiming to be an official statutory disaster declaration.
4. **Logistics & Security:** Summarizes published road corridor constraints without providing tactical convoy or armed security routing.
5. **Market & Procurement:** Summarizes observed spatial prices without executing purchases or guaranteeing trading spreads.

---

## 12. Strict Anti-Pork Policy

AgroMarket maintains a zero-tolerance policy against porcine and swine produce:
- Regex validation `/\b(pork|swine|pig|bacon|ham|porcine)\b/i` checks user queries, commodity filters, context snippets, prompts, generated outputs, citations, and audit logs.
- Database level check constraint `chk_no_pork_rag_queries` enforces the policy on persisted query records.

---

## 13. Privacy & Data Protection

- All evidence snippets pass through `sanitizeSearchSnippet(...)`.
- Nigerian phone numbers (regex matching `080`, `070`, `090`, `+234`) are redacted to `[REDACTED_PHONE]`.
- Email addresses are redacted to `[REDACTED_EMAIL]`.
- GPS coordinates with precision greater than 2 decimal places are removed.
- Private farmer names and commercial pricing agreements are excluded.

---

## 14. Governance and Non-Autonomous Execution

- Informational Q&A is governed as low-risk advisory reading (`VIEW_MARKETPLACE` intent under `AGRICULTURAL_ORCHESTRATION_AGENT`).
- Answers can reference existing platform routes (such as `/semantic-search`, `/marketplace`, `/knowledge-graph`) via `VALID_AGROMARKET_ACTION_ROUTES`.
- Generated text is **never** permitted to execute transactional mutations, disbursements, culling orders, or listing creations.

---

## 15. Operational User Interface

The dedicated interface is live at `/agricultural-assistant`:
- **Topic Guidance Panel:** Provides sample queries across 6 verified agricultural domains.
- **Question Form:** Validates length, displays character counter, and enforces anti-pork rules client-side.
- **Answer Presentation:** Renders executive summary, synthesized narrative, bullet points, and source citations.
- **Evidence Drawer:** Expandable panel showing exact excerpts, provenance, confidence, and ranking scores.
- **Disclaimers & Fallback Notices:** Clearly informs users when running under evidence-only fallback or when professional review is advised.

---

## 16. Persistence & Audit

All queries and synthesis results are audited in `agricultural_rag_queries`:
- Schema fields: `id`, `user_id`, `question`, `category`, `generation_mode`, `confidence`, `evidence_count`, `evidence_ids`, `citations_count`, `unsupported_claims_count`, `needs_professional_review`, `latency_ms`, `provider_model`, `created_at`.
- RLS Policy: Admins can review all queries (`public.is_admin()`); authenticated users can view their own queries.
- Raw sensitive prompt payloads and personal identifiable information are not retained.

---

## 17. Evaluation & Feedback Integration

Answers interface with the Phase 3.4 evaluation and feedback mechanisms:
- Quality metrics tracked: citation validity rate, unsupported claims count, provider latency, conflict detection rate.
- User feedback can flag inaccurate summaries for human agronomic review without triggering unsupervised model retraining.

---

## 18. Limitations & Deferred Capabilities

1. **Autonomous Execution:** The assistant cannot make purchases, hire logistics, or schedule vet visits.
2. **Clinical Treatment:** The assistant cannot prescribe veterinary medications or diagnose livestock diseases.
3. **General Chatbot Behavior:** The assistant is restricted to agricultural topics and rejects general-purpose conversation.
4. **Vector Embeddings:** In the absence of an external embedding provider, retrieval relies on deterministic lexical and ontology-expanded hybrid search.
