"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { PaymentService } from "./service";
import { initializePaymentSchema, verifyPaymentSchema } from "./validation";
import {
  ActionResponse,
  InitializePaymentInput,
  InitializePaymentResult,
  VerifyPaymentResult,
  PaymentProviderName,
} from "./types";

/**
 * Initializes a payment attempt for a buyer's order.
 * Server action: authenticated buyer, derives amount and currency server-side.
 */
export async function initializePaymentAction(
  input: InitializePaymentInput
): Promise<ActionResponse<InitializePaymentResult>> {
  try {
    const user = await requireAuth();

    const parsed = initializePaymentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid payment initialization input.",
      };
    }

    const { orderId, provider } = parsed.data;

    const result = await PaymentService.initializeOrderPayment({
      orderId,
      buyerId: user.id,
      provider: provider as PaymentProviderName,
    });

    revalidatePath(`/account/orders/${orderId}`);
    revalidatePath(`/account/orders/${orderId}/pay`);

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    console.error("initializePaymentAction error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred during payment initialization.";
    return { success: false, error: message };
  }
}

/**
 * Verifies a payment reference with the payment provider.
 * Atomically transitions order PENDING -> PAID upon verified provider confirmation.
 */
export async function verifyPaymentAction(
  input: { reference: string; provider?: PaymentProviderName }
): Promise<ActionResponse<VerifyPaymentResult>> {
  try {
    const user = await requireAuth();

    const parsed = verifyPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid payment verification input.",
      };
    }

    const { reference, provider } = parsed.data;

    // Enforce ownership: non-admin callers can only verify payments for their own orders
    const isSuperuser = user.roles.includes("ADMIN");
    const expectedBuyerId = isSuperuser ? undefined : user.id;

    const result = await PaymentService.verifyAndProcessPayment(
      reference,
      provider as PaymentProviderName | undefined,
      expectedBuyerId
    );

    revalidatePath("/cart");
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${result.orderId}`);
    revalidatePath("/farmer/orders");

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    console.error("verifyPaymentAction error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred during payment verification.";
    return { success: false, error: message };
  }
}
