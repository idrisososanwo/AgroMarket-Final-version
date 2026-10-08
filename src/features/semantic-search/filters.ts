/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search Structured Filters
 * Strict, deterministic filtering against authoritative document metadata.
 */

import { AgriculturalSearchDocument, StructuredSearchFilters } from "./types";
import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT } from "./constants";

/**
 * Evaluates whether a search document matches the temporal validity mode.
 */
export function matchesTemporalValidity(
  doc: AgriculturalSearchDocument,
  mode: "CURRENT" | "HISTORICAL" | "ALL" = "CURRENT",
  referenceTime: Date = new Date()
): boolean {
  if (mode === "ALL") return true;

  const nowMs = referenceTime.getTime();
  const validFromMs = new Date(doc.validFrom).getTime();
  const validUntilMs = doc.validUntil ? new Date(doc.validUntil).getTime() : null;

  if (mode === "CURRENT") {
    // Must be valid now: validFrom <= now AND (validUntil is null OR validUntil >= now)
    const started = isNaN(validFromMs) || validFromMs <= nowMs;
    const notExpired = validUntilMs === null || isNaN(validUntilMs) || validUntilMs >= nowMs;
    return started && notExpired;
  }

  if (mode === "HISTORICAL") {
    // Historical record: validUntil must exist and be strictly before now
    return validUntilMs !== null && !isNaN(validUntilMs) && validUntilMs < nowMs;
  }

  return true;
}

/**
 * Applies structured filters to candidate search documents.
 * Never allows semantic similarity to bypass explicit structured filters.
 */
export function applyStructuredFilters(
  documents: AgriculturalSearchDocument[],
  filters: StructuredSearchFilters = {},
  referenceTime: Date = new Date()
): {
  matchedDocuments: AgriculturalSearchDocument[];
  totalMatched: number;
} {
  const filtered = documents.filter((doc) => {
    // 1. Source Types
    if (filters.sourceTypes && filters.sourceTypes.length > 0) {
      if (!filters.sourceTypes.includes(doc.sourceType)) return false;
    }

    // 2. Visibility
    if (filters.visibility) {
      if (doc.visibilityStatus !== filters.visibility) return false;
    }

    // 3. Publication Status
    if (filters.publicationStatus) {
      if (doc.publicationStatus !== filters.publicationStatus) return false;
    }

    // 4. Commodity Filter
    if (filters.commodity) {
      const target = filters.commodity.toLowerCase();
      const hasTerm = doc.commodityTerms.some((t) => t.toLowerCase() === target);
      const inTitle = doc.title.toLowerCase().includes(target);
      if (!hasTerm && !inTitle) return false;
    }

    // 5. Geographic State Filter
    if (filters.state) {
      const targetState = filters.state.toLowerCase();
      if (!doc.locationState || doc.locationState.toLowerCase() !== targetState) {
        return false;
      }
    }

    // 6. Geographic LGA Filter
    if (filters.lga) {
      const targetLga = filters.lga.toLowerCase();
      if (!doc.locationLga || doc.locationLga.toLowerCase() !== targetLga) {
        return false;
      }
    }

    // 7. Confidence Filter
    if (filters.confidence) {
      if (doc.confidence !== filters.confidence) return false;
    }

    // 8. Provenance Filter
    if (filters.provenance) {
      if (doc.sourceProvenance !== filters.provenance) return false;
    }

    // 9. Concept Types Filter (checks concept metadata or concept keys)
    if (filters.conceptTypes && filters.conceptTypes.length > 0) {
      const docConceptType = (doc.metadata?.conceptType as string) || "";
      if (!filters.conceptTypes.includes(docConceptType)) {
        return false;
      }
    }

    // 10. Temporal Validity Mode
    if (!matchesTemporalValidity(doc, filters.temporalMode || "CURRENT", referenceTime)) {
      return false;
    }

    return true;
  });

  const totalMatched = filtered.length;

  // Pagination bounds
  const offset = Math.max(0, filters.offset ?? 0);
  const limit = Math.min(
    MAX_SEARCH_LIMIT,
    Math.max(1, filters.limit ?? DEFAULT_SEARCH_LIMIT)
  );

  const paginated = filtered.slice(offset, offset + limit);

  return {
    matchedDocuments: paginated,
    totalMatched,
  };
}
