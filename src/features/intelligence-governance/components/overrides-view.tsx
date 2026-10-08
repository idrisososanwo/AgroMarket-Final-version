"use client";

import React, { useState } from "react";
import { GovernanceOverrideRecord } from "../types";
import { GovernanceStatusBadge } from "./governance-status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Lock,
  ArrowRight,
  FileCheck,
} from "lucide-react";

export interface OverridesViewProps {
  overrides: GovernanceOverrideRecord[];
}

export function OverridesView({ overrides }: OverridesViewProps) {
  const [selectedOverride, setSelectedOverride] = useState<GovernanceOverrideRecord | null>(
    overrides.length > 0 ? overrides[0] : null
  );

  if (overrides.length === 0) {
    return (
      <EmptyState
        title="No governance overrides recorded"
        description="All deterministic evaluations are operating without manual administrative overrides. Overrides remain rare, tightly governed exceptions."
        icon={<Lock className="h-6 w-6 text-neutral-400" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Immutability Banner */}
      <div className="p-4 rounded-xl border border-neutral-200 bg-[#FBF9F4] flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-white shrink-0 mt-0.5">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-neutral-900">
            Immutable Administrative Override Ledger
          </h3>
          <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
            Overrides represent affirmative administrative decisions that supersede deterministic policy evaluations. In accordance with platform compliance policy, all override records are strictly append-only and cannot be edited, modified, or deleted.
          </p>
        </div>
      </div>

      {/* Grid: Overrides List & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Overrides List */}
        <div className="lg:col-span-5 space-y-3">
          {overrides.map((item) => {
            const isSelected = selectedOverride?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedOverride(item)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-[#0F4327] bg-[#F4F9F5] shadow-xs"
                    : "border-[#E5E0D5] bg-white hover:border-neutral-300 hover:bg-neutral-50/50"
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-2 mb-2">
                  <GovernanceStatusBadge decision={item.originalDecision} size="sm" />
                  <ArrowRight className="h-3 w-3 text-neutral-400" />
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200">
                    {item.overrideDecision.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="text-xs font-semibold text-neutral-900 line-clamp-2 mb-1.5">
                  {item.reason}
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                  <span>Actor: {item.overrideRole}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Selected Override Detail */}
        <div className="lg:col-span-7">
          {selectedOverride ? (
            <Card className="border-[#E5E0D5] shadow-sm">
              <CardHeader className="border-b border-[#E5E0D5] pb-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <GovernanceStatusBadge decision={selectedOverride.originalDecision} size="md" />
                    <ArrowRight className="h-4 w-4 text-neutral-400" />
                    <span className="px-2.5 py-1 rounded text-xs font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200">
                      {selectedOverride.overrideDecision.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">
                    Policy: {selectedOverride.policyVersion}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-neutral-900">
                  Administrative Override #{selectedOverride.id.slice(0, 8)}
                </CardTitle>
                <p className="text-xs text-neutral-500 mt-1">
                  Overridden by: <strong className="text-neutral-800">{selectedOverride.overrideById}</strong> ({selectedOverride.overrideRole}) • Recorded:{" "}
                  {new Date(selectedOverride.createdAt).toLocaleString()}
                </p>
              </CardHeader>

              <CardContent className="space-y-6 pt-5">
                {/* Justification Box */}
                <div className="p-4 rounded-xl border border-[#E5E0D5] bg-white">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5 text-[#0F4327]" />
                    <span>Affirmative Administrative Justification</span>
                  </div>
                  <p className="text-xs text-neutral-800 leading-relaxed font-sans">
                    {selectedOverride.reason}
                  </p>
                </div>

                {/* Overridden Policy Rules */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                    Overridden Policy Rule Keys
                  </div>
                  {!selectedOverride.overriddenPolicyRules || selectedOverride.overriddenPolicyRules.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">No specific rule keys specified.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedOverride.overriddenPolicyRules.map((rule: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-700 font-mono text-xs border border-neutral-200"
                        >
                          {rule}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Correlated IDs */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-[#E5E0D5] bg-neutral-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Evaluation ID</div>
                    <div className="font-mono text-neutral-800 mt-0.5 truncate">
                      {selectedOverride.evaluationId}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E5E0D5] bg-neutral-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Immutability Status</div>
                    <div className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" /> Append-Only Verified
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 text-center rounded-xl border border-dashed border-[#E5E0D5] bg-[#FBF9F4]">
              <p className="text-sm text-neutral-500">Select an override to inspect details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
