import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import {
  getIntelligenceAgents,
  getIntelligenceSignals,
  getIntelligenceObservations,
  getIntelligenceRecommendations,
  getIntelligenceEvaluations,
} from "@/features/intelligence/queries";
import { getAIReasoningRuns } from "@/features/intelligence/ai-queries";
import { IntelligenceOverview } from "@/features/intelligence/components/intelligence-overview";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Agricultural Intelligence Foundation | Admin Console | AgroMarket",
  description:
    "Ecosystem intelligence coordination, signals observation, human-in-the-loop recommendations, and prediction evaluations.",
};

export default async function AdminIntelligencePage() {
  await requireRole("ADMIN");

  const [agents, signals, observations, recommendations, evaluations, reasoningRuns] =
    await Promise.all([
      getIntelligenceAgents(),
      getIntelligenceSignals(),
      getIntelligenceObservations(),
      getIntelligenceRecommendations(),
      getIntelligenceEvaluations(),
      getAIReasoningRuns(),
    ]);

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center text-xs font-medium text-emerald-700 hover:text-emerald-800 mb-2"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Admin Console
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                Agricultural Intelligence Administration
              </h1>
              <p className="text-xs text-neutral-500">
                Ground-truth signal monitoring, human review gate for advisory recommendations, and evaluation memory.
              </p>
            </div>
          </div>
        </div>

        <IntelligenceOverview
          agents={agents}
          signals={signals}
          observations={observations}
          recommendations={recommendations}
          evaluations={evaluations}
          reasoningRuns={reasoningRuns}
        />
      </div>
    </div>
  );
}
