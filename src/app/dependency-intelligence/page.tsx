import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Network, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/server";
import {
  getDependencyRelationships,
  getDependencyAssessments,
} from "@/features/dependency-graph/data-layer";
import {
  DependencyNetworkOverview,
  CriticalDependenciesPanel,
} from "@/features/dependency-graph/components";
import { sanitizeDependencyRelationshipForViewer } from "@/features/dependency-graph/privacy";
import { DEPENDENCY_ADVISORY_DISCLAIMER } from "@/features/dependency-graph/constants";

export const metadata: Metadata = {
  title: "Agricultural Dependency Graph & Network Intelligence | AgroMarket",
  description:
    "Systemic agricultural network intelligence, supply bottlenecks, processing concentration, corridor exposure, and cascade propagation analysis.",
};

export default async function DependencyIntelligencePage() {
  const user = await getCurrentUser();
  const isAdmin = Boolean(user?.roles?.includes("ADMIN"));

  const [rawRelationships, rawAssessments] = await Promise.all([
    getDependencyRelationships({ isActiveOnly: true }),
    getDependencyAssessments({ classification: "CRITICAL_DEPENDENCY" }),
  ]);

  // Privacy sanitize relationships for non-admin viewers
  const sanitizedRelationships = rawRelationships.map((r) =>
    sanitizeDependencyRelationshipForViewer(r, user?.id, isAdmin)
  );

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link
            href="/intelligence"
            className="inline-flex items-center text-xs font-medium text-primary hover:underline mb-2"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Intelligence Command Center
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Agricultural Dependency Graph & Network Intelligence
                </h1>
                <p className="text-xs text-muted">
                  Phase 3.12 • Structural dependency relationships, concentration risks, single points of failure, and cascade exposure modeling.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-muted border border-border/60">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Advisory Decision Support
              </span>
            </div>
          </div>
        </div>

        {/* Advisory Banner */}
        <div className="bg-surface p-4 rounded-lg border border-border/80 text-xs text-muted leading-relaxed">
          <span className="font-semibold text-foreground block mb-1">
            ⚠️ Network Intelligence Mandate:
          </span>
          {DEPENDENCY_ADVISORY_DISCLAIMER}
        </div>

        {/* Critical Bottlenecks Section */}
        <CriticalDependenciesPanel assessments={rawAssessments} />

        {/* Network Topology Overview */}
        <DependencyNetworkOverview relationships={sanitizedRelationships} />
      </div>
    </div>
  );
}
