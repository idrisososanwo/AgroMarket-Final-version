import * as React from "react";
import {
  Radio,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  GitCompare,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "./card";
import { Badge } from "./badge";
import { ConfidenceIndicator, ConfidenceTier } from "./confidence-indicator";
import { Button } from "./button";

export type IntelligenceType =
  | "SIGNAL"
  | "RECOMMENDATION"
  | "PREDICTION"
  | "RISK"
  | "OPPORTUNITY"
  | "CONFLICT"
  | "OUTCOME";

export interface IntelligenceCardProps {
  type: IntelligenceType;
  title: string;
  summary: string;
  domain?: string;
  confidence?: {
    score?: number;
    tier?: ConfidenceTier;
  };
  evidenceCount?: number;
  evidenceItems?: string[];
  actionLabel?: string;
  onAction?: () => void;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  className?: string;
}

const TYPE_CONFIG: Record<
  IntelligenceType,
  {
    label: string;
    badgeVariant: "primary" | "growth" | "clay" | "amber" | "warning" | "danger" | "info";
    icon: React.ElementType;
    borderColor: string;
  }
> = {
  SIGNAL: {
    label: "Intelligence Signal",
    badgeVariant: "info",
    icon: Radio,
    borderColor: "border-sky-200",
  },
  RECOMMENDATION: {
    label: "Strategic Recommendation",
    badgeVariant: "growth",
    icon: Lightbulb,
    borderColor: "border-emerald-300",
  },
  PREDICTION: {
    label: "Predictive Forecast",
    badgeVariant: "primary",
    icon: TrendingUp,
    borderColor: "border-emerald-700",
  },
  RISK: {
    label: "Ecosystem Risk",
    badgeVariant: "danger",
    icon: AlertTriangle,
    borderColor: "border-rose-300",
  },
  OPPORTUNITY: {
    label: "Market Opportunity",
    badgeVariant: "amber",
    icon: TrendingUp,
    borderColor: "border-amber-300",
  },
  CONFLICT: {
    label: "Multi-Agent Conflict",
    badgeVariant: "clay",
    icon: GitCompare,
    borderColor: "border-[#F6C6B0]",
  },
  OUTCOME: {
    label: "Measured Outcome",
    badgeVariant: "growth",
    icon: CheckCircle2,
    borderColor: "border-emerald-300",
  },
};

export function IntelligenceCard({
  type,
  title,
  summary,
  domain,
  confidence,
  evidenceCount,
  evidenceItems,
  actionLabel,
  onAction,
  severity,
  className = "",
}: IntelligenceCardProps) {
  const [showEvidence, setShowEvidence] = React.useState(false);
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <Card className={`border-l-4 ${config.borderColor} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-neutral-100 text-[#0F4327]">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <Badge variant={config.badgeVariant} size="sm">
              {config.label}
            </Badge>
            {domain && (
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {domain}
              </span>
            )}
            {severity && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  severity === "CRITICAL"
                    ? "bg-rose-100 text-rose-800"
                    : severity === "HIGH"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {severity}
              </span>
            )}
          </div>

          {confidence && (
            <ConfidenceIndicator score={confidence.score} tier={confidence.tier} />
          )}
        </div>

        <h4 className="text-base font-bold text-[#1A231E] mt-2 leading-snug">
          {title}
        </h4>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <p className="text-sm text-neutral-600 leading-relaxed">{summary}</p>

        {/* Evidence disclosure */}
        {((evidenceCount && evidenceCount > 0) || (evidenceItems && evidenceItems.length > 0)) && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowEvidence(!showEvidence)}
              className="inline-flex items-center text-xs font-semibold text-[#0F4327] hover:underline"
            >
              <Info className="h-3 w-3 mr-1" />
              {showEvidence ? "Hide Supporting Evidence" : `View Evidence (${evidenceItems?.length || evidenceCount})`}
            </button>
            {showEvidence && evidenceItems && (
              <ul className="mt-2 space-y-1 rounded-md bg-[#FBF9F4] border border-[#E5E0D5] p-3 text-xs text-neutral-600">
                {evidenceItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#0F4327] font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>

      {actionLabel && onAction && (
        <CardFooter className="pt-2 flex justify-end">
          <Button
            size="sm"
            variant={type === "RISK" ? "destructive" : "primary"}
            onClick={onAction}
            rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
          >
            {actionLabel}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
