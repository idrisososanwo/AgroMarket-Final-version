import { z } from "zod";

export const addToCartSchema = z.object({
  listingId: z.string().uuid("Invalid produce listing ID"),
  quantity: z.coerce
    .number()
    .positive("Quantity must be greater than zero")
    .max(1_000_000, "Quantity exceeds maximum allowable order limit"),
});

export const updateCartItemSchema = z.object({
  cartItemId: z.string().uuid("Invalid cart item ID"),
  quantity: z.coerce
    .number()
    .positive("Quantity must be greater than zero")
    .max(1_000_000, "Quantity exceeds maximum allowable order limit"),
});

export const removeCartItemSchema = z.object({
  cartItemId: z.string().uuid("Invalid cart item ID"),
});

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};
