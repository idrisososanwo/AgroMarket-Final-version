/**
 * Demand Unit Normalization and Consistency Module
 *
 * Enforces mathematical and physical consistency across agricultural units:
 * 1. Mass/Weight quantities are deterministically normalized to canonical KG.
 * 2. Liquid/Volume quantities are deterministically normalized to canonical LITRE.
 * 3. Indeterminate, discrete, or variable packaging units (e.g. Crate, Basket, Bunch, Head, Piece)
 *    are recognized as non-convertible; conversions are strictly NOT invented.
 * 4. Combines compatible quantities accurately (e.g. 20 × 50kg bag + 500kg + 10 × 25kg bag = 1,750kg, NOT 530 units).
 */

export interface NormalizedDemandQuantity {
  /** The quantity converted into the canonical or requested unit, or null if incompatible */
  normalizedQuantity: number | null;
  /** The canonical unit (e.g. KG, LITRE, CRATE) */
  canonicalUnit: string;
  /** True if the source unit could be safely and deterministically converted to target unit */
  isCompatible: boolean;
  /** Exact 1:1 match, Normalized via deterministic multiplier, or Incompatible */
  status: "EXACT" | "NORMALIZED" | "INCOMPATIBLE";
  /** The multiplier applied to source quantity (e.g. 50 for 50kg bag -> KG) */
  conversionFactor?: number;
}

interface UnitDefinition {
  family: "MASS" | "VOLUME" | "DISCRETE";
  canonicalUnit: string;
  multiplier: number; // Multiplier to reach the family's canonical base (KG for MASS, LITRE for VOLUME)
}

const UNIT_REGISTRY: Record<string, UnitDefinition> = {
  // Mass-based units (canonical: KG)
  "kg": { family: "MASS", canonicalUnit: "KG", multiplier: 1 },
  "kilogram": { family: "MASS", canonicalUnit: "KG", multiplier: 1 },
  "kilogram (kg)": { family: "MASS", canonicalUnit: "KG", multiplier: 1 },
  "gram": { family: "MASS", canonicalUnit: "KG", multiplier: 0.001 },
  "g": { family: "MASS", canonicalUnit: "KG", multiplier: 0.001 },
  "25kg bag": { family: "MASS", canonicalUnit: "KG", multiplier: 25 },
  "25kg_bag": { family: "MASS", canonicalUnit: "KG", multiplier: 25 },
  "bag_25kg": { family: "MASS", canonicalUnit: "KG", multiplier: 25 },
  "50kg bag": { family: "MASS", canonicalUnit: "KG", multiplier: 50 },
  "50kg_bag": { family: "MASS", canonicalUnit: "KG", multiplier: 50 },
  "bag_50kg": { family: "MASS", canonicalUnit: "KG", multiplier: 50 },
  "100kg bag": { family: "MASS", canonicalUnit: "KG", multiplier: 100 },
  "100kg_bag": { family: "MASS", canonicalUnit: "KG", multiplier: 100 },
  "bag_100kg": { family: "MASS", canonicalUnit: "KG", multiplier: 100 },
  "tonne": { family: "MASS", canonicalUnit: "KG", multiplier: 1000 },
  "tonne (mt)": { family: "MASS", canonicalUnit: "KG", multiplier: 1000 },
  "mt": { family: "MASS", canonicalUnit: "KG", multiplier: 1000 },

  // Volume-based units (canonical: LITRE)
  "litre": { family: "VOLUME", canonicalUnit: "LITRE", multiplier: 1 },
  "liter": { family: "VOLUME", canonicalUnit: "LITRE", multiplier: 1 },
  "l": { family: "VOLUME", canonicalUnit: "LITRE", multiplier: 1 },
  "gallon (25l)": { family: "VOLUME", canonicalUnit: "LITRE", multiplier: 25 },
  "25l_keg": { family: "VOLUME", canonicalUnit: "LITRE", multiplier: 25 },
  "25l keg": { family: "VOLUME", canonicalUnit: "LITRE", multiplier: 25 },

  // Discrete / non-convertible units (canonical: discrete identity)
  "crate": { family: "DISCRETE", canonicalUnit: "CRATE", multiplier: 1 },
  "basket": { family: "DISCRETE", canonicalUnit: "BASKET", multiplier: 1 },
  "bunch": { family: "DISCRETE", canonicalUnit: "BUNCH", multiplier: 1 },
  "piece": { family: "DISCRETE", canonicalUnit: "PIECE", multiplier: 1 },
  "head": { family: "DISCRETE", canonicalUnit: "HEAD", multiplier: 1 },
  "live animal / head": { family: "DISCRETE", canonicalUnit: "HEAD", multiplier: 1 },
  "bird": { family: "DISCRETE", canonicalUnit: "BIRD", multiplier: 1 },
  "tuber": { family: "DISCRETE", canonicalUnit: "TUBER", multiplier: 1 },
  "tuber_100": { family: "DISCRETE", canonicalUnit: "TUBER_100", multiplier: 1 },
  "carton": { family: "DISCRETE", canonicalUnit: "CARTON", multiplier: 1 },
};

function normalizeUnitString(unit: string): string {
  return unit.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolves the canonical demand unit for a commodity product based on its default unit.
 * For instance, '50KG_BAG', '100KG_BAG', or 'TONNE' resolve to 'KG'.
 * '25L_KEG' resolves to 'LITRE'.
 * Discrete packaging like 'CRATE' or 'HEAD' resolve to their discrete identity.
 */
export function resolveCanonicalDemandUnit(rawUnit: string): string {
  const normalized = normalizeUnitString(rawUnit);
  const entry = UNIT_REGISTRY[normalized];
  if (entry) {
    return entry.canonicalUnit;
  }
  // Default to uppercase raw unit if unlisted discrete
  return rawUnit.trim().toUpperCase();
}

/**
 * Normalizes a raw transaction quantity with a given unit into a target canonical unit.
 *
 * Example:
 * - (20, "50kg Bag", "KG") -> normalizedQuantity: 1000, isCompatible: true
 * - (500, "KG", "KG")      -> normalizedQuantity: 500,  isCompatible: true
 * - (10, "25kg Bag", "KG") -> normalizedQuantity: 250,  isCompatible: true
 * - (5, "Crate", "KG")     -> normalizedQuantity: null, isCompatible: false
 */
export function normalizeDemandQuantity(
  quantity: number,
  sourceUnit: string,
  targetUnit?: string
): NormalizedDemandQuantity {
  if (quantity < 0 || !Number.isFinite(quantity)) {
    return {
      normalizedQuantity: null,
      canonicalUnit: sourceUnit,
      isCompatible: false,
      status: "INCOMPATIBLE",
    };
  }

  const normSource = normalizeUnitString(sourceUnit);
  const sourceDef = UNIT_REGISTRY[normSource];

  const targetCanonical = targetUnit
    ? resolveCanonicalDemandUnit(targetUnit)
    : sourceDef
    ? sourceDef.canonicalUnit
    : sourceUnit.trim().toUpperCase();

  // If source is not in the registry, check exact string match
  if (!sourceDef) {
    const isDirectMatch = normSource === normalizeUnitString(targetCanonical);
    return {
      normalizedQuantity: isDirectMatch ? quantity : null,
      canonicalUnit: targetCanonical,
      isCompatible: isDirectMatch,
      status: isDirectMatch ? "EXACT" : "INCOMPATIBLE",
      conversionFactor: isDirectMatch ? 1 : undefined,
    };
  }

  // If source and target belong to the same physical family:
  if (sourceDef.canonicalUnit === targetCanonical) {
    const canonicalQuantity = Number((quantity * sourceDef.multiplier).toFixed(4));
    const isExact = sourceDef.multiplier === 1;

    return {
      normalizedQuantity: canonicalQuantity,
      canonicalUnit: targetCanonical,
      isCompatible: true,
      status: isExact ? "EXACT" : "NORMALIZED",
      conversionFactor: sourceDef.multiplier,
    };
  }

  // Cross-family or discrete mismatch (e.g. MASS vs VOLUME, or CRATE vs KG)
  // Strictly avoid inventing conversions
  return {
    normalizedQuantity: null,
    canonicalUnit: targetCanonical,
    isCompatible: false,
    status: "INCOMPATIBLE",
  };
}

export interface DemandAggregationResult {
  totalVolume: number;
  sampleCount: number;
  incompatibleCount: number;
  incompatibleUnits: string[];
  canonicalUnit: string;
}

/**
 * Aggregates order item quantities into a single canonical volume standard,
 * strictly rejecting incompatible units from being mixed into the volume sum.
 */
export function aggregateDemandQuantities(
  items: Array<{ quantity: number; unit: string }>,
  targetUnit: string
): DemandAggregationResult {
  const canonicalUnit = resolveCanonicalDemandUnit(targetUnit);
  let totalVolume = 0;
  let sampleCount = 0;
  let incompatibleCount = 0;
  const incompatibleUnitsSet = new Set<string>();

  for (const item of items) {
    const norm = normalizeDemandQuantity(Number(item.quantity), item.unit, canonicalUnit);

    if (norm.isCompatible && norm.normalizedQuantity !== null) {
      totalVolume += norm.normalizedQuantity;
      sampleCount++;
    } else {
      incompatibleCount++;
      incompatibleUnitsSet.add(item.unit);
    }
  }

  return {
    totalVolume: Number(totalVolume.toFixed(2)),
    sampleCount,
    incompatibleCount,
    incompatibleUnits: Array.from(incompatibleUnitsSet),
    canonicalUnit,
  };
}
