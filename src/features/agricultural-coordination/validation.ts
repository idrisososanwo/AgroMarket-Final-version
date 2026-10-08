/**
 * AgroMarket Phase 3.10: Agricultural Coordination Validation & Invariants
 * Enforces Zod schemas, physical quantity limits, delivery windows, and anti-pork safety.
 */

import { z } from "zod";
import { assertNoProhibitedProduce } from "@/features/intelligence-governance/validation";
import { normalizeSupplyToDemandUnit } from "@/features/supply-matching/units";

// -----------------------------------------------------------------------------
// 1. ZOD SCHEMAS
// -----------------------------------------------------------------------------

export const createOpportunityInputSchema = z.object({
  b2bDemandId: z.string().uuid().nullable().optional(),
  title: z.string().min(3, "Title must be at least 3 characters").max(180),
  commodity: z.string().min(2, "Commodity name is required").max(120),
  requiredQuantity: z.number().positive("Required quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required").max(30),
  targetState: z.string().min(2, "Target State is required").max(50),
  targetLga: z.string().min(2, "Target LGA is required").max(50),
  deliveryWindowStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  deliveryWindowEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  qualityGrade: z.string().max(40).optional().default("STANDARD"),
  processingRequired: z.boolean().optional().default(false),
  processingFacilityId: z.string().uuid().nullable().optional(),
  logisticsRequired: z.boolean().optional().default(false),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
}).refine(
  (data) => new Date(data.deliveryWindowEnd) >= new Date(data.deliveryWindowStart),
  {
    message: "Delivery window end date must be on or after start date",
    path: ["deliveryWindowEnd"],
  }
);

export const offerSupplyCommitmentInputSchema = z.object({
  opportunityId: z.string().uuid("Invalid opportunity ID"),
  productionOutputId: z.string().uuid().nullable().optional(),
  commodity: z.string().min(2, "Commodity name is required").max(120),
  committedQuantity: z.number().positive("Committed quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required").max(30),
  qualityGrade: z.string().max(40).optional().default("STANDARD"),
  availabilityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  locationState: z.string().min(2, "Location State is required").max(50),
  locationLga: z.string().min(2, "Location LGA is required").max(50),
  notes: z.string().max(2000).nullable().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const acceptSupplyCommitmentInputSchema = z.object({
  commitmentId: z.string().uuid("Invalid commitment ID"),
  justification: z.string().max(1000).optional(),
});

export const withdrawSupplyCommitmentInputSchema = z.object({
  commitmentId: z.string().uuid("Invalid commitment ID"),
  reason: z.string().min(3, "Withdrawal reason must be at least 3 characters").max(500),
});

export const confirmSupplyCommitmentInputSchema = z.object({
  commitmentId: z.string().uuid("Invalid commitment ID"),
  notes: z.string().max(1000).optional(),
});

export const recordFulfilmentInputSchema = z.object({
  commitmentId: z.string().uuid("Invalid commitment ID"),
  fulfilledQuantity: z.number().positive("Fulfilled quantity must be greater than 0"),
  fulfilledUnit: z.string().min(1, "Fulfilled unit is required"),
  notes: z.string().max(1000).optional(),
});

export const cancelOpportunityInputSchema = z.object({
  opportunityId: z.string().uuid("Invalid opportunity ID"),
  reason: z.string().min(3, "Cancellation reason is required").max(500),
});

// -----------------------------------------------------------------------------
// 2. DOMAIN ASSERTIONS & SAFEGUARDS
// -----------------------------------------------------------------------------

/**
 * Validates commodity name against Anti-Pork Invariant across all coordination inputs.
 * Throws error if prohibited terms are detected.
 */
export function assertNoProhibitedProduceCoordination(
  commodity: string,
  context: string = "Coordination Invariant"
): void {
  assertNoProhibitedProduce(commodity, context);
}

/**
 * Normalizes input quantity to canonical KG and validates unit compatibility.
 */
export function resolveCanonicalQuantityKg(
  quantity: number,
  unit: string
): { canonicalKg: number; isExact: boolean } {
  const norm = normalizeSupplyToDemandUnit(quantity, unit, "KG");
  if (!norm.isCompatible || norm.normalizedSupplyQuantity === null) {
    throw new Error(
      `Incompatible or unsupported unit for physical coordination: '${unit}'. Conversion to canonical KG failed.`
    );
  }
  return {
    canonicalKg: Number(norm.normalizedSupplyQuantity.toFixed(2)),
    isExact: norm.status === "EXACT",
  };
}
