"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  processSettlementAction,
  retrySettlementAction,
  evaluateSettlementEligibilityAction,
} from "../actions";

interface AdminSettlementRowProps {
  settlementId: string;
  orderId: string;
  status: string;
}

export function AdminSettlementRowActions({
  settlementId,
  orderId,
  status,
}: AdminSettlementRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProcess = () => {
    if (!confirm("Are you sure you want to disburse and settle this payout to the seller's account?")) {
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await processSettlementAction(settlementId);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to process settlement.");
        return;
      }
      router.refresh();
    });
  };

  const handleRetry = () => {
    if (!confirm("Retry disbursement for this failed settlement?")) {
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await retrySettlementAction(settlementId);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to retry settlement.");
        return;
      }
      router.refresh();
    });
  };

  const handleEvaluate = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await evaluateSettlementEligibilityAction(orderId);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to evaluate eligibility.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {errorMsg && (
        <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
          {errorMsg}
        </span>
      )}
      <div className="flex items-center gap-2">
        {status === "ELIGIBLE" && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleProcess}
            className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition shadow-sm"
          >
            {isPending ? "Processing..." : "Disburse Payout"}
          </button>
        )}

        {status === "FAILED" && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleRetry}
            className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition"
          >
            {isPending ? "Retrying..." : "Retry Disbursement"}
          </button>
        )}

        {status === "PENDING" && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleEvaluate}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition"
          >
            {isPending ? "Checking..." : "Re-check Eligibility"}
          </button>
        )}
      </div>
    </div>
  );
}
