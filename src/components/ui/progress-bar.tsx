import * as React from "react";

export type ProgressBarVariant = "primary" | "growth" | "clay" | "amber" | "danger";

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  variant?: ProgressBarVariant;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const BAR_VARIANTS: Record<ProgressBarVariant, string> = {
  primary: "bg-[#0F4327]",
  growth: "bg-[#16A34A]",
  clay: "bg-[#C26732]",
  amber: "bg-[#E59500]",
  danger: "bg-[#DC2626]",
};

const HEIGHT_CLASSES = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function ProgressBar({
  value,
  max = 100,
  variant = "primary",
  size = "md",
  showLabel = false,
  label,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-xs font-semibold text-neutral-600">
          <span>{label || "Progress"}</span>
          <span className="font-mono">{percentage}%</span>
        </div>
      )}
      <div
        className={`w-full bg-[#E5E0D5] rounded-full overflow-hidden ${HEIGHT_CLASSES[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${BAR_VARIANTS[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
