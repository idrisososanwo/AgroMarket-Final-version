import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import {
  getOrchestrationSnapshots,
  getOrchestrationRecommendations,
  getOrchestrationConflicts,
  getOrchestrationOutcomes,
  getOrchestrationOverviewStats,
} from "@/features/orchestration/queries";
import { IntelligenceCommandCenter } from "@/features/orchestration/components/intelligence-command-center";
import { ArrowLeft, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Cross-Domain Agricultural Intelligence Command Center | AgroMarket",
  description:
    "Unified multi-agent agricultural intelligence coordination across Market, Production, Demand, Supply, Procurement, Food Security, Logistics, and Biosecurity domains.",
};

export default async function IntelligenceCommandCenterPage() {
  const [snapshots, recommendations, conflicts, outcomes, stats] = await Promise.all([
    getOrchestrationSnapshots({ limit: 30 }),
    getOrchestrationRecommendations({ limit: 30 }),
    getOrchestrationConflicts({ limit: 30 }),
    getOrchestrationOutcomes({ limit: 20 }),
    getOrchestrationOverviewStats(),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link
            href="/admin/intelligence"
            className="inline-flex items-center text-xs font-medium text-indigo-700 hover:text-indigo-800 mb-2"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Intelligence Administration
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="rounded-lg bg-indigo-100 p-2 text-indigo-800">
                  <Sparkles className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                    Agricultural Intelligence Command Center
                  </h1>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Phase 3.1 Cross-Domain Decision Engine & Multi-Agent Coordination Layer
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
                8 Specialized Agents Connected
              </span>
            </div>
          </div>
        </div>

        <IntelligenceCommandCenter
          initialSnapshots={snapshots}
          initialRecommendations={recommendations}
          initialConflicts={conflicts}
          initialOutcomes={outcomes}
          initialStats={stats}
        />
      </div>
    </div>
  );
}
