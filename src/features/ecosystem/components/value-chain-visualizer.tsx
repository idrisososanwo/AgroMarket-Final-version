"use client";

import { useState } from "react";
import { ValueChainTemplate } from "../types";
import { getCanonicalValueChainTemplates } from "../templates";
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Truck,
  Store,
  Factory,
  Tractor,
  Package,
} from "lucide-react";

interface ValueChainVisualizerProps {
  initialTemplates?: ValueChainTemplate[];
  selectedTemplateId?: string;
}

export function ValueChainVisualizer({
  initialTemplates,
  selectedTemplateId,
}: ValueChainVisualizerProps) {
  const templates = initialTemplates && initialTemplates.length > 0
    ? initialTemplates
    : getCanonicalValueChainTemplates();

  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    selectedTemplateId || templates[0]?.id || "vc-poultry"
  );
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];
  const activeStage = activeTemplate?.stages.find((s) => s.id === activeStageId) || activeTemplate?.stages[0];

  const getStageIcon = (index: number) => {
    if (index === 0) return <Tractor className="h-5 w-5 text-emerald-600" />;
    if (index === 1) return <Layers className="h-5 w-5 text-blue-600" />;
    if (index === 2) return <Factory className="h-5 w-5 text-amber-600" />;
    if (index === 3) return <Package className="h-5 w-5 text-purple-600" />;
    if (index === 4) return <Truck className="h-5 w-5 text-indigo-600" />;
    return <Store className="h-5 w-5 text-rose-600" />;
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {/* Template Selector Tabs */}
      <div className="flex flex-col gap-4 border-b border-neutral-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Value-Chain Orchestration
            </span>
            <span className="text-xs text-neutral-400">Multi-Actor Flow</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-neutral-900">
            Interactive Value-Chain Stage Models
          </h2>
          <p className="text-sm text-neutral-500">
            Explore how AgroMarket coordinates crops, livestock, aquaculture, and dairy from primary production to final market.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2">
          {templates.map((tpl) => {
            const isSelected = tpl.id === activeTemplateId;
            return (
              <button
                key={tpl.id}
                onClick={() => {
                  setActiveTemplateId(tpl.id);
                  setActiveStageId(null);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {tpl.commodity}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Box */}
      {activeTemplate && (
        <div className="my-5 rounded-lg bg-neutral-50 p-4 border border-neutral-100 text-xs text-neutral-700 leading-relaxed">
          <span className="font-semibold text-neutral-900">{activeTemplate.name}:</span>{" "}
          {activeTemplate.summary}
        </div>
      )}

      {/* Stage Flow Nodes */}
      <div className="relative my-6 overflow-x-auto pb-4">
        <div className="flex min-w-[720px] items-center justify-between gap-2">
          {activeTemplate?.stages.map((stage, idx) => {
            const isCurrent = activeStage?.id === stage.id;
            const isLast = idx === activeTemplate.stages.length - 1;

            return (
              <div key={stage.id} className="flex flex-1 items-center">
                {/* Stage Node Box */}
                <button
                  type="button"
                  onClick={() => setActiveStageId(stage.id)}
                  className={`flex flex-1 flex-col items-center rounded-xl p-3.5 text-center transition ${
                    isCurrent
                      ? "border-2 border-emerald-600 bg-emerald-50/70 shadow-sm"
                      : "border border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 shadow-inner">
                    {getStageIcon(idx)}
                  </div>
                  <span className="text-xs font-bold text-neutral-900 line-clamp-1">
                    {stage.label}
                  </span>
                  <span className="mt-1 text-[11px] text-neutral-500 line-clamp-1">
                    {stage.actorRole}
                  </span>
                </button>

                {/* Connector Arrow */}
                {!isLast && (
                  <div className="mx-1 text-neutral-300">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Stage Detailed Breakdown */}
      {activeStage && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Stage Detail
              </span>
              <h3 className="text-base font-bold text-neutral-900">{activeStage.label}</h3>
              <p className="mt-1 text-xs text-neutral-600 leading-normal">
                {activeStage.description}
              </p>
            </div>
            <div className="shrink-0 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-2xs">
              <span className="text-neutral-400">Coordinating Actor:</span>{" "}
              <strong className="text-neutral-900">{activeStage.actorRole}</strong>
            </div>
          </div>

          <div className="mt-4 border-t border-emerald-100 pt-3">
            <span className="text-xs font-semibold text-neutral-700">Key Stage Outputs / Hand-offs:</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeStage.keyOutputs.map((out, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-900 shadow-2xs"
                >
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  {out}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
