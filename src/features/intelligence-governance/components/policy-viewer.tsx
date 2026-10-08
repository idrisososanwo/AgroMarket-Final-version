"use client";

import React, { useState } from "react";
import { CURRENT_GOVERNANCE_POLICY_VERSION, GOVERNANCE_DISCLAIMERS } from "../constants";
import { RiskLevelBadge } from "./risk-level-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ShieldCheck,
  Lock,
  FileText,
  Ban,
  Layers,
} from "lucide-react";

export function PolicyViewer() {
  const [selectedVersion, setSelectedVersion] = useState<string>(CURRENT_GOVERNANCE_POLICY_VERSION);

  const policyVersions = [
    {
      version: "v1.0.0",
      effectiveDate: "2026-10-08",
      status: "ACTIVE",
      description: "Autonomous intelligence guardrails, human oversight policy execution, zero-pork invariants, and deterministic action gating.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Policy Overview Header */}
      <div className="p-5 rounded-xl border border-[#E5E0D5] bg-[#FBF9F4] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F4327] text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-900">
                Codified Governance Policy Engine
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-[#0F4327] font-bold">
                {CURRENT_GOVERNANCE_POLICY_VERSION} ACTIVE
              </span>
            </div>
            <p className="text-xs text-neutral-600 mt-0.5">
              Deterministic, fail-closed policy specifications governing all intelligence proposals, human reviews, and action gates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500">Inspection Version:</span>
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="rounded-lg border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-neutral-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
            aria-label="Select policy version"
          >
            {policyVersions.map((pv) => (
              <option key={pv.version} value={pv.version}>
                {pv.version} ({pv.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Read-Only Notice */}
      <div className="p-3.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs text-neutral-600 flex items-center gap-2">
        <Lock className="h-4 w-4 text-neutral-500 shrink-0" />
        <span>
          Policy configurations are immutable and enforced directly by deterministic server code. Changes require version-controlled deployment.
        </span>
      </div>

      {/* Policy Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Classification Matrix */}
        <Card className="border-[#E5E0D5] shadow-sm">
          <CardHeader className="border-b border-[#E5E0D5] pb-3">
            <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#0F4327]" />
              Risk Classification Tiers & Review Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="p-3 rounded-lg border border-neutral-200 bg-white">
              <div className="flex items-center justify-between mb-1">
                <RiskLevelBadge level="LOW" size="sm" />
                <span className="text-[11px] font-semibold text-neutral-600">Autonomy: RECOMMEND</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Informational price trends, seasonal calendars, crop profiles. Action permitted with contextual user confirmation.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-amber-200 bg-white">
              <div className="flex items-center justify-between mb-1">
                <RiskLevelBadge level="MODERATE" size="sm" />
                <span className="text-[11px] font-semibold text-neutral-600">Autonomy: OPERATOR_REVIEW</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Production scheduling, harvest adjustments, buyer-supplier matching. Requires operator explicit confirmation.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-orange-200 bg-white">
              <div className="flex items-center justify-between mb-1">
                <RiskLevelBadge level="HIGH" size="sm" />
                <span className="text-[11px] font-semibold text-neutral-600">Autonomy: HUMAN_APPROVAL</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Supply chain shifts, procurement reallocations, food security stress alerts. Requires affirmative human approval with min. 2 evidence signals.
              </p>
            </div>

            <div className="p-3 rounded-lg border border-red-200 bg-white">
              <div className="flex items-center justify-between mb-1">
                <RiskLevelBadge level="CRITICAL" size="sm" />
                <span className="text-[11px] font-semibold text-red-700">Autonomy: STRICT_REVIEW</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Biosecurity disease outbreaks, transit corridor disruptions, emergency resilience. Requires professional or statutory authority verification.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Universal Denylist & Invariants */}
        <Card className="border-[#E5E0D5] shadow-sm">
          <CardHeader className="border-b border-[#E5E0D5] pb-3">
            <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-600" />
              Universal Policy Invariants & Action Denylist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="p-3 rounded-lg border border-red-100 bg-red-50/40 text-xs text-red-900 space-y-1">
              <strong className="block font-semibold">1. Zero Autonomous Financial Execution:</strong>
              No agent or model can autonomously initiate fund disbursements, wallet withdrawals, trade execution, or payment debits.
            </div>

            <div className="p-3 rounded-lg border border-red-100 bg-red-50/40 text-xs text-red-900 space-y-1">
              <strong className="block font-semibold">2. Zero-Tolerance Anti-Pork / Swine Invariant:</strong>
              Strict ecosystem ban on pork, swine, porcine produce across all inputs, models, recommendations, and catalogues.
            </div>

            <div className="p-3 rounded-lg border border-red-100 bg-red-50/40 text-xs text-red-900 space-y-1">
              <strong className="block font-semibold">3. No Autonomous Biosecurity Culling / Quarantine:</strong>
              Agents cannot order animal culling, chemical spraying mandates, or farm isolation without qualified veterinary oversight.
            </div>

            <div className="p-3 rounded-lg border border-red-100 bg-red-50/40 text-xs text-red-900 space-y-1">
              <strong className="block font-semibold">4. Privacy Protection:</strong>
              Phone numbers, raw GPS coordinates, and private B2B contracts are stripped before evaluation.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Official Disclaimers */}
      <Card className="border-[#E5E0D5] shadow-sm">
        <CardHeader className="border-b border-[#E5E0D5] pb-3">
          <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#0F4327]" />
            Statutory & Operational Disclaimers
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs text-neutral-700">
          <div className="p-3 rounded-lg border border-[#E5E0D5] bg-[#FBF9F4]">
            <strong className="block font-semibold text-neutral-900 mb-1">Advisory-Only Scope:</strong>
            {GOVERNANCE_DISCLAIMERS.ADVISORY_ONLY}
          </div>
          <div className="p-3 rounded-lg border border-[#E5E0D5] bg-[#FBF9F4]">
            <strong className="block font-semibold text-neutral-900 mb-1">Biosecurity Screening:</strong>
            {GOVERNANCE_DISCLAIMERS.BIOSECURITY}
          </div>
          <div className="p-3 rounded-lg border border-[#E5E0D5] bg-[#FBF9F4]">
            <strong className="block font-semibold text-neutral-900 mb-1">Logistics Corridor Notice:</strong>
            {GOVERNANCE_DISCLAIMERS.LOGISTICS_CORRIDOR}
          </div>
          <div className="p-3 rounded-lg border border-[#E5E0D5] bg-[#FBF9F4]">
            <strong className="block font-semibold text-neutral-900 mb-1">Asset-Light Operation:</strong>
            {GOVERNANCE_DISCLAIMERS.ASSET_LIGHT}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
