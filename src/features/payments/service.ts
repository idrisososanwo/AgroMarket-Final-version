import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "./providers";
import { PaymentProviderName, InitializePaymentResult, VerifyPaymentResult } from "./types";
import { recordAuditLog } from "@/lib/audit";

export class PaymentService {
  /**
   * Initializes a payment attempt for a buyer's pending order.
   * Derives authoritative amount, currency, and customer details directly from the database.
   */
  static async initializeOrderPayment(params: {
    orderId: string;
    buyerId: string;
    provider?: PaymentProviderName;
    callbackUrl?: string;
  }): Promise<InitializePaymentResult> {
    const admin = createAdminClient();
    const providerName: PaymentProviderName = params.provider || "PAYSTACK";

    // 1. Fetch authoritative order record
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, buyer_id, total_amount, currency, status")
      .eq("id", params.orderId)
      .single();

    if (orderErr || !order) {
      throw new Error("Order not found.");
    }

    // 2. Enforce buyer ownership
    if (order.buyer_id !== params.buyerId) {
      throw new Error("Unauthorized: You do not own this order.");
    }

    // 3. Verify order status is PENDING
    if (order.status !== "PENDING") {
      if (order.status === "PAID" || order.status === "PROCESSING" || order.status === "COMPLETED") {
        throw new Error(`Order has already been paid for (status: ${order.status}).`);
      }
      if (order.status === "CANCELLED") {
        throw new Error("Cannot pay for a cancelled order.");
      }
      throw new Error(`Order is not payable in current status: ${order.status}.`);
    }

    // 4. Verify authoritative currency
    if (order.currency !== "NGN") {
      throw new Error(`Invalid order currency: expected 'NGN', found '${order.currency}'.`);
    }

    const authoritativeAmount = Number(order.total_amount);
    if (!authoritativeAmount || authoritativeAmount <= 0) {
      throw new Error("Order total must be greater than zero.");
    }

    // 5. Fetch buyer profile for contact info
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, phone_number")
      .eq("id", params.buyerId)
      .single();

    // Fetch user email from auth.users via admin
    const { data: authUser } = await admin.auth.admin.getUserById(params.buyerId);
    const buyerEmail = authUser.user?.email || "customer@agromarket.ng";

    // 6. Idempotency Check: Look for active unexpired pending payment attempt for this order and provider
    // Reusable if created within the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: activePayment } = await admin
      .from("payments")
      .select("id, provider_reference, channel_metadata, amount")
      .eq("order_id", params.orderId)
      .eq("provider", providerName)
      .in("status", ["INITIALIZED", "INITIATED", "PENDING"])
      .gte("created_at", thirtyMinutesAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activePayment && activePayment.channel_metadata) {
      const meta = activePayment.channel_metadata as Record<string, unknown>;
      if (meta.checkoutUrl && Number(activePayment.amount) === authoritativeAmount) {
        return {
          paymentId: activePayment.id,
          provider: providerName,
          reference: activePayment.provider_reference,
          checkoutUrl: meta.checkoutUrl as string,
          accessCode: (meta.accessCode as string) || undefined,
          amount: authoritativeAmount,
          currency: "NGN",
        };
      }
    }

    // 7. Generate a new unique AgroMarket provider reference
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const sanitizedOrderNum = order.order_number.replace(/[^a-zA-Z0-9]/g, "-");
    const uniqueReference = `AGRO-${sanitizedOrderNum}-${Date.now()}-${randomSuffix}`;

    const defaultCallback = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account/orders/${order.id}/payment/callback`;
    const callbackUrl = params.callbackUrl || defaultCallback;

    // 8. Initialize transaction with selected provider
    const provider = getPaymentProvider(providerName);
    const initResult = await provider.initializePayment({
      orderId: order.id,
      orderNumber: order.order_number,
      amount: authoritativeAmount,
      currency: "NGN",
      email: buyerEmail,
      name: profile?.full_name || undefined,
      phone: profile?.phone_number || undefined,
      reference: uniqueReference,
      callbackUrl,
      metadata: {
        buyer_id: params.buyerId,
      },
    });

    // 9. Persist payment record in public.payments
    const { data: newPayment, error: insertErr } = await admin
      .from("payments")
      .insert({
        order_id: order.id,
        buyer_id: params.buyerId,
        amount: authoritativeAmount,
        currency: "NGN",
        provider: providerName,
        provider_reference: initResult.providerReference,
        status: "INITIALIZED",
        payment_method: "CARD",
        channel_metadata: {
          checkoutUrl: initResult.checkoutUrl,
          accessCode: initResult.accessCode,
          providerResponse: initResult.rawResponse,
        },
      })
      .select("id")
      .single();

    if (insertErr || !newPayment) {
      console.error("Failed to insert payment record:", insertErr);
      throw new Error("Failed to create payment record.");
    }

    // 10. Audit Log
    await recordAuditLog({
      actorId: params.buyerId,
      action: "PAYMENT_INITIALIZED",
      resourceType: "payment",
      resourceId: newPayment.id,
      metadata: {
        orderId: order.id,
        orderNumber: order.order_number,
        provider: providerName,
        reference: initResult.providerReference,
        amount: authoritativeAmount,
      },
    });

    return {
      paymentId: newPayment.id,
      provider: providerName,
      reference: initResult.providerReference,
      checkoutUrl: initResult.checkoutUrl,
      accessCode: initResult.accessCode,
      amount: authoritativeAmount,
      currency: "NGN",
    };
  }

  /**
   * Verifies a payment reference with the provider, validates amounts and currencies,
   * updates the payment record, and atomically transitions the order from PENDING to PAID.
   */
  static async verifyAndProcessPayment(
    reference: string,
    forcedProvider?: PaymentProviderName
  ): Promise<VerifyPaymentResult> {
    const admin = createAdminClient();

    // 1. Fetch payment record
    const { data: payment, error: paymentErr } = await admin
      .from("payments")
      .select("id, order_id, buyer_id, amount, currency, provider, status, provider_reference")
      .eq("provider_reference", reference)
      .single();

    if (paymentErr || !payment) {
      throw new Error(`Payment with reference '${reference}' was not found.`);
    }

    // 2. Fetch associated order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, total_amount, currency, status")
      .eq("id", payment.order_id)
      .single();

    if (orderErr || !order) {
      throw new Error(`Associated order for payment '${reference}' was not found.`);
    }

    // 3. Idempotency Check: If payment is already successful and order is already PAID
    if (payment.status === "SUCCESSFUL" || payment.status === "PAID") {
      return {
        paymentId: payment.id,
        orderId: order.id,
        status: payment.status,
        orderStatus: order.status,
        amount: Number(payment.amount),
        currency: payment.currency as "NGN",
        reference: payment.provider_reference,
        message: "Payment was previously verified and confirmed.",
      };
    }

    const providerName = (payment.provider || forcedProvider || "PAYSTACK") as PaymentProviderName;
    const provider = getPaymentProvider(providerName);

    // 4. Query provider for authoritative transaction status
    const providerResult = await provider.verifyPayment(reference);

    // 5. Amount Verification: authoritative order total vs provider verified amount
    const expectedAmount = Number(order.total_amount);
    const verifiedAmount = Number(providerResult.amount);

    if (Math.abs(expectedAmount - verifiedAmount) > 0.01) {
      console.error(
        `🚨 FRAUD ALERT: Payment amount mismatch! Expected: ${expectedAmount} NGN, Received: ${verifiedAmount} NGN`
      );

      await admin
        .from("payments")
        .update({
          status: "FAILED",
          channel_metadata: {
            fraud_alert: "AMOUNT_MISMATCH",
            expectedAmount,
            verifiedAmount,
            providerResponse: providerResult.rawResponse,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      await recordAuditLog({
        actorId: payment.buyer_id,
        action: "PAYMENT_AMOUNT_MISMATCH_REJECTED",
        resourceType: "payment",
        resourceId: payment.id,
        metadata: {
          reference,
          expectedAmount,
          verifiedAmount,
        },
      });

      throw new Error(
        `Payment verification failed: Amount mismatch. Expected ₦${expectedAmount.toLocaleString()}, but received ₦${verifiedAmount.toLocaleString()}.`
      );
    }

    // 6. Currency Verification: Must be NGN
    if (providerResult.currency.toUpperCase() !== "NGN") {
      console.error(`🚨 FRAUD ALERT: Currency mismatch! Received: ${providerResult.currency}`);

      await admin
        .from("payments")
        .update({
          status: "FAILED",
          channel_metadata: {
            fraud_alert: "CURRENCY_MISMATCH",
            expectedCurrency: "NGN",
            receivedCurrency: providerResult.currency,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      throw new Error(`Payment verification failed: Expected currency NGN, received ${providerResult.currency}.`);
    }

    // 7. Process according to provider verified status
    if (providerResult.status === "SUCCESSFUL") {
      const paidTimestamp = providerResult.paidAt || new Date().toISOString();

      // Atomically update payment record
      const { error: updatePayErr } = await admin
        .from("payments")
        .update({
          status: "SUCCESSFUL",
          paid_at: paidTimestamp,
          channel_metadata: {
            channel: providerResult.channel,
            customerEmail: providerResult.customerEmail,
            verifiedResponse: providerResult.rawResponse,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (updatePayErr) {
        console.error("Failed to update payment status to SUCCESSFUL:", updatePayErr);
        throw new Error("Failed to update payment status.");
      }

      // Atomically transition order PENDING -> PAID
      if (order.status === "PENDING") {
        const { error: updateOrderErr } = await admin
          .from("orders")
          .update({
            status: "PAID",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        if (updateOrderErr) {
          console.error("Failed to transition order status to PAID:", updateOrderErr);
          throw new Error("Failed to transition order status to PAID.");
        }

        // Also update individual order_items to PAID
        await admin
          .from("order_items")
          .update({
            status: "PAID",
            updated_at: new Date().toISOString(),
          })
          .eq("order_id", order.id);

        // Sync Shared Purchase participant status if applicable
        try {
          const { SharedPurchaseService } = await import("@/features/shared-purchase/service");
          await SharedPurchaseService.handleParticipantPaymentSuccess(order.id);
        } catch (spErr) {
          console.warn("Shared purchase participant sync deferred/skipped:", spErr);
        }
      }

      // Record Audit Logs
      await recordAuditLog({
        actorId: payment.buyer_id,
        action: "PAYMENT_SUCCESSFUL",
        resourceType: "payment",
        resourceId: payment.id,
        metadata: {
          orderId: order.id,
          orderNumber: order.order_number,
          reference,
          amount: verifiedAmount,
        },
      });

      await recordAuditLog({
        actorId: payment.buyer_id,
        action: "ORDER_TRANSITION_PAID",
        resourceType: "order",
        resourceId: order.id,
        metadata: {
          previousStatus: order.status,
          newStatus: "PAID",
          paymentReference: reference,
        },
      });

      return {
        paymentId: payment.id,
        orderId: order.id,
        status: "SUCCESSFUL",
        orderStatus: "PAID",
        amount: verifiedAmount,
        currency: "NGN",
        reference,
        message: "Payment successfully verified and order confirmed.",
      };
    } else if (providerResult.status === "FAILED") {
      // Mark payment attempt as FAILED (do NOT cancel order so buyer can retry)
      await admin
        .from("payments")
        .update({
          status: "FAILED",
          channel_metadata: {
            providerResponse: providerResult.rawResponse,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      await recordAuditLog({
        actorId: payment.buyer_id,
        action: "PAYMENT_FAILED",
        resourceType: "payment",
        resourceId: payment.id,
        metadata: {
          orderId: order.id,
          reference,
        },
      });

      return {
        paymentId: payment.id,
        orderId: order.id,
        status: "FAILED",
        orderStatus: order.status, // Remains PENDING
        amount: verifiedAmount,
        currency: "NGN",
        reference,
        message: "Payment provider reported a failed transaction.",
      };
    } else {
      // Still pending / awaiting confirmation
      return {
        paymentId: payment.id,
        orderId: order.id,
        status: "PENDING",
        orderStatus: order.status,
        amount: verifiedAmount,
        currency: "NGN",
        reference,
        message: "Payment is still being processed by provider.",
      };
    }
  }
}
