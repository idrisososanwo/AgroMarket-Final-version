"use client";

import React, { useState } from "react";
import {
  LogisticsIntelligenceSnapshotRecord,
  LogisticsCorridorDependencyItem,
  LogisticsBottleneckItem,
  LogisticsRecommendationRecord,
  LogisticsOverviewStats,
  RecommendationLifecycleStatus,
} from "../types";
import {
  runLogisticsIntelligenceAction,
  reviewLogisticsRecommendationAction,
} from "../actions";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  Truck,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCw,
  Search,
  Info,
  MapPin,
  Layers,
  Activity,
} from "lucide-react";

interface LogisticsDashboardProps {
  initialSnapshots: LogisticsIntelligenceSnapshotRecord[];
  initialDependencies: LogisticsCorridorDependencyItem[];
  initialBottlenecks: LogisticsBottleneckItem[];
  initialRecommendations: LogisticsRecommendationRecord[];
  initialStats: LogisticsOverviewStats;
}

export function LogisticsIntelligenceDashboard({
  initialSnapshots,
  initialDependencies,
  initialBottlenecks,
  initialRecommendations,
  initialStats,
}: LogisticsDashboardProps) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [dependencies, setDependencies] = useState(initialDependencies);
  const [bottlenecks, setBottlenecks] = useState(initialBottlenecks);
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [stats, setStats] = useState(initialStats);

  const [activeTab, setActiveTab] = useState<
    "overview" | "pressure" | "corridors" | "bottlenecks" | "resilience" | "food-security" | "recommendations"
  >("overview");

  // Runner state
  const [testState, setTestState] = useState("Kano");
  const [testCorridor, setTestCorridor] = useState("Kano-Kaduna Transit Corridor");
  const [testCommodity, setTestCommodity] = useState("White Maize");
  const [testCategory, setTestCategory] = useState("GRAINS");
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Reviewing recommendation state
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Filter keyword
  const [filterKeyword, setFilterKeyword] = useState("");

  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setRunMessage(null);

    const formData = new FormData();
    formData.append("state", testState);
    if (testCorridor.trim()) formData.append("corridor", testCorridor.trim());
    if (testCommodity.trim()) formData.append("commodity", testCommodity.trim());
    if (testCategory.trim()) formData.append("category", testCategory.trim());

    const res = await runLogisticsIntelligenceAction(formData);
    setIsRunning(false);

    if (res.success && res.result) {
      setRunMessage({ text: "Logistics movement intelligence evaluation completed successfully." });
      const {
        pressureIndex,
        resilienceAssessment,
        dependencies: newDeps,
        bottlenecks: newBottlenecks,
        recommendations: newRecs,
      } = res.result;

      const newSnapshot: LogisticsIntelligenceSnapshotRecord = {
        corridor: testCorridor.trim() || null,
        state: testState,
        lga: null,
        commodity: testCommodity.trim() || null,
        category: testCategory.trim() || null,
        pressure_score: pressureIndex.score,
        pressure_level: pressureIndex.level,
        resilience_score: resilienceAssessment.score,
        resilience_level: resilienceAssessment.level,
        pressure_components: pressureIndex.components,
        resilience_components: resilienceAssessment.components,
        key_drivers: pressureIndex.keyDrivers,
        missing_evidence: pressureIndex.missingEvidence,
        vulnerability_factors: resilienceAssessment.vulnerabilityFactors,
        adaptive_capacities: resilienceAssessment.adaptiveCapacities,
        confidence: pressureIndex.confidence,
        calculated_at: new Date().toISOString(),
      };

      setSnapshots([newSnapshot, ...snapshots]);
      if (newDeps.length > 0) setDependencies([...newDeps, ...dependencies]);
      if (newBottlenecks.length > 0) setBottlenecks([...newBottlenecks, ...bottlenecks]);
      if (newRecs.length > 0) setRecommendations([...newRecs, ...recommendations]);

      setStats((prev) => ({
        ...prev,
        averagePressureScore:
          Math.round(((prev.averagePressureScore * snapshots.length + pressureIndex.score) / (snapshots.length + 1)) * 10) / 10,
        averageResilienceScore:
          Math.round(((prev.averageResilienceScore * snapshots.length + resilienceAssessment.score) / (snapshots.length + 1)) * 10) / 10,
        activeBottlenecksCount: prev.activeBottlenecksCount + newBottlenecks.length,
        criticalDependenciesCount: prev.criticalDependenciesCount + newDeps.length,
        pendingRecommendationsCount: prev.pendingRecommendationsCount + newRecs.length,
      }));
    } else {
      setRunMessage({ text: res.error || "Failed to execute evaluation", error: true });
    }
  };

  const handleReviewRecommendation = async (
    recommendationId: string,
    decision: RecommendationLifecycleStatus
  ) => {
    setReviewingId(recommendationId);
    const res = await reviewLogisticsRecommendationAction({
      recommendationId,
      decision,
      reviewNotes: `Human review transitioned status to ${decision}`,
    });
    setReviewingId(null);

    if (res.success) {
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recommendationId ? { ...r, status: decision } : r))
      );
    }
  };

  const getPressureBadgeClass = (level: string) => {
    switch (level) {
      case "CRITICAL_PRESSURE":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "HIGH_PRESSURE":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "MODERATE_PRESSURE":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "LOW_PRESSURE":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-300";
    }
  };

  const getResilienceBadgeClass = (level: string) => {
    switch (level) {
      case "HIGH_RESILIENCE":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "MODERATE_RESILIENCE":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "VULNERABLE":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "CRITICALLY_VULNERABLE":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-300";
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-rose-600 text-white";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "ELEVATED":
        return "bg-amber-500 text-white";
      case "WATCH":
        return "bg-blue-500 text-white";
      case "INFO":
      default:
        return "bg-neutral-500 text-white";
    }
  };

  const filteredSnapshots = snapshots.filter((s) => {
    if (!filterKeyword) return true;
    const matchState = s.state.toLowerCase().includes(filterKeyword.toLowerCase());
    const matchCorridor = s.corridor?.toLowerCase().includes(filterKeyword.toLowerCase());
    const matchCommodity = s.commodity?.toLowerCase().includes(filterKeyword.toLowerCase());
    return matchState || matchCorridor || matchCommodity;
  });

  return (
    <div className="space-y-6">
      {/* Mandatory Regulatory / Operational Disclaimer */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-900 shadow-sm flex items-start space-x-3">
        <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            AgroMarket analytical indicator — not an official government indicator, road safety rating, emergency classification, or transport guarantee.
          </p>
          <p className="text-indigo-800 leading-relaxed">
            AgroMarket is an asset-light agricultural coordination platform. We do not own transport fleets, guarantee road safety,
            or autonomously dispatch vehicles. All corridor intelligence and movement indicators represent analytical decision-support
            derived from platform observations, carrier availability, and public notices. Transport operators and drivers must verify route safety with authorized transport unions and official security authorities.
          </p>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Logistics Pressure</span>
            <Activity className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {stats.averagePressureScore}
            </span>
            <span className="text-xs text-neutral-400">/ 100</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Across {stats.evaluatedCorridorsCount} evaluated corridors
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Logistics Resilience</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {stats.averageResilienceScore}
            </span>
            <span className="text-xs text-neutral-400">/ 100</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {stats.activeProvidersCount} active verified carriers registered
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Active Bottlenecks</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-700">
              {stats.activeBottlenecksCount}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {stats.activeDeliveriesCount} shipments in active transit
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Corridor Dependencies</span>
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {stats.criticalDependenciesCount}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            High concentration route segments
          </p>
        </div>
      </div>

      {/* Movement Pipeline Evaluation Runner */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-md bg-indigo-100 p-1.5 text-indigo-800">
                <Truck className="h-5 w-5" />
              </span>
              <h2 className="text-base font-bold text-neutral-900">
                Evaluate Agricultural Movement Corridor & Logistics Resilience
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Executes the deterministic 7-component Pressure Index, 8-component Resilience Score, and bottleneck detector.
            </p>
          </div>
        </div>

        <form onSubmit={handleRunEvaluation} className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              State *
            </label>
            <select
              value={testState}
              onChange={(e) => setTestState(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              Transit Corridor (Optional)
            </label>
            <input
              type="text"
              value={testCorridor}
              onChange={(e) => setTestCorridor(e.target.value)}
              placeholder="e.g. Kano-Kaduna Corridor"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              Commodity (Optional)
            </label>
            <input
              type="text"
              value={testCommodity}
              onChange={(e) => setTestCommodity(e.target.value)}
              placeholder="e.g. White Maize, Sorghum"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              Category
            </label>
            <input
              type="text"
              value={testCategory}
              onChange={(e) => setTestCategory(e.target.value)}
              placeholder="e.g. GRAINS, TUBERS"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isRunning}
              className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-800 disabled:opacity-50 transition"
            >
              {isRunning ? (
                <>
                  <RotateCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Evaluating...
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Run Movement Evaluation
                </>
              )}
            </button>
          </div>
        </form>

        {runMessage && (
          <div
            className={`mt-3 rounded-lg p-2.5 text-xs font-medium ${
              runMessage.error ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {runMessage.text}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { key: "overview", label: "Overview" },
            { key: "pressure", label: "Movement Pressure" },
            { key: "corridors", label: `Corridor Intelligence (${dependencies.length})` },
            { key: "bottlenecks", label: `Bottlenecks (${bottlenecks.length})` },
            { key: "resilience", label: "Network Resilience" },
            { key: "food-security", label: "Food Security Link" },
            { key: "recommendations", label: `Human Review (${recommendations.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`py-3 text-xs font-bold whitespace-nowrap border-b-2 transition ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Observed Snapshots */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Recent Observed Corridor Snapshots
                </h3>
                <span className="text-[11px] text-neutral-400">{snapshots.length} total</span>
              </div>
              {filteredSnapshots.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">
                  No logistics snapshots recorded yet. Run an evaluation above.
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {filteredSnapshots.slice(0, 5).map((snap, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-neutral-900">
                            {snap.corridor || `${snap.state} Route`}
                          </span>
                          <span className="text-[10px] text-neutral-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-0.5" /> {snap.state}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 line-clamp-1">
                          Commodity: {snap.commodity || "All Commodities"} • Resilience: {snap.resilience_score}/100
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getResilienceBadgeClass(
                            snap.resilience_level
                          )}`}
                        >
                          Resilience {snap.resilience_score}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getPressureBadgeClass(
                            snap.pressure_level
                          )}`}
                        >
                          {snap.pressure_level.replace(/_/g, " ")} ({snap.pressure_score})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Critical Bottlenecks Spotlight */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Active Logistics Bottlenecks
                </h3>
                <span className="text-[11px] text-rose-600 font-semibold">
                  {bottlenecks.filter((b) => b.status === "IDENTIFIED").length} identified
                </span>
              </div>
              {bottlenecks.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">
                  No active logistics bottlenecks detected. Corridor flow nominal.
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {bottlenecks.slice(0, 5).map((b, idx) => (
                    <div key={b.id || idx} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${getSeverityBadgeClass(
                              b.severity
                            )}`}
                          >
                            {b.severity}
                          </span>
                          <h4 className="text-xs font-bold text-neutral-900">
                            {b.bottleneckType?.replace(/_/g, " ") || "BOTTLENECK"}
                          </h4>
                        </div>
                        <span className="text-[10px] text-neutral-500">{b.state}</span>
                      </div>
                      <p className="text-[11px] text-neutral-600">{b.evidence}</p>
                      <p className="text-[10px] text-indigo-700 font-medium">Action: {b.recommendedAction}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Movement Pressure */}
      {activeTab === "pressure" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Logistics Pressure Index Model (100% Total)
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Deterministic 7-component formula measuring agricultural movement friction without subjective estimates.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Movement Demand</span>
                <p className="text-base font-black text-neutral-900 mt-1">20% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Active dispatch & B2B procurement requirements</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Capacity Constraints</span>
                <p className="text-base font-black text-neutral-900 mt-1">20% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Fleet workload per verified logistics provider</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Delivery Delays</span>
                <p className="text-base font-black text-neutral-900 mt-1">15% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Transit milestone deviations & delay ratios</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Corridor Dependency</span>
                <p className="text-base font-black text-neutral-900 mt-1">15% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Cargo concentration on primary highway route</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Disruption Friction</span>
                <p className="text-base font-black text-neutral-900 mt-1">10% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Reported security notices and checkpoint friction</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Processing Movement</span>
                <p className="text-base font-black text-neutral-900 mt-1">10% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Offloading turnaround backlogs at certified mills</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Alternative Scarcity</span>
                <p className="text-base font-black text-neutral-900 mt-1">10% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Availability of backup commercial carriers</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Corridor Intelligence */}
      {activeTab === "corridors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                placeholder="Search corridor or state..."
                className="w-full rounded-lg border border-neutral-300 pl-8 pr-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-xs text-neutral-500">
              Showing {dependencies.length} monitored dependencies
            </span>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-xs">
              <thead className="bg-neutral-50 text-[10px] uppercase font-bold text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Corridor & State</th>
                  <th className="px-4 py-3">Dependency Type</th>
                  <th className="px-4 py-3">Movement Share</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Alternatives</th>
                  <th className="px-4 py-3">Evidence & Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white text-neutral-700">
                {dependencies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                      No corridor dependencies currently exceed analytical thresholds.
                    </td>
                  </tr>
                ) : (
                  dependencies.map((dep, idx) => (
                    <tr key={dep.id || idx} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-neutral-900">{dep.corridor}</div>
                        <div className="text-[10px] text-neutral-500">{dep.state}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-neutral-800">
                        {dep.dependencyType.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 font-bold text-rose-600">
                        {dep.movementShare}% (threshold: {dep.thresholdExceeded}%)
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${getSeverityBadgeClass(dep.severity)}`}>
                          {dep.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px]">{dep.alternativeOptionsAvailable} available</td>
                      <td className="px-4 py-3 text-[10px] text-neutral-500 max-w-xs">
                        <p>{dep.riskAssessment}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Bottlenecks */}
      {activeTab === "bottlenecks" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {bottlenecks.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-xs text-neutral-400">
                No logistics bottlenecks detected across monitored corridors.
              </div>
            ) : (
              bottlenecks.map((b, idx) => (
                <div key={b.id || idx} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${getSeverityBadgeClass(b.severity)}`}>
                        {b.severity}
                      </span>
                      <h4 className="text-sm font-bold text-neutral-900">
                        {b.bottleneckType?.replace(/_/g, " ") || "BOTTLENECK"}
                      </h4>
                    </div>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                      Status: {b.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-700 leading-relaxed">{b.evidence}</p>

                  <div className="rounded-lg bg-indigo-50 p-3 text-[11px] text-indigo-900 space-y-1">
                    <div><strong>Affected Scope:</strong> {b.affectedScope}</div>
                    <div><strong>Recommended Investigation:</strong> {b.recommendedAction}</div>
                    <div><strong>Alternatives Available:</strong> {b.alternativeAvailable ? "Yes" : "None within direct jurisdiction"}</div>
                  </div>

                  <div className="text-[10px] text-neutral-400 pt-1">
                    Location: <strong className="text-neutral-700">{b.state}</strong> • Corridor: <strong className="text-neutral-700">{b.corridor || "General"}</strong> • Confidence: {Math.round(b.confidence * 100)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Resilience */}
      {activeTab === "resilience" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Agricultural Logistics Resilience Score (0–100)
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Measures how effectively regional agricultural movement networks absorb transit disruptions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Provider Diversity</span>
                <p className="text-base font-black text-neutral-900 mt-1">15% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Balanced carrier share without monopoly</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Corridor Diversity</span>
                <p className="text-base font-black text-neutral-900 mt-1">15% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Availability of secondary highway routes</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Regional Alternatives</span>
                <p className="text-base font-black text-neutral-900 mt-1">15% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Inter-state bypass route accessibility</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Processing Connectivity</span>
                <p className="text-base font-black text-neutral-900 mt-1">15% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Certified mill & storage proximity</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Aggregation Hubs</span>
                <p className="text-base font-black text-neutral-900 mt-1">10% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Active smallholder collection clusters</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Market Destinations</span>
                <p className="text-base font-black text-neutral-900 mt-1">10% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Multi-channel delivery endpoint access</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Movement Capacity</span>
                <p className="text-base font-black text-neutral-900 mt-1">10% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Spare vehicle fleet readiness</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Recovery Evidence</span>
                <p className="text-base font-black text-neutral-900 mt-1">10% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Past successful transit recovery records</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Food Security Link */}
      {activeTab === "food-security" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Aggregated Logistics → Food Security Cross-Corridor Correlation
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              When agricultural corridors suffer from elevated logistics pressure, high provider concentration,
              or transit friction, delivery delays can amplify regional supply gaps in deficit basins.
            </p>

            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-neutral-900">Observed Regional Correlation Status:</span>
                <span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                  POTENTIAL_IMPACT
                </span>
              </div>
              <p className="text-neutral-700">
                Logistics pressure indicators are fed into Phase 2.8 Food Security early-warning models as analytical inputs.
                Correlation is explicitly logged without asserting unproven direct causation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Human Review / Recommendations */}
      {activeTab === "recommendations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              Recommendations are generated by the deterministic engine and hold in <strong>PROPOSED</strong> mode.
              Human review is strictly required before action.
            </p>
            <span className="text-xs font-semibold text-neutral-700">Total: {recommendations.length}</span>
          </div>

          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-xs text-neutral-400">
                No logistics recommendations currently on file.
              </div>
            ) : (
              recommendations.map((rec) => (
                <div key={rec.id || rec.title} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${getSeverityBadgeClass(rec.severity)}`}>
                        {rec.severity}
                      </span>
                      <h4 className="text-sm font-bold text-neutral-900">{rec.title}</h4>
                    </div>
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                      Status: {rec.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-700 leading-relaxed">{rec.summary}</p>
                  <p className="text-[11px] text-neutral-500"><strong>Reasoning:</strong> {rec.reasoning}</p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-100 text-xs">
                    <div className="text-[11px] text-neutral-500">
                      Strategy: <strong className="text-neutral-800">{rec.strategy.replace(/_/g, " ")}</strong> • State: <strong>{rec.state}</strong>
                    </div>

                    <div className="flex items-center space-x-2">
                      {rec.status === "PROPOSED" && (
                        <>
                          <button
                            onClick={() => handleReviewRecommendation(rec.id!, "REVIEWED")}
                            disabled={reviewingId === rec.id}
                            className="rounded border border-neutral-300 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50"
                          >
                            Mark Reviewed
                          </button>
                          <button
                            onClick={() => handleReviewRecommendation(rec.id!, "ACCEPTED")}
                            disabled={reviewingId === rec.id}
                            className="rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700"
                          >
                            Accept Recommendation
                          </button>
                          <button
                            onClick={() => handleReviewRecommendation(rec.id!, "REJECTED")}
                            disabled={reviewingId === rec.id}
                            className="rounded border border-neutral-300 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {rec.status === "ACCEPTED" && (
                        <button
                          onClick={() => handleReviewRecommendation(rec.id!, "ACTIONED")}
                          disabled={reviewingId === rec.id}
                          className="rounded bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-700"
                        >
                          Mark Actioned
                        </button>
                      )}
                      {rec.status === "ACTIONED" && (
                        <button
                          onClick={() => handleReviewRecommendation(rec.id!, "COMPLETED")}
                          disabled={reviewingId === rec.id}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
