import { z } from "zod";
import {
  SERVICE_CATEGORIES,
  PRICING_MODELS,
  SERVICE_REQUEST_STATUSES,
  ServiceCategory,
  PricingModel,
  ServiceRequestStatus,
} from "./types";
import { containsProhibitedProduce } from "@/features/marketplace/validation";

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Base schema for agricultural services.
 * Enforces text limits and anti-pork produce checks.
 * NEVER accepts provider_id from client.
 */
const serviceBaseSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title must not exceed 150 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Service title contains prohibited terms. AgroMarket strictly disallows pig/pork related listings.",
    }),
  description: z
    .string()
    .min(10, "Service description must be at least 10 characters")
    .max(5000, "Service description must not exceed 5000 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Service description contains prohibited terms. AgroMarket strictly disallows pig/pork related listings.",
    }),
  serviceCategory: z.enum(SERVICE_CATEGORIES as [ServiceCategory, ...ServiceCategory[]], {
    errorMap: () => ({ message: "Please select a valid agricultural service category" }),
  }),
  coverageStates: z
    .array(z.string().min(2, "State name must be at least 2 characters"))
    .min(1, "At least one operational coverage state is required"),
  pricingModel: z
    .enum(PRICING_MODELS as [PricingModel, ...PricingModel[]], {
      errorMap: () => ({ message: "Please select a valid pricing model" }),
    })
    .default("FIXED"),
  baseRate: z.coerce
    .number()
    .min(0, "Base rate cannot be negative")
    .max(100_000_000, "Base rate exceeds maximum allowable limit")
    .default(0),
  currency: z.string().default("NGN"),
  isAvailable: z.boolean().default(true),
});

/**
 * Service Creation Schema
 */
export const createServiceSchema = serviceBaseSchema;

/**
 * Service Update Schema
 */
export const updateServiceSchema = serviceBaseSchema.partial().extend({
  serviceId: z.string().uuid("Invalid service ID format"),
});

/**
 * Service Availability Toggle Schema
 */
export const toggleServiceAvailabilitySchema = z.object({
  serviceId: z.string().uuid("Invalid service ID format"),
  isAvailable: z.boolean(),
});

/**
 * Service Request Creation Schema
 * Client specifies work details and farm location.
 * NEVER accepts client_id or provider_id from client; provider_id is derived server-side from service record.
 */
export const createServiceRequestSchema = z.object({
  serviceId: z.string().uuid("Invalid service ID format"),
  details: z
    .string()
    .min(10, "Request details must be at least 10 characters")
    .max(3000, "Request details must not exceed 3000 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Request details contain prohibited terms. AgroMarket strictly disallows pig/pork related services.",
    }),
  state: z
    .string()
    .min(2, "State is required")
    .max(50, "State must not exceed 50 characters"),
  lga: z
    .string()
    .min(2, "LGA is required")
    .max(50, "LGA must not exceed 50 characters"),
  locationAddress: z
    .string()
    .min(5, "Farm location address must be at least 5 characters")
    .max(255, "Farm location address must not exceed 255 characters"),
  proposedDate: z
    .string()
    .min(1, "Proposed service date is required")
    .refine(
      (val) => {
        const d = new Date(val);
        return !isNaN(d.getTime());
      },
      { message: "Invalid proposed date format" }
    ),
});

/**
 * Service Request Status Transition Schema
 */
export const updateServiceRequestStatusSchema = z.object({
  requestId: z.string().uuid("Invalid service request ID format"),
  status: z.enum(SERVICE_REQUEST_STATUSES as [ServiceRequestStatus, ...ServiceRequestStatus[]], {
    errorMap: () => ({ message: "Invalid service request status specified" }),
  }),
  quotedAmount: z.coerce
    .number()
    .min(0, "Quoted amount cannot be negative")
    .max(100_000_000, "Quoted amount exceeds maximum allowable limit")
    .optional(),
});
