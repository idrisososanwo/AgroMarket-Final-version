"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  KNOWLEDGE_CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  CANONICAL_KNOWLEDGE_TOPICS,
} from "../types";
import { Search, X } from "lucide-react";

interface KnowledgeFilterBarProps {
  initialSearch?: string;
  initialType?: string;
  initialState?: string;
  initialTopic?: string;
}

export function KnowledgeFilterBar({
  initialSearch = "",
  initialType = "all",
  initialState = "all",
  initialTopic = "all",
}: KnowledgeFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Reset page to 1 whenever filters change
      params.delete("page");

      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all" || value.trim() === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      startTransition(() => {
        router.push(`/learn?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const activeType = searchParams.get("type") || initialType;
  const activeState = searchParams.get("state") || initialState;
  const activeTopic = searchParams.get("topic") || initialTopic;
  const activeSearch = searchParams.get("search") || initialSearch;

  const hasActiveFilters =
    (activeType && activeType !== "all") ||
    (activeState && activeState !== "all") ||
    (activeTopic && activeTopic !== "all") ||
    Boolean(activeSearch && activeSearch.trim());

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => updateFilters({ type: "all" })}
          className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition min-h-[36px] ${
            activeType === "all"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All Topics
        </button>
        {KNOWLEDGE_CONTENT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => updateFilters({ type: t })}
            className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition min-h-[36px] ${
              activeType === t
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {CONTENT_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Search & Location Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search farm guides, agronomy, prices, pests, events..."
            defaultValue={activeSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateFilters({ search: (e.target as HTMLInputElement).value });
              }
            }}
            onBlur={(e) => {
              if (e.target.value !== activeSearch) {
                updateFilters({ search: e.target.value });
              }
            }}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 pl-10 pr-4 py-2 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
          />
        </div>

        {/* State Filter */}
        <div className="sm:col-span-3">
          <select
            value={activeState}
            onChange={(e) => updateFilters({ state: e.target.value })}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs sm:text-sm text-neutral-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
          >
            <option value="all">All Nigerian States</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state} State
              </option>
            ))}
          </select>
        </div>

        {/* Topic Filter */}
        <div className="sm:col-span-3">
          <select
            value={activeTopic}
            onChange={(e) => updateFilters({ topic: e.target.value })}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-xs sm:text-sm text-neutral-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[42px]"
          >
            <option value="all">All Agricultural Disciplines</option>
            {CANONICAL_KNOWLEDGE_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Reset / Pending Indicator */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100">
          <span>
            {isPending ? "Filtering knowledgebase..." : "Filtered view active"}
          </span>
          <button
            type="button"
            onClick={() =>
              updateFilters({
                type: "all",
                state: "all",
                topic: "all",
                search: null,
              })
            }
            className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 transition min-h-[32px]"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
