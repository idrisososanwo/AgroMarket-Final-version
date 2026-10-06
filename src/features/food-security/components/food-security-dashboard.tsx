"use client";

import React, { useState } from "react";
import {
  FoodSecuritySnapshotRecord,
  AgriculturalResilienceSnapshotRecord,
  CriticalDependencyItem,
  FoodSecurityAlertRecord,
  FoodSecurityOverviewStats,
  AlertLifecycleStatus,
} from "../types";
import {
  runFoodSecurityAction,
  reviewFoodSecurityAlertAction,
} from "../actions";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCw,
  Search,
  Info,
  MapPin,
  Layers,
} from "lucide-react";

interface FoodSecurityDashboardProps {
  initialSnapshots: FoodSecuritySnapshotRecord[];
  initialResilience: AgriculturalResilienceSnapshotRecord[];
  initialDependencies: CriticalDependencyItem[];
  initialAlerts: FoodSecurityAlertRecord[];
  initialStats: FoodSecurityOverviewStats;
}

export function FoodSecurityDashboard({
  initialSnapshots,
  initialResilience,
  initialDependencies,
  initialAlerts,
  initialStats,
}: FoodSecurityDashboardProps) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [resilienceList, setResilienceList] = useState(initialResilience);
  const [dependencies, setDependencies] = useState(initialDependencies);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [stats, setStats] = useState(initialStats);

  const [activeTab, setActiveTab] = useState<
    "overview" | "commodities" | "regions" | "alerts" | "resilience" | "dependencies"
  >("overview");

  // Runner state
  const [testCommodity, setTestCommodity] = useState("White Maize");
  const [testState, setTestState] = useState("Kano");
  const [testLga, setTestLga] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Reviewing alert state
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Search filter
  const [filterKeyword, setFilterKeyword] = useState("");

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setRunMessage(null);

    const formData = new FormData();
    formData.append("state", testState);
    if (testCommodity.trim()) {
      formData.append("commodity", testCommodity.trim());
    }
    if (testLga.trim()) {
      formData.append("lga", testLga.trim());
    }

    const res = await runFoodSecurityAction(formData);
    setIsRunning(false);

    if (res.success && res.result) {
      setRunMessage({ text: "Food security early-warning evaluation executed successfully." });
      const { pressureIndex, resilienceAssessment, dependencies: newDeps, candidateAlerts } = res.result;

      const newSnapshot: FoodSecuritySnapshotRecord = {
        commodity: testCommodity.trim() || null,
        state: testState,
        lga: testLga.trim() || null,
        geopolitical_zone: null,
        pressure_score: pressureIndex.score,
        pressure_level: pressureIndex.level,
        component_scores: pressureIndex.components,
        availability_status: "ADEQUATE",
        affordability_status: "STABLE",
        access_status: "NORMAL",
        stability_status: "STABLE",
        key_drivers: pressureIndex.keyDrivers,
        constraints: [],
        missing_evidence: pressureIndex.missingEvidence,
        confidence: pressureIndex.confidence,
        calculated_at: new Date().toISOString(),
      };

      const newResilienceRecord: AgriculturalResilienceSnapshotRecord = {
        commodity: testCommodity.trim() || null,
        state: testState,
        lga: testLga.trim() || null,
        resilience_score: resilienceAssessment.score,
        resilience_level: resilienceAssessment.level,
        component_scores: resilienceAssessment.components,
        vulnerability_factors: resilienceAssessment.vulnerabilityFactors,
        adaptive_capacities: resilienceAssessment.adaptiveCapacities,
        confidence: resilienceAssessment.confidence,
        calculated_at: new Date().toISOString(),
      };

      setSnapshots([newSnapshot, ...snapshots]);
      setResilienceList([newResilienceRecord, ...resilienceList]);
      if (newDeps.length > 0) {
        setDependencies([...newDeps, ...dependencies]);
      }
      if (candidateAlerts.length > 0) {
        setAlerts([...candidateAlerts, ...alerts]);
      }

      setStats((prev) => ({
        ...prev,
        averagePressureScore: Math.round(((prev.averagePressureScore * snapshots.length + pressureIndex.score) / (snapshots.length + 1)) * 10) / 10,
        averageResilienceScore: Math.round(((prev.averageResilienceScore * resilienceList.length + resilienceAssessment.score) / (resilienceList.length + 1)) * 10) / 10,
        activeAlertsCount: prev.activeAlertsCount + candidateAlerts.length,
        criticalDependenciesCount: prev.criticalDependenciesCount + newDeps.length,
      }));
    } else {
      setRunMessage({ text: res.error || "Failed to execute evaluation", error: true });
    }
  };

  const handleReviewAlert = async (
    alertId: string,
    decision: AlertLifecycleStatus,
    isPublic: boolean = false
  ) => {
    setReviewingId(alertId);
    const res = await reviewFoodSecurityAlertAction({
      alertId,
      decision,
      isPublic,
      reviewNotes: `Human review decision: ${decision}`,
    });
    setReviewingId(null);

    if (res.success) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: decision, is_public: isPublic } : a))
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

  const getAlertSeverityBadgeClass = (severity: string) => {
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
    const matchCommodity = s.commodity?.toLowerCase().includes(filterKeyword.toLowerCase());
    const matchState = s.state.toLowerCase().includes(filterKeyword.toLowerCase());
    return matchCommodity || matchState;
  });

  return (
    <div className="space-y-6">
      {/* Disclaimer Alert Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 shadow-sm flex items-start space-x-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            AgroMarket analytical indicator — not an official government food-security classification.
          </p>
          <p className="text-blue-800 leading-relaxed">
            This early-warning decision support system transforms agricultural market, production, demand, supply,
            procurement, and security signals into deterministic indicators. It is not an emergency response authority,
            military system, veterinary service, food safety regulator, or guaranteed forecast. Human experts and
            authorized institutions remain authoritative.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Avg Pressure Index</span>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {stats.averagePressureScore}
            </span>
            <span className="text-xs text-neutral-400">/ 100</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {stats.highPressureCommoditiesCount} commodities under elevated pressure
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Avg Resilience Score</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {stats.averageResilienceScore}
            </span>
            <span className="text-xs text-neutral-400">/ 100</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Across {stats.totalEvaluatedStatesCount} evaluated states & corridors
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Active Alerts</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-700">
              {stats.activeAlertsCount}
            </span>
            {stats.criticalAlertsCount > 0 && (
              <span className="text-xs font-bold text-rose-600">
                ({stats.criticalAlertsCount} Critical)
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Requiring human & expert verification
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Critical Dependencies</span>
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {stats.criticalDependenciesCount}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Concentration bottlenecks detected
          </p>
        </div>
      </div>

      {/* Execution Runner Form */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-md bg-rose-100 p-1.5 text-rose-800">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <h2 className="text-base font-bold text-neutral-900">
                Evaluate Food Security & Resilience Early Warning
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Executes the deterministic 8-component Pressure Index and 7-component Resilience Assessment with AI interpretation.
            </p>
          </div>
        </div>

        <form onSubmit={handleRunAnalysis} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              Target State *
            </label>
            <select
              value={testState}
              onChange={(e) => setTestState(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-rose-500 focus:outline-none"
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
              Commodity (Optional)
            </label>
            <input
              type="text"
              value={testCommodity}
              onChange={(e) => setTestCommodity(e.target.value)}
              placeholder="e.g. White Maize, Sorghum"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              LGA (Optional)
            </label>
            <input
              type="text"
              value={testLga}
              onChange={(e) => setTestLga(e.target.value)}
              placeholder="e.g. Dawanau, Bida"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isRunning}
              className="w-full inline-flex items-center justify-center rounded-lg bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-800 disabled:opacity-50 transition"
            >
              {isRunning ? (
                <>
                  <RotateCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Evaluating...
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Run Early Warning
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
            { key: "overview", label: "Executive Overview" },
            { key: "commodities", label: "Commodity Monitor" },
            { key: "regions", label: "Regional Monitor" },
            { key: "alerts", label: `Alert Center (${alerts.length})` },
            { key: "resilience", label: "Agricultural Resilience" },
            { key: "dependencies", label: `Critical Dependencies (${dependencies.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`py-3 text-xs font-bold whitespace-nowrap border-b-2 transition ${
                activeTab === tab.key
                  ? "border-rose-600 text-rose-700"
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
            {/* Recent Pressure Signals */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Recent Observed Pressure Snapshots
                </h3>
                <span className="text-[11px] text-neutral-400">{snapshots.length} total</span>
              </div>
              {snapshots.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">
                  No snapshots recorded yet. Run an analysis above.
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {snapshots.slice(0, 5).map((snap, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-neutral-900">
                            {snap.commodity || "All Commodities"}
                          </span>
                          <span className="text-[10px] text-neutral-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-0.5" /> {snap.state} {snap.lga ? `• ${snap.lga}` : ""}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 line-clamp-1">
                          Key Drivers: {snap.key_drivers.join(", ") || "None recorded"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
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

            {/* Critical Alert Spotlight */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Pending Human Verification Alerts
                </h3>
                <span className="text-[11px] text-rose-600 font-semibold">
                  {alerts.filter((a) => a.status === "DRAFT" || a.status === "REVIEW").length} requiring review
                </span>
              </div>
              {alerts.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">
                  No active early-warning alerts. System monitoring nominal.
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id || alert.title} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${getAlertSeverityBadgeClass(
                              alert.severity
                            )}`}
                          >
                            {alert.severity}
                          </span>
                          <h4 className="text-xs font-bold text-neutral-900">{alert.title}</h4>
                        </div>
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold text-neutral-600">
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600">{alert.summary}</p>
                      <div className="text-[10px] text-neutral-400 flex items-center justify-between">
                        <span>Confidence: {Math.round(alert.confidence * 100)}%</span>
                        {alert.status === "DRAFT" && (
                          <button
                            onClick={() => handleReviewAlert(alert.id!, "PUBLISHED", true)}
                            disabled={reviewingId === alert.id}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline"
                          >
                            Publish to Public Feed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Commodity Monitor */}
      {activeTab === "commodities" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                placeholder="Search commodity or state..."
                className="w-full rounded-lg border border-neutral-300 pl-8 pr-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-rose-500"
              />
            </div>
            <span className="text-xs text-neutral-500">
              Showing {filteredSnapshots.length} observations
            </span>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-xs">
              <thead className="bg-neutral-50 text-[10px] uppercase font-bold text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Commodity & Region</th>
                  <th className="px-4 py-3">Pressure Score</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Affordability</th>
                  <th className="px-4 py-3">Stability</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Drivers & Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white text-neutral-700">
                {filteredSnapshots.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                      No matching commodity records found.
                    </td>
                  </tr>
                ) : (
                  filteredSnapshots.map((snap, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-neutral-900">{snap.commodity || "All Commodities"}</div>
                        <div className="text-[10px] text-neutral-500">{snap.state} {snap.lga ? `• ${snap.lga}` : ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${getPressureBadgeClass(snap.pressure_level)}`}>
                          {snap.pressure_level.replace(/_/g, " ")} ({snap.pressure_score})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-medium">{snap.availability_status}</td>
                      <td className="px-4 py-3 text-[11px] font-medium">{snap.affordability_status}</td>
                      <td className="px-4 py-3 text-[11px] font-medium">{snap.stability_status}</td>
                      <td className="px-4 py-3 text-[11px]">{Math.round(snap.confidence * 100)}%</td>
                      <td className="px-4 py-3 text-[10px] text-neutral-500 max-w-xs">
                        <div><strong className="text-neutral-700">Drivers:</strong> {snap.key_drivers.join(", ") || "None"}</div>
                        {snap.missing_evidence.length > 0 && (
                          <div><strong className="text-neutral-700">Missing:</strong> {snap.missing_evidence.join(", ")}</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Regional Monitor */}
      {activeTab === "regions" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 mb-3">
              Regional Vulnerability & Movement Corridors
            </h3>
            <p className="text-xs text-neutral-600 mb-4">
              Cross-correlates regional agricultural output with transit corridor security notices and logistics disruptions.
              Correlations are explicitly marked as <em>POTENTIAL_IMPACT</em> and never presented as unverified causation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resilienceList.slice(0, 9).map((res, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-neutral-900">{res.state}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getResilienceBadgeClass(res.resilience_level)}`}>
                      {res.resilience_level.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    Resilience Score: <strong className="text-neutral-800">{res.resilience_score} / 100</strong>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="text-neutral-700 font-medium">Vulnerabilities:</div>
                    <ul className="list-disc list-inside text-neutral-500 text-[10px]">
                      {res.vulnerability_factors.slice(0, 3).map((v, vi) => (
                        <li key={vi}>{v}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="text-neutral-700 font-medium">Adaptive Capacities:</div>
                    <ul className="list-disc list-inside text-emerald-700 text-[10px]">
                      {res.adaptive_capacities.slice(0, 3).map((a, ai) => (
                        <li key={ai}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Alert Center */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              Candidate alerts are generated deterministically and held in <strong>DRAFT</strong> mode until reviewed by authorized personnel.
            </p>
            <span className="text-xs font-semibold text-neutral-700">Total: {alerts.length}</span>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-xs text-neutral-400">
                No food security early-warning alerts on file.
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id || alert.title} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${getAlertSeverityBadgeClass(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <h4 className="text-sm font-bold text-neutral-900">{alert.title}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                        Status: {alert.status}
                      </span>
                      {alert.is_public && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Public
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-700 leading-relaxed">{alert.summary}</p>

                  <div className="rounded-lg bg-neutral-50 p-3 text-[11px] space-y-1.5 text-neutral-600">
                    <div>
                      <strong className="text-neutral-800">Evidence Summary:</strong> {alert.evidence_summary}
                    </div>
                    <div>
                      <strong className="text-neutral-800">Contributing Signals:</strong> {alert.contributing_signals.join(", ") || "None"}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-neutral-100 text-xs">
                    <div className="text-[11px] text-neutral-500">
                      Region: <span className="font-semibold text-neutral-700">{alert.state}</span> • Confidence: <span className="font-semibold text-neutral-700">{Math.round(alert.confidence * 100)}%</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {alert.status === "DRAFT" && (
                        <>
                          <button
                            onClick={() => handleReviewAlert(alert.id!, "REVIEW")}
                            disabled={reviewingId === alert.id}
                            className="rounded border border-neutral-300 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50"
                          >
                            Mark In Review
                          </button>
                          <button
                            onClick={() => handleReviewAlert(alert.id!, "PUBLISHED", true)}
                            disabled={reviewingId === alert.id}
                            className="rounded bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700"
                          >
                            Approve & Publish
                          </button>
                        </>
                      )}
                      {alert.status === "PUBLISHED" && (
                        <button
                          onClick={() => handleReviewAlert(alert.id!, "RESOLVED")}
                          disabled={reviewingId === alert.id}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {alert.status !== "ARCHIVED" && (
                        <button
                          onClick={() => handleReviewAlert(alert.id!, "ARCHIVED")}
                          disabled={reviewingId === alert.id}
                          className="text-[11px] text-neutral-400 hover:text-neutral-600 underline"
                        >
                          Archive
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

      {/* Tab: Resilience */}
      {activeTab === "resilience" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Deterministic Agricultural Resilience Model
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Evaluates how well regional agricultural systems absorb disruption across 7 dimensions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Supply Diversification</span>
                <p className="text-base font-black text-neutral-900 mt-1">15% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Supplier breadth and concentration ratios</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Regional Diversification</span>
                <p className="text-base font-black text-neutral-900 mt-1">15% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Multi-state sourcing spread</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Processing Redundancy</span>
                <p className="text-base font-black text-neutral-900 mt-1">15% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Milling and downstream facilities availability</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <span className="text-[10px] uppercase font-bold text-neutral-500">Logistics Redundancy</span>
                <p className="text-base font-black text-neutral-900 mt-1">15% Weight</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Alternative road transport and transit corridors</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Dependencies */}
      {activeTab === "dependencies" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Detected Critical Dependencies & Bottlenecks
            </h3>
            <p className="text-xs text-neutral-500">
              Triggered when a single corridor, processing facility, or supplier represents &ge; 40% of observed capacity.
            </p>

            {dependencies.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No critical dependencies currently detected above threshold.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {dependencies.map((dep, idx) => (
                  <div key={idx} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="rounded bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-bold">
                          {dep.dependencyType.replace(/_/g, " ")}
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900">
                          {dep.commodity} • {dep.state}
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-rose-600">
                        {Math.round(dep.concentrationRatio * 100)}% Concentration
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-700">{dep.riskAssessment}</p>
                    <div className="text-[10px] text-neutral-500 flex items-center space-x-4">
                      <span>Dominant Entity: <strong>{dep.dominantEntity}</strong></span>
                      <span>Alternative Options: <strong>{dep.alternativeOptionsAvailable}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
