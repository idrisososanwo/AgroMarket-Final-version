import * as React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "./button";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionText,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-dashed border-[#E5E0D5] bg-[#FBF9F4] ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E5E0D5]/50 text-[#0F4327] mb-4">
        {icon || <FolderOpen className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-bold text-[#1A231E]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-neutral-500 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-5">
          {actionText}
        </Button>
      )}
    </div>
  );
}
