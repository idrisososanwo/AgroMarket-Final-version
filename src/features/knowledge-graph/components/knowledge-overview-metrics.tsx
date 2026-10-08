"use client";

import React from "react";
import { KnowledgeOverviewMetrics } from "../queries";

interface KnowledgeOverviewMetricsProps {
  metrics: KnowledgeOverviewMetrics;
}

export function KnowledgeOverviewMetricsPanel({ metrics }: KnowledgeOverviewMetricsProps) {
  const publishedCount = metrics.countsByStatus["PUBLISHED"] || 0;
  const verifiedCount = metrics.countsByStatus["VERIFIED"] || 0;
  const draftCount = metrics.countsByStatus["DRAFT"] || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Total Concepts
        </span>
        <div className="text-2xl font-bold text-gray-900 mt-1">
          {metrics.totalConcepts}
        </div>
        <span className="text-xs text-gray-500 mt-1 block">
          Categorized across {Object.keys(metrics.countsByType).length} types
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Knowledge Edges
        </span>
        <div className="text-2xl font-bold text-gray-900 mt-1">
          {metrics.totalRelationships}
        </div>
        <span className="text-xs text-gray-500 mt-1 block">
          Directed semantic relationships
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Canonical Entity Links
        </span>
        <div className="text-2xl font-bold text-gray-900 mt-1">
          {metrics.totalEntityLinks}
        </div>
        <span className="text-xs text-gray-500 mt-1 block">
          Bound to operational AgroMarket records
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Quality Status
        </span>
        <div className="text-2xl font-bold text-emerald-700 mt-1">
          {publishedCount + verifiedCount}
        </div>
        <span className="text-xs text-gray-500 mt-1 block">
          {publishedCount} Published, {draftCount} Drafts
        </span>
      </div>
    </div>
  );
}
