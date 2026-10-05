/**
 * AgroMarket Phase 2.0: Validation Schemas for Agricultural Ecosystem
 * Strict Anti-Pork Policy Enforced on All Domain Entities
 */

import { z } from "zod";
import { containsProhibitedProduce } from "@/features/marketplace/validation";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  ECOSYSTEM_ACTOR_TYPES,
  PRODUCTION_UNIT_TYPES,
  PRODUCTION_OUTPUT_TYPES,
  PROCESSING_FACILITY_TYPES,
  PROCESS_TYPES,
  VALUE_CHAIN_EVENT_TYPES,
} from "./types";

const antiPorkRefinement = {
  validator: (val: string | null | undefined) => !val || !containsProhibitedProduce(val),
  message: "Prohibited produce detected. AgroMarket strictly forbids pork and pig products.",
};

// ------------------------------------------------------------------------------
// 1. ECOSYSTEM ACTORS SCHEMA
// ------------------------------------------------------------------------------
export const ecosystemActorSchema = z.object({
  actorType: z.enum(ECOSYSTEM_ACTOR_TYPES, {
    errorMap: () => ({ message: "Invalid ecosystem actor type" }),
  }),
  displayName: z
    .string()
    .min(3, "Display name must be at least 3 characters")
    .max(150, "Display name must not exceed 150 characters")
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  description: z
    .string()
    .max(1500, "Description must not exceed 1500 characters")
    .optional()
    .nullable()
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  capabilities: z.array(z.string().min(2).max(50)).default([]),
  state: z.enum(NIGERIAN_STATES, {
    errorMap: () => ({ message: "Invalid Nigerian state" }),
  }),
  lga: z.string().min(2, "LGA is required").max(50),
  businessProfileId: z.string().uuid("Invalid business profile ID").optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

// ------------------------------------------------------------------------------
// 2. PRODUCTION UNITS SCHEMA
// ------------------------------------------------------------------------------
export const productionUnitSchema = z.object({
  name: z
    .string()
    .min(3, "Production unit name must be at least 3 characters")
    .max(150, "Name must not exceed 150 characters")
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  unitType: z.enum(PRODUCTION_UNIT_TYPES, {
    errorMap: () => ({ message: "Invalid production unit type" }),
  }),
  state: z.enum(NIGERIAN_STATES, {
    errorMap: () => ({ message: "Invalid Nigerian state" }),
  }),
  lga: z.string().min(2, "LGA is required").max(50),
  generalArea: z.string().max(150, "General area must not exceed 150 characters").optional().nullable(),
  commodities: z
    .array(
      z
        .string()
        .min(2)
        .max(50)
        .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message })
    )
    .min(1, "At least one commodity must be specified"),
  capacityValue: z.coerce.number().positive("Capacity must be positive").optional().nullable(),
  capacityUnit: z.string().max(50).optional().nullable(),
  isPublic: z.boolean().default(true),
  businessProfileId: z.string().uuid("Invalid business profile ID").optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

// ------------------------------------------------------------------------------
// 3. PRODUCTION OUTPUTS SCHEMA
// ------------------------------------------------------------------------------
export const productionOutputSchema = z.object({
  productionUnitId: z.string().uuid("Invalid production unit ID").optional().nullable(),
  commodityName: z
    .string()
    .min(2, "Commodity name is required")
    .max(150, "Commodity name must not exceed 150 characters")
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  outputType: z.enum(PRODUCTION_OUTPUT_TYPES, {
    errorMap: () => ({ message: "Invalid production output type" }),
  }),
  batchNumber: z.string().max(100).optional().nullable(),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unit: z.string().min(1, "Unit of measurement is required").max(30),
  harvestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Harvest date must be YYYY-MM-DD").default(() => new Date().toISOString().split("T")[0]),
  qualityGrade: z.enum(["STANDARD", "PREMIUM", "GRADE_A", "GRADE_B", "COMMERCIAL"]).default("STANDARD"),
  state: z.enum(NIGERIAN_STATES, {
    errorMap: () => ({ message: "Invalid Nigerian state" }),
  }),
  lga: z.string().min(2, "LGA is required").max(50),
  notes: z
    .string()
    .max(1000, "Notes must not exceed 1000 characters")
    .optional()
    .nullable()
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  metadata: z.record(z.unknown()).default({}),
});

// ------------------------------------------------------------------------------
// 4. AGGREGATION POOLS SCHEMA
// ------------------------------------------------------------------------------
export const aggregationPoolSchema = z.object({
  title: z
    .string()
    .min(3, "Aggregation title must be at least 3 characters")
    .max(150, "Title must not exceed 150 characters")
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  commodity: z
    .string()
    .min(2, "Commodity is required")
    .max(150)
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  targetQuantity: z.coerce.number().positive("Target quantity must be greater than zero"),
  unit: z.string().min(1, "Unit is required").max(30),
  state: z.enum(NIGERIAN_STATES, {
    errorMap: () => ({ message: "Invalid Nigerian state" }),
  }),
  lga: z.string().min(2, "LGA is required").max(50),
  collectionCenterName: z.string().max(150).optional().nullable(),
  expectedAvailabilityDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"),
  targetBuyerId: z.string().uuid("Invalid buyer ID").optional().nullable(),
  targetProcessorId: z.string().uuid("Invalid processor ID").optional().nullable(),
  notes: z
    .string()
    .max(1000)
    .optional()
    .nullable()
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  metadata: z.record(z.unknown()).default({}),
});

export const aggregationContributionSchema = z.object({
  poolId: z.string().uuid("Invalid aggregation pool ID"),
  productionOutputId: z.string().uuid("Invalid production output ID").optional().nullable(),
  quantity: z.coerce.number().positive("Contribution quantity must be positive"),
  unit: z.string().min(1, "Unit is required").max(30),
  notes: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
});

// ------------------------------------------------------------------------------
// 5. PROCESSING FACILITIES SCHEMA
// ------------------------------------------------------------------------------
export const processingFacilitySchema = z.object({
  name: z
    .string()
    .min(3, "Facility name must be at least 3 characters")
    .max(150, "Name must not exceed 150 characters")
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  facilityType: z.enum(PROCESSING_FACILITY_TYPES, {
    errorMap: () => ({ message: "Invalid processing facility type" }),
  }),
  servicesOffered: z.array(z.string().min(2).max(50)).default([]),
  processingCapacityValue: z.coerce.number().positive().optional().nullable(),
  processingCapacityUnit: z.string().max(50).optional().nullable(),
  minimumBatchSize: z.coerce.number().positive().optional().nullable(),
  supportedCommodities: z
    .array(
      z
        .string()
        .min(2)
        .max(50)
        .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message })
    )
    .min(1, "At least one supported commodity is required"),
  state: z.enum(NIGERIAN_STATES, {
    errorMap: () => ({ message: "Invalid Nigerian state" }),
  }),
  lga: z.string().min(2, "LGA is required").max(50),
  generalLocation: z.string().max(150).optional().nullable(),
  businessProfileId: z.string().uuid("Invalid business profile ID").optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

// ------------------------------------------------------------------------------
// 6. PROCESSING EVENTS SCHEMA
// ------------------------------------------------------------------------------
export const processingEventSchema = z.object({
  facilityId: z.string().uuid("Invalid processing facility ID").optional().nullable(),
  processType: z.enum(PROCESS_TYPES, {
    errorMap: () => ({ message: "Invalid process type" }),
  }),
  inputDescription: z
    .string()
    .min(3, "Input description is required")
    .max(300)
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  inputQuantity: z.coerce.number().positive("Input quantity must be positive"),
  inputUnit: z.string().min(1, "Input unit is required").max(30),
  inputSourceOutputId: z.string().uuid("Invalid input source output ID").optional().nullable(),
  outputDescription: z
    .string()
    .min(3, "Output description is required")
    .max(300)
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  outputQuantity: z.coerce.number().nonnegative("Output quantity cannot be negative"),
  outputUnit: z.string().min(1, "Output unit is required").max(30),
  yieldPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
  batchReference: z.string().max(100).optional().nullable(),
  resultingOutputId: z.string().uuid().optional().nullable(),
  resultingListingId: z.string().uuid().optional().nullable(),
  notes: z
    .string()
    .max(1000)
    .optional()
    .nullable()
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  metadata: z.record(z.unknown()).default({}),
});

// ------------------------------------------------------------------------------
// 7. VALUE-CHAIN EVENTS SCHEMA
// ------------------------------------------------------------------------------
export const valueChainEventSchema = z.object({
  eventType: z.enum(VALUE_CHAIN_EVENT_TYPES, {
    errorMap: () => ({ message: "Invalid value-chain event type" }),
  }),
  entityType: z.enum([
    "PRODUCTION_OUTPUT",
    "AGGREGATION_POOL",
    "PROCESSING_EVENT",
    "B2B_DEMAND",
    "MARKETPLACE_LISTING",
  ]),
  entityId: z.string().uuid("Invalid entity ID"),
  eventTitle: z
    .string()
    .min(3, "Event title must be at least 3 characters")
    .max(150)
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  eventDetails: z.record(z.unknown()).default({}),
  state: z.enum(NIGERIAN_STATES, {
    errorMap: () => ({ message: "Invalid Nigerian state" }),
  }),
  lga: z.string().max(50).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

// ------------------------------------------------------------------------------
// 8. B2B DEMANDS SCHEMA
// ------------------------------------------------------------------------------
export const b2bDemandSchema = z.object({
  title: z
    .string()
    .min(3, "Demand title must be at least 3 characters")
    .max(150, "Title must not exceed 150 characters")
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  commodityOrProduct: z
    .string()
    .min(2, "Commodity or product name is required")
    .max(150)
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  quantity: z.coerce.number().positive("Requested quantity must be positive"),
  unit: z.string().min(1, "Unit is required").max(30),
  specifications: z.record(z.unknown()).default({}),
  targetPricePerUnit: z.coerce.number().positive("Target price must be positive").optional().nullable(),
  state: z.enum(NIGERIAN_STATES, {
    errorMap: () => ({ message: "Invalid Nigerian state" }),
  }),
  lga: z.string().min(2, "LGA is required").max(50),
  desiredDeliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in format YYYY-MM-DD"),
  frequency: z
    .enum(["ONE_TIME", "DAILY", "WEEKLY", "BI_WEEKLY", "MONTHLY", "QUARTERLY"])
    .default("ONE_TIME"),
  notes: z
    .string()
    .max(1500)
    .optional()
    .nullable()
    .refine(antiPorkRefinement.validator, { message: antiPorkRefinement.message }),
  businessProfileId: z.string().uuid("Invalid business profile ID").optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

// ------------------------------------------------------------------------------
// 9. SUPPLY / DEMAND MATCHING QUERY SCHEMA
// ------------------------------------------------------------------------------
export const matchingQuerySchema = z.object({
  demandId: z.string().uuid("Invalid demand ID"),
  maxDistanceTier: z.enum(["SAME_STATE", "REGIONAL_CORRIDOR", "NATIONAL"]).default("NATIONAL"),
  minSupplyScore: z.coerce.number().min(0).max(100).default(30),
});
