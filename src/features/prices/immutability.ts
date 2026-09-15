import { PriceObservation } from "./types";

/**
 * Historical facts that are strictly immutable once a price observation is recorded.
 * Any attempt to mutate these fields (even by administrators) is strictly prohibited
 * at both application and database trigger levels.
 */
export const IMMUTABLE_PRICE_OBSERVATION_FACTS: ReadonlyArray<keyof PriceObservation> = [
  "id",
  "productId",
  "marketName",
  "state",
  "lga",
  "price",
  "currency",
  "unit",
  "normalizedPrice",
  "normalizedUnit",
  "normalizationStatus",
  "sourceType",
  "reportedBy",
  "observedAt",
  "createdAt",
];

export interface PriceObservationUpdateValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Enforces true append-only integrity for price observations:
 * 1. Rejects attempts to alter historical facts (commodity, location, price, unit, source, timestamps).
 * 2. Rejects attempts to promote SIMULATED observations to VERIFIED.
 * 3. Rejects attempts to alter the dataQualityLabel of SIMULATED observations.
 * 4. Allows only minimum necessary moderation updates (verificationStatus, confidenceScore, metadata).
 */
export function validatePriceObservationUpdate(
  current: PriceObservation,
  updates: Partial<PriceObservation>
): PriceObservationUpdateValidationResult {
  const errors: string[] = [];

  for (const field of IMMUTABLE_PRICE_OBSERVATION_FACTS) {
    if (field in updates && updates[field] !== undefined && updates[field] !== current[field]) {
      errors.push(`Cannot modify immutable historical observation fact: ${field}`);
    }
  }

  // Invariant: SIMULATED observations must never be promoted to VERIFIED
  if (current.dataQualityLabel === "SIMULATED" && updates.verificationStatus === "VERIFIED") {
    errors.push(
      "SIMULATED observations must never be promoted to VERIFIED. Record a new real observation instead."
    );
  }

  // Invariant: SIMULATED observations cannot alter their dataQualityLabel
  if (
    current.dataQualityLabel === "SIMULATED" &&
    updates.dataQualityLabel !== undefined &&
    updates.dataQualityLabel !== "SIMULATED"
  ) {
    errors.push(
      "SIMULATED price observation data quality label cannot be modified to circumvent integrity constraints."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
