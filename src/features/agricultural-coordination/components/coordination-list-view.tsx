"use client";

import React, { useState } from "react";
import { CoordinationOpportunity } from "../types";
import { CoordinationOpportunityCard } from "./coordination-opportunity-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Filter, Layers, ShieldCheck } from "lucide-react";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";

export interface CoordinationListViewProps {
  opportunities: CoordinationOpportunity[];
}

export function CoordinationListView({ opportunities }: CoordinationListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const filtered = opportunities.filter((opp) => {
    if (selectedState !== "ALL" && opp.targetState !== selectedState) return false;
    if (selectedStatus !== "ALL" && opp.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = opp.title.toLowerCase().includes(q);
      const matchCommodity = opp.commodity.toLowerCase().includes(q);
      const matchLga = opp.targetLga.toLowerCase().includes(q);
      if (!matchTitle && !matchCommodity && !matchLga) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Informational Header */}
      <div className="rounded-2xl bg-[#0F4327] text-white p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200 mb-2">
          <ShieldCheck className="h-4 w-4" />
          <span>Asset-Light Multi-Party Coordination Hub</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Agricultural Supply Coordination
        </h1>
        <p className="mt-2 text-sm text-emerald-100 max-w-2xl leading-relaxed">
          Coordinate multi-producer aggregation, processing, and delivery requirements
          without autonomous purchasing or capital exposure. Commit capacity against
          verified demand specifications.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E0D5] bg-[#FBF9F4]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter Opportunities ({filtered.length} of {opportunities.length})</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search commodity or LGA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#E5E0D5] bg-white focus:outline-hidden focus:ring-1 focus:ring-[#0F4327]"
            />
          </div>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E0D5] bg-white font-medium text-neutral-700"
            aria-label="Filter by Nigerian state"
          >
            <option value="ALL">All States</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E0D5] bg-white font-medium text-neutral-700"
            aria-label="Filter by coordination status"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open for Offers</option>
            <option value="PARTIALLY_COMMITTED">Partially Committed</option>
            <option value="FULLY_COMMITTED">Fully Committed</option>
            <option value="IN_FULFILMENT">In Fulfilment</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Opportunity Grid or Empty State */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No coordination opportunities found"
          description={
            opportunities.length === 0
              ? "There are currently no active multi-party coordination requests. New opportunities will appear here when commercial demand requires multi-producer pooling."
              : "No opportunities match the selected search and filter criteria. Try clearing filters to see all available requests."
          }
          icon={<Layers className="h-6 w-6 text-neutral-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((opportunity) => (
            <CoordinationOpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
