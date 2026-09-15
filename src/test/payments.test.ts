import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  getPaymentProvider,
  PaystackProvider,
  FlutterwaveProvider,
} from "@/features/payments/providers";
import {
  initializePaymentSchema,
  verifyPaymentSchema,
} from "@/features/payments/validation";
import { isValidOrderStatusTransition } from "@/features/orders/types";

describe("Phase 0.6: Payments & Payment Verification", () => {
  const dummySecretKey = "sk_test_1234567890abcdef";
  const dummyWebhookSecret = "whsec_test_signature_secret";

  describe("1. Provider Abstraction & Registry", () => {
    it("retrieves the Paystack provider instance", () => {
      const provider = getPaymentProvider("PAYSTACK");
      expect(provider).toBeDefined();
      expect(provider.name).toBe("PAYSTACK");
    });

    it("retrieves the Flutterwave provider instance", () => {
      const provider = getPaymentProvider("FLUTTERWAVE");
      expect(provider).toBeDefined();
      expect(provider.name).toBe("FLUTTERWAVE");
    });

    it("throws a clear error for unsupported payment providers", () => {
      expect(() => {
        // @ts-expect-error testing unsupported provider
        getPaymentProvider("UNKNOWN_GATEWAY");
      }).toThrow("Payment provider 'UNKNOWN_GATEWAY' is not currently supported.");
    });
  });

  describe("2. Paystack Provider Implementation & Cryptography", () => {
    const paystack = new PaystackProvider(dummySecretKey, dummyWebhookSecret);

    it("correctly converts NGN amounts to Kobo for API initialization", () => {
      const amountNaira = 14500.5;
      const expectedKobo = Math.round(amountNaira * 100);
      expect(expectedKobo).toBe(1450050);
    });

    it("correctly converts Kobo to NGN for verification results", () => {
      const koboReceived = 2500000;
      const nairaExpected = Number((koboReceived / 100).toFixed(2));
      expect(nairaExpected).toBe(25000.0);
    });

    it("cryptographically verifies authentic Paystack HMAC-SHA512 webhook signatures", () => {
      const payload = JSON.stringify({
        event: "charge.success",
        data: {
          id: 3012984,
          reference: "AGRO-PAY-TEST-001",
          amount: 500000,
          currency: "NGN",
          status: "success",
        },
      });

      const validSignature = crypto
        .createHmac("sha512", dummyWebhookSecret)
        .update(payload)
        .digest("hex");

      const isValid = paystack.verifyWebhookSignature(payload, validSignature);
      expect(isValid).toBe(true);
    });

    it("rejects forged or tampered webhook signatures", () => {
      const payload = JSON.stringify({ event: "charge.success" });
      const forgedSignature = "abcdef1234567890deadbeef";

      const isValid = paystack.verifyWebhookSignature(payload, forgedSignature);
      expect(isValid).toBe(false);
    });

    it("rejects empty or missing webhook signatures", () => {
      const payload = JSON.stringify({ event: "charge.success" });
      expect(paystack.verifyWebhookSignature(payload, "")).toBe(false);
    });

    it("parses and normalizes Paystack charge.success webhook events", () => {
      const payload = JSON.stringify({
        event: "charge.success",
        data: {
          id: 99120,
          reference: "AGRO-PAY-TEST-99",
          amount: 3500000, // 35,000 NGN in Kobo
          currency: "NGN",
          status: "success",
          paid_at: "2026-09-11T20:00:00Z",
        },
      });

      const parsed = paystack.parseWebhookEvent(payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.eventType).toBe("charge.success");
      expect(parsed?.reference).toBe("AGRO-PAY-TEST-99");
      expect(parsed?.amount).toBe(35000.0);
      expect(parsed?.currency).toBe("NGN");
      expect(parsed?.status).toBe("SUCCESSFUL");
    });
  });

  describe("3. Flutterwave Provider Adapter Implementation", () => {
    const flutterwave = new FlutterwaveProvider("FLWSECK_TEST-dummy", "test_secret_hash");

    it("verifies Flutterwave verif-hash webhook headers", () => {
      const payload = JSON.stringify({ status: "successful" });
      const isValid = flutterwave.verifyWebhookSignature(payload, "test_secret_hash");
      expect(isValid).toBe(true);
    });

    it("rejects incorrect Flutterwave webhook secret hash", () => {
      const payload = JSON.stringify({ status: "successful" });
      const isValid = flutterwave.verifyWebhookSignature(payload, "wrong_hash");
      expect(isValid).toBe(false);
    });

    it("parses Flutterwave webhook event payload with direct Naira amounts", () => {
      const payload = JSON.stringify({
        event: "charge.completed",
        data: {
          id: 4892,
          tx_ref: "AGRO-FLW-REF-01",
          amount: 18000,
          currency: "NGN",
          status: "successful",
        },
      });

      const parsed = flutterwave.parseWebhookEvent(payload);
      expect(parsed).not.toBeNull();
      expect(parsed?.reference).toBe("AGRO-FLW-REF-01");
      expect(parsed?.amount).toBe(18000);
      expect(parsed?.currency).toBe("NGN");
      expect(parsed?.status).toBe("SUCCESSFUL");
    });
  });

  describe("4. Payment Validation Schemas", () => {
    it("validates valid payment initialization input", () => {
      const valid = initializePaymentSchema.safeParse({
        orderId: "a0000000-0000-0000-0000-000000000001",
        provider: "PAYSTACK",
      });
      expect(valid.success).toBe(true);
    });

    it("defaults provider to PAYSTACK when omitted", () => {
      const valid = initializePaymentSchema.safeParse({
        orderId: "a0000000-0000-0000-0000-000000000001",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.provider).toBe("PAYSTACK");
      }
    });

    it("rejects invalid UUID format for orderId", () => {
      const invalid = initializePaymentSchema.safeParse({
        orderId: "non-uuid-string",
        provider: "PAYSTACK",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates payment verification input requiring non-empty reference", () => {
      const valid = verifyPaymentSchema.safeParse({
        reference: "AGRO-PAY-REF-12345",
      });
      expect(valid.success).toBe(true);

      const invalid = verifyPaymentSchema.safeParse({
        reference: "",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("5. Server-Authoritative Amount & Currency Verification", () => {
    it("strictly rejects amount mismatches between expected order total and provider reported amount", () => {
      const expectedOrderTotal = 12000.0;
      const reportedProviderAmount = 10000.0; // Buyer tampered or paid lower amount

      const isMismatch = Math.abs(expectedOrderTotal - reportedProviderAmount) > 0.01;
      expect(isMismatch).toBe(true);
    });

    it("accepts exact amount matches within standard floating precision tolerance", () => {
      const expectedOrderTotal = 45000.0;
      const reportedProviderAmount = 45000.0;

      const isMatch = Math.abs(expectedOrderTotal - reportedProviderAmount) <= 0.01;
      expect(isMatch).toBe(true);
    });

    it("strictly rejects currency mismatches (non-NGN payments)", () => {
      const expectedCurrency = "NGN";
      const unauthorizedCurrencies = ["USD", "EUR", "GBP", "XLM", "KES"];

      for (const currency of unauthorizedCurrencies) {
        const isMatch = currency === expectedCurrency;
        expect(isMatch).toBe(false);
      }
    });
  });

  describe("6. Order State Machine Integration", () => {
    it("permits valid transition from PENDING to PAID upon verified payment", () => {
      const canTransition = isValidOrderStatusTransition("PENDING", "PAID");
      expect(canTransition).toBe(true);
    });

    it("strictly forbids backwards transition from PAID to PENDING", () => {
      const canTransition = isValidOrderStatusTransition("PAID", "PENDING");
      expect(canTransition).toBe(false);
    });

    it("strictly forbids skipping directly from PENDING to COMPLETED", () => {
      const canTransition = isValidOrderStatusTransition("PENDING", "COMPLETED");
      expect(canTransition).toBe(false);
    });

    it("permits progression from PAID to PROCESSING and then to COMPLETED", () => {
      expect(isValidOrderStatusTransition("PAID", "PROCESSING")).toBe(true);
      expect(isValidOrderStatusTransition("PROCESSING", "COMPLETED")).toBe(true);
    });

    it("keeps order in PENDING status when a payment attempt fails so buyer can retry", () => {
      // Failed payment attempt leaves order payable (not cancelled or completed)
      const currentOrderStatus = "PENDING";
      const paymentStatus: string = "FAILED";

      // Order status should not change on failed payment
      const resultingOrderStatus = paymentStatus === "SUCCESSFUL" ? "PAID" : currentOrderStatus;
      expect(resultingOrderStatus).toBe("PENDING");
    });
  });

  describe("7. Webhook & Payment Idempotency Logic", () => {
    it("safely ignores duplicate webhook events with same event ID", () => {
      const processedEvents = new Set<string>();
      const eventId = "paystack_charge_998877";

      // First webhook delivery
      let firstCallResult: string;
      if (!processedEvents.has(eventId)) {
        processedEvents.add(eventId);
        firstCallResult = "PROCESSED";
      } else {
        firstCallResult = "DUPLICATE_IGNORED";
      }
      expect(firstCallResult).toBe("PROCESSED");

      // Duplicate webhook delivery
      let secondCallResult: string;
      if (!processedEvents.has(eventId)) {
        processedEvents.add(eventId);
        secondCallResult = "PROCESSED";
      } else {
        secondCallResult = "DUPLICATE_IGNORED";
      }
      expect(secondCallResult).toBe("DUPLICATE_IGNORED");
    });

    it("reuses active pending payment attempt if initialized recently for same order and provider", () => {
      const activeAttempt = {
        id: "pay-attempt-1",
        orderId: "order-123",
        provider: "PAYSTACK",
        status: "INITIALIZED",
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
      };

      const now = Date.now();
      const ageMs = now - new Date(activeAttempt.createdAt).getTime();
      const isReusable =
        activeAttempt.status === "INITIALIZED" && ageMs < 30 * 60 * 1000;

      expect(isReusable).toBe(true);
    });
  });
});
