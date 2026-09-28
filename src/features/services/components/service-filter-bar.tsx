"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  PRICING_MODELS,
  PRICING_MODEL_LABELS,
} from "../types";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { Search, X, Filter } from "lucide-react";

export function ServiceFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(
    searchParams.get("category") || searchParams.get("serviceCategory") || "all"
  );
  const [coverageState, setCoverageState] = useState(
    searchParams.get("coverageState") || "all"
  );
  const [pricingModel, setPricingModel] = useState(
    searchParams.get("pricingModel") || "all"
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "newest");

  const applyFilters = (overrides?: Record<string, string>) => {
    const current = {
      search,
      category,
      coverageState,
      pricingModel,
      sortBy,
      ...overrides,
    };

    const params = new URLSearchParams();

    if (current.search.trim()) params.set("search", current.search.trim());
    if (current.category && current.category !== "all") {
      params.set("serviceCategory", current.category);
    }
    if (current.coverageState && current.coverageState !== "all") {
      params.set("coverageState", current.coverageState);
    }
    if (current.pricingModel && current.pricingModel !== "all") {
      params.set("pricingModel", current.pricingModel);
    }
    if (current.sortBy && current.sortBy !== "newest") {
      params.set("sortBy", current.sortBy);
    }

    params.set("page", "1");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleReset = () => {
    setSearch("");
    setCategory("all");
    setCoverageState("all");
    setPricingModel("all");
    setSortBy("newest");

    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      (category && category !== "all") ||
      (coverageState && coverageState !== "all") ||
      (pricingModel && pricingModel !== "all") ||
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
            placeholder="Search agricultural services by keyword, provider, or skill..."
            className="w-full rounded-xl border border-neutral-300 bg-neutral-50/50 pl-10 pr-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                applyFilters({ search: "" });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Selects Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Service Category */}
          <div>
            <label
              htmlFor="category-select"
              className="block text-xs font-semibold text-neutral-700 mb-1"
            >
              Service Category
            </label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => {
                const val = e.target.value;
                setCategory(val);
                applyFilters({ category: val });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
            >
              <option value="all">All Service Categories</option>
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {SERVICE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Coverage State */}
          <div>
            <label
              htmlFor="state-select"
              className="block text-xs font-semibold text-neutral-700 mb-1"
            >
              Coverage State
            </label>
            <select
              id="state-select"
              value={coverageState}
              onChange={(e) => {
                const val = e.target.value;
                setCoverageState(val);
                applyFilters({ coverageState: val });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
            >
              <option value="all">Nationwide / All States</option>
              {NIGERIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Model */}
          <div>
            <label
              htmlFor="pricing-select"
              className="block text-xs font-semibold text-neutral-700 mb-1"
            >
              Pricing Model
            </label>
            <select
              id="pricing-select"
              value={pricingModel}
              onChange={(e) => {
                const val = e.target.value;
                setPricingModel(val);
                applyFilters({ pricingModel: val });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
            >
              <option value="all">All Pricing Models</option>
              {PRICING_MODELS.map((model) => (
                <option key={model} value={model}>
                  {PRICING_MODEL_LABELS[model]}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label
              htmlFor="sort-select"
              className="block text-xs font-semibold text-neutral-700 mb-1"
            >
              Sort By
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => {
                const val = e.target.value;
                setSortBy(val);
                applyFilters({ sortBy: val });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
            >
              <option value="newest">Newest Services First</option>
              <option value="rate_asc">Base Rate: Low to High</option>
              <option value="rate_desc">Base Rate: High to Low</option>
            </select>
          </div>
        </div>

        {/* Action Controls & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
          <div className="text-xs text-neutral-500">
            {isPending && <span className="text-emerald-700 font-medium animate-pulse">Updating services...</span>}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors min-h-[44px]"
              >
                <X className="h-3.5 w-3.5" />
                Reset Filters
              </button>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm min-h-[44px]"
            >
              <Filter className="h-3.5 w-3.5" />
              Apply Filters
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
