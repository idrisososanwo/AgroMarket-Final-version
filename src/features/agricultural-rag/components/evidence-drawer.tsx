"use client";

import React, { useState } from "react";
import { RagEvidenceItem } from "../types";
import { Database, ChevronDown, ChevronUp, MapPin, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface EvidenceDrawerProps {
  evidenceSet: RagEvidenceItem[];
}

export function EvidenceDrawer({ evidenceSet }: EvidenceDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!evidenceSet || evidenceSet.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/50 mt-4 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-gray-800">
            Retrieved Evidence Repository ({evidenceSet.length} sources)
          </span>
          <span className="text-gray-400">• Click to inspect grounded sources</span>
        </div>

        <div className="flex items-center gap-1 text-gray-500 font-medium">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-3 bg-white">
          {evidenceSet.map((item) => (
            <div
              key={item.evidenceId}
              className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                    [{item.evidenceId}]
                  </span>
                  <span className="font-semibold text-gray-900">{item.sourceTitle}</span>
                  <span className="text-gray-400">({item.sourceType.replace(/_/g, " ")})</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded font-medium ${
                      item.isHistorical
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {item.isHistorical ? "HISTORICAL" : "CURRENT"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    {item.provenance}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {item.confidence}
                  </span>
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed font-sans italic bg-white p-2.5 rounded border border-gray-100">
                &ldquo;{item.relevantExcerpt}&rdquo;
              </p>

              <div className="flex items-center justify-between text-gray-500 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {item.locationState && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {item.locationState} {item.locationLga ? `(${item.locationLga})` : ""}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Score: {Math.round(item.retrievalScore * 100)}%
                  </span>
                </div>

                <Link
                  href="/knowledge-graph"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  <span>Verify In Knowledge Base</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
