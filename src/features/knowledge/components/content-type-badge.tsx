import { KnowledgeContentType, CONTENT_TYPE_LABELS } from "../types";
import {
  Newspaper,
  GraduationCap,
  Landmark,
  BookOpen,
  Calendar,
  HeartPulse,
} from "lucide-react";

interface ContentTypeBadgeProps {
  type: KnowledgeContentType;
  size?: "sm" | "md";
}

export function ContentTypeBadge({ type, size = "sm" }: ContentTypeBadgeProps) {
  const label = CONTENT_TYPE_LABELS[type] || type;

  const config: Record<
    KnowledgeContentType,
    { bg: string; text: string; ring: string; icon: typeof Newspaper }
  > = {
    NEWS: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      ring: "ring-emerald-600/20",
      icon: Newspaper,
    },
    EXPERT_ADVICE: {
      bg: "bg-blue-50",
      text: "text-blue-800",
      ring: "ring-blue-600/20",
      icon: GraduationCap,
    },
    GOVERNMENT_UPDATE: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      ring: "ring-amber-600/20",
      icon: Landmark,
    },
    TRAINING: {
      bg: "bg-purple-50",
      text: "text-purple-800",
      ring: "ring-purple-600/20",
      icon: BookOpen,
    },
    EVENT: {
      bg: "bg-indigo-50",
      text: "text-indigo-800",
      ring: "ring-indigo-600/20",
      icon: Calendar,
    },
    FOOD_HEALTH: {
      bg: "bg-rose-50",
      text: "text-rose-800",
      ring: "ring-rose-600/20",
      icon: HeartPulse,
    },
  };

  const current = config[type] || config.NEWS;
  const Icon = current.icon;

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[11px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ring-1 ring-inset ${current.bg} ${current.text} ${current.ring} ${sizeClasses}`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{label}</span>
    </span>
  );
}
