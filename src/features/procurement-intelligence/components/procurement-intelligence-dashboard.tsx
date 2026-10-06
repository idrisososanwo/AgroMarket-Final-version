"use client";

import React, { useState } from "react";
import {
  ProcurementIntelligenceSnapshot,
  ProcurementOpportunityRecord,
  ProcurementRecommendationRecord,
  ProcurementOverviewStats,
} from "../types";
import {
  runProcurementIntelligenceAction,
  reviewProcurementRecommendationAction,
} from "../actions";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  Briefcase,
  Play,
  RotateCw,
  Search,
  Info,
} from "lucide-react";

interface ProcurementDashboardProps {
  initialSnapshots: ProcurementIntelligenceSnapshot[];
  initialOpportunities: ProcurementOpportunityRecord[];
  initialRecommendations: ProcurementRecommendationRecord[];
  initialStats: ProcurementOverviewStats;
}

export function ProcurementIntelligenceDashboard({
  initialSnapshots,
  initialOpportunities,
  initialRecommendations,
  initialStats,
}: ProcurementDashboardProps) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [stats, setStats] = useState(initialStats);

  const [activeTab, setActiveTab] = useState<
    "overview" | "opportunities" | "strategies" | "market" | "recommendations"
  >("overview");

  // Runner state
  const [testCommodity, setTestCommodity] = useState("White Maize");
  const [testState, setTestState] = useState("Kano");
  const [testQuantity, setTestQuantity] = useState("5000");
  const [testUnit, setTestUnit] = useState("KG");
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Reviewing recommendation state
  const [actioningId, setActioningId] = useState<string | null>(null);

  const handleRunPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setRunMessage(null);

    const formData = new FormData();
    formData.append("commodity", testCommodity);
    formData.append("state", testState);
    formData.append("targetQuantity", testQuantity);
    formData.append("unit", testUnit);

    const res = await runProcurementIntelligenceAction(formData);
    setIsRunning(false);

    if (res.success && res.result) {
      setRunMessage({ text: "Procurement intelligence pipeline executed successfully." });
      setSnapshots([res.result.snapshot, ...snapshots]);
      if (res.result.opportunity) {
        setOpportunities([res.result.opportunity, ...opportunities]);
      }
      if (res.result.recommendations.length > 0) {
        setRecommendations([...res.result.recommendations, ...recommendations]);
      }
      // Increment stats locally
      setStats((prev) => ({
        ...prev,
        openOpportunitiesCount: prev.openOpportunitiesCount + 1,
        totalVolumeRequired: prev.totalVolumeRequired + (Number(testQuantity) || 0),
        totalVolumeSourced: prev.totalVolumeSourced + res.result.snapshot.matched_quantity,
        totalVolumeGap: prev.totalVolumeGap + res.result.snapshot.supply_gap,
      }));
    } else {
      setRunMessage({ text: res.error || "Failed to execute pipeline", error: true });
    }
  };

  const handleReviewRecommendation = async (
    recommendationId: string,
    decision: "ACCEPTED" | "REJECTED" | "ACTIONED" | "COMPLETED"
  ) => {
    setActioningId(recommendationId);
    const res = await reviewProcurementRecommendationAction({
      recommendationId,
      decision,
    });
    setActioningId(null);

    if (res.success) {
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recommendationId ? { ...r, status: decision } : r))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Pipeline Trigger */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-md bg-amber-100 p-1.5 text-amber-800">
                <Briefcase className="h-5 w-5" />
              </span>
              <h2 className="text-base font-bold text-neutral-900">
                Procurement Intelligence & B2B Coordination Engine
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Deterministic priority scoring, supplier diversification, risk modeling, and advisory recommendations.
              Strictly non-autonomous: human review remains authoritative.
            </p>
          </div>

          {/* Test Runner Form */}
          <form onSubmit={handleRunPipeline} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={testCommodity}
              onChange={(e) => setTestCommodity(e.target.value)}
              placeholder="Commodity"
              className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-800 focus:border-amber-500 focus:outline-none w-32"
              required
            />
            <select
              value={testState}
              onChange={(e) => setTestState(e.target.value)}
              className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-800 focus:border-amber-500 focus:outline-none"
            >
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={testQuantity}
              onChange={(e) => setTestQuantity(e.target.value)}
              placeholder="Qty"
              className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-800 focus:border-amber-500 focus:outline-none w-20"
              required
            />
            <input
              type="text"
              value={testUnit}
              onChange={(e) => setTestUnit(e.target.value)}
              placeholder="Unit"
              className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-800 focus:border-amber-500 focus:outline-none w-16"
              required
            />
            <button
              type="submit"
              disabled={isRunning}
              className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RotateCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Evaluating...
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Run Evaluation
                </>
              )}
            </button>
          </form>
        </div>

        {runMessage && (
          <div
            className={`mt-3 rounded-lg p-2.5 text-xs ${
              runMessage.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {runMessage.text}
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Open Opportunities
          </span>
          <p className="mt-1 text-xl font-bold text-neutral-900">{stats.openOpportunitiesCount}</p>
          <span className="text-[10px] text-neutral-500">Active B2B demands</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
            High Priority
          </span>
          <p className="mt-1 text-xl font-bold text-amber-700">{stats.highPriorityCount}</p>
          <span className="text-[10px] text-neutral-500">Priority score &gt;= 60</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
            Partially Sourced
          </span>
          <p className="mt-1 text-xl font-bold text-blue-700">{stats.partiallySourcedCount}</p>
          <span className="text-[10px] text-neutral-500">Active partial supply</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
            Fully Sourced
          </span>
          <p className="mt-1 text-xl font-bold text-emerald-700">{stats.fullySourcedCount}</p>
          <span className="text-[10px] text-neutral-500">&gt;= 98% coverage</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600">
            High Risk
          </span>
          <p className="mt-1 text-xl font-bold text-red-700">{stats.highRiskCount}</p>
          <span className="text-[10px] text-neutral-500">Friction or high deficit</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600">
            Concentration Alert
          </span>
          <p className="mt-1 text-xl font-bold text-purple-700">{stats.concentrationRiskCount}</p>
          <span className="text-[10px] text-neutral-500">&gt; 80% single supplier</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={`border-b-2 px-4 py-2 text-xs font-semibold transition ${
            activeTab === "overview"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Overview Snapshots ({snapshots.length})
        </button>
        <button
          onClick={() => setActiveTab("opportunities")}
          className={`border-b-2 px-4 py-2 text-xs font-semibold transition ${
            activeTab === "opportunities"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Opportunity Inspector ({opportunities.length})
        </button>
        <button
          onClick={() => setActiveTab("strategies")}
          className={`border-b-2 px-4 py-2 text-xs font-semibold transition ${
            activeTab === "strategies"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Procurement Strategies
        </button>
        <button
          onClick={() => setActiveTab("market")}
          className={`border-b-2 px-4 py-2 text-xs font-semibold transition ${
            activeTab === "market"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Cost & Market Intelligence
        </button>
        <button
          onClick={() => setActiveTab("recommendations")}
          className={`border-b-2 px-4 py-2 text-xs font-semibold transition ${
            activeTab === "recommendations"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Advisory Recommendations ({recommendations.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW SNAPSHOTS */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {snapshots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
              <Search className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
              <p className="text-sm font-medium">No procurement intelligence snapshots recorded yet.</p>
              <p className="text-xs text-neutral-400 mt-1">
                Execute an evaluation above using real platform demand and market inputs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {snapshots.map((snap) => (
                <div
                  key={snap.id || Math.random().toString()}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-amber-400 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        {snap.state}
                      </span>
                      <h3 className="text-sm font-bold text-neutral-900">{snap.commodity}</h3>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        snap.procurement_priority_score >= 80
                          ? "bg-red-100 text-red-800"
                          : snap.procurement_priority_score >= 60
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      Priority {snap.procurement_priority_score}/100
                    </span>
                  </div>

                  {/* Volume & Fulfillment Progress */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-neutral-600 mb-1">
                      <span>
                        Target: {snap.target_quantity.toLocaleString()} {snap.unit}
                      </span>
                      <span className="font-semibold text-neutral-900">
                        {snap.fulfillment_percentage}% Sourced
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, snap.fulfillment_percentage)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                      <span>Matched: {snap.matched_quantity.toLocaleString()} {snap.unit}</span>
                      <span>Gap: {snap.supply_gap.toLocaleString()} {snap.unit}</span>
                    </div>
                  </div>

                  {/* Strategy Badge & Risk */}
                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
                      {snap.recommended_strategy.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`font-semibold ${
                        snap.procurement_risk_level === "CRITICAL"
                          ? "text-red-700"
                          : snap.procurement_risk_level === "HIGH"
                          ? "text-orange-700"
                          : snap.procurement_risk_level === "MEDIUM"
                          ? "text-amber-700"
                          : "text-emerald-700"
                      }`}
                    >
                      Risk: {snap.procurement_risk_level}
                    </span>
                  </div>

                  {/* Price & Constraints notices */}
                  <div className="mt-2 text-[10px] text-neutral-500 flex items-center justify-between">
                    <span>
                      {snap.observed_price_median
                        ? `Observed ₦${snap.observed_price_median.toLocaleString()}/${snap.unit}`
                        : "No price history"}
                    </span>
                    {snap.supplier_concentration_detected && (
                      <span className="text-purple-700 font-medium">Concentrated</span>
                    )}
                    {snap.security_disruption_flag && (
                      <span className="text-red-600 font-medium">Security Alert</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OPPORTUNITY INSPECTOR */}
      {activeTab === "opportunities" && (
        <div className="space-y-4">
          {opportunities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
              <Search className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
              <p className="text-sm font-medium">No active procurement opportunities registered.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div
                  key={opp.id || Math.random().toString()}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-neutral-900">{opp.commodity}</h4>
                        <span className="text-xs text-neutral-500 font-mono">({opp.state})</span>
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                          {opp.status}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Demand: {opp.required_quantity.toLocaleString()} {opp.unit} • Sourced: {opp.matched_quantity.toLocaleString()} {opp.unit} • Gap: {opp.unmatched_gap.toLocaleString()} {opp.unit}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 block uppercase">Priority</span>
                        <span className="text-xs font-bold text-amber-700">
                          {opp.priority_score}/100 ({opp.priority_level})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 block uppercase">Strategy</span>
                        <span className="text-xs font-semibold text-neutral-800">
                          {opp.strategy.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {opp.notes && (
                    <div className="mt-2.5 rounded bg-neutral-50 p-2 text-xs text-neutral-600">
                      <Info className="inline mr-1 h-3.5 w-3.5 text-neutral-400" />
                      {opp.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROCUREMENT STRATEGIES */}
      {activeTab === "strategies" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900">Deterministic Strategy Architecture</h3>
          <p className="text-xs text-neutral-500">
            AgroMarket evaluates verified supply structures, aggregation clusters, and processing constraints to identify the optimal coordination strategy:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
              <span className="text-xs font-bold text-neutral-900 block">DIRECT SUPPLIER</span>
              <p className="text-[11px] text-neutral-600 mt-1">
                Single verified supplier can satisfy &gt;= 95% of requested volume. Bilateral procurement recommended.
              </p>
            </div>

            <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
              <span className="text-xs font-bold text-neutral-900 block">MULTI SUPPLIER</span>
              <p className="text-[11px] text-neutral-600 mt-1">
                Multiple individual suppliers collectively fulfill volume. Volume splitting recommended.
              </p>
            </div>

            <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
              <span className="text-xs font-bold text-neutral-900 block">AGGREGATED PROCUREMENT</span>
              <p className="text-[11px] text-neutral-600 mt-1">
                Smallholder production pooled through certified aggregation hubs/cooperatives.
              </p>
            </div>

            <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
              <span className="text-xs font-bold text-neutral-900 block">PROCESSING REQUIRED</span>
              <p className="text-[11px] text-neutral-600 mt-1">
                Raw output requires intermediate processing. Third-party facility capacity verified.
              </p>
            </div>

            <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
              <span className="text-xs font-bold text-neutral-900 block">REGIONAL ALTERNATIVE</span>
              <p className="text-[11px] text-neutral-600 mt-1">
                Local supply is constrained; adjacent interstate agricultural corridors leveraged.
              </p>
            </div>

            <div className="rounded-lg border border-neutral-200 p-3 bg-neutral-50">
              <span className="text-xs font-bold text-neutral-900 block">WAIT AND MONITOR</span>
              <p className="text-[11px] text-neutral-600 mt-1">
                Spot volume is tight; production planning indicates new crop harvest inflow within weeks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COST & MARKET INTELLIGENCE */}
      {activeTab === "market" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-neutral-900">Observed Market Price Context</h3>
            <p className="text-xs text-neutral-500">
              All price intelligence is derived deterministically from real platform observations and Phase 2.3 Market Intelligence. Prices are never fabricated.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-neutral-200 p-3 bg-amber-50">
                <span className="text-[10px] text-amber-800 uppercase font-semibold block">Market Pressure Integration</span>
                <p className="text-xs text-neutral-700 mt-1">
                  Elevated demand pressure signals increase procurement prioritization to hedge price inflation.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3 bg-blue-50">
                <span className="text-[10px] text-blue-800 uppercase font-semibold block">Cost Estimations</span>
                <p className="text-xs text-neutral-700 mt-1">
                  Deterministic estimates strictly rely on real median observations and target volumes without binding quotes.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3 bg-purple-50">
                <span className="text-[10px] text-purple-800 uppercase font-semibold block">Supplier Concentration</span>
                <p className="text-xs text-neutral-700 mt-1">
                  Highlights single-supplier dependencies exceeding 80% of allocation to avoid delivery disruptions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ADVISORY RECOMMENDATIONS */}
      {activeTab === "recommendations" && (
        <div className="space-y-3">
          {recommendations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
              <Info className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
              <p className="text-sm font-medium">No advisory recommendations generated yet.</p>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id || Math.random().toString()}
                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                      {rec.recommendation_type.replace(/_/g, " ")}
                    </span>
                    <h4 className="text-sm font-bold text-neutral-900 mt-1">{rec.title}</h4>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      rec.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-800"
                        : rec.status === "ACTIONED"
                        ? "bg-blue-100 text-blue-800"
                        : rec.status === "ACCEPTED"
                        ? "bg-amber-100 text-amber-800"
                        : rec.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {rec.status}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 mt-2">{rec.details}</p>

                {rec.suggested_action && (
                  <div className="mt-2.5 rounded bg-amber-50 p-2 text-xs text-amber-900 font-medium">
                    Suggested Action: {rec.suggested_action}
                  </div>
                )}

                {/* Human-in-the-Loop Action Buttons */}
                {rec.status === "PROPOSED" && rec.id && (
                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center space-x-2">
                    <button
                      onClick={() => handleReviewRecommendation(rec.id!, "ACCEPTED")}
                      disabled={actioningId === rec.id}
                      className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Accept Advisory
                    </button>
                    <button
                      onClick={() => handleReviewRecommendation(rec.id!, "ACTIONED")}
                      disabled={actioningId === rec.id}
                      className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Mark Actioned
                    </button>
                    <button
                      onClick={() => handleReviewRecommendation(rec.id!, "REJECTED")}
                      disabled={actioningId === rec.id}
                      className="rounded bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-300 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
