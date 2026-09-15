import { z } from "zod";

/**
 * Standard Nigerian phone number regex.
 * Matches:
 * - Local formats: 080..., 070..., 090..., 081..., 091... (11 digits)
 * - International formats: +23480..., +23470..., +23490..., 23480... (13 or 14 digits)
 */
export const nigerianPhoneRegex =
  /^(?:\+?234|0)(?:70|71|80|81|90|91)\d{8}$/;

export const nigerianPhoneSchema = z
  .string()
  .trim()
  .regex(nigerianPhoneRegex, "Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)");

/**
 * Normalizes a Nigerian phone number to international E.164 format (+234...).
 */
export function normalizeNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+234")) {
    return cleaned;
  }
  if (cleaned.startsWith("234")) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("0")) {
    return `+234${cleaned.slice(1)}`;
  }
  return cleaned;
}

/**
 * Standard Pagination query schema.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

/**
 * UUID validation schema.
 */
export const uuidSchema = z.string().uuid("Invalid UUID identifier");
