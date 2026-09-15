import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/audit";
import { SmartBasketRecommendationEngine } from "./engine";
import {
  generateBasketSchema,
  updateUserPreferencesSchema,
} from "./validation";
import {
  GenerateBasketInput,
  RecommendationStatus,
  SmartBasketItemRecommendation,
  SmartBasketResult,
  UpdateUserPreferencesInput,
  UserPreferences,
} from "./types";

const PORK_PROHIBITED_REGEX = /\b(pig|pork|swine|hog|boar|piglet|bacon|ham|lard)\b/i;

export class SmartBasketService {
  /**
   * Retrieves buyer preferences.
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      dietaryPreferences: data.dietary_preferences || [],
      familySize: Number(data.family_size || 4),
      budgetTargetMonthly: data.budget_target_monthly !== null ? Number(data.budget_target_monthly) : null,
      budgetTargetBasket: data.budget_target_basket !== null ? Number(data.budget_target_basket) : null,
      preferredStaples: data.preferred_staples || [],
      preferredCategories: data.preferred_categories || [],
      excludedProducts: data.excluded_products || [],
      excludedCategories: data.excluded_categories || [],
      purchasingFrequency: data.purchasing_frequency || "BIWEEKLY",
      basketPurpose: data.basket_purpose || "HOUSEHOLD",
      state: data.state,
      lga: data.lga,
      metadata: (data.metadata as Record<string, unknown>) || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Saves or updates buyer preferences with strict user-ownership validation.
   */
  static async saveUserPreferences(
    userId: string,
    input: UpdateUserPreferencesInput
  ): Promise<UserPreferences> {
    const validated = updateUserPreferencesSchema.parse(input);
    const admin = createAdminClient();

    const { data: upserted, error } = await admin
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          budget_target_basket: validated.budgetTargetBasket ?? null,
          budget_target_monthly: validated.budgetTargetMonthly ?? null,
          state: validated.state ?? null,
          lga: validated.lga ?? null,
          family_size: validated.familySize,
          dietary_preferences: validated.dietaryPreferences,
          preferred_staples: validated.preferredStaples,
          preferred_categories: validated.preferredCategories,
          excluded_products: validated.excludedProducts,
          excluded_categories: validated.excludedCategories,
          purchasing_frequency: validated.purchasingFrequency,
          basket_purpose: validated.basketPurpose,
          metadata: (validated.metadata as Record<string, unknown>) || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error || !upserted) {
      throw new Error(`Failed to save user preferences: ${error?.message}`);
    }

    await recordAuditLog({
      actorId: userId,
      action: "USER_PREFERENCES_UPDATED",
      resourceType: "USER_PREFERENCE",
      resourceId: upserted.id,
      newValues: {
        familySize: upserted.family_size,
        budgetTargetBasket: upserted.budget_target_basket,
        state: upserted.state,
      },
    });

    return {
      id: upserted.id,
      userId: upserted.user_id,
      dietaryPreferences: upserted.dietary_preferences || [],
      familySize: Number(upserted.family_size),
      budgetTargetMonthly: upserted.budget_target_monthly !== null ? Number(upserted.budget_target_monthly) : null,
      budgetTargetBasket: upserted.budget_target_basket !== null ? Number(upserted.budget_target_basket) : null,
      preferredStaples: upserted.preferred_staples || [],
      preferredCategories: upserted.preferred_categories || [],
      excludedProducts: upserted.excluded_products || [],
      excludedCategories: upserted.excluded_categories || [],
      purchasingFrequency: upserted.purchasing_frequency,
      basketPurpose: upserted.basket_purpose,
      state: upserted.state,
      lga: upserted.lga,
      metadata: (upserted.metadata as Record<string, unknown>) || {},
      createdAt: upserted.created_at,
      updatedAt: upserted.updated_at,
    };
  }

  /**
   * Generates and persists a fresh, deterministic produce basket recommendation.
   */
  static async generateSmartBasket(
    userId: string,
    input: GenerateBasketInput
  ): Promise<SmartBasketResult> {
    const validated = generateBasketSchema.parse(input);
    const preferences = await this.getUserPreferences(userId);

    const engine = new SmartBasketRecommendationEngine();
    const result = await engine.generateBasket(userId, validated, preferences);

    const admin = createAdminClient();

    // Persist to public.basket_recommendations
    const { data: inserted, error: insErr } = await admin
      .from("basket_recommendations")
      .insert({
        user_id: userId,
        title: result.title,
        recommended_items: result.items as unknown as Record<string, unknown>[],
        estimated_total_cost: result.estimatedTotalCost,
        budget_allocated: result.budgetAllocated,
        estimated_savings: result.estimatedSavings,
        rationale: result.rationale,
        status: "GENERATED",
        engine_version: result.engineVersion,
        state: result.state,
        metadata: result.metadata,
      })
      .select("id, created_at")
      .single();

    if (insErr || !inserted) {
      console.error("Failed to store basket recommendation:", insErr);
      // Even if persistence fails, return the calculated result with generated ID
      return result;
    }

    result.id = inserted.id;
    result.createdAt = inserted.created_at;

    await recordAuditLog({
      actorId: userId,
      action: "SMART_BASKET_GENERATED",
      resourceType: "SMART_BASKET",
      resourceId: inserted.id,
      newValues: {
        itemCount: result.items.length,
        estimatedTotalCost: result.estimatedTotalCost,
        budgetAllocated: result.budgetAllocated,
      },
    });

    return result;
  }

  /**
   * Retrieves the latest recommendation generated for a user.
   */
  static async getLatestBasket(userId: string): Promise<SmartBasketResult | null> {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("basket_recommendations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const items = (data.recommended_items || []) as unknown as SmartBasketItemRecommendation[];
    const budgetAllocated = data.budget_allocated !== null ? Number(data.budget_allocated) : Number(data.estimated_total_cost);
    const estimatedTotal = Number(data.estimated_total_cost);

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      items,
      estimatedTotalCost: estimatedTotal,
      budgetAllocated,
      budgetRemaining: Number((budgetAllocated - estimatedTotal).toFixed(2)),
      estimatedSavings: Number(data.estimated_savings || 0),
      rationale: data.rationale,
      status: (data.status as RecommendationStatus) || "GENERATED",
      engineVersion: data.engine_version || "DETERMINISTIC_V1",
      state: data.state || "Lagos",
      createdAt: data.created_at,
      metadata: {
        generationTimestamp: data.created_at,
        itemCount: items.length,
        categoriesRepresented: Array.from(new Set(items.map((i) => i.categoryName))),
        explanationNotes: [],
        isDeterministic: true,
        ...((data.metadata as Record<string, unknown>) || {}),
      },
    };
  }

  /**
   * Authoritatively adds selected recommended items to the buyer's existing cart.
   *
   * Enforces:
   * 1. Re-validates each listing's active status from authoritative database
   * 2. Re-validates current inventory and MOQ
   * 3. Re-validates anti-pork non-negotiable policy
   * 4. Ignores any client-supplied pricing; uses current server price
   * 5. Updates recommendation status to ACCEPTED or MODIFIED
   */
  static async addSmartBasketToCart(
    userId: string,
    recommendationId: string,
    selectedItems: Array<{ listingId: string; quantity: number }>
  ): Promise<{
    success: boolean;
    addedCount: number;
    skippedCount: number;
    messages: string[];
  }> {
    const admin = createAdminClient();

    // 1. Verify recommendation exists and belongs to this user
    const { data: rec, error: recErr } = await admin
      .from("basket_recommendations")
      .select("id, user_id, recommended_items")
      .eq("id", recommendationId)
      .single();

    if (recErr || !rec || rec.user_id !== userId) {
      throw new Error("Smart basket recommendation not found or access denied.");
    }

    // 2. Retrieve or create user's shopping cart
    let { data: cart } = await admin
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!cart) {
      const { data: newCart, error: createCartErr } = await admin
        .from("carts")
        .insert({ user_id: userId })
        .select("id")
        .single();

      if (createCartErr || !newCart) {
        throw new Error("Failed to initialize shopping cart.");
      }
      cart = newCart;
    }

    let addedCount = 0;
    let skippedCount = 0;
    const messages: string[] = [];

    // 3. Process each selected item authoritatively
    for (const item of selectedItems) {
      const { data: listing, error: listErr } = await admin
        .from("listings")
        .select(`
          id, title, status, price_per_unit, minimum_order_quantity,
          products!inner (id, name),
          inventory!inner (quantity_available)
        `)
        .eq("id", item.listingId)
        .single();

      type ListingRow = {
        id: string;
        title: string;
        status: string;
        price_per_unit: number;
        minimum_order_quantity: number;
        products: { id: string; name: string };
        inventory: { quantity_available: number };
      };

      const row = listing as unknown as ListingRow;

      if (listErr || !row) {
        skippedCount++;
        messages.push(`Listing ${item.listingId} no longer exists.`);
        continue;
      }

      // Anti-Pork check
      if (PORK_PROHIBITED_REGEX.test(row.title) || PORK_PROHIBITED_REGEX.test(row.products.name)) {
        skippedCount++;
        messages.push(`Produce violates safety policy and cannot be purchased.`);
        continue;
      }

      // Status check
      if (row.status !== "ACTIVE") {
        skippedCount++;
        messages.push(`"${row.title}" is no longer active in the marketplace.`);
        continue;
      }

      // Stock check
      const available = Number(row.inventory?.quantity_available || 0);
      const moq = Number(row.minimum_order_quantity || 1);

      if (available <= 0) {
        skippedCount++;
        messages.push(`"${row.title}" is currently out of stock.`);
        continue;
      }

      // Safe quantity
      const requestedQty = Math.max(item.quantity, moq);
      const safeQty = Math.min(requestedQty, available);

      if (safeQty < moq) {
        skippedCount++;
        messages.push(`"${row.title}" available quantity is below minimum order quantity (${moq}).`);
        continue;
      }

      // Check existing cart item
      const { data: existingItem } = await admin
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", cart.id)
        .eq("listing_id", item.listingId)
        .maybeSingle();

      if (existingItem) {
        const updatedQty = Math.min(Number(existingItem.quantity) + safeQty, available);
        await admin
          .from("cart_items")
          .update({
            quantity: updatedQty,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingItem.id);
      } else {
        await admin.from("cart_items").insert({
          cart_id: cart.id,
          listing_id: item.listingId,
          quantity: safeQty,
        });
      }

      addedCount++;
    }

    // 4. Update recommendation status
    const newStatus: RecommendationStatus =
      addedCount === selectedItems.length ? "ACCEPTED" : "MODIFIED";

    await admin
      .from("basket_recommendations")
      .update({
        is_accepted: true,
        status: newStatus,
      })
      .eq("id", recommendationId);

    await recordAuditLog({
      actorId: userId,
      action: "SMART_BASKET_COMMITTED_TO_CART",
      resourceType: "SMART_BASKET",
      resourceId: recommendationId,
      newValues: {
        addedCount,
        skippedCount,
        status: newStatus,
      },
    });

    return {
      success: addedCount > 0,
      addedCount,
      skippedCount,
      messages,
    };
  }

  /**
   * Records user feedback (e.g. Reject or modify recommendation).
   */
  static async updateBasketFeedback(
    userId: string,
    recommendationId: string,
    status: "ACCEPTED" | "MODIFIED" | "REJECTED"
  ): Promise<void> {
    const admin = createAdminClient();

    const { error } = await admin
      .from("basket_recommendations")
      .update({
        status,
        is_accepted: status === "ACCEPTED",
      })
      .eq("id", recommendationId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to update recommendation status: ${error.message}`);
    }

    await recordAuditLog({
      actorId: userId,
      action: "SMART_BASKET_FEEDBACK_RECORDED",
      resourceType: "SMART_BASKET",
      resourceId: recommendationId,
      newValues: { status },
    });
  }
}
