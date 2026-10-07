/**
 * AgroMarket Phase 3.5: Agricultural Memory Validation & Governance Invariants
 *
 * SAFETY INVARIANTS:
 * 1. ANTI-PORK ZERO TOLERANCE: Rejects any prohibited produce terms.
 * 2. PRIVACY SAFEGUARDS: Forbids storage or queries with raw farm coordinates or phone numbers.
 * 3. TEMPORAL INTEGRITY: Enforces valid historical date ranges (fromDate <= toDate).
 */

import { z } from "zod";
import {
  HISTORICAL_TIME_HORIZONS,
  TEMPORAL_RECORD_TYPES,
  HistoricalTimeHorizon,
} from "./types";
import { FEEDBACK_DOMAINS } from "@/features/intelligence-feedback/types";

// -----------------------------------------------------------------------------
// 1. ANTI-PORK ZERO TOLERANCE
// -----------------------------------------------------------------------------

export const PROHIBITED_PRODUCE_REGEX =
  /\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard|porcine|warthog)\b/i;

export function containsProhibitedProduce(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "string") {
    return PROHIBITED_PRODUCE_REGEX.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsProhibitedProduce(item));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((val) =>
      containsProhibitedProduce(val)
    );
  }
  return false;
}

export function assertNoProhibitedProduce(value: unknown, context: string = "Historical Memory"): void {
  if (containsProhibitedProduce(value)) {
    throw new Error(
      `[Anti-Pork Policy Violation] Prohibited produce terms detected during: ${context}. AgroMarket strictly forbids pig/pork commodities across all historical memory, baselines, and queries.`
    );
  }
}

// -----------------------------------------------------------------------------
// 2. PRIVACY DEFENSES
// -----------------------------------------------------------------------------

const PHONE_NUMBER_REGEX = /(?:\+?234|0)[789][01]\d{8}\b/;
const HIGH_PRECISION_COORDINATES_REGEX = /[-+]?\d{1,2}\.\d{5,},\s*[-+]?\d{1,3}\.\d{5,}/;

export function containsPrivateInformation(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "string") {
    return PHONE_NUMBER_REGEX.test(value) || HIGH_PRECISION_COORDINATES_REGEX.test(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsPrivateInformation(item));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((val) =>
      containsPrivateInformation(val)
    );
  }
  return false;
}

export function assertNoPrivateInformation(value: unknown, context: string = "Historical Memory Privacy"): void {
  if (containsPrivateInformation(value)) {
    throw new Error(
      `[Privacy Violation] Private farmer coordinates or phone numbers detected in ${context}. Historical memory queries must use safe LGA/State aggregation.`
    );
  }
}

// -----------------------------------------------------------------------------
// 3. TEMPORAL WINDOW RESOLVER
// -----------------------------------------------------------------------------

export interface ResolvedTimeWindow {
  from: Date;
  to: Date;
  days: number;
}

export function resolveTimeWindowDates(
  horizon: HistoricalTimeHorizon = "LAST_30_DAYS",
  customFrom?: string | Date,
  customTo?: string | Date
): ResolvedTimeWindow {
  const now = new Date();

  if (horizon === "CUSTOM" && customFrom && customTo) {
    const from = new Date(customFrom);
    const to = new Date(customTo);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new Error("Invalid custom date range provided for historical query.");
    }

    if (from > to) {
      throw new Error("Historical query fromDate cannot be after toDate.");
    }

    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
    return { from, to, days };
  }

  let days = 30;
  if (horizon === "LAST_7_DAYS") days = 7;
  else if (horizon === "LAST_30_DAYS") days = 30;
  else if (horizon === "LAST_90_DAYS") days = 90;
  else if (horizon === "LAST_365_DAYS") days = 365;

  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to: now, days };
}

// -----------------------------------------------------------------------------
// 4. RUNTIME SCHEMAS
// -----------------------------------------------------------------------------

export const historicalQueryFiltersSchema = z
  .object({
    domain: z.enum(FEEDBACK_DOMAINS).optional(),
    commodity: z.string().optional(),
    state: z.string().optional(),
    lga: z.string().optional(),
    agentId: z.string().optional(),
    timeHorizon: z.enum(HISTORICAL_TIME_HORIZONS).default("LAST_30_DAYS"),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    recordType: z.enum(TEMPORAL_RECORD_TYPES).optional(),
    excludeLowQuality: z.boolean().default(true),
    limit: z.number().int().min(1).max(1000).default(100),
  })
  .refine((data) => !containsProhibitedProduce(data), {
    message: "Prohibited produce detected in query filters.",
  })
  .refine((data) => !containsPrivateInformation(data), {
    message: "Private phone or GPS detected in query filters.",
  });
