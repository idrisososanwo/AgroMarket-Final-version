"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  ArrowRight,
  CreditCard,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatNGN } from "@/features/marketplace/constants";
import { SharedPurchaseParticipantDetail } from "../types";
import {
  initializeSharedPurchasePaymentAction,
  cancelParticipationAction,
} from "../actions";

interface UserSharedPurchaseListProps {
  participations: Array<
    SharedPurchaseParticipantDetail & {
      pool?: {
        id: string;
        title: string;
        status: string;
        deadline: string;
        unit: string;
        hubState: string;
        hubLga: string;
      };
    }
  >;
}

export function UserSharedPurchaseList({ participations }: UserSharedPurchaseListProps) {
  const router = useRouter();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePayNow = async (participantId: string) => {
    setLoadingId(participantId);
    setError(null);

    try {
      const res = await initializeSharedPurchasePaymentAction(participantId, "PAYSTACK");
      if (!res.success || !res.data) {
        setError(res.error || "Failed to initialize payment gateway.");
        setLoadingId(null);
        return;
      }

      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to open payment gateway.");
      setLoadingId(null);
    }
  };

  const handleCancelPledge = async (participantId: string) => {
    if (!confirm("Are you sure you want to release your committed share?")) {
      return;
    }

    setLoadingId(participantId);
    setError(null);

    try {
      const res = await cancelParticipationAction(participantId);
      if (!res.success) {
        setError(res.error || "Failed to cancel pledge.");
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel pledge.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">My Shared Purchases</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Track your commitments, payment statuses, and fulfillment updates across group pools.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {participations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Layers className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-bold text-foreground">No Participations Yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Browse our open shared pools to split bulk grains, tubers, or livestock at direct wholesale prices.
          </p>
          <Link
            href="/shared-purchases"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            Explore Open Pools
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {participations.map((part) => {
            const isUnpaid = part.status === "PLEDGED" || part.status === "PAYMENT_PENDING";
            const isLoading = loadingId === part.id;

            return (
              <div key={part.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        part.status === "PAID" || part.status === "CONFIRMED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : isUnpaid
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {part.status}
                    </span>
                    {part.orderNumber && (
                      <span className="text-xs text-muted-foreground">Order #{part.orderNumber}</span>
                    )}
                  </div>

                  <h3 className="font-bold text-foreground text-sm">
                    <Link
                      href={`/shared-purchases/${part.sharedPurchaseId}`}
                      className="hover:text-primary transition"
                    >
                      {part.sharesCount} {part.unit}
                      {part.portionChoice ? ` (${part.portionChoice})` : ""}
                    </Link>
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Total Amount: <strong className="text-foreground">{formatNGN(part.shareAmount)}</strong> • Pledged on {new Date(part.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isUnpaid && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePayNow(part.id)}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5" />
                        )}
                        Pay {formatNGN(part.shareAmount)}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCancelPledge(part.id)}
                        disabled={isLoading}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {part.orderId && (
                    <Link
                      href={`/account/orders/${part.orderId}`}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition"
                    >
                      View Order
                    </Link>
                  )}

                  <Link
                    href={`/shared-purchases/${part.sharedPurchaseId}`}
                    className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition"
                  >
                    View Pool
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
