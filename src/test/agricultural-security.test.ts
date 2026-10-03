import { describe, it, expect } from "vitest";
import {
  INCIDENT_TYPES,
  INCIDENT_SEVERITY_LEVELS,
  INCIDENT_VERIFICATION_STATUSES,
} from "@/features/agricultural-security/types";
import {
  SECURITY_DISCLAIMER_TEXT,
  SECURITY_EMPTY_STATE_MESSAGE,
} from "@/features/agricultural-security/constants";
import {
  canManageSecurityIncidents,
  canCreateSecurityDraft,
  canEditSecurityIncident,
  canVerifySecurityIncident,
  canPublishSecurityIncident,
} from "@/features/agricultural-security/permissions";
import {
  createSecurityIncidentSchema,
  slugifyIncidentTitle,
  containsUnsafeCoordinates,
} from "@/features/agricultural-security/validation";
import {
  mapSecurityIncidentRow,
} from "@/features/agricultural-security/queries";
import { AuthUser } from "@/types/auth";

describe("Phase 1.5 Agricultural Security Domain Tests", () => {
  describe("Domain Constants & Types", () => {
    it("defines canonical incident types", () => {
      expect(INCIDENT_TYPES).toContain("FARM_ATTACK");
      expect(INCIDENT_TYPES).toContain("KIDNAPPING_SECURITY_THREAT");
      expect(INCIDENT_TYPES).toContain("FARM_ACCESS_DISRUPTION");
      expect(INCIDENT_TYPES).toContain("LOGISTICS_CORRIDOR_INCIDENT");
      expect(INCIDENT_TYPES).toContain("THEFT_OR_ROBBERY");
      expect(INCIDENT_TYPES).toContain("MOVEMENT_RESTRICTION");
      expect(INCIDENT_TYPES).toContain("AGRICULTURAL_MARKET_DISRUPTION");
      expect(INCIDENT_TYPES).toContain("OTHER_AGRICULTURAL_SECURITY_EVENT");
    });

    it("defines controlled severity levels", () => {
      expect(INCIDENT_SEVERITY_LEVELS).toEqual(["LOW", "MODERATE", "HIGH", "CRITICAL"]);
    });

    it("defines controlled verification statuses", () => {
      expect(INCIDENT_VERIFICATION_STATUSES).toEqual([
        "UNVERIFIED",
        "REPORTED",
        "VERIFIED",
        "OFFICIAL",
        "CORRECTED",
        "ARCHIVED",
      ]);
    });

    it("has canonical decision support disclaimer", () => {
      expect(SECURITY_DISCLAIMER_TEXT).toContain("Security information can change quickly");
      expect(SECURITY_DISCLAIMER_TEXT).toContain("does not guarantee the safety of any person, route or location");
    });

    it("has honest empty state message", () => {
      expect(SECURITY_EMPTY_STATE_MESSAGE).toBe(
        "No verified agricultural security incidents are currently published for this area."
      );
    });
  });

  describe("Validation & Safety Guards", () => {
    const validData = {
      title: "Armed Robbery Along Zaria-Kano Agricultural Freight Corridor",
      incidentType: "LOGISTICS_CORRIDOR_INCIDENT",
      severity: "HIGH",
      description:
        "Commercial trucks transporting grain reserves experienced roadblocks near highway transit point. State police deployed patrols.",
      sourceName: "Kaduna State Police Command",
      sourceType: "OFFICIAL",
      sourceUrl: "https://police.gov.ng/statements/corridor-notice",
      verificationStatus: "REPORTED",
      state: "Kaduna",
      lga: "Chikun",
      locationScope: "REGION_CORRIDOR",
      affectedCommodities: ["Maize", "Sorghum"],
      affectedCategories: ["GRAINS_CEREALS"],
      movementImpact: "Southern bypass recommended for daylight freight movements.",
      foodSecurityImpact: "Grain deliveries delayed by 24 hours to central mills.",
      status: "DRAFT",
    };

    it("successfully validates compliant incident input", () => {
      const result = createSecurityIncidentSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.state).toBe("Kaduna");
        expect(result.data.severity).toBe("HIGH");
      }
    });

    it("slugifies title into clean URL identifier", () => {
      const slug = slugifyIncidentTitle("Armed Disruption in Kaduna North Corridor!");
      expect(slug).toBe("armed-disruption-in-kaduna-north-corridor");
    });

    it("strictly rejects pig/pork terms across all text fields (Anti-Pork Policy)", () => {
      const withPorkTitle = { ...validData, title: "Attack at Pork processing farm" };
      expect(createSecurityIncidentSchema.safeParse(withPorkTitle).success).toBe(false);

      const withBaconDesc = { ...validData, description: "Storage with bacon and grain stolen" };
      expect(createSecurityIncidentSchema.safeParse(withBaconDesc).success).toBe(false);

      const withPigCommodity = { ...validData, affectedCommodities: ["Maize", "pork"] };
      expect(createSecurityIncidentSchema.safeParse(withPigCommodity).success).toBe(false);

      const withSwineNotes = { ...validData, editorialNotes: "Involves wild swine herd" };
      expect(createSecurityIncidentSchema.safeParse(withSwineNotes).success).toBe(false);
    });

    it("detects and rejects exact GPS coordinates to protect farm safety (Location Privacy)", () => {
      expect(containsUnsafeCoordinates("Farm located at 9.0765, 7.3986 near village")).toBe(true);
      expect(containsUnsafeCoordinates("General area Chikun LGA Kaduna")).toBe(false);

      const withGpsInTitle = {
        ...validData,
        title: "Attack at 10.5105, 7.4165 farmstead",
      };
      const res1 = createSecurityIncidentSchema.safeParse(withGpsInTitle);
      expect(res1.success).toBe(false);

      const withGpsInDesc = {
        ...validData,
        description: "Exact coordinates are 11.2345, 8.4567 where vehicles were halted.",
      };
      const res2 = createSecurityIncidentSchema.safeParse(withGpsInDesc);
      expect(res2.success).toBe(false);
    });

    it("rejects non-Nigerian states", () => {
      const invalidState = { ...validData, state: "Texas" };
      const res = createSecurityIncidentSchema.safeParse(invalidState);
      expect(res.success).toBe(false);
    });

    it("rejects invalid incident types", () => {
      const invalidType = { ...validData, incidentType: "ALIEN_INVASION" };
      const res = createSecurityIncidentSchema.safeParse(invalidType);
      expect(res.success).toBe(false);
    });

    it("rejects invalid severity", () => {
      const invalidSev = { ...validData, severity: "CATASTROPHIC" };
      const res = createSecurityIncidentSchema.safeParse(invalidSev);
      expect(res.success).toBe(false);
    });

    it("rejects short descriptions below 20 characters", () => {
      const shortDesc = { ...validData, description: "Short attack." };
      const res = createSecurityIncidentSchema.safeParse(shortDesc);
      expect(res.success).toBe(false);
    });
  });

  describe("Permissions & Role Enforcement", () => {
    const adminUser: AuthUser = {
      id: "admin-uuid-1",
      email: "admin@agromarket.ng",
      phone: "+2348000000001",
      fullName: "Admin Officer",
      state: "FCT - Abuja",
      lga: "Abuja Municipal",
      roles: ["ADMIN"],
      isEmailVerified: true,
      isPhoneVerified: true,
      isVerified: true,
      isOnboarded: true,
      createdAt: new Date().toISOString(),
    };

    const expertUser: AuthUser = {
      id: "expert-uuid-2",
      email: "expert@agromarket.ng",
      phone: "+2348000000002",
      fullName: "Dr. Security Analyst",
      state: "Kaduna",
      lga: "Kaduna North",
      roles: ["EXPERT"],
      isEmailVerified: true,
      isPhoneVerified: true,
      isVerified: true,
      isOnboarded: true,
      createdAt: new Date().toISOString(),
    };

    const buyerUser: AuthUser = {
      id: "buyer-uuid-3",
      email: "buyer@agromarket.ng",
      phone: "+2348000000003",
      fullName: "Regular Buyer",
      state: "Lagos",
      lga: "Ikeja",
      roles: ["BUYER"],
      isEmailVerified: true,
      isPhoneVerified: true,
      isVerified: true,
      isOnboarded: true,
      createdAt: new Date().toISOString(),
    };

    it("permits ADMIN to manage, verify, and publish incidents", () => {
      expect(canManageSecurityIncidents(adminUser)).toBe(true);
      expect(canCreateSecurityDraft(adminUser)).toBe(true);
      expect(canVerifySecurityIncident(adminUser, "VERIFIED")).toBe(true);
      expect(canVerifySecurityIncident(adminUser, "OFFICIAL")).toBe(true);
      expect(canPublishSecurityIncident(adminUser)).toBe(true);
    });

    it("permits EXPERT to create drafts and edit their own drafts, but not self-verify or publish", () => {
      expect(canManageSecurityIncidents(expertUser)).toBe(false);
      expect(canCreateSecurityDraft(expertUser)).toBe(true);
      expect(canVerifySecurityIncident(expertUser, "VERIFIED")).toBe(false);
      expect(canPublishSecurityIncident(expertUser)).toBe(false);

      const ownDraft = {
        createdBy: expertUser.id,
        status: "DRAFT" as const,
        verificationStatus: "REPORTED" as const,
      };
      expect(canEditSecurityIncident(expertUser, ownDraft)).toBe(true);

      const othersDraft = {
        createdBy: "someone-else",
        status: "DRAFT" as const,
        verificationStatus: "REPORTED" as const,
      };
      expect(canEditSecurityIncident(expertUser, othersDraft)).toBe(false);

      const publishedIncident = {
        createdBy: expertUser.id,
        status: "PUBLISHED" as const,
        verificationStatus: "VERIFIED" as const,
      };
      expect(canEditSecurityIncident(expertUser, publishedIncident)).toBe(false);
    });

    it("denies BUYER and unauthenticated users from creating or modifying incidents", () => {
      expect(canManageSecurityIncidents(buyerUser)).toBe(false);
      expect(canCreateSecurityDraft(buyerUser)).toBe(false);
      expect(canManageSecurityIncidents(null)).toBe(false);
      expect(canCreateSecurityDraft(null)).toBe(false);
    });
  });

  describe("Query & Row Mapping", () => {
    it("correctly maps raw database row to SecurityIncident model", () => {
      const raw = {
        id: "incident-1",
        title: "Highway Ambush Reported",
        slug: "highway-ambush-reported",
        incident_type: "LOGISTICS_CORRIDOR_INCIDENT",
        status: "PUBLISHED",
        severity: "CRITICAL",
        description: "Armed disruption along road.",
        occurred_at: "2026-10-01T10:00:00Z",
        reported_at: "2026-10-01T11:00:00Z",
        published_at: "2026-10-01T12:00:00Z",
        source_name: "Police PRO",
        source_type: "OFFICIAL",
        source_url: null,
        source_publication_date: null,
        verification_status: "VERIFIED",
        state: "Kaduna",
        lga: "Birnin Gwari",
        location_scope: "REGION_CORRIDOR",
        affected_commodities: ["Maize", "Cowpea"],
        affected_categories: ["GRAINS_CEREALS"],
        movement_impact: "Bypass active.",
        food_security_impact: "Grain transport slowed.",
        editorial_notes: null,
        created_by: "user-1",
        updated_by: "user-1",
        created_at: "2026-10-01T11:00:00Z",
        updated_at: "2026-10-01T12:00:00Z",
        archived_at: null,
      };

      const mapped = mapSecurityIncidentRow(raw, {
        id: "user-1",
        fullName: "Auditor Official",
        avatarUrl: null,
        isVerified: true,
        state: "Kaduna",
      });

      expect(mapped.id).toBe("incident-1");
      expect(mapped.incidentType).toBe("LOGISTICS_CORRIDOR_INCIDENT");
      expect(mapped.severity).toBe("CRITICAL");
      expect(mapped.verificationStatus).toBe("VERIFIED");
      expect(mapped.state).toBe("Kaduna");
      expect(mapped.creator?.fullName).toBe("Auditor Official");
      expect(mapped.affectedCommodities).toEqual(["Maize", "Cowpea"]);
    });
  });
});
