"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { deleteListingAction } from "../actions";

interface DeleteListingDialogProps {
  listingId: string;
  listingTitle: string;
  variant?: "table-action" | "danger-card";
  onSuccess?: () => void;
}

export function DeleteListingDialog({
  listingId,
  listingTitle,
  variant = "table-action",
  onSuccess,
}: DeleteListingDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDelete = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await deleteListingAction(listingId);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to remove listing.");
        return;
      }

      setSuccessMessage(
        res.message || "Produce listing has been removed from marketplace."
      );

      // Brief delay so user sees feedback before dialog closes / refreshes
      setTimeout(() => {
        setIsOpen(false);
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      }, 1200);
    });
  };

  return (
    <>
      {/* Trigger Button */}
      {variant === "table-action" ? (
        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setSuccessMessage(null);
            setIsOpen(true);
          }}
          className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-800 transition-colors"
          title="Delete or archive this produce listing"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setSuccessMessage(null);
            setIsOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-100 hover:border-rose-400 transition"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Remove Listing
        </button>
      )}

      {/* Confirmation Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            {/* Header with Alert Icon */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3
                  id="delete-dialog-title"
                  className="text-base font-bold text-neutral-900 leading-snug"
                >
                  Remove Produce Listing
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Are you sure you want to remove &quot;
                  <span className="font-semibold text-neutral-800">
                    {listingTitle}
                  </span>
                  &quot;?
                </p>
              </div>
            </div>

            {/* Explanation of Safe Archive vs Hard Deletion */}
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 leading-relaxed space-y-1.5">
              <p className="font-semibold text-amber-950">Safe Removal Guarantee:</p>
              <ul className="list-disc pl-4 space-y-1 text-amber-900/90 text-[11px]">
                <li>
                  If this listing has <strong>existing buyer orders</strong>, it will be{" "}
                  <strong>safely archived</strong> and delisted from the marketplace to
                  preserve order history and payment receipts.
                </li>
                <li>
                  If <strong>no orders exist</strong>, it will be permanently deleted from
                  the database.
                </li>
              </ul>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                {successMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || Boolean(successMessage)}
                onClick={handleDelete}
                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Confirm Remove"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
