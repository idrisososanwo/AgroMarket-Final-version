import { z } from "zod";
import { containsProhibitedProduce } from "@/features/marketplace/validation";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  INCIDENT_TYPES,
  INCIDENT_SEVERITY_LEVELS,
  INCIDENT_VERIFICATION_STATUSES,
  INCIDENT_SOURCE_TYPES,
  INCIDENT_LOCATION_SCOPES,
  INCIDENT_PUBLICATION_STATUSES,
} from "./types";
import { ANTI_PORK_ERROR_MESSAGE } from "./constants";

/**
 * URL-friendly slug generator for security incidents.
 */
export function slugifyIncidentTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
}

/**
 * Checks for prohibited GPS latitude/longitude coordinates that would violate
 * physical farm safety and grower confidentiality.
 */
const GPS_COORDINATE_PATTERN =
  /\b[-+]?([1-8]?\d(\.\d{3,})|90(\.0+)?)\s*,\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d{3,}))\b/;

export function containsUnsafeCoordinates(text: string): boolean {
  return GPS_COORDINATE_PATTERN.test(text);
}

function refineAntiPork() {
  return (val: string | null | undefined) => {
    if (!val) return true;
    return !containsProhibitedProduce(val);
  };
}

function refineSafeLocation() {
  return (val: string | null | undefined) => {
    if (!val) return true;
    return !containsUnsafeCoordinates(val);
  };
}

const LOCATION_SAFETY_ERROR_MESSAGE =
  "Exact GPS coordinates or private farm pinpoints are prohibited to protect physical farm security and grower safety. Use generalized LGA, State, or transit corridor scope instead.";

/**
 * Base schema definition for agricultural security incident.
 */
export const securityIncidentBaseSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(255, "Title must not exceed 255 characters")
    .refine(refineAntiPork(), { message: ANTI_PORK_ERROR_MESSAGE })
    .refine(refineSafeLocation(), { message: LOCATION_SAFETY_ERROR_MESSAGE }),

  slug: z
    .string()
    .max(255, "Slug must not exceed 255 characters")
    .optional()
    .transform((val) => {
      if (!val || val.trim().length === 0) return "";
      return slugifyIncidentTitle(val);
    }),

  incidentType: z.enum(INCIDENT_TYPES, {
    errorMap: () => ({ message: "Please select a valid agricultural incident type" }),
  }),

  severity: z.enum(INCIDENT_SEVERITY_LEVELS, {
    errorMap: () => ({ message: "Please assign an editorial severity level" }),
  }),

  description: z
    .string()
    .min(20, "Incident description must be at least 20 characters")
    .max(10000, "Incident description must not exceed 10,000 characters")
    .refine(refineAntiPork(), { message: ANTI_PORK_ERROR_MESSAGE })
    .refine(refineSafeLocation(), { message: LOCATION_SAFETY_ERROR_MESSAGE }),

  occurredAt: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Please enter a valid occurrence date and time",
    }),

  reportedAt: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Please enter a valid reporting timestamp",
    }),

  sourceName: z
    .string()
    .min(2, "Source name or attributing body is required (e.g. State Police, NEMA, News Agency)")
    .max(150, "Source name must not exceed 150 characters"),

  sourceType: z.enum(INCIDENT_SOURCE_TYPES, {
    errorMap: () => ({ message: "Please select a valid source attribution category" }),
  }),

  sourceUrl: z
    .string()
    .url("Source reference must be a valid URL")
    .optional()
    .or(z.literal("")),

  sourcePublicationDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Please enter a valid source publication date",
    }),

  verificationStatus: z
    .enum(INCIDENT_VERIFICATION_STATUSES)
    .default("REPORTED"),

  state: z
    .string()
    .refine((val) => NIGERIAN_STATES.includes(val as (typeof NIGERIAN_STATES)[number]), {
      message: "Please select a valid Nigerian state",
    }),

  lga: z
    .string()
    .max(50, "LGA must not exceed 50 characters")
    .optional()
    .or(z.literal("")),

  locationScope: z
    .enum(INCIDENT_LOCATION_SCOPES)
    .default("GENERAL_AREA"),

  affectedCommodities: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map((c) => c.trim()).filter(Boolean);
      return val
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    })
    .refine((commodities) => commodities.every((c) => !containsProhibitedProduce(c)), {
      message: ANTI_PORK_ERROR_MESSAGE,
    }),

  affectedCategories: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map((c) => c.trim()).filter(Boolean);
      return val
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }),

  movementImpact: z
    .string()
    .max(2000, "Movement impact description must not exceed 2,000 characters")
    .optional()
    .or(z.literal(""))
    .refine(refineAntiPork(), { message: ANTI_PORK_ERROR_MESSAGE })
    .refine(refineSafeLocation(), { message: LOCATION_SAFETY_ERROR_MESSAGE }),

  foodSecurityImpact: z
    .string()
    .max(2000, "Food security impact description must not exceed 2,000 characters")
    .optional()
    .or(z.literal(""))
    .refine(refineAntiPork(), { message: ANTI_PORK_ERROR_MESSAGE }),

  editorialNotes: z
    .string()
    .max(3000, "Editorial notes must not exceed 3,000 characters")
    .optional()
    .or(z.literal(""))
    .refine(refineAntiPork(), { message: ANTI_PORK_ERROR_MESSAGE }),

  status: z
    .enum(INCIDENT_PUBLICATION_STATUSES)
    .default("DRAFT"),
});

export const createSecurityIncidentSchema = securityIncidentBaseSchema;

export const updateSecurityIncidentSchema = securityIncidentBaseSchema
  .partial()
  .extend({
    id: z.string().uuid("Invalid incident ID"),
  });

export const changeSecurityStatusSchema = z.object({
  id: z.string().uuid("Invalid incident ID"),
  status: z.enum(INCIDENT_PUBLICATION_STATUSES),
});

export const updateSecurityVerificationSchema = z.object({
  id: z.string().uuid("Invalid incident ID"),
  verificationStatus: z.enum(INCIDENT_VERIFICATION_STATUSES),
});

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export type CreateSecurityIncidentInput = z.infer<typeof createSecurityIncidentSchema>;
export type UpdateSecurityIncidentInput = z.infer<typeof updateSecurityIncidentSchema>;
