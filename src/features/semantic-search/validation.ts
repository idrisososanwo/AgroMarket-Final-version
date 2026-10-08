/**
 * AgroMarket Phase 3.14: Agricultural Semantic Search Validation & Guardrails
 */

import { z } from "zod";
import {
  SEARCH_SOURCE_TYPES,
  SEARCH_VISIBILITY_STATUSES,
  SEARCH_PUBLICATION_STATUSES,
  TEMPORAL_SEARCH_MODES,
} from "./types";
import {
  KNOWLEDGE_PROVENANCES,
  KNOWLEDGE_CONFIDENCES,
  KNOWLEDGE_GEOGRAPHIC_SCOPES,
} from "@/features/knowledge-graph/types";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_LIMIT,
  MIN_SEARCH_LIMIT,
} from "./constants";

// -----------------------------------------------------------------------------
// 1. STRICT ANTI-PORK INVARIANT
// -----------------------------------------------------------------------------

const PROHIBITED_PRODUCE_REGEX = /\b(pork|swine|pig|bacon|ham|porcine)\b/i;

export function assertNoProhibitedProduceSearch(
  text: string | null | undefined,
  contextLabel = "Search Input"
): void {
  if (!text) return;
  if (PROHIBITED_PRODUCE_REGEX.test(text)) {
    throw new Error(
      `Zero-tolerance policy violation: Prohibited produce detected in ${contextLabel}. ` +
      `AgroMarket strictly excludes pork, swine, pig, and derived byproducts across all search queries and indexed records.`
    );
  }
}

// -----------------------------------------------------------------------------
// 2. SEARCH QUERY SCHEMA
// -----------------------------------------------------------------------------

export const searchQueryInputSchema = z
  .object({
    query: z
      .string()
      .min(MIN_QUERY_LENGTH, "Search query must not be empty")
      .max(MAX_QUERY_LENGTH, `Search query must not exceed ${MAX_QUERY_LENGTH} characters`),
    sourceTypes: z.array(z.enum(SEARCH_SOURCE_TYPES)).optional(),
    conceptTypes: z.array(z.string()).optional(),
    commodity: z.string().max(100).optional(),
    state: z.enum(NIGERIAN_STATES).or(z.string()).optional(),
    lga: z.string().max(100).optional(),
    confidence: z.enum(KNOWLEDGE_CONFIDENCES).optional(),
    provenance: z.enum(KNOWLEDGE_PROVENANCES).optional(),
    visibility: z.enum(SEARCH_VISIBILITY_STATUSES).default("PUBLIC"),
    publicationStatus: z.enum(SEARCH_PUBLICATION_STATUSES).default("PUBLISHED"),
    temporalMode: z.enum(TEMPORAL_SEARCH_MODES).default("CURRENT"),
    limit: z
      .number()
      .int()
      .min(MIN_SEARCH_LIMIT)
      .max(MAX_SEARCH_LIMIT)
      .default(DEFAULT_SEARCH_LIMIT),
    offset: z.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    try {
      assertNoProhibitedProduceSearch(data.query, "Search Query");
      if (data.commodity) {
        assertNoProhibitedProduceSearch(data.commodity, "Commodity Filter");
      }
    } catch (err: unknown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err instanceof Error ? err.message : "Prohibited produce detected.",
        path: ["query"],
      });
    }
  });

// -----------------------------------------------------------------------------
// 3. SEARCH DOCUMENT INDEXING SCHEMA
// -----------------------------------------------------------------------------

export const indexDocumentInputSchema = z
  .object({
    documentKey: z.string().min(3).max(150),
    sourceType: z.enum(SEARCH_SOURCE_TYPES),
    sourceEntityId: z.string().min(1).max(100),
    title: z.string().min(1).max(255),
    searchableText: z.string().min(1),
    normalizedText: z.string().optional(),
    conceptIds: z.array(z.string().uuid()).default([]),
    commodityTerms: z.array(z.string()).default([]),
    geographicScope: z.enum(KNOWLEDGE_GEOGRAPHIC_SCOPES).default("NATIONAL"),
    locationState: z.enum(NIGERIAN_STATES).or(z.string()).nullish(),
    locationLga: z.string().nullish(),
    sourceProvenance: z.enum(KNOWLEDGE_PROVENANCES).default("EDITORIAL"),
    confidence: z.enum(KNOWLEDGE_CONFIDENCES).default("HIGH"),
    visibilityStatus: z.enum(SEARCH_VISIBILITY_STATUSES).default("PUBLIC"),
    publicationStatus: z.enum(SEARCH_PUBLICATION_STATUSES).default("PUBLISHED"),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().nullish(),
    language: z.string().default("en"),
    metadata: z.record(z.unknown()).default({}),
  })
  .superRefine((data, ctx) => {
    try {
      assertNoProhibitedProduceSearch(data.title, "Document Title");
      assertNoProhibitedProduceSearch(data.searchableText, "Document Searchable Text");
      for (const term of data.commodityTerms) {
        assertNoProhibitedProduceSearch(term, "Commodity Term");
      }
    } catch (err: unknown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err instanceof Error ? err.message : "Prohibited produce detected.",
        path: ["title"],
      });
    }

    if (data.validFrom && data.validUntil) {
      const fromTime = new Date(data.validFrom).getTime();
      const untilTime = new Date(data.validUntil).getTime();
      if (untilTime < fromTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "validUntil must be greater than or equal to validFrom",
          path: ["validUntil"],
        });
      }
    }
  });
