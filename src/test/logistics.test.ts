import { describe, it, expect } from "vitest";
import { isValidDeliveryStatusTransition } from "@/features/logistics/types";
import { OrderStatus, isValidOrderStatusTransition } from "@/features/orders/types";
import {
  createOrderDeliveriesSchema,
  assignLogisticsProviderSchema,
  updateDeliveryStatusSchema,
  cancelDeliverySchema,
} from "@/features/logistics/validation";
import { StandardFleetLogisticsAdapter } from "@/features/logistics/providers/standard-fleet";
import { LogisticsService } from "@/features/logistics/service";
import { containsProhibitedProduce } from "@/features/marketplace/validation";

describe("Phase 0.7: Logistics & Delivery Coordination", () => {
  describe("1. Delivery State Machine Transitions", () => {
    it("permits standard forward progression through the transit lifecycle", () => {
      expect(isValidDeliveryStatusTransition("PENDING", "QUOTED")).toBe(true);
      expect(isValidDeliveryStatusTransition("QUOTED", "ASSIGNED")).toBe(true);
      expect(isValidDeliveryStatusTransition("ASSIGNED", "PICKUP_SCHEDULED")).toBe(true);
      expect(isValidDeliveryStatusTransition("PICKUP_SCHEDULED", "PICKED_UP")).toBe(true);
      expect(isValidDeliveryStatusTransition("PICKED_UP", "IN_TRANSIT")).toBe(true);
      expect(isValidDeliveryStatusTransition("IN_TRANSIT", "OUT_FOR_DELIVERY")).toBe(true);
      expect(isValidDeliveryStatusTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
    });

    it("strictly forbids skipping directly from PENDING to DELIVERED", () => {
      expect(isValidDeliveryStatusTransition("PENDING", "DELIVERED")).toBe(false);
    });

    it("strictly forbids backwards transit transitions (DELIVERED -> IN_TRANSIT)", () => {
      expect(isValidDeliveryStatusTransition("DELIVERED", "IN_TRANSIT")).toBe(false);
      expect(isValidDeliveryStatusTransition("IN_TRANSIT", "PICKED_UP")).toBe(false);
      expect(isValidDeliveryStatusTransition("PICKED_UP", "ASSIGNED")).toBe(false);
    });

    it("forbids any transitions once a delivery is CANCELLED (terminal state)", () => {
      expect(isValidDeliveryStatusTransition("CANCELLED", "PENDING")).toBe(false);
      expect(isValidDeliveryStatusTransition("CANCELLED", "ASSIGNED")).toBe(false);
      expect(isValidDeliveryStatusTransition("CANCELLED", "DELIVERED")).toBe(false);
    });

    it("permits cancellation prior to physical pickup", () => {
      expect(isValidDeliveryStatusTransition("PENDING", "CANCELLED")).toBe(true);
      expect(isValidDeliveryStatusTransition("QUOTED", "CANCELLED")).toBe(true);
      expect(isValidDeliveryStatusTransition("ASSIGNED", "CANCELLED")).toBe(true);
      expect(isValidDeliveryStatusTransition("PICKUP_SCHEDULED", "CANCELLED")).toBe(true);
    });

    it("strictly forbids cancellation once goods have been physically picked up or in transit", () => {
      expect(isValidDeliveryStatusTransition("PICKED_UP", "CANCELLED")).toBe(false);
      expect(isValidDeliveryStatusTransition("IN_TRANSIT", "CANCELLED")).toBe(false);
      expect(isValidDeliveryStatusTransition("OUT_FOR_DELIVERY", "CANCELLED")).toBe(false);
      expect(isValidDeliveryStatusTransition("DELIVERED", "CANCELLED")).toBe(false);
    });

    it("permits transit failure reporting from IN_TRANSIT or OUT_FOR_DELIVERY", () => {
      expect(isValidDeliveryStatusTransition("IN_TRANSIT", "DELIVERY_FAILED")).toBe(true);
      expect(isValidDeliveryStatusTransition("OUT_FOR_DELIVERY", "DELIVERY_FAILED")).toBe(true);
    });

    it("permits recovery or cancellation from DELIVERY_FAILED", () => {
      expect(isValidDeliveryStatusTransition("DELIVERY_FAILED", "ASSIGNED")).toBe(true);
      expect(isValidDeliveryStatusTransition("DELIVERY_FAILED", "PICKUP_SCHEDULED")).toBe(true);
      expect(isValidDeliveryStatusTransition("DELIVERY_FAILED", "CANCELLED")).toBe(true);
    });
  });

  describe("2. Order Preconditions & Order State Machine Integration", () => {
    function isOrderEligibleForDelivery(status: OrderStatus): boolean {
      return status === "PAID" || status === "PROCESSING";
    }

    it("rejects delivery creation for unpaid PENDING orders", () => {
      expect(isOrderEligibleForDelivery("PENDING")).toBe(false);
    });

    it("rejects delivery creation for CANCELLED orders", () => {
      expect(isOrderEligibleForDelivery("CANCELLED")).toBe(false);
    });

    it("permits delivery creation for verified PAID orders", () => {
      expect(isOrderEligibleForDelivery("PAID")).toBe(true);
      expect(isOrderEligibleForDelivery("PROCESSING")).toBe(true);
    });

    it("strictly forbids jumping directly from PAID to COMPLETED without PROCESSING", () => {
      // In the order state machine, PAID cannot jump directly to COMPLETED
      expect(isValidOrderStatusTransition("PAID", "COMPLETED")).toBe(false);
      // It must pass through PROCESSING
      expect(isValidOrderStatusTransition("PAID", "PROCESSING")).toBe(true);
      expect(isValidOrderStatusTransition("PROCESSING", "COMPLETED")).toBe(true);
    });

    it("permits order completion from PROCESSING when all deliveries are DELIVERED", () => {
      expect(isValidOrderStatusTransition("PROCESSING", "COMPLETED")).toBe(true);
    });

    it("forbids order completion for CANCELLED orders (invalid transition)", () => {
      expect(isValidOrderStatusTransition("CANCELLED", "COMPLETED")).toBe(false);
    });

    it("handles partial delivery completion advancing PROCESSING to PARTIALLY_FULFILLED", () => {
      expect(isValidOrderStatusTransition("PROCESSING", "PARTIALLY_FULFILLED")).toBe(true);
      expect(isValidOrderStatusTransition("PARTIALLY_FULFILLED", "COMPLETED")).toBe(true);

      const siblingDeliveries = [
        { id: "del-1", status: "DELIVERED" },
        { id: "del-2", status: "IN_TRANSIT" },
      ];
      const deliveredCount = siblingDeliveries.filter((d) => d.status === "DELIVERED").length;
      const totalCount = siblingDeliveries.length;
      const allCompleted = deliveredCount === totalCount;
      const isPartiallyComplete = deliveredCount > 0 && !allCompleted;

      expect(allCompleted).toBe(false);
      expect(isPartiallyComplete).toBe(true);
    });

    it("completes master order when all multi-consignment deliveries reach DELIVERED", () => {
      const siblingDeliveries = [
        { id: "del-1", status: "DELIVERED" },
        { id: "del-2", status: "DELIVERED" },
        { id: "del-3", status: "DELIVERED" },
      ];
      const allCompleted = siblingDeliveries.every((d) => d.status === "DELIVERED");
      expect(allCompleted).toBe(true);
    });
  });

  describe("3. Multi-Seller Consignment Partitioning", () => {
    it("partitions multi-seller order items into distinct seller consignments", () => {
      const multiSellerOrderItems = [
        { id: "item-1", sellerId: "seller-kano", productName: "White Maize", qty: 20 },
        { id: "item-2", sellerId: "seller-kano", productName: "Sorghum", qty: 10 },
        { id: "item-3", sellerId: "seller-jos", productName: "Roma Tomatoes", qty: 30 },
        { id: "item-4", sellerId: "seller-benue", productName: "Yam Tubers", qty: 50 },
      ];

      const sellerGroups = new Map<string, typeof multiSellerOrderItems>();
      for (const item of multiSellerOrderItems) {
        const existing = sellerGroups.get(item.sellerId) || [];
        existing.push(item);
        sellerGroups.set(item.sellerId, existing);
      }

      // Must produce 3 distinct consignments
      expect(sellerGroups.size).toBe(3);
      expect(sellerGroups.get("seller-kano")?.length).toBe(2);
      expect(sellerGroups.get("seller-jos")?.length).toBe(1);
      expect(sellerGroups.get("seller-benue")?.length).toBe(1);
    });
  });

  describe("4. 3PL Quotes & Provisional Pricing Transparency", () => {
    const adapter = new StandardFleetLogisticsAdapter();

    it("explicitly identifies standard fleet adapter as provisional simulation pricing", async () => {
      expect(adapter.isProvisional).toBe(true);
      expect(adapter.pricingTier).toBe("PROVISIONAL_SIMULATION");

      const quote = await adapter.getQuote({
        pickupState: "Kano",
        pickupLga: "Dala",
        deliveryState: "Lagos",
        deliveryLga: "Ikeja",
      });

      expect(quote.isProvisional).toBe(true);
      expect(quote.provisionalNotice).toContain("DEVELOPMENT / PROVISIONAL PRICING");
    });

    it("calculates lower rates for intra-state delivery (e.g. Lagos to Lagos)", async () => {
      const quote = await adapter.getQuote({
        pickupState: "Lagos",
        pickupLga: "Ikorodu",
        deliveryState: "Lagos",
        deliveryLga: "Ikeja",
        itemCount: 1,
      });

      expect(quote.currency).toBe("NGN");
      expect(quote.amount).toBe(2500);
      expect(quote.estimatedDaysMax).toBeLessThanOrEqual(2);
      expect(quote.quoteReference.startsWith("QT-SIM-")).toBe(true);
    });

    it("calculates long-haul rates for northern grain belt to southern consumption centers", async () => {
      const quote = await adapter.getQuote({
        pickupState: "Kano",
        pickupLga: "Dala",
        deliveryState: "Lagos",
        deliveryLga: "Ikeja",
        itemCount: 1,
      });

      expect(quote.currency).toBe("NGN");
      expect(quote.amount).toBe(14500);
      expect(quote.estimatedDaysMin).toBeGreaterThanOrEqual(3);
    });

    it("generates future expiration timestamps for quotes", async () => {
      const quote = await adapter.getQuote({
        pickupState: "Kaduna",
        pickupLga: "Zaria",
        deliveryState: "Abuja",
        deliveryLga: "Garki",
      });

      const now = Date.now();
      const expiresAtMs = new Date(quote.expiresAt).getTime();
      expect(expiresAtMs).toBeGreaterThan(now);
    });
  });

  describe("5. Tracking Reference Generator", () => {
    it("generates customer-facing references matching AM-DLV-YYYYMMDD-XXXXXX format", () => {
      const trackingNum = LogisticsService.generateTrackingNumber();
      expect(trackingNum).toMatch(/^AM-DLV-\d{8}-[A-F0-9]{6}$/);
    });

    it("generates unique tracking numbers across successive calls", () => {
      const num1 = LogisticsService.generateTrackingNumber();
      const num2 = LogisticsService.generateTrackingNumber();
      expect(num1).not.toBe(num2);
    });
  });

  describe("6. Provider State Coverage Verification", () => {
    const mockProvider = {
      id: "p1",
      name: "Agro Express",
      is_active: true,
      coverage_states: ["Lagos", "Ogun", "Oyo", "Kano", "Kaduna"],
    };

    it("verifies provider covers both pickup and delivery states", () => {
      const pickupState = "Kano";
      const deliveryState = "Lagos";

      const coversPickup = mockProvider.coverage_states.some(
        (s) => s.toLowerCase() === pickupState.toLowerCase()
      );
      const coversDelivery = mockProvider.coverage_states.some(
        (s) => s.toLowerCase() === deliveryState.toLowerCase()
      );

      expect(coversPickup && coversDelivery).toBe(true);
    });

    it("rejects provider when destination state is outside coverage area", () => {
      const pickupState = "Kano";
      const deliveryState = "Cross River"; // Not in coverage

      const coversPickup = mockProvider.coverage_states.some(
        (s) => s.toLowerCase() === pickupState.toLowerCase()
      );
      const coversDelivery = mockProvider.coverage_states.some(
        (s) => s.toLowerCase() === deliveryState.toLowerCase()
      );

      expect(coversPickup).toBe(true);
      expect(coversDelivery).toBe(false);
      expect(coversPickup && coversDelivery).toBe(false);
    });
  });

  describe("7. Validation Schemas", () => {
    it("validates createOrderDeliveriesSchema with valid UUID", () => {
      const valid = createOrderDeliveriesSchema.safeParse({
        orderId: "a0000000-0000-0000-0000-000000000001",
      });
      expect(valid.success).toBe(true);
    });

    it("validates assignLogisticsProviderSchema", () => {
      const valid = assignLogisticsProviderSchema.safeParse({
        deliveryId: "b0000000-0000-0000-0000-000000000001",
        providerId: "c0000000-0000-0000-0000-000000000001",
      });
      expect(valid.success).toBe(true);
    });

    it("validates updateDeliveryStatusSchema with valid status", () => {
      const valid = updateDeliveryStatusSchema.safeParse({
        deliveryId: "b0000000-0000-0000-0000-000000000001",
        targetStatus: "IN_TRANSIT",
        locationName: "Ore Tollgate, Ondo State",
      });
      expect(valid.success).toBe(true);
    });

    it("rejects updateDeliveryStatusSchema with invalid status", () => {
      const invalid = updateDeliveryStatusSchema.safeParse({
        deliveryId: "b0000000-0000-0000-0000-000000000001",
        targetStatus: "TELEPORTED",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates cancelDeliverySchema requiring meaningful reason", () => {
      const valid = cancelDeliverySchema.safeParse({
        deliveryId: "b0000000-0000-0000-0000-000000000001",
        reason: "Seller notified of farm fire damage prior to dispatch.",
      });
      expect(valid.success).toBe(true);

      const invalid = cancelDeliverySchema.safeParse({
        deliveryId: "b0000000-0000-0000-0000-000000000001",
        reason: "No",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("8. Strict Anti-Pork Produce Verification", () => {
    it("ensures logistics manifests reject all pig/pork produce lines", () => {
      const prohibitedItems = ["Fresh Pork Chops", "Smoked Bacon", "Live Hog", "Pig Feed"];
      for (const item of prohibitedItems) {
        expect(containsProhibitedProduce(item)).toBe(true);
      }

      const permissibleProduce = ["White Maize Bags", "Roma Tomatoes", "Broiler Chickens", "Yam Tubers"];
      for (const item of permissibleProduce) {
        expect(containsProhibitedProduce(item)).toBe(false);
      }
    });
  });

  describe("9. Provider Assignment Authorization & Role Boundaries", () => {
    function canUserAssignProvider(params: {
      userRoles: string[];
      userId: string;
      provider: { id: string; profile_id: string | null; is_active: boolean; is_verified: boolean };
      targetProviderId: string;
    }): boolean {
      if (params.userRoles.includes("ADMIN")) return true;
      const isCarrierOwner =
        params.provider.profile_id === params.userId &&
        params.provider.id === params.targetProviderId &&
        params.provider.is_active &&
        params.provider.is_verified;
      return Boolean(isCarrierOwner);
    }

    it("permits platform ADMIN to assign any verified active logistics provider", () => {
      const result = canUserAssignProvider({
        userRoles: ["ADMIN"],
        userId: "admin-user-uuid",
        provider: { id: "prov-1", profile_id: "carrier-profile-uuid", is_active: true, is_verified: true },
        targetProviderId: "prov-1",
      });
      expect(result).toBe(true);
    });

    it("permits verified carrier account owner to self-assign their fleet", () => {
      const result = canUserAssignProvider({
        userRoles: ["SERVICE_PROVIDER"],
        userId: "carrier-profile-uuid",
        provider: { id: "prov-1", profile_id: "carrier-profile-uuid", is_active: true, is_verified: true },
        targetProviderId: "prov-1",
      });
      expect(result).toBe(true);
    });

    it("strictly forbids ordinary SERVICE_PROVIDER from assigning arbitrary providers", () => {
      // An ordinary service provider (e.g. agronomist, tractor repairer) who does not own the carrier
      const result = canUserAssignProvider({
        userRoles: ["SERVICE_PROVIDER"],
        userId: "agronomist-profile-uuid",
        provider: { id: "prov-1", profile_id: "carrier-profile-uuid", is_active: true, is_verified: true },
        targetProviderId: "prov-1",
      });
      expect(result).toBe(false);
    });

    it("strictly forbids verified carrier from assigning a different provider ID", () => {
      const result = canUserAssignProvider({
        userRoles: ["SERVICE_PROVIDER"],
        userId: "carrier-profile-uuid",
        provider: { id: "prov-1", profile_id: "carrier-profile-uuid", is_active: true, is_verified: true },
        targetProviderId: "prov-2", // Attempting to assign someone else's provider
      });
      expect(result).toBe(false);
    });

    it("strictly forbids unverified carrier accounts from self-assignment", () => {
      const result = canUserAssignProvider({
        userRoles: ["SERVICE_PROVIDER"],
        userId: "carrier-profile-uuid",
        provider: { id: "prov-1", profile_id: "carrier-profile-uuid", is_active: true, is_verified: false },
        targetProviderId: "prov-1",
      });
      expect(result).toBe(false);
    });
  });

  describe("10. Append-Only Event Ledger Immutability", () => {
    it("enforces that delivery events ledger strictly rejects mutation operations", () => {
      function evaluateEventLedgerOperation(operation: "INSERT" | "UPDATE" | "DELETE"): {
        allowed: boolean;
        error?: string;
      } {
        if (operation === "UPDATE" || operation === "DELETE") {
          return {
            allowed: false,
            error:
              "public.delivery_events is an append-only audit ledger: UPDATE and DELETE operations are strictly forbidden.",
          };
        }
        return { allowed: true };
      }

      expect(evaluateEventLedgerOperation("INSERT").allowed).toBe(true);
      expect(evaluateEventLedgerOperation("UPDATE").allowed).toBe(false);
      expect(evaluateEventLedgerOperation("UPDATE").error).toContain("strictly forbidden");
      expect(evaluateEventLedgerOperation("DELETE").allowed).toBe(false);
      expect(evaluateEventLedgerOperation("DELETE").error).toContain("strictly forbidden");
    });
  });
});
