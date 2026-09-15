import { z } from "zod";

export const disputeTypeEnum = z.enum([
  "ITEM_NOT_RECEIVED",
  "WRONG_ITEM",
  "DAMAGED_ITEM",
  "QUALITY_ISSUE",
  "MISSING_QUANTITY",
  "DELIVERY_FAILURE",
  "OTHER",
]);

export const resolutionTypeEnum = z.enum([
  "BUYER_REFUND",
  "SELLER_SETTLEMENT",
  "PARTIAL_REFUND",
  "NO_ACTION",
  "REPLACEMENT",
]);

export const evidenceTypeEnum = z.enum([
  "PHOTO",
  "VIDEO",
  "DOCUMENT",
  "DELIVERY_PROOF",
  "CHAT_REFERENCE",
  "OTHER",
]);

export const createDisputeSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format."),
  sellerId: z.string().uuid("Invalid seller ID format."),
  orderItemId: z.string().uuid("Invalid order item ID format.").optional(),
  disputeType: disputeTypeEnum,
  reason: z.string().min(5, "Reason must be at least 5 characters.").max(150),
  description: z.string().min(15, "Please provide a detailed description (at least 15 characters).").max(2000),
  evidenceUrls: z.array(z.string().url("Invalid evidence URL format.")).optional(),
});

export const sellerResponseSchema = z.object({
  disputeId: z.string().uuid("Invalid dispute ID."),
  response: z.string().min(10, "Response must be at least 10 characters.").max(2000),
  evidenceUrls: z.array(z.string().url("Invalid evidence URL format.")).optional(),
});

export const resolveDisputeSchema = z.object({
  disputeId: z.string().uuid("Invalid dispute ID."),
  resolutionType: resolutionTypeEnum,
  resolutionNotes: z.string().min(10, "Resolution explanation is required (min 10 chars).").max(2000),
  refundAmount: z.number().nonnegative("Refund amount cannot be negative.").optional(),
});

export const addEvidenceSchema = z.object({
  disputeId: z.string().uuid("Invalid dispute ID."),
  evidenceType: evidenceTypeEnum,
  fileUrl: z.string().url("Invalid file URL."),
  description: z.string().max(500).optional(),
});

export const cancelDisputeSchema = z.object({
  disputeId: z.string().uuid("Invalid dispute ID."),
  reason: z.string().min(5, "Cancellation reason is required.").max(500),
});

export type CreateDisputeInputSchema = z.infer<typeof createDisputeSchema>;
export type SellerResponseInputSchema = z.infer<typeof sellerResponseSchema>;
export type ResolveDisputeInputSchema = z.infer<typeof resolveDisputeSchema>;
export type AddEvidenceInputSchema = z.infer<typeof addEvidenceSchema>;
export type CancelDisputeInputSchema = z.infer<typeof cancelDisputeSchema>;
