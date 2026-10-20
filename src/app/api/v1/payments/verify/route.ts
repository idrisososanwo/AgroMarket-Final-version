import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, handleApiError } from "@/lib/auth/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { PaymentService } from "@/features/payments/service";
import { PaymentProviderName } from "@/features/payments/types";
import { ValidationError } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

const verifyPaymentSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(5, "Payment reference is required.")
    .max(100, "Payment reference is too long."),
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE"]).optional(),
});

/**
 * POST /api/v1/payments/verify
 * Verifies a payment reference with the provider and confirms order fulfillment.
 *
 * CRITICAL SAFEGUARDS:
 * - Requires Bearer token authentication.
 * - Enforces server-authoritative ownership: Non-admin users can only verify payments for their own orders.
 * - Verifies the transaction directly with Paystack using server secret keys.
 * - Compares provider-reported amount with database order total.
 * - Idempotent: Safe to call repeatedly without duplicate fulfillment.
 * - Never marks an order paid solely because the mobile client reported success.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireApiAuth(req);

    // 1. Rate Limiting: 30 verification checks per minute per user
    const rateLimit = checkRateLimit(`payment-verify:${user.id}`, 30, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many payment verification requests. Please wait a moment.",
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

    const parsed = verifyPaymentSchema.safeParse(json);
    if (!parsed.success) {
      return handleApiError(parsed.error);
    }

    const { reference, provider } = parsed.data;

    // 3. Enforce Strict Server-Authoritative Ownership:
    // Only the buyer who owns the payment and order may verify it via the public/mobile API.
    // Administrative dispute resolution must remain decoupled in dedicated admin dispute tooling.
    const expectedBuyerId = user.id;

    // 4. Authoritative Verification via PaymentService
    const result = await PaymentService.verifyAndProcessPayment(
      reference,
      provider as PaymentProviderName | undefined,
      expectedBuyerId,
    );

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
