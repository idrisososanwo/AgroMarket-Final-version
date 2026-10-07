import * as React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", children, error = false, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={`flex h-10 w-full appearance-none rounded-md border bg-white px-3 py-2 pr-8 text-sm text-[#1A231E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 ${
            error
              ? "border-rose-500 focus-visible:ring-rose-500"
              : "border-[#E5E0D5] hover:border-neutral-400 focus-visible:ring-[#0F4327] focus-visible:border-[#0F4327]"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 h-4 w-4 text-neutral-400"
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = "Select";
