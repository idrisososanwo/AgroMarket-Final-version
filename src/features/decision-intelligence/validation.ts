/**
 * AgroMarket Phase 3.2: Agricultural Decision & Action Intelligence Validation
 * Strict Input Sanitization, Zod Schemas, and Anti-Pork Invariant Verification
 */

import { z } from "zod";
import {
  assertNoProhibitedProduce,
  containsProhibitedProduce,
  validateNigerianState,
} from "@/features/intelligence/validation";
import {
  ACTOR_ROLES,
  DIGEST_FREQUENCIES,
  GOVERNED_ACTION_TYPES,
  INTELLIGENCE_NOTIFICATION_CATEGORIES,
  RECOMMENDATION_TYPES,
  URGENCY_LEVELS,
  USER_DECISION_TYPES,
} from "./types";

export { assertNoProhibitedProduce, containsProhibitedProduce, validateNigerianState };

/**
 * Zod schema for recording a user decision
 */
export const recordUserDecisionSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendation ID format"),
  decision: z.enum(USER_DECISION_TYPES, {
    errorMap: () => ({ message: "Invalid user decision type." }),
  }),
  actorRole: z.string().min(2).max(50),
  decisionNotes: z
    .string()
    .max(2000)
    .optional()
    .refine((val) => !val || !containsProhibitedProduce(val), {
      message: "Decision notes contain prohibited produce terms (anti-pork policy violation).",
    }),
  reasoning: z
    .string()
    .max(2000)
    .optional()
    .refine((val) => !val || !containsProhibitedProduce(val), {
      message: "Reasoning contains prohibited produce terms (anti-pork policy violation).",
    }),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for recording a governed user action
 */
export const recordUserActionSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendation ID format"),
  decisionId: z.string().uuid("Invalid decision ID format").optional().nullable(),
  actionType: z.enum(GOVERNED_ACTION_TYPES, {
    errorMap: () => ({ message: "Invalid governed action type." }),
  }),
  actionPath: z.string().max(255).optional().nullable(),
  isExternal: z.boolean().default(false),
  verificationStatus: z
    .enum(["VERIFIED_PLATFORM", "USER_REPORTED", "PENDING_VERIFICATION"])
    .default("PENDING_VERIFICATION"),
  actionDetails: z.record(z.unknown()).optional(),
  notes: z
    .string()
    .max(2000)
    .optional()
    .refine((val) => !val || !containsProhibitedProduce(val), {
      message: "Action notes contain prohibited produce terms (anti-pork policy violation).",
    }),
});

/**
 * Zod schema for saving user intelligence preferences
 */
export const userIntelligencePreferencesSchema = z.object({
  primaryRole: z.enum(ACTOR_ROLES, {
    errorMap: () => ({ message: "Invalid actor role." }),
  }),
  preferredStates: z.array(z.string()).default([]),
  preferredLgas: z.array(z.string()).default([]),
  monitoredCommodities: z
    .array(z.string())
    .default([])
    .refine(
      (items) => items.every((c) => !containsProhibitedProduce(c)),
      {
        message: "Monitored commodities list contains prohibited produce (anti-pork violation).",
      }
    ),
  urgencyThreshold: z.enum(URGENCY_LEVELS).default("LOW"),
  minConfidence: z.number().min(0.0).max(1.0).default(0.5),
  notificationChannels: z.array(z.string()).default(["IN_APP"]),
  digestFrequency: z.enum(DIGEST_FREQUENCIES).default("DAILY"),
  mutedRecommendationTypes: z.array(z.enum(RECOMMENDATION_TYPES)).default([]),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for creating governed intelligence notifications
 */
export const createGovernedNotificationSchema = z.object({
  userId: z.string().uuid("Invalid target user ID"),
  type: z.enum(INTELLIGENCE_NOTIFICATION_CATEGORIES),
  channel: z.enum(["IN_APP", "SMS", "WHATSAPP", "EMAIL", "PUSH"]).default("IN_APP"),
  title: z
    .string()
    .min(3)
    .max(150)
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Notification title contains prohibited produce terms.",
    }),
  body: z
    .string()
    .min(5)
    .max(2000)
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Notification body contains prohibited produce terms.",
    }),
  actionUrl: z.string().max(255).optional().nullable(),
  severity: z.enum(URGENCY_LEVELS).default("MEDIUM"),
  source: z.string().max(100).optional(),
  evidenceReference: z.string().max(200).optional(),
  expiresAt: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for outcome evaluation recording
 */
export const recordOutcomeEvaluationSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendation ID"),
  decision: z.string().min(2).max(50),
  actionTaken: z
    .string()
    .min(2)
    .max(1000)
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Action taken contains prohibited produce terms.",
    }),
  observedOutcome: z
    .string()
    .min(2)
    .max(2000)
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Observed outcome contains prohibited produce terms.",
    }),
  expectedOutcome: z
    .string()
    .min(2)
    .max(2000)
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Expected outcome contains prohibited produce terms.",
    }),
  variance: z.string().max(500),
  evaluationScore: z.number().min(0.0).max(100.0),
  lessonsLearned: z
    .string()
    .min(2)
    .max(2000)
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Lessons learned contains prohibited produce terms.",
    }),
});

/**
 * Asserts that an entire recommendation payload satisfies anti-pork and privacy rules
 */
export function assertSafeRecommendationPayload(item: {
  title: string;
  summary: string;
  rationale?: string | null;
  limitations?: string | null;
  commodity?: string | null;
}): void {
  assertNoProhibitedProduce(item.title, "Recommendation Title");
  assertNoProhibitedProduce(item.summary, "Recommendation Summary");
  if (item.rationale) assertNoProhibitedProduce(item.rationale, "Recommendation Rationale");
  if (item.limitations) assertNoProhibitedProduce(item.limitations, "Recommendation Limitations");
  if (item.commodity) assertNoProhibitedProduce(item.commodity, "Recommendation Commodity");
}
