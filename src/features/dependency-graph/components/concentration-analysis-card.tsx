import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ConcentrationAnalysisResult } from "../types";
import { DependencyStatusBadge } from "./dependency-status-badge";

interface ConcentrationAnalysisCardProps {
  result: ConcentrationAnalysisResult;
}

export function ConcentrationAnalysisCard({ result }: ConcentrationAnalysisCardProps) {
  const isInsufficient = result.status === "INSUFFICIENT_DATA";

  return (
    <Card className="border border-border/80 shadow-sm bg-surface">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-muted">
            {result.concentrationType} CONCENTRATION
          </span>
          <DependencyStatusBadge status={result.classification} size="sm" />
        </div>
        <CardTitle className="text-base font-semibold text-foreground mt-1">
          {result.dominantEntityLabel || result.subjectId}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-surface-subtle p-2.5 rounded-md border border-border/50">
            <span className="text-muted block text-[11px]">Concentration Ratio</span>
            <span className="font-semibold text-sm text-foreground">
              {isInsufficient ? "—" : `${result.concentrationRatio}%`}
            </span>
          </div>
          <div className="bg-surface-subtle p-2.5 rounded-md border border-border/50">
            <span className="text-muted block text-[11px]">Observations Sample</span>
            <span className="font-semibold text-sm text-foreground">
              {result.sampleSize} recorded
            </span>
          </div>
        </div>

        {result.isSinglePointOfFailure && (
          <div className="bg-danger/10 text-danger border border-danger/20 p-2.5 rounded-md text-xs font-medium">
            ⚠️ Single Point of Failure: Exceeds 75% structural threshold.
          </div>
        )}

        <p className="text-xs text-muted leading-relaxed">
          {result.advisoryGuidance}
        </p>

        <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-border/50">
          <span>Confidence: {result.confidence}</span>
          <span>Provenance: {result.provenance}</span>
        </div>
      </CardContent>
    </Card>
  );
}
