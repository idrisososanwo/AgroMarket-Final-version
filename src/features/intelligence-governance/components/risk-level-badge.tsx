import React from "react";
import { GovernanceRiskLevel } from "../types";
import { Shield, ShieldAlert, ShieldCheck, AlertOctagon } from "lucide-react";

export interface RiskLevelBadgeProps {
  riskLevel?: GovernanceRiskLevel;
  level?: GovernanceRiskLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const RISK_META: Record<
  GovernanceRiskLevel,
  {
    label: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  LOW: {
    label: "Low Risk",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: ShieldCheck,
  },
  MODERATE: {
    label: "Moderate Risk",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    icon: Shield,
  },
  HIGH: {
    label: "High Risk",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    icon: ShieldAlert,
  },
  CRITICAL: {
    label: "Critical Risk",
    badgeClass: "bg-red-50 text-red-800 border-red-200",
    icon: AlertOctagon,
  },
};

export function RiskLevelBadge({
  riskLevel,
  level,
  size = "sm",
  className = "",
}: RiskLevelBadgeProps) {
  const activeLevel = riskLevel || level || "LOW";
  const meta = RISK_META[activeLevel] || RISK_META.LOW;
  const IconComponent = meta.icon;

  const sizeClasses =
    size === "lg"
      ? "text-sm px-3 py-1"
      : size === "md"
      ? "text-xs px-2.5 py-1"
      : "text-[11px] px-2 py-0.5";
  const iconSize = size === "lg" ? "h-4 w-4" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <span
      role="status"
      aria-label={`Risk Level: ${meta.label}`}
      className={`inline-flex items-center gap-1.5 rounded font-semibold border ${sizeClasses} ${meta.badgeClass} ${className}`}
    >
      <IconComponent className={`${iconSize} shrink-0`} />
      <span>{meta.label}</span>
    </span>
  );
}
