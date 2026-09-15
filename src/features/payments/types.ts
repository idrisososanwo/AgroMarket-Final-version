export type PaymentStatus =
  | "INITIALIZED"
  | "INITIATED"
  | "PENDING"
  | "SUCCESSFUL"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentProviderName =
  | "PAYSTACK"
  | "FLUTTERWAVE"
  | "MONNIFY"
  | "BANK_TRANSFER"
  | "ESCROW_WALLET";

export const PAYMENT_PROVIDERS: readonly PaymentProviderName[] = [
  "PAYSTACK",
  "FLUTTERWAVE",
  "MONNIFY",
  "BANK_TRANSFER",
  "ESCROW_WALLET",
] as const;

export type PaymentMethod =
  | "CARD"
  | "BANK_TRANSFER"
  | "USSD"
  | "WALLET";

export type RefundStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED";

export const VALID_REFUND_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  PENDING: ["PROCESSING", "FAILED"],
  PROCESSING: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: [], // Terminal
  FAILED: ["PROCESSING"], // Can retry failed refund attempt
};

export function isValidRefundTransition(
  current: RefundStatus,
  target: RefundStatus
): boolean {
  if (current === target) return true;
  const allowed = VALID_REFUND_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(target));
}

export interface PaymentDetail {
  id: string;
  orderId: string;
  buyerId: string;
  amount: number;
  currency: "NGN";
  provider: PaymentProviderName;
  providerReference: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  channelMetadata: Record<string, unknown>;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitializePaymentInput {
  orderId: string;
  provider?: PaymentProviderName;
}

export interface InitializePaymentResult {
  paymentId: string;
  provider: PaymentProviderName;
  reference: string;
  checkoutUrl: string;
  accessCode?: string;
  amount: number;
  currency: "NGN";
}

export interface VerifyPaymentResult {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  orderStatus: string;
  amount: number;
  currency: "NGN";
  reference: string;
  message: string;
}

export interface ActionResponse<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface RefundDetail {
  id: string;
  disputeId?: string | null;
  orderId: string;
  paymentId: string;
  buyerId: string;
  sellerId?: string | null;
  orderItemId?: string | null;
  amount: number;
  currency: "NGN";
  reason: string;
  status: RefundStatus;
  provider: string;
  providerRefundReference?: string | null;
  idempotencyKey: string;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRefundInput {
  orderId: string;
  paymentId: string;
  disputeId?: string;
  sellerId?: string;
  orderItemId?: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
}
