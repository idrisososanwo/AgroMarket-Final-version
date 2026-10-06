import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import {
  getFoodSecuritySnapshots,
  getResilienceSnapshots,
  getFoodSecurityDependencies,
  getFoodSecurityAlerts,
  getFoodSecurityOverviewStats,
} from "@/features/food-security/queries";
import { FoodSecurityDashboard } from "@/features/food-security/components/food-security-dashboard";

export const metadata: Metadata = {
  title: "Food Security & Agricultural Resilience | AgroMarket",
  description:
    "Early-warning decision support, deterministic food security pressure index, resilience assessments, and critical dependency monitors across Nigerian agricultural corridors.",
};

export default async function FoodSecurityPage() {
  const [snapshots, resilience, dependencies, alerts, stats] = await Promise.all([
    getFoodSecuritySnapshots({ limit: 30 }),
    getResilienceSnapshots({ limit: 30 }),
    getFoodSecurityDependencies({ limit: 30 }),
    getFoodSecurityAlerts({ limit: 30 }),
    getFoodSecurityOverviewStats(),
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
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">
                  Food Security & Agricultural Resilience Early Warning
                </h1>
                <p className="text-xs text-neutral-500">
                  Phase 2.8 • Multi-dimensional pressure indices, agricultural resilience assessments, corridor dependency monitoring, and human-verified alerts.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                Early-Warning Advisory
              </span>
            </div>
          </div>
        </div>

        <FoodSecurityDashboard
          initialSnapshots={snapshots}
          initialResilience={resilience}
          initialDependencies={dependencies}
          initialAlerts={alerts}
          initialStats={stats}
        />
      </div>
    </div>
  );
}
