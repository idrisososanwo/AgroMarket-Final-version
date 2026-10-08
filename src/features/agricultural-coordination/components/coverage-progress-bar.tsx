import React from "react";
import { CoordinationCoverageSummary } from "../types";

export interface CoverageProgressBarProps {
  coverage: CoordinationCoverageSummary;
  className?: string;
  showDetails?: boolean;
}

export function CoverageProgressBar({
  coverage,
  className = "",
  showDetails = true,
}: CoverageProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, coverage.coveragePercentage));

  let barColor = "bg-emerald-600";
  if (coverage.coverageStatus === "NO_COVERAGE") {
    barColor = "bg-neutral-300";
  } else if (coverage.coverageStatus === "PARTIALLY_COVERED") {
    barColor = "bg-amber-500";
  } else if (coverage.coverageStatus === "OVER_COMMITTED_BLOCKED") {
    barColor = "bg-red-500";
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span className="font-medium text-neutral-700">
            {coverage.acceptedQuantityKg.toLocaleString()} /{" "}
            {coverage.requiredQuantityKg.toLocaleString()} kg committed
          </span>
          <span className="font-bold text-neutral-900">{percentage}%</span>
        </div>
      )}

      <div
        className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden border border-[#E5E0D5]"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Coverage: ${percentage}% (${coverage.acceptedQuantityKg} of ${coverage.requiredQuantityKg} kg)`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showDetails && (
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>
            {coverage.remainingCapacityKg > 0
              ? `${coverage.remainingCapacityKg.toLocaleString()} kg remaining needed`
              : "Requirement fully committed"}
          </span>
          <span>
            {coverage.acceptedCommitmentsCount}{" "}
            {coverage.acceptedCommitmentsCount === 1 ? "commitment" : "commitments"}
          </span>
        </div>
      )}
    </div>
  );
}
