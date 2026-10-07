import * as React from "react";
import { Search } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", error = false, leftAddon, rightAddon, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftAddon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-neutral-400">
            {leftAddon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          disabled={disabled}
          className={`flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-[#1A231E] placeholder:text-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 ${
            error
              ? "border-rose-500 focus-visible:ring-rose-500"
              : "border-[#E5E0D5] hover:border-neutral-400 focus-visible:ring-[#0F4327] focus-visible:border-[#0F4327]"
          } ${leftAddon ? "pl-9" : ""} ${rightAddon ? "pr-9" : ""} ${className}`}
          {...props}
        />
        {rightAddon && (
          <div className="absolute right-3 flex items-center pointer-events-none text-neutral-400">
            {rightAddon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface SearchInputProps extends Omit<InputProps, "leftAddon" | "type"> {
  placeholder?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ placeholder = "Search AgroMarket...", className = "", ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        placeholder={placeholder}
        leftAddon={<Search className="h-4 w-4" />}
        className={className}
        {...props}
      />
    );
  }
);
SearchInput.displayName = "SearchInput";
