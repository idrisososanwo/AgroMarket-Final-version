"use client";

import React from "react";
import Link from "next/link";
import { EvidenceGroundedAnswer } from "../types";
import { EvidenceDrawer } from "./evidence-drawer";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  BookmarkCheck,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";

interface EvidenceGroundedAnswerCardProps {
  answer: EvidenceGroundedAnswer;
}

export function EvidenceGroundedAnswerCard({ answer }: EvidenceGroundedAnswerCardProps) {
  const modeColor =
    answer.generationMode === "EVIDENCE_GROUNDED_SYNTHESIS"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : "bg-blue-50 text-blue-800 border-blue-200";

  const confidenceColor =
    answer.confidence === "HIGH"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : answer.confidence === "MODERATE"
      ? "bg-blue-100 text-blue-800 border-blue-300"
      : "bg-gray-100 text-gray-800 border-gray-300";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-5 animate-fadeIn">
      {/* Header Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-300">
            {answer.category.replace(/_/g, " ")}
          </span>

          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${modeColor}`}>
            {answer.generationMode === "EVIDENCE_GROUNDED_SYNTHESIS"
              ? "Grounded Synthesis"
              : "Evidence-Only Fallback"}
          </span>

          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${confidenceColor}`}>
            {answer.confidence} CONFIDENCE
          </span>
        </div>

        <div className="text-xs text-gray-400 flex items-center gap-1 font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{answer.executionTimeMs}ms</span>
          <span>•</span>
          <span>Provider: {answer.providerInfo.provider}</span>
        </div>
      </div>

      {/* Mandatory Professional Review Banner */}
      {answer.needsProfessionalReview && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-md text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Professional Review Advised</span>
          </div>
          <p className="leading-relaxed">
            {answer.professionalReviewNotice ||
              "This inquiry relates to disease, biosecurity, or high-risk agronomic practices. Verify with certified extension officers or veterinarians."}
          </p>
        </div>
      )}

      {/* Insufficient Evidence Warning Banner */}
      {answer.insufficientEvidence && (
        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-md text-xs text-blue-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-blue-800">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Limited Evidence Grounding</span>
          </div>
          <p className="leading-relaxed">
            AgroMarket&apos;s repository currently has limited verified records matching this query. Findings are preliminary.
          </p>
        </div>
      )}

      {/* Executive Summary */}
      <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-4">
        <div className="text-xs font-semibold text-emerald-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Executive Summary</span>
        </div>
        <p className="text-sm text-gray-900 font-medium leading-relaxed">
          {answer.summary}
        </p>
      </div>

      {/* Detailed Grounded Synthesis Answer */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Grounded Analysis & Evidence Context
        </h4>
        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line space-y-2">
          {answer.answer}
        </div>
      </div>

      {/* Key Grounded Points */}
      {answer.keyPoints.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Verified Findings
          </h4>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {answer.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conflicting Evidence Disclosures */}
      {answer.conflicts.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-4 text-xs space-y-2">
          <div className="font-bold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Disclosed Source Discrepancies ({answer.conflicts.length})</span>
          </div>
          {answer.conflicts.map((conf, idx) => (
            <div key={idx} className="bg-white p-3 rounded border border-amber-200/80 space-y-1">
              <div className="font-semibold text-gray-800">{conf.topic}</div>
              <p className="text-gray-600">
                <strong>Primary ({conf.primarySource}):</strong> &ldquo;{conf.primaryClaim}&rdquo;
              </p>
              <p className="text-gray-600">
                <strong>Discrepancy ({conf.conflictingSource}):</strong> &ldquo;{conf.conflictingClaim}&rdquo;
              </p>
              <p className="text-amber-800 italic pt-1">{conf.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grounded Citations List */}
      {answer.citations.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BookmarkCheck className="w-4 h-4 text-emerald-600" />
            <span>Direct Citations ({answer.citations.length})</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {answer.citations.map((cit, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-gray-50 border border-gray-200 rounded text-gray-700 space-y-1"
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-emerald-800 font-mono">{cit.citationId}</span>
                  <span className="text-gray-500">{cit.provenance}</span>
                </div>
                <div className="font-medium text-gray-900 line-clamp-1">{cit.sourceTitle}</div>
                <p className="text-gray-500 line-clamp-2 italic">&ldquo;{cit.supportingExcerpt}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Limitations & Uncertainties */}
      {answer.limitations.length > 0 && (
        <div className="border-t border-gray-100 pt-3 text-xs text-gray-500 space-y-1">
          <div className="font-semibold text-gray-700">Analytical Limitations:</div>
          <ul className="list-disc list-inside space-y-0.5">
            {answer.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Action Integration Links */}
      {answer.suggestedActions.length > 0 && (
        <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-2">
          {answer.suggestedActions.map((action, idx) => (
            <Link
              key={idx}
              href={action.route}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-medium transition-colors border border-emerald-200"
            >
              <span>{action.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ))}
        </div>
      )}

      {/* Interactive Underlying Evidence Drawer */}
      <EvidenceDrawer evidenceSet={answer.evidenceSet} />
    </div>
  );
}
