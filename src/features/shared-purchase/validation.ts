import { z } from "zod";

/**
 * Strict Anti-Pork content validator.
 * Programmatically rejects any pig/pork/swine terms across all shared purchase fields.
 */
export const PORK_PROHIBITED_REGEX =
  /\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard)\b/i;

export function containsProhibitedProduce(text: string): boolean {
  return PORK_PROHIBITED_REGEX.test(text);
}

export const animalPortionFractionSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(1)
    .max(100)
    .refine((val) => !containsProhibitedProduce(val), {
      message: "Portion name contains prohibited swine/pork terms.",
    }),
  fraction: z.number().positive().max(1),
  portionPrice: z.number().positive(),
  description: z
    .string()
    .max(500)
    .optional()
    .refine((val) => !val || !containsProhibitedProduce(val), {
      message: "Portion description contains prohibited swine/pork terms.",
    }),
});

export const createSharedPurchaseSchema = z
  .object({
    listingId: z.string().uuid("Invalid listing ID format."),
    title: z
      .string()
      .min(3, "Title must be at least 3 characters.")
      .max(200, "Title cannot exceed 200 characters.")
      .refine((val) => !containsProhibitedProduce(val), {
        message:
          "Title contains prohibited produce terms. AgroMarket strictly disallows pig/pork products.",
      }),
    description: z
      .string()
      .max(2000, "Description cannot exceed 2000 characters.")
      .optional()
      .nullable()
      .refine((val) => !val || !containsProhibitedProduce(val), {
        message:
          "Description contains prohibited produce terms. AgroMarket strictly disallows pig/pork products.",
      }),
    purchaseType: z.enum(["BULK_CROP", "ANIMAL_PORTION"]),
    totalQuantity: z
      .number()
      .positive("Total quantity must be greater than zero."),
    unit: z
      .string()
      .min(1, "Unit is required.")
      .max(30, "Unit cannot exceed 30 characters."),
    unitPrice: z.number().positive("Unit price must be greater than zero."),
    targetParticipants: z
      .number()
      .int("Target participants must be an integer.")
      .min(2, "Shared purchases require at least 2 participants."),
    minShareQuantity: z
      .number()
      .positive("Minimum share quantity must be greater than zero."),
    maxShareQuantity: z.number().positive().optional().nullable(),
    portionModel: z.enum(["FRACTIONAL", "WEIGHT_BASED"]).optional().nullable(),
    portionFractions: z.array(animalPortionFractionSchema).optional().default([]),
    deadline: z
      .string()
      .min(1, "Closing date is required.")
      .refine((val) => new Date(val).getTime() > Date.now(), {
        message: "Closing date must be in the future.",
      }),
    pickupHubLocation: z
      .string()
      .min(3, "Pickup hub location is required.")
      .max(500, "Pickup location cannot exceed 500 characters."),
    hubState: z.string().min(2, "Hub state is required.").max(50),
    hubLga: z.string().min(2, "Hub LGA is required.").max(50),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .refine((data) => data.minShareQuantity <= data.totalQuantity, {
    message: "Minimum share quantity cannot exceed the total target quantity.",
    path: ["minShareQuantity"],
  })
  .refine(
    (data) =>
      !data.maxShareQuantity || data.maxShareQuantity >= data.minShareQuantity,
    {
      message:
        "Maximum share quantity cannot be less than minimum share quantity.",
      path: ["maxShareQuantity"],
    }
  )
  .refine(
    (data) => {
      if (
        data.purchaseType === "ANIMAL_PORTION" &&
        data.portionModel === "FRACTIONAL" &&
        data.portionFractions &&
        data.portionFractions.length > 0
      ) {
        const totalFraction = data.portionFractions.reduce(
          (sum, pf) => sum + Number(pf.fraction || 0),
          0
        );
        return totalFraction <= 1.0001;
      }
      return true;
    },
    {
      message:
        "Total sum of animal portion fractions cannot exceed 1.0 (100% of animal).",
      path: ["portionFractions"],
    }
  );

export const joinSharedPurchaseSchema = z.object({
  sharedPurchaseId: z.string().uuid("Invalid shared purchase ID format."),
  requestedQuantity: z
    .number()
    .positive("Requested quantity must be greater than zero."),
  portionChoice: z.string().max(50).optional().nullable(),
  deliveryAddress: z.string().max(500).optional().nullable(),
  deliveryState: z.string().max(50).optional().nullable(),
  deliveryLga: z.string().max(50).optional().nullable(),
  contactPhone: z
    .string()
    .min(7, "Contact phone number is too short.")
    .max(20, "Contact phone number is too long.")
    .regex(
      /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
      "Please enter a valid phone number."
    ),
  deliveryNotes: z
    .string()
    .max(500, "Delivery notes cannot exceed 500 characters.")
    .optional()
    .nullable()
    .refine((val) => !val || !containsProhibitedProduce(val), {
      message: "Delivery notes contain prohibited produce terms.",
    }),
  portionNotes: z
    .string()
    .max(500, "Portion notes cannot exceed 500 characters.")
    .optional()
    .nullable()
    .refine((val) => !val || !containsProhibitedProduce(val), {
      message: "Portion notes contain prohibited produce terms.",
    }),
});

export const transitionStatusSchema = z.object({
  sharedPurchaseId: z.string().uuid("Invalid shared purchase ID."),
  targetStatus: z.enum([
    "DRAFT",
    "OPEN",
    "TARGET_REACHED",
    "PAYMENT_PENDING",
    "CONFIRMED",
    "FULFILMENT",
    "COMPLETED",
    "CANCELLED",
    "EXPIRED",
  ]),
});

export const cancelSharedPurchaseSchema = z.object({
  sharedPurchaseId: z.string().uuid("Invalid shared purchase ID."),
  reason: z
    .string()
    .min(5, "Cancellation reason must be at least 5 characters.")
    .max(500, "Cancellation reason cannot exceed 500 characters."),
});
