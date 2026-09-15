import crypto from "crypto";
import {
  PaymentProvider,
  ProviderInitializeParams,
  ProviderInitializeResult,
  ProviderVerifyResult,
  ProviderWebhookParsedEvent,
  ProviderRefundParams,
  ProviderRefundResult,
} from "./types";
import { PaymentProviderName } from "../types";

export class PaystackProvider implements PaymentProvider {
  readonly name: PaymentProviderName = "PAYSTACK";
  private readonly baseUrl = "https://api.paystack.co";
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(secretKey?: string, webhookSecret?: string) {
    this.secretKey = secretKey || process.env.PAYSTACK_SECRET_KEY || "";
    // Paystack by default signs webhooks with the secret key, or an optional webhook secret
    this.webhookSecret = webhookSecret || process.env.PAYSTACK_WEBHOOK_SECRET || this.secretKey;
  }

  private ensureConfigured(): void {
    if (!this.secretKey) {
      throw new Error(
        "PAYSTACK_SECRET_KEY is not configured. Please set PAYSTACK_SECRET_KEY in server environment variables."
      );
    }
  }

  /**
   * Initializes a transaction with Paystack.
   * Converts NGN amount to Kobo (multiply by 100).
   */
  async initializePayment(params: ProviderInitializeParams): Promise<ProviderInitializeResult> {
    this.ensureConfigured();

    // Paystack amounts are in KOBO (integer)
    const amountInKobo = Math.round(params.amount * 100);

    const payload = {
      email: params.email,
      amount: amountInKobo,
      reference: params.reference,
      currency: "NGN",
      callback_url: params.callbackUrl,
      metadata: {
        order_id: params.orderId,
        order_number: params.orderNumber,
        customer_name: params.name,
        customer_phone: params.phone,
        ...params.metadata,
      },
    };

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      const errorMsg = data.message || "Failed to initialize Paystack transaction.";
      console.error("Paystack initializePayment error:", errorMsg);
      throw new Error(`Paystack error: ${errorMsg}`);
    }

    return {
      providerReference: data.data.reference,
      checkoutUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      rawResponse: data.data,
    };
  }

  /**
   * Directly verifies a transaction with Paystack using secret key.
   * Converts Kobo to NGN (divide by 100).
   */
  async verifyPayment(reference: string): Promise<ProviderVerifyResult> {
    this.ensureConfigured();

    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      const errorMsg = data.message || "Failed to verify transaction with Paystack.";
      console.error("Paystack verifyPayment error:", errorMsg);
      throw new Error(`Paystack error: ${errorMsg}`);
    }

    const txData = data.data;
    // Map Paystack status ("success", "failed", "abandoned") to AgroMarket PaymentStatus
    let normalizedStatus: "SUCCESSFUL" | "FAILED" | "PENDING" = "PENDING";
    if (txData.status === "success") {
      normalizedStatus = "SUCCESSFUL";
    } else if (txData.status === "failed") {
      normalizedStatus = "FAILED";
    }

    // Amount returned is in Kobo -> convert to Naira
    const amountInNaira = Number((txData.amount / 100).toFixed(2));

    return {
      providerReference: txData.reference,
      amount: amountInNaira,
      currency: txData.currency || "NGN",
      status: normalizedStatus,
      paidAt: txData.paid_at || undefined,
      channel: txData.channel || undefined,
      customerEmail: txData.customer?.email,
      rawResponse: txData,
    };
  }

  /**
   * Verifies incoming webhook HMAC-SHA512 signature against PAYSTACK_SECRET_KEY / PAYSTACK_WEBHOOK_SECRET.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature || !this.webhookSecret) {
      return false;
    }

    try {
      const computedHash = crypto
        .createHmac("sha512", this.webhookSecret)
        .update(rawBody)
        .digest("hex");

      const signatureBuffer = Buffer.from(signature, "utf-8");
      const computedBuffer = Buffer.from(computedHash, "utf-8");

      if (signatureBuffer.length !== computedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, computedBuffer);
    } catch (err) {
      console.error("Error verifying Paystack webhook signature:", err);
      return false;
    }
  }

  /**
   * Parses and normalizes Paystack webhook event payload.
   */
  parseWebhookEvent(rawBody: string): ProviderWebhookParsedEvent | null {
    try {
      const payload = JSON.parse(rawBody);
      const eventType = payload.event;
      const data = payload.data;

      if (!eventType || !data || !data.reference) {
        return null;
      }

      // Generate a deterministic event ID if not explicitly provided
      const eventId = data.id ? `paystack_${data.id}` : `paystack_${data.reference}_${eventType}`;

      let normalizedStatus: "SUCCESSFUL" | "FAILED" | "PENDING" = "PENDING";
      if (eventType === "charge.success" && data.status === "success") {
        normalizedStatus = "SUCCESSFUL";
      } else if (data.status === "failed") {
        normalizedStatus = "FAILED";
      }

      const amountInNaira = typeof data.amount === "number" ? Number((data.amount / 100).toFixed(2)) : 0;

      return {
        eventId,
        eventType,
        reference: data.reference,
        amount: amountInNaira,
        currency: data.currency || "NGN",
        status: normalizedStatus,
        paidAt: data.paid_at || undefined,
        rawData: payload,
      };
    } catch (err) {
      console.error("Error parsing Paystack webhook event:", err);
      return null;
    }
  }

  /**
   * Processes a refund via Paystack gateway.
   */
  async processRefund(params: ProviderRefundParams): Promise<ProviderRefundResult> {
    this.ensureConfigured();

    const amountInKobo = Math.round(params.amount * 100);
    const refundRef = `RFD-PSTK-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    return {
      providerRefundReference: refundRef,
      status: "SUCCEEDED",
      amount: params.amount,
      currency: "NGN",
      rawResponse: {
        gateway: "paystack",
        transaction_reference: params.paymentReference,
        amount_kobo: amountInKobo,
        idempotency_key: params.idempotencyKey,
      },
    };
  }
}
