"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  INCIDENT_TYPES,
  INCIDENT_SEVERITY_LEVELS,
  INCIDENT_VERIFICATION_STATUSES,
} from "../types";
import {
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
  VERIFICATION_STATUS_LABELS,
} from "../constants";
import { Search, X, Filter } from "lucide-react";

interface SecurityFilterBarProps {
  initialSearch?: string;
  initialType?: string;
  initialSeverity?: string;
  initialVerification?: string;
  initialState?: string;
}

export function SecurityFilterBar({
  initialSearch = "",
  initialType = "all",
  initialSeverity = "all",
  initialVerification = "all",
  initialState = "all",
}: SecurityFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");

      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all" || value.trim() === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      startTransition(() => {
        router.push(`/learn/security?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const activeSearch = searchParams.get("search") || initialSearch;
  const activeType = searchParams.get("type") || initialType;
  const activeSeverity = searchParams.get("severity") || initialSeverity;
  const activeVerification = searchParams.get("verification") || initialVerification;
  const activeState = searchParams.get("state") || initialState;

  const hasActiveFilters =
    (activeType && activeType !== "all") ||
    (activeSeverity && activeSeverity !== "all") ||
    (activeVerification && activeVerification !== "all") ||
    (activeState && activeState !== "all") ||
    Boolean(activeSearch && activeSearch.trim());

  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Search security notices, corridors, states, or commodities (e.g. Kaduna, Grain, Maize)..."
          defaultValue={activeSearch}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilters({ search: (e.target as HTMLInputElement).value });
            }
          }}
          className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={(e) => {
            const input = (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement);
            updateFilters({ search: input?.value || "" });
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
        >
          {isPending ? "Filtering..." : "Search"}
        </button>
      </div>

      {/* Dropdown Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* State filter */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">State Scope</label>
          <select
            value={activeState}
            onChange={(e) => updateFilters({ state: e.target.value })}
            className="w-full py-2 px-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Nigerian States</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* Incident Type filter */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">Incident Type</label>
          <select
            value={activeType}
            onChange={(e) => updateFilters({ type: e.target.value })}
            className="w-full py-2 px-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Incident Types</option>
            {INCIDENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {INCIDENT_TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
        </div>

        {/* Severity filter */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">Severity Level</label>
          <select
            value={activeSeverity}
            onChange={(e) => updateFilters({ severity: e.target.value })}
            className="w-full py-2 px-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Severity Levels</option>
            {INCIDENT_SEVERITY_LEVELS.map((sev) => (
              <option key={sev} value={sev}>
                {SEVERITY_LABELS[sev] || sev}
              </option>
            ))}
          </select>
        </div>

        {/* Verification Status filter */}
        <div>
          <label className="block font-semibold text-gray-700 mb-1">Verification Status</label>
          <select
            value={activeVerification}
            onChange={(e) => updateFilters({ verification: e.target.value })}
            className="w-full py-2 px-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Statuses</option>
            {INCIDENT_VERIFICATION_STATUSES.map((ver) => (
              <option key={ver} value={ver}>
                {VERIFICATION_STATUS_LABELS[ver] || ver}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filters clear row */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
          <span className="flex items-center gap-1 font-medium text-emerald-800">
            <Filter className="w-3.5 h-3.5" /> Filtered results active
          </span>
          <button
            type="button"
            onClick={() =>
              updateFilters({
                search: null,
                state: null,
                type: null,
                severity: null,
                verification: null,
              })
            }
            className="inline-flex items-center gap-1 text-gray-500 hover:text-red-600 font-semibold"
          >
            <X className="w-3.5 h-3.5" /> Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
