"use client";

import React from "react";
import { GovernedDecisionRecommendation } from "../types";
import {
  HelpCircle,
  XCircle,
  ShieldCheck,
  MapPin,
  Clock,
  Layers,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";

interface ExplainabilityModalProps {
  recommendation: GovernedDecisionRecommendation | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExplainabilityModal({
  recommendation,
  isOpen,
  onClose,
}: ExplainabilityModalProps) {
  if (!isOpen || !recommendation) return null;

  const { eightQuestions, explainability } = recommendation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/90">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <HelpCircle className="h-5 w-5" />
            </span>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Transparent Advisory Explainability
              </span>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 line-clamp-1">
                Why Am I Seeing This?
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Quick Signal Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Confidence
              </div>
              <div className="text-base font-bold text-neutral-900">
                {(recommendation.confidence * 100).toFixed(0)}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Data Recency
              </div>
              <div className="text-base font-bold text-neutral-900">
                ~{explainability.dataRecencyHours}h ago
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                <MapPin className="h-3.5 w-3.5 text-amber-600" />
                Target Geography
              </div>
              <div className="text-sm font-bold text-neutral-900 truncate">
                {recommendation.geography.state || "National"}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                <Layers className="h-3.5 w-3.5 text-purple-600" />
                Agents Active
              </div>
              <div className="text-sm font-bold text-neutral-900 truncate">
                {explainability.contributingAgents.length} Domains
              </div>
            </div>
          </div>

          {/* Contributing Agents List */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Contributing Specialized Agents
            </div>
            <div className="flex flex-wrap gap-2">
              {explainability.contributingAgents.map((agent) => (
                <span
                  key={agent}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700"
                >
                  {agent.replace(/_/g, " ")} AGENT
                </span>
              ))}
            </div>
          </div>

          {/* The 8 Core Governed Questions */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="h-4 w-4 text-emerald-600" />
              Comprehensive Decision Breakdown (8 Invariant Questions)
            </div>

            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50/50">
              {/* 1. What is happening? */}
              <div className="p-3.5 space-y-1">
                <div className="text-xs font-bold text-neutral-500 uppercase">1. What is happening?</div>
                <p className="text-neutral-800 leading-relaxed font-medium">{eightQuestions.whatIsHappening}</p>
              </div>

              {/* 2. Why does it matter? */}
              <div className="p-3.5 space-y-1">
                <div className="text-xs font-bold text-neutral-500 uppercase">2. Why does it matter?</div>
                <p className="text-neutral-800 leading-relaxed">{eightQuestions.whyDoesItMatter}</p>
              </div>

              {/* 3. Who does it affect? */}
              <div className="p-3.5 space-y-1">
                <div className="text-xs font-bold text-neutral-500 uppercase">3. Who does it affect?</div>
                <p className="text-neutral-800 leading-relaxed">{eightQuestions.whoDoesItAffect}</p>
              </div>

              {/* 4. Where? */}
              <div className="p-3.5 space-y-1">
                <div className="text-xs font-bold text-neutral-500 uppercase">4. Where?</div>
                <p className="text-neutral-800 leading-relaxed">{eightQuestions.where}</p>
              </div>

              {/* 5. What evidence supports it? */}
              <div className="p-3.5 space-y-1">
                <div className="text-xs font-bold text-neutral-500 uppercase">5. What evidence supports it?</div>
                <p className="text-neutral-800 leading-relaxed">{eightQuestions.whatEvidenceSupportsIt}</p>
              </div>

              {/* 6. What could the user consider doing? */}
              <div className="p-3.5 space-y-1">
                <div className="text-xs font-bold text-neutral-500 uppercase">6. What could you consider doing?</div>
                <p className="text-neutral-800 leading-relaxed font-medium text-emerald-900">
                  {eightQuestions.whatCouldTheUserConsiderDoing}
                </p>
              </div>

              {/* 7. What are the limitations? */}
              <div className="p-3.5 space-y-1">
                <div className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  7. What are the limitations?
                </div>
                <p className="text-neutral-700 leading-relaxed text-xs">
                  {eightQuestions.whatAreTheLimitations}
                </p>
              </div>

              {/* 8. What happened after the user decided? */}
              <div className="p-3.5 space-y-1">
                <div className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-1 text-blue-700">
                  <CheckCircle className="h-3 w-3" />
                  8. What happened after you decided?
                </div>
                <p className="text-neutral-800 leading-relaxed text-xs">
                  {eightQuestions.whatHappenedAfterUserDecided ||
                    "No decision recorded yet. You can accept, defer, dismiss, or record an external action at any time."}
                </p>
              </div>
            </div>
          </div>

          {/* Privacy & Advisory Disclaimer Banner */}
          <div className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-600 space-y-1">
            <div className="font-semibold text-neutral-800">
              Commercial Privacy & Advisory Guarantee
            </div>
            <p>
              This intelligence respects private identity boundaries. No private farmer contact details, precise GPS coordinates, or confidential buyer contract volumes are ever shared or processed. Recommendations remain strictly advisory.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end bg-neutral-50/90">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 transition-colors shadow-sm"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
