"use client";

/**
 * AgroMarket Phase 3.3: Intelligence Context Banner Component
 * Displayed when a user navigates to an existing product workflow from an intelligence recommendation.
 * Informs the user of the contextual rationale, provides a link to explainability, and supports dismissal.
 */

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, X, Info, ExternalLink } from "lucide-react";

export interface IntelligenceContextBannerProps {
  commodity?: string | null;
  state?: string | null;
  recommendationId?: string | null;
  customText?: string | null;
  onDismiss?: () => void;
}

export function IntelligenceContextBanner({
  commodity,
  state,
  recommendationId,
  customText,
  onDismiss,
}: IntelligenceContextBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const displayText =
    customText ||
    `You're viewing this page because an AgroMarket intelligence recommendation identified active market pressure${
      commodity ? ` for ${commodity}` : ""
    }${state ? ` in ${state}` : ""}.`;

  const explainUrl = recommendationId
    ? `/my-intelligence?rec=${encodeURIComponent(recommendationId)}`
    : "/my-intelligence";

  return (
    <div
      role="region"
      aria-label="Intelligence Context Notice"
      className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50/90 p-3.5 shadow-sm text-emerald-950 backdrop-blur-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 rounded-full bg-emerald-200/80 p-1 text-emerald-800">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-emerald-900">Intelligence Context: </span>
            <span className="text-emerald-800">{displayText}</span>
            <div className="mt-1.5 flex items-center gap-3">
              <Link
                href={explainUrl}
                className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:text-emerald-950 underline underline-offset-2"
              >
                <Info className="h-3 w-3" />
                Why am I seeing this?
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          type="button"
          aria-label="Dismiss intelligence notice"
          className="rounded p-1 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
