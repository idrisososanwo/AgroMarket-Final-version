import { createAdminClient } from "@/lib/supabase/admin";
import { DeterministicRecommendationProvider } from "./provider";
import {
  CandidateListing,
  CustomerOrderHistorySummary,
  GenerateBasketInput,
  PriceBenchmark,
  RecommendationContext,
  RecommendationProvider,
  SmartBasketResult,
  UserPreferences,
} from "./types";

export class SmartBasketRecommendationEngine {
  private provider: RecommendationProvider;

  constructor(provider?: RecommendationProvider) {
    this.provider = provider || new DeterministicRecommendationProvider();
  }

  /**
   * Sets or swaps the recommendation provider (e.g. For future ML or personalized providers).
   */
  setProvider(provider: RecommendationProvider) {
    this.provider = provider;
  }

  /**
   * Orchestrates candidate data retrieval, benchmark resolution, order history analysis,
   * and recommendation execution.
   */
  async generateBasket(
    userId: string,
    input: GenerateBasketInput,
    preferences?: UserPreferences | null
  ): Promise<SmartBasketResult> {
    const admin = createAdminClient();

    // 1. Fetch active marketplace listings with authoritative inventory & images
    const { data: listingsData, error: listErr } = await admin
      .from("listings")
      .select(`
        id, product_id, seller_id, title, description, price_per_unit, unit,
        minimum_order_quantity, state, lga, pickup_address, status,
        products!inner (
          id, name, default_unit, category_id, slug, image_url,
          categories!inner (id, name, slug, image_url)
        ),
        inventory (quantity_on_hand, quantity_reserved, quantity_available),
        farms (name)
      `)
      .eq("status", "ACTIVE")
      .limit(150);

    if (listErr) {
      console.error("SmartBasketRecommendationEngine listings query error:", listErr);
    }

    type RawRow = {
      id: string;
      product_id: string;
      seller_id: string;
      title: string;
      description: string | null;
      price_per_unit: number;
      unit: string;
      minimum_order_quantity: number;
      state: string;
      lga: string | null;
      pickup_address: string;
      products: {
        id: string;
        name: string;
        default_unit: string;
        category_id: string;
        slug: string;
        image_url: string | null;
        categories: {
          id: string;
          name: string;
          slug: string;
          image_url: string | null;
        };
      };
      inventory:
        | {
            quantity_on_hand: number;
            quantity_reserved: number;
            quantity_available: number;
          }
        | Array<{
            quantity_on_hand: number;
            quantity_reserved: number;
            quantity_available: number;
          }>
        | null;
      farms: { name: string | null } | Array<{ name: string | null }> | null;
    };

    const rows = (listingsData || []) as unknown as RawRow[];
    const candidates: CandidateListing[] = [];

    for (const r of rows) {
      if (!r.products || !r.products.categories) continue;

      const inv = Array.isArray(r.inventory) ? r.inventory[0] : r.inventory;
      const onHand = Number(inv?.quantity_on_hand ?? 0);
      const reserved = Number(inv?.quantity_reserved ?? 0);
      const qtyAvailable = Number(
        inv?.quantity_available !== undefined && inv?.quantity_available !== null
          ? inv.quantity_available
          : Math.max(0, onHand - reserved)
      );

      const moq = Math.max(1, Number(r.minimum_order_quantity || 1));
      // Only include products with available stock meeting MOQ
      if (qtyAvailable < moq) {
        continue;
      }

      const farmObj = Array.isArray(r.farms) ? r.farms[0] : r.farms;
      const sellerName = farmObj?.name || "Verified Local Producer";
      const imageUrl = r.products.image_url || r.products.categories.image_url || null;

      candidates.push({
        id: r.id,
        productId: r.product_id,
        productName: r.products.name,
        categoryName: r.products.categories.name,
        categoryId: r.products.category_id,
        sellerId: r.seller_id,
        sellerName,
        title: r.title,
        description: r.description,
        pricePerUnit: Number(r.price_per_unit),
        unit: r.unit,
        minimumOrderQuantity: moq,
        quantityAvailable: qtyAvailable,
        state: r.state,
        lga: r.lga,
        pickupAddress: r.pickup_address,
        imageUrl,
      });
    }

    // 2. Resolve recent price benchmarks for candidate products
    const productIds = Array.from(new Set(candidates.map((c) => c.productId)));
    const benchmarks = new Map<string, PriceBenchmark>();

    if (productIds.length > 0) {
      const { data: priceData } = await admin
        .from("price_observations")
        .select("product_id, price, normalized_price, normalized_unit, data_quality_label, verification_status")
        .in("product_id", productIds)
        .in("verification_status", ["VERIFIED", "SYSTEM_DERIVED", "SELF_REPORTED"])
        .order("observed_at", { ascending: false })
        .limit(100);

      if (priceData) {
        for (const p of priceData) {
          if (!benchmarks.has(p.product_id)) {
            const price = p.normalized_price !== null ? Number(p.normalized_price) : Number(p.price);
            benchmarks.set(p.product_id, {
              productId: p.product_id,
              benchmarkPrice: price,
              unit: p.normalized_unit || "KG",
              dataQualityLabel: p.data_quality_label,
            });
          }
        }
      }
    }

    // 3. Load Authenticated User's Historical Orders (Completed/Paid purchases only)
    const { data: orderRows, error: orderErr } = await admin
      .from("orders")
      .select(`
        id, status, created_at,
        order_items (
          product_id, listing_id, product_name_snapshot, quantity, unit_price_snapshot
        )
      `)
      .eq("buyer_id", userId)
      .in("status", ["PAID", "PROCESSING", "PARTIALLY_FULFILLED", "COMPLETED"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (orderErr) {
      console.error("SmartBasketRecommendationEngine order history query error:", orderErr);
    }

    const frequentProductIds = new Map<string, number>();
    const pastCategories = new Set<string>();
    const validOrders = (orderRows || []) as Array<{
      id: string;
      status: string;
      order_items: Array<{
        product_id: string;
        listing_id: string;
        product_name_snapshot: string;
        quantity: number;
        unit_price_snapshot: number;
      }>;
    }>;

    for (const order of validOrders) {
      const items = order.order_items || [];
      for (const item of items) {
        if (item.product_id) {
          const count = frequentProductIds.get(item.product_id) || 0;
          frequentProductIds.set(item.product_id, count + 1);
        }
      }
    }

    const orderHistory: CustomerOrderHistorySummary = {
      frequentProductIds,
      pastCategories,
      orderCount: validOrders.length,
    };

    // 4. Assemble Recommendation Context
    const context: RecommendationContext = {
      userId,
      input,
      preferences,
      candidates,
      benchmarks,
      orderHistory,
    };

    // 5. Execute Recommendation Provider
    return this.provider.generateRecommendations(context);
  }
}
