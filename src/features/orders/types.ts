/**
 * Orders Domain Types & State Machine
 */

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "PARTIALLY_FULFILLED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type OrderItemStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

/**
 * Order Status Lifecycle State Machine.
 */
export const VALID_ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "PROCESSING", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED", "DISPUTED"],
  PROCESSING: ["PARTIALLY_FULFILLED", "COMPLETED", "CANCELLED", "DISPUTED"],
  PARTIALLY_FULFILLED: ["COMPLETED", "DISPUTED"],
  COMPLETED: ["DISPUTED"],
  CANCELLED: [], // Terminal state
  DISPUTED: ["PROCESSING", "COMPLETED", "CANCELLED"],
};

export function isValidOrderStatusTransition(
  current: OrderStatus,
  target: OrderStatus
): boolean {
  if (current === target) return true;
  const allowed = VALID_ORDER_STATUS_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(target));
}

export interface OrderItemDetail {
  id: string;
  orderId: string;
  listingId: string;
  sellerId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  totalPrice: number;
  status: OrderItemStatus;
  createdAt: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerState?: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  status: OrderStatus;
  currency: string;
  subtotalAmount: number;
  deliveryFeeAmount: number;
  discountAmount: number;
  totalAmount: number;
  deliveryAddress: string;
  deliveryState: string;
  deliveryLga: string;
  contactPhone: string;
  deliveryNotes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDetail[];
  sellerCount: number;
  itemCount: number;
}

export interface CreateOrderInput {
  deliveryAddress: string;
  deliveryState: string;
  deliveryLga: string;
  contactPhone: string;
  deliveryNotes?: string;
}
