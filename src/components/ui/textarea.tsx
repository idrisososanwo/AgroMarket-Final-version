import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error = false, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm text-[#1A231E] placeholder:text-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 ${
          error
            ? "border-rose-500 focus-visible:ring-rose-500"
            : "border-[#E5E0D5] hover:border-neutral-400 focus-visible:ring-[#0F4327] focus-visible:border-[#0F4327]"
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
