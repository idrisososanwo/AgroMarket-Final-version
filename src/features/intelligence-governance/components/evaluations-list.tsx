"use client";

import React, { useState } from "react";
import { GovernanceEvaluationResult } from "../types";
import { GovernanceStatusBadge } from "./governance-status-badge";
import { RiskLevelBadge } from "./risk-level-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ShieldAlert,
  Filter,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";

export interface EvaluationsListProps {
  evaluations: GovernanceEvaluationResult[];
}

export function EvaluationsList({ evaluations }: EvaluationsListProps) {
  const [selectedEval, setSelectedEval] = useState<GovernanceEvaluationResult | null>(
    evaluations.length > 0 ? evaluations[0] : null
  );
  const [decisionFilter, setDecisionFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");

  const filtered = evaluations.filter((item) => {
    if (decisionFilter !== "ALL" && item.decision !== decisionFilter) return false;
    if (riskFilter !== "ALL" && item.riskLevel !== riskFilter) return false;
    return true;
  });

  if (evaluations.length === 0) {
    return (
      <EmptyState
        title="No governance evaluations yet"
        description="The deterministic policy engine has not evaluated any agricultural actions or recommendations yet."
        icon={<ShieldAlert className="h-6 w-6 text-neutral-400" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E0D5] bg-[#FBF9F4]">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-600">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters ({filtered.length} of {evaluations.length})</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="rounded-lg border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-neutral-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
            aria-label="Filter by decision"
          >
            <option value="ALL">All Decisions</option>
            <option value="ALLOW">Allow</option>
            <option value="ALLOW_WITH_REVIEW">Allow with Review</option>
            <option value="REQUIRE_HUMAN_APPROVAL">Require Human Approval</option>
            <option value="REQUIRE_PROFESSIONAL_REVIEW">Require Professional Review</option>
            <option value="REQUIRE_AUTHORITY_REVIEW">Require Authority Review</option>
            <option value="DENY">Deny (Blocked)</option>
            <option value="INSUFFICIENT_DATA">Insufficient Data</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-lg border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-neutral-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
            aria-label="Filter by risk level"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low</option>
            <option value="MODERATE">Moderate</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          {(decisionFilter !== "ALL" || riskFilter !== "ALL") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDecisionFilter("ALL");
                setRiskFilter("ALL");
              }}
              className="text-xs h-8"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: List and Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Evaluation List */}
        <div className="lg:col-span-5 space-y-3">
          {filtered.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-[#E5E0D5] bg-white">
              <p className="text-sm text-neutral-500">No evaluations match the selected filters.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selectedEval?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedEval(item)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "border-[#0F4327] bg-[#F4F9F5] shadow-xs"
                      : "border-[#E5E0D5] bg-white hover:border-neutral-300 hover:bg-neutral-50/50"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <GovernanceStatusBadge decision={item.decision} size="sm" />
                    <RiskLevelBadge level={item.riskLevel} size="sm" />
                  </div>

                  <div className="text-xs font-bold text-neutral-900 line-clamp-1 mb-1">
                    {item.actionIntent}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="font-mono text-neutral-600 truncate max-w-[180px]">
                      {item.agentId.replace("_AGENT", "")}
                    </span>
                    <span>{new Date(item.evaluatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Detail View */}
        <div className="lg:col-span-7">
          {selectedEval ? (
            <Card className="border-[#E5E0D5] shadow-sm">
              <CardHeader className="border-b border-[#E5E0D5] pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <GovernanceStatusBadge decision={selectedEval.decision} size="md" />
                    <RiskLevelBadge level={selectedEval.riskLevel} size="md" />
                  </div>
                  <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">
                    Policy: {selectedEval.policyVersion}
                  </span>
                </div>
                <CardTitle className="text-base font-bold text-neutral-900 leading-snug">
                  {selectedEval.actionIntent}
                </CardTitle>
                <p className="text-xs text-neutral-500 mt-1">
                  Evaluation ID: <span className="font-mono">{selectedEval.id}</span> • Timestamp:{" "}
                  {new Date(selectedEval.evaluatedAt).toLocaleString()}
                </p>
              </CardHeader>

              <CardContent className="space-y-6 pt-5">
                {/* Visual Governance Lineage Chain */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    <span>Governance Execution Lineage</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-[#E5E0D5] bg-[#FBF9F4] text-xs font-semibold text-neutral-800">
                    <span className="px-2 py-1 rounded bg-white border border-[#E5E0D5] text-[#0F4327]">
                      1. Recommendation
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <span className="px-2 py-1 rounded bg-[#0F4327] text-white">
                      2. Governance Evaluation ({selectedEval.decision})
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <span className="px-2 py-1 rounded bg-white border border-[#E5E0D5] text-neutral-700">
                      3. Oversight / Approval
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <span className="px-2 py-1 rounded bg-white border border-[#E5E0D5] text-neutral-700">
                      4. Action Gate
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                    <span className="px-2 py-1 rounded bg-white border border-[#E5E0D5] text-neutral-700">
                      5. Outcome
                    </span>
                  </div>
                </div>

                {/* Key Governance Attributes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-[#E5E0D5] bg-neutral-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Agent</div>
                    <div className="text-xs font-semibold text-neutral-900 mt-0.5 truncate">
                      {selectedEval.agentId}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E5E0D5] bg-neutral-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Domain</div>
                    <div className="text-xs font-semibold text-neutral-900 mt-0.5">
                      {selectedEval.domain}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E5E0D5] bg-neutral-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Actor Role</div>
                    <div className="text-xs font-semibold text-neutral-900 mt-0.5">
                      {selectedEval.actorRole}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E5E0D5] bg-neutral-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Autonomy Level</div>
                    <div className="text-xs font-semibold text-neutral-900 mt-0.5">
                      {selectedEval.autonomyLevel}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E5E0D5] bg-neutral-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Confidence</div>
                    <div className="text-xs font-semibold text-neutral-900 mt-0.5 font-mono">
                      {(selectedEval.confidenceScore * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E5E0D5] bg-neutral-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Evidence Count</div>
                    <div className="text-xs font-semibold text-neutral-900 mt-0.5 font-mono">
                      {selectedEval.evidenceCount} verified signals
                    </div>
                  </div>
                </div>

                {/* Reasons / Policy Findings */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                    Policy Assessment Reasons & Findings
                  </div>
                  <div className="space-y-1.5">
                    {selectedEval.reasons.length === 0 ? (
                      <p className="text-xs text-neutral-500 italic">No specific infractions or warnings recorded.</p>
                    ) : (
                      selectedEval.reasons.map((reason, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2.5 rounded-lg border border-[#E5E0D5] bg-white text-xs text-neutral-800"
                        >
                          <Info className="h-3.5 w-3.5 text-neutral-500 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Linked References */}
                {(selectedEval.recommendationId || selectedEval.scenarioId) && (
                  <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 text-xs space-y-1">
                    <div className="font-bold text-neutral-700">Correlated Pipeline Artifacts:</div>
                    {selectedEval.recommendationId && (
                      <div className="text-neutral-600">
                        Recommendation ID: <span className="font-mono font-medium">{selectedEval.recommendationId}</span>
                      </div>
                    )}
                    {selectedEval.scenarioId && (
                      <div className="text-neutral-600">
                        Scenario ID: <span className="font-mono font-medium">{selectedEval.scenarioId}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 text-center rounded-xl border border-dashed border-[#E5E0D5] bg-[#FBF9F4]">
              <p className="text-sm text-neutral-500">Select an evaluation from the list to view its complete policy chain.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
