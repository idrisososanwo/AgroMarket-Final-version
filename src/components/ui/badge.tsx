import * as React from "react";

export type BadgeVariant =
  | "primary"
  | "growth"
  | "clay"
  | "amber"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export type DomainStatus =
  | "VERIFIED"
  | "PENDING"
  | "ACTIVE"
  | "COMPLETED"
  | "PROCESSING"
  | "DISRUPTED"
  | "REVIEW_REQUIRED"
  | "INSUFFICIENT_DATA";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
  dot?: boolean;
}

const BADGE_VARIANTS: Record<BadgeVariant, { container: string; dot: string }> = {
  primary: {
    container: "bg-[#F0FDF4] text-[#0F4327] border-[#BBF7D0]",
    dot: "bg-[#0F4327]",
  },
  growth: {
    container: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]",
    dot: "bg-[#16A34A]",
  },
  clay: {
    container: "bg-[#FBECE5] text-[#9A3412] border-[#F6C6B0]",
    dot: "bg-[#C26732]",
  },
  amber: {
    container: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
    dot: "bg-[#E59500]",
  },
  success: {
    container: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  warning: {
    container: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  danger: {
    container: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-500",
  },
  info: {
    container: "bg-sky-50 text-sky-800 border-sky-200",
    dot: "bg-sky-500",
  },
  neutral: {
    container: "bg-neutral-100 text-neutral-700 border-neutral-200",
    dot: "bg-neutral-400",
  },
};

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[11px] gap-1",
  md: "px-2.5 py-0.5 text-xs gap-1.5",
  lg: "px-3 py-1 text-sm gap-2",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "neutral", size = "md", dot = false, children, ...props }, ref) => {
    const config = BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral;

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full border font-medium select-none tracking-tight ${config.container} ${SIZE_CLASSES[size]} ${className}`}
        {...props}
      >
        {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dot}`} aria-hidden="true" />}
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

const DOMAIN_STATUS_MAP: Record<
  DomainStatus,
  { label: string; variant: BadgeVariant }
> = {
  VERIFIED: { label: "Verified", variant: "primary" },
  PENDING: { label: "Pending", variant: "warning" },
  ACTIVE: { label: "Active", variant: "growth" },
  COMPLETED: { label: "Completed", variant: "success" },
  PROCESSING: { label: "Processing", variant: "info" },
  DISRUPTED: { label: "Disrupted", variant: "danger" },
  REVIEW_REQUIRED: { label: "Review Required", variant: "clay" },
  INSUFFICIENT_DATA: { label: "Insufficient Data", variant: "neutral" },
};

export interface DomainStatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: DomainStatus;
}

export function DomainStatusBadge({
  status,
  className = "",
  size = "md",
  dot = true,
  ...props
}: DomainStatusBadgeProps) {
  const config = DOMAIN_STATUS_MAP[status] || DOMAIN_STATUS_MAP.INSUFFICIENT_DATA;

  return (
    <Badge variant={config.variant} size={size} dot={dot} className={className} {...props}>
      {config.label}
    </Badge>
  );
}
