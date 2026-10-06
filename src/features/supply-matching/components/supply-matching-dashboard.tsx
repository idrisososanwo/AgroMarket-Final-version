"use client";

/**
 * AgroMarket Phase 2.6: Supply Matching & Agricultural Coordination Dashboard
 *
 * Visual coordination console presenting:
 * 1. Overview KPIs (Matching pressure, volumes, aggregations, bottlenecks)
 * 2. Interactive Match Explorer (Deterministic score breakdown, proximity, availability)
 * 3. Supply Gap Analyzer (Fulfilled vs deficit volumes)
 * 4. Multi-Source Aggregation Opportunities
 * 5. Processing Coordination & Bottleneck Detection
 * 6. Regional Corridor Analysis
 * 7. AI Gateway Advisory Interpretation (Clearly separated from deterministic metrics)
 * 8. Human-in-the-Loop Coordination Recommendations with state transitions
 */

import React, { useState } from "react";
import {
  Link2,
  Layers,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Building,
  CheckCircle2,
  Info,
} from "lucide-react";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  SupplyMatchingSnapshot,
  SupplyCoordinationRecommendationRecord,
  SupplyMatchingOverviewStats,
  SupplyMatchingRunResult,
  RecommendationLifecycleStatus,
  SupplyComponentScoresSummary,
} from "../types";
import {
  runSupplyMatchingAction,
  updateCoordinationRecommendationAction,
} from "../actions";

interface SupplyMatchingDashboardProps {
  initialSnapshots: SupplyMatchingSnapshot[];
  initialRecommendations: SupplyCoordinationRecommendationRecord[];
  initialStats: SupplyMatchingOverviewStats;
}

export function SupplyMatchingDashboard({
  initialSnapshots,
  initialRecommendations,
  initialStats,
}: SupplyMatchingDashboardProps) {
  const [commodity, setCommodity] = useState("Maize");
  const [selectedState, setSelectedState] = useState("Kano");
  const [targetQuantity, setTargetQuantity] = useState<number>(5000);
  const [unit, setUnit] = useState("KG");
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "EXPLORER" | "GAP" | "AGGREGATION" | "PROCESSING" | "REGIONAL" | "RECOMMENDATIONS"
  >("EXPLORER");

  const [snapshots, setSnapshots] = useState<SupplyMatchingSnapshot[]>(initialSnapshots);
  const [recommendations, setRecommendations] = useState<SupplyCoordinationRecommendationRecord[]>(
    initialRecommendations
  );
  const [stats, setStats] = useState<SupplyMatchingOverviewStats>(initialStats);
  const [latestResult, setLatestResult] = useState<SupplyMatchingRunResult | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "SUCCESS" | "ERROR"; text: string } | null>(
    null
  );

  const handleRunMatching = async () => {
    setIsRunning(true);
    setActionMessage(null);

    try {
      const result = await runSupplyMatchingAction({
        commodity,
        state: selectedState,
        targetQuantity: Number(targetQuantity) || 1000,
        unit,
      });

      if (result.success) {
        setLatestResult(result);
        setSnapshots((prev) => [result.snapshot, ...prev]);
        if (result.recommendations.length > 0) {
          setRecommendations((prev) => [...result.recommendations, ...prev]);
        }
        setStats((prev: SupplyMatchingOverviewStats) => ({
          ...prev,
          totalSnapshotsCount: prev.totalSnapshotsCount + 1,
          totalMatchedVolume: prev.totalMatchedVolume + result.snapshot.matched_quantity,
          totalUnmatchedGap: prev.totalUnmatchedGap + result.snapshot.remaining_gap,
        }));
        setActionMessage({
          type: "SUCCESS",
          text: `Matching completed for ${commodity} in ${selectedState}. Score: ${result.snapshot.match_score}/100 (${result.snapshot.match_classification}).`,
        });
      } else {
        setActionMessage({
          type: "ERROR",
          text: result.error || "Matching execution failed.",
        });
      }
    } catch (err: unknown) {
      setActionMessage({
        type: "ERROR",
        text: err instanceof Error ? err.message : "Failed to run matching.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleUpdateRecommendation = async (
    recId: string,
    newStatus: RecommendationLifecycleStatus
  ) => {
    try {
      const res = await updateCoordinationRecommendationAction({
        recommendationId: recId,
        status: newStatus,
      });

      if (res.success) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === recId ? { ...r, status: newStatus } : r))
        );
        setActionMessage({ type: "SUCCESS", text: res.message });
      } else {
        setActionMessage({ type: "ERROR", text: res.message });
      }
    } catch (err: unknown) {
      setActionMessage({
        type: "ERROR",
        text: err instanceof Error ? err.message : "Failed to update recommendation status.",
      });
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (score >= 70) return "bg-teal-100 text-teal-800 border-teal-300";
    if (score >= 45) return "bg-amber-100 text-amber-800 border-amber-300";
    if (score >= 20) return "bg-orange-100 text-orange-800 border-orange-300";
    return "bg-rose-100 text-rose-800 border-rose-300";
  };

  return (
    <div className="space-y-8">
      {/* 1. Banner Header */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow">
              <Link2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                Supply Matching & Agricultural Coordination Console
              </h1>
              <p className="text-xs text-neutral-600">
                Phase 2.6 • Deterministic value-chain matching across Supply ↔ Offtake Demand ↔ Processing Facilities ↔ Logistics Corridors.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Advisory Coordination Active
            </span>
          </div>
        </div>

        {/* Advisory Invariant Notice */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
          <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <p>
            <strong>Advisory Engine:</strong> The agent deterministically discovers and scores alignment, multi-source aggregation pools, and transit corridors. It <em>never</em> autonomously buys, reserves, transfers, contracts, or commits funds. All value-chain action remains strictly authoritative to human stakeholders.
          </p>
        </div>
      </div>

      {/* 2. Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-neutral-500">Evaluated Snapshots</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-neutral-900">{stats.totalSnapshotsCount}</span>
            <span className="text-xs font-semibold text-emerald-600">Active</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Deterministic runs</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-neutral-500">Matched Volume</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700">
              {stats.totalMatchedVolume.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-neutral-500">KG</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Verified supply mapped</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-neutral-500">Unmatched Gap</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700">
              {stats.totalUnmatchedGap.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-neutral-500">KG</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Procurement deficit</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-neutral-500">Multi-Source Pools</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-teal-700">
              {stats.multiSourceAggregationCount}
            </span>
            <span className="text-xs font-semibold text-teal-600">Clusters</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Aggregated matches</span>
        </div>
      </div>

      {/* 3. Interactive Execution Control */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-neutral-900">Run Deterministic Supply Match Evaluation</h2>
          </div>
          <span className="text-[11px] text-neutral-400">Zero Black-Box Scoring • Explainable Formula</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Commodity</label>
            <input
              type="text"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              placeholder="e.g. Maize, Cassava, Soya"
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Offtake State</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            >
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Target Quantity</label>
            <input
              type="number"
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            >
              <option value="KG">KG</option>
              <option value="TONNES">TONNES</option>
              <option value="LITRES">LITRES</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {actionMessage ? (
            <span
              className={`text-xs ${
                actionMessage.type === "SUCCESS" ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {actionMessage.text}
            </span>
          ) : (
            <span className="text-[11px] text-neutral-500">
              Calculates compatibility, multi-source pooling, processing facility fit, and corridor safety.
            </span>
          )}

          <button
            onClick={handleRunMatching}
            disabled={isRunning || !commodity}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Evaluating Value Chain...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Execute Supply Matching</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Latest Evaluation Spotlight (if available) */}
      {latestResult && (
        <div className="rounded-xl border border-emerald-300 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Latest Evaluation
                </span>
                <h3 className="text-sm font-bold text-neutral-900">
                  {latestResult.commodity} in {latestResult.state}
                </h3>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Target: {latestResult.snapshot.target_quantity.toLocaleString()} {latestResult.snapshot.unit} • Coordination: {latestResult.snapshot.coordination_type.replace(/_/g, " ")}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block">Match Score</span>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreBadgeColor(
                    latestResult.snapshot.match_score
                  )}`}
                >
                  {latestResult.snapshot.match_score}/100 • {latestResult.snapshot.match_classification.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>

          {/* Component Scores Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
            <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100">
              <span className="text-[10px] text-neutral-500 block">Commodity (30)</span>
              <span className="font-bold text-neutral-900">
                {(latestResult.snapshot.component_scores as SupplyComponentScoresSummary)?.commodityCompatibility ?? 0}
              </span>
            </div>
            <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100">
              <span className="text-[10px] text-neutral-500 block">Quantity (20)</span>
              <span className="font-bold text-neutral-900">
                {(latestResult.snapshot.component_scores as SupplyComponentScoresSummary)?.quantityCompatibility ?? 0}
              </span>
            </div>
            <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100">
              <span className="text-[10px] text-neutral-500 block">Location (15)</span>
              <span className="font-bold text-neutral-900">
                {(latestResult.snapshot.component_scores as SupplyComponentScoresSummary)?.locationCompatibility ?? 0}
              </span>
            </div>
            <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100">
              <span className="text-[10px] text-neutral-500 block">Availability (15)</span>
              <span className="font-bold text-neutral-900">
                {(latestResult.snapshot.component_scores as SupplyComponentScoresSummary)?.availabilityCompatibility ?? 0}
              </span>
            </div>
            <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100">
              <span className="text-[10px] text-neutral-500 block">Specs (10)</span>
              <span className="font-bold text-neutral-900">
                {(latestResult.snapshot.component_scores as SupplyComponentScoresSummary)?.specificationCompatibility ?? 0}
              </span>
            </div>
            <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100">
              <span className="text-[10px] text-neutral-500 block">Processing (5)</span>
              <span className="font-bold text-neutral-900">
                {(latestResult.snapshot.component_scores as SupplyComponentScoresSummary)?.processingAggregationFit ?? 0}
              </span>
            </div>
            <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-100">
              <span className="text-[10px] text-neutral-500 block">Logistics (5)</span>
              <span className="font-bold text-neutral-900">
                {(latestResult.snapshot.component_scores as SupplyComponentScoresSummary)?.logisticsCompatibility ?? 0}
              </span>
            </div>
          </div>

          {/* Fulfillment Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-neutral-700">Fulfillment Progress</span>
              <span className="font-bold text-emerald-800">
                {latestResult.snapshot.matched_quantity.toLocaleString()} /{" "}
                {latestResult.snapshot.target_quantity.toLocaleString()} {latestResult.snapshot.unit} (
                {latestResult.snapshot.fulfillment_percentage}%)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, latestResult.snapshot.fulfillment_percentage)}%` }}
              />
            </div>
          </div>

          {/* AI Interpretation Box */}
          {latestResult.aiInterpretation && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-indigo-950">AI Gateway Advisory Interpretation</h4>
                </div>
                <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">
                  {latestResult.aiInterpretation.isAIGenerated ? "AI Generated • Advisory" : "Deterministic Fallback"}
                </span>
              </div>
              <p className="text-xs text-indigo-900 leading-relaxed">
                {latestResult.aiInterpretation.summary}
              </p>
              {latestResult.aiInterpretation.bottlenecks.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-indigo-900">Identified Bottlenecks & Constraints:</span>
                  <ul className="mt-1 list-disc list-inside text-[11px] text-indigo-800 space-y-0.5">
                    {latestResult.aiInterpretation.bottlenecks.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Navigation Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab("EXPLORER")}
            className={`pb-3 text-xs font-bold transition border-b-2 ${
              activeTab === "EXPLORER"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Match Explorer ({snapshots.length})
          </button>
          <button
            onClick={() => setActiveTab("GAP")}
            className={`pb-3 text-xs font-bold transition border-b-2 ${
              activeTab === "GAP"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Supply Gap Analysis
          </button>
          <button
            onClick={() => setActiveTab("AGGREGATION")}
            className={`pb-3 text-xs font-bold transition border-b-2 ${
              activeTab === "AGGREGATION"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Aggregation Pools
          </button>
          <button
            onClick={() => setActiveTab("PROCESSING")}
            className={`pb-3 text-xs font-bold transition border-b-2 ${
              activeTab === "PROCESSING"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Processing Capacity
          </button>
          <button
            onClick={() => setActiveTab("RECOMMENDATIONS")}
            className={`pb-3 text-xs font-bold transition border-b-2 ${
              activeTab === "RECOMMENDATIONS"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Coordination Recommendations ({recommendations.length})
          </button>
        </nav>
      </div>

      {/* 6. Tab Content Panels */}
      {activeTab === "EXPLORER" && (
        <div className="space-y-4">
          {snapshots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-500">
              No supply matching evaluations recorded yet. Run a match above to analyze value-chain alignment.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {snapshots.map((snap, idx) => (
                <div
                  key={snap.id || idx}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-emerald-400 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-neutral-900 text-sm">
                          {snap.commodity}
                        </span>
                        <span className="text-xs text-neutral-500">• {snap.state}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getScoreBadgeColor(
                            snap.match_score
                          )}`}
                        >
                          {snap.match_score}/100 • {snap.match_classification.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Demand: {snap.target_quantity.toLocaleString()} {snap.unit} • Matched:{" "}
                        {snap.matched_quantity.toLocaleString()} {snap.unit} ({snap.fulfillment_percentage}%)
                        • Gap: {snap.remaining_gap.toLocaleString()} {snap.unit}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 text-right">
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Coordination</span>
                        <span className="text-xs font-medium text-neutral-700">
                          {snap.coordination_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Candidates</span>
                        <span className="text-xs font-semibold text-emerald-700">
                          {snap.candidates_count} source(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  {snap.constraints.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-neutral-100 flex items-start gap-1.5 text-[11px] text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{snap.constraints.join(" • ")}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "GAP" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Offtake Supply Gap Distribution</h3>
            <p className="text-xs text-neutral-500">
              Evaluates current platform deficits per commodity to direct future cluster planting and procurement pacing.
            </p>

            <div className="space-y-3">
              {snapshots.slice(0, 10).map((s, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-neutral-800">
                      {s.commodity} ({s.state})
                    </span>
                    <span className="text-neutral-500">
                      Fulfilled: {s.matched_quantity.toLocaleString()} {s.unit} | Deficit:{" "}
                      <strong className="text-amber-700">{s.remaining_gap.toLocaleString()} {s.unit}</strong> (
                      {s.fulfillment_percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden flex">
                    <div
                      className="bg-emerald-600 h-full"
                      style={{ width: `${Math.min(100, s.fulfillment_percentage)}%` }}
                    />
                    <div
                      className="bg-amber-400 h-full"
                      style={{ width: `${Math.max(0, 100 - s.fulfillment_percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "AGGREGATION" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-neutral-900">Multi-Farmer Aggregation Opportunities</h3>
            </div>
            <p className="text-xs text-neutral-500">
              Where single farmers lack sufficient quantity, the agent recommends pooling production batches across nearby LGA clusters.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {snapshots
                .filter((s) => s.coordination_type === "MULTI_SOURCE_AGGREGATION")
                .map((snap, idx) => (
                  <div key={idx} className="rounded-lg border border-teal-200 bg-teal-50/40 p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-teal-950">
                        {snap.commodity} in {snap.state}
                      </span>
                      <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                        {snap.candidates_count} Suppliers Pooled
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600">
                      Aggregated Volume: <strong>{snap.matched_quantity.toLocaleString()} {snap.unit}</strong> of{" "}
                      {snap.target_quantity.toLocaleString()} {snap.unit} required ({snap.fulfillment_percentage}% fulfilled).
                    </p>
                    <span className="text-[11px] text-teal-800 font-medium block">
                      Recommended Hub: {snap.state} Central Aggregation Center
                    </span>
                  </div>
                ))}
              {snapshots.filter((s) => s.coordination_type === "MULTI_SOURCE_AGGREGATION").length === 0 && (
                <div className="col-span-2 text-center text-xs text-neutral-400 py-6">
                  No multi-source aggregation matches active currently. Run matching on large B2B demand to discover pooling opportunities.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "PROCESSING" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-neutral-900">Processing Facilities & Downstream Capacity</h3>
            </div>
            <p className="text-xs text-neutral-500">
              Monitors commodities requiring transformation (e.g. live poultry dressing, cassava milling, oil palm pressing) against certified processing plants.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {snapshots
                .filter((s) => s.processing_required)
                .map((snap, idx) => (
                  <div key={idx} className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-indigo-950">
                        {snap.commodity} ({snap.state})
                      </span>
                      <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                        Processing Required
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600">
                      Raw Volume to Process: {snap.matched_quantity.toLocaleString()} {snap.unit}
                    </p>
                    <span className="text-[11px] text-indigo-900 font-medium block">
                      {snap.processing_facility_id
                        ? "Certified facility mapped on transit corridor."
                        : "Constraint: No certified facility in corridor; interstate routing required."}
                    </span>
                  </div>
                ))}
              {snapshots.filter((s) => s.processing_required).length === 0 && (
                <div className="col-span-2 text-center text-xs text-neutral-400 py-6">
                  No processing-dependent matches identified.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "RECOMMENDATIONS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">
              Advisory Coordination Recommendations
            </h3>
            <span className="text-xs text-neutral-500">Human-in-the-Loop Review Gate</span>
          </div>

          {recommendations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-500">
              No advisory recommendations currently awaiting action.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-neutral-900">{rec.title}</span>
                        <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                          {rec.recommendation_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{rec.details}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rec.status === "PROPOSED"
                            ? "bg-amber-100 text-amber-800"
                            : rec.status === "ACCEPTED" || rec.status === "ACTIONED"
                            ? "bg-emerald-100 text-emerald-800"
                            : rec.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  </div>

                  {/* State Machine Transition Actions */}
                  {rec.id && (
                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400">
                        Confidence: {(rec.confidence * 100).toFixed(0)}% • Advisory Only
                      </span>
                      <div className="flex items-center space-x-2">
                        {rec.status === "PROPOSED" && (
                          <>
                            <button
                              onClick={() => handleUpdateRecommendation(rec.id!, "REVIEWED")}
                              className="rounded border border-neutral-300 px-2 py-1 text-[10px] font-medium text-neutral-700 hover:bg-neutral-50"
                            >
                              Mark Reviewed
                            </button>
                            <button
                              onClick={() => handleUpdateRecommendation(rec.id!, "ACCEPTED")}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
                            >
                              Accept Advisory
                            </button>
                            <button
                              onClick={() => handleUpdateRecommendation(rec.id!, "REJECTED")}
                              className="rounded border border-rose-300 px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {rec.status === "REVIEWED" && (
                          <>
                            <button
                              onClick={() => handleUpdateRecommendation(rec.id!, "ACCEPTED")}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
                            >
                              Accept Advisory
                            </button>
                            <button
                              onClick={() => handleUpdateRecommendation(rec.id!, "REJECTED")}
                              className="rounded border border-rose-300 px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {rec.status === "ACCEPTED" && (
                          <button
                            onClick={() => handleUpdateRecommendation(rec.id!, "ACTIONED")}
                            className="rounded bg-teal-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-teal-700"
                          >
                            Mark Actioned
                          </button>
                        )}
                        {rec.status === "ACTIONED" && (
                          <button
                            onClick={() => handleUpdateRecommendation(rec.id!, "COMPLETED")}
                            className="rounded bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-blue-700"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
