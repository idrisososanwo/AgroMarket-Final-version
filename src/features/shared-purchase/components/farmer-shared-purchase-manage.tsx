"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatNGN } from "@/features/marketplace/constants";
import {
  SharedPurchaseDetail,
  SharedPurchaseParticipantDetail,
  SharedPurchaseStatus,
} from "../types";
import { SharedPurchaseProgressBar } from "./shared-purchase-progress-bar";
import {
  transitionSharedPurchaseStatusAction,
  cancelSharedPurchaseAction,
} from "../actions";

interface FarmerSharedPurchaseManageProps {
  pool: SharedPurchaseDetail;
  participants: SharedPurchaseParticipantDetail[];
}

export function FarmerSharedPurchaseManage({
  pool,
  participants,
}: FarmerSharedPurchaseManageProps) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  const handleStatusTransition = async (targetStatus: SharedPurchaseStatus) => {
    setLoadingAction(targetStatus);
    setError(null);

    try {
      const res = await transitionSharedPurchaseStatusAction(pool.id, targetStatus);
      if (!res.success) {
        setError(res.error || "Failed to update pool status.");
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancelPool = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("CANCEL");
    setError(null);

    try {
      const res = await cancelSharedPurchaseAction(pool.id, cancelReason);
      if (!res.success) {
        setError(res.error || "Failed to cancel pool.");
      } else {
        setShowCancelModal(false);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div>
        <Link
          href="/farmer/shared-purchases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Pools
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground">{pool.title}</h1>
            <p className="text-xs text-muted-foreground">
              Manage pool fulfillment, participant statuses, and lifecycle transitions.
            </p>
          </div>

          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
            {pool.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Progress & Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Total Target Value</span>
          <p className="text-xl font-black text-foreground">{formatNGN(pool.totalPrice)}</p>
          <p className="text-[11px] text-muted-foreground">{pool.totalQuantity} {pool.unit} @ {formatNGN(pool.unitPrice)}/{pool.unit}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Allocated Quantity</span>
          <p className="text-xl font-black text-foreground">
            {pool.allocatedQuantity} {pool.unit}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">{pool.progressPercent}% of target committed</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Participants Joined</span>
          <p className="text-xl font-black text-foreground">{participants.length}</p>
          <p className="text-[11px] text-muted-foreground">Target minimum: {pool.targetParticipants}</p>
        </div>
      </div>

      {/* Progress Bar Card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-xs font-bold text-foreground">Commitment Progress</h3>
        <SharedPurchaseProgressBar
          allocatedQuantity={pool.allocatedQuantity}
          totalQuantity={pool.totalQuantity}
          unit={pool.unit}
          progressPercent={pool.progressPercent}
          status={pool.status}
        />
      </div>

      {/* Lifecycle Actions Bar */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-xs font-bold text-foreground">Seller Lifecycle Controls</h3>
        <div className="flex flex-wrap gap-2.5">
          {pool.status === "OPEN" && (
            <button
              type="button"
              onClick={() => handleStatusTransition("PAYMENT_PENDING")}
              disabled={Boolean(loadingAction)}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition"
            >
              {loadingAction === "PAYMENT_PENDING" ? "Updating..." : "Close Pool & Await Final Payments"}
            </button>
          )}

          {(pool.status === "CONFIRMED" || pool.status === "TARGET_REACHED") && (
            <button
              type="button"
              onClick={() => handleStatusTransition("FULFILMENT")}
              disabled={Boolean(loadingAction)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              {loadingAction === "FULFILMENT" ? "Updating..." : "Start Fulfillment / Dispatch Produce"}
            </button>
          )}

          {pool.status === "FULFILMENT" && (
            <button
              type="button"
              onClick={() => handleStatusTransition("COMPLETED")}
              disabled={Boolean(loadingAction)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              {loadingAction === "COMPLETED" ? "Updating..." : "Mark Pool Completed (Delivered)"}
            </button>
          )}

          {pool.status !== "COMPLETED" && pool.status !== "CANCELLED" && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={Boolean(loadingAction)}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
            >
              Cancel Pool & Issue Refunds
            </button>
          )}
        </div>
      </div>

      {/* Participants Table */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Committed Participants ({participants.length})</h3>
          <span className="text-xs text-muted-foreground">Ordered by commitment time</span>
        </div>

        {participants.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No participants have committed shares yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Buyer</th>
                  <th className="px-3 py-2.5">Committed Share</th>
                  <th className="px-3 py-2.5">Amount</th>
                  <th className="px-3 py-2.5">Order #</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Pledged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {participants.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      {p.userName || "Customer"}
                      {p.userPhone ? ` (${p.userPhone})` : ""}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-foreground">
                      {p.sharesCount} {p.unit}
                      {p.portionChoice ? ` • ${p.portionChoice}` : ""}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">
                      {formatNGN(p.shareAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {p.orderNumber || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          p.status === "PAID" || p.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : p.status === "PLEDGED" || p.status === "PAYMENT_PENDING"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground">Cancel Shared Purchase Pool?</h2>
            <p className="text-xs text-muted-foreground">
              Cancelling this pool will automatically process full refunds for all paid participants via the AgroMarket escrow service and release the reserved stock back to your active listing.
            </p>

            <form onSubmit={handleCancelPool} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Cancellation Reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Harvest delayed due to severe weather; insufficient participant turnout."
                  required
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={loadingAction === "CANCEL"}
                  className="w-1/2 rounded-xl border border-border py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Keep Pool Active
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === "CANCEL" || cancelReason.trim().length < 5}
                  className="flex w-1/2 items-center justify-center gap-1.5 rounded-xl bg-destructive py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                >
                  {loadingAction === "CANCEL" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Refunding & Releasing...
                    </>
                  ) : (
                    "Confirm Cancel"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
