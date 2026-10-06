import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, HeartPulse } from "lucide-react";
import {
  getDiseaseSnapshots,
  getDiseaseObservations,
  getBiosecurityDependencies,
  getDiseaseAlerts,
  getDiseaseOverviewStats,
} from "@/features/disease-biosecurity/queries";
import { DiseaseIntelligenceDashboard } from "@/features/disease-biosecurity/components/disease-intelligence-dashboard";

export const metadata: Metadata = {
  title: "Agricultural Disease & Biosecurity Intelligence | AgroMarket",
  description:
    "Decision support, early warning, biosecurity resilience, and signal convergence analysis across Nigerian trade basins.",
};

export default async function DiseaseIntelligencePage() {
  const [snapshots, observations, dependencies, alerts, stats] =
    await Promise.all([
      getDiseaseSnapshots(30),
      getDiseaseObservations(undefined, 30),
      getBiosecurityDependencies(undefined, 30),
      getDiseaseAlerts(undefined, 30),
      getDiseaseOverviewStats(),
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">
                  Agricultural Disease & Biosecurity Intelligence
                </h1>
                <p className="text-xs text-neutral-500">
                  Phase 3.0 • Early-warning agricultural disease-risk signals, biosecurity resilience assessment, and governed alert lifecycle.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                Early-Warning Active
              </span>
            </div>
          </div>
        </div>

        <DiseaseIntelligenceDashboard
          initialSnapshots={snapshots}
          initialObservations={observations}
          initialDependencies={dependencies}
          initialAlerts={alerts}
          initialStats={stats}
        />
      </div>
    </div>
  );
}
