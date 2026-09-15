import { z } from "zod";

export const initializePaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format."),
  provider: z
    .enum(["PAYSTACK", "FLUTTERWAVE", "MONNIFY", "BANK_TRANSFER", "ESCROW_WALLET"])
    .default("PAYSTACK"),
});

export const verifyPaymentSchema = z.object({
  reference: z
    .string()
    .min(1, "Payment reference is required.")
    .max(150, "Payment reference is too long."),
  provider: z
    .enum(["PAYSTACK", "FLUTTERWAVE", "MONNIFY", "BANK_TRANSFER", "ESCROW_WALLET"])
    .optional(),
});

export const createRefundSchema = z.object({
  orderId: z.string().uuid("Invalid order ID."),
  paymentId: z.string().uuid("Invalid payment ID."),
  disputeId: z.string().uuid("Invalid dispute ID.").optional(),
  sellerId: z.string().uuid("Invalid seller ID.").optional(),
  orderItemId: z.string().uuid("Invalid order item ID.").optional(),
  amount: z.number().positive("Refund amount must be greater than zero."),
  reason: z.string().min(5, "Refund reason must be at least 5 characters.").max(500),
  idempotencyKey: z.string().max(150).optional(),
});

export type InitializePaymentInputSchema = z.infer<typeof initializePaymentSchema>;
export type VerifyPaymentInputSchema = z.infer<typeof verifyPaymentSchema>;
export type CreateRefundInputSchema = z.infer<typeof createRefundSchema>;
