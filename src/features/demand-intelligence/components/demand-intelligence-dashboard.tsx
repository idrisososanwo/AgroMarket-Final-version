"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  BarChart3,
  ShoppingCart,
  Building2,
  Users2,
  MapPin,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle2,
  Layers,
  Brain,
} from "lucide-react";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { DemandIntelligenceSummary } from "../queries";
import { DemandIntelligenceRunResult } from "../types";
import { runDemandForecastingAction } from "../actions";

interface DemandIntelligenceDashboardProps {
  initialSnapshots: DemandIntelligenceSummary[];
}

export function DemandIntelligenceDashboard({
  initialSnapshots,
}: DemandIntelligenceDashboardProps) {
  const [commodity, setCommodity] = useState("Roma Tomatoes");
  const [selectedState, setSelectedState] = useState("Lagos");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DemandIntelligenceRunResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<DemandIntelligenceSummary[]>(initialSnapshots);

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setActionError(null);
    try {
      const res = await runDemandForecastingAction(commodity, selectedState);
      if (res.success && res.data) {
        setResult(res.data);
        const newSnap: DemandIntelligenceSummary = {
          id: `snap-${Date.now()}`,
          commodity: res.data.commodity,
          state: res.data.state,
          demandPressureScore: res.data.snapshot.demandPressure.score,
          demandPressureLevel: res.data.snapshot.demandPressure.level,
          forecastDirection: res.data.snapshot.forecast.forecastDirection,
          forecastConfidence: res.data.snapshot.forecast.confidenceScore,
          forecastHorizonDays: res.data.snapshot.forecast.forecastHorizonDays,
          predictedDemandVolume: res.data.snapshot.forecast.predictedDemandVolume,
          volumeUnit: res.data.snapshot.forecast.volumeUnit,
          b2bDemandVolume: res.data.snapshot.channels.b2b.requestedVolume,
          consumerOrdersCount: res.data.snapshot.channels.consumer.ordersCount,
          consumerOrdersVolume: res.data.snapshot.channels.consumer.volume,
          sharedPurchaseDemandVolume: res.data.snapshot.channels.sharedPurchase.pooledVolume,
          volatilityLevel: res.data.snapshot.volatility.level,
          unmetDemandDetected: res.data.snapshot.unmetDemand.unmetDemandDetected,
          demandConcentration: res.data.snapshot.concentration.level,
          confidence: res.data.snapshot.trend.confidence,
          drivers: res.data.snapshot.demandPressure.drivers,
          risks: res.data.snapshot.demandPressure.risks,
          evidenceCount: res.data.snapshot.evidenceCount,
          calculatedAt: new Date().toISOString(),
        };
        setSnapshots((prev) => [newSnap, ...prev]);
      } else {
        setActionError(res.error || "Execution failed");
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Demand analysis request failed");
    } finally {
      setIsRunning(false);
    }
  };

  const getPressureBadge = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "ACUTE":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "ELEVATED":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "MODERATE":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-300";
    }
  };

  const getDirectionBadge = (dir: string) => {
    switch (dir) {
      case "SHARP_INCREASE":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "MODERATE_INCREASE":
        return "bg-teal-100 text-teal-800 border-teal-300";
      case "SHARP_DECREASE":
        return "bg-red-100 text-red-800 border-red-300";
      case "MODERATE_DECREASE":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "STABLE":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-300";
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                Demand Forecasting & Demand Intelligence Agent
              </h1>
              <p className="text-xs text-neutral-600">
                Synthesizes consumer orders, institutional B2B demands, shared purchase pools, and regional pressure. Strictly decision support.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-300">
              Agent: Active (v2.5)
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 border border-neutral-300">
              Non-Autonomous • Advisory Only
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Trigger Form */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            Analyze Commodity Demand
          </h2>
          <span className="text-xs text-neutral-400">Ground-truth platform activity & demand telemetry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Agricultural Commodity
            </label>
            <input
              type="text"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              placeholder="e.g. Roma Tomatoes, Cassava Tubers, Yellow Maize"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Target State / Region
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              {NIGERIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunAnalysis}
              disabled={isRunning || !commodity.trim()}
              className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Analyzing Demand Signals...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Run Demand Intelligence Agent
                </>
              )}
            </button>
          </div>
        </div>

        {actionError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 3. Evaluation Result Display */}
      {result && (
        <div className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900">
                  {result.commodity} in {result.state}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getPressureBadge(
                    result.snapshot.demandPressure.level
                  )}`}
                >
                  Pressure: {result.snapshot.demandPressure.level} (
                  {result.snapshot.demandPressure.score}/100)
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getDirectionBadge(
                    result.snapshot.trend.direction
                  )}`}
                >
                  Trend: {result.snapshot.trend.direction.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Status: <span className="font-medium text-neutral-700">{result.status}</span> •
                Evidence items:{" "}
                <span className="font-medium text-neutral-700">
                  {result.snapshot.evidenceCount}
                </span>{" "}
                • Confidence:{" "}
                <span className="font-medium text-neutral-700">
                  {Math.round(result.snapshot.trend.confidence * 100)}%
                </span>
              </p>
            </div>
            <span className="text-xs text-neutral-400">
              {new Date(result.snapshot.generatedAt).toLocaleString()}
            </span>
          </div>

          {/* Calibrated Notice */}
          <div className="rounded-lg bg-blue-50/70 border border-blue-200 p-4 text-xs text-blue-900">
            <p className="font-medium">{result.snapshot.trend.calibratedObservation}</p>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 30-Day Demand Volume */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                30-Day Volume
              </span>
              <div className="text-lg font-bold text-neutral-900">
                {result.snapshot.trend.currentPeriodVolume30d.toLocaleString()}{" "}
                <span className="text-xs font-normal text-neutral-500">
                  {result.snapshot.trend.canonicalUnit}
                </span>
              </div>
              <p className="text-[10px] text-neutral-500">
                {result.snapshot.trend.percentageChange30d !== null
                  ? `${result.snapshot.trend.percentageChange30d >= 0 ? "+" : ""}${
                      result.snapshot.trend.percentageChange30d
                    }% vs prior 30d`
                  : "Baseline observation period"}
              </p>
            </div>

            {/* Deterministic Forecast */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {result.snapshot.forecast.forecastHorizonDays}-Day Forecast
              </span>
              <div className="text-lg font-bold text-neutral-900">
                {result.snapshot.forecast.predictedDemandVolume.toLocaleString()}{" "}
                <span className="text-xs font-normal text-neutral-500">
                  {result.snapshot.forecast.volumeUnit}
                </span>
              </div>
              <p className="text-[10px] text-neutral-500">
                Method: {result.snapshot.forecast.method} • {result.snapshot.forecast.confidenceLevel}
              </p>
            </div>

            {/* Demand Pressure Score */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Demand Pressure
              </span>
              <div className="text-lg font-bold text-neutral-900">
                {result.snapshot.demandPressure.score}
                <span className="text-xs font-normal text-neutral-500">/100</span>
              </div>
              <p className="text-[10px] text-neutral-500">
                Level: {result.snapshot.demandPressure.level}
              </p>
            </div>

            {/* Demand Volatility & Concentration */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Volatility & Structure
              </span>
              <div className="text-base font-bold text-neutral-900">
                {result.snapshot.volatility.level}
              </div>
              <p className="text-[10px] text-neutral-500">
                {result.snapshot.concentration.level.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {/* Channel Decomposition: Consumer, B2B, Shared Purchase */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
            <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Demand Channel Composition
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Consumer */}
              <div className="rounded-lg border border-neutral-200 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                    <ShoppingCart className="h-3.5 w-3.5 text-neutral-500" /> Consumer Marketplace
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {result.snapshot.channels.consumer.ordersCount} order(s)
                  </span>
                </div>
                <div className="text-sm font-bold text-neutral-900">
                  {result.snapshot.channels.consumer.volume.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-neutral-500">
                    {result.snapshot.channels.consumer.unit}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500">
                  Active cart intent: {result.snapshot.channels.consumer.activeCartCount} item(s)
                </p>
              </div>

              {/* B2B */}
              <div className="rounded-lg border border-neutral-200 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-neutral-500" /> Institutional B2B
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {result.snapshot.channels.b2b.activeDemandsCount} active request(s)
                  </span>
                </div>
                <div className="text-sm font-bold text-neutral-900">
                  {result.snapshot.channels.b2b.requestedVolume.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-neutral-500">
                    {result.snapshot.channels.b2b.unit}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500">
                  Fulfilled count: {result.snapshot.channels.b2b.fulfilledCount}
                </p>
              </div>

              {/* Shared Purchase */}
              <div className="rounded-lg border border-neutral-200 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                    <Users2 className="h-3.5 w-3.5 text-neutral-500" /> Shared Purchase Pools
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {result.snapshot.channels.sharedPurchase.activePoolsCount} pool(s)
                  </span>
                </div>
                <div className="text-sm font-bold text-neutral-900">
                  {result.snapshot.channels.sharedPurchase.pooledVolume.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-neutral-500">
                    {result.snapshot.channels.sharedPurchase.unit}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500">
                  Allocated: {result.snapshot.channels.sharedPurchase.completedVolume.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Unmet Demand Alert if detected */}
          {result.snapshot.unmetDemand.unmetDemandDetected && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Unmet Demand Alert: Potential Supply Gap Detected
              </div>
              <p>{result.snapshot.unmetDemand.calibratedNote}</p>
              {result.snapshot.unmetDemand.deficitQuantity && (
                <p className="font-semibold">
                  Estimated Deficit: {result.snapshot.unmetDemand.deficitQuantity.toLocaleString()}{" "}
                  {result.snapshot.unmetDemand.unit}
                </p>
              )}
            </div>
          )}

          {/* Regional Comparisons */}
          {result.snapshot.regionalComparisons.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
              <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-blue-600" />
                Regional Demand Distribution
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {result.snapshot.regionalComparisons.slice(0, 8).map((rc) => (
                  <div
                    key={rc.state}
                    className={`rounded-lg border p-2.5 text-xs ${
                      rc.state === result.state
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-neutral-200 bg-neutral-50"
                    }`}
                  >
                    <div className="font-semibold text-neutral-800">{rc.state}</div>
                    <div className="text-[11px] text-neutral-600 font-mono">
                      {rc.volume.toLocaleString()} {rc.unit} ({rc.sharePercent}%)
                    </div>
                    <div className="text-[10px] text-neutral-400">{rc.ordersCount} order(s)</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Advisory Interpretation */}
          {result.aiInterpretation && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                <Brain className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-neutral-900">
                  Controlled AI Interpretation (Phase 2.2 Reasoning Gateway)
                </h4>
              </div>

              <p className="text-xs text-neutral-700 leading-relaxed">
                {result.aiInterpretation.summary}
              </p>

              {result.aiInterpretation.keyFindings?.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-neutral-800">Key Analytical Findings:</span>
                  <ul className="mt-1 list-disc list-inside text-xs text-neutral-600 space-y-0.5">
                    {result.aiInterpretation.keyFindings.map((finding: string, i: number) => (
                      <li key={i}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.snapshot.demandPressure.drivers?.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-neutral-800">Demand Drivers:</span>
                  <ul className="mt-1 list-disc list-inside text-xs text-neutral-600 space-y-0.5">
                    {result.snapshot.demandPressure.drivers.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.snapshot.demandPressure.risks?.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-neutral-800">Demand Risks & Caveats:</span>
                  <ul className="mt-1 list-disc list-inside text-xs text-neutral-600 space-y-0.5">
                    {result.snapshot.demandPressure.risks.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.aiInterpretation.uncertainty && (
                <div className="rounded border border-indigo-100 bg-white/70 p-2 text-[11px] text-neutral-600">
                  <span className="font-semibold text-neutral-700">Uncertainty Note:</span>{" "}
                  {result.aiInterpretation.uncertainty}
                </div>
              )}
            </div>
          )}

          {/* Advisory Recommendation */}
          {result.proposedRecommendation && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-emerald-950">
                    Advisory Recommendation: {result.proposedRecommendation.title}
                  </h4>
                </div>
                <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-900">
                  {result.proposedRecommendation.status}
                </span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                {result.proposedRecommendation.recommendation}
              </p>
              <div className="text-[10px] text-emerald-700 font-medium">
                Decision Support Only: Requires human verification. Does not trigger automatic purchasing, selling, or inventory reallocation.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Historical Snapshots Ledger */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            <Layers className="h-4 w-4 text-neutral-500" />
            Demand Intelligence History Ledger
          </h2>
          <span className="text-xs text-neutral-400">{snapshots.length} Snapshots Recorded</span>
        </div>

        {snapshots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 p-8 text-center">
            <TrendingUp className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 text-xs font-medium text-neutral-600">No demand snapshots logged yet</p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Select a commodity and region above and click &quot;Run Demand Intelligence Agent&quot; to begin.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-3">Commodity</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Pressure</th>
                  <th className="py-2.5 px-3">Trend</th>
                  <th className="py-2.5 px-3">30d Vol</th>
                  <th className="py-2.5 px-3">Forecast</th>
                  <th className="py-2.5 px-3">B2B Vol</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {snapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-neutral-50/50 transition">
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">{snap.commodity}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{snap.state}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${getPressureBadge(
                          snap.demandPressureLevel
                        )}`}
                      >
                        {snap.demandPressureScore}/100
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${getDirectionBadge(
                          snap.forecastDirection
                        )}`}
                      >
                        {snap.forecastDirection.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-700">
                      {snap.consumerOrdersVolume.toLocaleString()} {snap.volumeUnit}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-700">
                      {snap.predictedDemandVolume.toLocaleString()} {snap.volumeUnit}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-700">
                      {snap.b2bDemandVolume.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">
                      {Math.round(snap.confidence * 100)}%
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-neutral-400">
                      {new Date(snap.calculatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Advisory Disclaimer */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-neutral-800">
          <Info className="h-4 w-4 text-neutral-500" />
          Decision-Support Infrastructure Notice
        </div>
        <p>
          The Demand Forecasting & Demand Intelligence Agent is an evidence-grounded decision support tool. It does NOT guarantee future sales, profits, or off-taker transactions. All procurement, planting, harvesting, and pricing decisions remain the sole responsibility of human operators.
        </p>
      </div>
    </div>
  );
}
