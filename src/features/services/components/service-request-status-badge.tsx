import { ServiceRequestStatus, SERVICE_REQUEST_STATUS_LABELS } from "../types";

interface ServiceRequestStatusBadgeProps {
  status: ServiceRequestStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  ServiceRequestStatus,
  { label: string; badgeClasses: string; dotClasses: string }
> = {
  PENDING: {
    label: SERVICE_REQUEST_STATUS_LABELS.PENDING,
    badgeClasses: "bg-amber-50 text-amber-800 border-amber-200",
    dotClasses: "bg-amber-500",
  },
  QUOTED: {
    label: SERVICE_REQUEST_STATUS_LABELS.QUOTED,
    badgeClasses: "bg-blue-50 text-blue-800 border-blue-200",
    dotClasses: "bg-blue-500",
  },
  ACCEPTED: {
    label: SERVICE_REQUEST_STATUS_LABELS.ACCEPTED,
    badgeClasses: "bg-teal-50 text-teal-800 border-teal-200",
    dotClasses: "bg-teal-500",
  },
  IN_PROGRESS: {
    label: SERVICE_REQUEST_STATUS_LABELS.IN_PROGRESS,
    badgeClasses: "bg-purple-50 text-purple-800 border-purple-200",
    dotClasses: "bg-purple-500",
  },
  COMPLETED: {
    label: SERVICE_REQUEST_STATUS_LABELS.COMPLETED,
    badgeClasses: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClasses: "bg-emerald-500",
  },
  CANCELLED: {
    label: SERVICE_REQUEST_STATUS_LABELS.CANCELLED,
    badgeClasses: "bg-neutral-100 text-neutral-700 border-neutral-200",
    dotClasses: "bg-neutral-400",
  },
  DISPUTED: {
    label: SERVICE_REQUEST_STATUS_LABELS.DISPUTED,
    badgeClasses: "bg-rose-50 text-rose-800 border-rose-200",
    dotClasses: "bg-rose-500",
  },
};

export function ServiceRequestStatusBadge({
  status,
  className = "",
}: ServiceRequestStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badgeClasses} ${className}`}
      aria-label={`Status: ${config.label}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClasses}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
