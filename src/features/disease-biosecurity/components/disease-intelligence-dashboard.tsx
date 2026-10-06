"use client";

import React, { useState } from "react";
import {
  DiseaseSnapshotRecord,
  DiseaseObservationItem,
  BiosecurityDependencyItem,
  DiseaseAlertItem,
  DiseaseOverviewStats,
  AlertLifecycleStatus,
} from "../types";
import {
  runDiseaseIntelligenceAction,
  reviewDiseaseAlertAction,
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
  HeartPulse,
} from "lucide-react";

interface DiseaseDashboardProps {
  initialSnapshots: DiseaseSnapshotRecord[];
  initialObservations: DiseaseObservationItem[];
  initialDependencies: BiosecurityDependencyItem[];
  initialAlerts: DiseaseAlertItem[];
  initialStats: DiseaseOverviewStats;
}

export function DiseaseIntelligenceDashboard({
  initialSnapshots,
  initialObservations,
  initialDependencies,
  initialAlerts,
  initialStats,
}: DiseaseDashboardProps) {
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [observations, setObservations] = useState(initialObservations);
  const [dependencies, setDependencies] = useState(initialDependencies);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [stats, setStats] = useState(initialStats);

  const [activeTab, setActiveTab] = useState<
    "overview" | "signals" | "geography" | "value-chain" | "biosecurity" | "evidence" | "advisory" | "alerts"
  >("overview");

  // Runner state
  const [testState, setTestState] = useState("Kano");
  const [testLga, setTestLga] = useState("");
  const [testCommodity, setTestCommodity] = useState("Broiler Chicken");
  const [testCategory] = useState("POULTRY");
  const [testDomain, setTestDomain] = useState<"LIVESTOCK" | "CROPS" | "AQUACULTURE" | "BIOSECURITY">("LIVESTOCK");
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Reviewing alert state
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Filter keyword for snapshots
  const [filterKeyword, setFilterKeyword] = useState("");

  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setRunMessage(null);

    const formData = new FormData();
    formData.append("state", testState);
    if (testLga.trim()) formData.append("lga", testLga.trim());
    if (testCommodity.trim()) formData.append("commodity", testCommodity.trim());
    if (testCategory.trim()) formData.append("category", testCategory.trim());
    formData.append("domain", testDomain);

    const res = await runDiseaseIntelligenceAction(formData);
    setIsRunning(false);

    if (res.success && res.result) {
      setRunMessage({ text: "Agricultural disease & biosecurity intelligence evaluation completed successfully." });
      const {
        riskIndex,
        resilienceAssessment,
        observations: newObs,
        dependencies: newDeps,
        alerts: newAlerts,
      } = res.result;

      const newSnapshot: DiseaseSnapshotRecord = {
        state: testState,
        lga: testLga.trim() || null,
        geopolitical_zone: null,
        commodity: testCommodity.trim() || null,
        category: testCategory.trim() || null,
        risk_score: riskIndex.score,
        risk_level: riskIndex.level,
        resilience_score: resilienceAssessment.score,
        resilience_level: resilienceAssessment.level,
        risk_components: riskIndex.components,
        resilience_components: resilienceAssessment.components,
        evidence_strength: riskIndex.components.evidenceStrength,
        signal_convergence: riskIndex.components.signalConvergence,
        production_impact: riskIndex.components.productionImpactEvidence,
        movement_exposure: riskIndex.components.movementBiosecurityExposure,
        supply_impact: riskIndex.components.supplyImpactEvidence,
        key_drivers: riskIndex.keyDrivers,
        missing_evidence: riskIndex.missingEvidence,
        vulnerability_factors: resilienceAssessment.vulnerabilityFactors,
        adaptive_capacities: resilienceAssessment.adaptiveCapacities,
        confidence: riskIndex.confidence,
        calculated_at: new Date().toISOString(),
      };

      setSnapshots([newSnapshot, ...snapshots]);
      if (newObs.length > 0) setObservations([...newObs, ...observations]);
      if (newDeps.length > 0) setDependencies([...newDeps, ...dependencies]);
      if (newAlerts.length > 0) setAlerts([...newAlerts, ...alerts]);

      setStats((prev) => ({
        ...prev,
        averageRiskScore:
          Math.round(((prev.averageRiskScore * snapshots.length + riskIndex.score) / (snapshots.length + 1)) * 10) / 10,
        averageResilienceScore:
          Math.round(((prev.averageResilienceScore * snapshots.length + resilienceAssessment.score) / (snapshots.length + 1)) * 10) / 10,
        activeObservationsCount: prev.activeObservationsCount + newObs.length,
        activeAlertsCount: prev.activeAlertsCount + newAlerts.length,
      }));
    } else {
      setRunMessage({ text: res.error || "Failed to execute evaluation", error: true });
    }
  };

  const handleReviewAlert = async (alertId: string, decision: AlertLifecycleStatus) => {
    setReviewingId(alertId);
    const res = await reviewDiseaseAlertAction({
      alertId,
      decision,
      reviewNotes: `Human review transitioned alert status to ${decision}`,
    });
    setReviewingId(null);

    if (res.success) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: decision } : a))
      );
    }
  };

  const getRiskBadgeClass = (level: string) => {
    switch (level) {
      case "CRITICAL_RISK":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "HIGH_RISK":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "ELEVATED_RISK":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "MODERATE_RISK":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "LOW_RISK":
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
    const matchCommodity = s.commodity?.toLowerCase().includes(filterKeyword.toLowerCase());
    const matchCategory = s.category?.toLowerCase().includes(filterKeyword.toLowerCase());
    return matchState || matchCommodity || matchCategory;
  });

  return (
    <div className="space-y-6">
      {/* Mandatory Non-Veterinary / Non-Governmental Regulatory Disclaimer */}
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 shadow-sm flex items-start space-x-3">
        <Info className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            AgroMarket analytical indicator — not an official government disease classification, veterinary diagnosis, outbreak declaration, or regulatory notice.
          </p>
          <p className="text-rose-800 leading-relaxed">
            AgroMarket provides asset-light decision-support and early-warning intelligence. We do not provide veterinary clinical diagnoses,
            laboratory certifications, or medicine prescriptions. All agricultural health signals and biosecurity indicators represent analytical models
            correlating platform supply telemetry, public epidemiology bulletins, and farmer field observations. Farm owners and handlers must consult
            certified veterinary doctors and official state ministry agricultural extension personnel for clinical verification and treatment.
          </p>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Disease Risk Index</span>
            <Activity className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {stats.averageRiskScore}
            </span>
            <span className="text-xs text-neutral-400">/ 100</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Across {stats.monitoredStatesCount} monitored states
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Biosecurity Resilience</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {stats.averageResilienceScore}
            </span>
            <span className="text-xs text-neutral-400">/ 100</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            {Math.round(stats.verifiedSourcesRatio * 100)}% verified source correlation
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Active Signals</span>
            <HeartPulse className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-neutral-900">
              {stats.activeObservationsCount}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Field observations & advisories
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Governed Alerts</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-700">
              {stats.activeAlertsCount}
            </span>
            <span className="text-xs text-rose-500">({stats.criticalAlertsCount} critical)</span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Human-in-the-loop review queue
          </p>
        </div>
      </div>

      {/* Disease Risk Evaluation Runner */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-md bg-rose-100 p-1.5 text-rose-800">
                <HeartPulse className="h-5 w-5" />
              </span>
              <h2 className="text-base font-bold text-neutral-900">
                Evaluate Agricultural Disease & Biosecurity Risk
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Executes the deterministic 7-component Disease Risk Index, 8-dimension Resilience Score, and signal convergence detector.
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
              LGA (Optional)
            </label>
            <input
              type="text"
              value={testLga}
              onChange={(e) => setTestLga(e.target.value)}
              placeholder="e.g. Dala, Makarfi"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              Commodity
            </label>
            <input
              type="text"
              value={testCommodity}
              onChange={(e) => setTestCommodity(e.target.value)}
              placeholder="e.g. Broiler Chicken, Maize"
              className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              Domain
            </label>
            <select
              value={testDomain}
              onChange={(e) =>
                setTestDomain(
                  e.target.value as "LIVESTOCK" | "CROPS" | "AQUACULTURE" | "BIOSECURITY"
                )
              }
              className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-sm focus:border-rose-500 focus:outline-none"
            >
              <option value="LIVESTOCK">Livestock & Poultry</option>
              <option value="CROPS">Crops & Cereals</option>
              <option value="AQUACULTURE">Aquaculture & Fisheries</option>
              <option value="BIOSECURITY">Biosecurity & Quarantine</option>
            </select>
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
                  <Play className="mr-1.5 h-3.5 w-3.5" /> Run Disease Evaluation
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

      {/* Navigation Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { key: "overview", label: "Overview" },
            { key: "signals", label: `Disease Signals (${observations.length})` },
            { key: "geography", label: "Geographic Intelligence" },
            { key: "value-chain", label: "Value-Chain Impact" },
            { key: "biosecurity", label: `Biosecurity (${dependencies.length})` },
            { key: "evidence", label: "Evidence & Sources" },
            { key: "advisory", label: "AI Advisory" },
            { key: "alerts", label: `Governed Alerts (${alerts.length})` },
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
            {/* Recent Observed Snapshots */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Latest Disease Intelligence Snapshots
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.target.value)}
                    placeholder="Filter snapshots..."
                    className="rounded border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-800 focus:outline-none"
                  />
                  <span className="text-[11px] text-neutral-400">{snapshots.length} total</span>
                </div>
              </div>
              {filteredSnapshots.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">
                  No disease snapshots recorded yet. Run an evaluation above.
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {filteredSnapshots.slice(0, 5).map((snap, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-neutral-900">
                            {snap.commodity || "All Commodities"}
                          </span>
                          <span className="text-[10px] text-neutral-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-0.5" /> {snap.state} {snap.lga ? `(${snap.lga})` : ""}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 line-clamp-1">
                          Drivers: {snap.key_drivers.slice(0, 2).join("; ") || "Nominal baseline"}
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
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getRiskBadgeClass(
                            snap.risk_level
                          )}`}
                        >
                          {snap.risk_level.replace(/_/g, " ")} ({snap.risk_score})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Governed Alerts Queue Spotlight */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Governed Alerts Requiring Review
                </h3>
                <span className="text-[11px] text-rose-600 font-bold">
                  {alerts.filter((a) => a.status === "REVIEW").length} in review
                </span>
              </div>
              {alerts.length === 0 ? (
                <p className="text-xs text-neutral-400 py-4 text-center">
                  No active early-warning disease alerts. System nominal.
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {alerts.slice(0, 5).map((a, idx) => (
                    <div key={a.id || idx} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${getSeverityBadgeClass(
                              a.severity
                            )}`}
                          >
                            {a.severity}
                          </span>
                          <h4 className="text-xs font-bold text-neutral-900">{a.title}</h4>
                        </div>
                        <span className="text-[10px] text-neutral-500">{a.state}</span>
                      </div>
                      <p className="text-[11px] text-neutral-600 line-clamp-2">{a.summary}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-semibold text-rose-700">Status: {a.status}</span>
                        {a.status === "REVIEW" && a.id && (
                          <button
                            onClick={() => handleReviewAlert(a.id!, "PUBLISHED")}
                            disabled={reviewingId === a.id}
                            className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700 transition"
                          >
                            Publish Alert
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

      {/* Tab: Disease Signals */}
      {activeTab === "signals" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Observed Agricultural Disease Signals ({observations.length})
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Structured evidence records classified by reporting authority and verification status.
                </p>
              </div>
            </div>

            {observations.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No disease or health observations recorded in this sector.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {observations.map((obs, idx) => (
                  <div key={obs.id || idx} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
                          {obs.observationType.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            obs.verificationStatus === "OFFICIAL" || obs.verificationStatus === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {obs.verificationStatus}
                        </span>
                        <span className="text-xs font-bold text-neutral-900">
                          {obs.commodity || "General Produce"} ({obs.state})
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        Confidence: {Math.round(obs.confidence * 100)}%
                      </span>
                    </div>

                    <p className="text-xs text-neutral-700 leading-relaxed">{obs.evidenceSummary}</p>

                    <div className="flex items-center space-x-4 text-[10px] text-neutral-400">
                      <span>Source: {obs.sourceName}</span>
                      <span>Type: {obs.sourceType}</span>
                      {obs.sourceUrl && (
                        <a
                          href={obs.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          Reference Link &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Geographic Intelligence */}
      {activeTab === "geography" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Aggregated Regional Risk Density
            </h3>
            <p className="text-xs text-neutral-500">
              Zero individual farm coordinates or private farmer addresses are exposed. All intelligence represents regional and zonal aggregations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {snapshots.map((snap, idx) => (
                <div key={idx} className="rounded-lg border border-neutral-200 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">{snap.state}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${getRiskBadgeClass(snap.risk_level)}`}>
                      {snap.risk_level.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    Commodity: {snap.commodity || "All"} • Risk: {snap.risk_score}/100
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Confidence: {Math.round(snap.confidence * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Value-Chain Impact */}
      {activeTab === "value-chain" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Calibrated Value-Chain Impact Chain
            </h3>
            <p className="text-xs text-neutral-500">
              Correlation is not causation. Evaluates potential downstream exposure without claiming confirmed causation.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-lg border border-neutral-200 p-4 space-y-2">
                <span className="text-xs font-bold text-neutral-700">1. Production & Farm Health</span>
                <p className="text-[11px] text-neutral-600">
                  Early-warning mortality signals and abnormal loss reports indicate potential harvest contraction in affected zones.
                </p>
              </div>

              <div className="rounded-lg border border-neutral-200 p-4 space-y-2">
                <span className="text-xs font-bold text-neutral-700">2. Movement & Logistics</span>
                <p className="text-[11px] text-neutral-600">
                  Health-related checkpoints or sanitary quarantines may slow outward corridor distribution. Check alternate feeder routes.
                </p>
              </div>

              <div className="rounded-lg border border-neutral-200 p-4 space-y-2">
                <span className="text-xs font-bold text-neutral-700">3. Supply & Food Security</span>
                <p className="text-[11px] text-neutral-600">
                  Prolonged production disruption combined with corridor dependencies may increase food affordability pressure.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Biosecurity Dependencies */}
      {activeTab === "biosecurity" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Biosecurity Dependencies & Bottlenecks ({dependencies.length})
            </h3>
            <p className="text-xs text-neutral-500">
              Identifies heavy concentration on single producers, transit routes, or processing units that elevate systemic risk.
            </p>

            {dependencies.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No critical biosecurity dependencies exceed analytical thresholds.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {dependencies.map((dep, idx) => (
                  <div key={dep.id || idx} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${getSeverityBadgeClass(dep.severity)}`}>
                          {dep.severity}
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900">
                          {dep.dependencyType.replace(/_/g, " ")}: {dep.dominantEntity}
                        </h4>
                      </div>
                      <span className="text-xs font-black text-rose-700">{dep.concentrationPercentage}%</span>
                    </div>
                    <p className="text-xs text-neutral-600">{dep.riskAssessment}</p>
                    <p className="text-[10px] text-neutral-400">Evidence: {dep.evidence}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Evidence & Sources */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Evidence Provenance & Verification Model
            </h3>
            <p className="text-xs text-neutral-500">
              Distinguishes verified institutional advisories from secondary observations and unverified community reports.
            </p>

            <div className="space-y-2 pt-2">
              {observations.map((obs, idx) => (
                <div key={idx} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-neutral-800">{obs.sourceName}</span>
                    <p className="text-[11px] text-neutral-600">{obs.evidenceSummary}</p>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">{obs.verificationStatus}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: AI Advisory */}
      {activeTab === "advisory" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Advisory AI Interpretation & Human Decision Support
            </h3>
            <p className="text-xs text-neutral-500">
              AI reasoning is strictly advisory and grounded in deterministic signal packages. Clinical diagnosis is prohibited.
            </p>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 space-y-2 text-xs text-neutral-700">
              <p className="font-semibold text-indigo-900">Deterministic Engine Findings Authoritative:</p>
              <p>
                Average Disease Risk Index is evaluated at {stats.averageRiskScore}/100 with Biosecurity Resilience at {stats.averageResilienceScore}/100.
                All consequential alerts require human administrative verification before public publication.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Governed Alerts */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Governed Early-Warning Alerts ({alerts.length})
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Governed lifecycle: DRAFT &rarr; REVIEW &rarr; PUBLISHED &rarr; ACKNOWLEDGED &rarr; RESOLVED &rarr; ARCHIVED.
                </p>
              </div>
            </div>

            {alerts.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No disease early-warning alerts currently recorded.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {alerts.map((alert, idx) => (
                  <div key={alert.id || idx} className="py-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${getSeverityBadgeClass(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <h4 className="text-sm font-bold text-neutral-900">{alert.title}</h4>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                        Status: {alert.status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-700 leading-relaxed">{alert.summary}</p>
                    <p className="text-[11px] text-rose-800 bg-rose-50 p-2 rounded">
                      <strong>Advice:</strong> {alert.officialConsultationAdvice}
                    </p>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-neutral-400">
                        Code: {alert.alertCode} • Confidence: {Math.round(alert.confidence * 100)}%
                      </span>

                      {alert.id && alert.status === "REVIEW" && (
                        <button
                          onClick={() => handleReviewAlert(alert.id!, "PUBLISHED")}
                          disabled={reviewingId === alert.id}
                          className="rounded bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700 transition"
                        >
                          Approve & Publish Alert
                        </button>
                      )}
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
