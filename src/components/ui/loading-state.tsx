import * as React from "react";
import { Loader2 } from "lucide-react";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const SPINNER_SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({
  size = "md",
  label,
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center gap-2 text-[#0F4327] ${className}`}>
      <Loader2 className={`animate-spin ${SPINNER_SIZES[size]}`} aria-hidden="true" />
      {label && <span className="text-xs font-medium text-neutral-600">{label}</span>}
    </div>
  );
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#E5E0D5]/60 ${className}`}
      {...props}
    />
  );
}
