import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PriceService } from "@/features/prices/service";
import { DemandService } from "@/features/demand/service";
import { AdminMarketIntelligence } from "@/features/admin/components/admin-market-intelligence";

export const metadata: Metadata = {
  title: "Market Intelligence & Data Moderation | Admin Portal | AgroMarket",
  description:
    "Review agricultural price observations, moderate verification statuses, and compute baseline demand forecasts.",
};

interface AdminMarketPageProps {
  searchParams: Promise<{
    productId?: string;
    state?: string;
    sourceType?: string;
    verificationStatus?: string;
  }>;
}

export default async function AdminMarketIntelligencePage({
  searchParams,
}: AdminMarketPageProps) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const admin = createAdminClient();

  // 1. Fetch available canonical products
  const { data: productsData } = await admin
    .from("products")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const products = productsData || [];

  // 2. Fetch observations and forecasts
  const [observations, forecasts] = await Promise.all([
    PriceService.getLatestPrices({
      productId: params.productId,
      state: params.state,
      sourceType: params.sourceType,
      verificationStatus: params.verificationStatus,
      limit: 100,
    }),
    DemandService.getForecasts(params.productId, params.state),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
            <Link href="/admin" className="hover:text-emerald-700">
              Admin Portal
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Market Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Market Intelligence & Demand Data Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Audit commodity price observations, moderate verification statuses, inspect data
            quality labels, and trigger baseline demand forecasts.
          </p>
        </div>

        <AdminMarketIntelligence
          products={products}
          observations={observations}
          forecasts={forecasts}
          selectedProduct={params.productId || ""}
          selectedState={params.state || ""}
          selectedSource={params.sourceType || ""}
          selectedVerification={params.verificationStatus || ""}
        />
      </div>
    </div>
  );
}
