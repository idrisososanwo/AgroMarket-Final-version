import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as registerHandler } from "@/app/api/v1/auth/register/route";
import { GET as meHandler } from "@/app/api/v1/auth/me/route";
import { POST as initPaymentHandler } from "@/app/api/v1/payments/initialize/route";
import { POST as verifyPaymentHandler } from "@/app/api/v1/payments/verify/route";
import { POST as uploadProduceImageHandler } from "@/app/api/v1/upload/produce-image/route";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { resetRateLimitStore } from "@/lib/rate-limit";
import { PaymentService } from "@/features/payments/service";
import { AuthUser } from "@/types/auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors/app-error";
import { hasRole, hasAnyRole } from "@/lib/auth/roles";
import * as apiAuth from "@/lib/auth/api-auth";
import * as adminSupabase from "@/lib/supabase/admin";
import * as serverSupabase from "@/lib/supabase/server";

// Mock @/lib/auth/api-auth so route handlers use controlled test mocks
vi.mock("@/lib/auth/api-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/api-auth")>();
  return {
    ...actual,
    requireApiAuth: vi.fn(),
    requireApiRole: vi.fn(),
    requireApiAnyRole: vi.fn(),
    getApiUser: vi.fn(),
  };
});

// Mock Supabase admin client for database/storage operations
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// Mock Supabase server client for signUp operations
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Isolated test user fixtures
const mockBuyerUser: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "buyer@example.com",
  phone: "+2348012345678",
  fullName: "Test Buyer",
  state: "Lagos",
  lga: "Ikeja",
  roles: ["BUYER"],
  isEmailVerified: true,
  isPhoneVerified: true,
  isVerified: false,
  isOnboarded: true,
  createdAt: "2026-01-01T00:00:00Z",
};

const mockFarmerUser: AuthUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "farmer@example.com",
  phone: "+2348023456789",
  fullName: "Test Farmer",
  state: "Oyo",
  lga: "Ibarapa East",
  roles: ["BUYER", "FARMER"],
  isEmailVerified: true,
  isPhoneVerified: true,
  isVerified: true,
  isOnboarded: true,
  createdAt: "2026-01-01T00:00:00Z",
};

const mockAdminUser: AuthUser = {
  id: "99999999-9999-4999-8999-999999999999",
  email: "admin@example.com",
  phone: "+2348099999999",
  fullName: "Test Admin",
  state: "FCT - Abuja",
  lga: "Municipal",
  roles: ["BUYER", "ADMIN"],
  isEmailVerified: true,
  isPhoneVerified: true,
  isVerified: true,
  isOnboarded: true,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("Phase 2: Mobile Backend API Suite (/api/v1/*)", () => {
  let mockAdminDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();

    // Configure server createClient mock
    vi.mocked(serverSupabase.createClient).mockResolvedValue({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "mock-new-user-id",
              identities: [{ id: "mock-id" }],
            },
          },
          error: null,
        }),
      },
    } as any);

    // Default: requireApiAuth succeeds with mockBuyerUser unless overridden
    vi.mocked(apiAuth.requireApiAuth).mockImplementation(async (req) => {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
        throw new UnauthorizedError(
          "Authentication required. Please provide a valid Bearer token.",
        );
      }
      return mockBuyerUser;
    });

    vi.mocked(apiAuth.requireApiRole).mockImplementation(async (req, role) => {
      const user = await apiAuth.requireApiAuth(req);
      if (!hasRole(user.roles, role)) {
        throw new ForbiddenError(`Access denied. Missing required role: ${role}`);
      }
      return user;
    });

    vi.mocked(apiAuth.requireApiAnyRole).mockImplementation(async (req, roles) => {
      const user = await apiAuth.requireApiAuth(req);
      if (!hasAnyRole(user.roles, roles)) {
        throw new ForbiddenError(`Access denied. Requires one of: ${roles.join(", ")}`);
      }
      return user;
    });

    // Setup mock admin database client
    mockAdminDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUploadUrl: vi.fn().mockResolvedValue({
            data: {
              signedUrl: "https://mock-storage.supabase.co/upload/signed-token-123",
              token: "signed-token-123",
              path: "mock-path",
            },
            error: null,
          }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: "https://mock-storage.supabase.co/public/mock-path" },
          }),
        }),
      },
    };

    vi.mocked(adminSupabase.createAdminClient).mockReturnValue(mockAdminDb);
  });

  // ============================================================================
  // 1. AUTHENTICATION & REGISTRATION (/api/v1/auth/register & /api/v1/auth/me)
  // ============================================================================
  describe("1. Mobile Authentication & Registration", () => {
    it("rejects unauthenticated requests to protected GET /api/v1/auth/me with 401", async () => {
      vi.mocked(apiAuth.requireApiAuth).mockRejectedValueOnce(
        new UnauthorizedError("Authentication required. Please provide a valid Bearer token."),
      );

      const req = new NextRequest("http://localhost/api/v1/auth/me");
      const res = await meHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
      expect(json.error).toContain("Authentication required");
    });

    it("rejects invalid or malformed Bearer tokens with 401", async () => {
      vi.mocked(apiAuth.requireApiAuth).mockRejectedValueOnce(
        new UnauthorizedError("Authentication required. Please provide a valid Bearer token."),
      );

      const req = new NextRequest("http://localhost/api/v1/auth/me", {
        headers: { Authorization: "Bearer invalid.fake.token" },
      });
      const res = await meHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
    });

    it("returns user profile and authoritative roles for valid Bearer token", async () => {
      vi.mocked(apiAuth.requireApiAuth).mockResolvedValueOnce(mockFarmerUser);

      const req = new NextRequest("http://localhost/api/v1/auth/me", {
        headers: { Authorization: "Bearer valid.jwt.token" },
      });
      const res = await meHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user.id).toBe(mockFarmerUser.id);
      expect(json.data.user.roles).toEqual(["BUYER", "FARMER"]);
      expect(json.data.user.fullName).toBe("Test Farmer");
    });

    it("rejects registration when client attempts to self-assign the ADMIN role with 403", async () => {
      const payload = {
        fullName: "Malicious Actor",
        phone: "08012345678",
        email: "hacker@example.com",
        password: "password123",
        state: "Lagos",
        lga: "Ikeja",
        roleType: "ADMIN",
      };

      const req = new NextRequest("http://localhost/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.code).toBe("FORBIDDEN");
      expect(json.error).toContain("ADMIN role is strictly prohibited");
    });

    it("rejects registration with invalid Nigerian phone numbers with 422", async () => {
      const payload = {
        fullName: "Bad Phone User",
        phone: "12345", // Invalid phone
        email: "badphone@example.com",
        password: "password123",
        state: "Lagos",
        lga: "Ikeja",
        roleType: "BUYER",
      };

      const req = new NextRequest("http://localhost/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.details?.phone).toBeDefined();
    });

    it("rejects registration with invalid Nigerian state with 422", async () => {
      const payload = {
        fullName: "Unknown State User",
        phone: "08012345678",
        email: "badstate@example.com",
        password: "password123",
        state: "California", // Not a Nigerian state
        lga: "Ikeja",
        roleType: "BUYER",
      };

      const req = new NextRequest("http://localhost/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.details?.state).toBeDefined();
    });

    it("rejects duplicate email registrations with 409 Conflict", async () => {
      // Mock existing user found in database
      mockAdminDb.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "existing-user-uuid" },
          error: null,
        }),
      });

      const payload = {
        fullName: "Existing User",
        phone: "08012345678",
        email: "existing@example.com",
        password: "password123",
        state: "Lagos",
        lga: "Ikeja",
        roleType: "BUYER",
      };

      const req = new NextRequest("http://localhost/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.code).toBe("CONFLICT");
      expect(json.error).toContain("already exists");
    });

    it("successfully registers user and automatically grants BUYER plus chosen role and preserves multi-role", async () => {
      const payload = {
        fullName: "Alaba Johnson",
        phone: "08023456789",
        email: "alaba@farm.ng",
        password: "password123",
        state: "Oyo",
        lga: "Ibarapa East",
        roleType: "FARMER",
        additionalRoles: ["EQUIPMENT_OWNER"],
        farmName: "Johnson Agro Holdings",
        produceTypes: "Cassava, Maize",
      };

      const req = new NextRequest("http://localhost/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const res = await registerHandler(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe("alaba@farm.ng");
      // Multi-role preservation: Contains BUYER, FARMER, and EQUIPMENT_OWNER
      expect(json.data.user.roles).toContain("BUYER");
      expect(json.data.user.roles).toContain("FARMER");
      expect(json.data.user.roles).toContain("EQUIPMENT_OWNER");
    });
  });

  // ============================================================================
  // 2. PAYMENTS (/api/v1/payments/initialize & /api/v1/payments/verify)
  // ============================================================================
  describe("2. Payment Initialization & Verification", () => {
    it("rejects unauthenticated payment initialization with 401", async () => {
      vi.mocked(apiAuth.requireApiAuth).mockRejectedValueOnce(
        new UnauthorizedError("Authentication required. Please provide a valid Bearer token."),
      );

      const req = new NextRequest("http://localhost/api/v1/payments/initialize", {
        method: "POST",
        body: JSON.stringify({
          orderId: "33333333-3333-4333-8333-333333333333",
          provider: "PAYSTACK",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await initPaymentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.code).toBe("UNAUTHORIZED");
    });

    it("rejects invalid orderId format with 422", async () => {
      vi.mocked(apiAuth.requireApiAuth).mockResolvedValueOnce(mockBuyerUser);

      const req = new NextRequest("http://localhost/api/v1/payments/initialize", {
        method: "POST",
        body: JSON.stringify({
          orderId: "not-a-valid-uuid",
          provider: "PAYSTACK",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.token",
        },
      });

      const res = await initPaymentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.details?.orderId).toBeDefined();
    });

    it("rejects unsupported payment providers with 422", async () => {
      vi.mocked(apiAuth.requireApiAuth).mockResolvedValueOnce(mockBuyerUser);

      const req = new NextRequest("http://localhost/api/v1/payments/initialize", {
        method: "POST",
        body: JSON.stringify({
          orderId: "33333333-3333-4333-8333-333333333333",
          provider: "BITCOIN_LIGHTNING",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.token",
        },
      });

      const res = await initPaymentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.details?.provider).toBeDefined();
    });

    it("derives payment amount authoritatively from server and ignores client-forged amount", async () => {
      vi.mocked(apiAuth.requireApiAuth).mockResolvedValueOnce(mockBuyerUser);

      const initSpy = vi.spyOn(PaymentService, "initializeOrderPayment").mockResolvedValue({
        paymentId: "pay-123",
        provider: "PAYSTACK",
        reference: "AGRO-TEST-REF-001",
        checkoutUrl: "https://checkout.paystack.com/test-access-code",
        accessCode: "test-access-code",
        amount: 25000,
        currency: "NGN",
      });

      const req = new NextRequest("http://localhost/api/v1/payments/initialize", {
        method: "POST",
        body: JSON.stringify({
          orderId: "33333333-3333-4333-8333-333333333333",
          provider: "PAYSTACK",
          amount: 50, // Malicious attempt to pay ₦50 instead of ₦25,000
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.token",
        },
      });

      const res = await initPaymentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(initSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "33333333-3333-4333-8333-333333333333",
          buyerId: mockBuyerUser.id,
          provider: "PAYSTACK",
        }),
      );
      // The client-passed `amount: 50` is completely discarded
      expect(initSpy).not.toHaveBeenCalledWith(expect.objectContaining({ amount: 50 }));
      expect(json.data.amount).toBe(25000);
    });

    it("rejects unauthorized payment verification when user attempts to verify another user's order", async () => {
      vi.mocked(apiAuth.requireApiAuth).mockResolvedValueOnce(mockBuyerUser);

      vi.spyOn(PaymentService, "verifyAndProcessPayment").mockRejectedValue(
        new Error("Unauthorized: You do not have permission to verify or access this payment."),
      );

      const req = new NextRequest("http://localhost/api/v1/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          reference: "AGRO-OTHER-USER-REF-999",
          provider: "PAYSTACK",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.token",
        },
      });

      const res = await verifyPaymentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.code).toBe("FORBIDDEN");
      expect(json.error).toContain("Unauthorized");
    });

    it("does NOT allow ADMIN to bypass payment ownership check during ordinary verification", async () => {
      vi.mocked(apiAuth.requireApiAuth).mockResolvedValueOnce(mockAdminUser);

      const verifySpy = vi
        .spyOn(PaymentService, "verifyAndProcessPayment")
        .mockRejectedValue(
          new Error("Unauthorized: You do not have permission to verify or access this payment."),
        );

      const req = new NextRequest("http://localhost/api/v1/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          reference: "AGRO-OTHER-USER-REF-123",
          provider: "PAYSTACK",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.admin.token",
        },
      });

      const res = await verifyPaymentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.code).toBe("FORBIDDEN");
      expect(json.error).toContain("Unauthorized");
      // Critical check: verify that expectedBuyerId is caller's ID (mockAdminUser.id), NOT undefined
      expect(verifySpy).toHaveBeenCalledWith(
        "AGRO-OTHER-USER-REF-123",
        "PAYSTACK",
        mockAdminUser.id,
      );
    });

    it("is idempotent: repeatedly verifying an already confirmed payment returns previous state safely", async () => {
      vi.mocked(apiAuth.requireApiAuth).mockResolvedValueOnce(mockBuyerUser);

      vi.spyOn(PaymentService, "verifyAndProcessPayment").mockResolvedValue({
        paymentId: "pay-123",
        orderId: "ord-123",
        status: "PAID",
        orderStatus: "PAID",
        amount: 25000,
        currency: "NGN",
        reference: "AGRO-PAID-REF-001",
        message: "Payment was previously verified and confirmed.",
      });

      const req = new NextRequest("http://localhost/api/v1/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          reference: "AGRO-PAID-REF-001",
          provider: "PAYSTACK",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.token",
        },
      });

      const res = await verifyPaymentHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("PAID");
      expect(json.data.message).toBe("Payment was previously verified and confirmed.");
    });
  });

  // ============================================================================
  // 3. SECURE UPLOADS (/api/v1/upload/produce-image)
  // ============================================================================
  describe("3. Secure Mobile Produce Image Uploads", () => {
    it("rejects unauthenticated upload requests with 401", async () => {
      vi.mocked(apiAuth.requireApiAnyRole).mockRejectedValueOnce(
        new UnauthorizedError("Authentication required. Please provide a valid Bearer token."),
      );

      const req = new NextRequest("http://localhost/api/v1/upload/produce-image", {
        method: "POST",
        body: JSON.stringify({
          fileName: "yam-tubers.jpg",
          fileType: "image/jpeg",
          fileSize: 1024000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await uploadProduceImageHandler(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("rejects upload requests from ordinary BUYER role without seller permissions with 403", async () => {
      vi.mocked(apiAuth.requireApiAnyRole).mockRejectedValueOnce(
        new ForbiddenError("Access denied. Requires one of: FARMER, BUSINESS"),
      );

      const req = new NextRequest("http://localhost/api/v1/upload/produce-image", {
        method: "POST",
        body: JSON.stringify({
          fileName: "yam-tubers.jpg",
          fileType: "image/jpeg",
          fileSize: 1024000,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.buyer.token",
        },
      });

      const res = await uploadProduceImageHandler(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.code).toBe("FORBIDDEN");
      expect(json.error).toContain("Requires one of: FARMER, BUSINESS");
    });

    it("rejects unsupported file formats (e.g. PDF, executable) with 422", async () => {
      vi.mocked(apiAuth.requireApiAnyRole).mockResolvedValueOnce(mockFarmerUser);

      const req = new NextRequest("http://localhost/api/v1/upload/produce-image", {
        method: "POST",
        body: JSON.stringify({
          fileName: "document.pdf",
          fileType: "application/pdf",
          fileSize: 1024000,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.farmer.token",
        },
      });

      const res = await uploadProduceImageHandler(req);
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.code).toBe("VALIDATION_ERROR");
      expect(json.details?.fileType).toBeDefined();
    });

    it("rejects files exceeding the 5MB maximum size limit with 422", async () => {
      vi.mocked(apiAuth.requireApiAnyRole).mockResolvedValueOnce(mockFarmerUser);

      const req = new NextRequest("http://localhost/api/v1/upload/produce-image", {
        method: "POST",
        body: JSON.stringify({
          fileName: "huge-image.jpg",
          fileType: "image/jpeg",
          fileSize: 10 * 1024 * 1024, // 10MB > 5MB limit
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.farmer.token",
        },
      });

      const res = await uploadProduceImageHandler(req);
      const json = await res.json();

      expect(res.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.details?.fileSize).toBeDefined();
    });

    it("generates scoped signed upload URL strictly isolated to caller's directory path", async () => {
      vi.mocked(apiAuth.requireApiAnyRole).mockResolvedValueOnce(mockFarmerUser);

      const req = new NextRequest("http://localhost/api/v1/upload/produce-image", {
        method: "POST",
        body: JSON.stringify({
          fileName: "cassava-harvest.jpg",
          fileType: "image/jpeg",
          fileSize: 2048000,
          listingId: "44444444-4444-4444-8444-444444444444",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.farmer.token",
        },
      });

      // Mock listing ownership check
      mockAdminDb.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "44444444-4444-4444-8444-444444444444", seller_id: mockFarmerUser.id },
          error: null,
        }),
      });

      const res = await uploadProduceImageHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.bucket).toBe("produce-images");
      // Path must be strictly scoped to farmers/<user_id>/...
      expect(json.data.storagePath).toContain(`farmers/${mockFarmerUser.id}/`);
      expect(json.data.signedUploadUrl).toBeDefined();
      expect(json.data.publicUrl).toBeDefined();
    });

    it("rejects upload when farmer attempts to attach image to another farmer's listing with 403", async () => {
      vi.mocked(apiAuth.requireApiAnyRole).mockResolvedValueOnce(mockFarmerUser);

      const req = new NextRequest("http://localhost/api/v1/upload/produce-image", {
        method: "POST",
        body: JSON.stringify({
          fileName: "cassava-harvest.jpg",
          fileType: "image/jpeg",
          fileSize: 2048000,
          listingId: "44444444-4444-4444-8444-444444444444",
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid.farmer.token",
        },
      });

      // Mock listing owned by someone else!
      mockAdminDb.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: "44444444-4444-4444-8444-444444444444", seller_id: "another-farmer-id" },
          error: null,
        }),
      });

      const res = await uploadProduceImageHandler(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.code).toBe("FORBIDDEN");
      expect(json.error).toContain("You do not own the specified produce listing");
    });
  });
});
