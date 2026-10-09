/**
 * AgroMarket Phase 3.16: Agricultural Intelligence Notifications Validation
 * Zod Schemas and Zero-Tolerance Anti-Pork Assertions
 */

import { z } from "zod";
import {
  NOTIFICATION_CATEGORIES,
  ALERT_SEVERITIES,
  DELIVERY_CHANNELS,
} from "./types";
import {
  MAX_NOTIFICATION_TITLE_LENGTH,
  MAX_NOTIFICATION_BODY_LENGTH,
} from "./constants";
import { KNOWLEDGE_PROVENANCES, KNOWLEDGE_CONFIDENCES } from "@/features/knowledge-graph/types";
import { ACTOR_ROLES } from "@/features/decision-intelligence/types";

// -----------------------------------------------------------------------------
// 1. STRICT ANTI-PORK ZERO TOLERANCE ASSERTION
// -----------------------------------------------------------------------------

const PROHIBITED_PRODUCE_REGEX = /\b(pork|swine|pig|bacon|ham|porcine)\b/i;

export function assertNoProhibitedProduceNotification(
  data: unknown,
  contextLabel = "Notification Payload"
): void {
  if (data === null || data === undefined) return;

  if (typeof data === "string") {
    if (PROHIBITED_PRODUCE_REGEX.test(data)) {
      throw new Error(
        `[ANTI_PORK_VIOLATION] Zero-tolerance policy violation: Prohibited produce detected in ${contextLabel}. ` +
        `AgroMarket strictly excludes pork, swine, pig, and derived byproducts across all notifications and alerts.`
      );
    }
    return;
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) =>
      assertNoProhibitedProduceNotification(item, `${contextLabel}[${index}]`)
    );
    return;
  }

  if (typeof data === "object") {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      assertNoProhibitedProduceNotification(value, `${contextLabel}.${key}`);
    }
  }
}

export const VALID_AUDIENCE_ROLES = [
  ...ACTOR_ROLES,
  "COORDINATOR",
] as const;

export const targetAudienceSchema = z.object({
  roles: z.array(z.enum(VALID_AUDIENCE_ROLES)).optional(),
  states: z.array(z.string().min(2)).optional(),
  lgas: z.array(z.string().min(2)).optional(),
  commodities: z.array(z.string().min(2)).optional(),
  minUrgency: z.enum(ALERT_SEVERITIES).optional(),
}).superRefine((data, ctx) => {
  if (data.commodities) {
    for (const comm of data.commodities) {
      try {
        assertNoProhibitedProduceNotification(comm, "Target Commodity");
      } catch (err: unknown) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: err instanceof Error ? err.message : "Prohibited commodity term in audience filter.",
          path: ["commodities"],
        });
      }
    }
  }
});

// -----------------------------------------------------------------------------
// 3. INGEST ALERT EVENT SCHEMA
// -----------------------------------------------------------------------------

export const ingestAlertEventSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
  severity: z.enum(ALERT_SEVERITIES).default("INFO"),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters.")
    .max(MAX_NOTIFICATION_TITLE_LENGTH, `Title cannot exceed ${MAX_NOTIFICATION_TITLE_LENGTH} characters.`),
  message: z.string().max(MAX_NOTIFICATION_BODY_LENGTH).optional(),
  summary: z.string().max(MAX_NOTIFICATION_BODY_LENGTH).optional(),
  commodityName: z.string().max(100).optional(),
  sourceEntityType: z.string().default("AGRICULTURAL_INTELLIGENCE"),
  sourceReference: z.string().default("SRC-INTELLIGENCE"),
  sourceSystem: z.string().optional(),
  sourceProvenance: z.enum(KNOWLEDGE_PROVENANCES).default("OBSERVED"),
  confidenceLevel: z.enum(KNOWLEDGE_CONFIDENCES).default("MODERATE"),
  confidence: z.number().min(0).max(1).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  expiresAt: z.string().optional(),
  isHistorical: z.boolean().default(false),
  hasConflicts: z.boolean().default(false),
  conflictExplanation: z.string().max(500).optional(),
  targetAudience: targetAudienceSchema.optional(),
  deduplicationKey: z.string().max(120).optional(),
  idempotencyKey: z.string().max(120).optional(),
  actionUrl: z.string().max(250).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).superRefine((data, ctx) => {
  try {
    assertNoProhibitedProduceNotification(data.title, "Alert Title");
    if (data.summary) {
      assertNoProhibitedProduceNotification(data.summary, "Alert Summary");
    }
    if (data.message) {
      assertNoProhibitedProduceNotification(data.message, "Alert Message");
    }
    if (data.commodityName) {
      assertNoProhibitedProduceNotification(data.commodityName, "Commodity Name");
    }
    if (data.conflictExplanation) {
      assertNoProhibitedProduceNotification(data.conflictExplanation, "Conflict Explanation");
    }
  } catch (err: unknown) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: err instanceof Error ? err.message : "Prohibited produce detected.",
      path: ["title"],
    });
  }
});

export type IngestAlertEventValidated = z.infer<typeof ingestAlertEventSchema>;

// -----------------------------------------------------------------------------
// 4. NOTIFICATION QUERY FILTERS SCHEMA
// -----------------------------------------------------------------------------

export const notificationQueryFiltersSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES).optional(),
  severity: z.enum(ALERT_SEVERITIES).optional(),
  isRead: z.boolean().optional(),
  channel: z.enum(DELIVERY_CHANNELS).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export type NotificationQueryFiltersValidated = z.infer<typeof notificationQueryFiltersSchema>;

// -----------------------------------------------------------------------------
// 5. USER PREFERENCES SCHEMA
// -----------------------------------------------------------------------------

export const updateNotificationPreferencesSchema = z.object({
  enabledCategories: z.array(z.enum(NOTIFICATION_CATEGORIES)).default([...NOTIFICATION_CATEGORIES]),
  severityThreshold: z.enum(ALERT_SEVERITIES).default("INFO"),
  enabledChannels: z.array(z.enum(DELIVERY_CHANNELS)).default(["IN_APP"]),
  preferredStates: z.array(z.string()).default([]),
  preferredLgas: z.array(z.string()).default([]),
  monitoredCommodities: z.array(z.string()).default([]),
  quietHoursEnabled: z.boolean().default(false),
  quietHoursStartUtc: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietHoursEndUtc: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  optedOutCategories: z.array(z.enum(NOTIFICATION_CATEGORIES)).default([]),
}).superRefine((data, ctx) => {
  for (const comm of data.monitoredCommodities) {
    try {
      assertNoProhibitedProduceNotification(comm, "Monitored Commodity");
    } catch (err: unknown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err instanceof Error ? err.message : "Prohibited commodity term in preferences.",
        path: ["monitoredCommodities"],
      });
    }
  }
});

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
