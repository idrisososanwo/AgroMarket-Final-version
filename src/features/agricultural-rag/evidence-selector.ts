/**
 * AgroMarket Phase 3.15: Evidence Selection and Conflict Detection
 * Deterministically selects, deduplicates, and structures evidence items from retrieval results.
 */

import { AgriculturalSearchResult } from "@/features/semantic-search/types";
import { RagEvidenceItem, RagConflictDisclosure } from "./types";
import { MAX_EVIDENCE_ITEMS, MAX_EXCERPT_CHARS } from "./constants";
import { sanitizeSearchSnippet } from "@/features/semantic-search/privacy";

export interface EvidenceSelectionResult {
  evidenceSet: RagEvidenceItem[];
  detectedConflicts: RagConflictDisclosure[];
  isInsufficientEvidence: boolean;
}

/**
 * Deterministically selects, bounds, and tags candidate search results into grounded evidence items.
 */
export function selectAndStructureEvidence(
  candidates: AgriculturalSearchResult[],
  maxCount = MAX_EVIDENCE_ITEMS
): EvidenceSelectionResult {
  if (!candidates || candidates.length === 0) {
    return {
      evidenceSet: [],
      detectedConflicts: [],
      isInsufficientEvidence: true,
    };
  }

  const seenEntityKeys = new Set<string>();
  const evidenceSet: RagEvidenceItem[] = [];
  const detectedConflicts: RagConflictDisclosure[] = [];

  let counter = 1;
  const limit = Math.min(Math.max(1, maxCount), MAX_EVIDENCE_ITEMS);

  for (const item of candidates) {
    if (evidenceSet.length >= limit) break;

    // Deduplication key
    const dedupeKey = `${item.sourceType}:${item.sourceEntityId}`;
    if (seenEntityKeys.has(dedupeKey)) continue;
    seenEntityKeys.add(dedupeKey);

    // Clean excerpt up to MAX_EXCERPT_CHARS
    let excerpt = item.sanitizedSnippet.trim();
    if (excerpt.length > MAX_EXCERPT_CHARS) {
      excerpt = excerpt.slice(0, MAX_EXCERPT_CHARS).trim() + "...";
    }
    excerpt = sanitizeSearchSnippet(excerpt);

    const isHistorical = item.validityStatus === "EXPIRED";

    const evidenceItem: RagEvidenceItem = {
      evidenceId: `EVI-${counter}`,
      documentId: item.documentId,
      sourceType: item.sourceType,
      sourceEntityId: item.sourceEntityId,
      canonicalReference: `${item.sourceType.toLowerCase()}:${item.sourceEntityId}`,
      sourceTitle: item.title,
      relevantExcerpt: excerpt,
      provenance: item.sourceProvenance,
      confidence: item.confidence,
      geographicScope: item.geographicScope,
      locationState: item.locationState,
      locationLga: item.locationLga,
      validityWindow: {
        from: item.validFrom,
        until: item.validUntil,
      },
      retrievalScore: item.score,
      rankingReasons: item.rankingReasons,
      isHistorical,
    };

    evidenceSet.push(evidenceItem);
    counter++;
  }

  // Conflict detection: look for opposing directions or conflicting statements across evidence items
  for (let i = 0; i < evidenceSet.length; i++) {
    for (let j = i + 1; j < evidenceSet.length; j++) {
      const e1 = evidenceSet[i];
      const e2 = evidenceSet[j];

      const text1 = e1.relevantExcerpt.toLowerCase();
      const text2 = e2.relevantExcerpt.toLowerCase();

      // Check opposing indicators (e.g. increase vs decrease / surplus vs deficit / safe vs outbreak)
      const hasPriceConflict =
        (text1.includes("surplus") && text2.includes("deficit")) ||
        (text1.includes("deficit") && text2.includes("surplus")) ||
        (text1.includes("price rise") && text2.includes("price fall")) ||
        (text1.includes("shortage") && text2.includes("oversupply"));

      const hasOutbreakConflict =
        (text1.includes("outbreak") && text2.includes("free of disease")) ||
        (text1.includes("quarantine") && text2.includes("unrestricted movement"));

      if (hasPriceConflict || hasOutbreakConflict) {
        detectedConflicts.push({
          topic: hasPriceConflict ? "Market Supply & Price Dynamics" : "Biosecurity Status",
          primaryClaim: e1.relevantExcerpt,
          conflictingClaim: e2.relevantExcerpt,
          primarySource: `${e1.sourceTitle} (${e1.evidenceId})`,
          conflictingSource: `${e2.sourceTitle} (${e2.evidenceId})`,
          primaryProvenance: e1.provenance,
          conflictingProvenance: e2.provenance,
          explanation: `Discrepancy detected between sources from ${e1.provenance} and ${e2.provenance}. Both perspectives are preserved.`,
        });
      }
    }
  }

  const isInsufficientEvidence =
    evidenceSet.length === 0 ||
    evidenceSet.every((e) => e.confidence === "INSUFFICIENT_DATA" || e.retrievalScore < 0.2);

  return {
    evidenceSet,
    detectedConflicts,
    isInsufficientEvidence,
  };
}
