import React from "react";
import { QuantityReconciliationStatus } from "../types";
import { Badge } from "@/components/ui/badge";

interface ReconciliationStatusBadgeProps {
  status: QuantityReconciliationStatus;
  className?: string;
}

export function ReconciliationStatusBadge({
  status,
  className = "",
}: ReconciliationStatusBadgeProps) {
  switch (status) {
    case "EXACT":
      return (
        <Badge
          variant="success"
          className={`border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 ${className}`}
        >
          Exact Match
        </Badge>
      );
    case "UNDER_FULFILLED":
      return (
        <Badge
          variant="warning"
          className={`border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 ${className}`}
        >
          Under-Fulfilled
        </Badge>
      );
    case "OVER_FULFILLED_BLOCKED":
      return (
        <Badge
          variant="danger"
          className={`border-rose-400 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 ${className}`}
        >
          Over-Commitment Blocked
        </Badge>
      );
    case "NO_FULFILMENT":
      return (
        <Badge
          variant="neutral"
          className={`border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/40 ${className}`}
        >
          No Fulfilment
        </Badge>
      );
    case "PENDING":
      return (
        <Badge
          variant="info"
          className={`border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 ${className}`}
        >
          Pending Reconciliation
        </Badge>
      );
    case "INSUFFICIENT_DATA":
      return (
        <Badge
          variant="neutral"
          className={`border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 ${className}`}
        >
          Insufficient Data
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" className={className}>
          {status}
        </Badge>
      );
  }
}
