import { createAdminClient } from "@/lib/supabase/admin";
import { DeterministicRecommendationProvider } from "./provider";
import {
  CandidateListing,
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
   * Orchestrates candidate data retrieval, benchmark resolution, and recommendation execution.
   */
  async generateBasket(
    userId: string,
    input: GenerateBasketInput,
    preferences?: UserPreferences | null
  ): Promise<SmartBasketResult> {
    const admin = createAdminClient();

    // 1. Fetch active marketplace listings with authoritative inventory
    const { data: listingsData, error: listErr } = await admin
      .from("listings")
      .select(`
        id, product_id, seller_id, title, description, price_per_unit, unit,
        minimum_order_quantity, state, lga, pickup_address, status,
        products!inner (
          id, name, default_unit, category_id,
          categories!inner (id, name)
        ),
        profiles!seller_id (id, full_name),
        inventory!inner (quantity_on_hand, quantity_reserved, quantity_available)
      `)
      .eq("status", "ACTIVE")
      .gt("inventory.quantity_available", 0)
      .limit(100);

    if (listErr) {
      console.error("SmartBasketRecommendationEngine listings query error:", listErr);
    }

    type QueryRow = {
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
        categories: {
          id: string;
          name: string;
        };
      };
      profiles: {
        id: string;
        full_name: string | null;
      } | null;
      inventory: {
        quantity_on_hand: number;
        quantity_reserved: number;
        quantity_available: number;
      };
    };

    const rows = (listingsData || []) as unknown as QueryRow[];

    const candidates: CandidateListing[] = rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.products.name,
      categoryName: r.products.categories.name,
      categoryId: r.products.category_id,
      sellerId: r.seller_id,
      sellerName: r.profiles?.full_name || "Verified Local Producer",
      title: r.title,
      description: r.description,
      pricePerUnit: Number(r.price_per_unit),
      unit: r.unit,
      minimumOrderQuantity: Number(r.minimum_order_quantity || 1),
      quantityAvailable: Number(r.inventory.quantity_available || 0),
      state: r.state,
      lga: r.lga,
      pickupAddress: r.pickup_address,
    }));

    // 2. Resolve recent price benchmarks for products in the candidate pool
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

    // 3. Assemble Recommendation Context
    const context: RecommendationContext = {
      userId,
      input,
      preferences,
      candidates,
      benchmarks,
    };

    // 4. Execute Recommendation Provider
    return this.provider.generateRecommendations(context);
  }
}
