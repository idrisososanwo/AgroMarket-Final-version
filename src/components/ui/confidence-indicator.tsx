import * as React from "react";
import { ShieldCheck } from "lucide-react";

export type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW";

export interface ConfidenceIndicatorProps {
  score?: number; // 0.0 to 1.0 or 0 to 100
  tier?: ConfidenceTier;
  showMeter?: boolean;
  className?: string;
}

export function ConfidenceIndicator({
  score,
  tier: propTier,
  showMeter = true,
  className = "",
}: ConfidenceIndicatorProps) {
  // Normalize score if numeric
  let normalizedScore: number | undefined;
  if (score !== undefined) {
    normalizedScore = score <= 1.0 ? Math.round(score * 100) : Math.round(score);
  }

  // Determine tier
  let tier: ConfidenceTier = propTier || "MEDIUM";
  if (normalizedScore !== undefined && !propTier) {
    if (normalizedScore >= 75) tier = "HIGH";
    else if (normalizedScore >= 45) tier = "MEDIUM";
    else tier = "LOW";
  }

  const CONFIG = {
    HIGH: {
      label: "High Confidence",
      bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
      bar: "bg-[#16A34A]",
      barsActive: 3,
    },
    MEDIUM: {
      label: "Moderate Confidence",
      bg: "bg-amber-50 border-amber-200 text-amber-800",
      bar: "bg-[#E59500]",
      barsActive: 2,
    },
    LOW: {
      label: "Low / Preliminary",
      bg: "bg-rose-50 border-rose-200 text-rose-800",
      bar: "bg-[#DC2626]",
      barsActive: 1,
    },
  }[tier];

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-semibold select-none ${CONFIG.bg} ${className}`}
    >
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{CONFIG.label}</span>
      {normalizedScore !== undefined && (
        <span className="font-mono opacity-90">({normalizedScore}%)</span>
      )}
      {showMeter && (
        <div className="flex items-center gap-0.5 ml-1">
          {[1, 2, 3].map((barIndex) => (
            <span
              key={barIndex}
              className={`h-2.5 w-1 rounded-sm ${
                barIndex <= CONFIG.barsActive ? CONFIG.bar : "bg-neutral-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
