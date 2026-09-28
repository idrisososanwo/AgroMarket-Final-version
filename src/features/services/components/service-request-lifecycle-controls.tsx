"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RequestRole,
  ServiceRequestStatus,
  isAuthorizedRequestTransition,
} from "../types";
import { updateServiceRequestStatusAction } from "../actions";
import { ServiceRequestStatusBadge } from "./service-request-status-badge";
import { formatNGN } from "@/features/marketplace/constants";
import {
  CheckCircle,
  XCircle,
  Play,
  AlertTriangle,
  Send,
  Loader2,
  Star,
  ShieldAlert,
} from "lucide-react";

interface ServiceRequestLifecycleControlsProps {
  requestId: string;
  serviceId?: string;
  currentStatus: ServiceRequestStatus;
  userRole: RequestRole;
  quotedAmount?: number | null;
  onStatusUpdated?: (newStatus: ServiceRequestStatus) => void;
  onWriteReview?: () => void;
}

export function ServiceRequestLifecycleControls({
  requestId,
  serviceId,
  currentStatus,
  userRole,
  quotedAmount,
  onStatusUpdated,
  onWriteReview,
}: ServiceRequestLifecycleControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [quoteInput, setQuoteInput] = useState<string>("");
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTransition = (
    targetStatus: ServiceRequestStatus,
    amount?: number
  ) => {
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const result = await updateServiceRequestStatusAction({
          requestId,
          status: targetStatus,
          quotedAmount: amount,
        });

        if (!result.success) {
          setErrorMessage(result.error || "Failed to update status.");
          return;
        }

        setShowQuoteInput(false);
        setQuoteInput("");
        if (onStatusUpdated && result.data?.status) {
          onStatusUpdated(result.data.status);
        } else {
          router.refresh();
        }
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to update status."
        );
      }
    });
  };

  const canCancel = isAuthorizedRequestTransition(userRole, currentStatus, "CANCELLED");
  const canDispute = isAuthorizedRequestTransition(userRole, currentStatus, "DISPUTED");

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-medium">Status:</span>
          <ServiceRequestStatusBadge status={currentStatus} />
        </div>

        {quotedAmount !== null && quotedAmount !== undefined && (
          <div className="text-xs text-neutral-600">
            Quoted:{" "}
            <span className="font-bold text-neutral-900">
              {formatNGN(quotedAmount)}
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Role & Lifecycle Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* PENDING Controls */}
        {currentStatus === "PENDING" && (
          <>
            {userRole === "PROVIDER" && (
              <>
                {!showQuoteInput ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setShowQuoteInput(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors min-h-[44px]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Provide Quote
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 w-full pt-1">
                    <div className="relative flex-1 min-w-[160px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 font-semibold">
                        ₦
                      </span>
                      <input
                        type="number"
                        min="1"
                        placeholder="Quote amount in NGN"
                        value={quoteInput}
                        onChange={(e) => setQuoteInput(e.target.value)}
                        className="w-full rounded-lg border border-neutral-300 pl-7 pr-3 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none min-h-[44px]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isPending || !quoteInput || Number(quoteInput) <= 0}
                      onClick={() => handleTransition("QUOTED", Number(quoteInput))}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors min-h-[44px]"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      Submit Quote
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setShowQuoteInput(false)}
                      className="px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 min-h-[44px]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* QUOTED Controls */}
        {currentStatus === "QUOTED" && (
          <>
            {userRole === "CLIENT" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleTransition("ACCEPTED")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                Accept Quote ({quotedAmount ? formatNGN(quotedAmount) : "Quoted"})
              </button>
            )}
          </>
        )}

        {/* ACCEPTED Controls */}
        {currentStatus === "ACCEPTED" && (
          <>
            {userRole === "PROVIDER" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleTransition("IN_PROGRESS")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-800 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Start Service
              </button>
            )}
          </>
        )}

        {/* IN_PROGRESS Controls */}
        {currentStatus === "IN_PROGRESS" && (
          <>
            {(userRole === "PROVIDER" || userRole === "CLIENT") && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleTransition("COMPLETED")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                Mark Service as Completed
              </button>
            )}
          </>
        )}

        {/* COMPLETED Controls */}
        {currentStatus === "COMPLETED" && (
          <>
            {userRole === "CLIENT" && (
              <>
                {onWriteReview ? (
                  <button
                    type="button"
                    onClick={onWriteReview}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors min-h-[44px]"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                    Write a Review
                  </button>
                ) : serviceId ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/services/${serviceId}#review-form`)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors min-h-[44px]"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                    Write a Review
                  </button>
                ) : null}
              </>
            )}
          </>
        )}

        {/* DISPUTED Admin Controls */}
        {currentStatus === "DISPUTED" && (
          <>
            {userRole === "ADMIN" ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleTransition("COMPLETED")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 min-h-[44px]"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Resolve as Completed
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleTransition("CANCELLED")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 min-h-[44px]"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Resolve as Cancelled
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-3 py-2 rounded-lg border border-rose-200">
                <ShieldAlert className="h-4 w-4" />
                Under Administrative Dispute Review
              </div>
            )}
          </>
        )}

        {/* Dispute Button (Where Permitted) */}
        {canDispute && currentStatus !== "DISPUTED" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm("Are you sure you want to flag this service request as disputed?")) {
                handleTransition("DISPUTED");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Raise Dispute
          </button>
        )}

        {/* Cancel Button (Where Permitted) */}
        {canCancel && currentStatus !== "CANCELLED" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm("Are you sure you want to cancel this service request?")) {
                handleTransition("CANCELLED");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel Request
          </button>
        )}
      </div>
    </div>
  );
}
