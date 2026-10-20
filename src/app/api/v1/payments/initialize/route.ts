import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, handleApiError } from "@/lib/auth/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { PaymentService } from "@/features/payments/service";
import { PaymentProviderName } from "@/features/payments/types";
import { ValidationError } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

const initializePaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order identifier format."),
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE"]).default("PAYSTACK"),
  callbackUrl: z.string().url("Invalid callback URL format.").optional(),
});

/**
 * POST /api/v1/payments/initialize
 * Initializes payment for an authenticated buyer's pending order.
 *
 * CRITICAL SAFEGUARDS:
 * - Requires Bearer token authentication.
 * - Buyer identity is strictly derived from the verified token principal.
 * - Authoritative amount is retrieved directly from database `orders.total_amount`.
 * - Never accepts client-supplied amount, currency, or payment status.
 * - Reuses existing idempotent PaymentService logic.
 * - Operates strictly in test mode.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth(req);

    // 1. Rate Limiting: 20 payment initializations per minute per user
    const rateLimit = checkRateLimit(`payment-init:${user.id}`, 20, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many payment requests. Please wait a moment before trying again.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // 2. Validate Request Payload
    const json = await req.json().catch(() => null);
    if (!json || typeof json !== "object") {
      throw new ValidationError("Malformed JSON request body.");
    }

    const parsed = initializePaymentSchema.safeParse(json);
    if (!parsed.success) {
      return handleApiError(parsed.error);
    }

    const { orderId, provider, callbackUrl } = parsed.data;

    // 3. Delegate to Authoritative PaymentService
    const result = await PaymentService.initializeOrderPayment({
      orderId,
      buyerId: user.id,
      provider: provider as PaymentProviderName,
      callbackUrl,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
