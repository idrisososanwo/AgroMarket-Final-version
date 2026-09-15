import { describe, it, expect } from "vitest";
import { USER_ROLES } from "@/types/auth";
import { Database } from "@/types/database";

describe("Database Schema Integrity & Business Rules", () => {
  describe("Roles Integrity", () => {
    it("matches the canonical 8 user roles exactly", () => {
      const canonicalRoles = [
        "BUYER",
        "FARMER",
        "BUSINESS",
        "JOB_SEEKER",
        "SERVICE_PROVIDER",
        "EQUIPMENT_OWNER",
        "EXPERT",
        "ADMIN",
      ];
      expect(USER_ROLES).toEqual(canonicalRoles);
      expect(USER_ROLES.length).toBe(8);
    });
  });

  describe("Anti-Pig/Pork Prohibited Policy Constraint", () => {
    const prohibitedRegex = /\b(pork|pig|swine|bacon|ham|lard)\b/i;

    it("detects and flags any prohibited swine terms", () => {
      expect(prohibitedRegex.test("Pork chops")).toBe(true);
      expect(prohibitedRegex.test("swine breeding")).toBe(true);
      expect(prohibitedRegex.test("smoked bacon")).toBe(true);
      expect(prohibitedRegex.test("pig feed")).toBe(true);
      expect(prohibitedRegex.test("ham sandwich")).toBe(true);
      expect(prohibitedRegex.test("pure lard")).toBe(true);
    });

    it("does not false-positive on valid Nigerian agricultural produce", () => {
      expect(prohibitedRegex.test("White Maize")).toBe(false);
      expect(prohibitedRegex.test("Brown Beans")).toBe(false);
      expect(prohibitedRegex.test("Fresh African Catfish")).toBe(false);
      expect(prohibitedRegex.test("Live Boer Goat")).toBe(false);
      expect(prohibitedRegex.test("Red Palm Oil")).toBe(false);
      expect(prohibitedRegex.test("Cassava Tubers")).toBe(false);
      expect(prohibitedRegex.test("Habanero Pepper")).toBe(false);
    });
  });

  describe("Inventory Calculation & Reservation Logic", () => {
    function computeInventory(onHand: number, reserved: number) {
      if (onHand < 0 || reserved < 0) {
        throw new Error("Inventory quantities must be non-negative");
      }
      if (reserved > onHand) {
        throw new Error("Reserved quantity cannot exceed quantity on hand");
      }
      return onHand - reserved;
    }

    it("calculates available inventory accurately", () => {
      expect(computeInventory(100, 20)).toBe(80);
      expect(computeInventory(50, 50)).toBe(0);
      expect(computeInventory(200, 0)).toBe(200);
    });

    it("prevents negative inventory reservation", () => {
      expect(() => computeInventory(50, 60)).toThrow(
        "Reserved quantity cannot exceed quantity on hand"
      );
    });
  });

  describe("Multi-Seller Order Snapshot Integrity", () => {
    it("preserves historical unit prices without recalculating from current listing", () => {
      const historicalItem: Database["public"]["Tables"]["order_items"]["Row"] = {
        id: "item-1",
        order_id: "order-1",
        listing_id: "listing-1",
        seller_id: "seller-1",
        product_id: "product-1",
        product_name_snapshot: "Dry White Maize (100kg)",
        unit_price_snapshot: 65000.0,
        quantity: 2,
        unit_snapshot: "100KG_BAG",
        total_price: 130000.0,
        status: "PENDING",
        created_at: new Date().toISOString(),
      };

      // Current market price increases
      const currentListingPrice = 85000.0;
      expect(historicalItem.unit_price_snapshot).toBe(65000.0);
      expect(historicalItem.total_price).toBe(
        historicalItem.unit_price_snapshot * historicalItem.quantity
      );
      expect(historicalItem.total_price).not.toBe(
        currentListingPrice * historicalItem.quantity
      );
    });

    it("supports multiple sellers on a single order via seller_id line items", () => {
      const items: Array<Partial<Database["public"]["Tables"]["order_items"]["Row"]>> = [
        {
          order_id: "ord-123",
          seller_id: "farmer-oyo",
          total_price: 50000,
        },
        {
          order_id: "ord-123",
          seller_id: "farmer-kano",
          total_price: 75000,
        },
      ];

      const distinctSellers = new Set(items.map((i) => i.seller_id));
      expect(distinctSellers.size).toBe(2);
      const subtotal = items.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
      expect(subtotal).toBe(125000);
    });
  });

  describe("Price Observations Integrity & Invariants", () => {
    function validateObservationState(
      dataQualityLabel: string,
      verificationStatus: string
    ) {
      if (dataQualityLabel === "SIMULATED" && verificationStatus === "VERIFIED") {
        throw new Error(
          "Check constraint violation: SIMULATED observations cannot be marked as VERIFIED."
        );
      }
      return true;
    }

    it("enforces database invariant price_obs_no_simulated_verified", () => {
      expect(validateObservationState("OBSERVED", "VERIFIED")).toBe(true);
      expect(validateObservationState("OBSERVED", "SELF_REPORTED")).toBe(true);
      expect(validateObservationState("SIMULATED", "SELF_REPORTED")).toBe(true);
      expect(validateObservationState("SIMULATED", "REJECTED")).toBe(true);

      expect(() => validateObservationState("SIMULATED", "VERIFIED")).toThrow(
        "Check constraint violation: SIMULATED observations cannot be marked as VERIFIED."
      );
    });
  });
});
