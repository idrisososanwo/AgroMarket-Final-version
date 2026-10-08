import React from "react";
import { ApprovalStatus } from "../types";
import { CheckCircle2, Clock, XCircle, AlertTriangle, RotateCcw } from "lucide-react";

export interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  size?: "sm" | "md";
  className?: string;
}

const APPROVAL_STATUS_META: Record<
  ApprovalStatus,
  {
    label: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PENDING: {
    label: "Pending Review",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Clock,
  },
  APPROVED: {
    label: "Approved",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    icon: XCircle,
  },
  REVOKED: {
    label: "Revoked",
    badgeClass: "bg-neutral-100 text-neutral-800 border-neutral-300",
    icon: RotateCcw,
  },
  EXPIRED: {
    label: "Expired",
    badgeClass: "bg-neutral-100 text-neutral-600 border-neutral-200",
    icon: AlertTriangle,
  },
  SUPERSEDED: {
    label: "Superseded",
    badgeClass: "bg-neutral-100 text-neutral-600 border-neutral-200",
    icon: RotateCcw,
  },
};

export function ApprovalStatusBadge({ status, className = "" }: ApprovalStatusBadgeProps) {
  const meta = APPROVAL_STATUS_META[status] || APPROVAL_STATUS_META.PENDING;
  const IconComponent = meta.icon;

  return (
    <span
      role="status"
      aria-label={`Approval Status: ${meta.label}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${meta.badgeClass} ${className}`}
    >
      <IconComponent className="h-3 w-3 shrink-0" />
      <span>{meta.label}</span>
    </span>
  );
}
