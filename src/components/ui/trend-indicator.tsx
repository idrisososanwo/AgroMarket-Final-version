import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type TrendDirection = "up" | "down" | "neutral";

export interface TrendIndicatorProps {
  direction: TrendDirection;
  value: string | number;
  label?: string;
  inverse?: boolean; // When going down is positive (e.g., loss rate, pest severity)
  className?: string;
}

export function TrendIndicator({
  direction,
  value,
  label,
  inverse = false,
  className = "",
}: TrendIndicatorProps) {
  let isPositive = direction === "up";
  if (inverse) {
    isPositive = direction === "down";
  }

  const isNeutral = direction === "neutral";

  const colorClass = isNeutral
    ? "text-neutral-500 bg-neutral-100"
    : isPositive
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-rose-700 bg-rose-50 border-rose-200";

  const Icon =
    direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold border select-none ${colorClass} ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{value}</span>
      {label && <span className="font-normal opacity-80">{label}</span>}
    </span>
  );
}
