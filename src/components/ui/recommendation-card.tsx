import * as React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "./card";
import { Button } from "./button";
import { ConfidenceIndicator } from "./confidence-indicator";
import { Badge } from "./badge";

export interface RecommendationCardProps {
  title: string;
  rationale: string;
  expectedImpact?: string;
  domain: string;
  confidenceScore?: number;
  actionText: string;
  onExecute: () => void;
  isExecuting?: boolean;
  secondaryActionText?: string;
  onDismiss?: () => void;
  className?: string;
}

export function RecommendationCard({
  title,
  rationale,
  expectedImpact,
  domain,
  confidenceScore = 85,
  actionText,
  onExecute,
  isExecuting = false,
  secondaryActionText = "Dismiss",
  onDismiss,
  className = "",
}: RecommendationCardProps) {
  return (
    <Card className={`border-2 border-emerald-500/30 bg-gradient-to-br from-white via-white to-emerald-50/20 shadow-md ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#DCFCE7] text-[#0F4327]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <Badge variant="growth" size="sm">
              AI Action Recommendation
            </Badge>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {domain}
            </span>
          </div>

          <ConfidenceIndicator score={confidenceScore} />
        </div>

        <h3 className="text-lg font-extrabold text-[#1A231E] mt-2">
          {title}
        </h3>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        <p className="text-sm text-neutral-700 leading-relaxed">
          {rationale}
        </p>

        {expectedImpact && (
          <div className="rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] p-3 text-xs text-[#0F4327]">
            <span className="font-bold">Projected Impact: </span>
            <span>{expectedImpact}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-3 pt-3">
        {onDismiss ? (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            {secondaryActionText}
          </Button>
        ) : <div />}

        <Button
          variant="primary"
          size="md"
          isLoading={isExecuting}
          onClick={onExecute}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          {actionText}
        </Button>
      </CardFooter>
    </Card>
  );
}
