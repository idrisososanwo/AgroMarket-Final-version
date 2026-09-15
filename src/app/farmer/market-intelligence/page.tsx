import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PriceService } from "@/features/prices/service";
import { DemandService } from "@/features/demand/service";
import { FarmerPriceIntelligence } from "@/features/prices/components/farmer-price-intelligence";

export const metadata: Metadata = {
  title: "Farmer Market Intelligence & Demand Signals | AgroMarket",
  description:
    "Empower your farm with verified wholesale price trends, regional market comparisons, and platform demand signals across Nigeria.",
};

interface FarmerMarketPageProps {
  searchParams: Promise<{
    productId?: string;
  }>;
}

export default async function FarmerMarketIntelligencePage({
  searchParams,
}: FarmerMarketPageProps) {
  const _user = await requireAuth();
  const params = await searchParams;
  const admin = createAdminClient();

  // 1. Fetch available active canonical products
  const { data: productsData } = await admin
    .from("products")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const products = productsData || [];
  const defaultProduct =
    products.find((p) => p.name.toLowerCase().includes("maize")) || products[0];
  const selectedProductId = params.productId || defaultProduct?.id || "";

  // 2. Fetch price intelligence and demand data in parallel
  const [comparison, trend, demandSignal, forecasts] = await Promise.all([
    PriceService.getRegionalPriceComparison(selectedProductId),
    PriceService.getPriceTrend(selectedProductId, undefined, 30),
    DemandService.getSignals(selectedProductId),
    DemandService.getForecasts(selectedProductId),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
              <Link href="/farmer" className="hover:text-emerald-700">
                Farmer Portal
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Market Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Farm Market Intelligence & Demand Signals
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Actionable price comparisons and transparent platform demand signals to help plan
              harvests and market distribution.
            </p>
          </div>
        </div>

        <FarmerPriceIntelligence
          products={products}
          selectedProductId={selectedProductId}
          comparison={comparison}
          trend={trend}
          demandSignal={demandSignal}
          forecasts={forecasts}
        />
      </div>
    </div>
  );
}
