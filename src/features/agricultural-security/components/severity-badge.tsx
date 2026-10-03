import React from "react";
import { SecurityIncidentSeverity } from "../types";
import { SEVERITY_LABELS, SEVERITY_COLORS } from "../constants";

interface SeverityBadgeProps {
  severity: SecurityIncidentSeverity;
  className?: string;
  showIcon?: boolean;
}

export function SeverityBadge({ severity, className = "" }: SeverityBadgeProps) {
  const config = SEVERITY_COLORS[severity] || SEVERITY_COLORS.MODERATE;
  const label = SEVERITY_LABELS[severity] || severity;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${config.badge} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {label} Severity
    </span>
  );
}
