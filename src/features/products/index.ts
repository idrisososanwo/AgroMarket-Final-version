/**
 * Products Domain Boundary
 * Manages agricultural product taxonomy, packaging units, and product listings.
 *
 * CRITICAL PRODUCT RULE:
 * Pig/pork products must NEVER be included in AgroMarket's product categories,
 * marketplace examples, Shared Purchase examples, recommendations, or seed data.
 */

export const PROHIBITED_KEYWORDS = [
  "pork",
  "pig",
  "swine",
  "hog",
  "bacon",
  "ham",
  "lard",
] as const;

export function isProhibitedProduct(title: string, category: string): boolean {
  const normalized = `${title} ${category}`.toLowerCase();
  return PROHIBITED_KEYWORDS.some((kw) => normalized.includes(kw));
}

export interface ProductCatalogItem {
  id: string;
  farmId: string;
  name: string;
  category: string;
  unit: string;
  isAvailable: boolean;
}
