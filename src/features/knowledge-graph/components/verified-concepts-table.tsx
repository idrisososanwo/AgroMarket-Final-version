"use client";

import React from "react";
import { KnowledgeConcept } from "../types";
import { CONCEPT_TYPE_LABELS } from "../constants";
import { ConceptQualityBadge } from "./concept-quality-badge";

interface VerifiedConceptsTableProps {
  concepts: KnowledgeConcept[];
}

export function VerifiedConceptsTable({ concepts }: VerifiedConceptsTableProps) {
  if (concepts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
        <h4 className="text-sm font-semibold text-gray-800">No Verified Concepts Yet</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
          Agricultural knowledge concepts undergo expert and administrative verification before being published to the canonical ontology.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Canonical Verified Concepts
        </h3>
        <span className="text-xs text-gray-500">Showing top {concepts.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Concept Name</th>
              <th className="px-4 py-3">Taxonomy Type</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Quality Status</th>
              <th className="px-4 py-3">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {concepts.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{c.displayName}</div>
                  <div className="text-xs text-gray-500">{c.canonicalName}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                    {CONCEPT_TYPE_LABELS[c.conceptType] || c.conceptType}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {c.conceptKey}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {c.geographicScope}
                </td>
                <td className="px-4 py-3">
                  <ConceptQualityBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-xs font-medium text-gray-700">
                  {c.confidence}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
