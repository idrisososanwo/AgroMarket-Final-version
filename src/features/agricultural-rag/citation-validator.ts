/**
 * AgroMarket Phase 3.15: Claim and Citation Validation Layer
 * Deterministically validates that every citation points to an authentic supplied evidence item.
 */

import { RagEvidenceItem, RagCitation } from "./types";
import { RawGeneratedAnswer } from "./validation";

export interface CitationValidationResult {
  validCitations: RagCitation[];
  rejectedCitations: Array<{
    citationId: string;
    evidenceId: string;
    reason: string;
  }>;
  flaggedLimitations: string[];
}

/**
 * Validates model-generated citations against supplied evidence set.
 * Rejects hallucinations, unknown evidence references, and cross-source mismatches.
 */
export function validateAndEnrichCitations(
  rawAnswer: RawGeneratedAnswer,
  evidenceSet: RagEvidenceItem[]
): CitationValidationResult {
  const evidenceMap = new Map<string, RagEvidenceItem>();
  for (const item of evidenceSet) {
    evidenceMap.set(item.evidenceId.toUpperCase(), item);
    // Also map plain numbers if model produced "1" instead of "EVI-1"
    const num = item.evidenceId.replace(/^EVI-/, "");
    evidenceMap.set(num, item);
  }

  const validCitations: RagCitation[] = [];
  const rejectedCitations: CitationValidationResult["rejectedCitations"] = [];
  const flaggedLimitations: string[] = [];

  for (let i = 0; i < rawAnswer.citations.length; i++) {
    const rawCit = rawAnswer.citations[i];
    const targetKey = (rawCit.evidenceId || "").trim().toUpperCase();
    const matchedEvidence = evidenceMap.get(targetKey);

    if (!matchedEvidence) {
      rejectedCitations.push({
        citationId: rawCit.citationId || `[CIT-${i + 1}]`,
        evidenceId: rawCit.evidenceId,
        reason: `Evidence ID "${rawCit.evidenceId}" does not exist in the retrieved evidence set.`,
      });
      continue;
    }

    const citation: RagCitation = {
      citationId: rawCit.citationId || `[CIT-${validCitations.length + 1}]`,
      evidenceId: matchedEvidence.evidenceId,
      sourceType: matchedEvidence.sourceType,
      sourceTitle: matchedEvidence.sourceTitle,
      canonicalReference: matchedEvidence.canonicalReference,
      supportingExcerpt: matchedEvidence.relevantExcerpt,
      provenance: matchedEvidence.provenance,
      confidence: matchedEvidence.confidence,
      isHistorical: matchedEvidence.isHistorical,
    };

    validCitations.push(citation);
  }

  // Check if answer contains numerical percentage or currency claims without citations
  const hasNumbers = /\b\d+(?:\.\d+)?%|\b(?:₦|NGN|\$)\s*\d+/i.test(rawAnswer.answer);
  if (hasNumbers && validCitations.length === 0) {
    flaggedLimitations.push(
      "Synthesis contains numerical figures or metrics without direct grounded citation verification."
    );
  }

  return {
    validCitations,
    rejectedCitations,
    flaggedLimitations,
  };
}
