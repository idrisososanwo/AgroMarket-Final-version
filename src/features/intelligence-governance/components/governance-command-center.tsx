"use client";

import React, { useState } from "react";
import {
  GovernanceSummaryStats,
  GovernanceEvaluationResult,
  HumanApprovalRecord,
  GovernanceOverrideRecord,
} from "../types";
import { GovernanceAuditEntry } from "../audit";
import { MetricCard } from "@/components/ui/metric";
import { Tabs } from "@/components/ui/tabs";
import { ApprovalQueue } from "./approval-queue";
import { EvaluationsList } from "./evaluations-list";
import { AgentCapabilitiesView } from "./agent-capabilities-view";
import { PolicyViewer } from "./policy-viewer";
import { OverridesView } from "./overrides-view";
import { AuditTrailView } from "./audit-trail-view";
import {
  ShieldAlert,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Clock,
  Layers,
  Bot,
  FileText,
  Lock,
} from "lucide-react";

export interface GovernanceCommandCenterProps {
  stats: GovernanceSummaryStats;
  approvals: HumanApprovalRecord[];
  evaluations: GovernanceEvaluationResult[];
  overrides: GovernanceOverrideRecord[];
  auditEntries?: GovernanceAuditEntry[];
  currentUserRole?: string;
  initialTab?: string;
}

export function GovernanceCommandCenter({
  stats,
  approvals,
  evaluations,
  overrides,
  auditEntries = [],
  currentUserRole = "ADMIN",
  initialTab = "approvals",
}: GovernanceCommandCenterProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    {
      id: "approvals",
      label: "Approval Queue",
      badge: stats.pendingApprovals > 0 ? stats.pendingApprovals : undefined,
      icon: <FileCheck className="h-4 w-4" />,
    },
    {
      id: "evaluations",
      label: "Evaluations",
      badge: stats.totalEvaluations > 0 ? stats.totalEvaluations : undefined,
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: "agents",
      label: "Agent Matrix",
      icon: <Bot className="h-4 w-4" />,
    },
    {
      id: "policies",
      label: "Policy Engine",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      id: "overrides",
      label: "Overrides",
      badge: stats.recentOverrides > 0 ? stats.recentOverrides : undefined,
      icon: <Lock className="h-4 w-4" />,
    },
    {
      id: "audit",
      label: "Audit Ledger",
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="rounded-xl border border-[#E5E0D5] bg-[#FBF9F4] p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F4327] text-white shadow-xs">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-neutral-900">
                  AgroMarket Intelligence Governance Command Center
                </h1>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#0F4327] border border-[#BBF7D0]">
                  {stats.activePolicyVersion} ACTIVE
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                Deterministic policy gating, multi-domain oversight queues, and fail-closed human authorization controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Policy Status: Active & Operational</span>
          </div>
        </div>

        {/* Aggregate Governance Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <MetricCard
            label="Evals Today"
            value={stats.evaluationsToday}
            description="Total evaluated proposals today"
            variant="bordered"
            icon={<Layers className="h-4 w-4" />}
          />
          <MetricCard
            label="Pending Approvals"
            value={stats.pendingApprovals}
            description="Awaiting authorized reviewer action"
            variant="bordered"
            icon={<Clock className="h-4 w-4 text-amber-600" />}
          />
          <MetricCard
            label="Review Required"
            value={stats.evaluationsRequiringReview}
            description="Human, pro, or authority review"
            variant="bordered"
            icon={<AlertTriangle className="h-4 w-4 text-orange-600" />}
          />
          <MetricCard
            label="Blocked Actions"
            value={stats.blockedActions}
            description="Prohibited or high-risk denials"
            variant="bordered"
            icon={<ShieldAlert className="h-4 w-4 text-red-600" />}
          />
          <MetricCard
            label="Insufficient Data"
            value={stats.insufficientDataDecisions}
            description="Blocked due to evidence deficit"
            variant="bordered"
            icon={<AlertCircle className="h-4 w-4 text-neutral-500" />}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pills"
        className="bg-white border-[#E5E0D5]"
      />

      {/* Active Tab Panel */}
      <div className="mt-4">
        {activeTab === "approvals" && (
          <ApprovalQueue
            approvals={approvals}
            currentUserRole={currentUserRole}
          />
        )}

        {activeTab === "evaluations" && (
          <EvaluationsList evaluations={evaluations} />
        )}

        {activeTab === "agents" && (
          <AgentCapabilitiesView />
        )}

        {activeTab === "policies" && (
          <PolicyViewer />
        )}

        {activeTab === "overrides" && (
          <OverridesView overrides={overrides} />
        )}

        {activeTab === "audit" && (
          <AuditTrailView entries={auditEntries} />
        )}
      </div>
    </div>
  );
}

function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
