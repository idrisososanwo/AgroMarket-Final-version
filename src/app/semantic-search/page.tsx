import React from "react";
import Link from "next/link";
import { SemanticSearchContainer } from "@/features/semantic-search/components";

export const metadata = {
  title: "Agricultural Semantic Search & Retrieval | AgroMarket",
  description: "Deterministic agricultural semantic search and retrieval across Nigerian commodities, agronomic practices, biosecurity, and regional intelligence.",
};

export default function SemanticSearchPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Phase 3.14 Retrieval Layer
              </span>
              <span className="text-xs text-gray-500">Semantic Search Foundation</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              Agricultural Semantic Search & Retrieval
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Hybrid retrieval combining lexical indexing, ontology expansion, and structured filters with transparent ranking explanations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/knowledge-graph"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Knowledge Graph
            </Link>
            <Link
              href="/dependency-intelligence"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Dependency Graph
            </Link>
          </div>
        </div>

        {/* Interactive Search Experience */}
        <SemanticSearchContainer />
      </div>
    </div>
  );
}
