import React from "react";
import { CommitmentReadinessStatus } from "../types";
import { Badge } from "@/components/ui/badge";

interface ReadinessStatusBadgeProps {
  status: CommitmentReadinessStatus;
  className?: string;
}

export function ReadinessStatusBadge({
  status,
  className = "",
}: ReadinessStatusBadgeProps) {
  switch (status) {
    case "NOT_READY":
      return (
        <Badge
          variant="neutral"
          className={`border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 ${className}`}
        >
          Not Ready
        </Badge>
      );
    case "READY_FOR_AGGREGATION":
      return (
        <Badge
          variant="info"
          className={`border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 ${className}`}
        >
          Ready: Aggregation
        </Badge>
      );
    case "READY_FOR_PROCESSING":
      return (
        <Badge
          variant="info"
          className={`border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 ${className}`}
        >
          Ready: Processing
        </Badge>
      );
    case "READY_FOR_LOGISTICS":
      return (
        <Badge
          variant="info"
          className={`border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 ${className}`}
        >
          Ready: Logistics
        </Badge>
      );
    case "IN_FULFILMENT":
      return (
        <Badge
          variant="warning"
          className={`border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 animate-pulse ${className}`}
        >
          In Fulfilment
        </Badge>
      );
    case "FULFILLED":
      return (
        <Badge
          variant="success"
          className={`border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 ${className}`}
        >
          Fulfilled
        </Badge>
      );
    case "PARTIALLY_FULFILLED":
      return (
        <Badge
          variant="warning"
          className={`border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/30 ${className}`}
        >
          Partially Fulfilled
        </Badge>
      );
    case "FAILED":
      return (
        <Badge
          variant="danger"
          className={`border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 ${className}`}
        >
          Fulfilment Failed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge
          variant="neutral"
          className={`border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/40 ${className}`}
        >
          Cancelled
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
