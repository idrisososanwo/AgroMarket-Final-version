import { z } from "zod";

/**
 * Strict Anti-Pork content validator.
 * Rejects any pig/pork terms across titles and descriptions.
 */
const PORK_PROHIBITED_REGEX = /\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard)\b/i;

export function containsProhibitedProduce(text: string): boolean {
  return PORK_PROHIBITED_REGEX.test(text);
}

const listingBaseSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must not exceed 120 characters")
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Listing contains prohibited produce terms. AgroMarket strictly disallows pig/pork products.",
    }),
  description: z
    .string()
    .max(2000, "Description must not exceed 2000 characters")
    .optional()
    .refine((val) => !val || !containsProhibitedProduce(val), {
      message: "Description contains prohibited produce terms. AgroMarket strictly disallows pig/pork products.",
    }),
  pricePerUnit: z.coerce
    .number()
    .positive("Price per unit must be greater than 0")
    .max(100_000_000, "Price exceeds maximum allowable limit"),
  unit: z
    .string()
    .min(1, "Unit of measurement is required")
    .max(30, "Unit must not exceed 30 characters"),
  minimumOrderQuantity: z.coerce
    .number()
    .positive("Minimum order quantity must be at least 1"),
  state: z.string().min(2, "State is required"),
  lga: z.string().min(2, "LGA is required"),
  pickupAddress: z
    .string()
    .min(5, "Pickup address must be at least 5 characters")
    .max(255, "Pickup address must not exceed 255 characters"),
});

export const createListingSchema = listingBaseSchema.extend({
  productId: z.string().uuid("Invalid canonical product selection"),
  farmId: z.string().uuid("Invalid farm selection").optional().or(z.literal("")),
  quantityOnHand: z.coerce
    .number()
    .nonnegative("Quantity on hand must be 0 or greater"),
});

export const updateListingSchema = listingBaseSchema;

export const updateInventorySchema = z.object({
  listingId: z.string().uuid("Invalid listing ID"),
  quantityOnHand: z.coerce
    .number()
    .nonnegative("Quantity on hand must be 0 or greater"),
});

export const transitionStatusSchema = z.object({
  listingId: z.string().uuid("Invalid listing ID"),
  targetStatus: z.enum(["DRAFT", "ACTIVE", "PAUSED", "OUT_OF_STOCK", "ARCHIVED"]),
});

export type ActionResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};
