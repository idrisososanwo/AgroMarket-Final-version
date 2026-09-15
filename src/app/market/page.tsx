import React from "react";
import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { PriceService } from "@/features/prices/service";
import { MarketIntelligenceView } from "@/features/prices/components/market-intelligence-view";

export const metadata: Metadata = {
  title: "Agricultural Market Intelligence & Regional Prices | AgroMarket",
  description:
    "Transparent observed commodity prices, regional price variations, and 30-day price trends across Nigerian wholesale and retail food markets.",
};

interface MarketPageProps {
  searchParams: Promise<{
    productId?: string;
    state?: string;
  }>;
}

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const params = await searchParams;
  const admin = createAdminClient();

  // 1. Fetch available active canonical products
  const { data: productsData } = await admin
    .from("products")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const products = productsData || [];

  // Default to Milled Parboiled Rice or first product if none selected
  const defaultProduct =
    products.find((p) => p.name.toLowerCase().includes("rice")) || products[0];
  const selectedProductId = params.productId || defaultProduct?.id || "";
  const selectedState = params.state || "";

  // 2. Fetch price intelligence datasets in parallel
  const [comparison, trend, aggregation, recentObservations] = await Promise.all([
    PriceService.getRegionalPriceComparison(selectedProductId),
    PriceService.getPriceTrend(selectedProductId, selectedState || undefined, 30),
    PriceService.getPriceAggregation(selectedProductId, selectedState || undefined),
    PriceService.getLatestPrices({
      productId: selectedProductId,
      state: selectedState || undefined,
      limit: 20,
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Nigeria Agricultural Market Intelligence
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Observed commodity prices, regional comparisons, and price movement across Nigerian
            markets (Mile 12, Dawanau, Bodija, and regional agricultural corridors).
          </p>
        </div>

        <MarketIntelligenceView
          products={products}
          selectedProductId={selectedProductId}
          selectedState={selectedState}
          comparison={comparison}
          trend={trend}
          aggregation={aggregation}
          recentObservations={recentObservations}
        />
      </div>
    </div>
  );
}
