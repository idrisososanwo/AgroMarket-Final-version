import { z } from "zod";

export const createOrderSchema = z.object({
  deliveryAddress: z
    .string()
    .min(5, "Delivery address must be at least 5 characters")
    .max(255, "Delivery address cannot exceed 255 characters"),
  deliveryState: z.string().min(2, "State is required"),
  deliveryLga: z.string().min(2, "LGA is required"),
  contactPhone: z
    .string()
    .min(10, "Contact phone must be at least 10 digits")
    .max(20, "Contact phone is invalid"),
  deliveryNotes: z
    .string()
    .max(500, "Delivery notes cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
});

export const transitionOrderStatusSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  targetStatus: z.enum([
    "PENDING",
    "PAID",
    "PROCESSING",
    "PARTIALLY_FULFILLED",
    "COMPLETED",
    "CANCELLED",
    "DISPUTED",
  ]),
});

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};
