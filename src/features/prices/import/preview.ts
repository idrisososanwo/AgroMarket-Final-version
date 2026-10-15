import { DryRunImportPreviewResult, ExternalPriceInputRecord, PreviewValidationItem } from "./types";
import { CanonicalProductRef, validateExternalPriceRecord } from "./validator";

export interface ExistingObservationSnapshot {
  productId: string;
  state: string;
  marketName: string;
  unit: string;
  price: number;
  observedAt: string;
}

/**
 * Runs a dry-run import preview against the canonical product catalog
 * and existing database price observations without mutating production state.
 */
export function generateDryRunImportPreview(
  incomingRecords: ExternalPriceInputRecord[],
  catalog: CanonicalProductRef[],
  existingObservations: ExistingObservationSnapshot[]
): DryRunImportPreviewResult {
  // 1. Build existing observation keys set
  const existingKeySet = new Set<string>();
  for (const obs of existingObservations) {
    const dateOnly = obs.observedAt.slice(0, 10);
    existingKeySet.add(`${obs.productId}|${obs.state}|${obs.marketName}|${obs.unit}|${dateOnly}`);
  }

  const validRows: PreviewValidationItem[] = [];
  const rejectedRows: PreviewValidationItem[] = [];
  const duplicateRows: PreviewValidationItem[] = [];
  const conflictRows: PreviewValidationItem[] = [];
  const unmappedCommodities = new Set<string>();
  const sourceBreakdown: Record<string, number> = {};
  const coveredProductIds = new Set<string>();

  // In-batch key tracking to prevent duplicates within the incoming payload
  const batchSeenKeys = new Set<string>();

  for (const record of incomingRecords) {
    sourceBreakdown[record.publisher] = (sourceBreakdown[record.publisher] || 0) + 1;

    // Validate record
    const result = validateExternalPriceRecord(record, catalog, existingKeySet);

    // Track unmapped commodity names
    if (!result.canonicalProduct) {
      unmappedCommodities.add(record.rawCommodityName);
    } else {
      coveredProductIds.add(result.canonicalProduct.id);
    }

    // In-batch duplicate check
    if (result.status === "VALID" && result.canonicalProduct) {
      const dateOnly = record.observedAt.slice(0, 10);
      const batchKey = `${result.canonicalProduct.id}|${record.state}|${record.marketName}|${record.unit}|${dateOnly}`;
      if (batchSeenKeys.has(batchKey)) {
        result.status = "DUPLICATE";
        result.reasons.push(`In-batch duplicate: record already appears earlier in this import payload.`);
      } else {
        batchSeenKeys.add(batchKey);
      }
    }

    // Conflict check: if an observation already exists on the same date with > 50% price difference
    if (result.canonicalProduct) {
      const dateOnly = record.observedAt.slice(0, 10);
      const matchingExisting = existingObservations.find(
        (o) =>
          o.productId === result.canonicalProduct?.id &&
          o.state.toLowerCase() === record.state.toLowerCase() &&
          o.marketName.toLowerCase() === record.marketName.toLowerCase() &&
          o.unit.toLowerCase() === record.unit.toLowerCase() &&
          o.observedAt.slice(0, 10) === dateOnly
      );

      if (matchingExisting && Math.abs(matchingExisting.price - record.price) / matchingExisting.price > 0.5) {
        result.status = "CONFLICT";
        result.reasons.push(
          `Price conflict: Existing observation has ₦${matchingExisting.price}, while incoming external record has ₦${record.price} (>50% divergence).`
        );
      }
    }

    // Partition results
    switch (result.status) {
      case "VALID":
        validRows.push(result);
        break;
      case "REJECTED":
        rejectedRows.push(result);
        break;
      case "DUPLICATE":
        duplicateRows.push(result);
        break;
      case "CONFLICT":
        conflictRows.push(result);
        break;
      case "STALE":
        // Stale records are kept in valid but flagged
        validRows.push(result);
        break;
    }
  }

  return {
    summary: {
      totalEvaluated: incomingRecords.length,
      totalValid: validRows.filter((r) => r.status === "VALID").length,
      totalRejected: rejectedRows.length,
      totalDuplicates: duplicateRows.length,
      totalStale: validRows.filter((r) => r.status === "STALE").length,
      totalConflicts: conflictRows.length,
      productCoverageCount: coveredProductIds.size,
      sourceBreakdown,
    },
    validRows,
    rejectedRows,
    duplicateRows,
    conflictRows,
    unmappedCommodities: Array.from(unmappedCommodities),
  };
}
