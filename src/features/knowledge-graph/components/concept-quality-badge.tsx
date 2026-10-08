"use client";

import React from "react";
import { KnowledgeQualityStatus } from "../types";
import { QUALITY_STATUS_LABELS } from "../constants";

interface ConceptQualityBadgeProps {
  status: KnowledgeQualityStatus;
  className?: string;
}

export function ConceptQualityBadge({ status, className = "" }: ConceptQualityBadgeProps) {
  const config = QUALITY_STATUS_LABELS[status] || {
    label: status,
    badgeClass: "bg-gray-100 text-gray-700 border-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.badgeClass} ${className}`}
    >
      {config.label}
    </span>
  );
}
