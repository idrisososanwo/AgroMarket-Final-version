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

      return new NextResponse("Invalid signature", { status: 401 });
    }

    // 2. Parse event payload
    const parsedEvent = flutterwave.parseWebhookEvent(rawBody);
    if (!parsedEvent) {
      return new NextResponse("Invalid payload", { status: 400 });
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
        return new NextResponse("Event already processed", { status: 200 });
      }
      console.error("Failed to journal Flutterwave webhook event:", insertErr);
    }

    // 4. Process event
    if (parsedEvent.status === "SUCCESSFUL") {
      await PaymentService.verifyAndProcessPayment(parsedEvent.reference, "FLUTTERWAVE");
    }

    return new NextResponse("Webhook processed successfully", { status: 200 });
  } catch (error: unknown) {
    console.error("Flutterwave webhook error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new NextResponse(`Processed with error: ${message}`, { status: 200 });
  }
}
