"use client";

/**
 * AgroMarket Phase 3.3: Intelligence Effectiveness Metrics Panel
 * Renders deterministic conversion rates, adoption percentages, and audit timings.
 * Enforces non-causal association terminology per governance guidelines.
 */

import React from "react";
import { BarChart2, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { IntelligenceEffectivenessMetrics } from "../types";

export interface EffectivenessMetricsPanelProps {
  metrics: IntelligenceEffectivenessMetrics;
}

export function EffectivenessMetricsPanel({ metrics }: EffectivenessMetricsPanelProps) {
  const formatPct = (val: number) => `${(val * 100).toFixed(1)}%`;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-emerald-700" />
            Intelligence-to-Action Effectiveness Analytics
          </h3>
          <p className="text-xs text-neutral-500">
            Governed conversion metrics measuring user adoption and workflow completion
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Deterministic Tracking
        </span>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-neutral-50/70 p-3">
          <span className="text-[11px] font-medium text-neutral-500">View Rate</span>
          <div className="mt-1 text-lg font-bold text-neutral-900">
            {formatPct(metrics.recommendationViewRate)}
          </div>
          <span className="text-[10px] text-neutral-400">
            {metrics.recommendationsViewed} of {metrics.totalRecommendationsGenerated} viewed
          </span>
        </div>

        <div className="rounded-lg border bg-neutral-50/70 p-3">
          <span className="text-[11px] font-medium text-neutral-500">Decision Rate</span>
          <div className="mt-1 text-lg font-bold text-neutral-900">
            {formatPct(metrics.decisionRate)}
          </div>
          <span className="text-[10px] text-neutral-400">
            {metrics.recommendationsDecided} explicit choices
          </span>
        </div>

        <div className="rounded-lg border bg-neutral-50/70 p-3">
          <span className="text-[11px] font-medium text-neutral-500">Action Initiation</span>
          <div className="mt-1 text-lg font-bold text-emerald-800">
            {formatPct(metrics.actionInitiationRate)}
          </div>
          <span className="text-[10px] text-neutral-400">
            {metrics.actionsInitiated} workflows started
          </span>
        </div>

        <div className="rounded-lg border bg-neutral-50/70 p-3">
          <span className="text-[11px] font-medium text-neutral-500">Action Completion</span>
          <div className="mt-1 text-lg font-bold text-emerald-700">
            {formatPct(metrics.actionCompletionRate)}
          </div>
          <span className="text-[10px] text-neutral-400">
            {metrics.actionsCompleted} completed actions
          </span>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
        <div className="rounded border border-neutral-100 p-2.5 bg-white">
          <span className="text-neutral-500 block">Conversion Rate</span>
          <span className="font-semibold text-neutral-800">
            {formatPct(metrics.recommendationToActionConversionRate)}
          </span>
        </div>

        <div className="rounded border border-neutral-100 p-2.5 bg-white">
          <span className="text-neutral-500 block">Action Success Rate</span>
          <span className="font-semibold text-neutral-800">
            {formatPct(metrics.actionSuccessRate)}
          </span>
        </div>

        <div className="rounded border border-neutral-100 p-2.5 bg-white">
          <span className="text-neutral-500 block">Dismissal Rate</span>
          <span className="font-semibold text-neutral-800">
            {formatPct(metrics.dismissalRate)}
          </span>
        </div>

        <div className="rounded border border-neutral-100 p-2.5 bg-white">
          <span className="text-neutral-500 block">Deferral Rate</span>
          <span className="font-semibold text-neutral-800">
            {formatPct(metrics.deferralRate)}
          </span>
        </div>
      </div>

      {/* Timing and Non-Causal Governance Notice */}
      <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 space-y-2 border border-neutral-200/80">
        <div className="flex items-center gap-2 font-medium text-neutral-700">
          <Clock className="h-3.5 w-3.5 text-neutral-500" />
          <span>Average Timing:</span>
          <span className="font-normal text-neutral-600">
            Decision: {metrics.avgMinutesToDecision}m • Workflow Action: {metrics.avgMinutesToAction}m
          </span>
        </div>

        <div className="flex items-start gap-2 pt-1 border-t border-neutral-200/70 text-[11px] text-neutral-500">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
          <span>
            <strong className="text-neutral-700">Governance Disclaimer: </strong>
            {metrics.governanceNote}
          </span>
        </div>
      </div>
    </div>
  );
}
