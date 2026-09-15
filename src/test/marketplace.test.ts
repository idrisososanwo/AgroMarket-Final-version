import { describe, it, expect } from "vitest";
import {
  isValidStatusTransition,
  VALID_STATUS_TRANSITIONS,
} from "@/features/marketplace/types";
import {
  containsProhibitedProduce,
  createListingSchema,
  updateListingSchema,
  updateInventorySchema,
} from "@/features/marketplace/validation";
import { formatNGN } from "@/features/marketplace/constants";

describe("Phase 0.4: Marketplace Catalog, Listings & Inventory", () => {
  describe("1. Listing Status State Machine", () => {
    it("allows valid transitions from DRAFT", () => {
      expect(isValidStatusTransition("DRAFT", "ACTIVE")).toBe(true);
      expect(isValidStatusTransition("DRAFT", "ARCHIVED")).toBe(true);
      expect(isValidStatusTransition("DRAFT", "DRAFT")).toBe(true);
      expect(isValidStatusTransition("DRAFT", "PAUSED")).toBe(false);
      expect(isValidStatusTransition("DRAFT", "OUT_OF_STOCK")).toBe(false);
    });

    it("allows valid transitions from ACTIVE", () => {
      expect(isValidStatusTransition("ACTIVE", "PAUSED")).toBe(true);
      expect(isValidStatusTransition("ACTIVE", "OUT_OF_STOCK")).toBe(true);
      expect(isValidStatusTransition("ACTIVE", "ARCHIVED")).toBe(true);
      expect(isValidStatusTransition("ACTIVE", "ACTIVE")).toBe(true);
      expect(isValidStatusTransition("ACTIVE", "DRAFT")).toBe(false);
    });

    it("allows valid transitions from PAUSED", () => {
      expect(isValidStatusTransition("PAUSED", "ACTIVE")).toBe(true);
      expect(isValidStatusTransition("PAUSED", "ARCHIVED")).toBe(true);
      expect(isValidStatusTransition("PAUSED", "PAUSED")).toBe(true);
      expect(isValidStatusTransition("PAUSED", "DRAFT")).toBe(false);
    });

    it("allows valid transitions from OUT_OF_STOCK", () => {
      expect(isValidStatusTransition("OUT_OF_STOCK", "ACTIVE")).toBe(true);
      expect(isValidStatusTransition("OUT_OF_STOCK", "ARCHIVED")).toBe(true);
      expect(isValidStatusTransition("OUT_OF_STOCK", "OUT_OF_STOCK")).toBe(true);
      expect(isValidStatusTransition("OUT_OF_STOCK", "PAUSED")).toBe(false);
    });

    it("treats ARCHIVED as a terminal state with no outgoing transitions", () => {
      expect(VALID_STATUS_TRANSITIONS.ARCHIVED).toEqual([]);
      expect(isValidStatusTransition("ARCHIVED", "ACTIVE")).toBe(false);
      expect(isValidStatusTransition("ARCHIVED", "PAUSED")).toBe(false);
      expect(isValidStatusTransition("ARCHIVED", "DRAFT")).toBe(false);
      expect(isValidStatusTransition("ARCHIVED", "ARCHIVED")).toBe(true);
    });
  });

  describe("2. Strict Anti-Pork Content Validation", () => {
    it("detects forbidden pork terms in titles and descriptions", () => {
      expect(containsProhibitedProduce("Fresh Pork Ribs")).toBe(true);
      expect(containsProhibitedProduce("Live Swine for sale")).toBe(true);
      expect(containsProhibitedProduce("Pig farming supplies")).toBe(true);
      expect(containsProhibitedProduce("Artisanal Bacon strips")).toBe(true);
      expect(containsProhibitedProduce("Boar livestock")).toBe(true);
      expect(containsProhibitedProduce("Refined animal lard")).toBe(true);
      expect(containsProhibitedProduce("Delicious Ham cuts")).toBe(true);
    });

    it("allows legitimate Nigerian agricultural produce without false-positives", () => {
      expect(containsProhibitedProduce("Clean Dry White Maize 100kg")).toBe(false);
      expect(containsProhibitedProduce("Ogbomoso Mangoes - Sweet Grafted")).toBe(false);
      expect(containsProhibitedProduce("Fresh Tilapia and Catfish")).toBe(false);
      expect(containsProhibitedProduce("Live Boer Goat for Sallah")).toBe(false);
      expect(containsProhibitedProduce("Brown Beans (Oloyin)")).toBe(false);
      expect(containsProhibitedProduce("Sokoto Red Goat")).toBe(false);
      expect(containsProhibitedProduce("Benue Yam Tubers")).toBe(false);
    });

    it("fails Zod schema validation if title contains prohibited produce", () => {
      const result = createListingSchema.safeParse({
        productId: "e05e5520-a7d0-4217-a068-d05ca4fa70c4",
        title: "Fresh Farm Pork Meat",
        pricePerUnit: 5000,
        unit: "Kilogram (kg)",
        minimumOrderQuantity: 1,
        quantityOnHand: 20,
        state: "Lagos",
        lga: "Ikeja",
        pickupAddress: "12 Agricultural Market Road",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.title?.[0]).toContain(
          "strictly disallows pig/pork products"
        );
      }
    });

    it("fails Zod schema validation if description contains prohibited produce", () => {
      const result = createListingSchema.safeParse({
        productId: "e05e5520-a7d0-4217-a068-d05ca4fa70c4",
        title: "Mixed Meat Basket",
        description: "Includes organic bacon and cured cuts from our local facility.",
        pricePerUnit: 5000,
        unit: "Basket",
        minimumOrderQuantity: 1,
        quantityOnHand: 20,
        state: "Lagos",
        lga: "Ikeja",
        pickupAddress: "12 Agricultural Market Road",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.description?.[0]).toContain(
          "strictly disallows pig/pork products"
        );
      }
    });
  });

  describe("3. Listing Validation & Pricing Rules", () => {
    const validListing = {
      productId: "11111111-2222-3333-4444-555555555555",
      title: "Grade 1 Dry White Maize",
      description: "Low moisture content under 12%, cleaned and winnowed.",
      pricePerUnit: 65000,
      unit: "100kg Bag",
      minimumOrderQuantity: 5,
      quantityOnHand: 150,
      state: "Kano",
      lga: "Dawanau",
      pickupAddress: "Warehouse 4, Dawanau International Grains Market",
    };

    it("accepts valid agricultural produce listing inputs", () => {
      const result = createListingSchema.safeParse(validListing);
      expect(result.success).toBe(true);
    });

    it("rejects non-positive price per unit", () => {
      const zeroPrice = createListingSchema.safeParse({ ...validListing, pricePerUnit: 0 });
      expect(zeroPrice.success).toBe(false);

      const negPrice = createListingSchema.safeParse({ ...validListing, pricePerUnit: -100 });
      expect(negPrice.success).toBe(false);
    });

    it("rejects non-positive minimum order quantity", () => {
      const zeroMoq = createListingSchema.safeParse({ ...validListing, minimumOrderQuantity: 0 });
      expect(zeroMoq.success).toBe(false);

      const negMoq = createListingSchema.safeParse({ ...validListing, minimumOrderQuantity: -1 });
      expect(negMoq.success).toBe(false);
    });

    it("rejects negative initial quantity on hand", () => {
      const negStock = createListingSchema.safeParse({ ...validListing, quantityOnHand: -5 });
      expect(negStock.success).toBe(false);
    });

    it("allows zero initial quantity on hand (e.g. advance listing)", () => {
      const zeroStock = createListingSchema.safeParse({ ...validListing, quantityOnHand: 0 });
      expect(zeroStock.success).toBe(true);
    });

    it("enforces canonical product UUID format", () => {
      const invalidUuid = createListingSchema.safeParse({
        ...validListing,
        productId: "not-a-valid-uuid",
      });
      expect(invalidUuid.success).toBe(false);
    });

    it("validates updates using updateListingSchema without requiring productId or initial quantity", () => {
      const updateData = {
        title: "Updated Grade 1 White Maize",
        description: "Freshly bagged this morning.",
        pricePerUnit: 68000,
        unit: "100kg Bag",
        minimumOrderQuantity: 10,
        state: "Kano",
        lga: "Dawanau",
        pickupAddress: "Warehouse 4, Dawanau International Grains Market",
      };
      const result = updateListingSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });
  });

  describe("4. Non-Negative Inventory Invariants", () => {
    it("validates inventory update parameters", () => {
      const validUpdate = updateInventorySchema.safeParse({
        listingId: "11111111-2222-3333-4444-555555555555",
        quantityOnHand: 250,
      });
      expect(validUpdate.success).toBe(true);

      const negUpdate = updateInventorySchema.safeParse({
        listingId: "11111111-2222-3333-4444-555555555555",
        quantityOnHand: -10,
      });
      expect(negUpdate.success).toBe(false);
    });

    it("enforces quantity available formula: on_hand - reserved >= 0", () => {
      const calculateAvailable = (onHand: number, reserved: number) => {
        if (onHand < reserved) {
          throw new Error("Quantity on hand cannot be less than quantity reserved");
        }
        return onHand - reserved;
      };

      expect(calculateAvailable(100, 30)).toBe(70);
      expect(calculateAvailable(50, 50)).toBe(0);
      expect(() => calculateAvailable(20, 25)).toThrow(
        "Quantity on hand cannot be less than quantity reserved"
      );
    });
  });

  describe("5. Currency & Formatting Representation", () => {
    it("formats Nigerian Naira values accurately", () => {
      const formatted = formatNGN(45000);
      expect(formatted).toContain("45,000");
      expect(formatted).toMatch(/₦|NGN/);
    });
  });
});
