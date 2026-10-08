"use client";

import React from "react";
import { CONCEPT_TYPE_LABELS } from "../constants";
import { KnowledgeConceptType } from "../types";

interface ConceptTypeBreakdownCardProps {
  countsByType: Record<string, number>;
}

export function ConceptTypeBreakdownCard({ countsByType }: ConceptTypeBreakdownCardProps) {
  const entries = Object.entries(countsByType).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-3">
        Ontology Breakdown by Concept Type
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No concepts recorded yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {entries.map(([typeKey, count]) => (
            <div
              key={typeKey}
              className="p-3 bg-gray-50 rounded border border-gray-100 flex flex-col justify-between"
            >
              <span className="text-xs font-medium text-gray-600 truncate">
                {CONCEPT_TYPE_LABELS[typeKey as KnowledgeConceptType] || typeKey}
              </span>
              <span className="text-lg font-bold text-gray-900 mt-1">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
