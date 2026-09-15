import { PaymentProviderName } from "../types";

export interface ProviderInitializeParams {
  orderId: string;
  orderNumber: string;
  amount: number; // In Naira (e.g., 15000.00)
  currency: "NGN";
  email: string;
  name?: string;
  phone?: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderInitializeResult {
  providerReference: string;
  checkoutUrl: string;
  accessCode?: string;
  rawResponse?: Record<string, unknown>;
}

export interface ProviderVerifyResult {
  providerReference: string;
  amount: number; // In Naira (e.g., 15000.00)
  currency: string;
  status: "SUCCESSFUL" | "FAILED" | "PENDING";
  paidAt?: string;
  channel?: string;
  customerEmail?: string;
  rawResponse?: Record<string, unknown>;
}

export interface ProviderWebhookParsedEvent {
  eventId: string;
  eventType: string;
  reference: string;
  amount: number; // In Naira
  currency: string;
  status: "SUCCESSFUL" | "FAILED" | "PENDING";
  paidAt?: string;
  rawData: Record<string, unknown>;
}

export interface ProviderRefundParams {
  paymentReference: string;
  amount: number; // In Naira
  currency: "NGN";
  reason: string;
  idempotencyKey: string;
}

export interface ProviderRefundResult {
  providerRefundReference: string;
  status: "SUCCEEDED" | "PROCESSING" | "FAILED";
  amount: number;
  currency: "NGN";
  rawResponse?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;

  /**
   * Initializes a transaction with the payment gateway.
   * Returns a hosted checkout URL and access code.
   */
  initializePayment(params: ProviderInitializeParams): Promise<ProviderInitializeResult>;

  /**
   * Queries the payment gateway directly using server credentials to verify
   * transaction status and authenticity.
   */
  verifyPayment(reference: string): Promise<ProviderVerifyResult>;

  /**
   * Cryptographically validates incoming webhook request signature.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean;

  /**
   * Normalizes webhook payload into standard AgroMarket event format.
   */
  parseWebhookEvent(rawBody: string): ProviderWebhookParsedEvent | null;

  /**
   * Initiates a refund for a previously successful transaction.
   * Optional capability depending on provider integration.
   */
  processRefund?(params: ProviderRefundParams): Promise<ProviderRefundResult>;
}
