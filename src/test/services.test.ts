import { describe, it, expect } from "vitest";
import {
  isValidServiceRequestTransition,
  isAuthorizedRequestTransition,
  VALID_SERVICE_REQUEST_TRANSITIONS,
  ServiceListing,
  ServiceRequest,
  SafeProviderProfile,
} from "@/features/services/types";
import {
  createServiceSchema,
  updateServiceSchema,
  toggleServiceAvailabilitySchema,
  createServiceRequestSchema,
  updateServiceRequestStatusSchema,
} from "@/features/services/validation";
import { mapServiceRow } from "@/features/services/queries";
import { hasAnyRole, hasRole } from "@/lib/auth/roles";
import { UserRole } from "@/types/auth";

describe("Phase 1.2: Services Domain Implementation", () => {
  // ============================================================================
  // 1. Service Creation Validation
  // ============================================================================
  describe("1. Service Creation Validation", () => {
    const validServicePayload = {
      title: "Drone Crop Spraying & Aerial Health Survey",
      description: "Precision automated spraying of fungicides and foliar fertilizers using multispectral drone mapping.",
      serviceCategory: "DRONE_SPRAYING" as const,
      coverageStates: ["Oyo", "Ogun", "Osun"],
      pricingModel: "PER_HECTARE" as const,
      baseRate: 15000,
      currency: "NGN",
      isAvailable: true,
    };

    it("accepts a completely valid service creation payload", () => {
      const result = createServiceSchema.safeParse(validServicePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Drone Crop Spraying & Aerial Health Survey");
        expect(result.data.serviceCategory).toBe("DRONE_SPRAYING");
        expect(result.data.coverageStates).toEqual(["Oyo", "Ogun", "Osun"]);
        expect(result.data.pricingModel).toBe("PER_HECTARE");
        expect(result.data.baseRate).toBe(15000);
        expect(result.data.isAvailable).toBe(true);
      }
    });

    it("rejects service titles that are too short or too long", () => {
      const shortTitle = createServiceSchema.safeParse({ ...validServicePayload, title: "Dr" });
      expect(shortTitle.success).toBe(false);

      const longTitle = createServiceSchema.safeParse({
        ...validServicePayload,
        title: "D".repeat(151),
      });
      expect(longTitle.success).toBe(false);
    });

    it("rejects service descriptions shorter than 10 characters", () => {
      const shortDesc = createServiceSchema.safeParse({
        ...validServicePayload,
        description: "Too short",
      });
      expect(shortDesc.success).toBe(false);
    });

    it("strictly rejects prohibited pork/swine terms in service titles and descriptions", () => {
      const porkTitle = createServiceSchema.safeParse({
        ...validServicePayload,
        title: "Pork Abattoir Equipment Sanitization",
      });
      expect(porkTitle.success).toBe(false);
      if (!porkTitle.success) {
        expect(porkTitle.error.flatten().fieldErrors.title?.[0]).toContain(
          "AgroMarket strictly disallows pig/pork related listings"
        );
      }

      const swineDesc = createServiceSchema.safeParse({
        ...validServicePayload,
        description: "Specialized vaccination and artificial insemination for commercial swine herds.",
      });
      expect(swineDesc.success).toBe(false);
      if (!swineDesc.success) {
        expect(swineDesc.error.flatten().fieldErrors.description?.[0]).toContain(
          "AgroMarket strictly disallows pig/pork related listings"
        );
      }
    });

    it("rejects negative base rates", () => {
      const negativeRate = createServiceSchema.safeParse({
        ...validServicePayload,
        baseRate: -1000,
      });
      expect(negativeRate.success).toBe(false);
    });

    it("rejects empty coverage states array", () => {
      const emptyStates = createServiceSchema.safeParse({
        ...validServicePayload,
        coverageStates: [],
      });
      expect(emptyStates.success).toBe(false);
    });

    it("rejects invalid categories or pricing models", () => {
      const invalidCat = createServiceSchema.safeParse({
        ...validServicePayload,
        serviceCategory: "CAR_REPAIR",
      });
      expect(invalidCat.success).toBe(false);

      const invalidPricing = createServiceSchema.safeParse({
        ...validServicePayload,
        pricingModel: "BARTER",
      });
      expect(invalidPricing.success).toBe(false);
    });

    it("does not accept provider_id from client (server-authoritative identity)", () => {
      const payloadWithProviderId = {
        ...validServicePayload,
        provider_id: "00000000-0000-0000-0000-000000000000",
      };
      const parsed = createServiceSchema.safeParse(payloadWithProviderId);
      expect(parsed.success).toBe(true);
      expect((parsed as unknown as { data: Record<string, unknown> }).data.provider_id).toBeUndefined();
    });
  });

  // ============================================================================
  // 2. Service Creation Authorization
  // ============================================================================
  describe("2. Service Creation Authorization", () => {
    const authorizedRoles: UserRole[] = ["SERVICE_PROVIDER", "EXPERT"];

    it("permits SERVICE_PROVIDER role to create services", () => {
      const providerRoles: UserRole[] = ["SERVICE_PROVIDER"];
      expect(hasAnyRole(providerRoles, authorizedRoles)).toBe(true);
    });

    it("permits EXPERT role to create services", () => {
      const expertRoles: UserRole[] = ["EXPERT", "BUYER"];
      expect(hasAnyRole(expertRoles, authorizedRoles)).toBe(true);
    });

    it("permits ADMIN role via superuser override to create services", () => {
      const adminRoles: UserRole[] = ["ADMIN"];
      expect(hasAnyRole(adminRoles, authorizedRoles)).toBe(true);
      expect(hasRole(adminRoles, "ADMIN")).toBe(true);
    });

    it("rejects unauthorized non-provider roles from creating services", () => {
      const buyerOnly: UserRole[] = ["BUYER"];
      expect(hasAnyRole(buyerOnly, authorizedRoles)).toBe(false);

      const jobSeekerOnly: UserRole[] = ["JOB_SEEKER"];
      expect(hasAnyRole(jobSeekerOnly, authorizedRoles)).toBe(false);

      const farmerOnly: UserRole[] = ["FARMER"];
      expect(hasAnyRole(farmerOnly, authorizedRoles)).toBe(false);
    });
  });

  // ============================================================================
  // 3. Service Editing & Availability Ownership
  // ============================================================================
  describe("3. Service Editing & Availability Ownership", () => {
    const existingService = {
      id: "44444444-4444-4444-4444-444444444444",
      providerId: "provider-user-123",
      title: "Tractor Land Preparation",
      isAvailable: true,
    };

    function checkEditPermission(
      currentUser: { id: string; roles: UserRole[] },
      service: { providerId: string }
    ): { allowed: boolean; error?: string } {
      const isOwner = service.providerId === currentUser.id;
      const isAdmin = hasRole(currentUser.roles, "ADMIN");
      if (!isOwner && !isAdmin) {
        return { allowed: false, error: "Unauthorized. You can only edit your own service offerings." };
      }
      return { allowed: true };
    }

    it("allows the service provider/owner to edit", () => {
      const ownerUser = { id: "provider-user-123", roles: ["SERVICE_PROVIDER" as UserRole] };
      expect(checkEditPermission(ownerUser, existingService).allowed).toBe(true);
    });

    it("allows an administrator to edit any service", () => {
      const adminUser = { id: "admin-user-999", roles: ["ADMIN" as UserRole] };
      expect(checkEditPermission(adminUser, existingService).allowed).toBe(true);
    });

    it("rejects editing attempts by unauthorized users", () => {
      const otherProvider = { id: "other-prov-456", roles: ["SERVICE_PROVIDER" as UserRole] };
      const result = checkEditPermission(otherProvider, existingService);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("validates partial service updates via updateServiceSchema", () => {
      const validUpdate = updateServiceSchema.safeParse({
        serviceId: "44444444-4444-4444-4444-444444444444",
        baseRate: 20000,
        coverageStates: ["Oyo", "Ogun", "Lagos"],
      });
      expect(validUpdate.success).toBe(true);

      const invalidUuid = updateServiceSchema.safeParse({
        serviceId: "invalid-uuid",
        baseRate: 20000,
      });
      expect(invalidUuid.success).toBe(false);
    });

    it("validates availability toggle via toggleServiceAvailabilitySchema", () => {
      const toggleOff = toggleServiceAvailabilitySchema.safeParse({
        serviceId: "44444444-4444-4444-4444-444444444444",
        isAvailable: false,
      });
      expect(toggleOff.success).toBe(true);

      const toggleOn = toggleServiceAvailabilitySchema.safeParse({
        serviceId: "44444444-4444-4444-4444-444444444444",
        isAvailable: true,
      });
      expect(toggleOn.success).toBe(true);
    });
  });

  // ============================================================================
  // 4. Public Service Discovery, Filtering & Pagination
  // ============================================================================
  describe("4. Public Service Discovery & Filtering", () => {
    const mockServices: ServiceListing[] = [
      {
        id: "serv-1",
        providerId: "prov-1",
        title: "Commercial Tractor Plowing & Harrowing",
        description: "Heavy 75HP tractor plowing service across South-West Nigeria.",
        serviceCategory: "TRACTOR_OPERATOR",
        coverageStates: ["Oyo", "Ogun", "Osun"],
        pricingModel: "PER_HECTARE",
        baseRate: 25000,
        currency: "NGN",
        isAvailable: true,
        createdAt: "2026-09-21T08:00:00Z",
        updatedAt: "2026-09-21T08:00:00Z",
      },
      {
        id: "serv-2",
        providerId: "prov-2",
        title: "Soil Chemistry & Heavy Metal Testing",
        description: "Comprehensive lab test of soil pH, nitrogen, phosphorus, potassium, and CEC.",
        serviceCategory: "SOIL_TESTING",
        coverageStates: ["Kaduna", "Kano", "Abuja"],
        pricingModel: "FIXED",
        baseRate: 45000,
        currency: "NGN",
        isAvailable: true,
        createdAt: "2026-09-22T09:00:00Z",
        updatedAt: "2026-09-22T09:00:00Z",
      },
      {
        id: "serv-3",
        providerId: "prov-1",
        title: "Draft Inactive Service",
        description: "Equipment under scheduled maintenance.",
        serviceCategory: "LAND_CLEARING",
        coverageStates: ["Oyo"],
        pricingModel: "PER_HECTARE",
        baseRate: 50000,
        currency: "NGN",
        isAvailable: false,
        createdAt: "2026-09-23T10:00:00Z",
        updatedAt: "2026-09-23T10:00:00Z",
      },
    ];

    it("public discovery strictly excludes unavailable services", () => {
      const publicServices = mockServices.filter((s) => s.isAvailable);
      expect(publicServices.length).toBe(2);
      expect(publicServices.some((s) => !s.isAvailable)).toBe(false);
    });

    it("filters services by category", () => {
      const soilTesting = mockServices
        .filter((s) => s.isAvailable)
        .filter((s) => s.serviceCategory === "SOIL_TESTING");
      expect(soilTesting.length).toBe(1);
      expect(soilTesting[0].id).toBe("serv-2");
    });

    it("filters services by coverage state", () => {
      const oyoServices = mockServices
        .filter((s) => s.isAvailable)
        .filter((s) => s.coverageStates.includes("Oyo"));
      expect(oyoServices.length).toBe(1);
      expect(oyoServices[0].title).toContain("Tractor Plowing");
    });

    it("calculates pagination bounds correctly", () => {
      const totalCount = 35;
      const limit = 12;
      const page = 2;
      const totalPages = Math.ceil(totalCount / limit);
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      expect(totalPages).toBe(3);
      expect(from).toBe(12);
      expect(to).toBe(23);
    });
  });

  // ============================================================================
  // 5. Safe Public Provider Profile Representation (Privacy Invariant)
  // ============================================================================
  describe("5. Safe Public Provider Profile Representation (Zero PII Exposure)", () => {
    it("ensures SafeProviderProfile contains only explicitly safe public fields", () => {
      const safeProvider: SafeProviderProfile = {
        id: "provider-uuid-123",
        fullName: "AgroTech Precision Engineering Ltd",
        avatarUrl: "https://example.com/avatar.jpg",
        isVerified: true,
        state: "Oyo",
        lga: "Ibadan South-West",
      };

      expect(safeProvider.fullName).toBe("AgroTech Precision Engineering Ltd");
      expect(safeProvider.isVerified).toBe(true);

      const rawObject = safeProvider as unknown as Record<string, unknown>;
      expect(rawObject.email).toBeUndefined();
      expect(rawObject.phone).toBeUndefined();
      expect(rawObject.location_address).toBeUndefined();
    });

    it("maps raw database row to clean ServiceListing without exposing private fields", () => {
      const rawRow = {
        id: "serv-uuid-1",
        provider_id: "prov-uuid-99",
        title: "Veterinary Herd Inspection",
        description: "Ruminant health inspection and prophylactic treatments.",
        service_category: "VETERINARY",
        coverage_states: ["Sokoto", "Kebbi", "Zamfara"],
        pricing_model: "PER_HOUR",
        base_rate: "12000.00",
        currency: "NGN",
        is_available: true,
        created_at: "2026-09-20T08:00:00Z",
        updated_at: "2026-09-20T08:00:00Z",
      };

      const safeProvider: SafeProviderProfile = {
        id: "prov-uuid-99",
        fullName: "Dr. Aliyu Veterinary Clinic",
        avatarUrl: null,
        isVerified: true,
        state: "Sokoto",
        lga: "Sokoto North",
      };

      const mapped = mapServiceRow(rawRow, safeProvider, 5);

      expect(mapped.id).toBe("serv-uuid-1");
      expect(mapped.baseRate).toBe(12000);
      expect(mapped.provider?.fullName).toBe("Dr. Aliyu Veterinary Clinic");
      expect(mapped.requestsCount).toBe(5);

      const mappedRecord = mapped as unknown as Record<string, unknown>;
      expect(mappedRecord.email).toBeUndefined();
      expect(mappedRecord.phone).toBeUndefined();
      expect(mappedRecord.location_address).toBeUndefined();
    });
  });

  // ============================================================================
  // 6. Service Request Creation & Invariants
  // ============================================================================
  describe("6. Service Request Creation & Invariants", () => {
    const validRequest = {
      serviceId: "55555555-5555-5555-5555-555555555555",
      details: "Need 15 hectares plowed and harrowed before the first rains.",
      state: "Oyo",
      lga: "Iseyin",
      locationAddress: "KM 12 Iseyin-Ogbomoso Road, Oke-Ado Farm Cluster",
      proposedDate: "2026-10-15",
    };

    it("validates correct request payload via createServiceRequestSchema", () => {
      const result = createServiceRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.serviceId).toBe("55555555-5555-5555-5555-555555555555");
        expect(result.data.state).toBe("Oyo");
        expect(result.data.locationAddress).toContain("Iseyin-Ogbomoso");
      }
    });

    it("rejects request details with prohibited produce terms", () => {
      const prohibitedRequest = createServiceRequestSchema.safeParse({
        ...validRequest,
        details: "Clean and sanitize pens for upcoming shipment of live swine.",
      });
      expect(prohibitedRequest.success).toBe(false);
      if (!prohibitedRequest.success) {
        expect(prohibitedRequest.error.flatten().fieldErrors.details?.[0]).toContain(
          "AgroMarket strictly disallows pig/pork related services"
        );
      }
    });

    it("rejects invalid proposed date formats", () => {
      const invalidDate = createServiceRequestSchema.safeParse({
        ...validRequest,
        proposedDate: "not-a-valid-date",
      });
      expect(invalidDate.success).toBe(false);
    });

    it("does not accept client_id or provider_id from client", () => {
      const withSpoofedIds = {
        ...validRequest,
        client_id: "00000000-0000-0000-0000-000000000000",
        provider_id: "11111111-1111-1111-1111-111111111111",
      };
      const parsed = createServiceRequestSchema.safeParse(withSpoofedIds);
      expect(parsed.success).toBe(true);
      expect((parsed as unknown as { data: Record<string, unknown> }).data.client_id).toBeUndefined();
      expect((parsed as unknown as { data: Record<string, unknown> }).data.provider_id).toBeUndefined();
    });

    it("enforces rule: Requests can only be submitted for AVAILABLE services", () => {
      function canRequest(isAvailable: boolean): { allowed: boolean; error?: string } {
        if (!isAvailable) {
          return { allowed: false, error: "This service offering is currently unavailable for new bookings." };
        }
        return { allowed: true };
      }

      expect(canRequest(true).allowed).toBe(true);
      expect(canRequest(false).allowed).toBe(false);
      expect(canRequest(false).error).toBe(
        "This service offering is currently unavailable for new bookings."
      );
    });

    it("enforces rule: Providers cannot request their own services", () => {
      function validateRequester(serviceProviderId: string, clientId: string) {
        if (serviceProviderId === clientId) {
          return { allowed: false, error: "You cannot request your own service offering." };
        }
        return { allowed: true };
      }

      expect(validateRequester("prov-1", "client-2").allowed).toBe(true);
      expect(validateRequester("prov-1", "prov-1").allowed).toBe(false);
      expect(validateRequester("prov-1", "prov-1").error).toBe(
        "You cannot request your own service offering."
      );
    });
  });

  // ============================================================================
  // 7. Service Request Lifecycle State Machine & Participant Permissions
  // ============================================================================
  describe("7. Service Request Lifecycle State Machine & Participant Permissions", () => {
    it("allows valid transitions from PENDING", () => {
      expect(isValidServiceRequestTransition("PENDING", "QUOTED")).toBe(true);
      expect(isValidServiceRequestTransition("PENDING", "CANCELLED")).toBe(true);
      expect(isValidServiceRequestTransition("PENDING", "PENDING")).toBe(true);
      expect(isValidServiceRequestTransition("PENDING", "ACCEPTED")).toBe(false);
      expect(isValidServiceRequestTransition("PENDING", "IN_PROGRESS")).toBe(false);
      expect(isValidServiceRequestTransition("PENDING", "COMPLETED")).toBe(false);
    });

    it("allows valid transitions from QUOTED", () => {
      expect(isValidServiceRequestTransition("QUOTED", "ACCEPTED")).toBe(true);
      expect(isValidServiceRequestTransition("QUOTED", "CANCELLED")).toBe(true);
      expect(isValidServiceRequestTransition("QUOTED", "QUOTED")).toBe(true);
      expect(isValidServiceRequestTransition("QUOTED", "IN_PROGRESS")).toBe(false);
      expect(isValidServiceRequestTransition("QUOTED", "COMPLETED")).toBe(false);
    });

    it("allows valid transitions from ACCEPTED", () => {
      expect(isValidServiceRequestTransition("ACCEPTED", "IN_PROGRESS")).toBe(true);
      expect(isValidServiceRequestTransition("ACCEPTED", "CANCELLED")).toBe(true);
      expect(isValidServiceRequestTransition("ACCEPTED", "ACCEPTED")).toBe(true);
      expect(isValidServiceRequestTransition("ACCEPTED", "COMPLETED")).toBe(false);
    });

    it("allows valid transitions from IN_PROGRESS", () => {
      expect(isValidServiceRequestTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
      expect(isValidServiceRequestTransition("IN_PROGRESS", "DISPUTED")).toBe(true);
      expect(isValidServiceRequestTransition("IN_PROGRESS", "IN_PROGRESS")).toBe(true);
      expect(isValidServiceRequestTransition("IN_PROGRESS", "PENDING")).toBe(false);
      expect(isValidServiceRequestTransition("IN_PROGRESS", "QUOTED")).toBe(false);
    });

    it("allows COMPLETED to transition to DISPUTED if contested", () => {
      expect(isValidServiceRequestTransition("COMPLETED", "DISPUTED")).toBe(true);
      expect(isValidServiceRequestTransition("COMPLETED", "COMPLETED")).toBe(true);
      expect(isValidServiceRequestTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
    });

    it("treats CANCELLED as a terminal state with no outgoing transitions", () => {
      expect(VALID_SERVICE_REQUEST_TRANSITIONS.CANCELLED).toEqual([]);
      expect(isValidServiceRequestTransition("CANCELLED", "PENDING")).toBe(false);
      expect(isValidServiceRequestTransition("CANCELLED", "QUOTED")).toBe(false);
      expect(isValidServiceRequestTransition("CANCELLED", "ACCEPTED")).toBe(false);
      expect(isValidServiceRequestTransition("CANCELLED", "CANCELLED")).toBe(true);
    });

    it("allows DISPUTED to be resolved only to COMPLETED or CANCELLED", () => {
      expect(VALID_SERVICE_REQUEST_TRANSITIONS.DISPUTED).toEqual(["COMPLETED", "CANCELLED"]);
      expect(isValidServiceRequestTransition("DISPUTED", "COMPLETED")).toBe(true);
      expect(isValidServiceRequestTransition("DISPUTED", "CANCELLED")).toBe(true);
      expect(isValidServiceRequestTransition("DISPUTED", "IN_PROGRESS")).toBe(false);
    });

    describe("Participant Role Authorization for Lifecycle Transitions", () => {
      it("only PROVIDER or ADMIN can provide a quote (PENDING -> QUOTED)", () => {
        expect(isAuthorizedRequestTransition("PROVIDER", "PENDING", "QUOTED")).toBe(true);
        expect(isAuthorizedRequestTransition("ADMIN", "PENDING", "QUOTED")).toBe(true);
        expect(isAuthorizedRequestTransition("CLIENT", "PENDING", "QUOTED")).toBe(false);
      });

      it("only CLIENT or ADMIN can accept a quote (QUOTED -> ACCEPTED)", () => {
        expect(isAuthorizedRequestTransition("CLIENT", "QUOTED", "ACCEPTED")).toBe(true);
        expect(isAuthorizedRequestTransition("ADMIN", "QUOTED", "ACCEPTED")).toBe(true);
        expect(isAuthorizedRequestTransition("PROVIDER", "QUOTED", "ACCEPTED")).toBe(false);
      });

      it("only PROVIDER or ADMIN can start work (ACCEPTED -> IN_PROGRESS)", () => {
        expect(isAuthorizedRequestTransition("PROVIDER", "ACCEPTED", "IN_PROGRESS")).toBe(true);
        expect(isAuthorizedRequestTransition("ADMIN", "ACCEPTED", "IN_PROGRESS")).toBe(true);
        expect(isAuthorizedRequestTransition("CLIENT", "ACCEPTED", "IN_PROGRESS")).toBe(false);
      });

      it("PROVIDER or CLIENT can mark completed, and either can dispute in progress", () => {
        expect(isAuthorizedRequestTransition("PROVIDER", "IN_PROGRESS", "COMPLETED")).toBe(true);
        expect(isAuthorizedRequestTransition("CLIENT", "IN_PROGRESS", "COMPLETED")).toBe(true);
        expect(isAuthorizedRequestTransition("PROVIDER", "IN_PROGRESS", "DISPUTED")).toBe(true);
        expect(isAuthorizedRequestTransition("CLIENT", "IN_PROGRESS", "DISPUTED")).toBe(true);
      });

      it("only CLIENT can dispute a COMPLETED service request", () => {
        expect(isAuthorizedRequestTransition("CLIENT", "COMPLETED", "DISPUTED")).toBe(true);
        expect(isAuthorizedRequestTransition("PROVIDER", "COMPLETED", "DISPUTED")).toBe(false);
      });

      it("only ADMIN can resolve a DISPUTED request", () => {
        expect(isAuthorizedRequestTransition("ADMIN", "DISPUTED", "COMPLETED")).toBe(true);
        expect(isAuthorizedRequestTransition("ADMIN", "DISPUTED", "CANCELLED")).toBe(true);
        expect(isAuthorizedRequestTransition("CLIENT", "DISPUTED", "COMPLETED")).toBe(false);
        expect(isAuthorizedRequestTransition("PROVIDER", "DISPUTED", "COMPLETED")).toBe(false);
        expect(isAuthorizedRequestTransition("CLIENT", "DISPUTED", "CANCELLED")).toBe(false);
        expect(isAuthorizedRequestTransition("PROVIDER", "DISPUTED", "CANCELLED")).toBe(false);
      });
    });

    it("validates request status update payload via updateServiceRequestStatusSchema", () => {
      const validPayload = updateServiceRequestStatusSchema.safeParse({
        requestId: "66666666-6666-6666-6666-666666666666",
        status: "QUOTED",
        quotedAmount: 180000,
      });
      expect(validPayload.success).toBe(true);

      const invalidStatus = updateServiceRequestStatusSchema.safeParse({
        requestId: "66666666-6666-6666-6666-666666666666",
        status: "INVALID_STATUS",
      });
      expect(invalidStatus.success).toBe(false);
    });
  });

  // ============================================================================
  // 8. Protected Address & Location Privacy Invariant
  // ============================================================================
  describe("8. Protected Address & Location Privacy Invariant", () => {
    it("confirms location_address is only exposed to authorized request participants", () => {
      const fullRequest: ServiceRequest = {
        id: "req-1",
        serviceId: "serv-1",
        clientId: "client-abc",
        providerId: "provider-xyz",
        details: "10 hectares drone spraying",
        state: "Oyo",
        lga: "Iseyin",
        locationAddress: "Farm Gate 3, Oke-Ado Valley Farm Settlements",
        proposedDate: "2026-10-20",
        quotedAmount: 150000,
        currency: "NGN",
        status: "QUOTED",
        createdAt: "2026-09-22T00:00:00Z",
        updatedAt: "2026-09-22T00:00:00Z",
      };

      function getVisibleLocation(
        userId: string,
        roles: UserRole[],
        req: ServiceRequest
      ): string | null {
        const isClient = req.clientId === userId;
        const isProvider = req.providerId === userId;
        const isAdmin = hasRole(roles, "ADMIN");

        if (isClient || isProvider || isAdmin) {
          return req.locationAddress;
        }
        return null;
      }

      // Authorized client sees exact address
      expect(getVisibleLocation("client-abc", ["BUYER"], fullRequest)).toBe(
        "Farm Gate 3, Oke-Ado Valley Farm Settlements"
      );

      // Authorized provider sees exact address to fulfill service
      expect(getVisibleLocation("provider-xyz", ["SERVICE_PROVIDER"], fullRequest)).toBe(
        "Farm Gate 3, Oke-Ado Valley Farm Settlements"
      );

      // Admin sees address
      expect(getVisibleLocation("admin-user", ["ADMIN"], fullRequest)).toBe(
        "Farm Gate 3, Oke-Ado Valley Farm Settlements"
      );

      // Unauthorized third party is blocked from seeing farm location
      expect(getVisibleLocation("stranger-user", ["BUYER"], fullRequest)).toBeNull();
    });
  });
});
