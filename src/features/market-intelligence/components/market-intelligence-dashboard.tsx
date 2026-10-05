"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldAlert,
  BarChart3,
  MapPin,
  Scale,
  Brain,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle2,
} from "lucide-react";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { MarketPressureSummary } from "../queries";
import { MarketIntelligenceRunResult } from "../types";
import { runMarketIntelligenceAction } from "../actions";

interface MarketIntelligenceDashboardProps {
  initialSnapshots: MarketPressureSummary[];
  userRole?: string;
}

export function MarketIntelligenceDashboard({
  initialSnapshots,
}: MarketIntelligenceDashboardProps) {
  const [commodity, setCommodity] = useState("Yellow Maize");
  const [selectedState, setSelectedState] = useState("Kano");
  const [comparisonState, setComparisonState] = useState("Lagos");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<MarketIntelligenceRunResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<MarketPressureSummary[]>(initialSnapshots);

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setActionError(null);
    try {
      const res = await runMarketIntelligenceAction(
        commodity,
        selectedState,
        comparisonState ? [comparisonState] : []
      );
      if (res.success && res.data) {
        setResult(res.data);
        // Prepend to local snapshots list if present
        const newSnap: MarketPressureSummary = {
          id: `snap-${Date.now()}`,
          commodity: res.data.commodity,
          state: res.data.state,
          pressureScore: res.data.snapshot.marketPressure.pressureScore,
          pressureLevel: res.data.snapshot.marketPressure.pressureLevel,
          pricePressure: res.data.snapshot.marketPressure.pricePressure,
          supplyPressure: res.data.snapshot.marketPressure.supplyPressure,
          demandPressure: res.data.snapshot.marketPressure.demandPressure,
          disruptionPressure: res.data.snapshot.marketPressure.disruptionPressure,
          confidence: res.data.snapshot.marketPressure.confidence,
          drivers: res.data.snapshot.marketPressure.drivers,
          risks: res.data.snapshot.marketPressure.risks,
          evidenceCount: res.data.snapshot.marketPressure.evidenceCount,
          calculatedAt: new Date().toISOString(),
        };
        setSnapshots((prev) => [newSnap, ...prev]);
      } else {
        setActionError(res.error || "Execution failed");
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Analysis request failed");
    } finally {
      setIsRunning(false);
    }
  };

  const getPressureBadge = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "ACUTE":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "ELEVATED":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "MODERATE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                Market Intelligence Agent
              </h1>
              <p className="text-xs text-neutral-600">
                Deterministic price, supply, and demand signals interpreted via controlled AI reasoning. Advisory only.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-300">
              Agent: Active (v2.3)
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 border border-neutral-300">
              Currency: NGN (₦)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Analysis Trigger Bar */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-600" />
            Query Market Intelligence
          </h2>
          <span className="text-xs text-neutral-400">Strictly empirical observations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Commodity
            </label>
            <input
              type="text"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              placeholder="e.g. Yellow Maize, Roma Tomatoes"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Primary State
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              {NIGERIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Comparison State (Regional Diff)
            </label>
            <select
              value={comparisonState}
              onChange={(e) => setComparisonState(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">None</option>
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
              className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Analyzing Market...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Run Intelligence Agent
                </>
              )}
            </button>
          </div>
        </div>

        {actionError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* 3. Analysis Results View (When active) */}
      {result && (
        <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900">
                  {result.commodity} in {result.state}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getPressureBadge(
                    result.snapshot.marketPressure.pressureLevel
                  )}`}
                >
                  Pressure: {result.snapshot.marketPressure.pressureLevel} (
                  {result.snapshot.marketPressure.pressureScore}/100)
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Evaluation status:{" "}
                <span className="font-medium text-neutral-700">{result.status}</span> •
                Evidence items:{" "}
                <span className="font-medium text-neutral-700">
                  {result.snapshot.evidenceCount}
                </span>{" "}
                • Confidence:{" "}
                <span className="font-medium text-neutral-700">
                  {Math.round(result.snapshot.marketPressure.confidence * 100)}%
                </span>
              </p>
            </div>
            <span className="text-xs text-neutral-400">
              {new Date(result.snapshot.generatedAt).toLocaleString()}
            </span>
          </div>

          {/* 4 Cards: Price, Supply, Demand, Disruptions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Price Movement */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <span className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                Wholesale Price
                <Scale className="h-3.5 w-3.5 text-neutral-400" />
              </span>
              <p className="text-lg font-bold text-neutral-900 mt-1">
                {result.snapshot.priceTrend.currentPrice !== null
                  ? `₦${result.snapshot.priceTrend.currentPrice.toLocaleString()}/${result.snapshot.priceTrend.unit}`
                  : "No price recorded"}
              </p>
              <div className="mt-2 text-xs flex items-center gap-1.5">
                {result.snapshot.priceTrend.percentageChange30d !== null ? (
                  result.snapshot.priceTrend.percentageChange30d >= 0 ? (
                    <span className="text-amber-700 font-medium flex items-center">
                      <TrendingUp className="h-3 w-3 mr-0.5" /> +
                      {result.snapshot.priceTrend.percentageChange30d}% (30d)
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium flex items-center">
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                      {result.snapshot.priceTrend.percentageChange30d}% (30d)
                    </span>
                  )
                ) : (
                  <span className="text-neutral-400">Insufficient 30d history</span>
                )}
              </div>
            </div>

            {/* Supply Condition */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <span className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                Supply Balance
                <Layers className="h-3.5 w-3.5 text-neutral-400" />
              </span>
              <p className="text-lg font-bold text-neutral-900 mt-1">
                {result.snapshot.supplyAnalysis.status}
              </p>
              <p className="text-xs text-neutral-500 mt-2">
                Available: {result.snapshot.supplyAnalysis.totalSupplyQuantity.toLocaleString()}{" "}
                {result.snapshot.supplyAnalysis.unit}
              </p>
            </div>

            {/* Demand Pressure */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <span className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                Demand Pressure
                <TrendingUp className="h-3.5 w-3.5 text-neutral-400" />
              </span>
              <p className="text-lg font-bold text-neutral-900 mt-1">
                {result.snapshot.demandAnalysis.status}
              </p>
              <p className="text-xs text-neutral-500 mt-2">
                B2B: {result.snapshot.demandAnalysis.b2bDemandVolume.toLocaleString()} units • Orders:{" "}
                {result.snapshot.demandAnalysis.completedOrdersCount}
              </p>
            </div>

            {/* Disruption Pressure */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <span className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                Disruption Factor
                <ShieldAlert className="h-3.5 w-3.5 text-neutral-400" />
              </span>
              <p className="text-lg font-bold text-neutral-900 mt-1">
                {result.snapshot.marketPressure.disruptionPressure}/100
              </p>
              <p className="text-xs text-neutral-500 mt-2">
                Logistics & corridor factors
              </p>
            </div>
          </div>

          {/* Regional Differential (if computed) */}
          {result.snapshot.regionalComparisons.length > 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 space-y-2">
              <h4 className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-700" /> Regional Price Comparison
              </h4>
              {result.snapshot.regionalComparisons.map((comp) => (
                <div key={comp.comparisonState} className="text-xs text-blue-800">
                  <div className="flex items-center justify-between font-medium">
                    <span>
                      {comp.baseState}: ₦{comp.basePriceNormalized.toLocaleString()} vs{" "}
                      {comp.comparisonState}: ₦{comp.comparisonPriceNormalized.toLocaleString()} per{" "}
                      {comp.unit}
                    </span>
                    <span className="font-bold">
                      {comp.percentageDifferential >= 0 ? "+" : ""}
                      {comp.percentageDifferential}%
                    </span>
                  </div>
                  <p className="text-xs text-blue-700/90 mt-1 italic">
                    {comp.calibratedObservation}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* AI Interpretation (Controlled & Grounded) */}
          {result.aiInterpretation ? (
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-700" /> AI Grounded Interpretation (Advisory)
                </h4>
                <span className="text-xs font-medium text-purple-700">
                  Self-assessed confidence:{" "}
                  {Math.round(result.aiInterpretation.modelConfidence * 100)}%
                </span>
              </div>
              <p className="text-xs text-neutral-800 leading-relaxed">
                {result.aiInterpretation.interpretation}
              </p>

              {result.aiInterpretation.keyFindings.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-purple-900">Key Findings:</span>
                  <ul className="list-disc list-inside text-xs text-neutral-700 space-y-0.5">
                    {result.aiInterpretation.keyFindings.map((finding, idx) => (
                      <li key={idx}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg bg-white p-3 border border-purple-100 mt-2">
                <span className="text-xs font-semibold text-neutral-800">
                  Uncertainty & Boundaries:
                </span>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {result.aiInterpretation.uncertainty}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600 flex items-center gap-2">
              <Info className="h-4 w-4 text-neutral-500 shrink-0" />
              <span>
                Deterministic market observations are available. AI reasoning was omitted or unavailable.
              </span>
            </div>
          )}

          {/* Advisory Recommendation Proposal */}
          {result.proposedRecommendation && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" /> Advisory Recommendation
                </h4>
                <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                  Status: {result.proposedRecommendation.status} (Requires Human Review)
                </span>
              </div>
              <p className="text-xs font-semibold text-neutral-900">
                {result.proposedRecommendation.title}
              </p>
              <p className="text-xs text-neutral-700 leading-relaxed">
                {result.proposedRecommendation.recommendation}
              </p>
              <p className="text-xs text-neutral-500 italic mt-1">
                Expected impact: {result.proposedRecommendation.expectedImpact.primaryMetric} (
                {result.proposedRecommendation.expectedImpact.estimatedChange}) over{" "}
                {result.proposedRecommendation.expectedImpact.timeframeDays} days.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. Recent Market Pressure Records Table */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-800">
              Recent Market Pressure Snapshots
            </h3>
            <p className="text-xs text-neutral-500">
              Historical deterministic index evaluations recorded by the Market Intelligence Agent
            </p>
          </div>
          <span className="text-xs font-medium text-neutral-400">
            {snapshots.length} snapshots recorded
          </span>
        </div>

        {snapshots.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">
            <BarChart3 className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
            <p className="font-medium text-neutral-700">No market pressure snapshots recorded yet</p>
            <p className="text-neutral-400 mt-1">
              Select a commodity and state above to execute an initial empirical evaluation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                  <th className="py-2.5 px-3">Commodity</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Pressure Level</th>
                  <th className="py-2.5 px-3">Composite Score</th>
                  <th className="py-2.5 px-3">Price / Supply / Demand</th>
                  <th className="py-2.5 px-3">Evidence</th>
                  <th className="py-2.5 px-3">Observed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {snapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">{snap.commodity}</td>
                    <td className="py-2.5 px-3">{snap.state}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${getPressureBadge(
                          snap.pressureLevel
                        )}`}
                      >
                        {snap.pressureLevel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-neutral-900">
                      {snap.pressureScore}/100
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      ₦ {snap.pricePressure} | S {snap.supplyPressure} | D {snap.demandPressure}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      {snap.evidenceCount} items ({Math.round(snap.confidence * 100)}%)
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400">
                      {new Date(snap.calculatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
