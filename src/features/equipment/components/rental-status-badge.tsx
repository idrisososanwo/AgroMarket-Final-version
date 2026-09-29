import { RentalStatus, RENTAL_STATUS_LABELS } from "../types";
import {
  Clock,
  CheckCircle2,
  Play,
  RotateCcw,
  CheckCheck,
  Ban,
  AlertTriangle,
} from "lucide-react";

interface RentalStatusBadgeProps {
  status: RentalStatus;
  className?: string;
}

export function RentalStatusBadge({ status, className = "" }: RentalStatusBadgeProps) {
  const label = RENTAL_STATUS_LABELS[status] || status;

  switch (status) {
    case "REQUESTED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 ${className}`}
        >
          <Clock className="h-3 w-3 text-amber-600" />
          {label}
        </span>
      );
    case "APPROVED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200 ${className}`}
        >
          <CheckCircle2 className="h-3 w-3 text-blue-600" />
          {label}
        </span>
      );
    case "ACTIVE":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 ${className}`}
        >
          <Play className="h-3 w-3 text-emerald-600 fill-emerald-600" />
          {label}
        </span>
      );
    case "RETURNED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200 ${className}`}
        >
          <RotateCcw className="h-3 w-3 text-purple-600" />
          {label}
        </span>
      );
    case "COMPLETED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800 border border-green-200 ${className}`}
        >
          <CheckCheck className="h-3 w-3 text-green-600" />
          {label}
        </span>
      );
    case "CANCELLED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 border border-neutral-200 ${className}`}
        >
          <Ban className="h-3 w-3 text-neutral-500" />
          {label}
        </span>
      );
    case "DISPUTED":
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 border border-rose-200 ${className}`}
        >
          <AlertTriangle className="h-3 w-3 text-rose-600" />
          {label}
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 border border-neutral-200 ${className}`}
        >
          {status}
        </span>
      );
  }
}
