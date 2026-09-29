// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/equipment",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// Mock Auth
vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn(),
  requireAuth: vi.fn(),
  requireRole: vi.fn(),
  requireAnyRole: vi.fn(),
}));

// Mock Equipment Queries
vi.mock("@/features/equipment/queries", () => ({
  getEquipment: vi.fn(),
  getEquipmentById: vi.fn(),
  getOwnerEquipment: vi.fn(),
  getUserRentals: vi.fn(),
  getOwnerRentals: vi.fn(),
  getRentalById: vi.fn(),
}));

// Mock Reviews Queries
vi.mock("@/features/reviews/queries", () => ({
  getReviews: vi.fn(),
  getReviewStats: vi.fn(),
}));

// Import page components
import EquipmentPage from "@/app/equipment/page";
import EquipmentDetailPage from "@/app/equipment/[equipmentId]/page";
import AccountEquipmentRentalsPage from "@/app/account/equipment-rentals/page";
import EquipmentOwnerDashboardPage from "@/app/equipment/owner/page";
import NewEquipmentPage from "@/app/equipment/owner/new/page";
import ManageEquipmentPage from "@/app/equipment/owner/[equipmentId]/page";
import OwnerRentalDetailPage from "@/app/equipment/owner/rentals/[rentalId]/page";

// Import types & mock targets
import { getCurrentUser, requireAuth, requireAnyRole } from "@/lib/auth/server";
import {
  getEquipment,
  getEquipmentById,
  getOwnerEquipment,
  getUserRentals,
  getOwnerRentals,
  getRentalById,
} from "@/features/equipment/queries";
import { getReviews } from "@/features/reviews/queries";
import { AuthUser } from "@/types/auth";
import { EquipmentListing, EquipmentRental } from "@/features/equipment/types";

describe("Phase 1.3 Step 3: Equipment Rental UI Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRenterSession: AuthUser = {
    id: "renter-1",
    email: "renter@agromarket.ng",
    fullName: "Test Renter Farmer",
    phone: "+2348011223344",
    state: "Kaduna",
    lga: "Zaria",
    roles: ["BUYER"],
    isEmailVerified: true,
    isPhoneVerified: true,
    isVerified: true,
    isOnboarded: true,
    createdAt: "2026-09-01T00:00:00Z",
  };

  const mockOwnerSession: AuthUser = {
    id: "owner-1",
    email: "owner@agromarket.ng",
    fullName: "Owner Operator",
    phone: "+2348099887766",
    state: "Kaduna",
    lga: "Zaria",
    roles: ["EQUIPMENT_OWNER"],
    isEmailVerified: true,
    isPhoneVerified: true,
    isVerified: true,
    isOnboarded: true,
    createdAt: "2026-09-01T00:00:00Z",
  };

  const mockEquipment: EquipmentListing = {
    id: "eq-101",
    ownerId: "owner-1",
    name: "Massey Ferguson 375 4WD Tractor",
    category: "TRACTOR",
    makeModel: "MF 375",
    yearManufactured: 2022,
    description: "75HP tractor suitable for heavy plowing and disc harrowing in northern soils.",
    locationState: "Kaduna",
    locationLga: "Zaria",
    dailyRentalRate: 45000,
    cautionDeposit: 50000,
    currency: "NGN",
    operatorIncluded: true,
    condition: "EXCELLENT",
    isAvailable: true,
    status: "ACTIVE",
    createdAt: "2026-09-20T08:00:00Z",
    updatedAt: "2026-09-20T08:00:00Z",
    owner: {
      id: "owner-1",
      fullName: "Northern Mechanization Hub",
      avatarUrl: null,
      isVerified: true,
      state: "Kaduna",
      lga: "Zaria",
    },
    reviewStats: {
      averageRating: 4.8,
      totalReviews: 12,
    },
  };

  const mockRental: EquipmentRental = {
    id: "rent-202",
    equipmentId: "eq-101",
    renterId: "renter-1",
    ownerId: "owner-1",
    startDate: "2026-11-01",
    endDate: "2026-11-05",
    totalDays: 5,
    dailyRate: 45000,
    totalRentalAmount: 225000,
    depositAmount: 50000,
    currency: "NGN",
    status: "REQUESTED",
    handoverNotes: "Plowing 20 hectares in Zaria cluster.",
    returnNotes: null,
    createdAt: "2026-09-28T09:00:00Z",
    updatedAt: "2026-09-28T09:00:00Z",
    equipment: mockEquipment,
    owner: mockEquipment.owner,
    renter: {
      id: "renter-1",
      fullName: "Test Renter Farmer",
      avatarUrl: null,
      phone: "+2348011223344",
    },
  };

  // ============================================================================
  // 1. PUBLIC EQUIPMENT PAGES
  // ============================================================================
  describe("1. Public Equipment Discovery (/equipment)", () => {
    it("renders public equipment page with filter controls and cards without requiring auth", async () => {
      vi.mocked(getEquipment).mockResolvedValue({
        equipment: [mockEquipment],
        totalCount: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
      });

      const element = await EquipmentPage({
        searchParams: Promise.resolve({}),
      });

      render(element);

      expect(screen.getByText("Agricultural Equipment Rental")).toBeDefined();
      expect(screen.getByText("Massey Ferguson 375 4WD Tractor")).toBeDefined();
      expect(screen.getByText(/45,000/)).toBeDefined();
      expect(screen.getByText("Northern Mechanization Hub")).toBeDefined();
      expect(screen.getByText(/Zaria, Kaduna State/)).toBeDefined();
      expect(screen.getByText("Operator Included")).toBeDefined();
    });

    it("renders empty state when no machinery matches search filters", async () => {
      vi.mocked(getEquipment).mockResolvedValue({
        equipment: [],
        totalCount: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
      });

      const element = await EquipmentPage({
        searchParams: Promise.resolve({ search: "nonexistent-combine" }),
      });

      render(element);

      expect(screen.getByText("No equipment found")).toBeDefined();
      expect(screen.getByText("Reset All Filters")).toBeDefined();
    });
  });

  describe("2. Public Equipment Detail (/equipment/[equipmentId])", () => {
    it("renders full equipment technical details, safe owner profile, and booking form", async () => {
      vi.mocked(getEquipmentById).mockResolvedValue(mockEquipment);
      vi.mocked(getCurrentUser).mockResolvedValue(null); // Unauthenticated visitor
      vi.mocked(getReviews).mockResolvedValue({
        reviews: [],
        totalCount: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        stats: { averageRating: 0, totalReviews: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      });

      const element = await EquipmentDetailPage({
        params: Promise.resolve({ equipmentId: "eq-101" }),
      });

      render(element);

      expect(screen.getAllByText("Massey Ferguson 375 4WD Tractor").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Machinery Specifications")).toBeDefined();
      expect(screen.getByText("Northern Mechanization Hub")).toBeDefined();
      expect(screen.getByText("Sign In to Request Rental")).toBeDefined();
      // Confirm private PII is NOT in document
      expect(screen.queryByText("+2348000000001")).toBeNull();
      expect(screen.queryByText("Secret Farm Road")).toBeNull();
    });

    it("throws notFound() when the requested equipment does not exist", async () => {
      vi.mocked(getEquipmentById).mockResolvedValue(null);

      await expect(
        EquipmentDetailPage({
          params: Promise.resolve({ equipmentId: "nonexistent-id" }),
        })
      ).rejects.toThrow("NEXT_NOT_FOUND");
    });
  });

  // ============================================================================
  // 2. RENTER EXPERIENCE
  // ============================================================================
  describe("3. Renter Experience (/account/equipment-rentals)", () => {
    it("requires authentication and displays user's rentals with status and pricing", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockRenterSession);

      vi.mocked(getUserRentals).mockResolvedValue([mockRental]);

      const element = await AccountEquipmentRentalsPage();
      render(element);

      expect(screen.getByText("My Equipment Rentals")).toBeDefined();
      expect(screen.getByText("Massey Ferguson 375 4WD Tractor")).toBeDefined();
      expect(screen.getByText("Booking Requested")).toBeDefined();
      expect(screen.getByText("Decline / Cancel")).toBeDefined();
    });
  });

  // ============================================================================
  // 3. EQUIPMENT OWNER EXPERIENCE
  // ============================================================================
  describe("4. Equipment Owner Experience (/equipment/owner/*)", () => {
    it("renders owner dashboard with fleet list, availability controls, and pending requests", async () => {
      vi.mocked(requireAnyRole).mockResolvedValue(mockOwnerSession);

      vi.mocked(getOwnerEquipment).mockResolvedValue([mockEquipment]);
      vi.mocked(getOwnerRentals).mockResolvedValue([mockRental]);

      const element = await EquipmentOwnerDashboardPage();
      render(element);

      expect(screen.getByText("Equipment Owner Console")).toBeDefined();
      expect(screen.getByText(/Pending Rental Requests \(1\)/)).toBeDefined();
      expect(screen.getByText("Review Request")).toBeDefined();
      expect(screen.getByText(/My Machinery Fleet \(1\)/)).toBeDefined();
      expect(screen.getByText("Available")).toBeDefined();
    });

    it("renders new equipment form page for authorized equipment owner", async () => {
      vi.mocked(requireAnyRole).mockResolvedValue(mockOwnerSession);

      const element = await NewEquipmentPage();
      render(element);

      expect(screen.getByText("List Machinery for Rental")).toBeDefined();
      expect(screen.getByText("Publish Equipment Listing")).toBeDefined();
    });

    it("renders equipment edit/manage page for authorized owner", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockOwnerSession);

      vi.mocked(getEquipmentById).mockResolvedValue(mockEquipment);

      const element = await ManageEquipmentPage({
        params: Promise.resolve({ equipmentId: "eq-101" }),
      });

      render(element);

      expect(screen.getByText("Manage Massey Ferguson 375 4WD Tractor")).toBeDefined();
      expect(screen.getByText("Save Changes")).toBeDefined();
    });

    it("renders rental request agreement detail and owner lifecycle transition buttons", async () => {
      vi.mocked(requireAuth).mockResolvedValue(mockOwnerSession);

      vi.mocked(getRentalById).mockResolvedValue(mockRental);

      const element = await OwnerRentalDetailPage({
        params: Promise.resolve({ rentalId: "rent-202" }),
      });

      render(element);

      expect(screen.getByText(/RENTAL AGREEMENT #rent-202/)).toBeDefined();
      expect(screen.getByText("Approve Rental Request")).toBeDefined();
      expect(screen.getByText("Decline / Cancel")).toBeDefined();
      expect(screen.getByText("Renter Coordination Details")).toBeDefined();
      expect(screen.getByText("Test Renter Farmer")).toBeDefined();
      expect(screen.getByText("+2348011223344")).toBeDefined();
    });
  });
});
