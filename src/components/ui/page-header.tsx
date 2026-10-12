import * as React from "react";
import { BackButton } from "./back-button";
import { Breadcrumbs, BreadcrumbItem } from "./breadcrumbs";

export interface PageHeaderProps {
  /** Safe fallback URL for back navigation */
  backHref?: string;
  /** Label for back button (default: "Back") */
  backLabel?: string;
  /** Optional breadcrumb hierarchy items */
  breadcrumbs?: BreadcrumbItem[];
  /** Primary title of the page */
  title?: string;
  /** Optional subtitle or description */
  description?: string;
  /** Optional pill or category badge */
  badge?: React.ReactNode;
  /** Optional action buttons on the right side */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  backHref,
  backLabel,
  breadcrumbs,
  title,
  description,
  badge,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`space-y-4 mb-6 sm:mb-8 ${className}`}>
      {/* Top Navigation Row: Back Button & Breadcrumbs */}
      {(backHref || breadcrumbs) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backHref && (
            <BackButton fallbackHref={backHref} label={backLabel} />
          )}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} className="ml-auto" />
          )}
        </div>
      )}

      {/* Main Title Row */}
      {(title || description || actions || badge) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            {badge && <div className="mb-1">{badge}</div>}
            {title && (
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A231E]">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
