import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  getApiUser,
  requireApiAuth,
  requireApiRole,
  requireApiAnyRole,
  handleApiError,
} from "@/lib/auth/api-auth";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors/app-error";
import * as adminSupabase from "@/lib/supabase/admin";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

describe("API Auth & Bearer Token Verification (src/lib/auth/api-auth.ts)", () => {
  let mockAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdminClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };

    vi.mocked(adminSupabase.createAdminClient).mockReturnValue(mockAdminClient);
  });

  describe("getApiUser", () => {
    it("returns null if Authorization header is missing", async () => {
      const req = new Request("http://localhost/api/v1/test");
      const user = await getApiUser(req);
      expect(user).toBeNull();
    });

    it("returns null if Authorization header is not a Bearer token", async () => {
      const req = new Request("http://localhost/api/v1/test", {
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      });
      const user = await getApiUser(req);
      expect(user).toBeNull();
    });

    it("returns null if Bearer token is empty", async () => {
      const req = new Request("http://localhost/api/v1/test", {
        headers: { Authorization: "Bearer   " },
      });
      const user = await getApiUser(req);
      expect(user).toBeNull();
    });

    it("returns null if Supabase auth.getUser rejects the token", async () => {
      mockAdminClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Invalid or expired JWT" },
      });

      const req = new Request("http://localhost/api/v1/test", {
        headers: { Authorization: "Bearer expired.jwt.token" },
      });
      const user = await getApiUser(req);
      expect(user).toBeNull();
    });

    it("returns AuthUser with roles loaded from database for valid token", async () => {
      mockAdminClient.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: "user-123",
            email: "farmer@agro.ng",
            created_at: "2026-01-01T00:00:00Z",
            email_confirmed_at: "2026-01-01T00:00:00Z",
          },
        },
        error: null,
      });

      // Mock user_roles query
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ role_code: "BUYER" }, { role_code: "FARMER" }],
              error: null,
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                full_name: "Alaba Farmer",
                phone: "+2348011112222",
                state: "Oyo",
                lga: "Ibarapa East",
                is_verified: true,
              },
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });

      const req = new Request("http://localhost/api/v1/test", {
        headers: { Authorization: "Bearer valid.jwt.token" },
      });

      const user = await getApiUser(req);
      expect(user).not.toBeNull();
      expect(user?.id).toBe("user-123");
      expect(user?.email).toBe("farmer@agro.ng");
      expect(user?.roles).toEqual(["BUYER", "FARMER"]);
      expect(user?.isOnboarded).toBe(true);
      expect(user?.isVerified).toBe(true);
    });
  });

  describe("requireApiAuth & Role Guards", () => {
    it("throws UnauthorizedError when unauthenticated", async () => {
      const req = new Request("http://localhost/api/v1/test");
      await expect(requireApiAuth(req)).rejects.toThrow(UnauthorizedError);
    });

    it("throws ForbiddenError when user lacks the required single role", async () => {
      mockAdminClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-buyer", email: "buyer@test.ng" } },
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ role_code: "BUYER" }],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      const req = new Request("http://localhost/api/v1/test", {
        headers: { Authorization: "Bearer valid.token" },
      });

      await expect(requireApiRole(req, "FARMER")).rejects.toThrow(ForbiddenError);
    });

    it("allows ADMIN to access role-restricted resources (superuser override)", async () => {
      mockAdminClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-admin", email: "admin@test.ng" } },
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ role_code: "BUYER" }, { role_code: "ADMIN" }],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      const req = new Request("http://localhost/api/v1/test", {
        headers: { Authorization: "Bearer valid.admin.token" },
      });

      const user = await requireApiRole(req, "FARMER");
      expect(user.roles).toContain("ADMIN");
    });

    it("throws ForbiddenError when user has none of requireApiAnyRole roles", async () => {
      mockAdminClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: "user-buyer", email: "buyer@test.ng" } },
        error: null,
      });

      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === "user_roles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ role_code: "BUYER" }],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      const req = new Request("http://localhost/api/v1/test", {
        headers: { Authorization: "Bearer valid.token" },
      });

      await expect(requireApiAnyRole(req, ["FARMER", "BUSINESS"])).rejects.toThrow(ForbiddenError);
    });
  });

  describe("handleApiError", () => {
    it("formats Zod validation errors as 422 with field details", async () => {
      const schema = z.object({ email: z.string().email(), amount: z.number().positive() });
      const parseResult = schema.safeParse({ email: "invalid", amount: -10 });
      if (!parseResult.success) {
        const res = handleApiError(parseResult.error);
        const json = await res.json();
        expect(res.status).toBe(422);
        expect(json.code).toBe("VALIDATION_ERROR");
        expect(json.details.email).toBeDefined();
        expect(json.details.amount).toBeDefined();
      }
    });

    it("formats AppError subclasses with their assigned status codes", async () => {
      const err401 = new UnauthorizedError();
      const res401 = handleApiError(err401);
      expect(res401.status).toBe(401);

      const err403 = new ForbiddenError();
      const res403 = handleApiError(err403);
      expect(res403.status).toBe(403);

      const err404 = new NotFoundError();
      const res404 = handleApiError(err404);
      expect(res404.status).toBe(404);
    });

    it("maps domain Unauthorized errors to 403 Forbidden", async () => {
      const domainErr = new Error("Unauthorized: You do not own this order.");
      const res = handleApiError(domainErr);
      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.code).toBe("FORBIDDEN");
    });

    it("maps domain NotFound errors to 404 NotFound", async () => {
      const domainErr = new Error("Order not found.");
      const res = handleApiError(domainErr);
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.code).toBe("NOT_FOUND");
    });
  });
});
