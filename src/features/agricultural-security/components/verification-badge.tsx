import React from "react";
import { CheckCircle2, AlertCircle, FileClock, ShieldCheck, History } from "lucide-react";
import { SecurityVerificationStatus } from "../types";
import { VERIFICATION_STATUS_LABELS, VERIFICATION_STATUS_COLORS } from "../constants";

interface VerificationBadgeProps {
  status: SecurityVerificationStatus;
  className?: string;
}

export function VerificationBadge({ status, className = "" }: VerificationBadgeProps) {
  const config = VERIFICATION_STATUS_COLORS[status] || VERIFICATION_STATUS_COLORS.REPORTED;
  const label = VERIFICATION_STATUS_LABELS[status] || status;

  const renderIcon = () => {
    switch (status) {
      case "OFFICIAL":
        return <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />;
      case "VERIFIED":
        return <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />;
      case "REPORTED":
        return <FileClock className="w-3.5 h-3.5 mr-1 text-amber-600" />;
      case "CORRECTED":
        return <AlertCircle className="w-3.5 h-3.5 mr-1 text-purple-600" />;
      case "ARCHIVED":
        return <History className="w-3.5 h-3.5 mr-1 text-gray-500" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 mr-1 text-gray-500" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {renderIcon()}
      {label}
    </span>
  );
}
