import { JobStatus } from "../types";

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; badgeClasses: string; dotClasses: string }
> = {
  DRAFT: {
    label: "Draft",
    badgeClasses: "bg-neutral-100 text-neutral-700 border-neutral-200",
    dotClasses: "bg-neutral-400",
  },
  ACTIVE: {
    label: "Active",
    badgeClasses: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClasses: "bg-emerald-500",
  },
  PAUSED: {
    label: "Paused",
    badgeClasses: "bg-amber-50 text-amber-800 border-amber-200",
    dotClasses: "bg-amber-500",
  },
  CLOSED: {
    label: "Closed",
    badgeClasses: "bg-rose-50 text-rose-800 border-rose-200",
    dotClasses: "bg-rose-500",
  },
};

export function JobStatusBadge({ status, className = "" }: JobStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badgeClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClasses}`} />
      {config.label}
    </span>
  );
}
