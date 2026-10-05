"use client";

import React, { useState } from "react";
import {
  Sprout,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle2,
  Factory,
  Brain,
} from "lucide-react";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { ProductionPlanningSummary } from "../queries";
import { ProductionPlanningRunResult } from "../types";
import { runProductionPlanningAction } from "../actions";

interface ProductionPlanningDashboardProps {
  initialSnapshots: ProductionPlanningSummary[];
}

export function ProductionPlanningDashboard({
  initialSnapshots,
}: ProductionPlanningDashboardProps) {
  const [commodity, setCommodity] = useState("Roma Tomatoes");
  const [selectedState, setSelectedState] = useState("Kano");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ProductionPlanningRunResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<ProductionPlanningSummary[]>(initialSnapshots);

  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setActionError(null);
    try {
      const res = await runProductionPlanningAction(commodity, selectedState);
      if (res.success && res.data) {
        setResult(res.data);
        const newSnap: ProductionPlanningSummary = {
          id: `snap-${Date.now()}`,
          commodity: res.data.commodity,
          state: res.data.state,
          domain: res.data.domain,
          opportunityScore: res.data.snapshot.opportunity.opportunityScore,
          riskScore: res.data.snapshot.risk.riskScore,
          opportunityLevel: res.data.snapshot.opportunity.opportunityLevel,
          riskLevel: res.data.snapshot.risk.riskLevel,
          marketDemandStatus: res.data.snapshot.marketContext.demandStatus,
          supplyBalanceStatus: res.data.snapshot.marketContext.supplyStatus,
          seasonalAlignment: res.data.snapshot.constraints.seasonalAlignment,
          inputConstraintLevel: res.data.snapshot.constraints.inputConstraintLevel,
          processingConstraintLevel: res.data.snapshot.constraints.processingConstraintLevel,
          confidence: res.data.snapshot.opportunity.confidence,
          opportunities: res.data.snapshot.opportunity.drivers,
          risks: res.data.snapshot.risk.riskDrivers,
          constraints: res.data.snapshot.risk.mitigations,
          evidenceCount: res.data.snapshot.evidenceCount,
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

  const getOpportunityBadge = (level: string) => {
    switch (level) {
      case "HIGH_OPPORTUNITY":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "ATTRACTIVE":
        return "bg-teal-100 text-teal-800 border-teal-300";
      case "MODERATE":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-300";
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "HIGH_RISK":
        return "bg-red-100 text-red-800 border-red-300";
      case "ELEVATED":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "MODERATE":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow">
              <Sprout className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                Production Planning & Farm Intelligence Agent
              </h1>
              <p className="text-xs text-neutral-600">
                Integrates production context, market intelligence, seasonality, and downstream constraints. Strictly advisory.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-300">
              Agent: Active (v2.4)
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 border border-neutral-300">
              Domains: Crops • Livestock • Poultry • Aquaculture
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Trigger Form */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-600" />
            Evaluate Production Planning
          </h2>
          <span className="text-xs text-neutral-400">Ground-truth agricultural & market evidence</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Commodity
            </label>
            <input
              type="text"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              placeholder="e.g. Roma Tomatoes, Broiler Chicken, Yellow Maize"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Production Region / State
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

          <div className="flex items-end">
            <button
              onClick={handleRunAnalysis}
              disabled={isRunning || !commodity.trim()}
              className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Evaluating Planning Context...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Run Production Agent
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

      {/* 3. Evaluation Result Display */}
      {result && (
        <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900">
                  {result.commodity} in {result.state} ({result.domain})
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getOpportunityBadge(
                    result.snapshot.opportunity.opportunityLevel
                  )}`}
                >
                  Opportunity: {result.snapshot.opportunity.opportunityLevel} (
                  {result.snapshot.opportunity.opportunityScore}/100)
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getRiskBadge(
                    result.snapshot.risk.riskLevel
                  )}`}
                >
                  Risk: {result.snapshot.risk.riskLevel} (
                  {result.snapshot.risk.riskScore}/100)
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
                  {Math.round(result.snapshot.opportunity.confidence * 100)}%
                </span>
              </p>
            </div>
            <span className="text-xs text-neutral-400">
              {new Date(result.snapshot.generatedAt).toLocaleString()}
            </span>
          </div>

          {/* Calibrated Notice */}
          <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-4 text-xs text-emerald-900">
            <p className="font-medium">{result.snapshot.opportunity.calibratedNotice}</p>
          </div>

          {/* 4 Feature Context Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Market Signal Context */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <span className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                Market Pressure
                <TrendingUp className="h-3.5 w-3.5 text-neutral-400" />
              </span>
              <p className="text-lg font-bold text-neutral-900 mt-1">
                {result.snapshot.marketContext.marketPressureLevel}
              </p>
              <p className="text-xs text-neutral-500 mt-2">
                Demand: {result.snapshot.marketContext.demandStatus} • Supply:{" "}
                {result.snapshot.marketContext.supplyStatus}
              </p>
            </div>

            {/* Production Units & Capacity */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <span className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                Production Context
                <Layers className="h-3.5 w-3.5 text-neutral-400" />
              </span>
              <p className="text-lg font-bold text-neutral-900 mt-1">
                {result.snapshot.productionContext.activeProductionUnitsCount} Units
              </p>
              <p className="text-xs text-neutral-500 mt-2">
                Available harvest:{" "}
                {result.snapshot.productionContext.availableHarvestQuantity.toLocaleString()}{" "}
                {result.snapshot.productionContext.harvestUnit}
              </p>
            </div>

            {/* Seasonality */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <span className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                Seasonal Window
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              </span>
              <p className="text-lg font-bold text-neutral-900 mt-1">
                {result.snapshot.constraints.seasonalAlignment.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-neutral-500 mt-2 line-clamp-1">
                {result.snapshot.constraints.seasonalRationale || "Standard cycle"}
              </p>
            </div>

            {/* Processing & Equipment Constraints */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <span className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                Processing Capacity
                <Factory className="h-3.5 w-3.5 text-neutral-400" />
              </span>
              <p className="text-lg font-bold text-neutral-900 mt-1">
                {result.snapshot.constraints.processingConstraintLevel}
              </p>
              <p className="text-xs text-neutral-500 mt-2">
                {result.snapshot.constraints.processingFacilityCount} facilities registered
              </p>
            </div>
          </div>

          {/* AI Grounded Interpretation */}
          {result.aiInterpretation ? (
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-700" /> AI Grounded Production Interpretation
                </h4>
                <span className="text-xs font-medium text-purple-700">
                  Confidence: {Math.round(result.aiInterpretation.modelConfidence * 100)}%
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
                Deterministic production calculations completed. AI interpretation omitted or unavailable.
              </span>
            </div>
          )}

          {/* Advisory Recommendation Proposal */}
          {result.proposedRecommendation && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" /> Advisory Production Recommendation
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

      {/* 4. Recent Production Planning Records Table */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-800">
              Recent Production Planning Evaluations
            </h3>
            <p className="text-xs text-neutral-500">
              Historical deterministic opportunity & risk scores evaluated by the Production Planning Agent
            </p>
          </div>
          <span className="text-xs font-medium text-neutral-400">
            {snapshots.length} evaluations recorded
          </span>
        </div>

        {snapshots.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">
            <Sprout className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
            <p className="font-medium text-neutral-700">No production planning evaluations recorded yet</p>
            <p className="text-neutral-400 mt-1">
              Select a commodity and state above to run an initial empirical evaluation.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-600 font-semibold">
                  <th className="py-2.5 px-3">Commodity</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Domain</th>
                  <th className="py-2.5 px-3">Opportunity</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">Seasonality</th>
                  <th className="py-2.5 px-3">Downstream Constraints</th>
                  <th className="py-2.5 px-3">Calculated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {snapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">{snap.commodity}</td>
                    <td className="py-2.5 px-3">{snap.state}</td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-700">
                        {snap.domain}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${getOpportunityBadge(
                          snap.opportunityLevel
                        )}`}
                      >
                        {snap.opportunityLevel} ({snap.opportunityScore}/100)
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${getRiskBadge(
                          snap.riskLevel
                        )}`}
                      >
                        {snap.riskLevel} ({snap.riskScore}/100)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      {snap.seasonalAlignment.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-500">
                      Proc: {snap.processingConstraintLevel} • Input: {snap.inputConstraintLevel}
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
