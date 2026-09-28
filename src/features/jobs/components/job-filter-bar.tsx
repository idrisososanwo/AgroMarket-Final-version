"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  COMPENSATION_TYPES,
  COMPENSATION_TYPE_LABELS,
} from "../types";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { Search, X, Filter } from "lucide-react";

export function JobFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [state, setState] = useState(searchParams.get("state") || "all");
  const [employmentType, setEmploymentType] = useState(
    searchParams.get("employmentType") || "all"
  );
  const [compensationType, setCompensationType] = useState(
    searchParams.get("compensationType") || "all"
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "newest");

  const applyFilters = (overrides?: Record<string, string>) => {
    const current = {
      search,
      category,
      state,
      employmentType,
      compensationType,
      sortBy,
      ...overrides,
    };

    const params = new URLSearchParams();

    if (current.search.trim()) params.set("search", current.search.trim());
    if (current.category && current.category !== "all") params.set("category", current.category);
    if (current.state && current.state !== "all") params.set("state", current.state);
    if (current.employmentType && current.employmentType !== "all") {
      params.set("employmentType", current.employmentType);
    }
    if (current.compensationType && current.compensationType !== "all") {
      params.set("compensationType", current.compensationType);
    }
    if (current.sortBy && current.sortBy !== "newest") params.set("sortBy", current.sortBy);

    params.set("page", "1");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleReset = () => {
    setSearch("");
    setCategory("all");
    setState("all");
    setEmploymentType("all");
    setCompensationType("all");
    setSortBy("newest");

    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      (category && category !== "all") ||
      (state && state !== "all") ||
      (employmentType && employmentType !== "all") ||
      (compensationType && compensationType !== "all") ||
      sortBy !== "newest"
  );

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-sm mb-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
        className="space-y-4"
      >
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farm labor, agronomists, machinery operators by title or keywords..."
            className="w-full rounded-xl border border-neutral-300 bg-neutral-50/50 py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition min-h-[44px]"
          />
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Job Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                applyFilters({ category: e.target.value });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
            >
              <option value="all">All Categories</option>
              {JOB_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {JOB_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* State Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Location State
            </label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                applyFilters({ state: e.target.value });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
            >
              <option value="all">All States</option>
              {NIGERIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Employment Type */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Employment Type
            </label>
            <select
              value={employmentType}
              onChange={(e) => {
                setEmploymentType(e.target.value);
                applyFilters({ employmentType: e.target.value });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
            >
              <option value="all">All Employment Types</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EMPLOYMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Compensation Type */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Compensation Type
            </label>
            <select
              value={compensationType}
              onChange={(e) => {
                setCompensationType(e.target.value);
                applyFilters({ compensationType: e.target.value });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
            >
              <option value="all">All Compensation Types</option>
              {COMPENSATION_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {COMPENSATION_TYPE_LABELS[ct]}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                applyFilters({ sortBy: e.target.value });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[44px]"
            >
              <option value="newest">Newest Postings First</option>
              <option value="compensation_desc">Highest Compensation</option>
              <option value="compensation_asc">Lowest Compensation</option>
            </select>
          </div>
        </div>

        {/* Buttons Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <div className="text-xs text-neutral-500">
            {isPending ? (
              <span className="inline-flex items-center text-emerald-600 font-medium">
                Filtering job listings...
              </span>
            ) : hasActiveFilters ? (
              <span>Active filters applied</span>
            ) : (
              <span>Showing all active placements</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-2 rounded-lg hover:bg-neutral-100 transition min-h-[44px]"
              >
                <X className="h-3.5 w-3.5" /> Reset Filters
              </button>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 transition min-h-[44px]"
            >
              <Filter className="h-3.5 w-3.5" /> Apply Filters
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
