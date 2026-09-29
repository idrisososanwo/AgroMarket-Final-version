import { z } from "zod";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CONDITIONS,
  RENTAL_STATUSES,
  EquipmentCategory,
  EquipmentCondition,
  RentalStatus,
} from "./types";
import { containsProhibitedProduce } from "@/features/marketplace/validation";

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const currentYear = new Date().getFullYear();

/**
 * Equipment Creation Validation Schema.
 *
 * Rules:
 * - name: 3-150 chars, content safety verified.
 * - category: canonical equipment category enum.
 * - makeModel: max 100 chars.
 * - yearManufactured: reasonable range (1950 - next year).
 * - description: max 3000 chars, content safety verified.
 * - locationState & locationLga: min 2 max 50 chars, non-empty.
 * - dailyRentalRate: > 0, max 100M.
 * - cautionDeposit: >= 0, max 100M.
 * - currency: NGN.
 * - operatorIncluded: boolean.
 * - condition: canonical condition enum.
 *
 * CRITICAL SECURITY PRINCIPLE:
 * Equipment owner ID must NOT come from the client payload. It is resolved exclusively from auth.uid().
 */
export const createEquipmentSchema = z.object({
  name: z
    .string()
    .min(3, "Equipment name must be at least 3 characters")
    .max(150, "Equipment name must not exceed 150 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Equipment name contains prohibited terms. AgroMarket strictly disallows pig/pork related listings.",
    }),
  category: z.enum(EQUIPMENT_CATEGORIES as [EquipmentCategory, ...EquipmentCategory[]], {
    errorMap: () => ({ message: "Please select a valid equipment category" }),
  }),
  makeModel: z
    .string()
    .max(100, "Make and model must not exceed 100 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  yearManufactured: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z
      .number()
      .int("Year manufactured must be a whole year")
      .min(1950, "Year manufactured cannot be before 1950")
      .max(currentYear + 1, "Year manufactured cannot be in the future")
      .optional()
      .nullable()
  ),
  description: z
    .string()
    .max(3000, "Description must not exceed 3000 characters")
    .optional()
    .nullable()
    .refine((val) => !val || !containsProhibitedProduce(val), {
      message: "Equipment description contains prohibited terms. AgroMarket strictly disallows pig/pork related listings.",
    })
    .transform((val) => (val ? val.trim() : null)),
  locationState: z
    .string()
    .min(2, "Location state is required")
    .max(50, "Location state must not exceed 50 characters"),
  locationLga: z
    .string()
    .min(2, "Location LGA is required")
    .max(50, "Location LGA must not exceed 50 characters"),
  dailyRentalRate: z.coerce
    .number()
    .positive("Daily rental rate must be greater than 0")
    .max(100_000_000, "Daily rental rate exceeds maximum allowable limit"),
  cautionDeposit: z.coerce
    .number()
    .min(0, "Caution deposit cannot be negative")
    .max(100_000_000, "Caution deposit exceeds maximum allowable limit")
    .default(0),
  currency: z.literal("NGN").default("NGN"),
  operatorIncluded: z.coerce.boolean().default(false),
  condition: z
    .enum(EQUIPMENT_CONDITIONS as [EquipmentCondition, ...EquipmentCondition[]], {
      errorMap: () => ({ message: "Please select a valid equipment condition" }),
    })
    .default("GOOD"),
});

/**
 * Equipment Update Validation Schema.
 *
 * Rules:
 * - Allows editable equipment fields only.
 * - Does NOT allow owner_id, created_at, or arbitrary status mutation.
 * - Financial fields are strictly validated (rate > 0, deposit >= 0).
 */
export const updateEquipmentSchema = z.object({
  equipmentId: z.string().uuid("Invalid equipment ID format"),
  name: z
    .string()
    .min(3, "Equipment name must be at least 3 characters")
    .max(150, "Equipment name must not exceed 150 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Equipment name contains prohibited terms. AgroMarket strictly disallows pig/pork related listings.",
    })
    .optional(),
  category: z
    .enum(EQUIPMENT_CATEGORIES as [EquipmentCategory, ...EquipmentCategory[]], {
      errorMap: () => ({ message: "Please select a valid equipment category" }),
    })
    .optional(),
  makeModel: z
    .string()
    .max(100, "Make and model must not exceed 100 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
  yearManufactured: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z
      .number()
      .int("Year manufactured must be a whole year")
      .min(1950, "Year manufactured cannot be before 1950")
      .max(currentYear + 1, "Year manufactured cannot be in the future")
      .optional()
      .nullable()
  ),
  description: z
    .string()
    .max(3000, "Description must not exceed 3000 characters")
    .optional()
    .nullable()
    .refine((val) => !val || !containsProhibitedProduce(val), {
      message: "Equipment description contains prohibited terms. AgroMarket strictly disallows pig/pork related listings.",
    })
    .transform((val) => (val ? val.trim() : null)),
  locationState: z
    .string()
    .min(2, "Location state is required")
    .max(50, "Location state must not exceed 50 characters")
    .optional(),
  locationLga: z
    .string()
    .min(2, "Location LGA is required")
    .max(50, "Location LGA must not exceed 50 characters")
    .optional(),
  dailyRentalRate: z.coerce
    .number()
    .positive("Daily rental rate must be greater than 0")
    .max(100_000_000, "Daily rental rate exceeds maximum allowable limit")
    .optional(),
  cautionDeposit: z.coerce
    .number()
    .min(0, "Caution deposit cannot be negative")
    .max(100_000_000, "Caution deposit exceeds maximum allowable limit")
    .optional(),
  operatorIncluded: z.coerce.boolean().optional(),
  condition: z
    .enum(EQUIPMENT_CONDITIONS as [EquipmentCondition, ...EquipmentCondition[]], {
      errorMap: () => ({ message: "Please select a valid equipment condition" }),
    })
    .optional(),
});

/**
 * Toggle Equipment Availability Schema.
 */
export const toggleEquipmentAvailabilitySchema = z.object({
  equipmentId: z.string().uuid("Invalid equipment ID format"),
  isAvailable: z.boolean(),
});

/**
 * Equipment Rental Request Validation Schema.
 *
 * Rules:
 * - equipmentId must be valid UUID.
 * - startDate and endDate must be valid date strings.
 * - endDate >= startDate.
 * - startDate cannot be in the past.
 *
 * CRITICAL FINANCIAL & OWNERSHIP INTEGRITY:
 * Does NOT accept owner_id, renter_id, daily_rate, total_days,
 * total_rental_amount, deposit_amount, or currency.
 * Server actions derive all of these authoritatively.
 */
export const createRentalRequestSchema = z
  .object({
    equipmentId: z.string().uuid("Invalid equipment ID format"),
    startDate: z
      .string()
      .min(1, "Start date is required")
      .refine(
        (val) => {
          const d = new Date(val);
          return !isNaN(d.getTime());
        },
        { message: "Invalid start date format" }
      ),
    endDate: z
      .string()
      .min(1, "End date is required")
      .refine(
        (val) => {
          const d = new Date(val);
          return !isNaN(d.getTime());
        },
        { message: "Invalid end date format" }
      ),
    handoverNotes: z
      .string()
      .max(1000, "Handover notes must not exceed 1000 characters")
      .optional()
      .nullable()
      .transform((val) => (val ? val.trim() : null)),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end.getTime() >= start.getTime();
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return start >= yesterday;
    },
    {
      message: "Start date cannot be in the past",
      path: ["startDate"],
    }
  );

/**
 * Rental Status Transition Schema.
 */
export const updateRentalStatusSchema = z.object({
  rentalId: z.string().uuid("Invalid rental ID format"),
  status: z.enum(RENTAL_STATUSES as [RentalStatus, ...RentalStatus[]], {
    errorMap: () => ({ message: "Please specify a valid rental status" }),
  }),
  notes: z
    .string()
    .max(1000, "Notes must not exceed 1000 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? val.trim() : null)),
});
