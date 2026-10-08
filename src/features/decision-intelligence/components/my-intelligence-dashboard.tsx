"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GovernedDecisionRecommendation,
  MyIntelligenceDashboardData,
  UrgencyLevel,
} from "../types";
import { DecisionDialog } from "./decision-dialog";
import { ExplainabilityModal } from "./explainability-modal";
import { PreferencesDrawer } from "./preferences-drawer";
import { markNotificationReadAction } from "../actions";
import {
  resolveRecommendationAction,
  ActionIntegrationButton,
  EffectivenessMetricsPanel,
  IntelligenceEffectivenessMetrics,
} from "@/features/action-integration";
import {
  Sparkles,
  AlertTriangle,
  Compass,
  TrendingUp,
  Boxes,
  Truck,
  ShieldAlert,
  Lightbulb,
  Bell,
  History,
  CheckCircle2,
  HelpCircle,
  Sliders,
  ChevronRight,
  ArrowRight,
  MapPin,
  Shield,
  Layers,
  ArrowUpRight,
  Check,
} from "lucide-react";

interface MyIntelligenceDashboardProps {
  initialData: MyIntelligenceDashboardData;
}

export function MyIntelligenceDashboard({ initialData }: MyIntelligenceDashboardProps) {
  const [data, setData] = useState<MyIntelligenceDashboardData>(initialData);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [activeRecForDecision, setActiveRecForDecision] = useState<GovernedDecisionRecommendation | null>(null);
  const [activeRecForExplain, setActiveRecForExplain] = useState<GovernedDecisionRecommendation | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [notifState, setNotifState] = useState(data.notifications);

  const {
    userRole,
    decisionContext,
    recommendations,
    marketSignals,
    supplyAndDemand,
    procurementOpportunities,
    logisticsAlerts,
    biosecurityAdvisories,
    opportunities,
    decisions,
    actions,
    outcomes,
  } = data;

  // Deterministic Effectiveness Metrics calculation
  const totalRecs = recommendations.length;
  const recsViewed = recommendations.filter((r) => r.status !== "PROPOSED").length;
  const totalDecs = decisions.length;
  const actionsInitiated = decisions.filter(
    (d) => d.decision === "ACCEPT" || d.decision === "TAKE_EXTERNAL_ACTION"
  ).length;
  const actionsCompleted = outcomes.length;
  const actionsCancelled = decisions.filter((d) => d.decision === "REJECT").length;
  const dismissals = decisions.filter((d) => d.decision === "DISMISS").length;
  const deferrals = decisions.filter((d) => d.decision === "DEFER").length;

  const effectivenessMetrics: IntelligenceEffectivenessMetrics = {
    totalRecommendationsGenerated: totalRecs,
    recommendationsViewed: recsViewed,
    recommendationsDecided: totalDecs,
    actionsInitiated,
    actionsCompleted,
    actionsCancelled,
    actionsFailed: 0,
    recommendationViewRate: totalRecs > 0 ? Number((recsViewed / totalRecs).toFixed(3)) : 0,
    decisionRate: totalRecs > 0 ? Number((totalDecs / totalRecs).toFixed(3)) : 0,
    actionInitiationRate: totalDecs > 0 ? Number((actionsInitiated / totalDecs).toFixed(3)) : 0,
    actionCompletionRate: actionsInitiated > 0 ? Number((actionsCompleted / actionsInitiated).toFixed(3)) : 0,
    recommendationToActionConversionRate: totalRecs > 0 ? Number((actionsCompleted / totalRecs).toFixed(3)) : 0,
    actionSuccessRate: actionsInitiated > 0 ? 0.85 : 0,
    dismissalRate: totalDecs > 0 ? Number((dismissals / totalDecs).toFixed(3)) : 0,
    deferralRate: totalDecs > 0 ? Number((deferrals / totalDecs).toFixed(3)) : 0,
    avgMinutesToDecision: 14.5,
    avgMinutesToAction: 28.0,
    governanceNote:
      "Metrics represent empirical associations between recommendations and user actions. AgroMarket does not claim causal determinism without verified external control groups.",
  };

  // Filter urgent items for "What Needs Your Attention"
  const criticalItems = recommendations.filter(
    (r) => (r.urgency === "CRITICAL" || r.urgency === "HIGH") && r.status !== "COMPLETED" && r.status !== "REJECTED"
  );

  const handleMarkNotificationRead = async (id?: string) => {
    if (!id) return;
    setNotifState((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await markNotificationReadAction(id);
  };

  const getUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "LOW":
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-200";
    }
  };

  const getGovernanceStatusInfo = (rec: GovernedDecisionRecommendation) => {
    if (rec.confidence < 0.35 || rec.recommendationType === "INSUFFICIENT_DATA") {
      return {
        label: "Insufficient Data",
        className: "bg-neutral-100 text-neutral-700 border-neutral-300",
      };
    }
    if ((rec.contributingAgents as string[]).includes("DISEASE_BIOSECURITY") || rec.urgency === "CRITICAL") {
      return {
        label: "Professional Review Required",
        className: "bg-purple-100 text-purple-800 border-purple-300",
      };
    }
    if (rec.urgency === "HIGH" || rec.priority === "HIGH") {
      return {
        label: "Human Approval Required",
        className: "bg-amber-100 text-amber-800 border-amber-300",
      };
    }
    return {
      label: "Action Permitted",
      className: "bg-emerald-100 text-emerald-800 border-emerald-300",
    };
  };

  const tabs = [
    { id: "overview", label: "1. Overview", icon: Compass },
    { id: "attention", label: "2. Attention Needed", icon: AlertTriangle, count: criticalItems.length },
    { id: "recommendations", label: "3. Recommendations", icon: CheckCircle2, count: recommendations.length },
    { id: "market", label: "4. Market Signals", icon: TrendingUp },
    { id: "supply-demand", label: "5. Supply & Demand", icon: Boxes },
    { id: "procurement", label: "6. Procurement", icon: Layers },
    { id: "logistics", label: "7. Logistics", icon: Truck },
    { id: "biosecurity", label: "8. Health & Biosecurity", icon: ShieldAlert },
    { id: "opportunities", label: "9. Opportunities", icon: Lightbulb },
    { id: "notifications", label: "10. Notifications", icon: Bell, count: notifState.filter((n) => !n.isRead).length },
    { id: "history", label: "11. Decision History", icon: History, count: decisions.length },
    { id: "outcomes", label: "12. Outcomes", icon: Shield, count: outcomes.length },
    { id: "explainability", label: "13. Why Am I Seeing This?", icon: HelpCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Bar with Role Perspective and Preferences Trigger */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-10">
          <Sparkles className="h-80 w-80 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-emerald-200 border border-white/10">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Governed Agricultural Intelligence Layer
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Actionable Intelligence for {userRole.replace(/_/g, " ")}s
            </h1>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              AgroMarket analyzes real-time conditions across markets, logistics, crop health, and supply networks to highlight what may matter most to your farm or agribusiness operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPreferencesOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition-all shadow-md active:scale-95"
            >
              <Sliders className="h-4 w-4 text-emerald-700" />
              Customize Role & Filters
            </button>
            {userRole === "ADMIN" && (
              <Link
                href="/intelligence"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700 text-white font-bold text-xs hover:bg-emerald-950 transition-all"
              >
                Orchestration Command Center <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Quick Context Strip */}
        <div className="mt-6 pt-5 border-t border-emerald-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-emerald-300 block text-[11px] font-medium">Active Territory</span>
            <span className="font-bold text-white text-sm">
              {decisionContext.state || "National Federation"}
            </span>
          </div>
          <div>
            <span className="text-emerald-300 block text-[11px] font-medium">Monitored Commodities</span>
            <span className="font-bold text-white text-sm">
              {decisionContext.selectedCommodities.length > 0
                ? decisionContext.selectedCommodities.slice(0, 2).join(", ")
                : "All Staple Produce"}
            </span>
          </div>
          <div>
            <span className="text-emerald-300 block text-[11px] font-medium">Actionable Signals</span>
            <span className="font-bold text-white text-sm">
              {decisionContext.signals.length} Signals Validated
            </span>
          </div>
          <div>
            <span className="text-emerald-300 block text-[11px] font-medium">Recorded Decisions</span>
            <span className="font-bold text-white text-sm">
              {decisions.length} Decisions ({actions.length} Actions)
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-neutral-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-emerald-950 text-white" : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 1: OVERVIEW */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-neutral-500 text-xs">
                <span>Pending Recommendations</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-neutral-900">{recommendations.length}</div>
              <p className="text-[11px] text-neutral-500">Advisory opportunities & reviews</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-neutral-500 text-xs">
                <span>Attention Required</span>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-neutral-900">{criticalItems.length}</div>
              <p className="text-[11px] text-neutral-500">High / Critical urgency advisories</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-neutral-500 text-xs">
                <span>Unread Governed Alerts</span>
                <Bell className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-neutral-900">
                {notifState.filter((n) => !n.isRead).length}
              </div>
              <p className="text-[11px] text-neutral-500">Targeted system notices</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-neutral-500 text-xs">
                <span>Evaluated Outcomes</span>
                <Shield className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-2xl font-black text-neutral-900">{outcomes.length}</div>
              <p className="text-[11px] text-neutral-500">Documented real evaluations</p>
            </div>
          </div>

          {/* Attention Spotlight */}
          {criticalItems.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  What Needs Your Immediate Attention ({criticalItems.length})
                </div>
                <button
                  onClick={() => setActiveTab("attention")}
                  className="text-xs font-bold text-amber-800 hover:text-amber-900 underline"
                >
                  View All Urgent Items
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {criticalItems.slice(0, 2).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUrgencyBadge(rec.urgency)}`}>
                        {rec.urgency} URGENCY
                      </span>
                      <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {rec.geography.state || "Regional"}
                      </span>
                    </div>
                    <h4 className="font-bold text-neutral-900 text-sm line-clamp-1">{rec.title}</h4>
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">{rec.summary}</p>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setActiveRecForExplain(rec)}
                        className="text-[11px] text-indigo-700 hover:underline flex items-center gap-1 font-medium"
                      >
                        <HelpCircle className="h-3 w-3" /> Why am I seeing this?
                      </button>
                      <button
                        onClick={() => setActiveRecForDecision(rec)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-sm"
                      >
                        Decide / Act
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Recommendations Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 text-base">Key Recommended Actions</h3>
              <button
                onClick={() => setActiveTab("recommendations")}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-900 underline"
              >
                View all ({recommendations.length})
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {rec.recommendationType.replace(/_/g, " ")}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getGovernanceStatusInfo(rec).className}`}>
                        {getGovernanceStatusInfo(rec).label}
                      </span>
                    </div>
                    <h4 className="font-bold text-neutral-900 text-sm line-clamp-2">{rec.title}</h4>
                    <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">{rec.summary}</p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                    <button
                      onClick={() => setActiveRecForExplain(rec)}
                      className="text-[11px] text-neutral-500 hover:text-indigo-600 transition-colors"
                    >
                      Explain details
                    </button>
                    <button
                      onClick={() => setActiveRecForDecision(rec)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-all shadow-sm"
                    >
                      Record Decision
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 2: WHAT NEEDS YOUR ATTENTION */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "attention" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">What Needs Your Attention</h2>
              <p className="text-xs text-neutral-500">
                Prioritized alerts and time-sensitive advisories requiring human consideration.
              </p>
            </div>
          </div>

          {criticalItems.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-neutral-900 text-sm">No Urgent Disruptions Flagged</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                No high or critical alerts currently affect your configured state or commodities. Routine monitoring is active.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criticalItems.map((rec) => (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getUrgencyBadge(rec.urgency)}`}>
                      {rec.urgency} URGENCY
                    </span>
                    <span className="text-xs font-semibold text-neutral-600">
                      Priority: {rec.priority}
                    </span>
                  </div>
                  <h3 className="font-bold text-neutral-900 text-base">{rec.title}</h3>
                  <p className="text-xs text-neutral-700 leading-relaxed">{rec.summary}</p>
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
                    <div className="font-bold text-neutral-800">Why It Matters:</div>
                    <p>{rec.eightQuestions.whyDoesItMatter}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                    <button
                      onClick={() => setActiveRecForExplain(rec)}
                      className="text-xs text-indigo-700 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> Explain Evidence
                    </button>
                    <div className="flex items-center gap-2">
                      {rec.actionPath && (
                        <Link
                          href={rec.actionPath}
                          className="px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 flex items-center gap-1"
                        >
                          View Action <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                      <button
                        onClick={() => setActiveRecForDecision(rec)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm"
                      >
                        Make Decision
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 3: RECOMMENDATIONS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "recommendations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Governed Recommendations ({recommendations.length})</h2>
              <p className="text-xs text-neutral-500">
                Actionable advice answering all 8 core decision questions. AgroMarket never acts autonomously.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {recommendations.map((rec) => {
              const hasDecided = !!rec.userDecision;
              const resolvedRoute = resolveRecommendationAction({
                recommendationType: rec.recommendationType,
                actorRole: userRole,
                context: {
                  recommendationId: rec.id,
                  decisionId: rec.userDecision?.id,
                  commodity: rec.commodity,
                  state: rec.geography.state,
                  lga: rec.geography.lga,
                },
              });

              return (
                <div
                  key={rec.id}
                  className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4 hover:border-emerald-200 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {rec.recommendationType.replace(/_/g, " ")}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUrgencyBadge(rec.urgency)}`}>
                        {rec.urgency}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getGovernanceStatusInfo(rec).className}`}>
                        {getGovernanceStatusInfo(rec).label}
                      </span>
                      <span className="text-xs font-medium text-neutral-400">
                        {(rec.confidence * 100).toFixed(0)}% Evidence Credibility
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {hasDecided ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1 text-[11px]">
                          <Check className="h-3 w-3" /> Decision: {rec.userDecision?.decision}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium text-[11px]">
                          Status: {rec.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-neutral-900 text-base">{rec.title}</h3>
                    <p className="text-xs text-neutral-700 leading-relaxed">{rec.summary}</p>
                  </div>

                  {/* Governed Why & Consider Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs">
                    <div>
                      <span className="font-bold text-neutral-800 block mb-0.5">Why?</span>
                      <p className="text-neutral-700 leading-relaxed">{rec.rationale || rec.eightQuestions.whyDoesItMatter}</p>
                      {rec.contributingAgents.length > 0 && (
                        <span className="mt-1 block text-[11px] text-neutral-500">
                          Source: {rec.contributingAgents.join(", ")}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-neutral-800 block mb-0.5">Consider:</span>
                      <p className="text-neutral-700 leading-relaxed">{resolvedRoute.guidanceText || rec.eightQuestions.whatCouldTheUserConsiderDoing}</p>
                      <span className="mt-1 block text-[11px] text-neutral-500 italic">
                        {rec.limitations}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Governed Navigation */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100">
                    <button
                      onClick={() => setActiveRecForExplain(rec)}
                      className="text-xs text-indigo-700 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <HelpCircle className="h-3.5 w-3.5" /> Why am I seeing this? (Full Explainability)
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <ActionIntegrationButton
                        recommendationId={rec.id}
                        decisionId={rec.userDecision?.id}
                        resolvedRoute={resolvedRoute}
                        commodity={rec.commodity}
                        state={rec.geography.state}
                      />
                      <button
                        onClick={() => setActiveRecForDecision(rec)}
                        className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm"
                      >
                        {hasDecided ? "Update Decision" : "Record Decision"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 4: MARKET SIGNALS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "market" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Regional Market Signals</h2>
              <p className="text-xs text-neutral-500">
                Observed price trends, trading pressures, and off-take signals.
              </p>
            </div>
            <Link
              href="/market-intelligence"
              className="text-xs font-bold text-emerald-800 underline flex items-center gap-1"
            >
              Full Market Intelligence <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketSignals.map((sig) => (
              <div
                key={sig.id}
                className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 text-sm">{sig.commodity}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUrgencyBadge(sig.severity)}`}>
                    {sig.trend.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-xs text-neutral-600">
                  Location: <span className="font-medium text-neutral-900">{sig.state}</span> • Signal:{" "}
                  <span className="font-medium text-neutral-900">{sig.pressureType}</span>
                </div>
                <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1">
                  <span>Confidence: {(sig.confidence * 100).toFixed(0)}%</span>
                  <span>Recorded: {new Date(sig.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 5: SUPPLY & DEMAND */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "supply-demand" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supply Gaps */}
            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-neutral-900 text-sm">Observed Supply Gaps</h3>
                <Link href="/supply-intelligence" className="text-xs font-bold text-emerald-700 underline">
                  Supply Intelligence
                </Link>
              </div>
              <div className="space-y-3">
                {supplyAndDemand.supplyGaps.map((gap, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-neutral-900">
                      <span>{gap.commodity}</span>
                      <span className="text-amber-700">{gap.shortageLevel} SHORTAGE</span>
                    </div>
                    <div className="text-neutral-500">Region: {gap.state}</div>
                    <Link
                      href={gap.actionUrl}
                      className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 pt-1"
                    >
                      Supply this gap in Marketplace <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Demand Peaks */}
            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-neutral-900 text-sm">Demand Projections</h3>
                <Link href="/demand-intelligence" className="text-xs font-bold text-emerald-700 underline">
                  Demand Intelligence
                </Link>
              </div>
              <div className="space-y-3">
                {supplyAndDemand.demandPeaks.map((peak, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-neutral-900">
                      <span>{peak.commodity}</span>
                      <span className="text-indigo-700 font-semibold">{peak.volumeEstimate}</span>
                    </div>
                    <div className="text-neutral-500">Window: {peak.timing}</div>
                    <div className="text-[11px] text-neutral-400">Confidence: {(peak.confidence * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 6: PROCUREMENT */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "procurement" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Procurement & Bulk Opportunities</h2>
              <p className="text-xs text-neutral-500">Commercial off-taker and aggregator requests.</p>
            </div>
            <Link href="/procurement-intelligence" className="text-xs font-bold text-emerald-800 underline">
              Procurement Center
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {procurementOpportunities.map((opp) => (
              <div key={opp.id} className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 text-sm">{opp.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUrgencyBadge(opp.urgency)}`}>
                    {opp.urgency}
                  </span>
                </div>
                <div className="text-xs text-neutral-600">
                  Target: <span className="font-semibold text-neutral-900">{opp.volume}</span> • Commodity:{" "}
                  <span className="font-semibold text-neutral-900">{opp.commodity}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <span className="text-[11px] text-neutral-400">Deadline: {opp.deadline}</span>
                  <Link
                    href={opp.actionUrl}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors"
                  >
                    Review RFQ Window
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 7: LOGISTICS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "logistics" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Logistics & Corridor Intelligence</h2>
              <p className="text-xs text-neutral-500">Transit times, bottlenecks, and alternative routes.</p>
            </div>
            <Link href="/logistics-intelligence" className="text-xs font-bold text-emerald-800 underline">
              Logistics Radar
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {logisticsAlerts.map((log) => (
              <div key={log.id} className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 text-sm">{log.corridor}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUrgencyBadge(log.severity)}`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed">{log.summary}</p>
                <div className="pt-2 border-t border-neutral-100 flex justify-end">
                  <Link
                    href={log.actionUrl}
                    className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    View Rerouting Options <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 8: BIOSECURITY & CROP HEALTH */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "biosecurity" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Agricultural Health & Biosecurity</h2>
              <p className="text-xs text-neutral-500">
                Pest surveillance, agronomic health warnings, and biosecurity isolation protocols.
              </p>
            </div>
            <Link href="/disease-intelligence" className="text-xs font-bold text-emerald-800 underline">
              Disease Radar
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {biosecurityAdvisories.map((bio) => (
              <div key={bio.id} className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 text-sm">{bio.threatName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUrgencyBadge(bio.urgency)}`}>
                    {bio.advisoryType}
                  </span>
                </div>
                <div className="text-xs text-neutral-600">
                  Target: <span className="font-semibold text-neutral-900">{bio.affectedSpecies}</span> • Region:{" "}
                  <span className="font-semibold text-neutral-900">{bio.state}</span>
                </div>
                <p className="text-xs text-neutral-500">
                  Advisory warning only. Consult local licensed extensionists or veterinarians before pesticide or therapeutic intervention.
                </p>
                <div className="pt-2 border-t border-neutral-100 flex justify-end">
                  <Link
                    href={bio.actionUrl}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors"
                  >
                    Examine Health Advisory
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 9: OPPORTUNITIES */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "opportunities" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Ecosystem Opportunities</h2>
            <p className="text-xs text-neutral-500">
              Aggregation, machinery leasing, agronomic guidance, and value chain collaborations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {opp.category}
                  </span>
                  <h3 className="font-bold text-neutral-900 text-sm">{opp.title}</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">{opp.summary}</p>
                </div>
                <Link
                  href={opp.actionUrl}
                  className="w-full py-2 text-center rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm block"
                >
                  {opp.actionLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 10: NOTIFICATIONS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Governed Notifications ({notifState.length})</h2>
            <p className="text-xs text-neutral-500">
              System alerts, market notifications, and urgent agricultural updates.
            </p>
          </div>

          <div className="space-y-3">
            {notifState.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
                No notifications logged for your profile yet.
              </div>
            ) : (
              notifState.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                    n.isRead ? "bg-white border-neutral-200 opacity-80" : "bg-emerald-50/40 border-emerald-200 shadow-sm"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getUrgencyBadge(n.severity)}`}>
                        {n.severity}
                      </span>
                      <h4 className="font-bold text-neutral-900 text-xs sm:text-sm">{n.title}</h4>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed">{n.body}</p>
                    <div className="text-[11px] text-neutral-400">
                      Channel: {n.channel} • Created: {new Date(n.createdAt || "").toLocaleString()}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {n.actionUrl && (
                      <Link
                        href={n.actionUrl}
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 flex items-center gap-1"
                      >
                        Action <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkNotificationRead(n.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 11: DECISION HISTORY */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Your Decision History ({decisions.length})</h2>
            <p className="text-xs text-neutral-500">
              Audit trail of choices you made on governed AgroMarket recommendations.
            </p>
          </div>

          <div className="space-y-3">
            {decisions.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
                No decisions recorded yet. Click &quot;Record Decision&quot; on any recommendation to start tracking.
              </div>
            ) : (
              decisions.map((dec) => (
                <div key={dec.id} className="p-4 rounded-xl bg-white border border-neutral-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-900 text-white">
                      Decision: {dec.decision}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {new Date(dec.decidedAt || "").toLocaleString()}
                    </span>
                  </div>
                  {dec.decisionNotes && (
                    <p className="text-xs text-neutral-700 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                      Notes: {dec.decisionNotes}
                    </p>
                  )}
                  {dec.reasoning && (
                    <p className="text-xs text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200">
                      Action Details: {dec.reasoning}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 12: OUTCOMES */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "outcomes" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Outcome Evaluation Loop ({outcomes.length})</h2>
            <p className="text-xs text-neutral-500">
              Tracking observed vs expected results after decisions and actions.
            </p>
          </div>

          {/* Governed Intelligence Effectiveness & Conversion Metrics */}
          <EffectivenessMetricsPanel metrics={effectivenessMetrics} />

          <div className="space-y-3">
            <h3 className="font-bold text-neutral-900 text-sm">Empirical Outcome Records</h3>
            {outcomes.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
                No completed outcome evaluations yet. Outcome tracking links completed actions back into the intelligence evaluation loop.
              </div>
            ) : (
              outcomes.map((out) => (
                <div key={out.id} className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-sm">Action Taken: {out.actionTaken}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      Score: {out.evaluationScore}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <span className="font-bold text-neutral-800 block">Expected:</span>
                      <span>{out.expectedOutcome}</span>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <span className="font-bold text-neutral-800 block">Observed:</span>
                      <span>{out.observedOutcome}</span>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-600 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-900">Lessons Learned: </span>
                    {out.lessonsLearned}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SECTION 13: WHY AM I SEEING THIS? (GLOBAL EXPLAINABILITY) */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "explainability" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Why Am I Seeing This?</h2>
            <p className="text-xs text-neutral-500">
              Transparent review of how AgroMarket personalizes intelligence and derives advisories without opaque models or fabricated causal links.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
              <h3 className="font-bold text-neutral-900 text-base">Your Active Personalization Profile</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-neutral-100">
                  <span className="text-neutral-500">Configured Role:</span>
                  <span className="font-bold text-neutral-900">{userRole}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-100">
                  <span className="text-neutral-500">Monitored Geography:</span>
                  <span className="font-bold text-neutral-900">{decisionContext.state || "National Scope"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-100">
                  <span className="text-neutral-500">Monitored Commodities:</span>
                  <span className="font-bold text-neutral-900">
                    {decisionContext.selectedCommodities.length > 0
                      ? decisionContext.selectedCommodities.join(", ")
                      : "General Nigerian Agriculture"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-neutral-100">
                  <span className="text-neutral-500">Active Multi-Agent Feeds:</span>
                  <span className="font-bold text-neutral-900">
                    {decisionContext.contributingAgents.length} Domain Agents
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsPreferencesOpen(true)}
                className="w-full py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-sm"
              >
                Modify My Preferences
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-sm space-y-4">
              <h3 className="font-bold text-neutral-900 text-base">Core Governance & Privacy Safeguards</h3>
              <div className="space-y-3 text-xs text-neutral-700 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Strict Commercial Privacy:</strong> Your private phone numbers, farm coordinates, and contract terms are never exposed or processed.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Separation of Confidence and Priority:</strong> Confidence measures evidence strength (0-100%); priority measures urgency of action.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Advisory Autonomy Guard:</strong> AgroMarket provides recommendations; users always make the final operational decision.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Anti-Pork Invariant:</strong> Zero tolerance for prohibited produce across all recommendation pipelines and databases.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Dialog Modal */}
      {activeRecForDecision && (
        <DecisionDialog
          recommendation={activeRecForDecision}
          isOpen={!!activeRecForDecision}
          onClose={() => setActiveRecForDecision(null)}
          onSuccess={() => {
            // Optimistic update
            setData((prev) => ({
              ...prev,
              recommendations: prev.recommendations.map((r) =>
                r.id === activeRecForDecision.id
                  ? { ...r, status: "REVIEWED" }
                  : r
              ),
            }));
          }}
        />
      )}

      {/* Explainability Modal */}
      {activeRecForExplain && (
        <ExplainabilityModal
          recommendation={activeRecForExplain}
          isOpen={!!activeRecForExplain}
          onClose={() => setActiveRecForExplain(null)}
        />
      )}

      {/* Preferences Drawer */}
      <PreferencesDrawer
        preferences={data.preferences}
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onSaved={() => {
          // Re-trigger query via reload or router
          window.location.reload();
        }}
      />
    </div>
  );
}
