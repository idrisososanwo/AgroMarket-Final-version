/**
 * AgroMarket Phase 3.7: Scenario Modeling Validation & Safety Invariants
 *
 * Enforces:
 * 1. Zero-tolerance Anti-Pork policy across all scenario queries, commodities, and titles.
 * 2. Privacy guards rejecting phone numbers, raw GPS coordinates, and private PII.
 * 3. Nigerian geographic boundary compliance.
 * 4. Runtime Zod schema validation.
 */

import { z } from "zod";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  SCENARIO_DOMAINS,
  SCENARIO_HORIZONS,
  ScenarioHorizon,
} from "./types";

// Prohibited terms for Halal-aligned AgroMarket
const PROHIBITED_PRODUCE_TERMS = [
  "pork",
  "pig",
  "swine",
  "hog",
  "boar",
  "piglet",
  "bacon",
  "ham",
  "lard",
  "porcine",
];

const PROHIBITED_REGEX = new RegExp(
  `\\b(${PROHIBITED_PRODUCE_TERMS.join("|")})\\b`,
  "i"
);

/**
 * Checks whether an input contains prohibited pork/pig terms
 */
export function isProhibitedProduce(input: unknown): boolean {
  if (!input) return false;
  if (typeof input === "string") {
    return PROHIBITED_REGEX.test(input);
  }
  if (Array.isArray(input)) {
    return input.some((item) => isProhibitedProduce(item));
  }
  if (typeof input === "object") {
    return Object.values(input as Record<string, unknown>).some((val) =>
      isProhibitedProduce(val)
    );
  }
  return false;
}

/**
 * Throws an explicit error if any prohibited produce is detected
 */
export function assertNoProhibitedProduce(
  input: unknown,
  context: string = "Scenario Intelligence"
): void {
  if (isProhibitedProduce(input)) {
    throw new Error(
      `[Anti-Pork Policy Violation] Prohibited produce detected in ${context}. Zero tolerance across AgroMarket.`
    );
  }
}

// Regex matching raw Nigerian phone numbers (e.g., 08012345678, +2348012345678)
const PHONE_REGEX = /(\+?234|0)[789][01]\d{8}/;

// Regex matching raw GPS coordinates (e.g., 9.0820, 8.6753)
const GPS_COORDINATE_REGEX = /[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)/;

/**
 * Detects private PII or exact coordinates in text or objects
 */
export function containsPrivateInformation(input: unknown): boolean {
  if (!input) return false;
  if (typeof input === "string") {
    return PHONE_REGEX.test(input) || GPS_COORDINATE_REGEX.test(input);
  }
  if (Array.isArray(input)) {
    return input.some((item) => containsPrivateInformation(item));
  }
  if (typeof input === "object") {
    return Object.values(input as Record<string, unknown>).some((val) =>
      containsPrivateInformation(val)
    );
  }
  return false;
}

/**
 * Enforces privacy boundaries by rejecting exact GPS coordinates or phone numbers
 */
export function assertNoPrivateInformation(
  input: unknown,
  context: string = "Scenario Intelligence"
): void {
  if (containsPrivateInformation(input)) {
    throw new Error(
      `[Privacy Violation] Private coordinates or phone numbers detected in ${context}. AgroMarket scenarios must be privacy-preserving.`
    );
  }
}

/**
 * Calculates start and end timestamps for a given horizon
 */
export function resolveScenarioHorizonDates(
  horizon: ScenarioHorizon,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const now = new Date();

  if (customStart && customEnd) {
    return {
      startDate: new Date(customStart).toISOString(),
      endDate: new Date(customEnd).toISOString(),
    };
  }

  const start = new Date(now);
  const end = new Date(now);

  switch (horizon) {
    case "SHORT_TERM_0_7D":
      end.setDate(now.getDate() + 7);
      break;
    case "MEDIUM_TERM_8_30D":
      start.setDate(now.getDate() + 8);
      end.setDate(now.getDate() + 30);
      break;
    case "LONG_TERM_31_90D":
      start.setDate(now.getDate() + 31);
      end.setDate(now.getDate() + 90);
      break;
    case "CROSS_HORIZON":
    default:
      end.setDate(now.getDate() + 90);
      break;
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

/**
 * Runtime Zod schema for scenario generation options
 */
export const scenarioGenerationOptionsSchema = z
  .object({
    domain: z.enum(SCENARIO_DOMAINS),
    commodity: z.string().min(1),
    category: z.string().optional(),
    state: z.string().refine((val) => (NIGERIAN_STATES as readonly string[]).includes(val), {
      message: "State must be a valid Nigerian state",
    }),
    lga: z.string().optional(),
    horizon: z.enum(SCENARIO_HORIZONS).default("CROSS_HORIZON"),
    supportingForecastIds: z.array(z.string().uuid()).optional(),
    customStartDate: z.string().datetime().optional(),
    customEndDate: z.string().datetime().optional(),
  })
  .refine((data) => !isProhibitedProduce(data.commodity), {
    message: "Prohibited commodity detected. Zero tolerance for pork/pig products.",
    path: ["commodity"],
  })
  .refine((data) => !data.category || !isProhibitedProduce(data.category), {
    message: "Prohibited category detected. Zero tolerance for pork/pig products.",
    path: ["category"],
  })
  .refine((data) => !containsPrivateInformation(data), {
    message: "Private PII or exact coordinates cannot be submitted.",
  });
