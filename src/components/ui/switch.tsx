import * as React from "react";

export interface SwitchProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export function Switch({
  id,
  checked: controlledChecked,
  defaultChecked = false,
  disabled = false,
  label,
  description,
  onChange,
  className = "",
}: SwitchProps) {
  const generatedId = React.useId();
  const switchId = id || generatedId;

  const [internalChecked, setInternalChecked] = React.useState(defaultChecked);
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    const nextState = !isChecked;
    if (!isControlled) {
      setInternalChecked(nextState);
    }
    onChange?.(nextState);
  };

  return (
    <div className={`flex items-start justify-between space-x-3 ${className}`}>
      {(label || description) && (
        <div className="text-sm select-none pr-2">
          {label && (
            <label
              htmlFor={switchId}
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
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={isChecked}
        disabled={disabled}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4327] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          isChecked ? "bg-[#0F4327]" : "bg-neutral-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            isChecked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
