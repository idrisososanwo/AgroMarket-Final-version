import React from "react";
import Link from "next/link";
import { AgriculturalAssistantContainer } from "@/features/agricultural-rag/components";

export const metadata = {
  title: "Evidence-Grounded Agricultural Assistant | AgroMarket",
  description:
    "Evidence-grounded agricultural intelligence answering questions across Nigerian commodities, farming practices, biosecurity, and supply chain constraints with strict source citations.",
};

export default function AgriculturalAssistantPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumbs / Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Phase 3.15 Evidence Engine
              </span>
              <span className="text-xs text-gray-500">Grounded RAG Foundation</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              Evidence-Grounded Agricultural Assistant
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Synthesizes advisory explanations directly from verified agricultural evidence with deterministic citation verification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/semantic-search"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              Semantic Search
            </Link>
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

        {/* Operational Assistant Experience */}
        <AgriculturalAssistantContainer />
      </div>
    </div>
  );
}
