import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { getMyIntelligenceDashboardData } from "@/features/decision-intelligence/queries";
import { MyIntelligenceDashboard } from "@/features/decision-intelligence/components/my-intelligence-dashboard";
import { ArrowLeft, Sparkles } from "lucide-react";

import { ActorRole } from "@/features/decision-intelligence/types";

export const metadata: Metadata = {
  title: "My Agricultural Intelligence & Governed Decisions | AgroMarket",
  description:
    "Personalized, role-tailored agricultural decisions, market opportunities, biosecurity alerts, and governed outcomes for farmers, buyers, and agribusinesses.",
};

export default async function MyIntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<{ role?: string; state?: string; lga?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const data = await getMyIntelligenceDashboardData({
    roleOverride: resolvedParams.role as ActorRole | undefined,
    stateOverride: resolvedParams.state,
    lgaOverride: resolvedParams.lga,
  });

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Marketplace
          </Link>

          <div className="flex items-center space-x-2">
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Phase 3.2 Decision Layer
            </span>
          </div>
        </div>

        {/* Dashboard Component */}
        <MyIntelligenceDashboard initialData={data} />
      </div>
    </div>
  );
}
