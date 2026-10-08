"use client";

import React, { useState, useTransition } from "react";
import {
  AgriculturalSearchResponse,
  StructuredSearchFilters,
} from "../types";
import { executeAgriculturalSearchAction } from "../actions";
import { SearchInputForm } from "./search-input-form";
import { StructuredFilterPanel } from "./structured-filter-panel";
import { SearchResultCard } from "./search-result-card";
import {
  SEARCH_ADVISORY_DISCLAIMER,
  NO_RESULTS_MESSAGE,
} from "../constants";
import { ShieldAlert, Info, Database, Sparkles, BookOpen } from "lucide-react";

interface SemanticSearchContainerProps {
  initialResponse?: AgriculturalSearchResponse | null;
}

export function SemanticSearchContainer({
  initialResponse = null,
}: SemanticSearchContainerProps) {
  const [response, setResponse] = useState<AgriculturalSearchResponse | null>(initialResponse);
  const [filters, setFilters] = useState<StructuredSearchFilters>({
    temporalMode: "CURRENT",
    limit: 20,
  });
  const [lastQuery, setLastQuery] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setLastQuery(query);
    setErrorMessage(null);
    startTransition(async () => {
      const res = await executeAgriculturalSearchAction(query, filters);
      if (res.success && res.data) {
        setResponse(res.data);
      } else {
        setErrorMessage(res.error || "Search failed.");
      }
    });
  };

  const handleFilterChange = (newFilters: StructuredSearchFilters) => {
    setFilters(newFilters);
    if (lastQuery) {
      startTransition(async () => {
        const res = await executeAgriculturalSearchAction(lastQuery, newFilters);
        if (res.success && res.data) {
          setResponse(res.data);
        }
      });
    }
  };

  const handleFilterReset = () => {
    const defaultFilters: StructuredSearchFilters = {
      temporalMode: "CURRENT",
      limit: 20,
    };
    setFilters(defaultFilters);
    if (lastQuery) {
      startTransition(async () => {
        const res = await executeAgriculturalSearchAction(lastQuery, defaultFilters);
        if (res.success && res.data) {
          setResponse(res.data);
        }
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Search Input Bar */}
      <SearchInputForm
        initialQuery={lastQuery}
        onSearch={handleSearch}
        isLoading={isPending}
      />

      {/* Structured Filter Panel */}
      <StructuredFilterPanel
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
      />

      {/* Provider Status & Mode Notice */}
      {response && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 flex items-start gap-3 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">Retrieval Mode:</span>
              <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-100 text-blue-800 border border-blue-300">
                {response.retrievalMode}
              </span>
              <span className="text-gray-500">•</span>
              <span>Matched: <strong>{response.totalMatched}</strong> candidate records</span>
              <span className="text-gray-500">•</span>
              <span>Execution Time: <strong>{response.executionTimeMs}ms</strong></span>
            </div>
            <p className="text-blue-700">{response.providerNotice}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Expanded Ontology Concepts Pill Bar */}
      {response && response.expandedConcepts.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-900 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ontology-Expanded Concepts ({response.expandedConcepts.length}):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {response.expandedConcepts.map((c) => (
              <span
                key={c.conceptId}
                className="bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-medium shadow-xs"
              >
                {c.name} {c.relationshipType ? `(${c.relationshipType})` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      {response && (
        <div className="space-y-4">
          {response.results.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg p-8">
              <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800 mb-1">
                No Results Found
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
                {NO_RESULTS_MESSAGE}
              </p>
              <p className="text-xs text-gray-400">
                Try broadening your search terms, removing state filters, or switching temporal scope to ALL.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Showing {response.results.length} Ranked Results
              </div>
              {response.results.map((res) => (
                <SearchResultCard key={res.resultId} result={res} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State before any search */}
      {!response && !isPending && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg p-8">
          <BookOpen className="w-12 h-12 text-emerald-600/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800 mb-1">
            Deterministic Agricultural Search
          </h3>
          <p className="text-sm text-gray-600 max-w-lg mx-auto">
            Search across verified agronomic knowledge concepts, commodities, biosecurity risks, regional contexts, and value-chain dependencies with explainable rankings and transparent source provenance.
          </p>
        </div>
      )}

      {/* Advisory Notice */}
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md text-xs text-amber-900 leading-relaxed">
        <strong>Advisory Policy:</strong> {SEARCH_ADVISORY_DISCLAIMER}
      </div>
    </div>
  );
}
