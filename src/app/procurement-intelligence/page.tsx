import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import {
  getProcurementSnapshots,
  getProcurementOpportunities,
  getProcurementRecommendations,
  getProcurementOverviewStats,
} from "@/features/procurement-intelligence/queries";
import { ProcurementIntelligenceDashboard } from "@/features/procurement-intelligence/components/procurement-intelligence-dashboard";

export const metadata: Metadata = {
  title: "Procurement Intelligence & B2B Coordination | AgroMarket",
  description:
    "Decision support, deterministic priority scoring, supplier diversification, risk modeling, and advisory procurement recommendations for verified buyers and agricultural enterprises.",
};

export default async function ProcurementIntelligencePage() {
  const [snapshots, opportunities, recommendations, stats] = await Promise.all([
    getProcurementSnapshots({ limit: 30 }),
    getProcurementOpportunities({ limit: 30 }),
    getProcurementRecommendations({ limit: 30 }),
    getProcurementOverviewStats(),
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">
                  B2B Procurement & Offtake Intelligence
                </h1>
                <p className="text-xs text-neutral-500">
                  Phase 2.7 • Strategic sourcing coordination, priority scoring, supplier concentration alerts, and advisory recommendations.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Advisory Mode Active
              </span>
            </div>
          </div>
        </div>

        <ProcurementIntelligenceDashboard
          initialSnapshots={snapshots}
          initialOpportunities={opportunities}
          initialRecommendations={recommendations}
          initialStats={stats}
        />
      </div>
    </div>
  );
}
