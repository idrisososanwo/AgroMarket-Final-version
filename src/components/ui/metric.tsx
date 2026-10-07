import * as React from "react";
import { Card, CardContent } from "./card";
import { TrendIndicator, TrendDirection } from "./trend-indicator";

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    direction: TrendDirection;
    value: string | number;
    label?: string;
  };
  description?: string;
  icon?: React.ReactNode;
  variant?: "default" | "dark" | "bordered";
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  trend,
  description,
  icon,
  variant = "default",
  className = "",
}: MetricCardProps) {
  const isDark = variant === "dark";

  return (
    <Card
      variant={isDark ? "dark" : variant === "bordered" ? "bordered" : "default"}
      className={className}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between space-x-2">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? "text-emerald-300" : "text-neutral-500"
            }`}
          >
            {label}
          </span>
          {icon && (
            <span
              className={`p-2 rounded-lg ${
                isDark ? "bg-[#14532D] text-emerald-200" : "bg-[#FBF9F4] text-[#0F4327] border border-[#E5E0D5]"
              }`}
            >
              {icon}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-baseline space-x-2">
          <span
            className={`text-2xl md:text-3xl font-extrabold tracking-tight font-mono tabular-nums ${
              isDark ? "text-white" : "text-[#1A231E]"
            }`}
          >
            {value}
          </span>
          {unit && (
            <span
              className={`text-xs font-medium ${
                isDark ? "text-emerald-200/80" : "text-neutral-500"
              }`}
            >
              {unit}
            </span>
          )}
        </div>

        {(trend || description) && (
          <div className="mt-3 flex items-center justify-between text-xs">
            {trend && (
              <TrendIndicator
                direction={trend.direction}
                value={trend.value}
                label={trend.label}
              />
            )}
            {description && (
              <span
                className={`${isDark ? "text-slate-300" : "text-neutral-500"} truncate`}
              >
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
