/**
 * AgroMarket Phase 3.13: Agricultural Knowledge Graph Validation & Guardrails
 */

import { z } from "zod";
import {
  KNOWLEDGE_CONCEPT_TYPES,
  KNOWLEDGE_RELATIONSHIP_TYPES,
  KNOWLEDGE_QUALITY_STATUSES,
  KNOWLEDGE_PROVENANCES,
  KNOWLEDGE_CONFIDENCES,
  KNOWLEDGE_GEOGRAPHIC_SCOPES,
  RELATIONSHIP_STRENGTHS,
  LINKED_ENTITY_TYPES,
  ENTITY_LINK_NATURES,
} from "./types";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  DEFAULT_MAX_HIERARCHY_DEPTH,
  ABSOLUTE_MAX_HIERARCHY_DEPTH,
  DEFAULT_MAX_NEIGHBORHOOD_DEPTH,
  ABSOLUTE_MAX_NEIGHBORHOOD_DEPTH,
  DEFAULT_MAX_NEIGHBORHOOD_NODES,
  ABSOLUTE_MAX_NEIGHBORHOOD_NODES,
} from "./constants";

// -----------------------------------------------------------------------------
// 1. STRICT ANTI-PORK INVARIANT
// -----------------------------------------------------------------------------

const PROHIBITED_PRODUCE_REGEX = /\b(pork|swine|pig|bacon|ham|porcine)\b/i;

export function assertNoProhibitedProduceKnowledge(
  text: string | null | undefined,
  contextLabel = "Knowledge Input"
): void {
  if (!text) return;
  if (PROHIBITED_PRODUCE_REGEX.test(text)) {
    throw new Error(
      `Zero-tolerance policy violation: Prohibited produce detected in ${contextLabel}. ` +
      `AgroMarket strictly excludes pork, swine, pig, and derived byproducts across all ontologies.`
    );
  }
}

// -----------------------------------------------------------------------------
// 2. CONCEPT VALIDATION SCHEMA
// -----------------------------------------------------------------------------

export const createKnowledgeConceptInputSchema = z
  .object({
    conceptKey: z
      .string()
      .min(2, "Concept key must have at least 2 characters")
      .max(120, "Concept key must not exceed 120 characters")
      .regex(/^[a-z0-9_:-]+$/i, "Concept key must be alphanumeric with dashes, underscores, or colons"),
    canonicalName: z
      .string()
      .min(2, "Canonical name must have at least 2 characters")
      .max(150, "Canonical name must not exceed 150 characters"),
    displayName: z
      .string()
      .min(2, "Display name must have at least 2 characters")
      .max(150, "Display name must not exceed 150 characters"),
    conceptType: z.enum(KNOWLEDGE_CONCEPT_TYPES),
    description: z.string().max(2000, "Description must not exceed 2000 characters").nullish(),
    parentConceptId: z.string().uuid("Parent concept ID must be a valid UUID").nullish(),
    status: z.enum(KNOWLEDGE_QUALITY_STATUSES).default("DRAFT"),
    provenance: z.enum(KNOWLEDGE_PROVENANCES).default("EDITORIAL"),
    confidence: z.enum(KNOWLEDGE_CONFIDENCES).default("HIGH"),
    geographicScope: z.enum(KNOWLEDGE_GEOGRAPHIC_SCOPES).default("NATIONAL"),
    sourceReference: z.string().max(500, "Source reference must not exceed 500 characters").nullish(),
    metadata: z.record(z.unknown()).default({}),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().nullish(),
  })
  .superRefine((data, ctx) => {
    // 1. Anti-pork checks
    try {
      assertNoProhibitedProduceKnowledge(data.conceptKey, "Concept Key");
      assertNoProhibitedProduceKnowledge(data.canonicalName, "Canonical Name");
      assertNoProhibitedProduceKnowledge(data.displayName, "Display Name");
      assertNoProhibitedProduceKnowledge(data.description, "Description");
    } catch (err: unknown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err instanceof Error ? err.message : "Prohibited produce detected.",
        path: ["canonicalName"],
      });
    }

    // 2. Temporal validity
    if (data.validFrom && data.validUntil) {
      const fromTime = new Date(data.validFrom).getTime();
      const untilTime = new Date(data.validUntil).getTime();
      if (untilTime < fromTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "validUntil must be after validFrom",
          path: ["validUntil"],
        });
      }
    }
  });

// -----------------------------------------------------------------------------
// 3. RELATIONSHIP VALIDATION SCHEMA
// -----------------------------------------------------------------------------

export const createKnowledgeRelationshipInputSchema = z
  .object({
    sourceConceptId: z.string().uuid("Source concept ID must be a valid UUID"),
    relationshipType: z.enum(KNOWLEDGE_RELATIONSHIP_TYPES),
    targetConceptId: z.string().uuid("Target concept ID must be a valid UUID"),
    inverseRelationshipType: z.string().nullish(),
    relationshipStrength: z.enum(RELATIONSHIP_STRENGTHS).default("MODERATE"),
    confidence: z.enum(KNOWLEDGE_CONFIDENCES).default("HIGH"),
    provenance: z.enum(KNOWLEDGE_PROVENANCES).default("EDITORIAL"),
    geographicScope: z.enum(KNOWLEDGE_GEOGRAPHIC_SCOPES).default("NATIONAL"),
    locationState: z.enum(NIGERIAN_STATES).or(z.string()).nullish(),
    locationLga: z.string().nullish(),
    status: z.enum(KNOWLEDGE_QUALITY_STATUSES).default("PUBLISHED"),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().nullish(),
    metadata: z.record(z.unknown()).default({}),
  })
  .superRefine((data, ctx) => {
    // 1. Self-reference check
    if (data.sourceConceptId === data.targetConceptId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Source concept and target concept must be different (no self-loops)",
        path: ["targetConceptId"],
      });
    }

    // 2. Temporal validity
    if (data.validFrom && data.validUntil) {
      const fromTime = new Date(data.validFrom).getTime();
      const untilTime = new Date(data.validUntil).getTime();
      if (untilTime < fromTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "validUntil must be after validFrom",
          path: ["validUntil"],
        });
      }
    }
  });

// -----------------------------------------------------------------------------
// 4. ENTITY LINK VALIDATION SCHEMA
// -----------------------------------------------------------------------------

export const createEntityLinkInputSchema = z.object({
  conceptId: z.string().uuid("Concept ID must be a valid UUID"),
  entityType: z.enum(LINKED_ENTITY_TYPES),
  entityId: z.string().min(1, "Entity ID must be provided"),
  linkNature: z.enum(ENTITY_LINK_NATURES).default("CANONICAL"),
  confidence: z.enum(KNOWLEDGE_CONFIDENCES).default("HIGH"),
  provenance: z.enum(KNOWLEDGE_PROVENANCES).default("EDITORIAL"),
  metadata: z.record(z.unknown()).default({}),
});

// -----------------------------------------------------------------------------
// 5. TRAVERSAL QUERY INPUT SCHEMAS
// -----------------------------------------------------------------------------

export const traverseHierarchyInputSchema = z.object({
  rootConceptId: z.string().uuid("Root concept ID must be a valid UUID"),
  direction: z.enum(["ANCESTORS", "DESCENDANTS"]).default("DESCENDANTS"),
  maxDepth: z
    .number()
    .int()
    .min(1)
    .max(ABSOLUTE_MAX_HIERARCHY_DEPTH)
    .default(DEFAULT_MAX_HIERARCHY_DEPTH),
  includeHistorical: z.boolean().default(false),
});

export const traverseNeighborhoodInputSchema = z.object({
  conceptId: z.string().uuid("Concept ID must be a valid UUID"),
  maxDepth: z
    .number()
    .int()
    .min(1)
    .max(ABSOLUTE_MAX_NEIGHBORHOOD_DEPTH)
    .default(DEFAULT_MAX_NEIGHBORHOOD_DEPTH),
  limit: z
    .number()
    .int()
    .min(1)
    .max(ABSOLUTE_MAX_NEIGHBORHOOD_NODES)
    .default(DEFAULT_MAX_NEIGHBORHOOD_NODES),
  relationshipTypeFilter: z.array(z.enum(KNOWLEDGE_RELATIONSHIP_TYPES)).optional(),
  includeHistorical: z.boolean().default(false),
});
