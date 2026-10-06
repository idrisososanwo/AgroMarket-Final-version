import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getSupplyMatchingSnapshots,
  getSupplyCoordinationRecommendations,
  getSupplyMatchingOverviewStats,
} from "@/features/supply-matching/queries";
import { SupplyMatchingDashboard } from "@/features/supply-matching/components/supply-matching-dashboard";

export const metadata: Metadata = {
  title: "Supply Matching & Agricultural Coordination | AgroMarket",
  description:
    "Deterministic value-chain coordination matching available and expected agricultural supply against identified demand, processing facilities, and Nigerian logistics corridors.",
};

export default async function SupplyIntelligencePage() {
  const [initialSnapshots, initialRecommendations, initialStats] = await Promise.all([
    getSupplyMatchingSnapshots({ limit: 30 }),
    getSupplyCoordinationRecommendations({ limit: 20 }),
    getSupplyMatchingOverviewStats(),
  ]);

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
                Supply Matching & Agricultural Coordination
              </h1>
              <p className="text-xs text-neutral-500">
                Multi-actor value chain coordination across supply pools, processing facilities, and Nigerian transit corridors.
              </p>
            </div>
          </div>
        </div>

        <SupplyMatchingDashboard
          initialSnapshots={initialSnapshots}
          initialRecommendations={initialRecommendations}
          initialStats={initialStats}
        />
      </div>
    </div>
  );
}
