import React from "react";
import { CoordinationOpportunityStatus } from "../types";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  ArrowRightCircle,
  Lock,
} from "lucide-react";

export interface CoordinationStatusBadgeProps {
  status: CoordinationOpportunityStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const STATUS_META: Record<
  CoordinationOpportunityStatus,
  {
    label: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-neutral-100 text-neutral-700 border-neutral-300",
    icon: Clock,
  },
  OPEN: {
    label: "Open for Offers",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
    icon: ArrowRightCircle,
  },
  COORDINATING: {
    label: "Coordinating",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-300",
    icon: Layers,
  },
  PARTIALLY_COMMITTED: {
    label: "Partially Committed",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
    icon: Clock,
  },
  FULLY_COMMITTED: {
    label: "Fully Committed",
    badgeClass: "bg-teal-50 text-teal-800 border-teal-300",
    icon: CheckCircle2,
  },
  IN_FULFILMENT: {
    label: "In Fulfilment",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-300",
    icon: Layers,
  },
  COMPLETED: {
    label: "Completed",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-400",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "bg-red-50 text-red-800 border-red-200",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expired",
    badgeClass: "bg-neutral-200 text-neutral-700 border-neutral-300",
    icon: Clock,
  },
  CONSTRAINED: {
    label: "Constrained",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    icon: Lock,
  },
};

export function CoordinationStatusBadge({
  status,
  size = "sm",
  className = "",
}: CoordinationStatusBadgeProps) {
  const meta = STATUS_META[status] || STATUS_META.OPEN;
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
      aria-label={`Coordination Status: ${meta.label}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${sizeClasses} ${meta.badgeClass} ${className}`}
    >
      <IconComponent className={`${iconSizes} shrink-0`} />
      <span>{meta.label}</span>
    </span>
  );
}
