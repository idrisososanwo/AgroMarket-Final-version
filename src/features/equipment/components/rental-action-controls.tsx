"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RentalStatus } from "../types";
import { updateRentalStatusAction } from "../actions";
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

interface RentalActionControlsProps {
  rentalId: string;
  currentStatus: RentalStatus;
  userRole: "OWNER" | "RENTER" | "ADMIN";
}

export function RentalActionControls({
  rentalId,
  currentStatus,
  userRole,
}: RentalActionControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [showNotesModal, setShowNotesModal] = useState<RentalStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const executeTransition = (targetStatus: RentalStatus, noteContent?: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await updateRentalStatusAction({
        rentalId,
        status: targetStatus,
        notes: noteContent || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update rental status.");
      } else {
        setShowNotesModal(null);
        setNotes("");
        router.refresh();
      }
    });
  };

  const isOwner = userRole === "OWNER" || userRole === "ADMIN";

  return (
    <div className="space-y-3">
      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Buttons based on canonical role and state */}
      <div className="flex flex-wrap items-center gap-2">
        {/* REQUESTED */}
        {currentStatus === "REQUESTED" && (
          <>
            {isOwner && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => executeTransition("APPROVED")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition min-h-[38px]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isPending ? "Approving..." : "Approve Rental Request"}</span>
              </button>
            )}

            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowNotesModal("CANCELLED")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition min-h-[38px]"
            >
              <XCircle className="h-3.5 w-3.5 text-neutral-500" />
              <span>Decline / Cancel</span>
            </button>
          </>
        )}

        {/* APPROVED */}
        {currentStatus === "APPROVED" && (
          <>
            {isOwner && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setShowNotesModal("ACTIVE")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition min-h-[38px]"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Confirm Handover & Start Rental</span>
              </button>
            )}

            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowNotesModal("CANCELLED")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition min-h-[38px]"
            >
              <XCircle className="h-3.5 w-3.5 text-neutral-500" />
              <span>Cancel Booking</span>
            </button>
          </>
        )}

        {/* ACTIVE */}
        {currentStatus === "ACTIVE" && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowNotesModal("RETURNED")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-800 disabled:opacity-50 transition min-h-[38px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Confirm Equipment Returned</span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowNotesModal("DISPUTED")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50 transition min-h-[38px]"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
              <span>Raise Rental Dispute</span>
            </button>
          </>
        )}

        {/* RETURNED */}
        {currentStatus === "RETURNED" && (
          <>
            {isOwner && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => executeTransition("COMPLETED")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-50 transition min-h-[38px]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{isPending ? "Completing..." : "Complete & Release Deposit"}</span>
              </button>
            )}

            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowNotesModal("DISPUTED")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50 transition min-h-[38px]"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
              <span>Raise Inspection Dispute</span>
            </button>
          </>
        )}

        {/* Terminal or Disputed states */}
        {currentStatus === "COMPLETED" && (
          <span className="text-xs text-neutral-500 italic">
            This rental is complete and settled.
          </span>
        )}

        {currentStatus === "CANCELLED" && (
          <span className="text-xs text-neutral-500 italic">
            This rental was cancelled.
          </span>
        )}

        {currentStatus === "DISPUTED" && (
          <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
            Dispute is under administrative review by AgroMarket Support.
          </span>
        )}
      </div>

      {/* Notes / Reason Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-700" />
              <h4 className="text-base font-bold text-neutral-900">
                {showNotesModal === "ACTIVE"
                  ? "Equipment Handover Notes"
                  : showNotesModal === "RETURNED"
                  ? "Return Inspection Notes"
                  : showNotesModal === "DISPUTED"
                  ? "Dispute Reason & Details"
                  : "Reason for Cancellation"}
              </h4>
            </div>

            <p className="text-xs text-neutral-600">
              {showNotesModal === "ACTIVE"
                ? "Document machine condition, fuel level, meter hours, and operating checklist before dispatch."
                : showNotesModal === "RETURNED"
                ? "Document machine check upon return, implement inspection, and release verification."
                : showNotesModal === "DISPUTED"
                ? "Detail the damages, delays, or contract violations for support mediation."
                : "Please provide a clear reason for cancelling this rental agreement."}
            </p>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes or explanation here..."
              className="w-full rounded-lg border border-neutral-300 p-2.5 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setShowNotesModal(null);
                  setNotes("");
                }}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => executeTransition(showNotesModal, notes)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50 ${
                  showNotesModal === "DISPUTED"
                    ? "bg-rose-700 hover:bg-rose-800"
                    : showNotesModal === "CANCELLED"
                    ? "bg-neutral-800 hover:bg-neutral-900"
                    : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                {isPending ? "Submitting..." : "Confirm & Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
