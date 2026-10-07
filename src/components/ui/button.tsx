import * as React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success"
  | "link";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#0F4327] text-white hover:bg-[#14532D] active:bg-[#082615] shadow-sm border border-transparent focus-visible:ring-[#0F4327]",
  secondary:
    "bg-[#16A34A] text-white hover:bg-[#15803D] active:bg-[#166534] shadow-sm border border-transparent focus-visible:ring-[#16A34A]",
  outline:
    "bg-white text-[#1A231E] border border-[#E5E0D5] hover:bg-[#FBF9F4] hover:text-[#0F4327] active:bg-[#F3F0E8] focus-visible:ring-[#0F4327]",
  ghost:
    "bg-transparent text-[#1A231E] hover:bg-[#F3F0E8] hover:text-[#0F4327] focus-visible:ring-[#0F4327]",
  destructive:
    "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] shadow-sm focus-visible:ring-[#DC2626]",
  success:
    "bg-[#15803D] text-white hover:bg-[#166534] active:bg-[#14532D] shadow-sm focus-visible:ring-[#15803D]",
  link: "bg-transparent text-[#0F4327] underline-offset-4 hover:underline p-0 h-auto font-medium focus-visible:ring-[#0F4327]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs rounded",
  sm: "h-8 px-3 text-xs font-medium rounded-md",
  md: "h-10 px-4 text-sm font-medium rounded-md",
  lg: "h-12 px-6 text-base font-semibold rounded-lg",
  icon: "h-9 w-9 p-0 flex items-center justify-center rounded-md",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-sans transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
          VARIANT_CLASSES[variant]
        } ${SIZE_CLASSES[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2 shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2 shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
