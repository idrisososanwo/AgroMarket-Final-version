import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProductionPlanningSnapshots } from "@/features/production-planning/queries";
import { ProductionPlanningDashboard } from "@/features/production-planning/components/production-planning-dashboard";

export const metadata: Metadata = {
  title: "Production Planning & Farm Intelligence | AgroMarket",
  description:
    "Evidence-grounded production context, market signal integration, seasonality alignment, and advisory farm planning support for Nigeria.",
};

export default async function ProductionIntelligencePage() {
  const initialSnapshots = await getProductionPlanningSnapshots({ limit: 25 });

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
                Production Planning & Farm Intelligence
              </h1>
              <p className="text-xs text-neutral-500">
                Connecting market signals, production context, seasonality, and downstream constraints for decision support.
              </p>
            </div>
          </div>
        </div>

        <ProductionPlanningDashboard initialSnapshots={initialSnapshots} />
      </div>
    </div>
  );
}
