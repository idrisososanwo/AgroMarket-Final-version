"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AgriculturalSearchResult } from "../types";
import { CheckCircle2, MapPin, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface SearchResultCardProps {
  result: AgriculturalSearchResult;
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const [showReasons, setShowReasons] = useState(false);

  const percentage = Math.round(result.score * 100);

  const scoreColor =
    percentage >= 70
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : percentage >= 40
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  const validityColor =
    result.validityStatus === "ACTIVE"
      ? "text-emerald-700 bg-emerald-50"
      : result.validityStatus === "EXPIRED"
      ? "text-amber-700 bg-amber-50"
      : "text-blue-700 bg-blue-50";

  return (
    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm hover:border-gray-300 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-300">
              {result.sourceType.replace(/_/g, " ")}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${validityColor}`}>
              {result.validityStatus}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
              {result.sourceProvenance}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {result.confidence} CONFIDENCE
            </span>
          </div>

          <h3 className="text-lg font-bold text-gray-900">{result.title}</h3>
        </div>

        <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${scoreColor}`}>
          {percentage}% Match
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
        {result.sanitizedSnippet}
      </p>

      {/* Matched Concepts & Geography */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-gray-500">
        {result.locationState && (
          <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
            <MapPin className="w-3 h-3 text-gray-400" />
            {result.locationState} {result.locationLga ? `(${result.locationLga})` : ""}
          </span>
        )}

        {result.matchedCommodities.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-gray-400 font-medium">Commodities:</span>
            {result.matchedCommodities.map((c) => (
              <span key={c} className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium border border-emerald-100">
                {c}
              </span>
            ))}
          </div>
        )}

        {result.matchedConcepts.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-gray-400 font-medium">Concepts:</span>
            {result.matchedConcepts.slice(0, 3).map((cid) => (
              <span key={cid} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                {cid.slice(0, 8)}...
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ranking Explanation Toggle */}
      <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowReasons(!showReasons)}
          className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium"
        >
          {showReasons ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showReasons ? "Hide Ranking Breakdown" : `Why did this rank? (${result.rankingReasons.length} reasons)`}
        </button>

        <Link
          href={`/knowledge-graph`}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          <span>View Knowledge Base</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Expanded Ranking Explanations */}
      {showReasons && (
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3 text-xs space-y-1.5 animate-fadeIn">
          <div className="font-semibold text-gray-700 mb-1">Deterministic Ranking Reasons:</div>
          {result.rankingReasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-gray-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span>
                <strong className="text-gray-800">{reason.code.replace(/_/g, " ")}:</strong>{" "}
                {reason.description} <span className="text-gray-400 font-mono">(+{reason.weight})</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
