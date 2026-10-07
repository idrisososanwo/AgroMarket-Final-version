/**
 * AgroMarket Phase 3.3: Action Integration Validation & Security Guardrails
 * Zero-tolerance anti-pork checks, privacy preservation, route whitelisting,
 * deep-link query sanitization, and strict schema validation.
 */

import { z } from "zod";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { ACTION_INTENTS, ACTION_OUTCOME_STATUSES, DESTINATION_TYPES, REVALIDATION_STATUSES } from "./types";

// -----------------------------------------------------------------------------
// 1. ANTI-PORK ZERO TOLERANCE INVARIANT
// -----------------------------------------------------------------------------

const PROHIBITED_PRODUCE_REGEX =
  /\b(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine|pigs)\b/i;

export function containsProhibitedProduce(text: string | null | undefined): boolean {
  if (!text) return false;
  return PROHIBITED_PRODUCE_REGEX.test(text);
}

export function assertNoProhibitedProduce(
  data: unknown,
  contextMessage = "Prohibited produce detected"
): void {
  if (data === null || data === undefined) return;

  if (typeof data === "string") {
    if (containsProhibitedProduce(data)) {
      throw new Error(`[ANTI_PORK_VIOLATION] ${contextMessage}: "${data}" contains prohibited porcine terms.`);
    }
    return;
  }

  if (Array.isArray(data)) {
    data.forEach((item, index) =>
      assertNoProhibitedProduce(item, `${contextMessage} at index ${index}`)
    );
    return;
  }

  if (typeof data === "object") {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      assertNoProhibitedProduce(value, `${contextMessage} in field "${key}"`);
    }
  }
}

// -----------------------------------------------------------------------------
// 2. PRIVACY GUARDRAILS (No Phone Numbers, Coordinates, or Secrets in URLs)
// -----------------------------------------------------------------------------

// Typical Nigerian phone numbers (+234, 080, 070, 090, 081, etc.)
const PHONE_NUMBER_REGEX = /(?:\+?234|0)[789][01]\d{8}/;

// High precision lat/long coordinates (e.g. 6.524379, 3.379205)
const HIGH_PRECISION_COORDINATES_REGEX = /[-+]?\d{1,3}\.\d{4,}/;

export function containsPrivateInformation(str: string): boolean {
  if (!str) return false;
  return PHONE_NUMBER_REGEX.test(str) || HIGH_PRECISION_COORDINATES_REGEX.test(str);
}

export function assertSafeDeepLinkParameters(
  params: Record<string, string | number | boolean | undefined | null>
): void {
  for (const [key, val] of Object.entries(params)) {
    if (val === null || val === undefined) continue;
    const strVal = String(val);

    if (containsProhibitedProduce(strVal)) {
      throw new Error(`[ANTI_PORK_VIOLATION] Deep-link parameter "${key}" contains prohibited produce.`);
    }

    if (containsPrivateInformation(strVal)) {
      throw new Error(`[PRIVACY_VIOLATION] Deep-link parameter "${key}" contains potential private personal or location data.`);
    }
  }
}

// -----------------------------------------------------------------------------
// 3. WHITELIST OF REAL AGROMARKET ROUTES
// -----------------------------------------------------------------------------

export const VALID_AGROMARKET_ACTION_ROUTES = [
  "/marketplace",
  "/market",
  "/farmer/listings/new",
  "/farmer/listings",
  "/shared-purchases",
  "/equipment",
  "/services",
  "/jobs",
  "/cart",
  "/procurement-intelligence",
  "/supply-intelligence",
  "/demand-intelligence",
  "/production-intelligence",
  "/market-intelligence",
  "/logistics-intelligence",
  "/disease-intelligence",
  "/food-security",
  "/learn/expert-advice",
  "/learn/food-health",
  "/learn/security",
  "/learn",
  "/my-intelligence",
  "/intelligence",
] as const;

export function isValidActionRoute(path: string): boolean {
  if (!path.startsWith("/")) return false;
  const basePath = path.split("?")[0];
  return VALID_AGROMARKET_ACTION_ROUTES.some(
    (allowed) => basePath === allowed || basePath.startsWith(allowed + "/")
  );
}

// -----------------------------------------------------------------------------
// 4. ZOD SCHEMAS FOR GOVERNED ACTION INTEGRATION
// -----------------------------------------------------------------------------

export const actionContextPayloadSchema = z.object({
  recommendationId: z.string().uuid(),
  decisionId: z.string().uuid().nullable().optional(),
  originatingDomain: z.string().optional(),
  commodity: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Prohibited commodity specified",
    }),
  category: z.string().max(100).nullable().optional(),
  state: z
    .string()
    .refine((val) => !val || NIGERIAN_STATES.includes(val as (typeof NIGERIAN_STATES)[number]), {
      message: "State must be a valid Nigerian State",
    })
    .nullable()
    .optional(),
  lga: z.string().max(100).nullable().optional(),
  quantity: z.number().nonnegative().nullable().optional(),
  urgency: z.string().optional(),
  contextBannerText: z.string().max(500).optional(),
  filters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const createActionIntegrationSchema = z.object({
  recommendationId: z.string().uuid(),
  decisionId: z.string().uuid().nullable().optional(),
  actionId: z.string().uuid().nullable().optional(),
  actionIntent: z.enum(ACTION_INTENTS),
  destinationType: z.enum(DESTINATION_TYPES),
  destinationUrl: z.string().max(500).refine(isValidActionRoute, {
    message: "Destination URL must map to an existing valid AgroMarket route",
  }),
  contextPayload: actionContextPayloadSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const updateActionIntegrationStatusSchema = z.object({
  integrationId: z.string().uuid(),
  status: z.enum(ACTION_OUTCOME_STATUSES),
  revalidationStatus: z.enum(REVALIDATION_STATUSES).optional(),
  revalidationDetails: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const revalidationCheckSchema = z.object({
  destinationType: z.enum(DESTINATION_TYPES),
  commodity: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Prohibited commodity in revalidation query",
    }),
  state: z.string().nullable().optional(),
  targetId: z.string().max(100).nullable().optional(),
});
