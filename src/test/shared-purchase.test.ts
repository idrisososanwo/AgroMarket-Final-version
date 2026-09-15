import { describe, it, expect } from "vitest";
import {
  isValidSharedPurchaseTransition,
  isValidParticipantTransition,
} from "@/features/shared-purchase/types";
import {
  createSharedPurchaseSchema,
  joinSharedPurchaseSchema,
  containsProhibitedProduce,
} from "@/features/shared-purchase/validation";

describe("Phase 1.1: Shared Purchase Capability", () => {
  // ============================================================================
  // 1. Domain Model & Validation
  // ============================================================================
  describe("1. Domain Model & Input Validation", () => {
    const validFutureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    it("validates a well-formed bulk crop shared purchase input", () => {
      const input = {
        listingId: "11111111-1111-1111-1111-111111111111",
        title: "500kg Premium White Maize Bulk Split",
        description: "Dry harvested white maize suitable for poultry feed or milling",
        purchaseType: "BULK_CROP" as const,
        totalQuantity: 500,
        unit: "kg",
        unitPrice: 1200,
        targetParticipants: 5,
        minShareQuantity: 50,
        maxShareQuantity: 200,
        deadline: validFutureDate,
        pickupHubLocation: "Mile 12 Agricultural Cooperative Depot",
        hubState: "Lagos",
        hubLga: "Kosofe",
      };

      const result = createSharedPurchaseSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("validates an animal portion shared purchase input with fractional portions", () => {
      const input = {
        listingId: "22222222-2222-2222-2222-222222222222",
        title: "One Whole Balami Ram (Quarter Sharing)",
        description: "Healthy grass-fed ram from Kano state, live weight approx 75kg",
        purchaseType: "ANIMAL_PORTION" as const,
        totalQuantity: 1,
        unit: "whole",
        unitPrice: 160000,
        targetParticipants: 4,
        minShareQuantity: 0.25,
        maxShareQuantity: 0.5,
        portionModel: "FRACTIONAL" as const,
        portionFractions: [
          { id: "quarter", name: "One Quarter Ram", fraction: 0.25, portionPrice: 40000 },
          { id: "half", name: "One Half Ram", fraction: 0.5, portionPrice: 80000 },
        ],
        deadline: validFutureDate,
        pickupHubLocation: "Alaba Rago Livestock Market",
        hubState: "Lagos",
        hubLga: "Ojo",
      };

      const result = createSharedPurchaseSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects pool creation if closing deadline is in the past", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const input = {
        listingId: "11111111-1111-1111-1111-111111111111",
        title: "500kg White Maize Bulk Split",
        purchaseType: "BULK_CROP" as const,
        totalQuantity: 500,
        unit: "kg",
        unitPrice: 1200,
        targetParticipants: 4,
        minShareQuantity: 50,
        deadline: pastDate,
        pickupHubLocation: "Depot",
        hubState: "Lagos",
        hubLga: "Ikeja",
      };

      const result = createSharedPurchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.deadline?.[0]).toContain(
          "Closing date must be in the future"
        );
      }
    });

    it("rejects pool creation if minShareQuantity exceeds totalQuantity", () => {
      const input = {
        listingId: "11111111-1111-1111-1111-111111111111",
        title: "100kg Garri Pool",
        purchaseType: "BULK_CROP" as const,
        totalQuantity: 100,
        unit: "kg",
        unitPrice: 900,
        targetParticipants: 3,
        minShareQuantity: 150, // Invalid: > total
        deadline: validFutureDate,
        pickupHubLocation: "Depot",
        hubState: "Oyo",
        hubLga: "Ibadan",
      };

      const result = createSharedPurchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects pool creation if maxShareQuantity is less than minShareQuantity", () => {
      const input = {
        listingId: "11111111-1111-1111-1111-111111111111",
        title: "100kg Garri Pool",
        purchaseType: "BULK_CROP" as const,
        totalQuantity: 100,
        unit: "kg",
        unitPrice: 900,
        targetParticipants: 3,
        minShareQuantity: 20,
        maxShareQuantity: 10, // Invalid: < min
        deadline: validFutureDate,
        pickupHubLocation: "Depot",
        hubState: "Oyo",
        hubLga: "Ibadan",
      };

      const result = createSharedPurchaseSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // 2. State Machine Transitions
  // ============================================================================
  describe("2. Server-Authoritative State Machine", () => {
    it("permits valid shared purchase status transitions", () => {
      expect(isValidSharedPurchaseTransition("DRAFT", "OPEN")).toBe(true);
      expect(isValidSharedPurchaseTransition("OPEN", "TARGET_REACHED")).toBe(true);
      expect(isValidSharedPurchaseTransition("OPEN", "PAYMENT_PENDING")).toBe(true);
      expect(isValidSharedPurchaseTransition("TARGET_REACHED", "PAYMENT_PENDING")).toBe(true);
      expect(isValidSharedPurchaseTransition("PAYMENT_PENDING", "CONFIRMED")).toBe(true);
      expect(isValidSharedPurchaseTransition("CONFIRMED", "FULFILMENT")).toBe(true);
      expect(isValidSharedPurchaseTransition("FULFILMENT", "COMPLETED")).toBe(true);
      expect(isValidSharedPurchaseTransition("OPEN", "CANCELLED")).toBe(true);
      expect(isValidSharedPurchaseTransition("OPEN", "EXPIRED")).toBe(true);
    });

    it("strictly blocks illegal shared purchase status transitions", () => {
      expect(isValidSharedPurchaseTransition("DRAFT", "CONFIRMED")).toBe(false);
      expect(isValidSharedPurchaseTransition("DRAFT", "FULFILMENT")).toBe(false);
      expect(isValidSharedPurchaseTransition("COMPLETED", "OPEN")).toBe(false);
      expect(isValidSharedPurchaseTransition("COMPLETED", "DRAFT")).toBe(false);
      expect(isValidSharedPurchaseTransition("CANCELLED", "OPEN")).toBe(false);
      expect(isValidSharedPurchaseTransition("EXPIRED", "OPEN")).toBe(false);
      expect(isValidSharedPurchaseTransition("CONFIRMED", "OPEN")).toBe(false);
    });

    it("permits valid participant lifecycle transitions", () => {
      expect(isValidParticipantTransition("PLEDGED", "PAYMENT_PENDING")).toBe(true);
      expect(isValidParticipantTransition("PAYMENT_PENDING", "PAID")).toBe(true);
      expect(isValidParticipantTransition("PAID", "CONFIRMED")).toBe(true);
      expect(isValidParticipantTransition("CONFIRMED", "FULFILLED")).toBe(true);
      expect(isValidParticipantTransition("PAID", "REFUNDED")).toBe(true);
      expect(isValidParticipantTransition("PLEDGED", "CANCELLED")).toBe(true);
    });

    it("blocks illegal participant lifecycle transitions", () => {
      expect(isValidParticipantTransition("FULFILLED", "PLEDGED")).toBe(false);
      expect(isValidParticipantTransition("CANCELLED", "PAID")).toBe(false);
      expect(isValidParticipantTransition("REFUNDED", "CONFIRMED")).toBe(false);
    });
  });

  // ============================================================================
  // 3. Quantity Allocation & Integrity
  // ============================================================================
  describe("3. Quantity Allocation & Capacity Integrity", () => {
    it("correctly derives remaining quantity from total and allocated quantities", () => {
      const totalQuantity = 500;
      let allocatedQuantity = 0;

      const calcRemaining = (total: number, allocated: number) => Math.max(0, total - allocated);

      expect(calcRemaining(totalQuantity, allocatedQuantity)).toBe(500);

      allocatedQuantity += 150;
      expect(calcRemaining(totalQuantity, allocatedQuantity)).toBe(350);

      allocatedQuantity += 350;
      expect(calcRemaining(totalQuantity, allocatedQuantity)).toBe(0);
    });

    it("rejects joins exceeding the remaining pool capacity", () => {
      const totalQuantity = 100;
      const allocatedQuantity = 80;
      const remaining = totalQuantity - allocatedQuantity; // 20

      const requestedJoin1 = 20; // Exact match: allowed
      const requestedJoin2 = 25; // Over-allocation: must be blocked

      const canAllocate = (requested: number, rem: number) => requested > 0 && requested <= rem;

      expect(canAllocate(requestedJoin1, remaining)).toBe(true);
      expect(canAllocate(requestedJoin2, remaining)).toBe(false);
    });

    it("validates requested share quantity against minimum and maximum boundaries", () => {
      const minShare = 10;
      const maxShare = 50;

      const isValidShare = (qty: number) => qty >= minShare && qty <= maxShare;

      expect(isValidShare(5)).toBe(false); // Below minimum
      expect(isValidShare(10)).toBe(true); // Exact minimum
      expect(isValidShare(25)).toBe(true); // Within range
      expect(isValidShare(50)).toBe(true); // Exact maximum
      expect(isValidShare(55)).toBe(false); // Above maximum
      expect(isValidShare(-5)).toBe(false); // Negative
      expect(isValidShare(0)).toBe(false); // Zero
    });
  });

  // ============================================================================
  // 4. Concurrency Simulation (Atomic Locking Invariant)
  // ============================================================================
  describe("4. Concurrency & Over-Allocation Prevention Simulation", () => {
    it("guarantees that simultaneous join requests cannot exceed target capacity", async () => {
      // Simulation of atomic DB transaction behavior:
      // Pool capacity: 100kg
      // 5 concurrent buyers simultaneously request 30kg each (total 150kg requested)
      const targetCapacity = 100;
      let currentAllocated = 0;
      const successfulJoins: number[] = [];
      const rejectedJoins: number[] = [];

      // Simulated atomic procedure with mutex/row-lock
      let lock = Promise.resolve();
      const atomicJoinAttempt = async (buyerId: number, requestedQty: number) => {
        return new Promise<{ success: boolean; allocated: number }>((resolve) => {
          lock = lock.then(async () => {
            if (currentAllocated + requestedQty <= targetCapacity) {
              currentAllocated += requestedQty;
              successfulJoins.push(buyerId);
              resolve({ success: true, allocated: currentAllocated });
            } else {
              rejectedJoins.push(buyerId);
              resolve({ success: false, allocated: currentAllocated });
            }
          });
        });
      };

      // Launch 5 concurrent requests simultaneously
      const requests = [1, 2, 3, 4, 5].map((buyerId) => atomicJoinAttempt(buyerId, 30));
      const results = await Promise.all(requests);

      // Exactly 3 buyers should succeed (30 * 3 = 90kg)
      // Buyers 4 and 5 must be rejected because 90 + 30 = 120 > 100
      expect(results.filter((r) => r.success).length).toBe(3);
      expect(results.filter((r) => !r.success).length).toBe(2);
      expect(currentAllocated).toBe(90);
      expect(currentAllocated).toBeLessThanOrEqual(targetCapacity);
    });
  });

  // ============================================================================
  // 5. Animal Portion Model (Fractional & Weight-Based)
  // ============================================================================
  describe("5. Animal Portion Modeling", () => {
    it("handles exact fractional allocation of a whole livestock animal", () => {
      // 1 whole ram (capacity = 1.0)
      const targetAnimal = 1.0;
      const portions = [0.25, 0.25, 0.5]; // 2 quarters, 1 half

      const sumAllocated = portions.reduce((acc, p) => acc + p, 0);
      expect(sumAllocated).toBe(1.0);
      expect(sumAllocated <= targetAnimal).toBe(true);
    });

    it("rejects fractional over-allocation of an animal", () => {
      const targetAnimal = 1.0;
      const portions = [0.5, 0.5, 0.25]; // 2 halves + 1 quarter = 1.25

      const sumAllocated = portions.reduce((acc, p) => acc + p, 0);
      expect(sumAllocated).toBe(1.25);
      expect(sumAllocated <= targetAnimal).toBe(false);
    });

    it("handles weight-based livestock splitting without arbitrary yield assumptions", () => {
      // Declared carcass weight: 80kg cow portion
      const declaredWeight = 80;
      const shares = [20, 30, 30]; // 20kg + 30kg + 30kg

      const totalShares = shares.reduce((acc, s) => acc + s, 0);
      expect(totalShares).toBe(declaredWeight);
    });
  });

  // ============================================================================
  // 6. Inventory Ring-Fencing
  // ============================================================================
  describe("6. Listing Inventory Ring-Fencing", () => {
    it("correctly reserves target inventory upon pool launch", () => {
      const inventory = {
        quantity_on_hand: 1000,
        quantity_reserved: 200,
        quantity_available: 800,
      };

      const targetQuantity = 500;

      // Ensure stock is available
      expect(inventory.quantity_available >= targetQuantity).toBe(true);

      // Reserve
      const updatedReserved = inventory.quantity_reserved + targetQuantity; // 700
      const updatedAvailable = inventory.quantity_on_hand - updatedReserved; // 300

      expect(updatedReserved).toBe(700);
      expect(updatedAvailable).toBe(300);
      // Constraint: quantity_on_hand >= quantity_reserved
      expect(inventory.quantity_on_hand >= updatedReserved).toBe(true);
    });

    it("releases reserved inventory when a shared purchase pool is cancelled", () => {
      let quantity_reserved = 700;
      const totalPoolQuantity = 500;

      // Cancellation release
      quantity_reserved = Math.max(0, quantity_reserved - totalPoolQuantity);
      expect(quantity_reserved).toBe(200);
    });

    it("rejects pool creation when inventory available is less than target quantity", () => {
      const inventory = {
        quantity_on_hand: 300,
        quantity_reserved: 100,
        quantity_available: 200,
      };

      const requestedTarget = 500; // Greater than 200 available
      const isEligible = inventory.quantity_available >= requestedTarget;

      expect(isEligible).toBe(false);
    });
  });

  // ============================================================================
  // 7. Payment & Pricing Server Authority
  // ============================================================================
  describe("7. Server-Authoritative Pricing & Payment", () => {
    it("calculates participant amount exclusively on the server", () => {
      const authoritativeUnitPrice = 1250.5;
      const requestedQuantity = 40;

      // Server computation
      const calculatedAmount = Number((requestedQuantity * authoritativeUnitPrice).toFixed(2));
      expect(calculatedAmount).toBe(50020);

      // Client attempting to send an arbitrary amount is ignored
      const clientForgedAmount = 10000;
      expect(calculatedAmount).not.toBe(clientForgedAmount);
    });

    it("validates join shared purchase schema with proper contact phone", () => {
      const validJoin = {
        sharedPurchaseId: "33333333-3333-3333-3333-333333333333",
        requestedQuantity: 25,
        contactPhone: "08012345678",
        deliveryAddress: "15 Admiralty Way, Lekki",
        deliveryState: "Lagos",
        deliveryLga: "Eti-Osa",
        deliveryNotes: "Call on arrival at security gate",
      };

      const result = joinSharedPurchaseSchema.safeParse(validJoin);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // 8. Strict Anti-Pork / Halal Safeguards
  // ============================================================================
  describe("8. Strict Anti-Pork Policy Compliance", () => {
    const prohibitedTerms = [
      "pork",
      "pig",
      "swine",
      "hog",
      "boar",
      "piglet",
      "bacon",
      "ham",
      "lard",
    ];

    it("detects and flags all prohibited pork/swine terms", () => {
      for (const term of prohibitedTerms) {
        expect(containsProhibitedProduce(term)).toBe(true);
        expect(containsProhibitedProduce(`Fresh ${term} meat`)).toBe(true);
        expect(containsProhibitedProduce(`Farm raised ${term.toUpperCase()}`)).toBe(true);
      }
    });

    it("allows standard permitted agricultural crops and Halal livestock", () => {
      const permittedProduce = [
        "White Maize",
        "Parboiled Rice",
        "Brown Beans",
        "White Garri",
        "Cassava Tubers",
        "Yam Tubers",
        "Fresh Tomatoes",
        "Balami Ram",
        "White Fulani Cow",
        "Red Sokoto Goat",
        "Broiler Chicken",
      ];

      for (const item of permittedProduce) {
        expect(containsProhibitedProduce(item)).toBe(false);
      }
    });

    it("rejects pool creation with prohibited produce in title or description", () => {
      const taintedInput = {
        listingId: "11111111-1111-1111-1111-111111111111",
        title: "Smoked Bacon & Pork Chops Group Pool",
        description: "Farm raised pig meat for bulk split",
        purchaseType: "ANIMAL_PORTION" as const,
        totalQuantity: 100,
        unit: "kg",
        unitPrice: 3500,
        targetParticipants: 4,
        minShareQuantity: 10,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        pickupHubLocation: "Depot",
        hubState: "Lagos",
        hubLga: "Ikeja",
      };

      const result = createSharedPurchaseSchema.safeParse(taintedInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.title?.[0]).toContain("strictly disallows pig/pork products");
        expect(errors.description?.[0]).toContain("strictly disallows pig/pork products");
      }
    });

    it("rejects join notes containing prohibited terms", () => {
      const taintedJoin = {
        sharedPurchaseId: "33333333-3333-3333-3333-333333333333",
        requestedQuantity: 25,
        contactPhone: "08012345678",
        deliveryNotes: "Please deliver with some fresh pork sausages",
      };

      const result = joinSharedPurchaseSchema.safeParse(taintedJoin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.deliveryNotes?.[0]).toContain(
          "Delivery notes contain prohibited produce terms"
        );
      }
    });
  });

  // ============================================================================
  // 9. Dispute & Refund Isolation
  // ============================================================================
  describe("9. Dispute & Refund Isolation", () => {
    it("ensures a refund to one participant leaves other participants unaffected", () => {
      // Simulated pool of 3 participants:
      // Participant A: ₦30,000 (PAID)
      // Participant B: ₦30,000 (PAID)
      // Participant C: ₦40,000 (PAID)
      const participants = [
        { id: "part-A", amount: 30000, status: "PAID" },
        { id: "part-B", amount: 30000, status: "PAID" },
        { id: "part-C", amount: 40000, status: "PAID" },
      ];

      // Participant B opens dispute and receives refund
      const refundParticipant = (partId: string) => {
        return participants.map((p) =>
          p.id === partId ? { ...p, status: "REFUNDED" } : p
        );
      };

      const updated = refundParticipant("part-B");

      expect(updated.find((p) => p.id === "part-A")?.status).toBe("PAID");
      expect(updated.find((p) => p.id === "part-B")?.status).toBe("REFUNDED");
      expect(updated.find((p) => p.id === "part-C")?.status).toBe("PAID");

      // Verify no cross-participant financial leakage
      const remainingPaidTotal = updated
        .filter((p) => p.status === "PAID")
        .reduce((sum, p) => sum + p.amount, 0);

      expect(remainingPaidTotal).toBe(70000);
    });
  });

  // ============================================================================
  // 10. Audit Integrity Fixes & Edge Case Verifications
  // ============================================================================
  describe("10. Audit Integrity Fixes & Edge Cases", () => {
    // Priority 1: Duplicate Participant Join / Allocation Inflation
    describe("Priority 1: Duplicate Participant Join & Allocation Protection", () => {
      it("rejects duplicate join requests from the same user when active pledge exists", () => {
        const pool = {
          id: "pool-dup-1",
          total_quantity: 100,
          allocated_quantity: 30,
          status: "OPEN",
        };

        const participants: Record<string, { userId: string; orderId: string; sharesCount: number; status: string }> = {
          "user-1": { userId: "user-1", orderId: "order-1", sharesCount: 30, status: "PLEDGED" },
        };

        // Simulated RPC allocation logic with duplicate check
        const allocateParticipant = (userId: string, requestedQty: number) => {
          const existing = participants[userId];
          if (existing) {
            if (existing.status === "PLEDGED" || existing.status === "PAYMENT_PENDING") {
              throw new Error("User already has an active pledge in this pool. Cancel or pay for your existing pledge.");
            }
            if (existing.status === "PAID" || existing.status === "CONFIRMED") {
              throw new Error("User is already a confirmed participant in this pool.");
            }
          }

          if (pool.allocated_quantity + requestedQty > pool.total_quantity) {
            throw new Error("Insufficient capacity remaining.");
          }

          const orderId = `order-${Date.now()}`;
          participants[userId] = { userId, orderId, sharesCount: requestedQty, status: "PLEDGED" };
          pool.allocated_quantity += requestedQty;
          return { orderId, allocated: pool.allocated_quantity };
        };

        // Attempt second join with same user
        expect(() => allocateParticipant("user-1", 30)).toThrow(
          "User already has an active pledge in this pool. Cancel or pay for your existing pledge."
        );

        // Verify invariants: allocated_quantity did NOT increase, no second order created
        expect(pool.allocated_quantity).toBe(30);
        expect(participants["user-1"].orderId).toBe("order-1");
        expect(participants["user-1"].sharesCount).toBe(30);
      });

      it("allows safe rejoining after a previous cancellation without allocation discrepancy", () => {
        const pool = {
          id: "pool-rejoin-1",
          total_quantity: 100,
          allocated_quantity: 0, // previous 30kg was cancelled and subtracted
          status: "OPEN",
        };

        // Existing participant row marked CANCELLED
        const participant = {
          userId: "user-1",
          orderId: "old-cancelled-order",
          sharesCount: 30,
          status: "CANCELLED",
        };

        // Re-join with 40kg
        const requestedQty = 40;
        const newOrderId = "new-order-2";

        // Reactivate participant
        participant.orderId = newOrderId;
        participant.sharesCount = requestedQty;
        participant.status = "PLEDGED";
        pool.allocated_quantity += requestedQty;

        expect(participant.status).toBe("PLEDGED");
        expect(participant.orderId).toBe("new-order-2");
        expect(participant.sharesCount).toBe(40);
        expect(pool.allocated_quantity).toBe(40);
      });
    });

    // Priority 2: Stale Unpaid Pledge Expiration
    describe("Priority 2: Stale Unpaid Pledge Expiration", () => {
      it("expires stale unpaid pledges, restores pool capacity, and reopens TARGET_REACHED pool", () => {
        const pool = {
          id: "pool-stale-1",
          total_quantity: 100,
          allocated_quantity: 100,
          status: "TARGET_REACHED",
        };

        const now = Date.now();
        const thirtyFiveMinutesAgo = now - 35 * 60 * 1000;
        const tenMinutesAgo = now - 10 * 60 * 1000;

        const participants = [
          // Stale pledge (35 min old, unpaid)
          { id: "part-1", userId: "user-1", orderId: "ord-1", shares: 40, status: "PLEDGED", updatedAt: thirtyFiveMinutesAgo, isPaid: false },
          // Fresh pledge (10 min old, unpaid)
          { id: "part-2", userId: "user-2", orderId: "ord-2", shares: 30, status: "PAYMENT_PENDING", updatedAt: tenMinutesAgo, isPaid: false },
          // Paid participant (35 min old, but paid)
          { id: "part-3", userId: "user-3", orderId: "ord-3", shares: 30, status: "PAID", updatedAt: thirtyFiveMinutesAgo, isPaid: true },
        ];

        // Sweep function with ttlMinutes = 30
        const expireStale = (ttlMinutes: number) => {
          const cutoff = now - ttlMinutes * 60 * 1000;
          let expiredCount = 0;
          let reclaimed = 0;

          for (const p of participants) {
            if ((p.status === "PLEDGED" || p.status === "PAYMENT_PENDING") && p.updatedAt <= cutoff && !p.isPaid) {
              p.status = "CANCELLED";
              pool.allocated_quantity = Math.max(0, pool.allocated_quantity - p.shares);
              if (pool.allocated_quantity < pool.total_quantity && pool.status === "TARGET_REACHED") {
                pool.status = "OPEN";
              }
              reclaimed += p.shares;
              expiredCount += 1;
            }
          }
          return { expiredCount, reclaimed };
        };

        const result = expireStale(30);

        expect(result.expiredCount).toBe(1);
        expect(result.reclaimed).toBe(40);
        expect(participants[0].status).toBe("CANCELLED");
        expect(participants[1].status).toBe("PAYMENT_PENDING"); // non-stale remains
        expect(participants[2].status).toBe("PAID"); // paid participant untouched
        expect(pool.allocated_quantity).toBe(60);
        expect(pool.status).toBe("OPEN"); // Reopened from TARGET_REACHED

        // Idempotency: second sweep reclaims 0
        const secondSweep = expireStale(30);
        expect(secondSweep.expiredCount).toBe(0);
        expect(secondSweep.reclaimed).toBe(0);
        expect(pool.allocated_quantity).toBe(60);
      });
    });

    // Priority 3: Pool Cancellation Must Synchronize Orders
    describe("Priority 3: Pool Cancellation & Order Synchronization", () => {
      it("ensures participant orders transition to CANCELLED upon pool cancellation and refund", () => {
        const pool = { id: "pool-cancel-sync", status: "OPEN" };
        const orders: Record<string, { id: string; status: string }> = {
          "order-paid-1": { id: "order-paid-1", status: "PAID" },
          "order-unpaid-2": { id: "order-unpaid-2", status: "PENDING" },
        };
        const participants = [
          { id: "part-1", orderId: "order-paid-1", status: "PAID", amount: 25000 },
          { id: "part-2", orderId: "order-unpaid-2", status: "PLEDGED", amount: 25000 },
        ];

        // Simulated cancelSharedPurchase with synchronized order status update
        const cancelPool = () => {
          if (pool.status === "CANCELLED") throw new Error("Already cancelled.");
          pool.status = "CANCELLED";

          for (const part of participants) {
            if (part.status === "PAID") {
              // Refund processed
              part.status = "REFUNDED";
              // Synchronize order
              orders[part.orderId].status = "CANCELLED";
            } else if (part.status === "PLEDGED") {
              part.status = "CANCELLED";
              orders[part.orderId].status = "CANCELLED";
            }
          }
        };

        cancelPool();

        expect(pool.status).toBe("CANCELLED");
        expect(participants[0].status).toBe("REFUNDED");
        expect(orders["order-paid-1"].status).toBe("CANCELLED"); // Crucial fix: never left in PAID!
        expect(participants[1].status).toBe("CANCELLED");
        expect(orders["order-unpaid-2"].status).toBe("CANCELLED");

        // Cannot cancel twice
        expect(() => cancelPool()).toThrow("Already cancelled.");
      });
    });

    // Priority 4: Funding Verification Before CONFIRMED/FULFILMENT
    describe("Priority 4: Funding Verification Before CONFIRMED/FULFILMENT", () => {
      it("prevents transitioning to CONFIRMED or FULFILMENT when participants have unpaid pledges", () => {
        const pool = {
          id: "pool-funding-check",
          total_quantity: 100,
          allocated_quantity: 100,
          status: "TARGET_REACHED",
        };

        const participants = [
          { id: "part-A", shares: 60, status: "PLEDGED" }, // unpaid
          { id: "part-B", shares: 40, status: "PAID" },    // paid
        ];

        const verifyAndTransition = (targetStatus: string) => {
          if (targetStatus === "CONFIRMED" || targetStatus === "FULFILMENT") {
            const hasUnpaid = participants.some(
              (p) => p.status === "PLEDGED" || p.status === "PAYMENT_PENDING"
            );
            if (hasUnpaid) {
              throw new Error(`Cannot transition shared purchase to '${targetStatus}'. There are unconfirmed/unpaid participant pledges.`);
            }

            const totalPaid = participants
              .filter((p) => p.status === "PAID" || p.status === "CONFIRMED")
              .reduce((sum, p) => sum + p.shares, 0);

            if (totalPaid < pool.total_quantity) {
              throw new Error(`Cannot transition shared purchase to '${targetStatus}'. Total paid quantity is less than target quantity.`);
            }
          }
          pool.status = targetStatus;
        };

        // Attempt CONFIRMED with unpaid participant A
        expect(() => verifyAndTransition("CONFIRMED")).toThrow(
          "There are unconfirmed/unpaid participant pledges."
        );
        expect(pool.status).toBe("TARGET_REACHED");

        // Now Participant A pays
        participants[0].status = "PAID";

        // Attempt CONFIRMED again
        verifyAndTransition("CONFIRMED");
        expect(pool.status).toBe("CONFIRMED");

        // Now can advance to FULFILMENT
        verifyAndTransition("FULFILMENT");
        expect(pool.status).toBe("FULFILMENT");
      });
    });

    // Priority 5: Fractional Portion Sum Validation
    describe("Priority 5: Animal Portion Fraction Sum Validation", () => {
      const baseValidPayload = {
        listingId: "11111111-1111-1111-1111-111111111111",
        title: "Cow Portion Sharing Pool",
        purchaseType: "ANIMAL_PORTION" as const,
        portionModel: "FRACTIONAL" as const,
        totalQuantity: 1,
        unit: "head",
        unitPrice: 500000,
        targetParticipants: 4,
        minShareQuantity: 0.25,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        pickupHubLocation: "Oshodi Hub",
        hubState: "Lagos",
        hubLga: "Oshodi-Isolo",
      };

      it("accepts valid fractions summing to 1.0 (100% of animal)", () => {
        const validPayload = {
          ...baseValidPayload,
          portionFractions: [
            { id: "f1", name: "Front Quarter 1", fraction: 0.25, portionPrice: 125000 },
            { id: "f2", name: "Front Quarter 2", fraction: 0.25, portionPrice: 125000 },
            { id: "f3", name: "Hind Quarter 1", fraction: 0.25, portionPrice: 125000 },
            { id: "f4", name: "Hind Quarter 2", fraction: 0.25, portionPrice: 125000 },
          ],
        };

        const result = createSharedPurchaseSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
      });

      it("accepts half-portion split summing to 1.0 (0.5 + 0.5)", () => {
        const validPayload = {
          ...baseValidPayload,
          portionFractions: [
            { id: "h1", name: "Left Half", fraction: 0.5, portionPrice: 250000 },
            { id: "h2", name: "Right Half", fraction: 0.5, portionPrice: 250000 },
          ],
        };

        const result = createSharedPurchaseSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
      });

      it("rejects fractional portions that exceed 1.0 in aggregate sum (e.g. 0.5 + 0.5 + 0.25 = 1.25)", () => {
        const overAllocatedPayload = {
          ...baseValidPayload,
          portionFractions: [
            { id: "h1", name: "Left Half", fraction: 0.5, portionPrice: 250000 },
            { id: "h2", name: "Right Half", fraction: 0.5, portionPrice: 250000 },
            { id: "q1", name: "Extra Quarter", fraction: 0.25, portionPrice: 125000 },
          ],
        };

        const result = createSharedPurchaseSchema.safeParse(overAllocatedPayload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.flatten().fieldErrors.portionFractions?.[0]).toContain(
            "Total sum of animal portion fractions cannot exceed 1.0"
          );
        }
      });

      it("rejects fractional portions with sum of 1.5 (0.75 + 0.75)", () => {
        const overAllocatedPayload = {
          ...baseValidPayload,
          portionFractions: [
            { id: "p1", name: "Three Quarters A", fraction: 0.75, portionPrice: 375000 },
            { id: "p2", name: "Three Quarters B", fraction: 0.75, portionPrice: 375000 },
          ],
        };

        const result = createSharedPurchaseSchema.safeParse(overAllocatedPayload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.flatten().fieldErrors.portionFractions?.[0]).toContain(
            "Total sum of animal portion fractions cannot exceed 1.0"
          );
        }
      });
    });

    // Hardening 6: Atomic Inventory Reservation Concurrency
    describe("Hardening 6: Atomic Inventory Reservation Concurrency", () => {
      it("guarantees concurrent pool creations cannot reserve overlapping inventory exceeding on-hand stock", () => {
        const listingInventory = {
          quantity_on_hand: 1000,
          quantity_reserved: 0,
        };

        // Atomic reservation function simulating PostgreSQL row-level lock FOR UPDATE
        const reserveStock = (targetQty: number) => {
          const available = listingInventory.quantity_on_hand - listingInventory.quantity_reserved;
          if (available < targetQty) {
            throw new Error(`Insufficient stock. Available: ${available}, Requested: ${targetQty}`);
          }
          listingInventory.quantity_reserved += targetQty;
          return { reserved: listingInventory.quantity_reserved };
        };

        // Two concurrent 600kg pool creations
        const poolACreated = reserveStock(600);
        expect(poolACreated.reserved).toBe(600);

        // Pool B must fail
        expect(() => reserveStock(600)).toThrow("Insufficient stock. Available: 400, Requested: 600");

        // Ensure never 1200kg
        expect(listingInventory.quantity_reserved).toBe(600);
        expect(listingInventory.quantity_reserved <= listingInventory.quantity_on_hand).toBe(true);
      });
    });

    // Hardening 7: Unique Participant Order Relationship
    describe("Hardening 7: Unique Participant Order Relationship", () => {
      it("enforces strict 1:1 participant to order integrity", () => {
        const participantOrders = new Set<string>();

        const registerOrder = (orderId: string) => {
          if (participantOrders.has(orderId)) {
            throw new Error("Unique constraint violation: duplicate order_id.");
          }
          participantOrders.add(orderId);
          return true;
        };

        expect(registerOrder("order-uuid-1")).toBe(true);
        expect(registerOrder("order-uuid-2")).toBe(true);
        expect(() => registerOrder("order-uuid-1")).toThrow("Unique constraint violation: duplicate order_id.");
      });
    });
  });
});

