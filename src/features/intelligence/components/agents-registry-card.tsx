"use client";

import { IntelligenceAgent } from "../types";
import { Cpu, CheckCircle2, AlertCircle } from "lucide-react";

interface AgentsRegistryCardProps {
  agents: IntelligenceAgent[];
}

export function AgentsRegistryCard({ agents }: AgentsRegistryCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Ecosystem Intelligence Agents Registry
          </h2>
          <p className="text-xs text-neutral-500">
            Multi-agent architecture consuming common deterministic signals and data layers.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {agents.length} Registered
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-emerald-500"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-900">{agent.name}</h3>
                  <span className="text-[10px] text-neutral-400 font-mono">v{agent.version}</span>
                </div>
              </div>
              {agent.status === "ACTIVE" ? (
                <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-semibold text-amber-700">
                  <AlertCircle className="mr-1 h-3 w-3" /> {agent.status}
                </span>
              )}
            </div>

            <p className="mt-2 text-xs text-neutral-600 line-clamp-2">
              {agent.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-1">
              {agent.capabilities.slice(0, 3).map((cap) => (
                <span
                  key={cap}
                  className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-700"
                >
                  {cap.replace(/_/g, " ")}
                </span>
              ))}
              {agent.capabilities.length > 3 && (
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-500">
                  +{agent.capabilities.length - 3} more
                </span>
              )}
            </div>

            {agent.id.includes("MARKET") && (
              <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[10px] text-emerald-700 font-medium">Phase 2.3 Activated</span>
                <a
                  href="/market-intelligence"
                  className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 underline"
                >
                  Open Intelligence Console &rarr;
                </a>
              </div>
            )}

            {agent.id.includes("PRODUCTION") && (
              <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[10px] text-emerald-700 font-medium">Phase 2.4 Activated</span>
                <a
                  href="/production-intelligence"
                  className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 underline"
                >
                  Open Planning Console &rarr;
                </a>
              </div>
            )}

            {agent.id.includes("DEMAND") && (
              <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[10px] text-blue-700 font-medium">Phase 2.5 Activated</span>
                <a
                  href="/demand-intelligence"
                  className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline"
                >
                  Open Demand Console &rarr;
                </a>
              </div>
            )}

            {agent.id.includes("SUPPLY") && (
              <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[10px] text-teal-700 font-medium">Phase 2.6 Activated</span>
                <a
                  href="/supply-intelligence"
                  className="text-[10px] font-semibold text-teal-600 hover:text-teal-800 underline"
                >
                  Open Coordination Console &rarr;
                </a>
              </div>
            )}

            {agent.id.includes("PROCUREMENT") && (
              <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[10px] text-amber-700 font-medium">Phase 2.7 Activated</span>
                <a
                  href="/procurement-intelligence"
                  className="text-[10px] font-semibold text-amber-600 hover:text-amber-800 underline"
                >
                  Open Procurement Console &rarr;
                </a>
              </div>
            )}

            {(agent.id.includes("FOOD_SECURITY") || agent.id.includes("RESILIENCE")) && (
              <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[10px] text-red-700 font-medium">Phase 2.8 Activated</span>
                <a
                  href="/food-security"
                  className="text-[10px] font-semibold text-red-600 hover:text-red-800 underline"
                >
                  Open Food Security Console &rarr;
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
