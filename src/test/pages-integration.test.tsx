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
  usePathname: () => "/jobs",
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

// Mock Queries
vi.mock("@/features/jobs/queries", () => ({
  getJobs: vi.fn(),
  getJobById: vi.fn(),
  getEmployerJobs: vi.fn(),
  getJobApplications: vi.fn(),
  getMyApplications: vi.fn(),
}));

vi.mock("@/features/services/queries", () => ({
  getServices: vi.fn(),
  getServiceById: vi.fn(),
  getProviderServices: vi.fn(),
  getProviderServiceRequests: vi.fn(),
  getClientServiceRequests: vi.fn(),
  getServiceRequestById: vi.fn(),
}));

vi.mock("@/features/reviews/queries", () => ({
  getServiceReviews: vi.fn(),
  getMyReviews: vi.fn(),
  getReviewStats: vi.fn(),
}));

// Import page components to test
import JobsPage from "@/app/jobs/page";
import JobDetailPage from "@/app/jobs/[jobId]/page";
import ServicesPage from "@/app/services/page";
import ServiceDetailPage from "@/app/services/[serviceId]/page";
import AccountApplicationsPage from "@/app/account/applications/page";
import AccountServiceRequestsPage from "@/app/account/service-requests/page";
import AccountReviewsPage from "@/app/account/reviews/page";
import FarmerJobsPage from "@/app/farmer/jobs/page";
import FarmerJobDetailPage from "@/app/farmer/jobs/[jobId]/page";
import ServiceProviderDashboardPage from "@/app/services/provider/page";
import ProviderRequestDetailPage from "@/app/services/provider/requests/[requestId]/page";

// Import types and helpers
import { getCurrentUser, requireAuth, requireAnyRole } from "@/lib/auth/server";
import {
  getJobs,
  getJobById,
  getEmployerJobs,
  getMyApplications,
} from "@/features/jobs/queries";
import {
  getServices,
  getServiceById,
  getProviderServices,
  getProviderServiceRequests,
  getClientServiceRequests,
  getServiceRequestById,
} from "@/features/services/queries";
import { getServiceReviews, getMyReviews } from "@/features/reviews/queries";
import { JobListing } from "@/features/jobs/types";
import { ServiceListing } from "@/features/services/types";

describe("Phase 1.2 — Step 5C: App Router Pages Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. PUBLIC JOB PAGES
  // ============================================================================
  describe("1. Public Jobs Discovery (/jobs)", () => {
    const mockJob: JobListing = {
      id: "job-101",
      employerId: "emp-1",
      title: "Senior Cocoa Plantation Manager",
      description: "Manage 100 hectares of cocoa production in Ondo.",
      category: "FARM_MANAGER",
      state: "Ondo",
      lga: "Idanre",
      locationDetails: "Idanre Cocoa Cluster",
      employmentType: "FULL_TIME",
      compensationType: "MONTHLY",
      compensationAmount: 300000,
      currency: "NGN",
      requirements: "5+ years experience in cocoa farm management.",
      deadline: "2026-12-31T00:00:00Z",
      status: "ACTIVE",
      createdAt: "2026-09-20T08:00:00Z",
      updatedAt: "2026-09-20T08:00:00Z",
      employer: {
        id: "emp-1",
        fullName: "Ondo Cocoa Farms Ltd",
        avatarUrl: null,
        isVerified: true,
        state: "Ondo",
        lga: "Idanre",
      },
    };

    it("renders public jobs page with filters and job listing card without requiring authentication", async () => {
      vi.mocked(getJobs).mockResolvedValue({
        jobs: [mockJob],
        totalCount: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
      });

      const element = await JobsPage({
        searchParams: Promise.resolve({}),
      });

      render(element);

      expect(screen.getByText("Agricultural Jobs & Labor")).toBeDefined();
      expect(screen.getByText("Senior Cocoa Plantation Manager")).toBeDefined();
      expect(screen.getByText("Ondo Cocoa Farms Ltd")).toBeDefined();
      expect(screen.getByText(/300,000/)).toBeDefined();
    });

    it("renders empty state gracefully when no jobs match search criteria", async () => {
      vi.mocked(getJobs).mockResolvedValue({
        jobs: [],
        totalCount: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
      });

      const element = await JobsPage({
        searchParams: Promise.resolve({ search: "Nonexistent" }),
      });

      render(element);

      expect(screen.getByText("No jobs found")).toBeDefined();
      expect(screen.getByText("Reset All Filters")).toBeDefined();
    });
  });

  describe("2. Public Job Detail (/jobs/[jobId])", () => {
    const mockJob: JobListing = {
      id: "job-102",
      employerId: "emp-2",
      title: "Commercial Agronomist Specialist",
      description: "Soil testing and yield advisory.",
      category: "AGRONOMIST",
      state: "Oyo",
      lga: "Ibadan",
      locationDetails: "Private research farm gate",
      employmentType: "FULL_TIME",
      compensationType: "MONTHLY",
      compensationAmount: 250000,
      currency: "NGN",
      requirements: "B.Sc in Agronomy or Soil Science.",
      deadline: "2026-11-30T00:00:00Z",
      status: "ACTIVE",
      createdAt: "2026-09-20T08:00:00Z",
      updatedAt: "2026-09-20T08:00:00Z",
      employer: {
        id: "emp-2",
        fullName: "Premier Agro Research",
        avatarUrl: null,
        isVerified: true,
        state: "Oyo",
        lga: "Ibadan",
      },
    };

    it("displays anonymous login/register CTA when unauthenticated user views job detail", async () => {
      vi.mocked(getJobById).mockResolvedValue(mockJob);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const element = await JobDetailPage({
        params: Promise.resolve({ jobId: "job-102" }),
      });

      render(element);

      expect(screen.getByText("Commercial Agronomist Specialist")).toBeDefined();
      expect(screen.getByText("Sign In to Apply")).toBeDefined();
      expect(screen.getByText("Log In to Apply")).toBeDefined();
      // Application form should not be rendered for anonymous visitors
      expect(screen.queryByText("Submit Application")).toBeNull();
      // Private address details should not be exposed
      expect(screen.queryByText("Private research farm gate")).toBeNull();
    });

    it("renders JobApplicationForm for authenticated eligible applicant", async () => {
      vi.mocked(getJobById).mockResolvedValue(mockJob);
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "applicant-user-1",
        email: "applicant@example.com",
        phone: "+2348011111111",
        fullName: "Chinedu Eze",
        state: "Oyo",
        lga: "Ibadan",
        roles: ["JOB_SEEKER"],
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });

      const element = await JobDetailPage({
        params: Promise.resolve({ jobId: "job-102" }),
      });

      render(element);

      expect(screen.getAllByText("Apply for this Position").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByLabelText(/Cover Note/i)).toBeDefined();
      expect(screen.getByText("Submit Application")).toBeDefined();
    });

    it("prevents employer from applying to their own job listing", async () => {
      vi.mocked(getJobById).mockResolvedValue(mockJob);
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "emp-2", // Matches employerId
        email: "employer@example.com",
        phone: "+2348022222222",
        fullName: "Premier Agro Research",
        state: "Oyo",
        lga: "Ibadan",
        roles: ["FARMER"],
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });

      const element = await JobDetailPage({
        params: Promise.resolve({ jobId: "job-102" }),
      });

      render(element);

      expect(screen.getByText("You are the employer for this job")).toBeDefined();
      expect(screen.getByText("Manage Job Applicants")).toBeDefined();
      expect(screen.queryByText("Apply for this Position")).toBeNull();
    });
  });

  // ============================================================================
  // 2. PUBLIC SERVICE PAGES
  // ============================================================================
  describe("3. Public Service Discovery (/services)", () => {
    const mockService: ServiceListing = {
      id: "service-101",
      providerId: "prov-1",
      title: "Commercial Drone Spraying Service",
      description: "Aerial herbicide and pesticide spraying.",
      serviceCategory: "DRONE_SPRAYING",
      coverageStates: ["Oyo", "Ogun"],
      pricingModel: "PER_HECTARE",
      baseRate: 7500,
      currency: "NGN",
      isAvailable: true,
      createdAt: "2026-09-20T08:00:00Z",
      updatedAt: "2026-09-20T08:00:00Z",
      provider: {
        id: "prov-1",
        fullName: "AeroCrop Solutions",
        avatarUrl: null,
        isVerified: true,
        state: "Oyo",
        lga: "Ibadan",
      },
    };

    it("renders public service discovery page without authentication lock", async () => {
      vi.mocked(getServices).mockResolvedValue({
        services: [mockService],
        totalCount: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
      });

      const element = await ServicesPage({
        searchParams: Promise.resolve({}),
      });

      render(element);

      expect(screen.getByText("Agricultural Services Directory")).toBeDefined();
      expect(screen.getByText("Commercial Drone Spraying Service")).toBeDefined();
      expect(screen.getByText("AeroCrop Solutions")).toBeDefined();
      expect(screen.getByText(/7,500/)).toBeDefined();
    });
  });

  describe("4. Public Service Detail (/services/[serviceId])", () => {
    const mockService: ServiceListing = {
      id: "service-102",
      providerId: "prov-2",
      title: "75HP Mechanized Tractor Ploughing",
      description: "Heavy land preparation and harrowing.",
      serviceCategory: "TRACTOR_OPERATOR",
      coverageStates: ["Oyo", "Osun"],
      pricingModel: "PER_HECTARE",
      baseRate: 35000,
      currency: "NGN",
      isAvailable: true,
      createdAt: "2026-09-20T08:00:00Z",
      updatedAt: "2026-09-20T08:00:00Z",
      provider: {
        id: "prov-2",
        fullName: "TractorLink Services",
        avatarUrl: null,
        isVerified: true,
        state: "Oyo",
        lga: "Oyo Town",
      },
    };

    it("displays login CTA for anonymous users and hides booking form", async () => {
      vi.mocked(getServiceById).mockResolvedValue(mockService);
      vi.mocked(getCurrentUser).mockResolvedValue(null);
      vi.mocked(getServiceReviews).mockResolvedValue({
        reviews: [],
        totalCount: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        stats: {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      });

      const element = await ServiceDetailPage({
        params: Promise.resolve({ serviceId: "service-102" }),
      });

      render(element);

      expect(screen.getByText("75HP Mechanized Tractor Ploughing")).toBeDefined();
      expect(screen.getByText("Sign In to Request Service")).toBeDefined();
      expect(screen.queryByText("Submit Service Request")).toBeNull();
    });

    it("renders ServiceRequestForm for authenticated eligible client", async () => {
      vi.mocked(getServiceById).mockResolvedValue(mockService);
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "client-1",
        email: "client@example.com",
        phone: "+2348033333333",
        fullName: "Farmer Ibrahim",
        state: "Oyo",
        lga: "Iseyin",
        roles: ["FARMER"],
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });
      vi.mocked(getServiceReviews).mockResolvedValue({
        reviews: [],
        totalCount: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const element = await ServiceDetailPage({
        params: Promise.resolve({ serviceId: "service-102" }),
      });

      render(element);

      expect(screen.getByText("Book / Request Service")).toBeDefined();
      expect(screen.getByText("Submit Service Request")).toBeDefined();
      expect(screen.getByText(/Privacy Protection Guaranteed:/)).toBeDefined();
    });

    it("prevents provider from booking their own service listing", async () => {
      vi.mocked(getServiceById).mockResolvedValue(mockService);
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: "prov-2", // Matches providerId
        email: "provider@example.com",
        phone: "+2348044444444",
        fullName: "TractorLink Services",
        state: "Oyo",
        lga: "Oyo Town",
        roles: ["SERVICE_PROVIDER"],
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });
      vi.mocked(getServiceReviews).mockResolvedValue({
        reviews: [],
        totalCount: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const element = await ServiceDetailPage({
        params: Promise.resolve({ serviceId: "service-102" }),
      });

      render(element);

      expect(screen.getByText("You are the provider for this service")).toBeDefined();
      expect(screen.getByText("Edit Service Listing")).toBeDefined();
      expect(screen.queryByText("Submit Service Request")).toBeNull();
    });
  });

  // ============================================================================
  // 3. ACCOUNT PORTAL PAGES
  // ============================================================================
  describe("5. Account Applications (/account/applications)", () => {
    it("renders user's submitted job applications", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: "applicant-1",
        email: "app@example.com",
        phone: null,
        fullName: "Aisha Bello",
        state: "Kaduna",
        lga: "Zaria",
        roles: ["JOB_SEEKER"],
        isEmailVerified: true,
        isPhoneVerified: false,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });

      vi.mocked(getMyApplications).mockResolvedValue([
        {
          id: "app-row-1",
          jobId: "job-101",
          applicantId: "applicant-1",
          coverNote: "Experienced cocoa harvester.",
          resumeUrl: null,
          status: "SHORTLISTED",
          reviewedAt: "2026-09-22T00:00:00Z",
          createdAt: "2026-09-21T00:00:00Z",
          updatedAt: "2026-09-22T00:00:00Z",
          job: {
            id: "job-101",
            title: "Cocoa Harvester",
            category: "HARVEST_CREW",
            employerId: "emp-1",
            state: "Ondo",
            lga: "Idanre",
            status: "ACTIVE",
          },
        },
      ]);

      const element = await AccountApplicationsPage();
      render(element);

      expect(screen.getByText("My Job Applications")).toBeDefined();
      expect(screen.getByText("Cocoa Harvester")).toBeDefined();
      expect(screen.getByText("Shortlisted")).toBeDefined();
      expect(screen.getByText("Experienced cocoa harvester.")).toBeDefined();
    });
  });

  describe("6. Account Service Requests (/account/service-requests)", () => {
    it("renders user's service bookings with confidential address and lifecycle controls", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: "client-1",
        email: "client@example.com",
        phone: null,
        fullName: "Babatunde Lawal",
        state: "Ogun",
        lga: "Abeokuta",
        roles: ["BUYER"],
        isEmailVerified: true,
        isPhoneVerified: false,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });

      vi.mocked(getClientServiceRequests).mockResolvedValue([
        {
          id: "req-1",
          serviceId: "serv-1",
          clientId: "client-1",
          providerId: "prov-1",
          details: "Spray 20 hectares of cassava.",
          state: "Ogun",
          lga: "Abeokuta North",
          locationAddress: "Farm KM 15 Old Abeokuta Road",
          proposedDate: "2026-10-15T00:00:00Z",
          quotedAmount: 150000,
          currency: "NGN",
          status: "QUOTED",
          createdAt: "2026-09-21T00:00:00Z",
          updatedAt: "2026-09-22T00:00:00Z",
          service: {
            id: "serv-1",
            title: "Drone Crop Spraying",
            serviceCategory: "DRONE_SPRAYING",
            pricingModel: "PER_HECTARE",
          },
          provider: {
            id: "prov-1",
            fullName: "AeroAgro Services",
            avatarUrl: null,
            isVerified: true,
            state: "Ogun",
            lga: "Abeokuta",
          },
        },
      ]);

      const element = await AccountServiceRequestsPage();
      render(element);

      expect(screen.getByText("My Service Requests")).toBeDefined();
      expect(screen.getByText("Drone Crop Spraying")).toBeDefined();
      expect(screen.getByText("Farm KM 15 Old Abeokuta Road")).toBeDefined();
      expect(screen.getByText(/Accept Quote/)).toBeDefined();
    });
  });

  describe("7. Account Reviews (/account/reviews)", () => {
    it("renders user's submitted reviews", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: "author-1",
        email: "author@example.com",
        phone: null,
        fullName: "Kolawole Sanusi",
        state: "Lagos",
        lga: "Ikeja",
        roles: ["BUYER"],
        isEmailVerified: true,
        isPhoneVerified: false,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });

      vi.mocked(getMyReviews).mockResolvedValue({
        reviews: [
          {
            id: "rev-1",
            authorId: "author-1",
            targetType: "SERVICE",
            serviceId: "serv-1",
            orderId: null,
            listingId: null,
            sellerId: null,
            equipmentId: null,
            rating: 5,
            comment: "Exceptional drone spraying work.",
            isVerifiedTransaction: true,
            createdAt: "2026-09-22T00:00:00Z",
            updatedAt: "2026-09-22T00:00:00Z",
          },
        ],
        totalCount: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      const element = await AccountReviewsPage();
      render(element);

      expect(screen.getByText("My Submitted Reviews")).toBeDefined();
      expect(screen.getByText("Exceptional drone spraying work.")).toBeDefined();
      expect(screen.getByText("Verified Transaction")).toBeDefined();
      expect(screen.getByText("5/5")).toBeDefined();
    });
  });

  // ============================================================================
  // 4. EMPLOYER MANAGEMENT PAGES
  // ============================================================================
  describe("8. Employer Management (/farmer/jobs)", () => {
    it("renders farmer's active jobs list with applicant counts", async () => {
      vi.mocked(requireAnyRole).mockResolvedValue({
        id: "farmer-1",
        email: "farmer@example.com",
        phone: "+2348055555555",
        fullName: "Ojo Farming Enterprises",
        state: "Oyo",
        lga: "Oyo",
        roles: ["FARMER"],
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });

      vi.mocked(getEmployerJobs).mockResolvedValue([
        {
          id: "job-201",
          employerId: "farmer-1",
          title: "Seasonal Maize Harvester Crew",
          description: "Harvesting team needed.",
          category: "HARVEST_CREW",
          state: "Oyo",
          lga: "Oyo",
          locationDetails: null,
          employmentType: "SEASONAL",
          compensationType: "DAILY",
          compensationAmount: 5000,
          currency: "NGN",
          requirements: null,
          deadline: null,
          status: "ACTIVE",
          createdAt: "2026-09-21T00:00:00Z",
          updatedAt: "2026-09-21T00:00:00Z",
          applicationsCount: 4,
        },
      ]);

      const element = await FarmerJobsPage();
      render(element);

      expect(screen.getByText("Seasonal Maize Harvester Crew")).toBeDefined();
      expect(screen.getByText("4 candidates")).toBeDefined();
      expect(screen.getByText("Post New Job Opening")).toBeDefined();
    });

    it("throws ForbiddenError when farmer tries to manage another employer's job", async () => {
      vi.mocked(requireAnyRole).mockResolvedValue({
        id: "farmer-1",
        email: "farmer1@example.com",
        phone: null,
        fullName: "Farmer One",
        state: "Oyo",
        lga: "Oyo",
        roles: ["FARMER"],
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });

      vi.mocked(getJobById).mockResolvedValue({
        id: "job-202",
        employerId: "different-farmer-2", // Non-owner
        title: "Tractor Driver",
        description: "Operate tractor.",
        category: "MACHINE_OPERATOR",
        state: "Oyo",
        lga: "Oyo",
        locationDetails: null,
        employmentType: "CONTRACT",
        compensationType: "DAILY",
        compensationAmount: 8000,
        currency: "NGN",
        requirements: null,
        deadline: null,
        status: "ACTIVE",
        createdAt: "2026-09-21T00:00:00Z",
        updatedAt: "2026-09-21T00:00:00Z",
      });

      await expect(
        FarmerJobDetailPage({ params: Promise.resolve({ jobId: "job-202" }) })
      ).rejects.toThrow("Unauthorized. You can only manage your own farm job openings.");
    });
  });

  // ============================================================================
  // 5. SERVICE PROVIDER MANAGEMENT PAGES
  // ============================================================================
  describe("9. Provider Console (/services/provider)", () => {
    it("renders provider console with offerings and incoming requests", async () => {
      vi.mocked(requireAnyRole).mockResolvedValue({
        id: "prov-1",
        email: "provider@example.com",
        phone: "+2348066666666",
        fullName: "AgriTech Sprayers",
        state: "Ogun",
        lga: "Abeokuta",
        roles: ["SERVICE_PROVIDER"],
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });

      vi.mocked(getProviderServices).mockResolvedValue([
        {
          id: "serv-1",
          providerId: "prov-1",
          title: "Precision Drone Aerial Spraying",
          description: "High speed aerial application.",
          serviceCategory: "DRONE_SPRAYING",
          coverageStates: ["Ogun", "Oyo"],
          pricingModel: "PER_HECTARE",
          baseRate: 8000,
          currency: "NGN",
          isAvailable: true,
          createdAt: "2026-09-20T00:00:00Z",
          updatedAt: "2026-09-20T00:00:00Z",
          requestsCount: 2,
        },
      ]);

      vi.mocked(getProviderServiceRequests).mockResolvedValue([
        {
          id: "req-1",
          serviceId: "serv-1",
          clientId: "client-1",
          providerId: "prov-1",
          details: "Pest outbreak on 15 hectares.",
          state: "Ogun",
          lga: "Obafemi Owode",
          locationAddress: "Behind sawmill",
          proposedDate: "2026-10-01T00:00:00Z",
          quotedAmount: null,
          currency: "NGN",
          status: "PENDING",
          createdAt: "2026-09-22T00:00:00Z",
          updatedAt: "2026-09-22T00:00:00Z",
          client: {
            id: "client-1",
            fullName: "Chief Adeleke",
            avatarUrl: null,
            phone: "+2348077777777",
          },
        },
      ]);

      const element = await ServiceProviderDashboardPage();
      render(element);

      expect(screen.getByText("Agricultural Services & Bookings")).toBeDefined();
      expect(screen.getByText("Precision Drone Aerial Spraying")).toBeDefined();
      expect(screen.getByText("Incoming Client Requests (1)")).toBeDefined();
      expect(screen.getByText("Manage Request & Quote")).toBeDefined();
    });

    it("throws ForbiddenError when non-assigned provider tries to access request detail", async () => {
      vi.mocked(requireAnyRole).mockResolvedValue({
        id: "prov-1",
        email: "provider1@example.com",
        phone: null,
        fullName: "Provider One",
        state: "Ogun",
        lga: "Abeokuta",
        roles: ["SERVICE_PROVIDER"],
        isEmailVerified: true,
        isPhoneVerified: true,
        isVerified: true,
        isOnboarded: true,
        createdAt: "2026-09-01T00:00:00Z",
      });

      vi.mocked(getServiceRequestById).mockResolvedValue({
        id: "req-999",
        serviceId: "serv-999",
        clientId: "client-1",
        providerId: "different-prov-2", // Non-assigned provider
        details: "Land clearing.",
        state: "Ogun",
        lga: "Abeokuta",
        locationAddress: "Secret farm plot",
        proposedDate: "2026-10-01T00:00:00Z",
        quotedAmount: null,
        currency: "NGN",
        status: "PENDING",
        createdAt: "2026-09-22T00:00:00Z",
        updatedAt: "2026-09-22T00:00:00Z",
      });

      await expect(
        ProviderRequestDetailPage({ params: Promise.resolve({ requestId: "req-999" }) })
      ).rejects.toThrow("Unauthorized. You can only view booking requests assigned to your provider profile.");
    });
  });
});
