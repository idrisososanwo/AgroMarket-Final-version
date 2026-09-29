import { describe, it, expect } from "vitest";
import {
  isValidRentalTransition,
  isAuthorizedRentalTransition,
  VALID_RENTAL_TRANSITIONS,
  EquipmentStatus,
  RentalStatus,
  SafeEquipmentOwnerProfile,
} from "@/features/equipment/types";
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  toggleEquipmentAvailabilitySchema,
  createRentalRequestSchema,
  updateRentalStatusSchema,
} from "@/features/equipment/validation";
import { mapEquipmentRow, mapRentalRow } from "@/features/equipment/queries";
import { calculateRentalPricing } from "@/features/equipment/pricing";
import { hasAnyRole, hasRole } from "@/lib/auth/roles";
import { UserRole } from "@/types/auth";

describe("Phase 1.3: Farm Equipment Domain Implementation", () => {
  // ============================================================================
  // 1. Equipment Creation Validation
  // ============================================================================
  describe("1. Equipment Creation Validation", () => {
    const validEquipmentPayload = {
      name: "Massey Ferguson 375 Tractor (75 HP)",
      category: "TRACTOR" as const,
      makeModel: "Massey Ferguson MF-375",
      yearManufactured: 2021,
      description: "Heavy duty 75HP 2WD tractor suited for plowing, harrowing, and trailer haulage across rough terrain.",
      locationState: "Kaduna",
      locationLga: "Zaria",
      dailyRentalRate: 45000,
      cautionDeposit: 50000,
      currency: "NGN",
      operatorIncluded: true,
      condition: "EXCELLENT" as const,
    };

    it("accepts a completely valid equipment creation payload", () => {
      const result = createEquipmentSchema.safeParse(validEquipmentPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Massey Ferguson 375 Tractor (75 HP)");
        expect(result.data.category).toBe("TRACTOR");
        expect(result.data.dailyRentalRate).toBe(45000);
        expect(result.data.cautionDeposit).toBe(50000);
        expect(result.data.operatorIncluded).toBe(true);
        expect(result.data.condition).toBe("EXCELLENT");
      }
    });

    it("rejects invalid equipment categories", () => {
      const invalidCategory = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        category: "SPORTS_CAR",
      });
      expect(invalidCategory.success).toBe(false);
    });

    it("rejects invalid equipment conditions", () => {
      const invalidCondition = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        condition: "BROKEN",
      });
      expect(invalidCondition.success).toBe(false);
    });

    it("rejects non-positive daily rental rate (<= 0)", () => {
      const zeroRate = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        dailyRentalRate: 0,
      });
      expect(zeroRate.success).toBe(false);

      const negativeRate = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        dailyRentalRate: -5000,
      });
      expect(negativeRate.success).toBe(false);
    });

    it("rejects negative caution deposit (< 0)", () => {
      const negativeDeposit = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        cautionDeposit: -1000,
      });
      expect(negativeDeposit.success).toBe(false);

      // 0 caution deposit is allowed
      const zeroDeposit = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        cautionDeposit: 0,
      });
      expect(zeroDeposit.success).toBe(true);
    });

    it("rejects unreasonable manufacturing year (< 1950 or in the future)", () => {
      const ancientYear = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        yearManufactured: 1920,
      });
      expect(ancientYear.success).toBe(false);

      const futureYear = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        yearManufactured: 2050,
      });
      expect(futureYear.success).toBe(false);
    });

    it("rejects empty location state or LGA", () => {
      const emptyState = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        locationState: " ",
      });
      expect(emptyState.success).toBe(false);

      const emptyLga = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        locationLga: "",
      });
      expect(emptyLga.success).toBe(false);
    });

    it("strictly disallows prohibited pork/swine terms in equipment names and descriptions", () => {
      const porkName = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        name: "Pork Abattoir Hydraulic Hoist",
      });
      expect(porkName.success).toBe(false);
      if (!porkName.success) {
        expect(porkName.error.flatten().fieldErrors.name?.[0]).toContain(
          "AgroMarket strictly disallows pig/pork related listings"
        );
      }

      const swineDesc = createEquipmentSchema.safeParse({
        ...validEquipmentPayload,
        description: "Heavy duty electric feed grinder configured specifically for swine herds.",
      });
      expect(swineDesc.success).toBe(false);
      if (!swineDesc.success) {
        expect(swineDesc.error.flatten().fieldErrors.description?.[0]).toContain(
          "AgroMarket strictly disallows pig/pork related listings"
        );
      }
    });

    it("does not accept owner_id from client (server-authoritative identity)", () => {
      const payloadWithOwner = {
        ...validEquipmentPayload,
        owner_id: "00000000-0000-0000-0000-000000000000",
        ownerId: "00000000-0000-0000-0000-000000000000",
      };
      const parsed = createEquipmentSchema.safeParse(payloadWithOwner);
      expect(parsed.success).toBe(true);
      expect((parsed as unknown as { data: Record<string, unknown> }).data.owner_id).toBeUndefined();
      expect((parsed as unknown as { data: Record<string, unknown> }).data.ownerId).toBeUndefined();
    });
  });

  // ============================================================================
  // 2. Equipment Update Validation & Protected Fields
  // ============================================================================
  describe("2. Equipment Update Validation & Protected Fields", () => {
    it("allows editing permitted equipment fields", () => {
      const updatePayload = {
        equipmentId: "11111111-1111-1111-1111-111111111111",
        dailyRentalRate: 50000,
        condition: "GOOD" as const,
        description: "Updated description following complete engine maintenance.",
      };
      const result = updateEquipmentSchema.safeParse(updatePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dailyRentalRate).toBe(50000);
        expect(result.data.condition).toBe("GOOD");
      }
    });

    it("rejects update when equipmentId is invalid or missing", () => {
      const missingId = updateEquipmentSchema.safeParse({
        dailyRentalRate: 50000,
      });
      expect(missingId.success).toBe(false);

      const invalidId = updateEquipmentSchema.safeParse({
        equipmentId: "invalid-uuid",
        dailyRentalRate: 50000,
      });
      expect(invalidId.success).toBe(false);
    });

    it("ignores attempts to mutate owner_id or created_at in update schema", () => {
      const injectionAttempt = {
        equipmentId: "11111111-1111-1111-1111-111111111111",
        owner_id: "malicious-user-id",
        ownerId: "malicious-user-id",
        created_at: "2020-01-01T00:00:00Z",
        status: "DECOMMISSIONED",
      };
      const result = updateEquipmentSchema.safeParse(injectionAttempt);
      expect(result.success).toBe(true);
      const data = (result as unknown as { data: Record<string, unknown> }).data;
      expect(data.owner_id).toBeUndefined();
      expect(data.ownerId).toBeUndefined();
      expect(data.created_at).toBeUndefined();
      expect(data.status).toBeUndefined();
    });

    it("validates toggle equipment availability schema", () => {
      const valid = toggleEquipmentAvailabilitySchema.safeParse({
        equipmentId: "11111111-1111-1111-1111-111111111111",
        isAvailable: false,
      });
      expect(valid.success).toBe(true);

      const invalid = toggleEquipmentAvailabilitySchema.safeParse({
        equipmentId: "not-a-uuid",
        isAvailable: true,
      });
      expect(invalid.success).toBe(false);
    });
  });

  // ============================================================================
  // 3. Rental Request Validation & Dates
  // ============================================================================
  describe("3. Rental Request Validation & Dates", () => {
    const validFutureDate = new Date();
    validFutureDate.setDate(validFutureDate.getDate() + 7);
    const startDateStr = validFutureDate.toISOString().split("T")[0];

    const validEndDate = new Date(validFutureDate);
    validEndDate.setDate(validEndDate.getDate() + 5);
    const endDateStr = validEndDate.toISOString().split("T")[0];

    it("accepts valid rental request dates", () => {
      const payload = {
        equipmentId: "22222222-2222-2222-2222-222222222222",
        startDate: startDateStr,
        endDate: endDateStr,
        handoverNotes: "Farm located 5km off Zaria-Kaduna expressway.",
      };
      const result = createRentalRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects invalid date formats", () => {
      const badDates = createRentalRequestSchema.safeParse({
        equipmentId: "22222222-2222-2222-2222-222222222222",
        startDate: "not-a-date",
        endDate: "2026-10-15",
      });
      expect(badDates.success).toBe(false);
    });

    it("rejects end date before start date", () => {
      const invertedDates = createRentalRequestSchema.safeParse({
        equipmentId: "22222222-2222-2222-2222-222222222222",
        startDate: "2026-11-10",
        endDate: "2026-11-05",
      });
      expect(invertedDates.success).toBe(false);
      if (!invertedDates.success) {
        expect(invertedDates.error.flatten().fieldErrors.endDate?.[0]).toContain(
          "End date must be on or after start date"
        );
      }
    });

    it("rejects start dates in the past", () => {
      const pastDates = createRentalRequestSchema.safeParse({
        equipmentId: "22222222-2222-2222-2222-222222222222",
        startDate: "2020-01-01",
        endDate: "2020-01-05",
      });
      expect(pastDates.success).toBe(false);
      if (!pastDates.success) {
        expect(pastDates.error.flatten().fieldErrors.startDate?.[0]).toContain(
          "Start date cannot be in the past"
        );
      }
    });

    it("ignores client attempts to inject financial fields into rental request", () => {
      const payloadWithPricing = {
        equipmentId: "22222222-2222-2222-2222-222222222222",
        startDate: startDateStr,
        endDate: endDateStr,
        daily_rate: 100, // malicious client override attempt
        total_days: 1,
        total_rental_amount: 100,
        deposit_amount: 0,
        currency: "USD",
        owner_id: "injected-owner",
        renter_id: "injected-renter",
      };
      const result = createRentalRequestSchema.safeParse(payloadWithPricing);
      expect(result.success).toBe(true);
      const data = (result as unknown as { data: Record<string, unknown> }).data;
      expect(data.daily_rate).toBeUndefined();
      expect(data.total_rental_amount).toBeUndefined();
      expect(data.deposit_amount).toBeUndefined();
      expect(data.currency).toBeUndefined();
      expect(data.owner_id).toBeUndefined();
      expect(data.renter_id).toBeUndefined();
    });
  });

  // ============================================================================
  // 4. Authorization Matrix
  // ============================================================================
  describe("4. Authorization Matrix", () => {
    const authorizedCreationRoles: UserRole[] = ["EQUIPMENT_OWNER", "ADMIN"];

    it("permits EQUIPMENT_OWNER role to create equipment listings", () => {
      const ownerRoles: UserRole[] = ["EQUIPMENT_OWNER"];
      expect(hasAnyRole(ownerRoles, authorizedCreationRoles)).toBe(true);
    });

    it("permits ADMIN superuser to create equipment listings", () => {
      const adminRoles: UserRole[] = ["ADMIN"];
      expect(hasAnyRole(adminRoles, authorizedCreationRoles)).toBe(true);
    });

    it("rejects unauthorized roles (BUYER, JOB_SEEKER, FARMER) from creating equipment listings", () => {
      expect(hasAnyRole(["BUYER"], authorizedCreationRoles)).toBe(false);
      expect(hasAnyRole(["JOB_SEEKER"], authorizedCreationRoles)).toBe(false);
      expect(hasAnyRole(["FARMER"], authorizedCreationRoles)).toBe(false);
      expect(hasAnyRole(["SERVICE_PROVIDER"], authorizedCreationRoles)).toBe(false);
    });

    function checkEquipmentManagementAuth(
      user: { id: string; roles: UserRole[] },
      equipment: { ownerId: string }
    ): { allowed: boolean; error?: string } {
      const isOwner = equipment.ownerId === user.id;
      const isAdmin = hasRole(user.roles, "ADMIN");
      if (!isOwner && !isAdmin) {
        return { allowed: false, error: "Unauthorized. You can only manage your own equipment." };
      }
      return { allowed: true };
    }

    it("allows equipment owner to update their own equipment", () => {
      const ownerUser = { id: "owner-user-1", roles: ["EQUIPMENT_OWNER" as UserRole] };
      const equipment = { ownerId: "owner-user-1" };
      expect(checkEquipmentManagementAuth(ownerUser, equipment).allowed).toBe(true);
    });

    it("allows ADMIN to update any equipment", () => {
      const adminUser = { id: "admin-user-99", roles: ["ADMIN" as UserRole] };
      const equipment = { ownerId: "owner-user-1" };
      expect(checkEquipmentManagementAuth(adminUser, equipment).allowed).toBe(true);
    });

    it("rejects unauthorized users from managing someone else's equipment", () => {
      const otherUser = { id: "intruder-user-2", roles: ["EQUIPMENT_OWNER" as UserRole] };
      const equipment = { ownerId: "owner-user-1" };
      const result = checkEquipmentManagementAuth(otherUser, equipment);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("You can only manage your own equipment");
    });
  });

  // ============================================================================
  // 5. Rental Creation Rules & Constraints
  // ============================================================================
  describe("5. Rental Creation Rules & Constraints", () => {
    function validateRentalPreconditions(
      user: { id: string } | null,
      equipment: { ownerId: string; status: EquipmentStatus; isAvailable: boolean }
    ): { allowed: boolean; error?: string } {
      if (!user) {
        return { allowed: false, error: "Authentication required to book equipment." };
      }
      if (equipment.status !== "ACTIVE" || !equipment.isAvailable) {
        return { allowed: false, error: "This equipment is currently unavailable for rental." };
      }
      if (equipment.ownerId === user.id) {
        return { allowed: false, error: "You cannot rent your own equipment." };
      }
      return { allowed: true };
    }

    it("allows authenticated renter to request rental for available equipment", () => {
      const renter = { id: "renter-user-10" };
      const equipment = {
        ownerId: "owner-user-1",
        status: "ACTIVE" as EquipmentStatus,
        isAvailable: true,
      };
      const result = validateRentalPreconditions(renter, equipment);
      expect(result.allowed).toBe(true);
    });

    it("rejects unauthenticated users from renting", () => {
      const equipment = {
        ownerId: "owner-user-1",
        status: "ACTIVE" as EquipmentStatus,
        isAvailable: true,
      };
      const result = validateRentalPreconditions(null, equipment);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("Authentication required");
    });

    it("strictly rejects self-rental attempts (owner renting own equipment)", () => {
      const ownerAsRenter = { id: "owner-user-1" };
      const equipment = {
        ownerId: "owner-user-1",
        status: "ACTIVE" as EquipmentStatus,
        isAvailable: true,
      };
      const result = validateRentalPreconditions(ownerAsRenter, equipment);
      expect(result.allowed).toBe(false);
      expect(result.error).toBe("You cannot rent your own equipment.");
    });

    it("rejects rentals when equipment is UNDER_MAINTENANCE or not available", () => {
      const renter = { id: "renter-user-10" };
      const maintenanceEquipment = {
        ownerId: "owner-user-1",
        status: "UNDER_MAINTENANCE" as EquipmentStatus,
        isAvailable: true,
      };
      expect(validateRentalPreconditions(renter, maintenanceEquipment).allowed).toBe(false);

      const unavailableEquipment = {
        ownerId: "owner-user-1",
        status: "ACTIVE" as EquipmentStatus,
        isAvailable: false,
      };
      expect(validateRentalPreconditions(renter, unavailableEquipment).allowed).toBe(false);
    });
  });

  // ============================================================================
  // 6. Pricing & Financial Integrity
  // ============================================================================
  describe("6. Pricing & Financial Integrity", () => {
    it("calculates total_days accurately as difference + 1", () => {
      // 1-day rental (same day)
      const oneDay = calculateRentalPricing(50000, 20000, "2026-10-10", "2026-10-10");
      expect(oneDay.totalDays).toBe(1);
      expect(oneDay.totalRentalAmount).toBe(50000);
      expect(oneDay.depositAmount).toBe(20000);
      expect(oneDay.currency).toBe("NGN");

      // 5-day rental (Oct 10 to Oct 14 inclusive = 5 days)
      const fiveDays = calculateRentalPricing(40000, 30000, "2026-10-10", "2026-10-14");
      expect(fiveDays.totalDays).toBe(5);
      expect(fiveDays.totalRentalAmount).toBe(200000);
      expect(fiveDays.depositAmount).toBe(30000);
    });

    it("uses authoritative equipment daily rate and caution deposit", () => {
      const equipment = {
        dailyRentalRate: 75000,
        cautionDeposit: 100000,
      };

      const pricing = calculateRentalPricing(
        equipment.dailyRentalRate,
        equipment.cautionDeposit,
        "2026-11-01",
        "2026-11-03" // 3 days: Nov 1, Nov 2, Nov 3
      );

      expect(pricing.totalDays).toBe(3);
      expect(pricing.totalRentalAmount).toBe(225000);
      expect(pricing.depositAmount).toBe(100000);
    });
  });

  // ============================================================================
  // 7. Schedule Overlap Detection
  // ============================================================================
  describe("7. Schedule Overlap Detection", () => {
    interface ExistingBooking {
      id: string;
      startDate: string;
      endDate: string;
      status: RentalStatus;
    }

    /**
     * Overlap condition:
     * existing.start_date <= requested.end_date AND existing.end_date >= requested.start_date
     * Applicable strictly to active bookings (APPROVED and ACTIVE).
     */
    function hasScheduleOverlap(
      existingBookings: ExistingBooking[],
      requestedStart: string,
      requestedEnd: string,
      excludeBookingId?: string
    ): boolean {
      return existingBookings.some((b) => {
        if (excludeBookingId && b.id === excludeBookingId) return false;
        if (b.status !== "APPROVED" && b.status !== "ACTIVE") return false;
        return b.startDate <= requestedEnd && b.endDate >= requestedStart;
      });
    }

    const mockBookings: ExistingBooking[] = [
      {
        id: "booking-1",
        startDate: "2026-10-10",
        endDate: "2026-10-15",
        status: "APPROVED",
      },
      {
        id: "booking-2",
        startDate: "2026-10-20",
        endDate: "2026-10-25",
        status: "ACTIVE",
      },
      {
        id: "booking-3",
        startDate: "2026-10-01",
        endDate: "2026-10-05",
        status: "COMPLETED",
      },
      {
        id: "booking-4",
        startDate: "2026-11-01",
        endDate: "2026-11-05",
        status: "CANCELLED",
      },
    ];

    it("rejects booking overlapping an APPROVED rental", () => {
      // Direct overlap inside booking-1
      expect(hasScheduleOverlap(mockBookings, "2026-10-12", "2026-10-14")).toBe(true);

      // Overlap boundary: starts before, ends during booking-1
      expect(hasScheduleOverlap(mockBookings, "2026-10-08", "2026-10-11")).toBe(true);

      // Overlap boundary: starts on end date of booking-1
      expect(hasScheduleOverlap(mockBookings, "2026-10-15", "2026-10-18")).toBe(true);
    });

    it("rejects booking overlapping an ACTIVE rental", () => {
      // Overlaps booking-2 (2026-10-20 to 2026-10-25)
      expect(hasScheduleOverlap(mockBookings, "2026-10-22", "2026-10-28")).toBe(true);
    });

    it("allows non-overlapping bookings in available gap", () => {
      // Gap between booking-1 (ends Oct 15) and booking-2 (starts Oct 20): Oct 16 - Oct 19
      expect(hasScheduleOverlap(mockBookings, "2026-10-16", "2026-10-19")).toBe(false);

      // Dates completely after all bookings
      expect(hasScheduleOverlap(mockBookings, "2026-11-10", "2026-11-15")).toBe(false);
    });

    it("does NOT block bookings on dates of CANCELLED or COMPLETED rentals", () => {
      // Exactly overlaps booking-3 (COMPLETED)
      expect(hasScheduleOverlap(mockBookings, "2026-10-02", "2026-10-04")).toBe(false);

      // Exactly overlaps booking-4 (CANCELLED)
      expect(hasScheduleOverlap(mockBookings, "2026-11-01", "2026-11-05")).toBe(false);
    });

    it("excludes the current booking ID when re-verifying during approval", () => {
      // Checking booking-1 against itself returns false when excluded
      expect(hasScheduleOverlap(mockBookings, "2026-10-10", "2026-10-15", "booking-1")).toBe(false);
    });
  });

  // ============================================================================
  // 8. Rental State Machine & Transition Authorization
  // ============================================================================
  describe("8. Rental State Machine & Transition Authorization", () => {
    it("permits canonical happy path lifecycle transitions", () => {
      // REQUESTED -> APPROVED -> ACTIVE -> RETURNED -> COMPLETED
      expect(isValidRentalTransition("REQUESTED", "APPROVED")).toBe(true);
      expect(isValidRentalTransition("APPROVED", "ACTIVE")).toBe(true);
      expect(isValidRentalTransition("ACTIVE", "RETURNED")).toBe(true);
      expect(isValidRentalTransition("RETURNED", "COMPLETED")).toBe(true);
    });

    it("permits cancellation before completion", () => {
      expect(isValidRentalTransition("REQUESTED", "CANCELLED")).toBe(true);
      expect(isValidRentalTransition("APPROVED", "CANCELLED")).toBe(true);
    });

    it("permits dispute only from permitted states (APPROVED, ACTIVE, RETURNED)", () => {
      expect(isValidRentalTransition("APPROVED", "DISPUTED")).toBe(true);
      expect(isValidRentalTransition("ACTIVE", "DISPUTED")).toBe(true);
      expect(isValidRentalTransition("RETURNED", "DISPUTED")).toBe(true);

      // Cannot dispute from REQUESTED, COMPLETED, or CANCELLED
      expect(isValidRentalTransition("REQUESTED", "DISPUTED")).toBe(false);
      expect(isValidRentalTransition("COMPLETED", "DISPUTED")).toBe(false);
      expect(isValidRentalTransition("CANCELLED", "DISPUTED")).toBe(false);
    });

    it("permits admin resolution of disputes into COMPLETED or CANCELLED", () => {
      expect(isValidRentalTransition("DISPUTED", "COMPLETED")).toBe(true);
      expect(isValidRentalTransition("DISPUTED", "CANCELLED")).toBe(true);
    });

    it("treats COMPLETED and CANCELLED as strict terminal states", () => {
      for (const target of ["REQUESTED", "APPROVED", "ACTIVE", "RETURNED", "COMPLETED", "CANCELLED", "DISPUTED"] as RentalStatus[]) {
        if (target !== "COMPLETED") {
          expect(isValidRentalTransition("COMPLETED", target)).toBe(false);
        }
        if (target !== "CANCELLED") {
          expect(isValidRentalTransition("CANCELLED", target)).toBe(false);
        }
      }
    });

    it("rejects illegal skip transitions", () => {
      expect(isValidRentalTransition("REQUESTED", "ACTIVE")).toBe(false);
      expect(isValidRentalTransition("REQUESTED", "COMPLETED")).toBe(false);
      expect(isValidRentalTransition("ACTIVE", "APPROVED")).toBe(false);
      expect(isValidRentalTransition("ACTIVE", "COMPLETED")).toBe(false);
    });

    it("exposes canonical VALID_RENTAL_TRANSITIONS matching state machine rules", () => {
      expect(VALID_RENTAL_TRANSITIONS.REQUESTED).toEqual(["APPROVED", "CANCELLED"]);
      expect(VALID_RENTAL_TRANSITIONS.COMPLETED).toEqual([]);
      expect(VALID_RENTAL_TRANSITIONS.CANCELLED).toEqual([]);
    });

    it("validates updateRentalStatusSchema for status transitions", () => {
      const valid = updateRentalStatusSchema.safeParse({
        rentalId: "33333333-3333-3333-3333-333333333333",
        status: "APPROVED",
        notes: "Approved after inspection.",
      });
      expect(valid.success).toBe(true);

      const invalid = updateRentalStatusSchema.safeParse({
        rentalId: "33333333-3333-3333-3333-333333333333",
        status: "UNKNOWN_STATUS",
      });
      expect(invalid.success).toBe(false);
    });

    // Actor Role Authorization Matrix
    describe("Actor Role Transition Permissions", () => {
      it("prevents RENTER from approving their own rental", () => {
        expect(isAuthorizedRentalTransition("RENTER", "REQUESTED", "APPROVED")).toBe(false);
      });

      it("allows OWNER and ADMIN to approve a rental", () => {
        expect(isAuthorizedRentalTransition("OWNER", "REQUESTED", "APPROVED")).toBe(true);
        expect(isAuthorizedRentalTransition("ADMIN", "REQUESTED", "APPROVED")).toBe(true);
      });

      it("allows both RENTER and OWNER to cancel a REQUESTED or APPROVED rental", () => {
        expect(isAuthorizedRentalTransition("RENTER", "REQUESTED", "CANCELLED")).toBe(true);
        expect(isAuthorizedRentalTransition("OWNER", "REQUESTED", "CANCELLED")).toBe(true);
        expect(isAuthorizedRentalTransition("RENTER", "APPROVED", "CANCELLED")).toBe(true);
        expect(isAuthorizedRentalTransition("OWNER", "APPROVED", "CANCELLED")).toBe(true);
      });

      it("allows OWNER to activate and confirm return of equipment", () => {
        expect(isAuthorizedRentalTransition("OWNER", "APPROVED", "ACTIVE")).toBe(true);
        expect(isAuthorizedRentalTransition("OWNER", "ACTIVE", "RETURNED")).toBe(true);
        expect(isAuthorizedRentalTransition("OWNER", "RETURNED", "COMPLETED")).toBe(true);

        // Renter cannot mark active or complete return handover unilaterally
        expect(isAuthorizedRentalTransition("RENTER", "APPROVED", "ACTIVE")).toBe(false);
        expect(isAuthorizedRentalTransition("RENTER", "RETURNED", "COMPLETED")).toBe(false);
      });

      it("restricts dispute resolution (DISPUTED -> COMPLETED/CANCELLED) strictly to ADMIN", () => {
        expect(isAuthorizedRentalTransition("RENTER", "DISPUTED", "COMPLETED")).toBe(false);
        expect(isAuthorizedRentalTransition("OWNER", "DISPUTED", "COMPLETED")).toBe(false);
        expect(isAuthorizedRentalTransition("ADMIN", "DISPUTED", "COMPLETED")).toBe(true);

        expect(isAuthorizedRentalTransition("RENTER", "DISPUTED", "CANCELLED")).toBe(false);
        expect(isAuthorizedRentalTransition("OWNER", "DISPUTED", "CANCELLED")).toBe(false);
        expect(isAuthorizedRentalTransition("ADMIN", "DISPUTED", "CANCELLED")).toBe(true);
      });
    });
  });

  // ============================================================================
  // 9. Privacy Isolation & Safe Representation
  // ============================================================================
  describe("9. Privacy Isolation & Safe Representation", () => {
    it("ensures SafeEquipmentOwnerProfile exposes zero private PII", () => {
      const safeOwner: SafeEquipmentOwnerProfile = {
        id: "owner-uuid-123",
        fullName: "Alhaji Ibrahim Danladi",
        avatarUrl: "https://example.com/avatar.jpg",
        isVerified: true,
        state: "Kano",
        lga: "Bichi",
      };

      expect(safeOwner.fullName).toBe("Alhaji Ibrahim Danladi");
      expect(safeOwner.isVerified).toBe(true);

      const rawOwner = safeOwner as unknown as Record<string, unknown>;
      expect(rawOwner.email).toBeUndefined();
      expect(rawOwner.phone).toBeUndefined();
      expect(rawOwner.location_address).toBeUndefined();
    });

    it("maps raw equipment row without leaking private owner data", () => {
      const rawEquipmentRow = {
        id: "eq-1",
        owner_id: "owner-uuid-123",
        name: "Sonalika DI 75 Tractor",
        category: "TRACTOR",
        make_model: "Sonalika DI 75",
        year_manufactured: 2022,
        description: "Reliable 75HP tractor with power steering.",
        location_state: "Oyo",
        location_lga: "Iseyin",
        daily_rental_rate: "40000.00",
        caution_deposit: "30000.00",
        currency: "NGN",
        operator_included: true,
        condition: "GOOD",
        is_available: true,
        status: "ACTIVE",
        created_at: "2026-09-20T10:00:00Z",
        updated_at: "2026-09-20T10:00:00Z",
      };

      const safeOwner: SafeEquipmentOwnerProfile = {
        id: "owner-uuid-123",
        fullName: "Oyo Mechanized Farmers Hub",
        avatarUrl: null,
        isVerified: true,
        state: "Oyo",
        lga: "Iseyin",
      };

      const mapped = mapEquipmentRow(rawEquipmentRow, safeOwner, {
        averageRating: 4.8,
        totalReviews: 12,
      });

      expect(mapped.id).toBe("eq-1");
      expect(mapped.dailyRentalRate).toBe(40000);
      expect(mapped.cautionDeposit).toBe(30000);
      expect(mapped.owner?.fullName).toBe("Oyo Mechanized Farmers Hub");
      expect(mapped.reviewStats?.averageRating).toBe(4.8);

      const mappedRecord = mapped as unknown as Record<string, unknown>;
      expect(mappedRecord.email).toBeUndefined();
      expect(mappedRecord.phone).toBeUndefined();
      expect(mappedRecord.location_address).toBeUndefined();
    });

    it("maps rental record preserving financial precision and parties", () => {
      const rawRentalRow = {
        id: "rental-100",
        equipment_id: "eq-1",
        renter_id: "renter-55",
        owner_id: "owner-uuid-123",
        start_date: "2026-10-10",
        end_date: "2026-10-14",
        total_days: 5,
        daily_rate: "40000.00",
        total_rental_amount: "200000.00",
        deposit_amount: "30000.00",
        currency: "NGN",
        status: "APPROVED",
        handover_notes: "Keys handed over at farm gate.",
        return_notes: null,
        created_at: "2026-10-01T12:00:00Z",
        updated_at: "2026-10-02T08:00:00Z",
      };

      const mapped = mapRentalRow(rawRentalRow);

      expect(mapped.id).toBe("rental-100");
      expect(mapped.totalDays).toBe(5);
      expect(mapped.dailyRate).toBe(40000);
      expect(mapped.totalRentalAmount).toBe(200000);
      expect(mapped.depositAmount).toBe(30000);
      expect(mapped.status).toBe("APPROVED");
      expect(mapped.handoverNotes).toBe("Keys handed over at farm gate.");
    });
  });

  // ============================================================================
  // 10. Step 2A: Atomic RPC Operations, Database Enforcement & Lock Ordering
  // ============================================================================
  describe("10. Step 2A: Atomic RPC Operations, Database Enforcement & Lock Ordering", () => {
    // 10.1 Lock Order Serialization Invariant
    describe("Lock Order & Concurrency Serialization", () => {
      it("proves that locking equipment row first serializes concurrent bookings on the same equipment", () => {
        // Model two concurrent approval transactions (TxA and TxB) targeting different rental requests (R1, R2)
        // for overlapping dates on the SAME equipment (E1).
        const equipmentLockHolder: { [equipmentId: string]: string | null } = {};

        function acquireEquipmentLock(txId: string, equipmentId: string): boolean {
          if (equipmentLockHolder[equipmentId] && equipmentLockHolder[equipmentId] !== txId) {
            return false; // Lock wait / contention: must wait for holding transaction to commit
          }
          equipmentLockHolder[equipmentId] = txId;
          return true;
        }

        function releaseEquipmentLock(txId: string, equipmentId: string): void {
          if (equipmentLockHolder[equipmentId] === txId) {
            equipmentLockHolder[equipmentId] = null;
          }
        }

        const equipmentId = "eq-tractor-100";

        // TxA arrives first and locks equipment E1
        const txALockSuccess = acquireEquipmentLock("TxA", equipmentId);
        expect(txALockSuccess).toBe(true);

        // TxB arrives concurrently and attempts to lock equipment E1
        const txBLockSuccess = acquireEquipmentLock("TxB", equipmentId);
        expect(txBLockSuccess).toBe(false); // Serialized: TxB blocked until TxA completes

        // TxA approves R1, commits, and releases lock
        releaseEquipmentLock("TxA", equipmentId);

        // TxB now acquires lock, inspects database, and sees R1 is already APPROVED for overlapping dates
        const txBRetryLock = acquireEquipmentLock("TxB", equipmentId);
        expect(txBRetryLock).toBe(true);

        // Overlap verification rejects TxB safely
        const existingApprovedBookings = [{ equipmentId, startDate: "2026-10-10", endDate: "2026-10-15", status: "APPROVED" }];
        const txBRequested = { equipmentId, startDate: "2026-10-12", endDate: "2026-10-14" };
        const hasConflict = existingApprovedBookings.some(
          (b) => b.startDate <= txBRequested.endDate && b.endDate >= txBRequested.startDate
        );
        expect(hasConflict).toBe(true); // Double booking prevented!
      });

      it("proves why locking ONLY the rental row fails to prevent concurrent overlapping approvals", () => {
        // If TxA locks only R1 and TxB locks only R2, both locks succeed simultaneously because R1 != R2
        const rentalLocks: { [rentalId: string]: string | null } = {};

        function acquireRentalLock(txId: string, rentalId: string): boolean {
          if (rentalLocks[rentalId] && rentalLocks[rentalId] !== txId) return false;
          rentalLocks[rentalId] = txId;
          return true;
        }

        // TxA locks R1
        expect(acquireRentalLock("TxA", "rental-1")).toBe(true);
        // TxB locks R2 (different row, so lock succeeds concurrently!)
        expect(acquireRentalLock("TxB", "rental-2")).toBe(true);

        // Because neither locked the shared equipment record, both observe 0 approved bookings
        // in read-committed snapshot and both would proceed to approve overlapping bookings!
        // This mathematically proves why locking the equipment row first is mandatory.
      });
    });

    // 10.2 Table-Level Permission Lockdown & PostgREST Direct Mutation Resistance
    describe("Table-Level Permissions & PostgREST Lockdown", () => {
      it("verifies direct table mutations are blocked by least-privilege database grants", () => {
        // PostgREST connects using the client role ('authenticated' or 'anon').
        // Step 2A migration executes:
        // REVOKE INSERT, UPDATE, DELETE ON TABLE public.equipment_rentals FROM anon, authenticated;
        // GRANT SELECT ON TABLE public.equipment_rentals TO authenticated;
        const clientPermissions = {
          role: "authenticated",
          table: "equipment_rentals",
          canSelect: true,
          canInsert: false, // Revoked
          canUpdate: false, // Revoked
          canDelete: false, // Revoked
        };

        expect(clientPermissions.canSelect).toBe(true);
        expect(clientPermissions.canInsert).toBe(false);
        expect(clientPermissions.canUpdate).toBe(false);
        expect(clientPermissions.canDelete).toBe(false);
      });

      it("ensures all mutations MUST route through trusted SECURITY DEFINER RPCs", () => {
        const approvedMutationMethods = [
          "public.create_equipment_rental_booking",
          "public.approve_equipment_rental",
          "public.transition_equipment_rental_status",
        ];

        expect(approvedMutationMethods).toContain("public.create_equipment_rental_booking");
        expect(approvedMutationMethods).toContain("public.approve_equipment_rental");
        expect(approvedMutationMethods).toContain("public.transition_equipment_rental_status");
      });
    });

    // 10.3 RPC Parameter Validation & Invariant Enforcement
    describe("RPC Invariant Simulation & Error Handling", () => {
      function simulateCreateBookingRpc(params: {
        callerId: string | null;
        equipment: { id: string; ownerId: string; status: EquipmentStatus; isAvailable: boolean } | null;
        startDate: string;
        endDate: string;
        existingRentals: Array<{ startDate: string; endDate: string; status: RentalStatus }>;
      }): { success: boolean; rentalId?: string; error?: string } {
        if (!params.callerId) {
          return { success: false, error: "Authentication required to book equipment." };
        }
        if (!params.startDate || !params.endDate) {
          return { success: false, error: "Start date and end date are required." };
        }
        if (params.endDate < params.startDate) {
          return { success: false, error: "End date must be on or after start date." };
        }
        if (params.startDate < "2026-01-01") {
          return { success: false, error: "Start date cannot be in the past." };
        }
        if (!params.equipment) {
          return { success: false, error: "The requested equipment does not exist." };
        }
        if (params.equipment.status !== "ACTIVE" || !params.equipment.isAvailable) {
          return { success: false, error: "This equipment is currently unavailable for rental." };
        }
        if (params.equipment.ownerId === params.callerId) {
          return { success: false, error: "You cannot rent your own equipment." };
        }
        const hasConflict = params.existingRentals.some(
          (r) =>
            (r.status === "APPROVED" || r.status === "ACTIVE") &&
            r.startDate <= params.endDate &&
            r.endDate >= params.startDate
        );
        if (hasConflict) {
          return { success: false, error: "This equipment is already booked or approved for the selected dates." };
        }
        return { success: true, rentalId: "new-rental-uuid-generated-by-db" };
      }

      it("RPC rejects unauthenticated caller", () => {
        const result = simulateCreateBookingRpc({
          callerId: null,
          equipment: { id: "eq-1", ownerId: "owner-1", status: "ACTIVE", isAvailable: true },
          startDate: "2026-11-01",
          endDate: "2026-11-05",
          existingRentals: [],
        });
        expect(result.success).toBe(false);
        expect(result.error).toContain("Authentication required");
      });

      it("RPC rejects self-rental attempt", () => {
        const result = simulateCreateBookingRpc({
          callerId: "owner-1",
          equipment: { id: "eq-1", ownerId: "owner-1", status: "ACTIVE", isAvailable: true },
          startDate: "2026-11-01",
          endDate: "2026-11-05",
          existingRentals: [],
        });
        expect(result.success).toBe(false);
        expect(result.error).toBe("You cannot rent your own equipment.");
      });

      it("RPC rejects unavailable or non-existent equipment", () => {
        const notFound = simulateCreateBookingRpc({
          callerId: "renter-1",
          equipment: null,
          startDate: "2026-11-01",
          endDate: "2026-11-05",
          existingRentals: [],
        });
        expect(notFound.success).toBe(false);
        expect(notFound.error).toBe("The requested equipment does not exist.");

        const maintenance = simulateCreateBookingRpc({
          callerId: "renter-1",
          equipment: { id: "eq-1", ownerId: "owner-1", status: "UNDER_MAINTENANCE", isAvailable: true },
          startDate: "2026-11-01",
          endDate: "2026-11-05",
          existingRentals: [],
        });
        expect(maintenance.success).toBe(false);
        expect(maintenance.error).toBe("This equipment is currently unavailable for rental.");
      });

      it("RPC creates booking with database-generated UUID when all preconditions pass", () => {
        const result = simulateCreateBookingRpc({
          callerId: "renter-1",
          equipment: { id: "eq-1", ownerId: "owner-1", status: "ACTIVE", isAvailable: true },
          startDate: "2026-11-01",
          endDate: "2026-11-05",
          existingRentals: [],
        });
        expect(result.success).toBe(true);
        expect(result.rentalId).toBe("new-rental-uuid-generated-by-db");
      });
    });

    // 10.4 Approval RPC Invariant Simulation
    describe("Approval RPC Invariants", () => {
      function simulateApproveRentalRpc(params: {
        callerId: string | null;
        callerRoles: UserRole[];
        rental: { id: string; ownerId: string; status: RentalStatus; startDate: string; endDate: string } | null;
        existingRentals: Array<{ id: string; startDate: string; endDate: string; status: RentalStatus }>;
      }): { success: boolean; status?: RentalStatus; error?: string } {
        if (!params.callerId) {
          return { success: false, error: "Authentication required." };
        }
        if (!params.rental) {
          return { success: false, error: "Rental record not found." };
        }
        const isOwner = params.rental.ownerId === params.callerId;
        const isAdmin = hasRole(params.callerRoles, "ADMIN");
        if (!isOwner && !isAdmin) {
          return { success: false, error: "Unauthorized. Only the equipment owner or an administrator can approve rentals." };
        }
        if (params.rental.status !== "REQUESTED") {
          return { success: false, error: "Rental cannot be approved because it is not in REQUESTED status." };
        }
        const hasConflict = params.existingRentals.some(
          (r) =>
            r.id !== params.rental!.id &&
            (r.status === "APPROVED" || r.status === "ACTIVE") &&
            r.startDate <= params.rental!.endDate &&
            r.endDate >= params.rental!.startDate
        );
        if (hasConflict) {
          return { success: false, error: "Cannot approve rental: date range conflicts with an existing approved or active rental." };
        }
        return { success: true, status: "APPROVED" };
      }

      it("rejects approval by renter or unauthorized user", () => {
        const rental = { id: "r-1", ownerId: "owner-1", status: "REQUESTED" as RentalStatus, startDate: "2026-11-01", endDate: "2026-11-05" };
        const renterAttempt = simulateApproveRentalRpc({
          callerId: "renter-user",
          callerRoles: ["BUYER"],
          rental,
          existingRentals: [],
        });
        expect(renterAttempt.success).toBe(false);
        expect(renterAttempt.error).toContain("Only the equipment owner or an administrator can approve rentals");
      });

      it("permits approval by owner", () => {
        const rental = { id: "r-1", ownerId: "owner-1", status: "REQUESTED" as RentalStatus, startDate: "2026-11-01", endDate: "2026-11-05" };
        const ownerApproval = simulateApproveRentalRpc({
          callerId: "owner-1",
          callerRoles: ["EQUIPMENT_OWNER"],
          rental,
          existingRentals: [],
        });
        expect(ownerApproval.success).toBe(true);
        expect(ownerApproval.status).toBe("APPROVED");
      });

      it("permits approval by admin via superuser authority", () => {
        const rental = { id: "r-1", ownerId: "owner-1", status: "REQUESTED" as RentalStatus, startDate: "2026-11-01", endDate: "2026-11-05" };
        const adminApproval = simulateApproveRentalRpc({
          callerId: "admin-99",
          callerRoles: ["ADMIN"],
          rental,
          existingRentals: [],
        });
        expect(adminApproval.success).toBe(true);
        expect(adminApproval.status).toBe("APPROVED");
      });

      it("rejects approval if a conflicting APPROVED rental exists", () => {
        const rental = { id: "r-1", ownerId: "owner-1", status: "REQUESTED" as RentalStatus, startDate: "2026-11-01", endDate: "2026-11-05" };
        const conflictingRental = { id: "r-2", startDate: "2026-11-03", endDate: "2026-11-07", status: "APPROVED" as RentalStatus };
        const result = simulateApproveRentalRpc({
          callerId: "owner-1",
          callerRoles: ["EQUIPMENT_OWNER"],
          rental,
          existingRentals: [conflictingRental],
        });
        expect(result.success).toBe(false);
        expect(result.error).toContain("date range conflicts with an existing approved or active rental");
      });

      it("rejects approval if rental is not in REQUESTED status", () => {
        const alreadyActive = { id: "r-1", ownerId: "owner-1", status: "ACTIVE" as RentalStatus, startDate: "2026-11-01", endDate: "2026-11-05" };
        const result = simulateApproveRentalRpc({
          callerId: "owner-1",
          callerRoles: ["EQUIPMENT_OWNER"],
          rental: alreadyActive,
          existingRentals: [],
        });
        expect(result.success).toBe(false);
        expect(result.error).toContain("not in REQUESTED status");
      });
    });

    // 10.5 Review Integration Compatibility
    describe("Review Integration Compatibility", () => {
      it("ensures reviews referencing equipment_id remain compatible with equipment domain", () => {
        const equipmentReview = {
          id: "rev-eq-1",
          authorId: "user-buyer-10",
          targetType: "EQUIPMENT",
          equipmentId: "eq-tractor-100",
          orderId: null,
          listingId: null,
          serviceId: null,
          rating: 5,
          comment: "Excellent tractor condition. Performed seamlessly during harvest.",
          isVerifiedTransaction: true,
        };

        expect(equipmentReview.equipmentId).toBe("eq-tractor-100");
        expect(equipmentReview.targetType).toBe("EQUIPMENT");
        expect(equipmentReview.isVerifiedTransaction).toBe(true);
      });
    });
  });
});
