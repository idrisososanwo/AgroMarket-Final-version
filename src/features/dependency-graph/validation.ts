/**
 * AgroMarket Phase 3.12: Agricultural Dependency Graph Validation
 *
 * Enforces:
 * - Anti-pork invariant with zero-tolerance across all dependency inputs
 * - Valid node and relationship types
 * - Temporal validity logic (validFrom <= validUntil)
 * - Safe numeric bounds for flow shares (0% - 100%)
 */

import { z } from "zod";
import { assertNoProhibitedProduce } from "@/features/intelligence-governance/validation";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  DEPENDENCY_NODE_TYPES,
  DEPENDENCY_RELATIONSHIP_TYPES,
  RELATIONSHIP_NATURES,
  DEPENDENCY_STRENGTHS,
  DEPENDENCY_CONFIDENCES,
  DEPENDENCY_PROVENANCES,
  DEPENDENCY_GEOGRAPHIC_SCOPES,
} from "./types";
import { ABSOLUTE_MAX_TRAVERSAL_DEPTH } from "./constants";

// -----------------------------------------------------------------------------
// 1. ANTI-PORK DOMAIN ASSERTION
// -----------------------------------------------------------------------------
export function assertNoProhibitedProduceDependency(
  commodity: string | null | undefined,
  context: string = "Dependency Invariant"
): void {
  if (commodity) {
    assertNoProhibitedProduce(commodity, context);
  }
}

// -----------------------------------------------------------------------------
// 2. SCHEMAS
// -----------------------------------------------------------------------------

export const createDependencyRelationshipInputSchema = z
  .object({
    sourceNodeType: z.enum(DEPENDENCY_NODE_TYPES),
    sourceNodeId: z.string().min(1, "Source node ID is required").max(128),
    relationshipType: z.enum(DEPENDENCY_RELATIONSHIP_TYPES),
    targetNodeType: z.enum(DEPENDENCY_NODE_TYPES),
    targetNodeId: z.string().min(1, "Target node ID is required").max(128),
    relationshipNature: z.enum(RELATIONSHIP_NATURES).default("DEPENDENCY"),
    dependencyStrength: z.enum(DEPENDENCY_STRENGTHS).default("INSUFFICIENT_DATA"),
    confidence: z.enum(DEPENDENCY_CONFIDENCES).default("MODERATE"),
    provenance: z.enum(DEPENDENCY_PROVENANCES).default("DERIVED"),
    commodity: z.string().max(100).optional().nullable(),
    geographicScope: z.enum(DEPENDENCY_GEOGRAPHIC_SCOPES).default("STATE"),
    locationState: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => !val || (NIGERIAN_STATES as readonly string[]).includes(val),
        "Invalid Nigerian state"
      ),
    locationLga: z.string().max(100).optional().nullable(),
    flowShare: z.number().min(0).max(100).optional().nullable(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional().nullable(),
    metadata: z.record(z.unknown()).default({}),
  })
  .superRefine((data, ctx) => {
    if (data.commodity) {
      try {
        assertNoProhibitedProduceDependency(data.commodity, "Relationship Commodity");
      } catch (err: unknown) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            err instanceof Error
              ? err.message
              : "Anti-Pork Policy Violation: Prohibited porcine commodity in dependency relationship.",
          path: ["commodity"],
        });
      }
    }

    if (data.sourceNodeType === data.targetNodeType && data.sourceNodeId === data.targetNodeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Self-referential dependency relationship is invalid.",
        path: ["targetNodeId"],
      });
    }

    if (data.validFrom && data.validUntil) {
      const from = new Date(data.validFrom).getTime();
      const until = new Date(data.validUntil).getTime();
      if (until < from) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "validUntil timestamp cannot precede validFrom timestamp.",
          path: ["validUntil"],
        });
      }
    }
  });

export const traverseDependencyCascadeInputSchema = z
  .object({
    rootNodeType: z.enum(DEPENDENCY_NODE_TYPES),
    rootNodeId: z.string().min(1, "Root node ID is required").max(128),
    maxDepth: z.number().int().min(1).max(ABSOLUTE_MAX_TRAVERSAL_DEPTH).default(3),
    commodity: z.string().max(100).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.commodity) {
      try {
        assertNoProhibitedProduceDependency(data.commodity, "Cascade Commodity Filter");
      } catch (err: unknown) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            err instanceof Error
              ? err.message
              : "Anti-Pork Policy Violation: Prohibited commodity filter in cascade traversal.",
          path: ["commodity"],
        });
      }
    }
  });

export const assessConcentrationInputSchema = z
  .object({
    subjectType: z.enum(DEPENDENCY_NODE_TYPES),
    subjectId: z.string().min(1, "Subject ID is required").max(128),
    concentrationType: z.enum(["SUPPLIER", "PROCESSING", "CORRIDOR", "REGIONAL"]),
    commodity: z.string().max(100).optional().nullable(),
    locationState: z
      .string()
      .optional()
      .nullable()
      .refine(
        (val) => !val || (NIGERIAN_STATES as readonly string[]).includes(val),
        "Invalid Nigerian state"
      ),
  })
  .superRefine((data, ctx) => {
    if (data.commodity) {
      try {
        assertNoProhibitedProduceDependency(data.commodity, "Concentration Assessment Commodity");
      } catch (err: unknown) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            err instanceof Error
              ? err.message
              : "Anti-Pork Policy Violation: Prohibited commodity in concentration assessment.",
          path: ["commodity"],
        });
      }
    }
  });
