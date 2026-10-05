import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMarketPressureSnapshots } from "@/features/market-intelligence/queries";
import { MarketIntelligenceDashboard } from "@/features/market-intelligence/components/market-intelligence-dashboard";

export const metadata: Metadata = {
  title: "Market Intelligence Agent | AgroMarket",
  description:
    "Empirical agricultural market observations, deterministic price and supply/demand signals, and AI-grounded advisory intelligence for Nigeria.",
};

export default async function MarketIntelligencePage() {
  const initialSnapshots = await getMarketPressureSnapshots({ limit: 25 });

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center text-xs font-medium text-emerald-700 hover:text-emerald-800 mb-2"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to AgroMarket
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                Agricultural Market Intelligence
              </h1>
              <p className="text-xs text-neutral-500">
                Ground-truth market monitoring, regional price comparisons, and advisory decision support.
              </p>
            </div>
          </div>
        </div>

        <MarketIntelligenceDashboard initialSnapshots={initialSnapshots} />
      </div>
    </div>
  );
}
