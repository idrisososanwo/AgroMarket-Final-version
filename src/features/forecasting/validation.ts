/**
 * AgroMarket Phase 3.6: Forecasting Validation & Invariant Guards
 * Anti-pork zero-tolerance, privacy enforcement, time horizon resolution, and schema validation.
 */

import { z } from "zod";
import {
  FORECAST_TIME_HORIZONS,
  FORECASTING_METHODS,
  ForecastTimeHorizon,
} from "./types";

// -----------------------------------------------------------------------------
// 1. CANONICAL PROHIBITED PRODUCE (Strict Anti-Pork Policy)
// -----------------------------------------------------------------------------

export const PROHIBITED_COMMODITY_PATTERNS = [
  /\b(pork|pig|swine|hog|boar|piglet|bacon|ham|lard|porcine)\b/i,
];

export function containsProhibitedProduce(input: string | null | undefined): boolean {
  if (!input) return false;
  return PROHIBITED_COMMODITY_PATTERNS.some((pattern) => pattern.test(input));
}

export function assertNoProhibitedProduce(commodity: string | null | undefined, context: string): void {
  if (containsProhibitedProduce(commodity)) {
    throw new Error(
      `Anti-Pork Policy Violation in ${context}: "${commodity}" is strictly prohibited across AgroMarket ecosystem.`
    );
  }
}

// -----------------------------------------------------------------------------
// 2. PRIVACY SAFEGUARDS (No private coordinates, phone numbers, PII)
// -----------------------------------------------------------------------------

const PRIVATE_PHONE_REGEX = /(?:\+?234|0)[789][01]\d{8}\b/;
const PRIVATE_GPS_REGEX = /-?\d{1,2}\.\d{4,8}\s*,\s*-?\d{1,3}\.\d{4,8}/;
const PRIVATE_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export function containsPrivateInformation(input: unknown): boolean {
  if (!input) return false;
  const str = typeof input === "string" ? input : JSON.stringify(input);
  return (
    PRIVATE_PHONE_REGEX.test(str) ||
    PRIVATE_GPS_REGEX.test(str) ||
    PRIVATE_EMAIL_REGEX.test(str)
  );
}

export function assertNoPrivateInformation(data: unknown, context: string): void {
  if (containsPrivateInformation(data)) {
    throw new Error(
      `Privacy Violation in ${context}: Raw phone numbers, private GPS coordinates, and personal PII are strictly forbidden.`
    );
  }
}

// -----------------------------------------------------------------------------
// 3. TIME HORIZON RESOLUTION
// -----------------------------------------------------------------------------

export function resolveHorizonDays(horizon: ForecastTimeHorizon, customDays?: number): number {
  switch (horizon) {
    case "SHORT_TERM_0_7D":
      return 7;
    case "MEDIUM_TERM_8_30D":
      return 30;
    case "LONG_TERM_31_90D":
      return 90;
    case "CUSTOM":
      if (!customDays || customDays <= 0 || customDays > 365) {
        throw new Error("Custom forecast horizon must be between 1 and 365 days.");
      }
      return customDays;
    default:
      return 30;
  }
}

export function resolveHorizonDates(
  horizon: ForecastTimeHorizon,
  startDate?: string,
  customDays?: number
): { startDate: string; endDate: string; targetDate: string; days: number } {
  const start = startDate ? new Date(startDate) : new Date();
  if (isNaN(start.getTime())) {
    throw new Error("Invalid start date provided for forecast horizon.");
  }

  const days = resolveHorizonDays(horizon, customDays);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    targetDate: end.toISOString(),
    days,
  };
}

// -----------------------------------------------------------------------------
// 4. RUNTIME SCHEMAS
// -----------------------------------------------------------------------------

export const forecastGenerationOptionsSchema = z.object({
  domain: z.enum([
    "MARKET",
    "DEMAND",
    "SUPPLY",
    "PRODUCTION",
    "LOGISTICS",
    "FOOD_SECURITY",
    "DISEASE_BIOSECURITY",
    "PROCUREMENT",
  ]),
  metricName: z.string().min(1),
  commodity: z.string().min(1).refine((c) => !containsProhibitedProduce(c), {
    message: "Commodity violates Anti-Pork zero tolerance policy.",
  }),
  category: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  corridor: z.string().optional(),
  timeHorizon: z.enum(FORECAST_TIME_HORIZONS),
  method: z.enum(FORECASTING_METHODS).optional(),
  agentId: z.string().optional(),
  customHorizonDays: z.number().int().positive().max(365).optional(),
  seasonalityFactor: z.number().min(0.1).max(5.0).optional(),
});
