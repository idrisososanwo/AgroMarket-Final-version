"use client";

/**
 * AgroMarket Phase 3.1: Primary Cross-Domain Intelligence Command Center
 * Central Coordination Console unifying specialized domain agents:
 * Market, Production, Demand, Supply, Procurement, Food Security, Logistics, Biosecurity.
 *
 * SAFETY INVARIANTS:
 * 1. Coordination and early-warning decision-support layer — NOT autonomous action.
 * 2. Mandatory non-veterinary, non-regulatory, non-statutory analytical disclaimers.
 * 3. Human-in-the-loop review mandatory for all consequential recommendations.
 * 4. Zero pig/pork produce tolerance throughout.
 */

import React, { useState } from "react";
import {
  OrchestrationSnapshotRecord,
  OrchestrationRecommendationItem,
  IntelligenceConflictItem,
  OrchestrationOutcomeItem,
  OrchestrationOverviewStats,
  CorrelationTimeWindow,
  SpecializedAgentDomain,
  AgentOutputContribution,
} from "../types";
import {
  runOrchestrationAction,
  reviewRecommendationAction,
  resolveConflictAction,
  recordOutcomeAction,
} from "../actions";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCw,
  Info,
  MapPin,
  TrendingUp,
  Truck,
  HeartPulse,
  ShoppingBag,
  Store,
  Layers,
  FileText,
  Sparkles,
} from "lucide-react";

interface IntelligenceCommandCenterProps {
  initialSnapshots: OrchestrationSnapshotRecord[];
  initialRecommendations: OrchestrationRecommendationItem[];
  initialConflicts: IntelligenceConflictItem[];
  initialOutcomes: OrchestrationOutcomeItem[];
  initialStats: OrchestrationOverviewStats;
}

export function IntelligenceCommandCenter({
  initialSnapshots,
  initialRecommendations,
  initialConflicts,
  initialOutcomes,
  initialStats,
}: IntelligenceCommandCenterProps) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [conflicts, setConflicts] = useState(initialConflicts);
  const [outcomes, setOutcomes] = useState(initialOutcomes);
  const [stats, setStats] = useState(initialStats);

  // Active Navigation Tab (12 Command Center Sections)
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "critical-scenarios"
    | "cross-domain-signals"
    | "active-conflicts"
    | "regional-intelligence"
    | "commodity-intelligence"
    | "value-chain-impact"
    | "recommendations"
    | "ai-advisory"
    | "evidence-confidence"
    | "historical-outcomes"
    | "agent-contributions"
  >("overview");

  // Runner state
  const [selectedState, setSelectedState] = useState("Kano");
  const [selectedLga, setSelectedLga] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState("Maize");
  const [selectedTimeWindow, setSelectedTimeWindow] =
    useState<CorrelationTimeWindow>("MEDIUM_TERM");
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Review & Conflict Action States
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Outcome dialog state
  const [outcomeRecId, setOutcomeRecId] = useState<string | null>(null);
  const [outcomeActionTaken, setOutcomeActionTaken] = useState("");
  const [outcomeObserved, setOutcomeObserved] = useState("");
  const [outcomeExpected, setOutcomeExpected] = useState("");
  const [outcomeScore, setOutcomeScore] = useState("85");
  const [outcomeLessons, setOutcomeLessons] = useState("");

  const handleRunOrchestration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setRunMessage(null);

    const formData = new FormData();
    formData.append("state", selectedState);
    if (selectedLga.trim()) formData.append("lga", selectedLga.trim());
    formData.append("commodity", selectedCommodity.trim());
    formData.append("timeWindow", selectedTimeWindow);

    const res = await runOrchestrationAction(formData);
    setIsRunning(false);

    if (res.success && res.result) {
      setRunMessage({ text: res.message || "Cross-domain evaluation executed successfully." });
      const newSnap = res.result.snapshot;
      setSnapshots((prev) => [newSnap, ...prev]);
      if (res.result.recommendations.length > 0) {
        setRecommendations((prev) => [...res.result!.recommendations, ...prev]);
      }
      if (res.result.conflicts.length > 0) {
        setConflicts((prev) => [...res.result!.conflicts, ...prev]);
      }
      setStats((prev) => ({
        ...prev,
        totalSnapshotsCount: prev.totalSnapshotsCount + 1,
        averagePriorityScore: res.result!.priorityScore,
        averageOrchestrationConfidence: res.result!.confidenceMetrics.orchestrationConfidence,
      }));
    } else {
      setRunMessage({ text: res.error || "Failed to execute evaluation", error: true });
    }
  };

  const handleReviewRecommendation = async (
    recId: string,
    newStatus: OrchestrationRecommendationItem["status"]
  ) => {
    setActionInProgress(recId);
    const res = await reviewRecommendationAction(
      recId,
      newStatus,
      `Reviewed via Command Center at ${new Date().toLocaleTimeString()}`
    );
    setActionInProgress(null);
    if (res.success) {
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, status: newStatus } : r))
      );
    }
  };

  const handleResolveConflict = async (conflictId: string, status: "RESOLVED" | "DISMISSED") => {
    setActionInProgress(conflictId);
    const res = await resolveConflictAction(
      conflictId,
      status,
      `Reconciled by administrator in Command Center at ${new Date().toLocaleTimeString()}`
    );
    setActionInProgress(null);
    if (res.success) {
      setConflicts((prev) =>
        prev.map((c) => (c.id === conflictId ? { ...c, status } : c))
      );
    }
  };

  const handleRecordOutcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomeRecId) return;

    setActionInProgress(outcomeRecId);
    const formData = new FormData();
    formData.append("recommendationId", outcomeRecId);
    formData.append("actionTaken", outcomeActionTaken);
    formData.append("observedOutcome", outcomeObserved);
    formData.append("expectedOutcome", outcomeExpected);
    formData.append("evaluationScore", outcomeScore);
    formData.append("lessonsLearned", outcomeLessons);

    const res = await recordOutcomeAction(formData);
    setActionInProgress(null);

    if (res.success) {
      const newOutcome: OrchestrationOutcomeItem = {
        id: crypto.randomUUID(),
        recommendationId: outcomeRecId,
        decision: "IMPLEMENTED",
        actionTaken: outcomeActionTaken,
        actionTime: new Date().toISOString(),
        observedOutcome: outcomeObserved,
        expectedOutcome: outcomeExpected,
        variance: "Within 10% expected tolerance",
        evaluationScore: Number(outcomeScore) || 85,
        lessonsLearned: outcomeLessons || "Documented for future model calibration.",
        createdAt: new Date().toISOString(),
      };
      setOutcomes((prev) => [newOutcome, ...prev]);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === outcomeRecId ? { ...r, status: "COMPLETED" } : r))
      );
      setOutcomeRecId(null);
      setOutcomeActionTaken("");
      setOutcomeObserved("");
      setOutcomeExpected("");
      setOutcomeLessons("");
      alert("Outcome recorded and evaluation memory updated.");
    } else {
      alert(res.error || "Failed recording outcome");
    }
  };

  const latestSnapshot = snapshots[0] || null;

  const getPriorityBadge = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-300";
    }
  };

  const getDomainIcon = (domain: SpecializedAgentDomain) => {
    switch (domain) {
      case "MARKET":
        return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
      case "PRODUCTION":
        return <Layers className="h-3.5 w-3.5 text-emerald-700" />;
      case "DEMAND":
        return <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />;
      case "SUPPLY":
        return <Store className="h-3.5 w-3.5 text-teal-600" />;
      case "PROCUREMENT":
        return <FileText className="h-3.5 w-3.5 text-amber-600" />;
      case "FOOD_SECURITY":
        return <ShieldCheck className="h-3.5 w-3.5 text-red-600" />;
      case "LOGISTICS":
        return <Truck className="h-3.5 w-3.5 text-indigo-600" />;
      case "DISEASE_BIOSECURITY":
        return <HeartPulse className="h-3.5 w-3.5 text-rose-600" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-neutral-600" />;
    }
  };

  // Filtered lists
  const filteredSnapshots = snapshots.filter((s) => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return (
      s.state?.toLowerCase().includes(term) ||
      s.commodity?.toLowerCase().includes(term) ||
      s.scenario_type.toLowerCase().includes(term)
    );
  });

  const criticalScenarios = snapshots.filter(
    (s) => s.priority_level === "CRITICAL" || s.priority_level === "HIGH"
  );

  return (
    <div className="space-y-6">
      {/* 1. Mandatory Cross-Domain Decision Support & Regulatory Disclaimer */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs text-indigo-950 shadow-sm flex items-start space-x-3">
        <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            AgroMarket Cross-Domain Agricultural Intelligence Command Center — Asset-Light Decision Support Layer.
          </p>
          <p className="text-indigo-900 leading-relaxed">
            The Agricultural Intelligence Orchestrator coordinates specialized domain agents (Market, Production, Demand, Supply, Procurement, Food Security, Logistics, Biosecurity). It synthesizes multi-agent telemetry into systemic scenarios, calculates deterministic priority scores, flags contradictions, and generates advisory recommendations. All actions remain governed by human administrators; the orchestrator never executes autonomous purchases, culling, rerouting, or movement.
          </p>
        </div>
      </div>

      {/* 2. Master KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Cross-Domain Priority</span>
            <Activity className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {stats.averagePriorityScore}
            </span>
            <span className="text-xs text-neutral-400">/ 100</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Across {stats.activeMonitoredStatesCount} states & {stats.activeMonitoredCommoditiesCount} commodities
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Orchestration Confidence</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {Math.round(stats.averageOrchestrationConfidence * 100)}%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Calibrated with conflict penalties & deduplication
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Active Conflicts</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-700">
              {conflicts.filter((c) => c.status === "ACTIVE").length}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Unresolved domain contradictions flagged
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Governed Recommendations</span>
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-indigo-700">
              {recommendations.length}
            </span>
            <span className="text-xs text-neutral-400">
              ({recommendations.filter((r) => r.status === "PROPOSED").length} pending)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Human-in-the-loop review queue
          </p>
        </div>
      </div>

      {/* 3. Cross-Domain Evaluation Runner */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-md bg-indigo-100 p-1.5 text-indigo-800">
                <Sparkles className="h-5 w-5" />
              </span>
              <h2 className="text-base font-bold text-neutral-900">
                Run Cross-Domain Orchestration Evaluation
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Executes deterministic multi-domain correlation, same-source deduplication, conflict detection, and 8-component priority scoring.
            </p>
          </div>
        </div>

        <form onSubmit={handleRunOrchestration} className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              State *
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
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
              LGA (Optional)
            </label>
            <input
              type="text"
              value={selectedLga}
              onChange={(e) => setSelectedLga(e.target.value)}
              placeholder="e.g. Dala, Makarfi"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              Commodity *
            </label>
            <input
              type="text"
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              placeholder="e.g. Maize, Sorghum, Cassava"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              Time Window
            </label>
            <select
              value={selectedTimeWindow}
              onChange={(e) => setSelectedTimeWindow(e.target.value as CorrelationTimeWindow)}
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="SHORT_TERM">Short-Term (&le; 7 days)</option>
              <option value="MEDIUM_TERM">Medium-Term (8 - 30 days)</option>
              <option value="LONGER_TERM">Longer-Term (31 - 90 days)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isRunning}
              className="w-full inline-flex items-center justify-center rounded-lg bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-800 disabled:opacity-50 transition"
            >
              {isRunning ? (
                <>
                  <RotateCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Orchestrating...
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Run Orchestration
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

      {/* 4. Command Center 12-Section Navigation Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-4 overflow-x-auto pb-1">
          {[
            { key: "overview", label: "Overview" },
            { key: "critical-scenarios", label: `Critical Scenarios (${criticalScenarios.length})` },
            { key: "cross-domain-signals", label: "Cross-Domain Signals" },
            { key: "active-conflicts", label: `Conflicts (${conflicts.length})` },
            { key: "regional-intelligence", label: "Regional Intelligence" },
            { key: "commodity-intelligence", label: "Commodity Intelligence" },
            { key: "value-chain-impact", label: "Value-Chain Impact" },
            { key: "recommendations", label: `Recommendations (${recommendations.length})` },
            { key: "ai-advisory", label: "AI Advisory" },
            { key: "evidence-confidence", label: "Evidence & Confidence" },
            { key: "historical-outcomes", label: `Outcomes (${outcomes.length})` },
            { key: "agent-contributions", label: "Agent Contributions" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition ${
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

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 1: OVERVIEW */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latest Orchestration Snapshot Card */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Active Systemic Scenario
                </h3>
                {latestSnapshot && (
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${getPriorityBadge(
                      latestSnapshot.priority_level
                    )}`}
                  >
                    Priority: {latestSnapshot.priority_level} ({latestSnapshot.priority_score}/100)
                  </span>
                )}
              </div>

              {latestSnapshot ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-black text-neutral-900">
                      {latestSnapshot.scenario_type.replace(/_/g, " ")}
                    </h4>
                    <p className="mt-1 text-xs text-neutral-700 leading-relaxed">
                      {latestSnapshot.scenario_summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-neutral-100 text-[11px]">
                    <div>
                      <span className="text-neutral-400 block">Scope:</span>
                      <strong className="text-neutral-800">
                        {latestSnapshot.state || "National"} {latestSnapshot.lga ? `(${latestSnapshot.lga})` : ""}
                      </strong>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Commodity:</span>
                      <strong className="text-neutral-800">
                        {latestSnapshot.commodity || "Multi-Commodity"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Confidence:</span>
                      <strong className="text-emerald-700">
                        {Math.round(latestSnapshot.orchestration_confidence * 100)}% calibrated
                      </strong>
                    </div>
                  </div>

                  {/* Contributing Domains Tag List */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                      Contributing Domains ({latestSnapshot.affected_domains.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {latestSnapshot.affected_domains.map((dom) => (
                        <span
                          key={dom}
                          className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-700"
                        >
                          {getDomainIcon(dom as SpecializedAgentDomain)}
                          <span className="ml-1">{dom}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-400 py-6 text-center">
                  No orchestration snapshots available. Run an evaluation above.
                </p>
              )}
            </div>

            {/* Deterministic Priority Score Breakdown */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                8-Component Deterministic Priority Weights
              </h3>
              <p className="text-xs text-neutral-500">
                Authoritative multi-factor aggregation weighting across value-chain dimensions.
              </p>

              {latestSnapshot ? (
                <div className="space-y-2 pt-2 text-xs">
                  {[
                    { label: "Cross-Domain Severity (25%)", val: latestSnapshot.component_breakdown.crossDomainSeverity, max: 25 },
                    { label: "Evidence Confidence (20%)", val: latestSnapshot.component_breakdown.evidenceConfidence, max: 20 },
                    { label: "Food Security Exposure (15%)", val: latestSnapshot.component_breakdown.foodSecurityExposure, max: 15 },
                    { label: "Supply Exposure (15%)", val: latestSnapshot.component_breakdown.supplyExposure, max: 15 },
                    { label: "Geographic Concentration (10%)", val: latestSnapshot.component_breakdown.geographicConcentration, max: 10 },
                    { label: "Logistics Exposure (5%)", val: latestSnapshot.component_breakdown.logisticsExposure, max: 5 },
                    { label: "Procurement Exposure (5%)", val: latestSnapshot.component_breakdown.procurementExposure, max: 5 },
                    { label: "Time Sensitivity (5%)", val: latestSnapshot.component_breakdown.timeSensitivity, max: 5 },
                  ].map((comp, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-600">{comp.label}</span>
                        <span className="font-bold text-neutral-900">
                          {comp.val} / {comp.max}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${(comp.val / comp.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 py-6 text-center">
                  Breakdown available upon evaluation.
                </p>
              )}
            </div>
          </div>

          {/* Recent Snapshots History Table */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Orchestration History ({filteredSnapshots.length})
              </h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter state, commodity..."
                  className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs focus:outline-none"
                />
              </div>
            </div>

            {filteredSnapshots.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No matching orchestration records found.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {filteredSnapshots.slice(0, 6).map((snap, i) => (
                  <div key={snap.id || i} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${getPriorityBadge(snap.priority_level)}`}>
                          {snap.priority_level} ({snap.priority_score})
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900">
                          {snap.scenario_type.replace(/_/g, " ")}
                        </h4>
                      </div>
                      <p className="text-xs text-neutral-600 line-clamp-1">{snap.scenario_summary}</p>
                      <div className="flex items-center space-x-3 text-[10px] text-neutral-400">
                        <span>{snap.state || "National"} {snap.commodity ? `• ${snap.commodity}` : ""}</span>
                        <span>{new Date(snap.generated_at).toLocaleDateString()}</span>
                        {snap.conflict_detected && (
                          <span className="text-amber-600 font-bold flex items-center">
                            <AlertTriangle className="mr-0.5 h-3 w-3" /> Contradiction Detected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 2: CRITICAL / HIGH PRIORITY SCENARIOS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "critical-scenarios" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Critical & High Systemic Priority Scenarios ({criticalScenarios.length})
            </h3>
            <p className="text-xs text-neutral-500">
              Filtered view of cross-domain conditions with priority scores &ge; 60 requiring immediate human review.
            </p>

            {criticalScenarios.length === 0 ? (
              <p className="text-xs text-neutral-400 py-8 text-center">
                No active scenarios exceed high or critical priority thresholds. System nominal.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {criticalScenarios.map((cs, idx) => (
                  <div key={cs.id || idx} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${getPriorityBadge(cs.priority_level)}`}>
                          {cs.priority_level}: {cs.priority_score}/100
                        </span>
                        <h4 className="text-sm font-bold text-neutral-900">
                          {cs.scenario_type.replace(/_/g, " ")} — {cs.state || "National"} ({cs.commodity || "All Produce"})
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-emerald-700">
                        {Math.round(cs.orchestration_confidence * 100)}% Conf
                      </span>
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed">{cs.scenario_summary}</p>
                    <p className="text-[11px] text-neutral-500 bg-neutral-50 p-2.5 rounded">
                      <strong>Evidence Grounding:</strong> {cs.evidence_summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 3: CROSS-DOMAIN SIGNALS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "cross-domain-signals" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Aggregated Contributing Signals Across Specialized Domains
            </h3>
            <p className="text-xs text-neutral-500">
              Correlated multi-sector observations normalized across Market, Production, Demand, Logistics, and Health layers.
            </p>

            {latestSnapshot?.contributing_signals && (latestSnapshot.contributing_signals as unknown as AgentOutputContribution[]).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(latestSnapshot.contributing_signals as unknown as AgentOutputContribution[]).map((sig, i) => (
                  <div key={i} className="rounded-lg border border-neutral-100 p-3.5 space-y-1.5 bg-neutral-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getDomainIcon(sig.domain)}
                        <span className="text-xs font-bold text-neutral-900">{sig.domain}</span>
                      </div>
                      <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-neutral-700 border border-neutral-200">
                        {sig.severity} ({sig.score}/100)
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-neutral-800">{sig.signalType.replace(/_/g, " ")}</p>
                    {sig.sourceReferences && (
                      <p className="text-[10px] text-neutral-400">
                        Sources: {Array.isArray(sig.sourceReferences) ? sig.sourceReferences.join(", ") : sig.sourceReferences}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 py-6 text-center">
                Run an evaluation above to inspect active contributing signals.
              </p>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 4: ACTIVE CONFLICTS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "active-conflicts" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Unresolved Intelligence Contradictions ({conflicts.length})
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Contradictory domain signals degrade systemic confidence and prompt mandatory human reconciliation.
                </p>
              </div>
            </div>

            {conflicts.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No active intelligence contradictions detected across domains. Signals are coherent.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {conflicts.map((conf, idx) => (
                  <div key={conf.id || idx} className="py-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                          conf.status === "ACTIVE" ? "bg-rose-100 text-rose-800" : "bg-neutral-100 text-neutral-700"
                        }`}>
                          {conf.status}
                        </span>
                        <h4 className="text-sm font-bold text-neutral-900">
                          {conf.conflictType.replace(/_/g, " ")}: {conf.domainA} vs {conf.domainB}
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-rose-700">
                        -{Math.round(conf.confidenceImpact * 100)}% Confidence Impact
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded bg-neutral-50 border border-neutral-100">
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold block">{conf.domainA}:</span>
                        <span className="font-semibold text-neutral-800">{conf.signalA}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold block">{conf.domainB}:</span>
                        <span className="font-semibold text-neutral-800">{conf.signalB}</span>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-700 leading-relaxed">{conf.explanation}</p>
                    <p className="text-[11px] text-indigo-900 bg-indigo-50/70 p-2 rounded">
                      <strong>Recommended Human Action:</strong> {conf.recommendedHumanReview}
                    </p>

                    {conf.id && conf.status === "ACTIVE" && (
                      <div className="pt-2 flex items-center space-x-2">
                        <button
                          onClick={() => handleResolveConflict(conf.id!, "RESOLVED")}
                          disabled={actionInProgress === conf.id}
                          className="rounded bg-emerald-700 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-800 transition"
                        >
                          Mark Reconciled
                        </button>
                        <button
                          onClick={() => handleResolveConflict(conf.id!, "DISMISSED")}
                          disabled={actionInProgress === conf.id}
                          className="rounded border border-neutral-300 px-3 py-1 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 5: REGIONAL INTELLIGENCE */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "regional-intelligence" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              State & Zonal Value-Chain Geographic Distribution
            </h3>
            <p className="text-xs text-neutral-500">
              Aggregated regional exposure preserving strict farm confidentiality (no cadastral or GPS coordinates exposed).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {Array.from(new Set(snapshots.map((s) => s.state).filter(Boolean))).map((stateName) => {
                const stateSnaps = snapshots.filter((s) => s.state === stateName);
                const avgStateScore =
                  stateSnaps.reduce((acc, s) => acc + s.priority_score, 0) / stateSnaps.length;
                return (
                  <div key={stateName} className="rounded-lg border border-neutral-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-neutral-900">{stateName}</h4>
                      </div>
                      <span className="text-xs font-black text-neutral-800">
                        {Math.round(avgStateScore)}/100
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      {stateSnaps.length} monitored evaluation snapshot(s)
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 6: COMMODITY INTELLIGENCE */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "commodity-intelligence" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Commodity-Specific Multi-Domain Status
            </h3>
            <p className="text-xs text-neutral-500">
              Per-commodity synthesis across market prices, availability, logistics friction, and biosecurity.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {Array.from(new Set(snapshots.map((s) => s.commodity).filter(Boolean))).map((commName) => {
                const commSnaps = snapshots.filter((s) => s.commodity === commName);
                const latest = commSnaps[0];
                return (
                  <div key={commName} className="rounded-lg border border-neutral-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-neutral-900">{commName}</h4>
                      <span className={`rounded px-2 py-0.5 text-[9px] font-bold ${getPriorityBadge(latest.priority_level)}`}>
                        {latest.priority_level}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600">{latest.scenario_summary}</p>
                    <div className="flex items-center space-x-2 text-[10px] text-neutral-400">
                      <span>Score: {latest.priority_score}/100</span>
                      <span>•</span>
                      <span>Confidence: {Math.round(latest.orchestration_confidence * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 7: VALUE-CHAIN IMPACT */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "value-chain-impact" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              End-to-End Value Chain Transmission Model
            </h3>
            <p className="text-xs text-neutral-500">
              Traces how primary field signals propagate through the Nigerian agricultural ecosystem without assuming unverified causation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              <div className="rounded-lg border border-neutral-200 p-3.5 space-y-1.5 bg-neutral-50/50">
                <span className="text-[10px] font-bold uppercase text-neutral-400">1. Farmgate & Production</span>
                <p className="text-xs font-semibold text-neutral-800">Health & Harvest Output</p>
                <p className="text-[11px] text-neutral-600">
                  Input costs, mortality signals, or weather patterns impacting baseline supply volumes.
                </p>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3.5 space-y-1.5 bg-neutral-50/50">
                <span className="text-[10px] font-bold uppercase text-neutral-400">2. Aggregation & Storage</span>
                <p className="text-xs font-semibold text-neutral-800">Hub Consolidation</p>
                <p className="text-[11px] text-neutral-600">
                  Producer lots pooled for commercial offtake; vulnerable to single-facility bottlenecks.
                </p>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3.5 space-y-1.5 bg-neutral-50/50">
                <span className="text-[10px] font-bold uppercase text-neutral-400">3. Corridor Logistics</span>
                <p className="text-xs font-semibold text-neutral-800">Transit & Rerouting</p>
                <p className="text-[11px] text-neutral-600">
                  Interstate arterial freight moving produce across North-South corridors with sanitary checkpoints.
                </p>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3.5 space-y-1.5 bg-neutral-50/50">
                <span className="text-[10px] font-bold uppercase text-neutral-400">4. Terminal Consumption</span>
                <p className="text-xs font-semibold text-neutral-800">Market Price & Food Security</p>
                <p className="text-[11px] text-neutral-600">
                  Wholesale and retail price equilibrium determining household affordability.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 8: RECOMMENDATIONS (GOVERNED REVIEW QUEUE) */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "recommendations" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Governed Cross-Domain Recommendations ({recommendations.length})
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Advisory recommendations synthesized across domains. State machine: PROPOSED &rarr; REVIEWED &rarr; ACCEPTED &rarr; ACTIONED &rarr; COMPLETED.
                </p>
              </div>
            </div>

            {recommendations.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No active recommendations pending review.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {recommendations.map((rec, idx) => (
                  <div key={rec.id || idx} className="py-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${getPriorityBadge(rec.priority)}`}>
                          {rec.priority}
                        </span>
                        <h4 className="text-sm font-bold text-neutral-900">{rec.title}</h4>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
                        Status: {rec.status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-700 leading-relaxed">{rec.summary}</p>
                    <p className="text-[10px] text-neutral-400 italic">{rec.advisoryDisclaimer}</p>

                    {rec.id && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {rec.status === "PROPOSED" && (
                          <>
                            <button
                              onClick={() => handleReviewRecommendation(rec.id!, "REVIEWED")}
                              disabled={actionInProgress === rec.id}
                              className="rounded bg-indigo-700 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-800 transition"
                            >
                              Mark Reviewed
                            </button>
                            <button
                              onClick={() => handleReviewRecommendation(rec.id!, "ACCEPTED")}
                              disabled={actionInProgress === rec.id}
                              className="rounded bg-emerald-700 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-800 transition"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReviewRecommendation(rec.id!, "REJECTED")}
                              disabled={actionInProgress === rec.id}
                              className="rounded border border-neutral-300 px-3 py-1 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {rec.status === "ACCEPTED" && (
                          <button
                            onClick={() => handleReviewRecommendation(rec.id!, "ACTIONED")}
                            disabled={actionInProgress === rec.id}
                            className="rounded bg-blue-700 px-3 py-1 text-xs font-bold text-white hover:bg-blue-800 transition"
                          >
                            Mark Actioned
                          </button>
                        )}

                        {rec.status === "ACTIONED" && (
                          <button
                            onClick={() => setOutcomeRecId(rec.id!)}
                            className="rounded bg-emerald-700 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-800 transition"
                          >
                            Record Outcome & Complete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 9: AI ADVISORY */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "ai-advisory" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Advisory AI Interpretation & Strategic Commentary
            </h3>
            <p className="text-xs text-neutral-500">
              Advisory reasoning grounded in normalized multi-agent evidence. AI interpretation is non-authoritative.
            </p>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 space-y-3 text-xs text-neutral-800">
              <div className="flex items-center space-x-2 text-indigo-900 font-bold">
                <Sparkles className="h-4 w-4" />
                <span>Deterministic Findings Authoritative:</span>
              </div>
              <p className="leading-relaxed">
                Systemic priority is calibrated at {stats.averagePriorityScore}/100 with {Math.round(stats.averageOrchestrationConfidence * 100)}% confidence.
                {conflicts.length > 0
                  ? ` Caution: ${conflicts.length} active contradiction(s) require human reconciliation before off-take commitments.`
                  : " Telemetry across specialized agents confirms cross-domain signal coherence."}
              </p>
              <div className="pt-1 text-[11px] text-neutral-500 italic">
                * Note: Autonomous purchasing, movement, culling, and statutory declarations are strictly prohibited.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 10: EVIDENCE & CONFIDENCE */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "evidence-confidence" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Evidence Provenance, Deduplication & Confidence Calibration
            </h3>
            <p className="text-xs text-neutral-500">
              Evidence metrics ensuring multiple agents relying on the same bulletin do not artificially inflate confidence.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="rounded-lg border border-neutral-200 p-3.5 space-y-1">
                <span className="text-neutral-500 text-[11px] block">Mean Evidence Credibility:</span>
                <strong className="text-base text-neutral-900">
                  {Math.round((latestSnapshot?.evidence_confidence || 0.85) * 100)}%
                </strong>
                <p className="text-[10px] text-neutral-400">Underlying source bulletins & telemetry</p>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3.5 space-y-1">
                <span className="text-neutral-500 text-[11px] block">Systemic Confidence:</span>
                <strong className="text-base text-emerald-700">
                  {Math.round((latestSnapshot?.orchestration_confidence || 0.8) * 100)}%
                </strong>
                <p className="text-[10px] text-neutral-400">Penalized by active contradictions</p>
              </div>

              <div className="rounded-lg border border-neutral-200 p-3.5 space-y-1">
                <span className="text-neutral-500 text-[11px] block">Conflict Penalty Applied:</span>
                <strong className="text-base text-rose-700">
                  -{conflicts.length * 20}%
                </strong>
                <p className="text-[10px] text-neutral-400">Degrades confidence when agents disagree</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 11: HISTORICAL OUTCOMES */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "historical-outcomes" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Evaluation Memory & Outcome Linkage ({outcomes.length})
            </h3>
            <p className="text-xs text-neutral-500">
              Captures actual real-world actions, observed outcomes, variance from expectations, and lessons learned.
            </p>

            {outcomes.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No outcomes recorded yet. Action a recommendation to link observed outcome data.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {outcomes.map((out, idx) => (
                  <div key={out.id || idx} className="py-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900">Action: {out.actionTaken}</span>
                      <span className="font-bold text-emerald-700">Score: {out.evaluationScore}/100</span>
                    </div>
                    <p className="text-neutral-600">Observed: {out.observedOutcome}</p>
                    <p className="text-[11px] text-neutral-400">Expected: {out.expectedOutcome} ({out.variance})</p>
                    <p className="text-[11px] text-indigo-900 bg-indigo-50/50 p-2 rounded">
                      <strong>Lessons Learned:</strong> {out.lessonsLearned}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 12: AGENT CONTRIBUTIONS & CONSOLES */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "agent-contributions" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Specialized Domain Agents Architecture
            </h3>
            <p className="text-xs text-neutral-500">
              All 8 specialized agents function as domain authorities for their deterministic calculations. The orchestrator coordinates above them.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {[
                { name: "Market Intelligence", path: "/market-intelligence", domain: "MARKET" as const, desc: "Wholesale prices & volatility" },
                { name: "Production Planning", path: "/production-intelligence", domain: "PRODUCTION" as const, desc: "Harvest schedule & yields" },
                { name: "Demand Forecasting", path: "/demand-intelligence", domain: "DEMAND" as const, desc: "Order trends & urban off-take" },
                { name: "Supply Matching", path: "/supply-intelligence", domain: "SUPPLY" as const, desc: "Producer aggregation & matching" },
                { name: "Procurement Intelligence", path: "/procurement-intelligence", domain: "PROCUREMENT" as const, desc: "B2B off-take & supplier diversity" },
                { name: "Food Security & Resilience", path: "/food-security", domain: "FOOD_SECURITY" as const, desc: "Vulnerability & availability index" },
                { name: "Logistics Intelligence", path: "/logistics-intelligence", domain: "LOGISTICS" as const, desc: "Corridor friction & transit flow" },
                { name: "Agricultural Biosecurity", path: "/disease-intelligence", domain: "DISEASE_BIOSECURITY" as const, desc: "Health early warning & biosecurity" },
              ].map((agent) => (
                <div key={agent.name} className="rounded-lg border border-neutral-200 p-3.5 space-y-2 bg-white">
                  <div className="flex items-center space-x-2">
                    {getDomainIcon(agent.domain)}
                    <h4 className="text-xs font-bold text-neutral-900">{agent.name}</h4>
                  </div>
                  <p className="text-[11px] text-neutral-500">{agent.desc}</p>
                  <a
                    href={agent.path}
                    className="inline-flex items-center text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                  >
                    Open Domain Console &rarr;
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Outcome Record Modal */}
      {outcomeRecId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-neutral-900">Record Recommendation Outcome</h3>
            <form onSubmit={handleRecordOutcomeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700">Action Taken *</label>
                <input
                  type="text"
                  value={outcomeActionTaken}
                  onChange={(e) => setOutcomeActionTaken(e.target.value)}
                  placeholder="e.g. Sourced 50MT Maize from adjacent cluster"
                  className="mt-1 block w-full rounded border border-neutral-300 p-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700">Observed Outcome *</label>
                <input
                  type="text"
                  value={outcomeObserved}
                  onChange={(e) => setOutcomeObserved(e.target.value)}
                  placeholder="e.g. Delivery completed with zero transit spoilage"
                  className="mt-1 block w-full rounded border border-neutral-300 p-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700">Expected Outcome *</label>
                <input
                  type="text"
                  value={outcomeExpected}
                  onChange={(e) => setOutcomeExpected(e.target.value)}
                  placeholder="e.g. Fulfill off-take quota without stock-out"
                  className="mt-1 block w-full rounded border border-neutral-300 p-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700">Evaluation Score (0-100) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={outcomeScore}
                  onChange={(e) => setOutcomeScore(e.target.value)}
                  className="mt-1 block w-full rounded border border-neutral-300 p-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700">Lessons Learned</label>
                <textarea
                  value={outcomeLessons}
                  onChange={(e) => setOutcomeLessons(e.target.value)}
                  placeholder="Key observations for model calibration"
                  className="mt-1 block w-full rounded border border-neutral-300 p-2 text-xs"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOutcomeRecId(null)}
                  className="rounded border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress === outcomeRecId}
                  className="rounded bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-800"
                >
                  Save Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
