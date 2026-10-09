/**
 * AgroMarket Phase 3.15: Evidence-Grounded Agricultural Intelligence & RAG Validation
 * Guardrails for input questions, anti-pork invariants, and LLM structured output parsing.
 */

import { z } from "zod";
import { RAG_QUESTION_CATEGORIES } from "./types";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { MAX_QUESTION_LENGTH, MIN_QUESTION_LENGTH } from "./constants";

// -----------------------------------------------------------------------------
// 1. STRICT ANTI-PORK INVARIANT
// -----------------------------------------------------------------------------

const PROHIBITED_PRODUCE_REGEX = /\b(pork|swine|pig|bacon|ham|porcine)\b/i;

export function assertNoProhibitedProduceRag(
  text: string | null | undefined,
  contextLabel = "Agricultural RAG Input"
): void {
  if (!text) return;
  if (PROHIBITED_PRODUCE_REGEX.test(text)) {
    throw new Error(
      `Zero-tolerance policy violation: Prohibited produce detected in ${contextLabel}. ` +
      `AgroMarket strictly excludes pork, swine, pig, and derived byproducts across all inquiries, evidence, and answers.`
    );
  }
}

// -----------------------------------------------------------------------------
// 2. RAG QUERY INPUT SCHEMA
// -----------------------------------------------------------------------------

export const ragQueryInputSchema = z
  .object({
    question: z
      .string()
      .min(MIN_QUESTION_LENGTH, "Question must not be empty or too short.")
      .max(MAX_QUESTION_LENGTH, `Question must not exceed ${MAX_QUESTION_LENGTH} characters.`),
    category: z.enum(RAG_QUESTION_CATEGORIES).default("GENERAL_AGRONOMIC"),
    state: z.enum(NIGERIAN_STATES).or(z.string()).optional(),
    lga: z.string().max(100).optional(),
    commodity: z.string().max(100).optional(),
    includeHistorical: z.boolean().default(false),
    maxEvidenceCount: z.number().int().min(1).max(10).default(8),
  })
  .superRefine((data, ctx) => {
    try {
      assertNoProhibitedProduceRag(data.question, "Question Input");
      if (data.commodity) {
        assertNoProhibitedProduceRag(data.commodity, "Commodity Filter");
      }
    } catch (err: unknown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err instanceof Error ? err.message : "Prohibited produce detected.",
        path: ["question"],
      });
    }
  });

export type RagQueryInput = z.infer<typeof ragQueryInputSchema>;

// -----------------------------------------------------------------------------
// 3. RAW MODEL OUTPUT SCHEMA
// -----------------------------------------------------------------------------

export const rawCitationOutputSchema = z.object({
  citationId: z.string(), // e.g. "[CIT-1]"
  evidenceId: z.string(), // e.g. "EVI-1"
  sourceTitle: z.string().optional(),
  supportingExcerpt: z.string().optional(),
});

export const rawConflictOutputSchema = z.object({
  topic: z.string(),
  primaryClaim: z.string(),
  conflictingClaim: z.string(),
  primarySource: z.string(),
  conflictingSource: z.string(),
  explanation: z.string(),
});

export const rawGeneratedAnswerSchema = z.object({
  summary: z.string().min(1),
  answer: z.string().min(1),
  keyPoints: z.array(z.string()).default([]),
  citations: z.array(rawCitationOutputSchema).default([]),
  limitations: z.array(z.string()).default([]),
  conflicts: z.array(rawConflictOutputSchema).default([]),
  needsProfessionalReview: z.boolean().default(false),
  professionalReviewNotice: z.string().optional(),
  insufficientEvidence: z.boolean().default(false),
});

export type RawGeneratedAnswer = z.infer<typeof rawGeneratedAnswerSchema>;
