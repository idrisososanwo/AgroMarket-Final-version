import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDemandIntelligenceSnapshots } from "@/features/demand-intelligence/queries";
import { DemandIntelligenceDashboard } from "@/features/demand-intelligence/components/demand-intelligence-dashboard";

export const metadata: Metadata = {
  title: "Demand Forecasting & Demand Intelligence | AgroMarket",
  description:
    "Evidence-grounded agricultural demand analysis, consumer and B2B telemetry, regional demand differentials, and deterministic forecasting for Nigeria.",
};

export default async function DemandIntelligencePage() {
  const initialSnapshots = await getDemandIntelligenceSnapshots({ limit: 25 });

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center text-xs font-medium text-blue-700 hover:text-blue-800 mb-2"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to AgroMarket
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                Demand Forecasting & Demand Intelligence
              </h1>
              <p className="text-xs text-neutral-500">
                Tracking consumer, B2B, shared purchase, and regional demand dynamics to inform production and trade decisions.
              </p>
            </div>
          </div>
        </div>

        <DemandIntelligenceDashboard initialSnapshots={initialSnapshots} />
      </div>
    </div>
  );
}
