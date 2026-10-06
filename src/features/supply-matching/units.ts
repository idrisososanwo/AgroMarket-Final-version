/**
 * AgroMarket Phase 2.6: Supply & Demand Unit Normalization
 *
 * Deterministic unit compatibility checks ensuring physical consistency:
 * 1. Safe normalization for mass units (KG, TONNES, GRAMS, 50KG BAG, 25KG BAG, 100KG BAG).
 * 2. Safe normalization for liquid/volume units (LITRE, 25L KEG).
 * 3. Exact matching for discrete units (CRATE to CRATE, PIECE to PIECE, TUBER to TUBER).
 * 4. STRICT RULE: Does NOT invent conversions between discrete and mass units
 *    (e.g. crate of eggs or tubers to kg, or live animal to kg) unless an explicit
 *    canonical specification is defined.
 * 5. Returns INCOMPATIBLE_UNIT or INSUFFICIENT_DATA when conversion cannot be safely guaranteed.
 */

import {
  normalizeDemandQuantity,
  resolveCanonicalDemandUnit,
} from "@/features/demand/units";

export type UnitNormalizationStatus =
  | "EXACT"
  | "NORMALIZED"
  | "INCOMPATIBLE_UNIT"
  | "INSUFFICIENT_DATA";

export interface UnitCompatibilityResult {
  isCompatible: boolean;
  status: UnitNormalizationStatus;
  normalizedSupplyQuantity: number | null;
  targetUnit: string;
  conversionFactor?: number;
  reason?: string;
}

/**
 * Normalizes supply quantity against requested demand unit.
 *
 * Examples:
 * - 2 TONNES supply to KG demand -> 2,000 KG (Compatible, NORMALIZED)
 * - 500 KG supply to KG demand -> 500 KG (Compatible, EXACT)
 * - 10 x 50KG BAG supply to KG demand -> 500 KG (Compatible, NORMALIZED)
 * - 50 CRATES supply to KG demand -> null (Incompatible, INCOMPATIBLE_UNIT)
 */
export function normalizeSupplyToDemandUnit(
  supplyQuantity: number,
  supplyUnit: string,
  demandUnit: string
): UnitCompatibilityResult {
  if (!supplyUnit || !demandUnit || supplyQuantity == null || isNaN(supplyQuantity) || supplyQuantity < 0) {
    return {
      isCompatible: false,
      status: "INSUFFICIENT_DATA",
      normalizedSupplyQuantity: null,
      targetUnit: demandUnit || "UNKNOWN",
      reason: "Missing or invalid quantity or unit parameter",
    };
  }

  const sUnit = supplyUnit.trim().toLowerCase();
  const dUnit = demandUnit.trim().toLowerCase();

  // 1. Direct identical match
  if (sUnit === dUnit) {
    return {
      isCompatible: true,
      status: "EXACT",
      normalizedSupplyQuantity: supplyQuantity,
      targetUnit: demandUnit.toUpperCase(),
      conversionFactor: 1,
    };
  }

  const canonicalTarget = resolveCanonicalDemandUnit(demandUnit);
  const canonicalSupply = resolveCanonicalDemandUnit(supplyUnit);

  // 2. Both map to the same canonical unit (e.g. MASS -> KG, or VOLUME -> LITRE)
  if (canonicalSupply === canonicalTarget && (canonicalTarget === "KG" || canonicalTarget === "LITRE")) {
    const supplyInCanonical = normalizeDemandQuantity(supplyQuantity, supplyUnit, canonicalTarget);
    if (supplyInCanonical.isCompatible && supplyInCanonical.normalizedQuantity !== null) {
      // If demand was specified in canonical unit (e.g. KG)
      if (dUnit === canonicalTarget.toLowerCase()) {
        return {
          isCompatible: true,
          status: supplyInCanonical.status === "EXACT" ? "EXACT" : "NORMALIZED",
          normalizedSupplyQuantity: supplyInCanonical.normalizedQuantity,
          targetUnit: canonicalTarget,
          conversionFactor: supplyInCanonical.conversionFactor,
        };
      }

      // If demand was specified in non-canonical compatible unit (e.g. Tonnes vs 50kg bags)
      const demandInCanonical = normalizeDemandQuantity(1, demandUnit, canonicalTarget);
      if (demandInCanonical.isCompatible && demandInCanonical.normalizedQuantity && demandInCanonical.normalizedQuantity > 0) {
        const factor = 1 / demandInCanonical.normalizedQuantity;
        const normalized = Number((supplyInCanonical.normalizedQuantity * factor).toFixed(4));
        return {
          isCompatible: true,
          status: "NORMALIZED",
          normalizedSupplyQuantity: normalized,
          targetUnit: demandUnit.toUpperCase(),
          conversionFactor: factor,
        };
      }
    }
  }

  // 3. Discrete packaging unit matches discrete target
  if (canonicalSupply === canonicalTarget) {
    return {
      isCompatible: true,
      status: "EXACT",
      normalizedSupplyQuantity: supplyQuantity,
      targetUnit: canonicalTarget,
      conversionFactor: 1,
    };
  }

  // 4. Incompatible units (e.g. crates to kg, tubers to litres)
  return {
    isCompatible: false,
    status: "INCOMPATIBLE_UNIT",
    normalizedSupplyQuantity: null,
    targetUnit: demandUnit.toUpperCase(),
    reason: `Cannot safely convert ${supplyUnit} into ${demandUnit}. Agricultural packaging units cannot be arbitrarily converted to weight/volume without verified canonical packaging specs.`,
  };
}
