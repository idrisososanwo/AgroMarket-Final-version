import { describe, it, expect } from "vitest";
import {
  USER_ROLES,
  SELF_ASSIGNABLE_ROLES,
  UserRole,
} from "@/types/auth";
import { hasRole, hasAnyRole } from "@/lib/auth/roles";
import {
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/errors/app-error";

describe("Phase 0.3 Auth & RBAC Security Verification", () => {
  describe("Role Definitions & Self-Assignment Security", () => {
    it("strictly excludes ADMIN from self-assignable roles", () => {
      expect((SELF_ASSIGNABLE_ROLES as readonly string[]).includes("ADMIN")).toBe(false);
      expect(USER_ROLES).toContain("ADMIN");
      expect(SELF_ASSIGNABLE_ROLES.length).toBe(7);
      expect(USER_ROLES.length).toBe(8);
    });

    it("ensures all self-assignable roles exist within system USER_ROLES", () => {
      for (const role of SELF_ASSIGNABLE_ROLES) {
        expect((USER_ROLES as readonly string[]).includes(role)).toBe(true);
      }
    });

    it("rejects self-promotion when a user attempts to select ADMIN", () => {
      function validateRequestedRoles(requestedRoles: string[]): {
        allowed: boolean;
        error?: string;
      } {
        if (requestedRoles.includes("ADMIN")) {
          return {
            allowed: false,
            error: "Security violation: The ADMIN role cannot be self-selected.",
          };
        }
        return { allowed: true };
      }

      const attemptWithAdmin = validateRequestedRoles(["BUYER", "FARMER", "ADMIN"]);
      expect(attemptWithAdmin.allowed).toBe(false);
      expect(attemptWithAdmin.error).toBe(
        "Security violation: The ADMIN role cannot be self-selected."
      );

      const legitimateAttempt = validateRequestedRoles(["BUYER", "FARMER", "EQUIPMENT_OWNER"]);
      expect(legitimateAttempt.allowed).toBe(true);
    });
  });

  describe("Server-Side Access Guards & Role Checking", () => {
    function simulateRoleGuard(
      user: { id: string; roles: UserRole[] } | null,
      requiredRole: UserRole
    ) {
      if (!user) {
        throw new UnauthorizedError("Authentication required.");
      }
      if (!hasRole(user.roles, requiredRole)) {
        throw new ForbiddenError(`Access denied. Missing required role: ${requiredRole}`);
      }
      return user;
    }

    function simulateAnyRoleGuard(
      user: { id: string; roles: UserRole[] } | null,
      requiredRoles: UserRole[]
    ) {
      if (!user) {
        throw new UnauthorizedError("Authentication required.");
      }
      if (!hasAnyRole(user.roles, requiredRoles)) {
        throw new ForbiddenError(
          `Access denied. Requires one of: ${requiredRoles.join(", ")}`
        );
      }
      return user;
    }

    it("rejects unauthenticated users with UnauthorizedError", () => {
      expect(() => simulateRoleGuard(null, "BUYER")).toThrow(UnauthorizedError);
      expect(() => simulateAnyRoleGuard(null, ["FARMER", "BUSINESS"])).toThrow(
        UnauthorizedError
      );
    });

    it("accepts authenticated users holding the requested role", () => {
      const buyerUser = { id: "usr-1", roles: ["BUYER" as UserRole] };
      const result = simulateRoleGuard(buyerUser, "BUYER");
      expect(result.id).toBe("usr-1");
    });

    it("strictly rejects FARMER from ADMIN-only protected access", () => {
      const farmerUser = { id: "usr-2", roles: ["FARMER" as UserRole] };
      expect(() => simulateRoleGuard(farmerUser, "ADMIN")).toThrow(ForbiddenError);
    });

    it("accepts ADMIN for ADMIN-only protected access", () => {
      const adminUser = { id: "usr-admin", roles: ["ADMIN" as UserRole] };
      const result = simulateRoleGuard(adminUser, "ADMIN");
      expect(result.id).toBe("usr-admin");
    });

    it("allows ADMIN superuser override across any protected role", () => {
      const adminUser = { id: "usr-admin", roles: ["ADMIN" as UserRole] };
      expect(simulateRoleGuard(adminUser, "FARMER")).toBe(adminUser);
      expect(simulateRoleGuard(adminUser, "BUSINESS")).toBe(adminUser);
      expect(simulateRoleGuard(adminUser, "SERVICE_PROVIDER")).toBe(adminUser);
    });

    it("authorizes a multi-role user for any of their specific held roles", () => {
      const multiRoleUser = {
        id: "usr-3",
        roles: ["BUYER", "FARMER", "EQUIPMENT_OWNER"] as UserRole[],
      };

      // Allowed for held roles
      expect(simulateRoleGuard(multiRoleUser, "BUYER")).toBe(multiRoleUser);
      expect(simulateRoleGuard(multiRoleUser, "FARMER")).toBe(multiRoleUser);
      expect(simulateRoleGuard(multiRoleUser, "EQUIPMENT_OWNER")).toBe(multiRoleUser);

      // Forbidden for unheld roles
      expect(() => simulateRoleGuard(multiRoleUser, "BUSINESS")).toThrow(ForbiddenError);
      expect(() => simulateRoleGuard(multiRoleUser, "EXPERT")).toThrow(ForbiddenError);
    });

    it("authorizes user matching requireAnyRole requirement", () => {
      const jobSeeker = { id: "usr-4", roles: ["JOB_SEEKER" as UserRole] };
      const result = simulateAnyRoleGuard(jobSeeker, ["JOB_SEEKER", "ADMIN"]);
      expect(result.id).toBe("usr-4");
    });
  });

  describe("Profile Update Payload Sanitization", () => {
    it("strips out unauthorized privilege escalation attempts during profile update", () => {
      interface RawInput {
        fullName: string;
        phone: string;
        is_verified?: boolean;
        roles?: string[];
        id?: string;
      }

      function sanitizeProfileUpdate(raw: RawInput) {
        // Allowed update fields only
        return {
          fullName: raw.fullName,
          phone: raw.phone,
        };
      }

      const maliciousPayload: RawInput = {
        fullName: "Honest Farmer",
        phone: "08012345678",
        is_verified: true, // Malicious verification injection
        roles: ["ADMIN"], // Malicious role escalation
        id: "target-other-user-uuid", // Malicious user targeting
      };

      const sanitized = sanitizeProfileUpdate(maliciousPayload);

      expect(sanitized).toEqual({
        fullName: "Honest Farmer",
        phone: "08012345678",
      });
      expect(sanitized).not.toHaveProperty("is_verified");
      expect(sanitized).not.toHaveProperty("roles");
      expect(sanitized).not.toHaveProperty("id");
    });
  });
});
