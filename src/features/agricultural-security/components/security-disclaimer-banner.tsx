import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { SECURITY_DISCLAIMER_TEXT } from "../constants";

interface SecurityDisclaimerBannerProps {
  className?: string;
  variant?: "warning" | "info";
}

export function SecurityDisclaimerBanner({
  className = "",
  variant = "warning",
}: SecurityDisclaimerBannerProps) {
  const isWarning = variant === "warning";

  return (
    <div
      role="region"
      aria-label="Security and Safety Disclaimer"
      className={`rounded-xl border p-4 sm:p-5 flex items-start gap-3 sm:gap-4 shadow-sm ${
        isWarning
          ? "border-amber-300 bg-amber-50/80 text-amber-950"
          : "border-blue-200 bg-blue-50/80 text-blue-950"
      } ${className}`}
    >
      <div className="shrink-0 mt-0.5">
        {isWarning ? (
          <ShieldAlert className="w-5 h-5 text-amber-700" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-blue-700" />
        )}
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
          Decision Support & Safety Notice
        </h4>
        <p className="text-xs sm:text-sm leading-relaxed text-amber-900/90 font-medium">
          {SECURITY_DISCLAIMER_TEXT}
        </p>
      </div>
    </div>
  );
}
