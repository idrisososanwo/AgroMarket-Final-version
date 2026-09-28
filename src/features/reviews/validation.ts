import { z } from "zod";
import { REVIEW_TARGET_TYPES, ReviewTargetType } from "./types";
import { containsProhibitedProduce } from "@/features/marketplace/validation";

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Review Creation Schema
 * Enforces rating bounds [1, 5], anti-pork content validation, and target relational constraints.
 * NEVER accepts author_id or is_verified_transaction from client.
 */
export const createReviewSchema = z
  .object({
    targetType: z.enum(REVIEW_TARGET_TYPES as [ReviewTargetType, ...ReviewTargetType[]], {
      errorMap: () => ({ message: "Invalid review target type specified" }),
    }),
    rating: z.coerce
      .number()
      .int("Rating must be an integer")
      .min(1, "Rating must be at least 1 star")
      .max(5, "Rating cannot exceed 5 stars"),
    comment: z
      .string()
      .max(2000, "Review comment must not exceed 2000 characters")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() ? val.trim() : null))
      .refine((val) => !val || !containsProhibitedProduce(val), {
        message: "Review comment contains prohibited produce terms. AgroMarket strictly disallows pig/pork content.",
      }),
    serviceId: z.string().uuid("Invalid service ID format").optional().nullable(),
    orderId: z.string().uuid("Invalid order ID format").optional().nullable(),
    listingId: z.string().uuid("Invalid listing ID format").optional().nullable(),
    sellerId: z.string().uuid("Invalid seller ID format").optional().nullable(),
    equipmentId: z.string().uuid("Invalid equipment ID format").optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "SERVICE" && !data.serviceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serviceId"],
        message: "A service review must specify a valid service ID.",
      });
    }

    if (
      data.targetType === "MARKETPLACE" &&
      !data.orderId &&
      !data.listingId &&
      !data.sellerId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetType"],
        message: "A marketplace review must reference an order, listing, or seller.",
      });
    }

    if (data.targetType === "EQUIPMENT" && !data.equipmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["equipmentId"],
        message: "An equipment review must specify a valid equipment ID.",
      });
    }
  });

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
