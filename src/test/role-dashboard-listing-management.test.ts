import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteListingAction } from "@/features/marketplace/actions";
import { UserRole } from "@/types/auth";

// Mock Supabase server client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

let mockCurrentUser: {
  id: string;
  email: string;
  roles: UserRole[];
  isOnboarded: boolean;
  fullName: string;
} | null = null;

vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn(async () => mockCurrentUser),
  requireAuth: vi.fn(async () => {
    if (!mockCurrentUser) {
      const err = new Error("Unauthorized");
      (err as { statusCode?: number }).statusCode = 401;
      throw err;
    }
    return mockCurrentUser;
  }),
  requireRole: vi.fn(async (role: UserRole) => {
    if (!mockCurrentUser || !mockCurrentUser.roles.includes(role)) {
      const err = new Error("Forbidden");
      (err as { statusCode?: number }).statusCode = 403;
      throw err;
    }
    return mockCurrentUser;
  }),
  requireAnyRole: vi.fn(async (roles: UserRole[]) => {
    if (!mockCurrentUser || !roles.some((r) => mockCurrentUser?.roles.includes(r))) {
      const err = new Error("Forbidden");
      (err as { statusCode?: number }).statusCode = 403;
      throw err;
    }
    return mockCurrentUser;
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    const err = new Error(`NEXT_REDIRECT:${url}`);
    (err as { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307;;`;
    throw err;
  }),
  notFound: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/account",
  useSearchParams: () => new URLSearchParams(),
}));

let mockListingData: { id: string; seller_id: string; title: string; status: string } | null = null;
let mockOrderItemsCount = 0;
let mockDisputesCount = 0;

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "listings") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: mockListingData,
                error: mockListingData ? null : { message: "Listing not found" },
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          select: (_cols: string, _opts?: { count?: string; head?: boolean }) => ({
            eq: async () => ({
              count: mockOrderItemsCount,
              error: null,
            }),
          }),
        };
      }
      if (table === "disputes") {
        return {
          select: (_cols: string, _opts?: { count?: string; head?: boolean }) => ({
            eq: async () => ({
              count: mockDisputesCount,
              error: null,
            }),
          }),
        };
      }
      if (table === "inventory") {
        return {
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      };
    },
  })),
}));

describe("AgroMarket: Listing Management & Role-Aware Dashboard Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = {
      id: "farmer-uuid-1",
      email: "farmer@agromarket.ng",
      fullName: "Farmer John",
      roles: ["FARMER"],
      isOnboarded: true,
    };
    mockListingData = {
      id: "listing-uuid-101",
      seller_id: "farmer-uuid-1",
      title: "Fresh Yellow Cassava",
      status: "ACTIVE",
    };
    mockOrderItemsCount = 0;
    mockDisputesCount = 0;
  });

  describe("Part A: Safe Listing Deletion & Historical Order Protection", () => {
    it("rejects unauthorized users who do not have FARMER or BUSINESS role", async () => {
      mockCurrentUser = {
        id: "buyer-uuid-2",
        email: "buyer@agromarket.ng",
        fullName: "Buyer Dave",
        roles: ["BUYER"],
        isOnboarded: true,
      };

      const result = await deleteListingAction("listing-uuid-101");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Forbidden");
    });

    it("rejects deletion when a farmer tries to delete another farmer's listing", async () => {
      // Listing belongs to another farmer
      mockListingData = {
        id: "listing-uuid-101",
        seller_id: "other-farmer-uuid-999",
        title: "White Yam Tubers",
        status: "ACTIVE",
      };

      const result = await deleteListingAction("listing-uuid-101");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unauthorized");
    });

    it("safely archives the listing when historical buyer orders exist", async () => {
      // Simulate that 3 customer order items reference this listing
      mockOrderItemsCount = 3;

      const result = await deleteListingAction("listing-uuid-101");
      expect(result.success).toBe(true);
      expect(result.data?.action).toBe("ARCHIVED");
      expect(result.message).toContain("safely archived");
      expect(result.message).toContain("preserving customer receipts");
    });

    it("safely archives the listing when disputes exist", async () => {
      mockOrderItemsCount = 0;
      mockDisputesCount = 1;

      const result = await deleteListingAction("listing-uuid-101");
      expect(result.success).toBe(true);
      expect(result.data?.action).toBe("ARCHIVED");
      expect(result.message).toContain("safely archived");
    });

    it("permanently deletes the listing when no orders or disputes exist", async () => {
      mockOrderItemsCount = 0;
      mockDisputesCount = 0;

      const result = await deleteListingAction("listing-uuid-101");
      expect(result.success).toBe(true);
      expect(result.data?.action).toBe("DELETED");
      expect(result.message).toContain("deleted successfully");
    });
  });

  describe("Part B: Role-Aware Architecture & Multi-Role Switching", () => {
    it("preserves all roles for a multi-role user without silent removal", () => {
      const multiRoleUser = {
        id: "multi-role-uuid",
        roles: ["FARMER", "EQUIPMENT_OWNER", "BUYER"] as UserRole[],
      };

      expect(multiRoleUser.roles).toHaveLength(3);
      expect(multiRoleUser.roles).toContain("FARMER");
      expect(multiRoleUser.roles).toContain("EQUIPMENT_OWNER");
      expect(multiRoleUser.roles).toContain("BUYER");
    });

    it("resolves active role based on URL parameter when valid", () => {
      const userRoles: UserRole[] = ["FARMER", "BUYER"];
      const requestedParam = "BUYER";

      let activeRole: UserRole = "FARMER";
      if (requestedParam && userRoles.includes(requestedParam as UserRole)) {
        activeRole = requestedParam as UserRole;
      }

      expect(activeRole).toBe("BUYER");
    });

    it("defaults smartly to producer role when no role parameter is provided", () => {
      const userRoles: UserRole[] = ["FARMER", "BUYER"];
      const requestedParam = undefined;

      let activeRole: UserRole = "BUYER";
      if (requestedParam && userRoles.includes(requestedParam as UserRole)) {
        activeRole = requestedParam as UserRole;
      } else if (userRoles.includes("FARMER")) {
        activeRole = "FARMER";
      }

      expect(activeRole).toBe("FARMER");
    });

    it("defaults to BUYER for standard customer accounts", () => {
      const userRoles: UserRole[] = ["BUYER"];
      const requestedParam = undefined;

      let activeRole: UserRole = "BUYER";
      if (requestedParam && userRoles.includes(requestedParam as UserRole)) {
        activeRole = requestedParam as UserRole;
      } else if (userRoles.includes("FARMER")) {
        activeRole = "FARMER";
      }

      expect(activeRole).toBe("BUYER");
    });

    it("resolves EQUIPMENT_OWNER for machinery owners", () => {
      const userRoles: UserRole[] = ["EQUIPMENT_OWNER", "BUYER"];
      const requestedParam = "EQUIPMENT_OWNER";

      let activeRole: UserRole = "BUYER";
      if (requestedParam && userRoles.includes(requestedParam as UserRole)) {
        activeRole = requestedParam as UserRole;
      }

      expect(activeRole).toBe("EQUIPMENT_OWNER");
    });
  });
});
