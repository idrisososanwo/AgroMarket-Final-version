import React from "react";
import { GovernanceDecision } from "../types";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldAlert,
  UserCheck,
  Info,
} from "lucide-react";

export interface GovernanceStatusBadgeProps {
  decision: GovernanceDecision;
  showIcon?: boolean;
  showDescription?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const GOVERNANCE_DECISION_META: Record<
  GovernanceDecision,
  {
    label: string;
    description: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ALLOW: {
    label: "Permitted",
    description: "Action permitted under AgroMarket governance policy.",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: CheckCircle2,
  },
  ALLOW_WITH_REVIEW: {
    label: "Advisory Permitted",
    description: "Advisory intelligence permitted with standard contextual notice.",
    badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
    icon: Info,
  },
  REQUIRE_HUMAN_APPROVAL: {
    label: "Human Approval Required",
    description: "This action requires an authorized human approval before it can proceed.",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    icon: AlertTriangle,
  },
  REQUIRE_PROFESSIONAL_REVIEW: {
    label: "Professional Review Required",
    description: "Requires verified veterinary, agronomy, or extension expert review.",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    icon: UserCheck,
  },
  REQUIRE_AUTHORITY_REVIEW: {
    label: "Authority Review Required",
    description: "Requires regulatory or administrative authority verification context.",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
    icon: ShieldAlert,
  },
  DENY: {
    label: "Policy Denied",
    description: "This action is not permitted under AgroMarket governance policy.",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    icon: XCircle,
  },
  INSUFFICIENT_DATA: {
    label: "Insufficient Evidence",
    description: "There is not enough reliable evidence to authorize this action.",
    badgeClass: "bg-neutral-100 text-neutral-700 border-neutral-300",
    icon: HelpCircle,
  },
};

export function GovernanceStatusBadge({
  decision,
  showIcon = true,
  showDescription = false,
  className = "",
}: GovernanceStatusBadgeProps) {
  const meta = GOVERNANCE_DECISION_META[decision] || GOVERNANCE_DECISION_META.DENY;
  const IconComponent = meta.icon;

  return (
    <div className="inline-flex flex-col gap-0.5">
      <span
        role="status"
        aria-label={`Governance status: ${meta.label}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.badgeClass} ${className}`}
      >
        {showIcon && <IconComponent className="h-3.5 w-3.5 shrink-0" />}
        <span>{meta.label}</span>
      </span>
      {showDescription && (
        <span className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
          {meta.description}
        </span>
      )}
    </div>
  );
}
