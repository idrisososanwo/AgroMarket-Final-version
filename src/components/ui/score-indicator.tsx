import * as React from "react";

export interface ScoreIndicatorProps {
  score: number; // 0 to 100
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ScoreIndicator({
  score,
  label = "Priority Score",
  size = "md",
  className = "",
}: ScoreIndicatorProps) {
  const boundedScore = Math.min(Math.max(Math.round(score), 0), 100);

  let colorStyle = {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
  };

  if (boundedScore < 40) {
    colorStyle = {
      text: "text-rose-700",
      bg: "bg-rose-50",
      border: "border-rose-300",
    };
  } else if (boundedScore < 70) {
    colorStyle = {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-300",
    };
  }

  const SIZES = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border font-mono font-bold select-none ${colorStyle.bg} ${colorStyle.border} ${colorStyle.text} ${SIZES[size]} ${className}`}
    >
      {label && <span className="font-sans font-medium text-xs opacity-75">{label}:</span>}
      <span>{boundedScore}/100</span>
    </div>
  );
}
