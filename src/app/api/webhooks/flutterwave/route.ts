import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/features/payments/providers";
import { PaymentService } from "@/features/payments/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/audit";

/**
 * Flutterwave Webhook Handler
 * Route: POST /api/webhooks/flutterwave
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

    const signature = req.headers.get("verif-hash");
    const flutterwave = getPaymentProvider("FLUTTERWAVE");

    // 1. Verify verif-hash secret
    if (!signature || !flutterwave.verifyWebhookSignature(rawBody, signature)) {
      console.warn("⚠️ Rejected Flutterwave webhook with invalid signature.");
      await recordAuditLog({
        action: "WEBHOOK_SIGNATURE_REJECTED",
        resourceType: "webhook",
        resourceId: "flutterwave",
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
    const parsedEvent = flutterwave.parseWebhookEvent(rawBody);
    if (!parsedEvent) {
      return new NextResponse("Invalid payload", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const admin = createAdminClient();

    // 3. Webhook Idempotency
    const { error: insertErr } = await admin
      .from("payment_webhook_events")
      .insert({
        provider: "FLUTTERWAVE",
        event_id: parsedEvent.eventId,
        event_type: parsedEvent.eventType,
        payment_reference: parsedEvent.reference,
        payload: parsedEvent.rawData,
        status: "PROCESSED",
      });

    if (insertErr) {
      if (insertErr.code === "23505" || insertErr.message?.includes("uq_payment_webhook_provider_event")) {
        console.log(`ℹ️ Duplicate Flutterwave webhook event ${parsedEvent.eventId} ignored (idempotent).`);
        return new NextResponse("Event already processed", {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        });
      }
      console.error("Failed to journal Flutterwave webhook event:", insertErr);
    }

    // 4. Process event
    if (parsedEvent.status === "SUCCESSFUL") {
      await PaymentService.verifyAndProcessPayment(parsedEvent.reference, "FLUTTERWAVE");
    }

    return new NextResponse("Webhook processed successfully", {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    console.error("Flutterwave webhook processing error:", error);
    // Never leak stack traces or internal errors to webhook callers
    return new NextResponse("Webhook processing error", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
