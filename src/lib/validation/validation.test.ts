import { describe, it, expect } from "vitest";
import {
  nigerianPhoneSchema,
  normalizeNigerianPhone,
  paginationSchema,
  uuidSchema,
} from "./index";

describe("Validation Utilities", () => {
  describe("Nigerian Phone Validation", () => {
    it("validates standard local 11-digit numbers", () => {
      expect(nigerianPhoneSchema.safeParse("08012345678").success).toBe(true);
      expect(nigerianPhoneSchema.safeParse("09098765432").success).toBe(true);
      expect(nigerianPhoneSchema.safeParse("07033445566").success).toBe(true);
      expect(nigerianPhoneSchema.safeParse("08123456789").success).toBe(true);
    });

    it("validates international prefix (+234)", () => {
      expect(nigerianPhoneSchema.safeParse("+2348012345678").success).toBe(true);
      expect(nigerianPhoneSchema.safeParse("2348012345678").success).toBe(true);
    });

    it("rejects invalid numbers", () => {
      expect(nigerianPhoneSchema.safeParse("12345").success).toBe(false);
      expect(nigerianPhoneSchema.safeParse("08012345").success).toBe(false);
      expect(nigerianPhoneSchema.safeParse("+12025550123").success).toBe(false);
    });

    it("correctly normalizes local phone numbers to E.164 +234 format", () => {
      expect(normalizeNigerianPhone("08012345678")).toBe("+2348012345678");
      expect(normalizeNigerianPhone("2348012345678")).toBe("+2348012345678");
      expect(normalizeNigerianPhone("+2348012345678")).toBe("+2348012345678");
    });
  });

  describe("Pagination Schema", () => {
    it("provides defaults when values are omitted", () => {
      const parsed = paginationSchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);
    });

    it("coerces string numbers from query parameters", () => {
      const parsed = paginationSchema.parse({ page: "3", limit: "50" });
      expect(parsed.page).toBe(3);
      expect(parsed.limit).toBe(50);
    });

    it("rejects non-positive pages or oversized limits", () => {
      expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
      expect(paginationSchema.safeParse({ limit: 500 }).success).toBe(false);
    });
  });

  describe("UUID Schema", () => {
    it("validates valid UUIDs", () => {
      expect(uuidSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
      expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
    });
  });
});
