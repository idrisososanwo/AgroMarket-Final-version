import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Truck } from "lucide-react";
import {
  getLogisticsSnapshots,
  getLogisticsDependencies,
  getLogisticsBottlenecks,
  getLogisticsRecommendations,
  getLogisticsOverviewStats,
} from "@/features/logistics-intelligence/queries";
import { LogisticsIntelligenceDashboard } from "@/features/logistics-intelligence/components/logistics-intelligence-dashboard";

export const metadata: Metadata = {
  title: "Logistics Intelligence & Movement Resilience | AgroMarket",
  description:
    "Decision support, corridor dependency tracking, bottleneck detection, and network resilience assessment for agricultural movements across Nigerian trade basins.",
};

export default async function LogisticsIntelligencePage() {
  const [snapshots, dependencies, bottlenecks, recommendations, stats] =
    await Promise.all([
      getLogisticsSnapshots({ limit: 30 }),
      getLogisticsDependencies({ limit: 30 }),
      getLogisticsBottlenecks({ limit: 30 }),
      getLogisticsRecommendations({ limit: 30 }),
      getLogisticsOverviewStats(),
    ]);

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link
            href="/marketplace"
            className="inline-flex items-center text-xs font-medium text-emerald-700 hover:text-emerald-800 mb-2"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Marketplace
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">
                  Logistics Intelligence & Movement Resilience
                </h1>
                <p className="text-xs text-neutral-500">
                  Phase 2.9 • Asset-light movement intelligence, corridor dependency tracking, bottleneck detection, and network resilience indicators.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                Movement Advisory Active
              </span>
            </div>
          </div>
        </div>

        <LogisticsIntelligenceDashboard
          initialSnapshots={snapshots}
          initialDependencies={dependencies}
          initialBottlenecks={bottlenecks}
          initialRecommendations={recommendations}
          initialStats={stats}
        />
      </div>
    </div>
  );
}
