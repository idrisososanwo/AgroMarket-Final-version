/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search Privacy & Sanitization
 * Enforces zero leakage of personal identifiers, private locations, and confidential commercial pricing.
 */

import { AgriculturalSearchResult, AgriculturalSearchDocument } from "./types";

// -----------------------------------------------------------------------------
// 1. PRIVACY REGEX PATTERNS
// -----------------------------------------------------------------------------

// Nigerian phone numbers (+234, 080, 070, 090, 081, etc.)
const PHONE_NUMBER_REGEX = /(?:\+?234|0)[789][01]\d{8}/g;

// High precision lat/long coordinates (e.g. 6.524379, 3.379205)
const HIGH_PRECISION_COORDINATES_REGEX = /[-+]?\d{1,3}\.\d{4,}/g;

// Email addresses
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Bank account numbers (10 digits)
const NUBAN_ACCOUNT_REGEX = /\b\d{10}\b/g;

// -----------------------------------------------------------------------------
// 2. TEXT & SNIPPET SANITIZATION
// -----------------------------------------------------------------------------

/**
 * Strips phone numbers, high-precision GPS coordinates, email addresses, and bank accounts from text snippets.
 */
export function sanitizeSearchSnippet(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .replace(PHONE_NUMBER_REGEX, "[PHONE REDACTED]")
    .replace(HIGH_PRECISION_COORDINATES_REGEX, "[COORDINATES REDACTED]")
    .replace(EMAIL_REGEX, "[EMAIL REDACTED]")
    .replace(NUBAN_ACCOUNT_REGEX, (match) => {
      // Avoid redacting common year strings (e.g. 2024)
      if (match.length === 10) return "[ACCOUNT REDACTED]";
      return match;
    })
    .trim();
}

/**
 * Strips confidential operational or commercial properties from document/result metadata.
 */
export function sanitizeSearchMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!metadata) return {};

  const clean: Record<string, unknown> = {};
  const prohibitedKeys = [
    "phone",
    "phonenumber",
    "email",
    "price",
    "cost",
    "buyerprice",
    "sellerprice",
    "commercialprice",
    "targetprice",
    "gps",
    "latitude",
    "longitude",
    "exactaddress",
    "farmeraddress",
    "accountnumber",
    "bvn",
    "tin",
    "bankcode",
    "secret",
    "token",
  ];

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    const isProhibited = prohibitedKeys.some((p) => lowerKey.includes(p));
    if (!isProhibited) {
      if (typeof value === "string") {
        clean[key] = sanitizeSearchSnippet(value);
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        clean[key] = sanitizeSearchMetadata(value as Record<string, unknown>);
      } else {
        clean[key] = value;
      }
    }
  }

  return clean;
}

/**
 * Sanitizes an individual search result before public or client return.
 */
export function sanitizeSearchResult(
  result: AgriculturalSearchResult
): AgriculturalSearchResult {
  return {
    ...result,
    title: sanitizeSearchSnippet(result.title),
    sanitizedSnippet: sanitizeSearchSnippet(result.sanitizedSnippet),
    metadata: sanitizeSearchMetadata(result.metadata),
  };
}

/**
 * Sanitizes a raw search document before persistence or retrieval projection.
 */
export function sanitizeSearchDocument(
  doc: AgriculturalSearchDocument
): AgriculturalSearchDocument {
  return {
    ...doc,
    title: sanitizeSearchSnippet(doc.title),
    searchableText: sanitizeSearchSnippet(doc.searchableText),
    normalizedText: sanitizeSearchSnippet(doc.normalizedText),
    metadata: sanitizeSearchMetadata(doc.metadata),
  };
}
