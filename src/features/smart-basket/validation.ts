import { z } from "zod";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";

export const purchasingFrequencyEnum = z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "ONE_TIME"]);

export const basketPurposeEnum = z.enum([
  "HOUSEHOLD",
  "BULK_SHARING",
  "SMALL_COMMERCIAL",
  "INDIVIDUAL",
]);

export const updateUserPreferencesSchema = z.object({
  budgetTargetBasket: z.number().positive("Basket budget must be greater than zero").optional().nullable(),
  budgetTargetMonthly: z.number().positive("Monthly budget must be greater than zero").optional().nullable(),
  state: z.enum(NIGERIAN_STATES, { errorMap: () => ({ message: "Invalid Nigerian state" }) }).optional().nullable(),
  lga: z.string().max(100).optional().nullable(),
  familySize: z.number().int().min(1, "Household size must be at least 1").max(50).default(4),
  dietaryPreferences: z.array(z.string().max(50)).default([]),
  preferredStaples: z.array(z.string().max(100)).default([]),
  preferredCategories: z.array(z.string().uuid()).default([]),
  excludedProducts: z.array(z.string().uuid()).default([]),
  excludedCategories: z.array(z.string().uuid()).default([]),
  purchasingFrequency: purchasingFrequencyEnum.default("BIWEEKLY"),
  basketPurpose: basketPurposeEnum.default("HOUSEHOLD"),
  metadata: z.record(z.unknown()).optional(),
});

export const generateBasketSchema = z.object({
  budget: z.number().positive("Budget must be greater than 0"),
  state: z.enum(NIGERIAN_STATES, { errorMap: () => ({ message: "Invalid Nigerian state" }) }),
  lga: z.string().max(100).optional().nullable(),
  familySize: z.number().int().min(1).max(50).default(4),
  basketPurpose: basketPurposeEnum.default("HOUSEHOLD"),
  preferredStaples: z.array(z.string().max(100)).optional(),
  preferredCategories: z.array(z.string().uuid()).optional(),
  excludedProducts: z.array(z.string().uuid()).optional(),
  excludedCategories: z.array(z.string().uuid()).optional(),
});

export const addSmartBasketToCartSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendation ID"),
  items: z
    .array(
      z.object({
        listingId: z.string().uuid("Invalid listing ID"),
        quantity: z.number().positive("Quantity must be greater than zero"),
      })
    )
    .min(1, "At least one basket item must be selected"),
});

export const updateBasketFeedbackSchema = z.object({
  recommendationId: z.string().uuid("Invalid recommendation ID"),
  status: z.enum(["ACCEPTED", "MODIFIED", "REJECTED"]),
});

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
