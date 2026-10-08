"use client";

import React from "react";
import { KnowledgeRelationship } from "../types";
import { RELATIONSHIP_TYPE_LABELS } from "../constants";

interface KnowledgeGraphTopologyProps {
  relationships: Array<{
    relationship: KnowledgeRelationship;
    sourceName: string;
    targetName: string;
  }>;
}

export function KnowledgeGraphTopology({ relationships }: KnowledgeGraphTopologyProps) {
  if (relationships.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
        <h4 className="text-sm font-semibold text-gray-800">No Relationships Indexed Yet</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
          Semantic relationships connect concepts (e.g. Crop → GROWS_IN → Region, Crop → AFFECTED_BY → Pathology) to power contextual intelligence.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Recent Semantic Knowledge Edges
        </h3>
        <span className="text-xs text-gray-500">Showing top {relationships.length}</span>
      </div>
      <div className="divide-y divide-gray-100">
        {relationships.map(({ relationship, sourceName, targetName }) => (
          <div key={relationship.id} className="p-4 hover:bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">{sourceName}</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono font-medium">
                ──[{RELATIONSHIP_TYPE_LABELS[relationship.relationshipType] || relationship.relationshipType}]──&gt;
              </span>
              <span className="font-semibold text-gray-900 text-sm">{targetName}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
              <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                Strength: {relationship.relationshipStrength}
              </span>
              <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                Conf: {relationship.confidence}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
