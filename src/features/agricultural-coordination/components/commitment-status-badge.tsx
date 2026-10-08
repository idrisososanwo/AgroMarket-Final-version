import React from "react";
import { SupplyCommitmentStatus } from "../types";
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck,
  Truck,
  RotateCcw,
} from "lucide-react";

export interface CommitmentStatusBadgeProps {
  status: SupplyCommitmentStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const COMMITMENT_META: Record<
  SupplyCommitmentStatus,
  {
    label: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PROPOSED: {
    label: "Proposed",
    badgeClass: "bg-neutral-100 text-neutral-700 border-neutral-300",
    icon: Clock,
  },
  OFFERED: {
    label: "Offered",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-300",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Accepted",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
    icon: CheckCircle2,
  },
  CONFIRMED: {
    label: "Confirmed Ready",
    badgeClass: "bg-teal-50 text-teal-800 border-teal-300",
    icon: FileCheck,
  },
  FULFILMENT_PENDING: {
    label: "Fulfilment Pending",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-300",
    icon: Truck,
  },
  FULFILLED: {
    label: "Fulfilled",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-400",
    icon: CheckCircle2,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    badgeClass: "bg-neutral-200 text-neutral-700 border-neutral-300",
    icon: RotateCcw,
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "bg-red-50 text-red-800 border-red-200",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expired",
    badgeClass: "bg-neutral-200 text-neutral-700 border-neutral-300",
    icon: Clock,
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-red-50 text-red-800 border-red-200",
    icon: XCircle,
  },
  FAILED: {
    label: "Failed",
    badgeClass: "bg-red-100 text-red-900 border-red-300",
    icon: XCircle,
  },
};

export function CommitmentStatusBadge({
  status,
  size = "sm",
  className = "",
}: CommitmentStatusBadgeProps) {
  const meta = COMMITMENT_META[status] || COMMITMENT_META.PROPOSED;
  const IconComponent = meta.icon;

  const sizeClasses =
    size === "lg"
      ? "text-sm px-3 py-1"
      : size === "md"
      ? "text-xs px-2.5 py-1"
      : "text-[11px] px-2 py-0.5";

  const iconSizes =
    size === "lg" ? "h-4 w-4" : size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";

  return (
    <span
      role="status"
      aria-label={`Commitment Status: ${meta.label}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${sizeClasses} ${meta.badgeClass} ${className}`}
    >
      <IconComponent className={`${iconSizes} shrink-0`} />
      <span>{meta.label}</span>
    </span>
  );
}
