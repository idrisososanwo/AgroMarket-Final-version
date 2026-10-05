"use client";

import React, { useState } from "react";
import { AIReasoningRun } from "../reasoning-contracts";
import {
  Brain,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Info,
} from "lucide-react";
import { requestAgentReasoningAction } from "../ai-actions";

interface AIReasoningPanelProps {
  runs: AIReasoningRun[];
}

export function AIReasoningPanel({ runs }: AIReasoningPanelProps) {
  const [selectedRun, setSelectedRun] = useState<AIReasoningRun | null>(runs[0] || null);
  const [commodity, setCommodity] = useState("Tomato");
  const [state, setState] = useState("Kano");
  const [objective, setObjective] = useState<
    | "MARKET_INTERPRETATION"
    | "SUPPLY_DEMAND_ANALYSIS"
    | "FOOD_SECURITY_ASSESSMENT"
    | "LOGISTICS_IMPACT_ASSESSMENT"
    | "SECURITY_IMPACT_ASSESSMENT"
    | "PRODUCTION_SIGNAL_INTERPRETATION"
    | "PROCESSING_BOTTLENECK_ANALYSIS"
    | "GENERAL_AGRICULTURAL_INTELLIGENCE"
  >("MARKET_INTERPRETATION");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function handleTriggerReasoning(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const res = await requestAgentReasoningAction({
        objective,
        commodity,
        state,
      });

      if (res.success) {
        setActionMessage({
          type: "success",
          text: `Reasoning completed successfully. Status: ${res.data?.status}`,
        });
      } else {
        setActionMessage({
          type: "error",
          text: res.error || "Failed to complete AI reasoning.",
        });
      }
    } catch (err: unknown) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </span>
        );
      case "REJECTED_SAFETY":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
            <ShieldCheck className="h-3 w-3" /> Safety Rejection
          </span>
        );
      case "REJECTED_VALIDATION":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            <AlertTriangle className="h-3 w-3" /> Schema Rejection
          </span>
        );
      case "PROVIDER_UNAVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-800">
            <Info className="h-3 w-3" /> Provider Unavailable
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">
            <XCircle className="h-3 w-3" /> {status}
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Advisory AI Notice */}
      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
          <div className="text-xs text-sky-900 leading-relaxed">
            <p className="font-semibold text-sky-950">
              Controlled Evidence-Grounded Reasoning Layer
            </p>
            <p className="mt-0.5">
              The AI layer interprets structured agricultural signals, observations, and evidence.
              It does NOT have direct SQL database access, does NOT make autonomous financial disbursements or livestock movements,
              and strictly submits advisory recommendations into the human review state machine (<code>PROPOSED</code>).
            </p>
          </div>
        </div>
      </div>

      {/* Manual Trigger Form */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-neutral-900">
              Trigger Controlled Reasoning Pipeline
            </h3>
          </div>
          <span className="text-[11px] font-medium text-neutral-500">
            Requires Verified Domain Signals
          </span>
        </div>

        <form onSubmit={handleTriggerReasoning} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Objective
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value as typeof objective)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="MARKET_INTERPRETATION">Market Interpretation</option>
              <option value="SUPPLY_DEMAND_ANALYSIS">Supply & Demand Analysis</option>
              <option value="FOOD_SECURITY_ASSESSMENT">Food Security Assessment</option>
              <option value="LOGISTICS_IMPACT_ASSESSMENT">Logistics Impact</option>
              <option value="SECURITY_IMPACT_ASSESSMENT">Security Impact</option>
              <option value="PRODUCTION_SIGNAL_INTERPRETATION">Production Planning</option>
              <option value="PROCESSING_BOTTLENECK_ANALYSIS">Processing Bottleneck</option>
              <option value="GENERAL_AGRICULTURAL_INTELLIGENCE">General Advisory</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Commodity
            </label>
            <input
              type="text"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              placeholder="e.g. Tomato, Maize, Cowpea"
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-800 shadow-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Kano, Kaduna, Benue"
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-800 shadow-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow hover:bg-emerald-700 focus:outline-none disabled:opacity-50"
            >
              {isSubmitting ? "Reasoning..." : "Execute Reasoning"}
            </button>
          </div>
        </form>

        {actionMessage && (
          <div
            className={`mt-3 rounded-lg p-2.5 text-xs ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {actionMessage.text}
          </div>
        )}
      </div>

      {/* Main Runs Table & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Runs List */}
        <div className="lg:col-span-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-900">
              Reasoning Runs ({runs.length})
            </h3>
            <span className="text-[11px] text-neutral-500">
              Latest Executions
            </span>
          </div>

          {runs.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              No AI reasoning runs executed yet. Trigger a run above to generate evidence-based reasoning.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 mt-2">
              {runs.map((run) => (
                <div
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between ${
                    selectedRun?.id === run.id
                      ? "bg-emerald-50/70 border border-emerald-200"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-900">
                        {run.commodity}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        ({run.state})
                      </span>
                      {getStatusBadge(run.status)}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {run.objective} &bull; {run.provider} ({run.model})
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right text-[11px] text-neutral-400">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {run.latencyMs}ms
                      </div>
                      <div>
                        {new Date(run.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Run Details */}
        <div className="lg:col-span-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h3 className="text-sm font-semibold text-neutral-900">
              Run Inspection & Audits
            </h3>
            {selectedRun && getStatusBadge(selectedRun.status)}
          </div>

          {!selectedRun ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              Select a reasoning run from the list to view model outputs, safety checks, and confidence breakdown.
            </div>
          ) : (
            <div className="space-y-4 mt-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Commodity</span>
                  <p className="font-semibold text-neutral-800">{selectedRun.commodity}</p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">State</span>
                  <p className="font-semibold text-neutral-800">{selectedRun.state}</p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Provider</span>
                  <p className="font-semibold text-neutral-800">{selectedRun.provider}</p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold">Latency</span>
                  <p className="font-semibold text-neutral-800">{selectedRun.latencyMs}ms</p>
                </div>
              </div>

              {selectedRun.errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  <p className="font-semibold text-xs flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Rejection / Error Reason
                  </p>
                  <p className="mt-1 text-xs">{selectedRun.errorMessage}</p>
                </div>
              )}

              <div className="border border-neutral-100 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-700">Deterministic Evidence Grounding</span>
                  <span className="text-neutral-500 font-mono">Run ID: {selectedRun.id.slice(0, 8)}...</span>
                </div>
                <p className="text-neutral-500 text-[11px] leading-relaxed">
                  Reasoning was dispatched over structured signals and observations. All recommendations generated enter the human review state machine in <code>PROPOSED</code> status. Consequential actions (financial disbursements, livestock dispatches) require authorized human sign-off.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
