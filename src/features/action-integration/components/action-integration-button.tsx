"use client";

/**
 * AgroMarket Phase 3.3: Action Integration Button Component
 * Performs real-time revalidation when required, creates governed action integration record,
 * and navigates to the legitimate existing product workflow.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
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
  const [governanceBlock, setGovernanceBlock] = useState<string | null>(null);

  const handleActionClick = async () => {
    setLoading(true);
    setStaleWarning(null);
    setGovernanceBlock(null);

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

      // 2. Record governed action integration (enforces server-side governance gate)
      const actionResult = await createActionIntegrationAction({
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

      if (!actionResult.success) {
        setGovernanceBlock(actionResult.error || "Action blocked under AgroMarket governance policy.");
        return;
      }

      // 3. Navigate to destination route on permitted action
      router.push(resolvedRoute.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected governance gate failure.";
      setGovernanceBlock(msg);
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

      {governanceBlock && (
        <div className="flex items-start gap-1.5 text-xs text-red-900 bg-red-50 p-2.5 rounded-lg border border-red-200">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <strong className="block font-semibold">Governance Policy Notice:</strong>
            <span>{governanceBlock}</span>
          </div>
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
            <span>Evaluating Policy Gate...</span>
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

