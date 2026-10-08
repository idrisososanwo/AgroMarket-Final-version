"use client";

import React from "react";
import {
  StructuredSearchFilters,
  SEARCH_SOURCE_TYPES,
  TEMPORAL_SEARCH_MODES,
  SearchSourceType,
  TemporalSearchMode,
} from "../types";
import { KnowledgeConfidence } from "@/features/knowledge-graph/types";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { Filter, RotateCcw } from "lucide-react";

interface StructuredFilterPanelProps {
  filters: StructuredSearchFilters;
  onChange: (newFilters: StructuredSearchFilters) => void;
  onReset: () => void;
}

export function StructuredFilterPanel({
  filters,
  onChange,
  onReset,
}: StructuredFilterPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Structured Retrieval Filters</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Filters</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Source Type */}
        <div>
          <label className="block text-gray-600 font-medium mb-1">Source Domain</label>
          <select
            value={filters.sourceTypes?.[0] || ""}
            onChange={(e) =>
              onChange({
                ...filters,
                sourceTypes: e.target.value
                  ? [e.target.value as SearchSourceType]
                  : undefined,
              })
            }
            className="w-full border border-gray-300 rounded p-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Source Domains</option>
            {SEARCH_SOURCE_TYPES.map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* State */}
        <div>
          <label className="block text-gray-600 font-medium mb-1">State Scope</label>
          <select
            value={filters.state || ""}
            onChange={(e) =>
              onChange({
                ...filters,
                state: e.target.value || undefined,
              })
            }
            className="w-full border border-gray-300 rounded p-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Nigerian States</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Temporal Mode */}
        <div>
          <label className="block text-gray-600 font-medium mb-1">Temporal Scope</label>
          <select
            value={filters.temporalMode || "CURRENT"}
            onChange={(e) =>
              onChange({
                ...filters,
                temporalMode: e.target.value as TemporalSearchMode,
              })
            }
            className="w-full border border-gray-300 rounded p-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {TEMPORAL_SEARCH_MODES.map((tm) => (
              <option key={tm} value={tm}>
                {tm === "CURRENT" ? "Current / Active Only" : tm === "HISTORICAL" ? "Historical Memory Only" : "All Time Periods"}
              </option>
            ))}
          </select>
        </div>

        {/* Confidence */}
        <div>
          <label className="block text-gray-600 font-medium mb-1">Confidence Threshold</label>
          <select
            value={filters.confidence || ""}
            onChange={(e) =>
              onChange({
                ...filters,
                confidence: (e.target.value || undefined) as KnowledgeConfidence | undefined,
              })
            }
            className="w-full border border-gray-300 rounded p-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Any Confidence</option>
            <option value="HIGH">HIGH (Institutional/Verified)</option>
            <option value="MODERATE">MODERATE (Derived/Empirical)</option>
            <option value="LOW">LOW (Preliminary)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
