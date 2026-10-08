import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DependencyRelationship } from "../types";
import { DependencyStatusBadge } from "./dependency-status-badge";

interface DependencyNetworkOverviewProps {
  relationships: DependencyRelationship[];
}

export function DependencyNetworkOverview({ relationships }: DependencyNetworkOverviewProps) {
  if (relationships.length === 0) {
    return (
      <Card className="border border-border/80 shadow-sm bg-surface">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Agricultural Dependency Network</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            No active dependency relationships recorded. Network edges will populate as ecosystem transactions, facilities, and coordination flows are observed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/80 shadow-sm bg-surface">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            Agricultural Dependency Network Topology
          </CardTitle>
          <span className="text-xs text-muted font-medium">
            {relationships.length} Active Relationship{relationships.length === 1 ? "" : "s"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-surface-subtle text-muted text-[11px] uppercase tracking-wider border-b border-border/60">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Source</th>
                <th className="py-2.5 px-3 font-semibold">Relationship</th>
                <th className="py-2.5 px-3 font-semibold">Target</th>
                <th className="py-2.5 px-3 font-semibold">Commodity</th>
                <th className="py-2.5 px-3 font-semibold">Nature</th>
                <th className="py-2.5 px-3 font-semibold">Strength</th>
                <th className="py-2.5 px-3 font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {relationships.map((rel) => (
                <tr key={rel.id} className="hover:bg-surface-subtle/50 transition-colors">
                  <td className="py-2.5 px-3 font-medium">
                    <div>
                      <span>{rel.sourceLabel || rel.sourceNodeId}</span>
                      <span className="text-[10px] text-muted block font-mono">
                        {rel.sourceNodeType}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-primary">
                      {rel.relationshipType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium">
                    <div>
                      <span>{rel.targetLabel || rel.targetNodeId}</span>
                      <span className="text-[10px] text-muted block font-mono">
                        {rel.targetNodeType}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    {rel.commodity ? (
                      <span className="px-1.5 py-0.5 rounded bg-surface-subtle border border-border/50 text-muted">
                        {rel.commodity}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[11px] font-medium ${
                        rel.relationshipNature === "DEPENDENCY"
                          ? "text-foreground"
                          : "text-muted"
                      }`}
                    >
                      {rel.relationshipNature}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <DependencyStatusBadge status={rel.dependencyStrength} size="sm" />
                  </td>
                  <td className="py-2.5 px-3 text-muted text-[11px]">
                    {rel.confidence}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
