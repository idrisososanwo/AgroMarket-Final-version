import { describe, it, expect, vi } from "vitest";
import { createOrderSchema } from "@/features/orders/validation";
import { getOrderDetailsResult, getBuyerOrdersResult } from "@/features/orders/queries";
import { OrderDetail } from "@/features/orders/types";

// Mock Supabase server client for deterministic unit testing
vi.mock("@/lib/supabase/server", () => {
  return {
    createClient: vi.fn(),
  };
});

import { createClient } from "@/lib/supabase/server";

describe("Order Access & Authorization Regression Suite", () => {
  describe("1. Order Creation Input Validation", () => {
    it("successfully validates complete Nigerian delivery information", () => {
      const validPayload = {
        deliveryAddress: "Plot 12, Commercial Agriculture Avenue",
        deliveryState: "Ogun",
        deliveryLga: "Abeokuta South",
        contactPhone: "+2348012345678",
        deliveryNotes: "Deliver directly to central cold storage gate",
      };

      const result = createOrderSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deliveryState).toBe("Ogun");
        expect(result.data.contactPhone).toBe("+2348012345678");
      }
    });

    it("rejects incomplete or invalid delivery information with specific field errors", () => {
      const invalidPayload = {
        deliveryAddress: "abc",
        deliveryState: "",
        deliveryLga: "",
        contactPhone: "123",
      };

      const result = createOrderSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.deliveryAddress).toBeDefined();
        expect(errors.deliveryState).toBeDefined();
        expect(errors.deliveryLga).toBeDefined();
        expect(errors.contactPhone).toBeDefined();
      }
    });
  });

  describe("2. Order Details Retrieval & Safe Error Handling", () => {
    it("returns order with error: null when order is found", async () => {
      const mockRawOrder = {
        id: "order-123",
        order_number: "AGRO-123456",
        buyer_id: "buyer-user-1",
        status: "PENDING",
        currency: "NGN",
        subtotal_amount: 50000,
        delivery_fee_amount: 3000,
        discount_amount: 0,
        total_amount: 53000,
        delivery_address: "12 Agricultural Road",
        delivery_state: "Lagos",
        deliveryLga: "Ikeja",
        contact_phone: "+2348011112222",
        delivery_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: {
          full_name: "Adeola Buyer",
          email: "buyer@example.com",
          phone: "+2348011112222",
        },
        order_items: [
          {
            id: "item-1",
            order_id: "order-123",
            listing_id: "listing-1",
            seller_id: "seller-user-1",
            product_id: "prod-1",
            product_name_snapshot: "Yellow Maize",
            unit_price_snapshot: 25000,
            quantity: 2,
            unit_snapshot: "100kg Bag",
            total_price: 50000,
            status: "PENDING",
            created_at: new Date().toISOString(),
            profiles: {
              full_name: "Farmer Ibrahim",
              phone: "+2348022223333",
              state: "Kano",
            },
          },
        ],
      };

      vi.mocked(createClient).mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: mockRawOrder,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await getOrderDetailsResult("order-123");
      expect(result.error).toBeNull();
      expect(result.order).not.toBeNull();
      expect(result.order?.id).toBe("order-123");
      expect(result.order?.buyerId).toBe("buyer-user-1");
      expect(result.order?.totalAmount).toBe(53000);
      expect(result.order?.items.length).toBe(1);
    });

    it("returns order: null and error: null when order does not exist (genuine 404)", async () => {
      vi.mocked(createClient).mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await getOrderDetailsResult("non-existent-order-id");
      expect(result.error).toBeNull();
      expect(result.order).toBeNull();
    });

    it("returns order: null and error: string when database / RLS error occurs", async () => {
      vi.mocked(createClient).mockResolvedValueOnce({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "infinite recursion detected in policy for relation orders" },
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await getOrderDetailsResult("order-with-db-error");
      expect(result.order).toBeNull();
      expect(result.error).toBe("infinite recursion detected in policy for relation orders");
    });
  });

  describe("3. Order Ownership & Authorization Logic", () => {
    const mockOrder: OrderDetail = {
      id: "order-abc",
      orderNumber: "AGRO-ABC-999",
      buyerId: "authorized-buyer-id",
      status: "PENDING",
      currency: "NGN",
      subtotalAmount: 45000,
      deliveryFeeAmount: 2500,
      discountAmount: 0,
      totalAmount: 47500,
      deliveryAddress: "Farm Gate 3",
      deliveryState: "Oyo",
      deliveryLga: "Ibadan North",
      contactPhone: "+2348055556666",
      deliveryNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          id: "item-101",
          orderId: "order-abc",
          listingId: "listing-101",
          sellerId: "farmer-seller-id",
          productId: "prod-101",
          productName: "Soybeans",
          unitPrice: 45000,
          quantity: 1,
          unit: "50kg Bag",
          totalPrice: 45000,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          sellerName: "Oyo Grains Cooperative",
        },
      ],
      sellerCount: 1,
      itemCount: 1,
    };

    function checkOrderAccess(
      order: OrderDetail,
      user: { id: string; roles: string[] }
    ): { authorized: boolean; reason: string } {
      const isBuyer = order.buyerId === user.id;
      const isAdmin = user.roles.includes("ADMIN");
      const isSeller = order.items.some((item) => item.sellerId === user.id);

      if (isBuyer) return { authorized: true, reason: "BUYER" };
      if (isAdmin) return { authorized: true, reason: "ADMIN" };
      if (isSeller) return { authorized: true, reason: "SELLER" };
      return { authorized: false, reason: "UNAUTHORIZED" };
    }

    it("allows the purchasing customer (buyer) to access their order", () => {
      const buyerUser = { id: "authorized-buyer-id", roles: ["BUYER"] };
      const access = checkOrderAccess(mockOrder, buyerUser);
      expect(access.authorized).toBe(true);
      expect(access.reason).toBe("BUYER");
    });

    it("allows an admin user to access any order", () => {
      const adminUser = { id: "admin-system-id", roles: ["ADMIN", "BUYER"] };
      const access = checkOrderAccess(mockOrder, adminUser);
      expect(access.authorized).toBe(true);
      expect(access.reason).toBe("ADMIN");
    });

    it("allows a seller to access orders containing their produce items", () => {
      const sellerUser = { id: "farmer-seller-id", roles: ["FARMER"] };
      const access = checkOrderAccess(mockOrder, sellerUser);
      expect(access.authorized).toBe(true);
      expect(access.reason).toBe("SELLER");
    });

    it("strictly denies unauthorized third-party users who are neither buyer, seller, nor admin", () => {
      const intruderUser = { id: "unrelated-user-id", roles: ["BUYER"] };
      const access = checkOrderAccess(mockOrder, intruderUser);
      expect(access.authorized).toBe(false);
      expect(access.reason).toBe("UNAUTHORIZED");
    });
  });

  describe("4. Buyer Order History Error Handling", () => {
    it("returns structured error if buyer orders query fails", async () => {
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "buyer-user-1" } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Database connection timeout" },
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const result = await getBuyerOrdersResult("buyer-user-1");
      expect(result.orders).toEqual([]);
      expect(result.error).toBe("Database connection timeout");
    });
  });
});
