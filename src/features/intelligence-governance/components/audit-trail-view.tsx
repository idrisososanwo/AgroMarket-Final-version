"use client";

import React, { useState } from "react";
import { GovernanceAuditEntry } from "../audit";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Filter,
  Clock,
  Search,
} from "lucide-react";

export interface AuditTrailViewProps {
  entries: GovernanceAuditEntry[];
}

export function AuditTrailView({ entries }: AuditTrailViewProps) {
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filtered = entries.filter((entry) => {
    if (filterAction !== "ALL" && !entry.action.includes(filterAction)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = entry.action.toLowerCase().includes(q);
      const matchResource = entry.resourceId.toLowerCase().includes(q);
      const matchActor = (entry.actorId || "").toLowerCase().includes(q);
      const matchDetails = JSON.stringify(entry.details).toLowerCase().includes(q);
      if (!matchAction && !matchResource && !matchActor && !matchDetails) return false;
    }
    return true;
  });

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No governance audit logs recorded yet"
        description="All deterministic evaluations, human approvals, and overrides will produce immutable entries here."
        icon={<FileText className="h-6 w-6 text-neutral-400" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E0D5] bg-[#FBF9F4]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">
          <Filter className="h-3.5 w-3.5" />
          <span>Audit Events ({filtered.length} of {entries.length})</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E0D5] bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#0F4327] w-48"
              aria-label="Search audit entries"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-lg border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-neutral-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
            aria-label="Filter by event action"
          >
            <option value="ALL">All Event Types</option>
            <option value="EVALUATION">Evaluations</option>
            <option value="APPROVAL">Approvals</option>
            <option value="OVERRIDE">Overrides</option>
          </select>

          {(filterAction !== "ALL" || searchQuery) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterAction("ALL");
                setSearchQuery("");
              }}
              className="text-xs h-8"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Audit Entries List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-[#E5E0D5] bg-white">
            <p className="text-sm text-neutral-500">No audit events match your search criteria.</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const isApproved = entry.action.includes("APPROVED") || entry.action.includes("ALLOW");
            const isDenied = entry.action.includes("DENY") || entry.action.includes("REJECTED");

            return (
              <div
                key={entry.id + entry.timestamp}
                className="p-4 rounded-xl border border-[#E5E0D5] bg-white shadow-2xs hover:border-neutral-300 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-800"
                          : isDenied
                          ? "bg-red-100 text-red-800"
                          : "bg-neutral-100 text-neutral-800"
                      }`}
                    >
                      {entry.action}
                    </span>
                    <span className="text-xs font-mono text-neutral-500">
                      Policy: {entry.policyVersion}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-neutral-600 my-2">
                  <div>
                    <span className="font-semibold text-neutral-700">Target Resource:</span>{" "}
                    <span className="font-mono text-neutral-800">{entry.resourceType}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-700">Resource ID:</span>{" "}
                    <span className="font-mono text-neutral-800">{entry.resourceId.slice(0, 16)}...</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-700">Actor:</span>{" "}
                    <span className="font-mono text-neutral-800">{entry.actorId || "SYSTEM"}</span>
                  </div>
                </div>

                {/* Details snippet */}
                {Object.keys(entry.details).length > 0 && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-[#FBF9F4] border border-[#E5E0D5] text-[11px] font-mono text-neutral-700 overflow-x-auto">
                    {JSON.stringify(entry.details, null, 2)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
