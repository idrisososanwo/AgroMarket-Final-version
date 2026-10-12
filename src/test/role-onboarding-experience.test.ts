import { describe, it, expect, vi, beforeEach } from "vitest";
import { signUpAction, signInAction } from "@/features/auth/actions";

// Mock Supabase server client
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      getUser: mockGetUser,
      signOut: vi.fn(),
    },
    from: mockFrom,
  })),
}));

// Mock Supabase admin client
const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

// Mock next/navigation redirect
const mockRedirect = vi.fn((url: string) => {
  const err = new Error(`NEXT_REDIRECT: ${url}`);
  // @ts-expect-error Mocking Next.js redirect internal property
  err.digest = `NEXT_REDIRECT;replace;${url};307;`;
  throw err;
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("AgroMarket: Role-Specific Onboarding & Landing Experience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Role-Specific Signup Journey & Post-Registration Redirect", () => {
    it("registers a Customer/Buyer, assigns BUYER role, and redirects to login", async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: { id: "user-buyer-1", email: "buyer@example.com", identities: [{ id: "1" }] },
          session: null,
        },
        error: null,
      });

      const upsertProfileMock = vi.fn().mockResolvedValue({ error: null });
      const upsertRolesMock = vi.fn().mockResolvedValue({ error: null });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "profiles") return { upsert: upsertProfileMock };
        if (table === "user_roles") return { upsert: upsertRolesMock };
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      });

      const formData = new FormData();
      formData.set("roleType", "BUYER");
      formData.set("fullName", "Ngozi Okafor");
      formData.set("email", "buyer@example.com");
      formData.set("phone", "08012345678");
      formData.set("password", "SecureP@ssword123");
      formData.set("confirmPassword", "SecureP@ssword123");
      formData.set("state", "Lagos");
      formData.set("lga", "Ikeja");

      await expect(signUpAction(null, formData)).rejects.toThrow(
        "NEXT_REDIRECT: /auth/login?registered=true&email=buyer%40example.com&verify=true"
      );

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "buyer@example.com",
          password: "SecureP@ssword123",
          options: expect.objectContaining({
            data: expect.objectContaining({
              intended_role: "BUYER",
              full_name: "Ngozi Okafor",
            }),
          }),
        })
      );

      // Verify BUYER role assigned in user_roles
      expect(upsertRolesMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: "user-buyer-1", role_code: "BUYER" }),
        ]),
        { onConflict: "user_id,role_code" }
      );
    });

    it("registers a Farmer, assigns both FARMER and BUYER roles, and redirects to login", async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: { id: "user-farmer-1", email: "farmer@example.com", identities: [{ id: "2" }] },
          session: null,
        },
        error: null,
      });

      const upsertProfileMock = vi.fn().mockResolvedValue({ error: null });
      const upsertRolesMock = vi.fn().mockResolvedValue({ error: null });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "profiles") return { upsert: upsertProfileMock };
        if (table === "user_roles") return { upsert: upsertRolesMock };
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      });

      const formData = new FormData();
      formData.set("roleType", "FARMER");
      formData.set("fullName", "Babatunde Adebayo");
      formData.set("email", "farmer@example.com");
      formData.set("phone", "08098765432");
      formData.set("password", "FarmHarvest2026!");
      formData.set("confirmPassword", "FarmHarvest2026!");
      formData.set("farmName", "Adebayo Integrated Farms");
      formData.set("produceTypes", "White Maize, Cassava, Poultry");
      formData.set("state", "Oyo");
      formData.set("lga", "Iseyin");

      await expect(signUpAction(null, formData)).rejects.toThrow(
        "NEXT_REDIRECT: /auth/login?registered=true&email=farmer%40example.com&verify=true"
      );

      // Verify both FARMER and BUYER roles are assigned so farmers can buy produce
      expect(upsertRolesMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: "user-farmer-1", role_code: "FARMER" }),
          expect.objectContaining({ user_id: "user-farmer-1", role_code: "BUYER" }),
        ]),
        { onConflict: "user_id,role_code" }
      );
    });

    it("registers an Equipment Owner with machinery details and assigns EQUIPMENT_OWNER + BUYER roles", async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: { id: "user-eq-1", email: "owner@example.com", identities: [{ id: "3" }] },
          session: null,
        },
        error: null,
      });

      const upsertProfileMock = vi.fn().mockResolvedValue({ error: null });
      const upsertRolesMock = vi.fn().mockResolvedValue({ error: null });
      const upsertBizMock = vi.fn().mockResolvedValue({ error: null });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "profiles") return { upsert: upsertProfileMock };
        if (table === "user_roles") return { upsert: upsertRolesMock };
        if (table === "business_profiles") return { upsert: upsertBizMock };
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      });

      const formData = new FormData();
      formData.set("roleType", "SERVICE_PROVIDER");
      formData.set("providerSubtype", "EQUIPMENT_OWNER");
      formData.set("fullName", "Chinedu Okeke");
      formData.set("businessName", "Okeke Agro Tractors & Implements");
      formData.set("servicesOffered", "John Deere 75HP, Disc Ploughs, Combine Harvesters");
      formData.set("email", "owner@example.com");
      formData.set("phone", "08033334444");
      formData.set("password", "TractorPower123!");
      formData.set("confirmPassword", "TractorPower123!");
      formData.set("state", "Kaduna");
      formData.set("lga", "Chikun");

      await expect(signUpAction(null, formData)).rejects.toThrow(
        "NEXT_REDIRECT: /auth/login?registered=true&email=owner%40example.com&verify=true"
      );

      expect(upsertRolesMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: "user-eq-1", role_code: "EQUIPMENT_OWNER" }),
          expect.objectContaining({ user_id: "user-eq-1", role_code: "BUYER" }),
        ]),
        { onConflict: "user_id,role_code" }
      );
    });

    it("rejects registration when passwords do not match", async () => {
      const formData = new FormData();
      formData.set("email", "mismatch@example.com");
      formData.set("password", "Password123!");
      formData.set("confirmPassword", "DifferentPassword123!");

      const result = await signUpAction(null, formData);
      expect(result.success).toBe(false);
      expect(result.errors?.confirmPassword).toBeDefined();
    });
  });

  describe("2. Post-Login Role-Aware Redirect Destinations", () => {
    it("redirects BUYER-only users to the general customer marketplace homepage /", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "buyer-only-1" } },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ role_code: "BUYER" }],
          }),
        }),
      });

      const formData = new FormData();
      formData.set("email", "buyer@example.com");
      formData.set("password", "Pass12345");

      await expect(signInAction(null, formData)).rejects.toThrow("NEXT_REDIRECT: /");
    });

    it("redirects FARMER users to the dedicated farmer workspace /farmer", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "farmer-user-1" } },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ role_code: "FARMER" }, { role_code: "BUYER" }],
          }),
        }),
      });

      const formData = new FormData();
      formData.set("email", "farmer@example.com");
      formData.set("password", "Pass12345");

      await expect(signInAction(null, formData)).rejects.toThrow("NEXT_REDIRECT: /farmer");
    });

    it("redirects EQUIPMENT_OWNER users to /equipment/owner", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "owner-user-1" } },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ role_code: "EQUIPMENT_OWNER" }, { role_code: "BUYER" }],
          }),
        }),
      });

      const formData = new FormData();
      formData.set("email", "owner@example.com");
      formData.set("password", "Pass12345");

      await expect(signInAction(null, formData)).rejects.toThrow("NEXT_REDIRECT: /equipment/owner");
    });

    it("redirects SERVICE_PROVIDER users to /services/provider", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "service-user-1" } },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ role_code: "SERVICE_PROVIDER" }, { role_code: "BUYER" }],
          }),
        }),
      });

      const formData = new FormData();
      formData.set("email", "service@example.com");
      formData.set("password", "Pass12345");

      await expect(signInAction(null, formData)).rejects.toThrow("NEXT_REDIRECT: /services/provider");
    });

    it("redirects BUSINESS users to /business", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "biz-user-1" } },
      });

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ role_code: "BUSINESS" }, { role_code: "BUYER" }],
          }),
        }),
      });

      const formData = new FormData();
      formData.set("email", "biz@example.com");
      formData.set("password", "Pass12345");

      await expect(signInAction(null, formData)).rejects.toThrow("NEXT_REDIRECT: /business");
    });

    it("preserves safe relative next redirect parameter when logging in", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });

      const formData = new FormData();
      formData.set("email", "buyer@example.com");
      formData.set("password", "Pass12345");
      formData.set("next", "/cart");

      await expect(signInAction(null, formData)).rejects.toThrow("NEXT_REDIRECT: /cart");
    });
  });
});
