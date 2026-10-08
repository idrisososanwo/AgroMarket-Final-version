import React from "react";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import {
  DependencyStrength,
  ConcentrationClassification,
} from "../types";

interface DependencyStatusBadgeProps {
  status: DependencyStrength | ConcentrationClassification | string;
  size?: "sm" | "md";
}

export function DependencyStatusBadge({
  status,
  size = "md",
}: DependencyStatusBadgeProps) {
  let variant: BadgeVariant = "neutral";
  let label = status.replace(/_/g, " ");

  switch (status) {
    case "CRITICAL":
    case "CRITICAL_DEPENDENCY":
      variant = "danger";
      label = "Critical Dependency";
      break;
    case "HIGH":
    case "HIGH_DEPENDENCY":
      variant = "warning";
      label = "High Dependency";
      break;
    case "MODERATE":
    case "CONCENTRATED":
      variant = "amber";
      label = "Concentrated";
      break;
    case "LOW":
    case "NORMAL":
      variant = "growth";
      label = "Normal / Balanced";
      break;
    case "INSUFFICIENT_DATA":
      variant = "neutral";
      label = "Insufficient Data";
      break;
    default:
      variant = "neutral";
      break;
  }

  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  );
}
