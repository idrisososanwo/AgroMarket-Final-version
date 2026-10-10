import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/features/payments/providers";
import { PaymentService } from "@/features/payments/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/audit";

/**
 * Paystack Webhook Handler
 * Route: POST /api/webhooks/paystack
 *
 * Implements:
 * 1. Raw body HMAC-SHA512 signature verification via x-paystack-signature header.
 * 2. Database-level event journaling & idempotency via public.payment_webhook_events.
 * 3. Server-authoritative transaction verification and state transition.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!rawBody || rawBody.length > 1024 * 1024) {
      return new NextResponse("Payload invalid or exceeds 1MB limit", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const signature = req.headers.get("x-paystack-signature");
    const paystack = getPaymentProvider("PAYSTACK");

    // 1. Verify cryptographic signature
    if (!signature || !paystack.verifyWebhookSignature(rawBody, signature)) {
      console.warn("⚠️ Rejected Paystack webhook with invalid signature.");
      await recordAuditLog({
        action: "WEBHOOK_SIGNATURE_REJECTED",
        resourceType: "webhook",
        resourceId: "paystack",
        metadata: {
          ip: req.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return new NextResponse("Invalid signature", {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // 2. Parse event payload
    const parsedEvent = paystack.parseWebhookEvent(rawBody);
    if (!parsedEvent) {
      return new NextResponse("Invalid payload", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const admin = createAdminClient();

    // 3. Webhook Idempotency: journal event in database
    // Unique constraint on (provider, event_id) prevents double-processing
    const { error: insertErr } = await admin
      .from("payment_webhook_events")
      .insert({
        provider: "PAYSTACK",
        event_id: parsedEvent.eventId,
        event_type: parsedEvent.eventType,
        payment_reference: parsedEvent.reference,
        payload: parsedEvent.rawData,
        status: "PROCESSED",
      });

    if (insertErr) {
      // Check for PostgreSQL unique constraint violation (code 23505)
      if (insertErr.code === "23505" || insertErr.message?.includes("uq_payment_webhook_provider_event")) {
        console.log(`ℹ️ Duplicate Paystack webhook event ${parsedEvent.eventId} ignored (idempotent).`);
        return new NextResponse("Event already processed", {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        });
      }

      console.error("Failed to journal webhook event:", insertErr);
    }

    // 4. Process event if successful charge
    if (parsedEvent.eventType === "charge.success" && parsedEvent.status === "SUCCESSFUL") {
      await PaymentService.verifyAndProcessPayment(parsedEvent.reference, "PAYSTACK");
    }

    await recordAuditLog({
      action: "WEBHOOK_PROCESSED_SUCCESSFULLY",
      resourceType: "webhook",
      resourceId: parsedEvent.eventId,
      metadata: {
        provider: "PAYSTACK",
        eventType: parsedEvent.eventType,
        reference: parsedEvent.reference,
      },
    });

    return new NextResponse("Webhook processed successfully", {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    console.error("Paystack webhook processing error:", error);
    // Never leak stack traces or internal errors to webhook callers
    return new NextResponse("Webhook processing error", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
