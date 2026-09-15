"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListingStatus, MarketplaceListing } from "../types";
import { transitionListingStatusAction, updateInventoryAction } from "../actions";

interface SellerInventoryControlsProps {
  listing: MarketplaceListing;
}

export function SellerInventoryControls({ listing }: SellerInventoryControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditingStock, setIsEditingStock] = useState(false);
  const [stockInput, setStockInput] = useState(listing.quantityOnHand.toString());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const val = parseFloat(stockInput);
    if (isNaN(val) || val < 0) {
      setErrorMsg("Quantity must be a non-negative number.");
      return;
    }

    startTransition(async () => {
      const res = await updateInventoryAction(listing.id, val);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to update inventory.");
        return;
      }
      setIsEditingStock(false);
      router.refresh();
    });
  };

  const handleTransition = async (targetStatus: ListingStatus) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await transitionListingStatusAction(listing.id, targetStatus);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to update status.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      {errorMsg && (
        <div className="text-[11px] font-medium text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
          {errorMsg}
        </div>
      )}

      {/* Stock adjustment area */}
      {isEditingStock ? (
        <form onSubmit={handleStockUpdate} className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="any"
            value={stockInput}
            onChange={(e) => setStockInput(e.target.value)}
            className="w-24 rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none"
            placeholder="Quantity"
            required
            autoFocus
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditingStock(false);
              setStockInput(listing.quantityOnHand.toString());
              setErrorMsg(null);
            }}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditingStock(true)}
            className="inline-flex items-center text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Adjust Stock
          </button>
        </div>
      )}

      {/* Status Transition buttons */}
      {listing.status !== "ARCHIVED" && (
        <div className="flex items-center gap-2 pt-1">
          {listing.status === "ACTIVE" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleTransition("PAUSED")}
              className="text-[11px] font-medium text-amber-700 hover:text-amber-800 hover:underline disabled:opacity-50"
            >
              Pause
            </button>
          )}

          {listing.status === "PAUSED" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleTransition("ACTIVE")}
              className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-50"
            >
              Activate
            </button>
          )}

          {listing.status === "OUT_OF_STOCK" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleTransition("ACTIVE")}
              className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-50"
            >
              Set Active
            </button>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm("Are you sure you want to archive this listing? This action cannot be undone.")) {
                handleTransition("ARCHIVED");
              }
            }}
            className="text-[11px] font-medium text-neutral-400 hover:text-rose-600 hover:underline disabled:opacity-50"
          >
            Archive
          </button>
        </div>
      )}
    </div>
  );
}
