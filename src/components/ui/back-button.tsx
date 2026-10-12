"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  fallbackLabel?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "subtle";
  ariaLabel?: string;
}

/**
 * Robust, context-aware BackButton.
 *
 * 1. Renders a standard accessible Next.js Link pointing to `fallbackHref` so right-click,
 *    middle-click, crawlers, and SSR all have a valid URL.
 * 2. On click, checks whether the browser has safe in-app history (same origin referrer).
 *    If safe in-app history exists, invokes `router.back()` to preserve search terms,
 *    filter state, or scroll position.
 * 3. If direct entry (bookmark, new tab, external referrer), navigates to `fallbackHref`
 *    so the user is never stranded on a blank page or navigated outside AgroMarket.
 */
export function BackButton({
  fallbackHref = "/",
  label,
  fallbackLabel,
  className = "",
  variant = "default",
  ariaLabel,
}: BackButtonProps) {
  const router = useRouter();
  const displayLabel = fallbackLabel || label || "Back";

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      const isSameOriginReferrer =
        Boolean(referrer) &&
        referrer.startsWith(window.location.origin) &&
        referrer !== window.location.href;

      if (isSameOriginReferrer && window.history.length > 1) {
        e.preventDefault();
        router.back();
        return;
      }
    }
    // Allow normal Next.js Link navigation to fallbackHref
  };

  const variantStyles = {
    default:
      "bg-white border border-[#E5E0D5] text-[#1A231E] hover:bg-[#FBF9F4] hover:text-[#0F4327] hover:border-[#0F4327]/40 shadow-xs",
    outline:
      "border border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 shadow-xs",
    ghost:
      "text-neutral-600 hover:text-[#0F4327] hover:bg-neutral-100/80",
    subtle:
      "bg-neutral-100/80 text-neutral-700 hover:bg-neutral-200/80 hover:text-[#0F4327]",
  }[variant];

  return (
    <Link
      href={fallbackHref}
      onClick={handleClick}
      aria-label={ariaLabel || displayLabel}
      className={`group inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4327] ${variantStyles} ${className}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5" />
      <span>{displayLabel}</span>
    </Link>
  );
}
