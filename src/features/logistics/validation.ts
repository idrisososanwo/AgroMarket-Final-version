import { z } from "zod";

const deliveryStatusEnum = z.enum([
  "PENDING",
  "QUOTED",
  "ASSIGNED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "DELIVERY_FAILED",
]);

export const createOrderDeliveriesSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format."),
});

export const assignLogisticsProviderSchema = z.object({
  deliveryId: z.string().uuid("Invalid delivery ID format."),
  providerId: z.string().uuid("Invalid provider ID format."),
});

export const updateDeliveryStatusSchema = z.object({
  deliveryId: z.string().uuid("Invalid delivery ID format."),
  targetStatus: deliveryStatusEnum,
  locationName: z.string().max(150).optional(),
  description: z.string().max(500).optional(),
  failureReason: z.string().max(500).optional(),
  proofOfDeliveryUrl: z.string().url().optional(),
});

export const cancelDeliverySchema = z.object({
  deliveryId: z.string().uuid("Invalid delivery ID format."),
  reason: z.string().min(3, "Cancellation reason must be at least 3 characters long.").max(500),
});

export type CreateOrderDeliveriesInput = z.infer<typeof createOrderDeliveriesSchema>;
export type AssignLogisticsProviderInput = z.infer<typeof assignLogisticsProviderSchema>;
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
export type CancelDeliveryInput = z.infer<typeof cancelDeliverySchema>;
