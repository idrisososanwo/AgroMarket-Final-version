import { NormalizationStatus, PriceNormalizationResult } from "./types";

export interface TradeUnitSpec {
  unit: string;
  displayName: string;
  category: "MASS" | "VOLUME" | "VARIABLE_TRADE" | "COUNT";
  baseUnit: string | null;
  multiplier: number | null;
  estimatedPhysicalQuantity: string;
  tradeContext: string;
}

/**
 * Authoritative trade specifications for agricultural trading units used across Nigerian markets.
 */
export const TRADE_UNIT_SPECS: Record<string, TradeUnitSpec> = {
  "100kg Bag": {
    unit: "100kg Bag",
    displayName: "100kg Grain Sack",
    category: "MASS",
    baseUnit: "KG",
    multiplier: 100,
    estimatedPhysicalQuantity: "100 kg standard commercial sack",
    tradeContext:
      "Wholesale grain benchmark across Dawanau (Kano), Giwa (Kaduna), and Bodija (Ibadan) for maize, cowpea, and sorghum.",
  },
  "50kg Bag": {
    unit: "50kg Bag",
    displayName: "50kg Woven Sack",
    category: "MASS",
    baseUnit: "KG",
    multiplier: 50,
    estimatedPhysicalQuantity: "50 kg standard woven polypropylene sack",
    tradeContext:
      "Standard wholesale packaging across Nigerian food markets for milled parboiled rice, white garri, and flour.",
  },
  "25kg Bag": {
    unit: "25kg Bag",
    displayName: "25kg Half-Sack",
    category: "MASS",
    baseUnit: "KG",
    multiplier: 25,
    estimatedPhysicalQuantity: "25 kg commercial half-sack",
    tradeContext:
      "Retail-wholesale bridge packaging popular for urban households, premium rice brands, and animal feed.",
  },
  "Kilogram (kg)": {
    unit: "Kilogram (kg)",
    displayName: "Kilogram (KG)",
    category: "MASS",
    baseUnit: "KG",
    multiplier: 1,
    estimatedPhysicalQuantity: "1 kg standardized weight",
    tradeContext:
      "Authoritative mass benchmark for fresh catfish, poultry meat, beef, and calibrated farm-gate produce.",
  },
  "Tonne (MT)": {
    unit: "Tonne (MT)",
    displayName: "Metric Tonne (1,000kg)",
    category: "MASS",
    baseUnit: "KG",
    multiplier: 1000,
    estimatedPhysicalQuantity: "1,000 kg bulk freight measurement",
    tradeContext:
      "Industrial off-take and bulk haulage unit for grain aggregators, animal feed millers, and export warehouses.",
  },
  Crate: {
    unit: "Crate",
    displayName: "Standard Wooden Crate",
    category: "VARIABLE_TRADE",
    baseUnit: null,
    multiplier: null,
    estimatedPhysicalQuantity: "Standard wooden crate (~40 – 45 kg for plum tomatoes)",
    tradeContext:
      "Dominant transit container for tomatoes and peppers moving from Jos and Kano irrigation clusters to southern terminal markets.",
  },
  Basket: {
    unit: "Basket",
    displayName: "Woven Raffia Basket",
    category: "VARIABLE_TRADE",
    baseUnit: null,
    multiplier: null,
    estimatedPhysicalQuantity: "Woven raffia basket (~25 – 30 kg depending on produce pack)",
    tradeContext:
      "Traditional open-air market trading container for Scotch bonnet (rodo), onions, and sweet potatoes.",
  },
  Bunch: {
    unit: "Bunch",
    displayName: "Harvested Bunch",
    category: "VARIABLE_TRADE",
    baseUnit: null,
    multiplier: null,
    estimatedPhysicalQuantity: "Single harvested stem (~15 – 25 kg)",
    tradeContext:
      "Primary farm-gate trade unit for plantains and bananas in Edo, Ondo, Ogun, and Cross River farming belts.",
  },
  "Piece / Head": {
    unit: "Piece / Head",
    displayName: "Single Tuber / Piece",
    category: "COUNT",
    baseUnit: null,
    multiplier: null,
    estimatedPhysicalQuantity: "Single produce unit (~3 – 5 kg for giant yams, ~1 – 2 kg for cabbage)",
    tradeContext:
      "Wholesale count unit for Benue and Niger yam tubers (typically traded in sets of 100 tubers or individual large pieces).",
  },
  Carton: {
    unit: "Carton",
    displayName: "Commercial Carton",
    category: "VARIABLE_TRADE",
    baseUnit: null,
    multiplier: null,
    estimatedPhysicalQuantity: "Standard packaging box (~10 – 20 kg)",
    tradeContext:
      "Common for processed agricultural items, packaged poultry cuts, imported fruits, and commercial farm mushrooms.",
  },
  "Gallon (25L)": {
    unit: "Gallon (25L)",
    displayName: "25L Jerrycan (Keg)",
    category: "VOLUME",
    baseUnit: "LITRE",
    multiplier: 25,
    estimatedPhysicalQuantity: "25 Litres volume (~23 kg mass for palm oil)",
    tradeContext:
      "Standard wholesale unit for crude and refined red palm oil and groundnut oil in eastern and midwest regional mills.",
  },
  Litre: {
    unit: "Litre",
    displayName: "Litre (Liquid Volume)",
    category: "VOLUME",
    baseUnit: "LITRE",
    multiplier: 1,
    estimatedPhysicalQuantity: "1 Litre exact liquid volume",
    tradeContext:
      "Canonical volumetric unit for consumer retail of cooking oils, liquid bio-fertilizers, and liquid extract.",
  },
  "Live Animal / Head": {
    unit: "Live Animal / Head",
    displayName: "Live Animal (Head)",
    category: "COUNT",
    baseUnit: null,
    multiplier: null,
    estimatedPhysicalQuantity: "Single live animal (mass varies by age, sex, and breed)",
    tradeContext:
      "Standard trading unit in livestock markets (Wudil, Potiskum, Zaki Biam, Maitatsine) for cattle, rams, and goats.",
  },
};

/**
 * Returns the trade unit specification for a produce unit.
 */
export function getTradeUnitSpec(unit: string): TradeUnitSpec {
  const trimmed = unit.trim();
  if (TRADE_UNIT_SPECS[trimmed]) {
    return TRADE_UNIT_SPECS[trimmed];
  }

  // Handle common aliases
  if (trimmed === "kg" || trimmed === "KG") return TRADE_UNIT_SPECS["Kilogram (kg)"];
  if (trimmed === "100KG_BAG" || trimmed === "BAG_100KG") return TRADE_UNIT_SPECS["100kg Bag"];
  if (trimmed === "50KG_BAG" || trimmed === "BAG_50KG") return TRADE_UNIT_SPECS["50kg Bag"];
  if (trimmed === "25KG_BAG") return TRADE_UNIT_SPECS["25kg Bag"];
  if (trimmed === "TONNE") return TRADE_UNIT_SPECS["Tonne (MT)"];
  if (trimmed === "litre" || trimmed === "LITRE") return TRADE_UNIT_SPECS["Litre"];
  if (trimmed === "25L_KEG") return TRADE_UNIT_SPECS["Gallon (25L)"];

  return {
    unit: trimmed,
    displayName: trimmed,
    category: "VARIABLE_TRADE",
    baseUnit: null,
    multiplier: null,
    estimatedPhysicalQuantity: "Standard agricultural trade packaging",
    tradeContext: "Regional trade unit observed in Nigerian agricultural commodity corridors.",
  };
}

/**
 * Deterministic unit conversion table for standard agricultural weights and volumes.
 * Maps produce units to a canonical base unit (KG for mass, LITRE for liquids)
 * and the multiplier representing how many base units are contained in one trade unit.
 */
const CANONICAL_CONVERSIONS: Record<
  string,
  { baseUnit: string; multiplier: number; status: NormalizationStatus }
> = {
  // Mass-based units (normalized to KG)
  "Kilogram (kg)": { baseUnit: "KG", multiplier: 1, status: "EXACT" },
  kg: { baseUnit: "KG", multiplier: 1, status: "EXACT" },
  KG: { baseUnit: "KG", multiplier: 1, status: "EXACT" },
  gram: { baseUnit: "KG", multiplier: 0.001, status: "NORMALIZED" },
  "100kg Bag": { baseUnit: "KG", multiplier: 100, status: "NORMALIZED" },
  "100KG_BAG": { baseUnit: "KG", multiplier: 100, status: "NORMALIZED" },
  BAG_100KG: { baseUnit: "KG", multiplier: 100, status: "NORMALIZED" },
  "50kg Bag": { baseUnit: "KG", multiplier: 50, status: "NORMALIZED" },
  "50KG_BAG": { baseUnit: "KG", multiplier: 50, status: "NORMALIZED" },
  BAG_50KG: { baseUnit: "KG", multiplier: 50, status: "NORMALIZED" },
  "25kg Bag": { baseUnit: "KG", multiplier: 25, status: "NORMALIZED" },
  "25KG_BAG": { baseUnit: "KG", multiplier: 25, status: "NORMALIZED" },
  "Tonne (MT)": { baseUnit: "KG", multiplier: 1000, status: "NORMALIZED" },
  TONNE: { baseUnit: "KG", multiplier: 1000, status: "NORMALIZED" },

  // Liquid-based units (normalized to LITRE)
  Litre: { baseUnit: "LITRE", multiplier: 1, status: "EXACT" },
  litre: { baseUnit: "LITRE", multiplier: 1, status: "EXACT" },
  LITRE: { baseUnit: "LITRE", multiplier: 1, status: "EXACT" },
  "Gallon (25L)": { baseUnit: "LITRE", multiplier: 25, status: "NORMALIZED" },
  "25L_KEG": { baseUnit: "LITRE", multiplier: 25, status: "NORMALIZED" },
};

/**
 * Normalizes a raw commodity trade price into a canonical unit price (e.g. NGN per KG or NGN per LITRE).
 *
 * If the unit has an indeterminate weight/volume (e.g. Basket, Crate, Bunch, Piece, Live Animal),
 * normalization is mathematically unsafe. In that scenario, returns `normalizedPrice = null`
 * and `status = 'UNAVAILABLE'` rather than guessing.
 */
export function normalizePrice(rawPrice: number, unit: string): PriceNormalizationResult {
  if (rawPrice <= 0 || !Number.isFinite(rawPrice)) {
    return {
      normalizedPrice: null,
      normalizedUnit: null,
      status: "UNAVAILABLE",
    };
  }

  const trimmedUnit = unit.trim();
  const conversion = CANONICAL_CONVERSIONS[trimmedUnit];

  if (!conversion) {
    // Inherently variable or uncalibrated units: Basket, Crate, Bunch, Piece, Head, Carton, etc.
    return {
      normalizedPrice: null,
      normalizedUnit: null,
      status: "UNAVAILABLE",
    };
  }

  // Price per canonical unit = rawPrice / multiplier
  // Example: ₦50,000 / 50kg bag -> ₦50,000 / 50 = ₦1,000 / kg
  const unitPrice = Number((rawPrice / conversion.multiplier).toFixed(2));

  return {
    normalizedPrice: unitPrice,
    normalizedUnit: conversion.baseUnit,
    status: conversion.status,
    conversionFactor: conversion.multiplier,
  };
}

/**
 * Calculates the equivalent trade packaging price from a normalized canonical price.
 * Example: ₦1,760 / KG -> ₦88,000 for a 50kg Bag.
 */
export function calculateTradeUnitEquivalent(
  normalizedPricePerBaseUnit: number | null,
  targetUnit: string
): number | null {
  if (normalizedPricePerBaseUnit === null || normalizedPricePerBaseUnit <= 0) return null;
  const spec = getTradeUnitSpec(targetUnit);
  if (!spec.multiplier || spec.multiplier <= 0) return null;
  return Math.round(normalizedPricePerBaseUnit * spec.multiplier);
}

