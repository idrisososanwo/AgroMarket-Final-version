"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_CONDITIONS,
  EQUIPMENT_CONDITION_LABELS,
} from "../types";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { Search, X, Filter, RotateCcw } from "lucide-react";

export function EquipmentFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [state, setState] = useState(searchParams.get("state") || "all");
  const [condition, setCondition] = useState(searchParams.get("condition") || "all");
  const [availability, setAvailability] = useState(
    searchParams.get("availability") || "all"
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "newest");

  const applyFilters = (overrides?: Record<string, string>) => {
    const current = {
      search,
      category,
      state,
      condition,
      availability,
      sortBy,
      ...overrides,
    };

    const params = new URLSearchParams();

    if (current.search.trim()) params.set("search", current.search.trim());
    if (current.category && current.category !== "all") {
      params.set("category", current.category);
    }
    if (current.state && current.state !== "all") {
      params.set("state", current.state);
    }
    if (current.condition && current.condition !== "all") {
      params.set("condition", current.condition);
    }
    if (current.availability && current.availability !== "all") {
      params.set("availability", current.availability);
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
    setState("all");
    setCondition("all");
    setAvailability("all");
    setSortBy("newest");

    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    category !== "all" ||
    state !== "all" ||
    condition !== "all" ||
    availability !== "all" ||
    sortBy !== "newest";

  return (
    <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
        className="space-y-4"
      >
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tractors, combine harvesters, planters, boom sprayers..."
              className="w-full rounded-lg border border-neutral-300 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  applyFilters({ search: "" });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50 min-h-[44px]"
          >
            <Filter className="h-4 w-4" />
            <span>Search</span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Machinery Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                applyFilters({ category: e.target.value });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="all">All Machinery Categories</option>
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {EQUIPMENT_CATEGORY_LABELS[cat] || cat}
                </option>
              ))}
            </select>
          </div>

          {/* State */}
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
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="all">All Nigerian States</option>
              {NIGERIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st} State
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Machine Condition
            </label>
            <select
              value={condition}
              onChange={(e) => {
                setCondition(e.target.value);
                applyFilters({ condition: e.target.value });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="all">All Conditions</option>
              {EQUIPMENT_CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {EQUIPMENT_CONDITION_LABELS[cond]}
                </option>
              ))}
            </select>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Availability
            </label>
            <select
              value={availability}
              onChange={(e) => {
                setAvailability(e.target.value);
                applyFilters({ availability: e.target.value });
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="all">All Listings</option>
              <option value="available">Available Now</option>
              <option value="unavailable">Currently Booked / Unavailable</option>
            </select>
          </div>

          {/* Sort By */}
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
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 px-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="newest">Newest First</option>
              <option value="rate_asc">Daily Rate: Low to High</option>
              <option value="rate_desc">Daily Rate: High to Low</option>
            </select>
          </div>
        </div>

        {/* Reset Action */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-1 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
