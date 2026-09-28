// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Jobs components
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { JobCard } from "@/features/jobs/components/job-card";
import { JobListing, JobStatus } from "@/features/jobs/types";

// Services components
import { ServiceRequestStatusBadge } from "@/features/services/components/service-request-status-badge";
import { ServiceCard } from "@/features/services/components/service-card";
import { ServiceRequestLifecycleControls } from "@/features/services/components/service-request-lifecycle-controls";
import { ServiceRequestForm } from "@/features/services/components/service-request-form";
import { ServiceListing, ServiceRequestStatus } from "@/features/services/types";

// Reviews components
import { ReviewSummary } from "@/features/reviews/components/review-summary";
import { ReviewList } from "@/features/reviews/components/review-list";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { Review, ReviewStats } from "@/features/reviews/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/services",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Phase 1.2 — Step 5B: Shared Frontend Components", () => {
  // ==========================================================================
  // 1. JOBS COMPONENTS
  // ==========================================================================
  describe("1. JobStatusBadge", () => {
    const statuses: JobStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "CLOSED"];

    it.each(statuses)("renders the correct label for status: %s", (status) => {
      const { unmount } = render(<JobStatusBadge status={status} />);
      const badge = screen.getByText(new RegExp(status, "i"));
      expect(badge).toBeDefined();
      unmount();
    });
  });

  describe("2. JobCard", () => {
    const mockJob: JobListing = {
      id: "job-uuid-1",
      employerId: "employer-uuid-1",
      title: "Cassava Harvester Operator Needed",
      description: "Operate mechanized harvester across 50 hectares in Oyo.",
      category: "MACHINE_OPERATOR",
      state: "Oyo",
      lga: "Iseyin",
      locationDetails: "Behind farm gate 3",
      employmentType: "CONTRACT",
      compensationType: "DAILY",
      compensationAmount: 25000,
      currency: "NGN",
      requirements: "Minimum 2 years experience with tractor attachments.",
      deadline: "2026-11-30T00:00:00Z",
      status: "ACTIVE",
      createdAt: "2026-09-20T10:00:00Z",
      updatedAt: "2026-09-20T10:00:00Z",
      employer: {
        id: "employer-uuid-1",
        fullName: "Adebayo Farms Ltd",
        avatarUrl: null,
        isVerified: true,
        state: "Oyo",
        lga: "Iseyin",
      },
    };

    it("renders job title, category, employment type, location, and compensation", () => {
      render(<JobCard job={mockJob} />);

      expect(screen.getByText("Cassava Harvester Operator Needed")).toBeDefined();
      expect(screen.getByText("Tractor & Machinery Operator")).toBeDefined();
      expect(screen.getByText("Contract")).toBeDefined();
      expect(screen.getByText(/Iseyin/)).toBeDefined();
      expect(screen.getByText("Adebayo Farms Ltd")).toBeDefined();
      expect(screen.getByLabelText("Verified Employer")).toBeDefined();
      expect(screen.getByText(/25,000/)).toBeDefined();
    });

    it("does NOT render private employer information (phone, email, private address)", () => {
      render(<JobCard job={mockJob} />);

      // Verify no phone, email, or exact address leaking
      expect(screen.queryByText(/@/)).toBeNull();
      expect(screen.queryByText(/\+234/)).toBeNull();
      expect(screen.queryByText("Behind farm gate 3")).toBeNull();
    });
  });

  // ==========================================================================
  // 2. SERVICES COMPONENTS
  // ==========================================================================
  describe("3. ServiceRequestStatusBadge", () => {
    const statuses: ServiceRequestStatus[] = [
      "PENDING",
      "QUOTED",
      "ACCEPTED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "DISPUTED",
    ];

    it.each(statuses)("renders the correct label for service request status: %s", (status) => {
      const { unmount } = render(<ServiceRequestStatusBadge status={status} />);
      const badge = screen.getByRole("generic", { name: new RegExp(`Status:`, "i") });
      expect(badge).toBeDefined();
      unmount();
    });
  });

  describe("4. ServiceCard", () => {
    const mockService: ServiceListing = {
      id: "service-uuid-1",
      providerId: "provider-uuid-1",
      title: "Commercial Drone Pesticide & Fertilizer Spraying",
      description: "High-precision DJI Agras T40 aerial application across South-West Nigeria.",
      serviceCategory: "DRONE_SPRAYING",
      coverageStates: ["Oyo", "Ogun", "Osun"],
      pricingModel: "PER_HECTARE",
      baseRate: 8500,
      currency: "NGN",
      isAvailable: true,
      createdAt: "2026-09-20T10:00:00Z",
      updatedAt: "2026-09-20T10:00:00Z",
      provider: {
        id: "provider-uuid-1",
        fullName: "AgriDrone Solutions Nigeria",
        avatarUrl: null,
        isVerified: true,
        state: "Oyo",
        lga: "Ibadan North",
      },
    };

    it("renders service title, category, coverage states, pricing, and safe provider profile", () => {
      render(<ServiceCard service={mockService} />);

      expect(screen.getByText("Commercial Drone Pesticide & Fertilizer Spraying")).toBeDefined();
      expect(screen.getByText("Drone Spraying & Aerial Survey")).toBeDefined();
      expect(screen.getByText("Available")).toBeDefined();
      expect(screen.getByText("AgriDrone Solutions Nigeria")).toBeDefined();
      expect(screen.getByLabelText("Verified Provider")).toBeDefined();
      expect(screen.getAllByText("Oyo").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Ogun")).toBeDefined();
      expect(screen.getByText("Osun")).toBeDefined();
      expect(screen.getByText(/8,500/)).toBeDefined();
      expect(screen.getByText("/ hectare")).toBeDefined();
    });

    it("does NOT render private fields (phone, email, residential address, exact coordinates)", () => {
      render(<ServiceCard service={mockService} />);

      expect(screen.queryByText(/@/)).toBeNull();
      expect(screen.queryByText(/\+234/)).toBeNull();
      expect(screen.queryByText(/street/i)).toBeNull();
    });
  });

  describe("5. ServiceRequestLifecycleControls", () => {
    it("renders 'Provide Quote' and 'Cancel Request' for PROVIDER on PENDING request", () => {
      render(
        <ServiceRequestLifecycleControls
          requestId="req-1"
          currentStatus="PENDING"
          userRole="PROVIDER"
        />
      );

      expect(screen.getByText("Provide Quote")).toBeDefined();
      expect(screen.getByText("Cancel Request")).toBeDefined();
    });

    it("does NOT render 'Provide Quote' for CLIENT on PENDING request", () => {
      render(
        <ServiceRequestLifecycleControls
          requestId="req-1"
          currentStatus="PENDING"
          userRole="CLIENT"
        />
      );

      expect(screen.queryByText("Provide Quote")).toBeNull();
      expect(screen.getByText("Cancel Request")).toBeDefined();
    });

    it("renders 'Accept Quote' for CLIENT on QUOTED request", () => {
      render(
        <ServiceRequestLifecycleControls
          requestId="req-1"
          currentStatus="QUOTED"
          userRole="CLIENT"
          quotedAmount={45000}
        />
      );

      expect(screen.getByText(/Accept Quote/)).toBeDefined();
      expect(screen.getByText("Cancel Request")).toBeDefined();
    });

    it("renders 'Start Service' for PROVIDER on ACCEPTED request", () => {
      render(
        <ServiceRequestLifecycleControls
          requestId="req-1"
          currentStatus="ACCEPTED"
          userRole="PROVIDER"
        />
      );

      expect(screen.getByText("Start Service")).toBeDefined();
      expect(screen.getByText("Cancel Request")).toBeDefined();
    });

    it("does NOT render 'Start Service' for CLIENT on ACCEPTED request", () => {
      render(
        <ServiceRequestLifecycleControls
          requestId="req-1"
          currentStatus="ACCEPTED"
          userRole="CLIENT"
        />
      );

      expect(screen.queryByText("Start Service")).toBeNull();
    });

    it("renders 'Mark Service as Completed' and 'Raise Dispute' in IN_PROGRESS", () => {
      render(
        <ServiceRequestLifecycleControls
          requestId="req-1"
          currentStatus="IN_PROGRESS"
          userRole="PROVIDER"
        />
      );

      expect(screen.getByText("Mark Service as Completed")).toBeDefined();
      expect(screen.getByText("Raise Dispute")).toBeDefined();
    });

    it("renders 'Write a Review' for CLIENT on COMPLETED request", () => {
      const onWriteReviewMock = vi.fn();
      render(
        <ServiceRequestLifecycleControls
          requestId="req-1"
          serviceId="serv-1"
          currentStatus="COMPLETED"
          userRole="CLIENT"
          onWriteReview={onWriteReviewMock}
        />
      );

      const reviewBtn = screen.getByText("Write a Review");
      expect(reviewBtn).toBeDefined();
      fireEvent.click(reviewBtn);
      expect(onWriteReviewMock).toHaveBeenCalledTimes(1);
    });

    it("renders administrative dispute resolution for ADMIN on DISPUTED request", () => {
      render(
        <ServiceRequestLifecycleControls
          requestId="req-1"
          currentStatus="DISPUTED"
          userRole="ADMIN"
        />
      );

      expect(screen.getByText("Resolve as Completed")).toBeDefined();
      expect(screen.getByText("Resolve as Cancelled")).toBeDefined();
    });
  });

  describe("6. ServiceRequestForm", () => {
    it("renders the form with required inputs and explicit privacy protection notice", () => {
      render(
        <ServiceRequestForm
          serviceId="serv-1"
          serviceTitle="Soil Testing & Analysis"
          providerName="AgroLab Nigeria"
        />
      );

      expect(screen.getByText("Book / Request Service")).toBeDefined();
      expect(screen.getByText(/Soil Testing & Analysis/)).toBeDefined();
      expect(screen.getByText(/AgroLab Nigeria/)).toBeDefined();
      expect(screen.getByLabelText(/Service Requirements/)).toBeDefined();
      expect(screen.getByLabelText(/Proposed Service Date/)).toBeDefined();
      expect(screen.getByLabelText(/^State/)).toBeDefined();
      expect(screen.getByLabelText(/Local Government Area/)).toBeDefined();
      expect(screen.getByLabelText(/Exact Farm \/ Site Address/)).toBeDefined();

      // Check Privacy Protection Notice
      expect(
        screen.getByText(/Privacy Protection Guaranteed:/)
      ).toBeDefined();
      expect(
        screen.getByText(/Your exact site address is kept strictly confidential/i)
      ).toBeDefined();
    });

    it("validates empty required fields on submission without network call", () => {
      render(
        <ServiceRequestForm
          serviceId="serv-1"
          serviceTitle="Soil Testing & Analysis"
        />
      );

      const submitBtn = screen.getByText("Submit Service Request");
      fireEvent.click(submitBtn);

      expect(
        screen.getByText("Please provide at least 10 characters describing the required service.")
      ).toBeDefined();
      expect(screen.getByText("State of operation is required.")).toBeDefined();
      expect(screen.getByText("Local Government Area (LGA) is required.")).toBeDefined();
      expect(screen.getByText("Detailed farm or site address is required.")).toBeDefined();
      expect(screen.getByText("Proposed service date is required.")).toBeDefined();
    });
  });

  // ==========================================================================
  // 3. REVIEWS COMPONENTS
  // ==========================================================================
  describe("7. ReviewSummary", () => {
    it("renders empty state gracefully when no reviews exist", () => {
      render(<ReviewSummary stats={null} />);

      expect(screen.getByText("No reviews yet")).toBeDefined();
      expect(
        screen.getByText(/Ratings and feedback from verified clients and buyers will appear here/i)
      ).toBeDefined();
    });

    it("renders average rating, total count, and 1-5 star distribution when stats exist", () => {
      const stats: ReviewStats = {
        averageRating: 4.6,
        totalReviews: 10,
        ratingDistribution: {
          5: 7,
          4: 2,
          3: 1,
          2: 0,
          1: 0,
        },
      };

      render(<ReviewSummary stats={stats} />);

      expect(screen.getByText("4.6")).toBeDefined();
      expect(screen.getByText("Based on 10 reviews")).toBeDefined();
      expect(screen.getByLabelText("5 star reviews: 7 (70%)")).toBeDefined();
      expect(screen.getByLabelText("4 star reviews: 2 (20%)")).toBeDefined();
      expect(screen.getByLabelText("3 star reviews: 1 (10%)")).toBeDefined();
      expect(screen.getByLabelText("2 star reviews: 0 (0%)")).toBeDefined();
      expect(screen.getByLabelText("1 star reviews: 0 (0%)")).toBeDefined();
    });
  });

  describe("8. ReviewList", () => {
    it("renders empty state gracefully when reviews array is empty", () => {
      render(<ReviewList reviews={[]} />);

      expect(screen.getByText("No Reviews Found")).toBeDefined();
      expect(screen.getByText("No reviews yet. Be the first to share your experience!")).toBeDefined();
    });

    it("renders reviews with stars, comments, dates, and verified transaction badge", () => {
      const mockReviews: Review[] = [
        {
          id: "rev-1",
          authorId: "user-1",
          targetType: "SERVICE",
          serviceId: "serv-1",
          orderId: null,
          listingId: null,
          sellerId: null,
          equipmentId: null,
          rating: 5,
          comment: "Punctual drone operator! Covered all 15 hectares within 3 hours. Excellent coverage.",
          isVerifiedTransaction: true,
          createdAt: "2026-09-22T14:30:00Z",
          updatedAt: "2026-09-22T14:30:00Z",
          author: {
            id: "user-1",
            fullName: "Chief Olumide",
            avatarUrl: null,
            isVerified: true,
            state: "Oyo",
            lga: "Ibarapa",
          },
        },
      ];

      render(<ReviewList reviews={mockReviews} totalCount={1} />);

      expect(screen.getByText("Chief Olumide")).toBeDefined();
      expect(screen.getByText("Verified")).toBeDefined();
      expect(screen.getByText("Ibarapa, Oyo")).toBeDefined();
      expect(screen.getByText(/Punctual drone operator!/)).toBeDefined();
      expect(screen.getByLabelText("Rating: 5 out of 5 stars")).toBeDefined();
    });

    it("never renders author private email, phone, or private address", () => {
      const mockReviews: Review[] = [
        {
          id: "rev-2",
          authorId: "user-2",
          targetType: "SERVICE",
          serviceId: "serv-1",
          orderId: null,
          listingId: null,
          sellerId: null,
          equipmentId: null,
          rating: 4,
          comment: "Good service.",
          isVerifiedTransaction: true,
          createdAt: "2026-09-22T14:30:00Z",
          updatedAt: "2026-09-22T14:30:00Z",
          author: {
            id: "user-2",
            fullName: "Farmer John",
            avatarUrl: null,
            isVerified: false,
            state: "Kano",
            lga: null,
          },
        },
      ];

      render(<ReviewList reviews={mockReviews} />);

      expect(screen.queryByText(/@/)).toBeNull();
      expect(screen.queryByText(/\+234/)).toBeNull();
    });
  });

  describe("9. ReviewForm", () => {
    it("renders 1-5 star selector, comment textarea with char counter, and submit button", () => {
      render(
        <ReviewForm
          targetType="SERVICE"
          serviceId="serv-1"
          targetTitle="Drone Spraying Service"
        />
      );

      expect(screen.getByText("Write a Review")).toBeDefined();
      expect(screen.getByText("for Drone Spraying Service")).toBeDefined();
      expect(screen.getByRole("radiogroup", { name: "Star Rating from 1 to 5" })).toBeDefined();
      expect(screen.getByLabelText(/Feedback & Comments/)).toBeDefined();
      expect(screen.getByText("0 / 2000")).toBeDefined();
      expect(screen.getByText("Submit Review")).toBeDefined();
    });

    it("allows updating rating and tracks character count", () => {
      render(
        <ReviewForm
          targetType="SERVICE"
          serviceId="serv-1"
        />
      );

      const fourStarBtn = screen.getByRole("radio", { name: "4 stars" });
      fireEvent.click(fourStarBtn);
      expect(screen.getByText("4 / 5")).toBeDefined();

      const textarea = screen.getByRole("textbox", { name: /Feedback & Comments/i });
      fireEvent.change(textarea, { target: { value: "Great work on our maize farm." } });
      expect(screen.getByText("29 / 2000")).toBeDefined();
    });
  });
});
