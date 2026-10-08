"use client";

import React, { useState } from "react";
import { Search, AlertCircle, Loader2 } from "lucide-react";
import { assertNoProhibitedProduceSearch } from "../validation";

interface SearchInputFormProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchInputForm({
  initialQuery = "",
  onSearch,
  isLoading = false,
}: SearchInputFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    try {
      assertNoProhibitedProduceSearch(trimmed, "Search Query");
      setError(null);
      onSearch(trimmed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Prohibited produce detected.");
    }
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Search agricultural knowledge, crops, commodities, regions, disease risks..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            maxLength={300}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Search</span>
        </button>
      </form>

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
