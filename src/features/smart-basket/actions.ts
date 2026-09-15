"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { SmartBasketService } from "./service";
import {
  ActionResponse,
  addSmartBasketToCartSchema,
  generateBasketSchema,
  updateBasketFeedbackSchema,
  updateUserPreferencesSchema,
} from "./validation";
import {
  GenerateBasketInput,
  SmartBasketResult,
  UpdateUserPreferencesInput,
  UserPreferences,
} from "./types";

/**
 * Server Action: Save or update buyer Smart Basket preferences.
 */
export async function saveUserPreferencesAction(
  input: UpdateUserPreferencesInput
): Promise<ActionResponse<UserPreferences>> {
  try {
    const user = await requireAuth();
    const validated = updateUserPreferencesSchema.parse(input);
    const saved = await SmartBasketService.saveUserPreferences(user.id, validated);

    revalidatePath("/smart-basket");
    revalidatePath("/account");

    return {
      success: true,
      data: saved,
    };
  } catch (err: unknown) {
    console.error("saveUserPreferencesAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to save preferences.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Generates a deterministic Smart Basket produce recommendation.
 */
export async function generateSmartBasketAction(
  input: GenerateBasketInput
): Promise<ActionResponse<SmartBasketResult>> {
  try {
    const user = await requireAuth();
    const validated = generateBasketSchema.parse(input);
    const result = await SmartBasketService.generateSmartBasket(user.id, validated);

    revalidatePath("/smart-basket");

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    console.error("generateSmartBasketAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate smart basket.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Authoritatively adds selected recommendations into the user's cart.
 */
export async function addSmartBasketToCartAction(input: {
  recommendationId: string;
  items: Array<{ listingId: string; quantity: number }>;
}): Promise<ActionResponse<{ addedCount: number; skippedCount: number; messages: string[] }>> {
  try {
    const user = await requireAuth();
    const validated = addSmartBasketToCartSchema.parse(input);
    const res = await SmartBasketService.addSmartBasketToCart(
      user.id,
      validated.recommendationId,
      validated.items
    );

    revalidatePath("/cart");
    revalidatePath("/smart-basket");

    return {
      success: res.success,
      data: {
        addedCount: res.addedCount,
        skippedCount: res.skippedCount,
        messages: res.messages,
      },
    };
  } catch (err: unknown) {
    console.error("addSmartBasketToCartAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to add items to cart.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Records user feedback on a recommendation.
 */
export async function updateBasketFeedbackAction(input: {
  recommendationId: string;
  status: "ACCEPTED" | "MODIFIED" | "REJECTED";
}): Promise<ActionResponse<{ status: string }>> {
  try {
    const user = await requireAuth();
    const validated = updateBasketFeedbackSchema.parse(input);
    await SmartBasketService.updateBasketFeedback(
      user.id,
      validated.recommendationId,
      validated.status
    );

    revalidatePath("/smart-basket");

    return {
      success: true,
      data: { status: validated.status },
    };
  } catch (err: unknown) {
    console.error("updateBasketFeedbackAction error:", err);
    const message = err instanceof Error ? err.message : "Failed to update feedback.";
    return { success: false, error: message };
  }
}
