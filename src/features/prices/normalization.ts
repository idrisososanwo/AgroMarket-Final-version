import { NormalizationStatus, PriceNormalizationResult } from "./types";

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
  "kg": { baseUnit: "KG", multiplier: 1, status: "EXACT" },
  "KG": { baseUnit: "KG", multiplier: 1, status: "EXACT" },
  "gram": { baseUnit: "KG", multiplier: 0.001, status: "NORMALIZED" },
  "100kg Bag": { baseUnit: "KG", multiplier: 100, status: "NORMALIZED" },
  "100KG_BAG": { baseUnit: "KG", multiplier: 100, status: "NORMALIZED" },
  "BAG_100KG": { baseUnit: "KG", multiplier: 100, status: "NORMALIZED" },
  "50kg Bag": { baseUnit: "KG", multiplier: 50, status: "NORMALIZED" },
  "50KG_BAG": { baseUnit: "KG", multiplier: 50, status: "NORMALIZED" },
  "BAG_50KG": { baseUnit: "KG", multiplier: 50, status: "NORMALIZED" },
  "25kg Bag": { baseUnit: "KG", multiplier: 25, status: "NORMALIZED" },
  "25KG_BAG": { baseUnit: "KG", multiplier: 25, status: "NORMALIZED" },
  "Tonne (MT)": { baseUnit: "KG", multiplier: 1000, status: "NORMALIZED" },
  "TONNE": { baseUnit: "KG", multiplier: 1000, status: "NORMALIZED" },

  // Liquid-based units (normalized to LITRE)
  "Litre": { baseUnit: "LITRE", multiplier: 1, status: "EXACT" },
  "litre": { baseUnit: "LITRE", multiplier: 1, status: "EXACT" },
  "LITRE": { baseUnit: "LITRE", multiplier: 1, status: "EXACT" },
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
