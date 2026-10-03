// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/learn/security",
}));
import { SecurityDisclaimerBanner } from "@/features/agricultural-security/components/security-disclaimer-banner";
import { SeverityBadge } from "@/features/agricultural-security/components/severity-badge";
import { VerificationBadge } from "@/features/agricultural-security/components/verification-badge";
import { SecurityIncidentCard } from "@/features/agricultural-security/components/security-incident-card";
import { CorridorAdvisoryBanner } from "@/features/agricultural-security/components/corridor-advisory-banner";
import { AdminSecurityTable } from "@/features/agricultural-security/components/admin-security-table";
import { SecurityIncident } from "@/features/agricultural-security/types";
import { SECURITY_DISCLAIMER_TEXT } from "@/features/agricultural-security/constants";

describe("Phase 1.5 Agricultural Security UI Component Tests", () => {
  const sampleIncident: SecurityIncident = {
    id: "test-incident-uuid-1",
    title: "Produce Transit Disruption Along Zaria Highway",
    slug: "produce-transit-disruption-along-zaria-highway",
    incidentType: "LOGISTICS_CORRIDOR_INCIDENT",
    status: "PUBLISHED",
    severity: "HIGH",
    description:
      "Commercial grain trucks experienced delays near highway bypass. Security patrols dispatched to secure daylight movements.",
    occurredAt: "2026-10-01T08:00:00Z",
    reportedAt: "2026-10-01T09:00:00Z",
    publishedAt: "2026-10-01T10:00:00Z",
    sourceName: "Kaduna State Transport Advisory",
    sourceType: "OFFICIAL",
    sourceUrl: "https://transport.kaduna.gov.ng/notice",
    sourcePublicationDate: "2026-10-01T09:00:00Z",
    verificationStatus: "VERIFIED",
    state: "Kaduna",
    lga: "Igabi",
    locationScope: "REGION_CORRIDOR",
    affectedCommodities: ["Maize", "Soybeans"],
    affectedCategories: ["GRAINS_CEREALS"],
    movementImpact: "Daylight transit recommended; avoid night freight.",
    foodSecurityImpact: "Grain supply to regional silos delayed by 18 hours.",
    editorialNotes: null,
    createdBy: "admin-1",
    creator: {
      id: "admin-1",
      fullName: "Editorial Desk",
      avatarUrl: null,
      isVerified: true,
      state: "Kaduna",
    },
    updatedBy: "admin-1",
    createdAt: "2026-10-01T09:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
    archivedAt: null,
  };

  describe("SecurityDisclaimerBanner", () => {
    it("renders the mandatory decision-support disclaimer banner", () => {
      render(<SecurityDisclaimerBanner />);
      expect(screen.getByRole("region")).toBeDefined();
      expect(screen.getByText("Decision Support & Safety Notice")).toBeDefined();
      expect(screen.getByText(SECURITY_DISCLAIMER_TEXT)).toBeDefined();
    });
  });

  describe("SeverityBadge", () => {
    it("renders LOW severity correctly", () => {
      render(<SeverityBadge severity="LOW" />);
      expect(screen.getByText("Low Severity")).toBeDefined();
    });

    it("renders CRITICAL severity correctly", () => {
      render(<SeverityBadge severity="CRITICAL" />);
      expect(screen.getByText("Critical Severity")).toBeDefined();
    });
  });

  describe("VerificationBadge", () => {
    it("renders VERIFIED status badge", () => {
      render(<VerificationBadge status="VERIFIED" />);
      expect(screen.getByText("Verified Incident")).toBeDefined();
    });

    it("renders OFFICIAL status badge", () => {
      render(<VerificationBadge status="OFFICIAL" />);
      expect(screen.getByText("Official Security Bulletin")).toBeDefined();
    });

    it("renders REPORTED status badge", () => {
      render(<VerificationBadge status="REPORTED" />);
      expect(screen.getByText("Under Editorial Review")).toBeDefined();
    });
  });

  describe("SecurityIncidentCard", () => {
    it("renders incident card with all key decision support fields", () => {
      render(<SecurityIncidentCard incident={sampleIncident} />);

      expect(screen.getByText("Produce Transit Disruption Along Zaria Highway")).toBeDefined();
      expect(screen.getByText("Logistics Corridor Incident")).toBeDefined();
      expect(screen.getByText("High Severity")).toBeDefined();
      expect(screen.getByText("Verified Incident")).toBeDefined();
      expect(screen.getByText("Kaduna, Igabi (General Area)")).toBeDefined();
      expect(screen.getByText("Kaduna State Transport Advisory")).toBeDefined();
      expect(screen.getByText("Maize")).toBeDefined();
      expect(screen.getByText("Soybeans")).toBeDefined();
      expect(screen.getByText("Transit Corridor Advisory:")).toBeDefined();
      const detailLink = screen.getByRole("link", { name: /view details/i });
      expect(detailLink.getAttribute("href")).toBe(
        "/learn/security/produce-transit-disruption-along-zaria-highway"
      );
    });
  });

  describe("CorridorAdvisoryBanner", () => {
    it("renders active transit corridor advisories for logistics", () => {
      const advisories = {
        Kaduna: {
          state: "Kaduna",
          activeDisruptionsCount: 2,
          highestSeverity: "HIGH" as const,
          hasMovementRestrictions: true,
          latestIncidentTitle: "Produce Transit Disruption Along Zaria Highway",
          latestIncidentSlug: "produce-transit-disruption-along-zaria-highway",
          publishedAt: "2026-10-01T10:00:00Z",
        },
      };

      render(<CorridorAdvisoryBanner advisories={advisories} />);
      expect(screen.getByRole("status")).toBeDefined();
      expect(screen.getByText("Active Agricultural Logistics Corridor Advisories")).toBeDefined();
      expect(screen.getByText("Kaduna State")).toBeDefined();
      expect(screen.getByText("Movement Restriction Active")).toBeDefined();
      expect(screen.getByText(/2 active reports/i)).toBeDefined();
    });

    it("renders nothing when there are no active disruptions", () => {
      const { container } = render(<CorridorAdvisoryBanner advisories={{}} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("AdminSecurityTable", () => {
    it("renders admin management table rows with status and verification controls", () => {
      render(<AdminSecurityTable incidents={[sampleIncident]} totalCount={1} />);

      expect(screen.getByText("Produce Transit Disruption Along Zaria Highway")).toBeDefined();
      expect(screen.getByText("Kaduna State Transport Advisory")).toBeDefined();
      expect(screen.getByText("PUBLISHED")).toBeDefined();
    });

    it("renders empty state when no incidents are present", () => {
      render(<AdminSecurityTable incidents={[]} totalCount={0} />);

      expect(screen.getByText("No Security Incidents Recorded")).toBeDefined();
      const newLink = screen.getByRole("link", { name: /create new incident/i });
      expect(newLink.getAttribute("href")).toBe("/admin/security/new");
    });
  });
});
