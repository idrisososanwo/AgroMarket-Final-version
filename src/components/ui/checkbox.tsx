import * as React from "react";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, description, id, checked, disabled, onChange, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={`flex items-start space-x-2.5 ${className}`}>
        <div className="relative flex items-center justify-center pt-0.5">
          <input
            type="checkbox"
            ref={ref}
            id={inputId}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer h-4 w-4 shrink-0 rounded border border-[#E5E0D5] text-[#0F4327] accent-[#0F4327] focus:ring-2 focus:ring-[#0F4327] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="text-sm select-none">
            {label && (
              <label
                htmlFor={inputId}
                className={`font-medium text-[#1A231E] cursor-pointer ${
                  disabled ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";
