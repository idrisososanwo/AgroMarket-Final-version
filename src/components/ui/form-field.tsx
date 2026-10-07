import * as React from "react";

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  helperText,
  required = false,
  className = "",
  children,
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center">
          <label
            htmlFor={htmlFor}
            className="block text-xs font-semibold uppercase tracking-wider text-[#1A231E]"
          >
            {label}
            {required && <span className="text-rose-600 ml-1" aria-hidden="true">*</span>}
          </label>
        </div>
      )}
      {children}
      {error && (
        <p className="text-xs text-rose-600 font-medium" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-xs text-neutral-500 leading-normal">{helperText}</p>
      )}
    </div>
  );
}
