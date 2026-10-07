"use client";

/**
 * AgroMarket Phase 3.3: Action Integration Button Component
 * Performs real-time revalidation when required, creates governed action integration record,
 * and navigates to the legitimate existing product workflow.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { ActionResolvedRoute } from "../types";
import { createActionIntegrationAction, revalidateActionDestinationAction } from "../actions";

export interface ActionIntegrationButtonProps {
  recommendationId: string;
  decisionId?: string | null;
  resolvedRoute: ActionResolvedRoute;
  commodity?: string | null;
  state?: string | null;
  className?: string;
}

export function ActionIntegrationButton({
  recommendationId,
  decisionId,
  resolvedRoute,
  commodity,
  state,
  className,
}: ActionIntegrationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);

  const handleActionClick = async () => {
    setLoading(true);
    setStaleWarning(null);

    try {
      // 1. If revalidation is required, check live availability
      if (resolvedRoute.requiresRevalidation) {
        const revalResult = await revalidateActionDestinationAction({
          destinationType: resolvedRoute.destinationType,
          commodity,
          state,
        });

        if (revalResult.success && revalResult.data) {
          if (revalResult.data.status === "UNAVAILABLE" || revalResult.data.status === "STALE") {
            setStaleWarning(revalResult.data.message);
          }
        }
      }

      // 2. Record governed action integration
      await createActionIntegrationAction({
        recommendationId,
        decisionId,
        actionIntent: resolvedRoute.intent,
        destinationType: resolvedRoute.destinationType,
        destinationUrl: resolvedRoute.url,
        contextPayload: {
          recommendationId,
          decisionId,
          commodity,
          state,
          contextBannerText: resolvedRoute.contextBannerText,
        },
      });

      // 3. Navigate to destination route
      router.push(resolvedRoute.url);
    } catch (err) {
      console.warn("Action integration dispatch fallback navigation:", err);
      router.push(resolvedRoute.url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {staleWarning && (
        <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>{staleWarning}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleActionClick}
        disabled={loading}
        className={
          className ||
          "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-800 transition disabled:opacity-60"
        }
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Verifying & Opening...</span>
          </>
        ) : (
          <>
            <span>{resolvedRoute.buttonLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </>
        )}
      </button>
    </div>
  );
}
