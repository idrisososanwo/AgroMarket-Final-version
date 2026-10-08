"use client";

import React, { useState } from "react";
import { AGENT_CAPABILITY_REGISTRY } from "../agent-capabilities";
import { CANONICAL_GOVERNANCE_AGENTS, CanonicalGovernanceAgent } from "../types";
import { RiskLevelBadge } from "./risk-level-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ShieldAlert,
  Bot,
  CheckCircle2,
  Ban,
  Lock,
  Eye,
} from "lucide-react";

export function AgentCapabilitiesView() {
  const [selectedAgentKey, setSelectedAgentKey] = useState<CanonicalGovernanceAgent>(
    CANONICAL_GOVERNANCE_AGENTS[0]
  );

  const selectedAgent = AGENT_CAPABILITY_REGISTRY[selectedAgentKey];

  return (
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="p-4 rounded-xl border border-[#E5E0D5] bg-[#FBF9F4]">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F4327] text-white shrink-0 mt-0.5">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Canonical Agricultural Agent Capability Matrix (9 Agents)
            </h3>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
              AgroMarket intelligence agents operate strictly within deterministic capability scopes, risk ceilings, and autonomy boundaries. No agent possesses unrestricted autonomy or authority to independently execute financial trades, biosecurity culling, or physical transport operations.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Agent selector tabs and details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 9 Agents */}
        <div className="lg:col-span-5 space-y-2.5">
          {CANONICAL_GOVERNANCE_AGENTS.map((agentKey) => {
            const agent = AGENT_CAPABILITY_REGISTRY[agentKey];
            const isSelected = selectedAgentKey === agentKey;

            return (
              <button
                key={agentKey}
                onClick={() => setSelectedAgentKey(agentKey)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? "border-[#0F4327] bg-[#F4F9F5] shadow-xs"
                    : "border-[#E5E0D5] bg-white hover:border-neutral-300 hover:bg-neutral-50/50"
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-neutral-900 line-clamp-1">
                    {agent.displayName}
                  </span>
                  <RiskLevelBadge level={agent.riskCeiling} size="sm" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span className="font-mono text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                    Domain: {agent.domain}
                  </span>
                  <span className="text-neutral-600 font-medium truncate max-w-[150px]">
                    Max: {agent.maxPermittedAutonomy}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Active Agent Capability Specification */}
        <div className="lg:col-span-7">
          <Card className="border-[#E5E0D5] shadow-sm">
            <CardHeader className="border-b border-[#E5E0D5] pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-mono text-[#0F4327] bg-[#DCFCE7] font-semibold px-2.5 py-1 rounded-md">
                  {selectedAgent.agentId}
                </span>
                <RiskLevelBadge level={selectedAgent.riskCeiling} size="md" />
              </div>
              <CardTitle className="text-lg font-bold text-neutral-900">
                {selectedAgent.displayName}
              </CardTitle>
              <div className="flex flex-wrap gap-4 text-xs text-neutral-500 mt-2">
                <div>
                  Domain: <strong className="text-neutral-800">{selectedAgent.domain}</strong>
                </div>
                <div>
                  Permitted Autonomy:{" "}
                  <strong className="text-neutral-800">{selectedAgent.maxPermittedAutonomy}</strong>
                </div>
                <div>
                  Required Review:{" "}
                  <strong className="text-neutral-800">{selectedAgent.requiredReviewLevel}</strong>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-5">
              {/* Authorized Capability Scope */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Authorized Capability Scope</span>
                </div>
                <ul className="space-y-1.5">
                  {selectedAgent.capabilityScope.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-neutral-800 p-2.5 rounded-lg border border-emerald-100 bg-[#F4F9F5] flex items-start gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Permitted Outputs */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2 flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-neutral-500" />
                  <span>Permitted Output Artifacts</span>
                </div>
                <ul className="space-y-1.5">
                  {selectedAgent.allowedOutputs.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-neutral-700 p-2 rounded-lg border border-[#E5E0D5] bg-white flex items-start gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prohibited Actions (Fail-Closed Denials) */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2 flex items-center gap-1.5">
                  <Ban className="h-4 w-4 text-red-600" />
                  <span>Strictly Prohibited Actions (Fail-Closed Enforced)</span>
                </div>
                <ul className="space-y-1.5">
                  {selectedAgent.forbiddenOutputs.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-red-900 p-2.5 rounded-lg border border-red-200 bg-red-50/40 flex items-start gap-2 font-medium"
                    >
                      <Ban className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Statutory Constraints */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-neutral-500" />
                  <span>Statutory & Operational Constraints</span>
                </div>
                <ul className="space-y-1.5">
                  {selectedAgent.statutoryConstraints.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-neutral-800 p-2.5 rounded-lg border border-[#E5E0D5] bg-[#FBF9F4] flex items-start gap-2"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-neutral-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
