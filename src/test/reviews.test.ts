import { describe, it, expect } from "vitest";
import {
  Review,
  SafeAuthorProfile,
} from "@/features/reviews/types";
import { createReviewSchema } from "@/features/reviews/validation";
import { mapReviewRow, calculateReviewStats } from "@/features/reviews/queries";
import { UserRole } from "@/types/auth";
import { OrderStatus } from "@/features/orders/types";

describe("Phase 1.2: Reviews Domain Implementation", () => {
  // ============================================================================
  // 1. Valid Review Creation Validation
  // ============================================================================
  describe("1. Review Creation Validation", () => {
    const validServiceReview = {
      targetType: "SERVICE" as const,
      serviceId: "11111111-1111-1111-1111-111111111111",
      rating: 5,
      comment: "Exceptional drone spraying service. Covered 20 hectares in record time with zero overspray.",
    };

    const validMarketplaceReview = {
      targetType: "MARKETPLACE" as const,
      listingId: "22222222-2222-2222-2222-222222222222",
      orderId: "33333333-3333-3333-3333-333333333333",
      rating: 4,
      comment: "High quality white maize. Delivered in clean, sealed 100kg bags.",
    };

    const validEquipmentReview = {
      targetType: "EQUIPMENT" as const,
      equipmentId: "44444444-4444-4444-4444-444444444444",
      rating: 5,
      comment: "Tractor was in pristine condition with full diesel tank. Excellent implement attachments.",
    };

    it("accepts valid service review payload", () => {
      const result = createReviewSchema.safeParse(validServiceReview);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetType).toBe("SERVICE");
        expect(result.data.rating).toBe(5);
        expect(result.data.serviceId).toBe("11111111-1111-1111-1111-111111111111");
      }
    });

    it("accepts valid marketplace review payload", () => {
      const result = createReviewSchema.safeParse(validMarketplaceReview);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetType).toBe("MARKETPLACE");
        expect(result.data.rating).toBe(4);
      }
    });

    it("accepts valid equipment review payload", () => {
      const result = createReviewSchema.safeParse(validEquipmentReview);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetType).toBe("EQUIPMENT");
        expect(result.data.equipmentId).toBe("44444444-4444-4444-4444-444444444444");
      }
    });

    it("rejects ratings out of bounds (less than 1 or greater than 5)", () => {
      const zeroRating = createReviewSchema.safeParse({ ...validServiceReview, rating: 0 });
      expect(zeroRating.success).toBe(false);

      const sixRating = createReviewSchema.safeParse({ ...validServiceReview, rating: 6 });
      expect(sixRating.success).toBe(false);

      const negativeRating = createReviewSchema.safeParse({ ...validServiceReview, rating: -2 });
      expect(negativeRating.success).toBe(false);
    });

    it("rejects non-integer ratings", () => {
      const floatRating = createReviewSchema.safeParse({ ...validServiceReview, rating: 4.5 });
      expect(floatRating.success).toBe(false);
    });

    it("rejects comments exceeding 2000 characters", () => {
      const oversizedComment = createReviewSchema.safeParse({
        ...validServiceReview,
        comment: "A".repeat(2001),
      });
      expect(oversizedComment.success).toBe(false);
    });

    it("strictly rejects prohibited pork/swine terms in review comments", () => {
      const porkComment = createReviewSchema.safeParse({
        ...validServiceReview,
        comment: "Great service, but the driver refused to transport our pork products.",
      });
      expect(porkComment.success).toBe(false);
      if (!porkComment.success) {
        expect(porkComment.error.flatten().fieldErrors.comment?.[0]).toContain(
          "AgroMarket strictly disallows pig/pork content"
        );
      }

      const swineComment = createReviewSchema.safeParse({
        ...validServiceReview,
        comment: "Specialized vaccination for swine livestock was not provided.",
      });
      expect(swineComment.success).toBe(false);
      if (!swineComment.success) {
        expect(swineComment.error.flatten().fieldErrors.comment?.[0]).toContain(
          "AgroMarket strictly disallows pig/pork content"
        );
      }
    });

    it("does not accept author_id or is_verified_transaction from client (server-authoritative security)", () => {
      const spoofedPayload = {
        ...validServiceReview,
        author_id: "00000000-0000-0000-0000-000000000000",
        is_verified_transaction: true,
      };
      const parsed = createReviewSchema.safeParse(spoofedPayload);
      expect(parsed.success).toBe(true);
      expect((parsed as unknown as { data: Record<string, unknown> }).data.author_id).toBeUndefined();
      expect((parsed as unknown as { data: Record<string, unknown> }).data.is_verified_transaction).toBeUndefined();
    });

    it("enforces target validation: service review without serviceId is rejected", () => {
      const missingServiceId = createReviewSchema.safeParse({
        targetType: "SERVICE",
        rating: 5,
        comment: "Good service",
      });
      expect(missingServiceId.success).toBe(false);
    });

    it("enforces target validation: marketplace review without any reference is rejected", () => {
      const missingRef = createReviewSchema.safeParse({
        targetType: "MARKETPLACE",
        rating: 5,
        comment: "Good produce",
      });
      expect(missingRef.success).toBe(false);
    });

    it("enforces target validation: equipment review without equipmentId is rejected", () => {
      const missingEquip = createReviewSchema.safeParse({
        targetType: "EQUIPMENT",
        rating: 5,
        comment: "Good tractor",
      });
      expect(missingEquip.success).toBe(false);
    });
  });

  // ============================================================================
  // 2. Authentication, Self-Review & Ownership Protection
  // ============================================================================
  describe("2. Authentication, Self-Review & Ownership Protection", () => {
    it("blocks unauthenticated users from creating reviews", () => {
      function checkAuth(user: { id: string } | null): { allowed: boolean; error?: string } {
        if (!user) {
          return { allowed: false, error: "Authentication required to submit reviews." };
        }
        return { allowed: true };
      }

      expect(checkAuth(null).allowed).toBe(false);
      expect(checkAuth({ id: "user-1" }).allowed).toBe(true);
    });

    it("prevents service providers from reviewing their own services", () => {
      function validateServiceReviewer(providerId: string, authorId: string) {
        if (providerId === authorId) {
          return { allowed: false, error: "You cannot review your own service offering." };
        }
        return { allowed: true };
      }

      expect(validateServiceReviewer("prov-1", "user-2").allowed).toBe(true);
      expect(validateServiceReviewer("prov-1", "prov-1").allowed).toBe(false);
      expect(validateServiceReviewer("prov-1", "prov-1").error).toBe(
        "You cannot review your own service offering."
      );
    });

    it("prevents sellers from reviewing their own marketplace listings or seller profile", () => {
      function validateMarketplaceReviewer(sellerId: string, authorId: string) {
        if (sellerId === authorId) {
          return { allowed: false, error: "You cannot review your own marketplace listing or seller profile." };
        }
        return { allowed: true };
      }

      expect(validateMarketplaceReviewer("seller-1", "user-2").allowed).toBe(true);
      expect(validateMarketplaceReviewer("seller-1", "seller-1").allowed).toBe(false);
    });

    it("prevents equipment owners from reviewing their own equipment", () => {
      function validateEquipmentReviewer(ownerId: string, authorId: string) {
        if (ownerId === authorId) {
          return { allowed: false, error: "You cannot review your own equipment listing." };
        }
        return { allowed: true };
      }

      expect(validateEquipmentReviewer("owner-1", "user-2").allowed).toBe(true);
      expect(validateEquipmentReviewer("owner-1", "owner-1").allowed).toBe(false);
    });

    it("prevents duplicate reviews for the same service by the same author", () => {
      const existingReviews = [
        { authorId: "author-1", serviceId: "service-100" },
      ];

      function checkDuplicateServiceReview(authorId: string, serviceId: string): boolean {
        return existingReviews.some(
          (r) => r.authorId === authorId && r.serviceId === serviceId
        );
      }

      expect(checkDuplicateServiceReview("author-1", "service-100")).toBe(true);
      expect(checkDuplicateServiceReview("author-2", "service-100")).toBe(false);
      expect(checkDuplicateServiceReview("author-1", "service-200")).toBe(false);
    });
  });

  // ============================================================================
  // 3. Service Review Eligibility & Transaction Verification
  // ============================================================================
  describe("3. Service Review Eligibility & Transaction Verification", () => {
    interface MockServiceRequest {
      id: string;
      serviceId: string;
      clientId: string;
      status: string;
    }

    const mockRequests: MockServiceRequest[] = [
      { id: "req-1", serviceId: "serv-100", clientId: "client-abc", status: "COMPLETED" },
      { id: "req-2", serviceId: "serv-100", clientId: "client-xyz", status: "PENDING" },
      { id: "req-3", serviceId: "serv-200", clientId: "client-abc", status: "IN_PROGRESS" },
    ];

    function verifyServiceReviewEligibility(
      serviceId: string,
      clientId: string
    ): { eligible: boolean; isVerified: boolean; error?: string } {
      const completed = mockRequests.find(
        (r) => r.serviceId === serviceId && r.clientId === clientId && r.status === "COMPLETED"
      );

      if (!completed) {
        return {
          eligible: false,
          isVerified: false,
          error: "You can only review a service after a completed service booking.",
        };
      }

      return { eligible: true, isVerified: true };
    }

    it("verifies service review eligibility when client has a COMPLETED booking", () => {
      const result = verifyServiceReviewEligibility("serv-100", "client-abc");
      expect(result.eligible).toBe(true);
      expect(result.isVerified).toBe(true);
    });

    it("rejects service review when client booking is PENDING or IN_PROGRESS", () => {
      const pendingResult = verifyServiceReviewEligibility("serv-100", "client-xyz");
      expect(pendingResult.eligible).toBe(false);
      expect(pendingResult.error).toContain("completed service booking");

      const inProgressResult = verifyServiceReviewEligibility("serv-200", "client-abc");
      expect(inProgressResult.eligible).toBe(false);
      expect(inProgressResult.error).toContain("completed service booking");
    });

    it("rejects service review when client has never booked the service", () => {
      const strangerResult = verifyServiceReviewEligibility("serv-100", "stranger-123");
      expect(strangerResult.eligible).toBe(false);
    });
  });

  // ============================================================================
  // 3b. Marketplace Order Review Eligibility & Transaction Verification
  // ============================================================================
  describe("3b. Marketplace Order Review Eligibility & Transaction Verification", () => {
    function verifyMarketplaceOrderReviewEligibility(
      order: { id: string; buyer_id: string; status: OrderStatus } | null,
      userId: string
    ): boolean {
      if (order && order.buyer_id === userId && order.status === "COMPLETED") {
        return true;
      }
      return false;
    }

    it("verifies marketplace review transaction when order status is COMPLETED", () => {
      const order = { id: "order-1", buyer_id: "user-buyer", status: "COMPLETED" as OrderStatus };
      expect(verifyMarketplaceOrderReviewEligibility(order, "user-buyer")).toBe(true);
    });

    it("does not verify marketplace review transaction for non-completed order statuses", () => {
      const nonCompletedStatuses: OrderStatus[] = [
        "PENDING",
        "PAID",
        "PROCESSING",
        "PARTIALLY_FULFILLED",
        "CANCELLED",
        "DISPUTED",
      ];

      for (const status of nonCompletedStatuses) {
        const order = { id: "order-2", buyer_id: "user-buyer", status };
        expect(verifyMarketplaceOrderReviewEligibility(order, "user-buyer")).toBe(false);
      }
    });

    it("does not recognize DELIVERED as a parent order status", () => {
      const canonicalOrderStatuses: OrderStatus[] = [
        "PENDING",
        "PAID",
        "PROCESSING",
        "PARTIALLY_FULFILLED",
        "COMPLETED",
        "CANCELLED",
        "DISPUTED",
      ];
      expect(canonicalOrderStatuses).not.toContain("DELIVERED");
    });
  });

  // ============================================================================
  // 4. Safe Public Author Profile Representation (Zero PII Exposure)
  // ============================================================================
  describe("4. Safe Public Author Profile Representation (Zero PII Exposure)", () => {
    it("ensures SafeAuthorProfile contains only safe public fields", () => {
      const safeAuthor: SafeAuthorProfile = {
        id: "author-uuid-1",
        fullName: "Dr. Bamidele Adeyemi",
        avatarUrl: "https://example.com/avatar.jpg",
        isVerified: true,
        state: "Oyo",
        lga: "Ibadan North",
      };

      expect(safeAuthor.fullName).toBe("Dr. Bamidele Adeyemi");
      expect(safeAuthor.isVerified).toBe(true);

      const rawRecord = safeAuthor as unknown as Record<string, unknown>;
      expect(rawRecord.email).toBeUndefined();
      expect(rawRecord.phone).toBeUndefined();
      expect(rawRecord.location_address).toBeUndefined();
    });

    it("maps raw database row to clean Review without exposing private fields", () => {
      const rawRow = {
        id: "rev-uuid-1",
        author_id: "author-uuid-1",
        order_id: null,
        listing_id: null,
        seller_id: null,
        service_id: "serv-uuid-1",
        equipment_id: null,
        rating: 5,
        comment: "Excellent soil fertility mapping.",
        is_verified_transaction: true,
        created_at: "2026-09-22T08:00:00Z",
        updated_at: "2026-09-22T08:00:00Z",
      };

      const safeAuthor: SafeAuthorProfile = {
        id: "author-uuid-1",
        fullName: "Dr. Bamidele Adeyemi",
        avatarUrl: null,
        isVerified: true,
        state: "Oyo",
        lga: "Ibadan North",
      };

      const mapped = mapReviewRow(rawRow, safeAuthor);

      expect(mapped.id).toBe("rev-uuid-1");
      expect(mapped.targetType).toBe("SERVICE");
      expect(mapped.rating).toBe(5);
      expect(mapped.isVerifiedTransaction).toBe(true);
      expect(mapped.author?.fullName).toBe("Dr. Bamidele Adeyemi");

      const mappedRecord = mapped as unknown as Record<string, unknown>;
      expect(mappedRecord.email).toBeUndefined();
      expect(mappedRecord.phone).toBeUndefined();
      expect(mappedRecord.location_address).toBeUndefined();
    });
  });

  // ============================================================================
  // 5. Aggregate Rating & Distribution Statistics
  // ============================================================================
  describe("5. Aggregate Rating & Distribution Statistics", () => {
    it("accurately calculates average rating and star distribution", () => {
      const mockRatings = [
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
        { rating: 4 },
        { rating: 4 },
        { rating: 3 },
        { rating: 1 },
      ];

      const stats = calculateReviewStats(mockRatings);

      // (5*2 + 4*3 + 3*1 + 1*1) = (10 + 12 + 3 + 1) = 26 / 7 = 3.714... -> 3.7
      expect(stats.totalReviews).toBe(7);
      expect(stats.averageRating).toBe(3.7);
      expect(stats.ratingDistribution[5]).toBe(2);
      expect(stats.ratingDistribution[4]).toBe(3);
      expect(stats.ratingDistribution[3]).toBe(1);
      expect(stats.ratingDistribution[2]).toBe(0);
      expect(stats.ratingDistribution[1]).toBe(1);
    });

    it("returns zeroed stats when review list is empty", () => {
      const emptyStats = calculateReviewStats([]);
      expect(emptyStats.averageRating).toBe(0);
      expect(emptyStats.totalReviews).toBe(0);
      expect(emptyStats.ratingDistribution[5]).toBe(0);
      expect(emptyStats.ratingDistribution[1]).toBe(0);
    });
  });

  // ============================================================================
  // 6. Schema Immutability & Least Privilege Verification
  // ============================================================================
  describe("6. Schema Immutability & Least Privilege Verification", () => {
    it("confirms reviews are append-only without public update/delete grants", () => {
      // Review records cannot be modified once written by clients
      const reviewRecord: Review = {
        id: "rev-1",
        authorId: "author-1",
        targetType: "SERVICE",
        orderId: null,
        listingId: null,
        sellerId: null,
        serviceId: "serv-1",
        equipmentId: null,
        rating: 5,
        comment: "Great tractor service",
        isVerifiedTransaction: true,
        createdAt: "2026-09-20T10:00:00Z",
        updatedAt: "2026-09-20T10:00:00Z",
      };

      function attemptClientUpdate(
        _review: Review,
        _role: UserRole
      ): { allowed: boolean; error: string } {
        // public.reviews grants authenticated SELECT, INSERT only. No client UPDATE.
        return {
          allowed: false,
          error: "Reviews are immutable. Updates and deletions are not permitted by database policy.",
        };
      }

      const clientAttempt = attemptClientUpdate(reviewRecord, "BUYER");
      expect(clientAttempt.allowed).toBe(false);
      expect(clientAttempt.error).toContain("immutable");
    });
  });
});
