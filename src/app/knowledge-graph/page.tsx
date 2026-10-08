import React from "react";
import Link from "next/link";
import { getKnowledgeOverviewMetrics } from "@/features/knowledge-graph/queries";
import {
  KnowledgeOverviewMetricsPanel,
  ConceptTypeBreakdownCard,
  VerifiedConceptsTable,
  KnowledgeGraphTopology,
} from "@/features/knowledge-graph/components";
import { KNOWLEDGE_ADVISORY_DISCLAIMER } from "@/features/knowledge-graph/constants";

export const metadata = {
  title: "Agricultural Knowledge Graph & Ontology | AgroMarket",
  description: "Canonical agricultural knowledge graph, concept taxonomy, and semantic relationships for Nigerian agribusiness.",
};

export default async function KnowledgeGraphPage() {
  const metrics = await getKnowledgeOverviewMetrics();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Phase 3.13 Ontology Layer
              </span>
              <span className="text-xs text-gray-500">Semantic Knowledge Infrastructure</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              Agricultural Knowledge Graph
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Shared semantic understanding of commodities, crops, livestock, processes, regions, and biosecurity risks across Nigerian value chains.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dependency-intelligence"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Dependency Graph
            </Link>
            <Link
              href="/admin/governance"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Governance Portal
            </Link>
          </div>
        </div>

        {/* Advisory Banner */}
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md">
          <div className="flex">
            <div className="shrink-0 text-amber-500 font-bold">ℹ️</div>
            <div className="ml-3">
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                {KNOWLEDGE_ADVISORY_DISCLAIMER}
              </p>
            </div>
          </div>
        </div>

        {/* Overview Metrics Panel */}
        <KnowledgeOverviewMetricsPanel metrics={metrics} />

        {/* Concept Breakdown & Topology Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ConceptTypeBreakdownCard countsByType={metrics.countsByType} />
          </div>
          <div className="lg:col-span-2">
            <KnowledgeGraphTopology relationships={metrics.recentRelationships} />
          </div>
        </div>

        {/* Verified Concepts Table */}
        <VerifiedConceptsTable concepts={metrics.recentVerifiedConcepts} />

        {/* Footer Note */}
        <div className="text-center pt-4 text-xs text-gray-400">
          AgroMarket Semantic Knowledge Graph &bull; Deterministic Non-Fabricating Ontology &bull; Human Governed
        </div>
      </div>
    </div>
  );
}
