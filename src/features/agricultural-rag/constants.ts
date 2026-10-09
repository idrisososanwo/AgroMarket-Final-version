/**
 * AgroMarket Phase 3.15: Evidence-Grounded Agricultural Intelligence & RAG Constants
 */

// -----------------------------------------------------------------------------
// 1. BOUNDS & CEILINGS
// -----------------------------------------------------------------------------

export const MAX_QUESTION_LENGTH = 300;
export const MIN_QUESTION_LENGTH = 3;

export const MAX_RETRIEVED_DOCUMENTS = 10;
export const MAX_EVIDENCE_ITEMS = 8;
export const MIN_EVIDENCE_ITEMS = 1;

export const MAX_EXCERPT_CHARS = 300;
export const MAX_TOTAL_CONTEXT_CHARS = 4000;

export const RAG_TIMEOUT_MS = 15000;

// -----------------------------------------------------------------------------
// 2. SYSTEM PROMPT FOR GROUNDED RAG SYNTHESIS
// -----------------------------------------------------------------------------

export const RAG_SYSTEM_PROMPT = `
You are the AgroMarket Agricultural Intelligence Assistant.
Your sole purpose is to provide evidence-grounded, transparent agricultural explanations based EXCLUSIVELY on the provided retrieved evidence context.

CRITICAL INVARIANTS:
1. STRICT EVIDENCE GROUNDING: Only make claims directly supported by the supplied evidence items tagged [EVI-X].
2. CITATION REQUIREMENT: Every key statement or fact must cite the exact evidence ID (e.g. "[CIT-1]" referencing "EVI-1"). Never invent citations or cite external materials.
3. DO NOT HALLUCINATE: Never invent prices, yield statistics, studies, URLs, agronomic formulas, or dates not present in the context.
4. UNCERTAINTY & CONFLICTS: If sources disagree or evidence is incomplete, explicitly state the conflict and report evidence provenance.
5. NO STATUTORY / VETERINARY CLAIMS: Do not diagnose animal/crop diseases, prescribe clinical treatments, or issue statutory/regulatory certifications. Direct users to certified extension workers or veterinarians.
6. ANTI-PORK ZERO TOLERANCE: Strictly exclude any references to pork, swine, pig, bacon, ham, or porcine byproducts.
7. RESPOND IN STRICT JSON FORMAT matching the requested output schema.
`.trim();

// -----------------------------------------------------------------------------
// 3. MANDATORY NOTICES & ADVISORY DISCLAIMERS
// -----------------------------------------------------------------------------

export const RAG_ADVISORY_DISCLAIMER =
  "AgroMarket agricultural intelligence syntheses are evidence-grounded advisory projections. " +
  "They do not constitute binding commercial price commitments, official government declarations, " +
  "or statutory veterinary/regulatory certifications. Always verify field actions with local extension officers.";

export const PROFESSIONAL_REVIEW_DISCLAIMER =
  "⚠️ Professional Review Required: This inquiry involves disease, biosecurity, or acute agronomic risk. " +
  "Information provided is informational only. Do not administer treatments or enforce quarantine without " +
  "on-site evaluation by a certified veterinarian or agricultural extension officer.";

export const INSUFFICIENT_EVIDENCE_NOTICE =
  "Available evidence in AgroMarket's knowledge base is insufficient to synthesize a reliable, " +
  "grounded answer for this specific query. Showing raw retrieved context and known limitations instead.";

export const EVIDENCE_FALLBACK_NOTICE =
  "AI generation provider is currently unavailable or unconfigured in this environment. " +
  "Presenting an evidence-only retrieval summary grounded in authoritative records.";
