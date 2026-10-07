import * as React from "react";

export type CardVariant = "default" | "elevated" | "interactive" | "dark" | "bordered";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const CARD_VARIANTS: Record<CardVariant, string> = {
  default: "bg-white border border-[#E5E0D5] text-[#1A231E] shadow-sm",
  bordered: "bg-white border-2 border-[#E5E0D5] text-[#1A231E]",
  elevated: "bg-white border border-[#E5E0D5] text-[#1A231E] shadow-md",
  interactive:
    "bg-white border border-[#E5E0D5] text-[#1A231E] shadow-sm hover:shadow-md hover:border-[#16A34A] transition-all duration-200 cursor-pointer",
  dark: "bg-[#0F4327] border border-[#14532D] text-white shadow-md",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-xl overflow-hidden ${CARD_VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 p-5 md:p-6 ${className}`}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = "", ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-lg md:text-xl font-bold leading-tight tracking-tight text-inherit ${className}`}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = "", ...props }, ref) => (
  <p
    ref={ref}
    className={`text-xs md:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed ${className}`}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div ref={ref} className={`p-5 md:p-6 pt-0 ${className}`} {...props} />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center p-5 md:p-6 pt-0 border-t border-[#F0ECE3] mt-2 ${className}`}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
