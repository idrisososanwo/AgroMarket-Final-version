/**
 * AgroMarket Phase 3.17: Background Job Validation & Error Categorization
 * Zod Payload Schemas, Anti-Pork Assertions, and Privacy Sanitization
 */

import { z } from "zod";
import {
  DEFAULT_PRIORITY,
  DEFAULT_MAX_ATTEMPTS,
  ABSOLUTE_MAX_ATTEMPTS,
} from "./constants";
import { BACKGROUND_JOB_TYPES, JobErrorCategory } from "./types";
import { DELIVERY_CHANNELS } from "@/features/notifications/types";

// -----------------------------------------------------------------------------
// 1. STRICT ANTI-PORK ZERO TOLERANCE INVARIANT
// -----------------------------------------------------------------------------

const PROHIBITED_PRODUCE_REGEX = /\b(pork|swine|pig|bacon|ham|porcine|hog|boar|piglet|lard)\b/i;

export function assertNoProhibitedProduceBackgroundJob(
  data: unknown,
  contextLabel = "Background Job Payload"
): void {
  if (data === null || data === undefined) return;

  if (typeof data === "string") {
    if (PROHIBITED_PRODUCE_REGEX.test(data)) {
      throw new Error(
        `[ANTI_PORK_VIOLATION] Zero-tolerance policy violation: Prohibited produce detected in ${contextLabel}. ` +
        `AgroMarket strictly excludes pork, swine, pig, and derived byproducts across all background jobs and tasks.`
      );
    }
    return;
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) =>
      assertNoProhibitedProduceBackgroundJob(item, `${contextLabel}[${index}]`)
    );
    return;
  }

  if (typeof data === "object") {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      assertNoProhibitedProduceBackgroundJob(value, `${contextLabel}.${key}`);
    }
  }
}

// -----------------------------------------------------------------------------
// 2. JOB PAYLOAD SCHEMAS
// -----------------------------------------------------------------------------

export const dispatchApprovedAlertPayloadSchema = z.object({
  alertId: z.string().uuid("Invalid alert ID UUID"),
  batchSize: z.number().int().min(1).max(200).default(50).optional(),
  dryRun: z.boolean().default(false).optional(),
});

export const retryNotificationDeliveryPayloadSchema = z.object({
  notificationId: z.string().uuid().optional(),
  deliveryId: z.string().uuid().optional(),
  channel: z.enum(DELIVERY_CHANNELS).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
}).refine((data) => data.notificationId || data.deliveryId, {
  message: "Either notificationId or deliveryId must be provided for retry.",
});

export const expireStaleAlertsPayloadSchema = z.object({
  dryRun: z.boolean().default(false).optional(),
  batchLimit: z.number().int().min(1).max(500).default(100).optional(),
});

export const refreshMarketIntelligencePayloadSchema = z.object({
  commodity: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  lga: z.string().max(100).optional(),
}).superRefine((data, ctx) => {
  try {
    assertNoProhibitedProduceBackgroundJob(data.commodity, "Commodity");
  } catch (err: unknown) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: err instanceof Error ? err.message : "Prohibited produce commodity",
      path: ["commodity"],
    });
  }
});

export const reconcileSupplyFulfilmentPayloadSchema = z.object({
  commitmentId: z.string().uuid().optional(),
  coordinationPlanId: z.string().uuid().optional(),
});

export const queueJobInputSchema = z.object({
  jobType: z.enum(BACKGROUND_JOB_TYPES),
  payload: z.record(z.string(), z.unknown()),
  priority: z.number().int().min(0).max(100).default(DEFAULT_PRIORITY),
  runAfter: z.union([z.string(), z.date()]).optional(),
  maxAttempts: z.number().int().min(1).max(ABSOLUTE_MAX_ATTEMPTS).default(DEFAULT_MAX_ATTEMPTS),
  idempotencyKey: z.string().max(160).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).superRefine((data, ctx) => {
  try {
    assertNoProhibitedProduceBackgroundJob(data.payload, "Job Payload");
    assertNoProhibitedProduceBackgroundJob(data.metadata, "Job Metadata");
  } catch (err: unknown) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: err instanceof Error ? err.message : "Anti-pork violation in job parameters.",
      path: ["payload"],
    });
  }
});

// -----------------------------------------------------------------------------
// 3. ERROR CATEGORIZATION & PRIVACY SANITIZATION
// -----------------------------------------------------------------------------

export function sanitizeErrorMessage(rawMessage: string): string {
  // Redact bearer tokens, API keys, and credentials
  let sanitized = rawMessage
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    .replace(/(key|secret|password|token)\s*[:=]\s*['"]?[a-zA-Z0-9_\-\.]+['"]?/gi, "$1=[REDACTED]");

  // Truncate stack traces or excessively long error output to 500 chars
  if (sanitized.length > 500) {
    sanitized = sanitized.slice(0, 497) + "...";
  }

  return sanitized;
}

export function categorizeError(error: unknown): {
  category: JobErrorCategory;
  message: string;
  retryable: boolean;
} {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = sanitizeErrorMessage(rawMessage);

  if (rawMessage.includes("[ANTI_PORK_VIOLATION]")) {
    return {
      category: "INVARIANT_VIOLATION",
      message,
      retryable: false,
    };
  }

  if (rawMessage.includes("ZodError") || rawMessage.includes("validation")) {
    return {
      category: "VALIDATION_FAILED",
      message,
      retryable: false,
    };
  }

  if (
    rawMessage.includes("unauthorized") ||
    rawMessage.includes("forbidden") ||
    rawMessage.includes("not permitted") ||
    rawMessage.includes("prohibited")
  ) {
    return {
      category: "PERMANENT",
      message,
      retryable: false,
    };
  }

  if (
    rawMessage.includes("timeout") ||
    rawMessage.includes("ETIMEDOUT") ||
    rawMessage.includes("ECONNRESET") ||
    rawMessage.includes("rate limit") ||
    rawMessage.includes("network") ||
    rawMessage.includes("fetch failed") ||
    rawMessage.includes("503") ||
    rawMessage.includes("504") ||
    rawMessage.includes("lock")
  ) {
    return {
      category: "TRANSIENT",
      message,
      retryable: true,
    };
  }

  // Default to PERMANENT for unspecified errors to fail-safe against endless retry storms
  return {
    category: "PERMANENT",
    message,
    retryable: false,
  };
}
