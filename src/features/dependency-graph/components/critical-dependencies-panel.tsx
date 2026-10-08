import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DependencyAssessment } from "../types";
import { DependencyStatusBadge } from "./dependency-status-badge";

interface CriticalDependenciesPanelProps {
  assessments: DependencyAssessment[];
}

export function CriticalDependenciesPanel({ assessments }: CriticalDependenciesPanelProps) {
  if (assessments.length === 0) {
    return (
      <Card className="border border-border/80 shadow-sm bg-surface">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Critical Bottlenecks & SPOFs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            No critical dependencies or single points of failure detected in current network observations.
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
            Critical Bottlenecks & Single Points of Failure
          </CardTitle>
          <span className="text-xs text-muted font-medium">
            {assessments.length} Active Concern{assessments.length === 1 ? "" : "s"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="divide-y divide-border/60">
          {assessments.map((item) => (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">
                    {item.dominantEntityLabel || item.entityId}
                  </span>
                  {item.affectedCommodity && (
                    <span className="text-xs px-2 py-0.5 rounded bg-surface-subtle border border-border/50 text-muted">
                      {item.affectedCommodity}
                    </span>
                  )}
                  {item.locationState && (
                    <span className="text-xs text-muted">
                      ({item.locationState})
                    </span>
                  )}
                </div>
                <DependencyStatusBadge status={item.classification} size="sm" />
              </div>

              <p className="text-xs text-muted leading-relaxed">
                {item.riskSummary}
              </p>

              <div className="flex items-center gap-4 text-[11px] text-muted">
                <span>Type: {item.assessmentType.replace(/_/g, " ")}</span>
                {item.concentrationRatio != null && (
                  <span>Ratio: {item.concentrationRatio}%</span>
                )}
                <span>Confidence: {item.confidence}</span>
                <span>Provenance: {item.provenance}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
