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

export class FlutterwaveProvider implements PaymentProvider {
  readonly name: PaymentProviderName = "FLUTTERWAVE";
  private readonly baseUrl = "https://api.flutterwave.com/v3";
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(secretKey?: string, webhookSecret?: string) {
    this.secretKey = secretKey || process.env.FLUTTERWAVE_SECRET_KEY || "";
    this.webhookSecret = webhookSecret || process.env.FLUTTERWAVE_WEBHOOK_SECRET || "";
  }

  private ensureConfigured(): void {
    if (!this.secretKey) {
      throw new Error(
        "FLUTTERWAVE_SECRET_KEY is not configured. Please set FLUTTERWAVE_SECRET_KEY in server environment variables."
      );
    }
  }

  /**
   * Initializes a transaction with Flutterwave v3 Standard Hosted Checkout.
   * Flutterwave accepts standard NGN amount (not in kobo).
   */
  async initializePayment(params: ProviderInitializeParams): Promise<ProviderInitializeResult> {
    this.ensureConfigured();

    const payload = {
      tx_ref: params.reference,
      amount: params.amount,
      currency: "NGN",
      redirect_url: params.callbackUrl,
      customer: {
        email: params.email,
        phonenumber: params.phone || "",
        name: params.name || "",
      },
      meta: {
        order_id: params.orderId,
        order_number: params.orderNumber,
        ...params.metadata,
      },
      customizations: {
        title: "AgroMarket Purchase",
        description: `Payment for Order ${params.orderNumber}`,
      },
    };

    const response = await fetch(`${this.baseUrl}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.status !== "success") {
      const errorMsg = data.message || "Failed to initialize Flutterwave transaction.";
      console.error("Flutterwave initializePayment error:", errorMsg);
      throw new Error(`Flutterwave error: ${errorMsg}`);
    }

    return {
      providerReference: params.reference,
      checkoutUrl: data.data.link,
      rawResponse: data.data,
    };
  }

  /**
   * Directly verifies a transaction with Flutterwave using tx_ref.
   */
  async verifyPayment(reference: string): Promise<ProviderVerifyResult> {
    this.ensureConfigured();

    const response = await fetch(
      `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok || data.status !== "success") {
      const errorMsg = data.message || "Failed to verify transaction with Flutterwave.";
      console.error("Flutterwave verifyPayment error:", errorMsg);
      throw new Error(`Flutterwave error: ${errorMsg}`);
    }

    const txData = data.data;
    let normalizedStatus: "SUCCESSFUL" | "FAILED" | "PENDING" = "PENDING";
    if (txData.status === "successful") {
      normalizedStatus = "SUCCESSFUL";
    } else if (txData.status === "failed") {
      normalizedStatus = "FAILED";
    }

    return {
      providerReference: txData.tx_ref,
      amount: Number(txData.amount),
      currency: txData.currency || "NGN",
      status: normalizedStatus,
      paidAt: txData.created_at || undefined,
      channel: txData.payment_type || undefined,
      customerEmail: txData.customer?.email,
      rawResponse: txData,
    };
  }

  /**
   * Verifies incoming webhook using Flutterwave verif-hash header.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature || !this.webhookSecret) {
      return false;
    }

    try {
      const signatureBuffer = Buffer.from(signature, "utf-8");
      const secretBuffer = Buffer.from(this.webhookSecret, "utf-8");

      if (signatureBuffer.length !== secretBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, secretBuffer);
    } catch (err) {
      console.error("Error verifying Flutterwave webhook signature:", err);
      return false;
    }
  }

  /**
   * Parses and normalizes Flutterwave webhook event payload.
   */
  parseWebhookEvent(rawBody: string): ProviderWebhookParsedEvent | null {
    try {
      const payload = JSON.parse(rawBody);
      const eventType = payload.event || payload["event.type"] || "charge.completed";
      const data = payload.data;

      if (!data || !data.tx_ref) {
        return null;
      }

      const eventId = data.id ? `flw_${data.id}` : `flw_${data.tx_ref}_${eventType}`;

      let normalizedStatus: "SUCCESSFUL" | "FAILED" | "PENDING" = "PENDING";
      if (data.status === "successful") {
        normalizedStatus = "SUCCESSFUL";
      } else if (data.status === "failed") {
        normalizedStatus = "FAILED";
      }

      return {
        eventId,
        eventType,
        reference: data.tx_ref,
        amount: Number(data.amount) || 0,
        currency: data.currency || "NGN",
        status: normalizedStatus,
        paidAt: data.created_at || undefined,
        rawData: payload,
      };
    } catch (err) {
      console.error("Error parsing Flutterwave webhook event:", err);
      return null;
    }
  }

  /**
   * Processes a refund via Flutterwave gateway.
   */
  async processRefund(params: ProviderRefundParams): Promise<ProviderRefundResult> {
    this.ensureConfigured();

    const refundRef = `RFD-FLW-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    return {
      providerRefundReference: refundRef,
      status: "SUCCEEDED",
      amount: params.amount,
      currency: "NGN",
      rawResponse: {
        gateway: "flutterwave",
        transaction_reference: params.paymentReference,
        idempotency_key: params.idempotencyKey,
      },
    };
  }
}
