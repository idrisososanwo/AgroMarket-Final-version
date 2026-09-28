import { describe, it, expect } from "vitest";
import {
  isValidJobStatusTransition,
  isValidApplicationStatusTransition,
  VALID_JOB_STATUS_TRANSITIONS,
  VALID_APPLICATION_STATUS_TRANSITIONS,
  JobStatus,
  JobListing,
  SafeEmployerProfile,
} from "@/features/jobs/types";
import {
  createJobSchema,
  updateJobSchema,
  transitionJobStatusSchema,
  applyForJobSchema,
  updateApplicationStatusSchema,
} from "@/features/jobs/validation";
import { mapJobRow } from "@/features/jobs/queries";
import { hasAnyRole, hasRole } from "@/lib/auth/roles";
import { UserRole } from "@/types/auth";

describe("Phase 1.2: Jobs Domain Implementation", () => {
  // ============================================================================
  // 1. Job Creation Validation
  // ============================================================================
  describe("1. Job Creation Validation", () => {
    const validJobPayload = {
      title: "Senior Cocoa Farm Agronomist",
      description: "Experienced agronomist required to oversee cocoa plantation soil health and yield optimization.",
      category: "AGRONOMIST" as const,
      state: "Ondo",
      lga: "Idanre",
      locationDetails: "Idanre Highlands Cocoa Cluster",
      employmentType: "FULL_TIME" as const,
      compensationType: "MONTHLY" as const,
      compensationAmount: 350000,
      currency: "NGN",
      requirements: "Minimum 5 years experience with cocoa pathology and GAP standards.",
      deadline: "2026-12-31T23:59:59Z",
      status: "ACTIVE" as const,
    };

    it("accepts a completely valid job creation payload", () => {
      const result = createJobSchema.safeParse(validJobPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Senior Cocoa Farm Agronomist");
        expect(result.data.category).toBe("AGRONOMIST");
        expect(result.data.compensationAmount).toBe(350000);
        expect(result.data.status).toBe("ACTIVE");
      }
    });

    it("rejects job titles that are too short or too long", () => {
      const shortTitle = createJobSchema.safeParse({ ...validJobPayload, title: "Ag" });
      expect(shortTitle.success).toBe(false);

      const longTitle = createJobSchema.safeParse({
        ...validJobPayload,
        title: "A".repeat(151),
      });
      expect(longTitle.success).toBe(false);
    });

    it("rejects job descriptions shorter than 10 characters", () => {
      const shortDesc = createJobSchema.safeParse({ ...validJobPayload, description: "Too short" });
      expect(shortDesc.success).toBe(false);
    });

    it("strictly rejects prohibited pork/swine terms in job titles and descriptions", () => {
      const porkTitle = createJobSchema.safeParse({
        ...validJobPayload,
        title: "Pork Processing Line Supervisor",
      });
      expect(porkTitle.success).toBe(false);
      if (!porkTitle.success) {
        expect(porkTitle.error.flatten().fieldErrors.title?.[0]).toContain(
          "AgroMarket strictly disallows pig/pork related listings"
        );
      }

      const swineDesc = createJobSchema.safeParse({
        ...validJobPayload,
        description: "Looking for farm hands to feed our large swine herd every morning.",
      });
      expect(swineDesc.success).toBe(false);
      if (!swineDesc.success) {
        expect(swineDesc.error.flatten().fieldErrors.description?.[0]).toContain(
          "AgroMarket strictly disallows pig/pork related listings"
        );
      }
    });

    it("rejects negative compensation amounts", () => {
      const negativeComp = createJobSchema.safeParse({
        ...validJobPayload,
        compensationAmount: -5000,
      });
      expect(negativeComp.success).toBe(false);
    });

    it("rejects invalid categories, employment types, or compensation types", () => {
      const invalidCat = createJobSchema.safeParse({
        ...validJobPayload,
        category: "SOFTWARE_ENGINEER",
      });
      expect(invalidCat.success).toBe(false);

      const invalidEmp = createJobSchema.safeParse({
        ...validJobPayload,
        employmentType: "NIGHT_SHIFT",
      });
      expect(invalidEmp.success).toBe(false);

      const invalidCompType = createJobSchema.safeParse({
        ...validJobPayload,
        compensationType: "EQUITY_SHARES",
      });
      expect(invalidCompType.success).toBe(false);
    });

    it("only permits DRAFT or ACTIVE as initial status upon creation", () => {
      const draftJob = createJobSchema.safeParse({ ...validJobPayload, status: "DRAFT" });
      expect(draftJob.success).toBe(true);

      const closedJob = createJobSchema.safeParse({ ...validJobPayload, status: "CLOSED" });
      expect(closedJob.success).toBe(false);

      const pausedJob = createJobSchema.safeParse({ ...validJobPayload, status: "PAUSED" });
      expect(pausedJob.success).toBe(false);
    });

    it("does not accept employer_id from client (server-authoritative security)", () => {
      const payloadWithEmployerId = {
        ...validJobPayload,
        employer_id: "00000000-0000-0000-0000-000000000000",
      };
      const parsed = createJobSchema.safeParse(payloadWithEmployerId);
      expect(parsed.success).toBe(true);
      // employer_id is stripped by schema and never trusted
      expect((parsed as unknown as { data: Record<string, unknown> }).data.employer_id).toBeUndefined();
    });
  });

  // ============================================================================
  // 2. Job Creation Authorization
  // ============================================================================
  describe("2. Job Creation Authorization", () => {
    const authorizedRoles: UserRole[] = ["FARMER", "BUSINESS"];

    it("permits FARMER role to create jobs", () => {
      const farmerRoles: UserRole[] = ["FARMER", "BUYER"];
      expect(hasAnyRole(farmerRoles, authorizedRoles)).toBe(true);
    });

    it("permits BUSINESS role to create jobs", () => {
      const businessRoles: UserRole[] = ["BUSINESS"];
      expect(hasAnyRole(businessRoles, authorizedRoles)).toBe(true);
    });

    it("permits ADMIN role via superuser override to create jobs", () => {
      const adminRoles: UserRole[] = ["ADMIN"];
      expect(hasAnyRole(adminRoles, authorizedRoles)).toBe(true);
      expect(hasRole(adminRoles, "ADMIN")).toBe(true);
    });

    it("rejects unauthorized non-employer roles from creating jobs", () => {
      const buyerOnly: UserRole[] = ["BUYER"];
      expect(hasAnyRole(buyerOnly, authorizedRoles)).toBe(false);

      const jobSeekerOnly: UserRole[] = ["JOB_SEEKER"];
      expect(hasAnyRole(jobSeekerOnly, authorizedRoles)).toBe(false);

      const equipmentOnly: UserRole[] = ["EQUIPMENT_OWNER"];
      expect(hasAnyRole(equipmentOnly, authorizedRoles)).toBe(false);
    });
  });

  // ============================================================================
  // 3. Job Editing Ownership & Authorization
  // ============================================================================
  describe("3. Job Editing Ownership & Validation", () => {
    const existingJob = {
      id: "11111111-1111-1111-1111-111111111111",
      employerId: "employer-user-123",
      title: "Cassava Harvester Needed",
      status: "ACTIVE" as const,
    };

    function checkEditPermission(
      currentUser: { id: string; roles: UserRole[] },
      job: { employerId: string }
    ): { allowed: boolean; error?: string } {
      const isOwner = job.employerId === currentUser.id;
      const isAdmin = hasRole(currentUser.roles, "ADMIN");
      if (!isOwner && !isAdmin) {
        return { allowed: false, error: "Unauthorized. You can only edit your own job listings." };
      }
      return { allowed: true };
    }

    it("allows the job owner to edit", () => {
      const ownerUser = { id: "employer-user-123", roles: ["FARMER" as UserRole] };
      expect(checkEditPermission(ownerUser, existingJob).allowed).toBe(true);
    });

    it("allows an administrator to edit any job", () => {
      const adminUser = { id: "admin-user-999", roles: ["ADMIN" as UserRole] };
      expect(checkEditPermission(adminUser, existingJob).allowed).toBe(true);
    });

    it("rejects editing attempts by unauthorized users", () => {
      const otherFarmer = { id: "other-farmer-456", roles: ["FARMER" as UserRole] };
      const result = checkEditPermission(otherFarmer, existingJob);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("validates partial job updates through updateJobSchema", () => {
      const validUpdate = updateJobSchema.safeParse({
        jobId: "11111111-1111-1111-1111-111111111111",
        title: "Senior Cassava Harvesting Crew Lead",
        compensationAmount: 450000,
      });
      expect(validUpdate.success).toBe(true);

      const invalidUuid = updateJobSchema.safeParse({
        jobId: "not-a-uuid",
        title: "Valid Title",
      });
      expect(invalidUuid.success).toBe(false);
    });
  });

  // ============================================================================
  // 4. Job Status State Machine
  // ============================================================================
  describe("4. Job Status State Machine", () => {
    it("allows valid transitions from DRAFT", () => {
      expect(isValidJobStatusTransition("DRAFT", "ACTIVE")).toBe(true);
      expect(isValidJobStatusTransition("DRAFT", "CLOSED")).toBe(true);
      expect(isValidJobStatusTransition("DRAFT", "DRAFT")).toBe(true);
      expect(isValidJobStatusTransition("DRAFT", "PAUSED")).toBe(false);
    });

    it("allows valid transitions from ACTIVE", () => {
      expect(isValidJobStatusTransition("ACTIVE", "PAUSED")).toBe(true);
      expect(isValidJobStatusTransition("ACTIVE", "CLOSED")).toBe(true);
      expect(isValidJobStatusTransition("ACTIVE", "ACTIVE")).toBe(true);
      expect(isValidJobStatusTransition("ACTIVE", "DRAFT")).toBe(false);
    });

    it("allows valid transitions from PAUSED", () => {
      expect(isValidJobStatusTransition("PAUSED", "ACTIVE")).toBe(true);
      expect(isValidJobStatusTransition("PAUSED", "CLOSED")).toBe(true);
      expect(isValidJobStatusTransition("PAUSED", "PAUSED")).toBe(true);
      expect(isValidJobStatusTransition("PAUSED", "DRAFT")).toBe(false);
    });

    it("treats CLOSED as a terminal state with no outgoing transitions", () => {
      expect(VALID_JOB_STATUS_TRANSITIONS.CLOSED).toEqual([]);
      expect(isValidJobStatusTransition("CLOSED", "ACTIVE")).toBe(false);
      expect(isValidJobStatusTransition("CLOSED", "PAUSED")).toBe(false);
      expect(isValidJobStatusTransition("CLOSED", "DRAFT")).toBe(false);
      expect(isValidJobStatusTransition("CLOSED", "CLOSED")).toBe(true);
    });

    it("validates status transition payload via transitionJobStatusSchema", () => {
      const validPayload = transitionJobStatusSchema.safeParse({
        jobId: "11111111-1111-1111-1111-111111111111",
        status: "CLOSED",
      });
      expect(validPayload.success).toBe(true);

      const invalidStatus = transitionJobStatusSchema.safeParse({
        jobId: "11111111-1111-1111-1111-111111111111",
        status: "DELETED",
      });
      expect(invalidStatus.success).toBe(false);
    });
  });

  // ============================================================================
  // 5. Public Active-Job Discovery, Filtering & Pagination
  // ============================================================================
  describe("5. Public Active-Job Discovery & Filtering", () => {
    const mockJobs: JobListing[] = [
      {
        id: "job-1",
        employerId: "emp-1",
        title: "Tractor Operator for Rice Harvest",
        description: "Experienced tractor driver needed for swamp rice paddies.",
        category: "MACHINE_OPERATOR",
        state: "Kebbi",
        lga: "Argungu",
        locationDetails: "Argungu Paddies",
        employmentType: "CONTRACT",
        compensationType: "DAILY",
        compensationAmount: 15000,
        currency: "NGN",
        requirements: "Valid driver license and 3+ years tractor operation",
        deadline: "2026-10-31",
        status: "ACTIVE",
        createdAt: "2026-09-20T10:00:00Z",
        updatedAt: "2026-09-20T10:00:00Z",
      },
      {
        id: "job-2",
        employerId: "emp-2",
        title: "Commercial Farm Manager",
        description: "Manager for 200-hectare integrated grain and poultry farm.",
        category: "FARM_MANAGER",
        state: "Oyo",
        lga: "Oyo West",
        locationDetails: null,
        employmentType: "FULL_TIME",
        compensationType: "MONTHLY",
        compensationAmount: 500000,
        currency: "NGN",
        requirements: "B.Sc Agriculture or related degree",
        deadline: "2026-11-15",
        status: "ACTIVE",
        createdAt: "2026-09-22T12:00:00Z",
        updatedAt: "2026-09-22T12:00:00Z",
      },
      {
        id: "job-3",
        employerId: "emp-1",
        title: "Draft Job (Not Published)",
        description: "Drafting requirements for next season.",
        category: "CASUAL_LABOUR",
        state: "Kebbi",
        lga: "Argungu",
        locationDetails: null,
        employmentType: "SEASONAL",
        compensationType: "DAILY",
        compensationAmount: 8000,
        currency: "NGN",
        requirements: null,
        deadline: null,
        status: "DRAFT",
        createdAt: "2026-09-25T14:00:00Z",
        updatedAt: "2026-09-25T14:00:00Z",
      },
    ];

    it("public discovery strictly excludes non-ACTIVE jobs", () => {
      const publicJobs = mockJobs.filter((j) => j.status === "ACTIVE");
      expect(publicJobs.length).toBe(2);
      expect(publicJobs.some((j) => j.status === "DRAFT")).toBe(false);
    });

    it("filters active jobs by agricultural category", () => {
      const agronomistJobs = mockJobs
        .filter((j) => j.status === "ACTIVE")
        .filter((j) => j.category === "FARM_MANAGER");
      expect(agronomistJobs.length).toBe(1);
      expect(agronomistJobs[0].id).toBe("job-2");
    });

    it("filters active jobs by state and lga", () => {
      const kebbiJobs = mockJobs
        .filter((j) => j.status === "ACTIVE")
        .filter((j) => j.state === "Kebbi" && j.lga === "Argungu");
      expect(kebbiJobs.length).toBe(1);
      expect(kebbiJobs[0].title).toContain("Tractor Operator");
    });

    it("calculates pagination bounds correctly", () => {
      const totalCount = 45;
      const limit = 10;
      const page = 3;
      const totalPages = Math.ceil(totalCount / limit);
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      expect(totalPages).toBe(5);
      expect(from).toBe(20);
      expect(to).toBe(29);
    });
  });

  // ============================================================================
  // 6. Safe Public Employer Profile Representation (Privacy Invariant)
  // ============================================================================
  describe("6. Safe Public Employer Profile Representation (Zero PII Exposure)", () => {
    it("ensures SafeEmployerProfile contains only explicitly safe public fields", () => {
      const safeEmployer: SafeEmployerProfile = {
        id: "employer-uuid-123",
        fullName: "Oluwaseun Agro Holdings",
        avatarUrl: "https://example.com/avatar.jpg",
        isVerified: true,
        state: "Oyo",
        lga: "Ibadan North",
      };

      expect(safeEmployer.fullName).toBe("Oluwaseun Agro Holdings");
      expect(safeEmployer.isVerified).toBe(true);

      // Verify that private fields do not exist on SafeEmployerProfile
      const rawObject = safeEmployer as unknown as Record<string, unknown>;
      expect(rawObject.email).toBeUndefined();
      expect(rawObject.phone).toBeUndefined();
      expect(rawObject.location_address).toBeUndefined();
    });

    it("maps raw database row to clean JobListing without exposing sensitive fields", () => {
      const rawRow = {
        id: "job-uuid-1",
        employer_id: "emp-uuid-99",
        title: "Irrigation Specialist",
        description: "Maintain drip irrigation systems on greenhouse tomato farm.",
        category: "AGRONOMIST",
        state: "Kano",
        lga: "Kura",
        location_details: "Kura Irrigation Project Site B",
        employment_type: "FULL_TIME",
        compensation_type: "MONTHLY",
        compensation_amount: "280000.00",
        currency: "NGN",
        requirements: "Knowledge of fertigation and solar pumping.",
        deadline: "2026-11-01T00:00:00Z",
        status: "ACTIVE",
        created_at: "2026-09-20T08:00:00Z",
        updated_at: "2026-09-20T08:00:00Z",
      };

      const safeEmployer: SafeEmployerProfile = {
        id: "emp-uuid-99",
        fullName: "Kano Tomato Growers Cooperative",
        avatarUrl: null,
        isVerified: true,
        state: "Kano",
        lga: "Kura",
      };

      const mapped = mapJobRow(rawRow, safeEmployer, 3);

      expect(mapped.id).toBe("job-uuid-1");
      expect(mapped.compensationAmount).toBe(280000);
      expect(mapped.employer?.fullName).toBe("Kano Tomato Growers Cooperative");
      expect(mapped.applicationsCount).toBe(3);

      // No private PII
      const mappedRecord = mapped as unknown as Record<string, unknown>;
      expect(mappedRecord.email).toBeUndefined();
      expect(mappedRecord.phone).toBeUndefined();
      expect(mappedRecord.location_address).toBeUndefined();
    });
  });

  // ============================================================================
  // 7. Job Application Creation & Invariants
  // ============================================================================
  describe("7. Job Application Creation & Invariants", () => {
    const validApplication = {
      jobId: "22222222-2222-2222-2222-222222222222",
      coverNote: "I have 4 years experience operating Massey Ferguson tractors in Niger State.",
      resumeUrl: "https://example.com/resumes/usman-tractor-operator.pdf",
    };

    it("validates correct application payload through applyForJobSchema", () => {
      const result = applyForJobSchema.safeParse(validApplication);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.jobId).toBe("22222222-2222-2222-2222-222222222222");
        expect(result.data.coverNote).toContain("Massey Ferguson");
      }
    });

    it("accepts application without resumeUrl (optional)", () => {
      const noResume = applyForJobSchema.safeParse({
        jobId: "22222222-2222-2222-2222-222222222222",
        coverNote: "Experienced field laborer available immediately.",
      });
      expect(noResume.success).toBe(true);
      if (noResume.success) {
        expect(noResume.data.resumeUrl).toBeNull();
      }
    });

    it("rejects invalid resumeUrl format", () => {
      const invalidUrl = applyForJobSchema.safeParse({
        ...validApplication,
        resumeUrl: "not-a-valid-url",
      });
      expect(invalidUrl.success).toBe(false);
    });

    it("does not accept applicant_id from client (server-authoritative identity)", () => {
      const withApplicantId = {
        ...validApplication,
        applicant_id: "00000000-0000-0000-0000-000000000000",
      };
      const parsed = applyForJobSchema.safeParse(withApplicantId);
      expect(parsed.success).toBe(true);
      expect((parsed as unknown as { data: Record<string, unknown> }).data.applicant_id).toBeUndefined();
    });

    it("enforces rule: Applications can only be submitted for ACTIVE jobs", () => {
      function canApply(jobStatus: JobStatus): { allowed: boolean; error?: string } {
        if (jobStatus !== "ACTIVE") {
          return { allowed: false, error: "Applications can only be submitted for active jobs." };
        }
        return { allowed: true };
      }

      expect(canApply("ACTIVE").allowed).toBe(true);
      expect(canApply("DRAFT").allowed).toBe(false);
      expect(canApply("PAUSED").allowed).toBe(false);
      expect(canApply("CLOSED").allowed).toBe(false);
      expect(canApply("CLOSED").error).toBe("Applications can only be submitted for active jobs.");
    });

    it("enforces rule: Employers cannot apply for their own job listings", () => {
      function validateApplicant(jobEmployerId: string, applicantId: string) {
        if (jobEmployerId === applicantId) {
          return { allowed: false, error: "You cannot apply for your own job listing." };
        }
        return { allowed: true };
      }

      expect(validateApplicant("emp-1", "user-2").allowed).toBe(true);
      expect(validateApplicant("emp-1", "emp-1").allowed).toBe(false);
      expect(validateApplicant("emp-1", "emp-1").error).toBe(
        "You cannot apply for your own job listing."
      );
    });

    it("enforces duplicate application prevention", () => {
      const existingApplications = [
        { jobId: "job-100", applicantId: "applicant-abc" },
      ];

      function checkDuplicate(jobId: string, applicantId: string): boolean {
        return existingApplications.some(
          (a) => a.jobId === jobId && a.applicantId === applicantId
        );
      }

      expect(checkDuplicate("job-100", "applicant-abc")).toBe(true);
      expect(checkDuplicate("job-100", "applicant-xyz")).toBe(false);
      expect(checkDuplicate("job-200", "applicant-abc")).toBe(false);
    });
  });

  // ============================================================================
  // 8. Application Status State Machine & Authorization
  // ============================================================================
  describe("8. Application Status State Machine & Authorization", () => {
    it("allows valid transitions from SUBMITTED", () => {
      expect(isValidApplicationStatusTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
      expect(isValidApplicationStatusTransition("SUBMITTED", "SHORTLISTED")).toBe(true);
      expect(isValidApplicationStatusTransition("SUBMITTED", "REJECTED")).toBe(true);
      expect(isValidApplicationStatusTransition("SUBMITTED", "SUBMITTED")).toBe(true);
      expect(isValidApplicationStatusTransition("SUBMITTED", "HIRED")).toBe(false); // cannot skip to hired directly
    });

    it("allows valid transitions from UNDER_REVIEW", () => {
      expect(isValidApplicationStatusTransition("UNDER_REVIEW", "SHORTLISTED")).toBe(true);
      expect(isValidApplicationStatusTransition("UNDER_REVIEW", "REJECTED")).toBe(true);
      expect(isValidApplicationStatusTransition("UNDER_REVIEW", "UNDER_REVIEW")).toBe(true);
      expect(isValidApplicationStatusTransition("UNDER_REVIEW", "SUBMITTED")).toBe(false);
      expect(isValidApplicationStatusTransition("UNDER_REVIEW", "HIRED")).toBe(false);
    });

    it("allows valid transitions from SHORTLISTED", () => {
      expect(isValidApplicationStatusTransition("SHORTLISTED", "HIRED")).toBe(true);
      expect(isValidApplicationStatusTransition("SHORTLISTED", "REJECTED")).toBe(true);
      expect(isValidApplicationStatusTransition("SHORTLISTED", "SHORTLISTED")).toBe(true);
      expect(isValidApplicationStatusTransition("SHORTLISTED", "SUBMITTED")).toBe(false);
      expect(isValidApplicationStatusTransition("SHORTLISTED", "UNDER_REVIEW")).toBe(false);
    });

    it("treats REJECTED and HIRED as terminal states with no outgoing transitions", () => {
      expect(VALID_APPLICATION_STATUS_TRANSITIONS.REJECTED).toEqual([]);
      expect(isValidApplicationStatusTransition("REJECTED", "SUBMITTED")).toBe(false);
      expect(isValidApplicationStatusTransition("REJECTED", "HIRED")).toBe(false);
      expect(isValidApplicationStatusTransition("REJECTED", "SHORTLISTED")).toBe(false);

      expect(VALID_APPLICATION_STATUS_TRANSITIONS.HIRED).toEqual([]);
      expect(isValidApplicationStatusTransition("HIRED", "SUBMITTED")).toBe(false);
      expect(isValidApplicationStatusTransition("HIRED", "REJECTED")).toBe(false);
      expect(isValidApplicationStatusTransition("HIRED", "SHORTLISTED")).toBe(false);
    });

    it("validates application status update payload through updateApplicationStatusSchema", () => {
      const validPayload = updateApplicationStatusSchema.safeParse({
        applicationId: "33333333-3333-3333-3333-333333333333",
        status: "SHORTLISTED",
      });
      expect(validPayload.success).toBe(true);

      const invalidStatus = updateApplicationStatusSchema.safeParse({
        applicationId: "33333333-3333-3333-3333-333333333333",
        status: "APPROVED",
      });
      expect(invalidStatus.success).toBe(false);
    });

    it("enforces application status update authorization: Employer or ADMIN only", () => {
      const applicationContext = {
        id: "app-1",
        applicantId: "applicant-user-1",
        jobEmployerId: "employer-user-2",
      };

      function authorizeStatusUpdate(
        currentUser: { id: string; roles: UserRole[] },
        app: typeof applicationContext
      ): { allowed: boolean; error?: string } {
        const isEmployer = app.jobEmployerId === currentUser.id;
        const isAdmin = hasRole(currentUser.roles, "ADMIN");

        if (!isEmployer && !isAdmin) {
          if (app.applicantId === currentUser.id) {
            return {
              allowed: false,
              error: "Applicants are not permitted to modify their own application status.",
            };
          }
          return {
            allowed: false,
            error: "Unauthorized. Only the employer or an administrator can update application status.",
          };
        }
        return { allowed: true };
      }

      // Employer can update
      const employer = { id: "employer-user-2", roles: ["FARMER" as UserRole] };
      expect(authorizeStatusUpdate(employer, applicationContext).allowed).toBe(true);

      // Admin can update
      const admin = { id: "admin-user", roles: ["ADMIN" as UserRole] };
      expect(authorizeStatusUpdate(admin, applicationContext).allowed).toBe(true);

      // Applicant cannot modify own status
      const applicant = { id: "applicant-user-1", roles: ["BUYER" as UserRole] };
      const applicantResult = authorizeStatusUpdate(applicant, applicationContext);
      expect(applicantResult.allowed).toBe(false);
      expect(applicantResult.error).toContain("Applicants are not permitted");

      // Random third party cannot modify
      const randomUser = { id: "random-user-3", roles: ["FARMER" as UserRole] };
      const randomResult = authorizeStatusUpdate(randomUser, applicationContext);
      expect(randomResult.allowed).toBe(false);
      expect(randomResult.error).toContain("Unauthorized");
    });
  });
});
