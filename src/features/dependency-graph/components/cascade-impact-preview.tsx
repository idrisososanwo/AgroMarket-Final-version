import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DependencyCascadeResult } from "../types";
import { DependencyStatusBadge } from "./dependency-status-badge";

interface CascadeImpactPreviewProps {
  cascade: DependencyCascadeResult;
}

export function CascadeImpactPreview({ cascade }: CascadeImpactPreviewProps) {
  return (
    <Card className="border border-border/80 shadow-sm bg-surface">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Downstream Dependency Cascade Exposure
            </CardTitle>
            <p className="text-xs text-muted mt-0.5">
              Root: {cascade.rootNodeType} ({cascade.rootNodeId}) • Max Traversal Depth: {cascade.maxDepthEnforced}
            </p>
          </div>
          {cascade.cycleDetected && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber/10 text-amber border border-amber/20 font-medium">
              Cycle Mitigated
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="bg-surface-subtle p-3 rounded-md border border-border/60 text-xs text-muted leading-relaxed">
          <span className="font-semibold text-foreground block mb-0.5">⚠️ Advisory Protocol:</span>
          {cascade.advisoryDisclaimer}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <div className="bg-surface-subtle p-2.5 rounded border border-border/40">
            <span className="text-muted text-[11px] block">Traversed Nodes</span>
            <span className="font-semibold text-sm text-foreground">{cascade.traversedNodesCount}</span>
          </div>
          <div className="bg-surface-subtle p-2.5 rounded border border-border/40">
            <span className="text-muted text-[11px] block">Traversed Edges</span>
            <span className="font-semibold text-sm text-foreground">{cascade.traversedEdgesCount}</span>
          </div>
          <div className="bg-surface-subtle p-2.5 rounded border border-border/40">
            <span className="text-muted text-[11px] block">Downstream Targets</span>
            <span className="font-semibold text-sm text-foreground">{cascade.downstreamExposures.length}</span>
          </div>
        </div>

        {cascade.downstreamExposures.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">
            No downstream dependency connections found within traversal limits.
          </p>
        ) : (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted tracking-wide uppercase">
              Exposed Downstream Entities
            </span>
            <div className="divide-y divide-border/60">
              {cascade.downstreamExposures.map((exp, idx) => (
                <div key={idx} className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-foreground">
                        {exp.label || `${exp.nodeType}:${exp.nodeId}`}
                      </span>
                      {exp.exposedCommodity && (
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-surface-subtle text-muted border border-border/40">
                          {exp.exposedCommodity}
                        </span>
                      )}
                      <span className="text-[11px] text-muted">
                        (Hop depth: {exp.shortestDepth})
                      </span>
                    </div>
                    <span className="text-[11px] text-muted block font-mono mt-0.5 truncate max-w-md">
                      {exp.exposurePathway}
                    </span>
                  </div>
                  <DependencyStatusBadge status={exp.maxStrength} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
