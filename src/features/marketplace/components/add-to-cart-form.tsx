"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addToCartAction } from "@/features/cart/actions";

interface AddToCartFormProps {
  listingId: string;
  unit: string;
  minimumOrderQuantity: number;
  quantityAvailable: number;
}

export function AddToCartForm({
  listingId,
  unit,
  minimumOrderQuantity,
  quantityAvailable,
}: AddToCartFormProps) {
  const [quantity, setQuantity] = useState<number>(minimumOrderQuantity);
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOutOfStock = quantityAvailable <= 0;

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      const res = await addToCartAction({
        listingId,
        quantity,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to add produce to cart.");
        return;
      }

      setSuccessMessage(`Added ${quantity} ${unit} to your cart.`);
    });
  };

  if (isOutOfStock) {
    return (
      <button
        type="button"
        disabled
        className="w-full rounded-lg bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-500 cursor-not-allowed text-center"
      >
        Currently Out of Stock
      </button>
    );
  }

  return (
    <form onSubmit={handleAddToCart} className="space-y-4">
      {errorMessage && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-1.5">
          <svg className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold">
            <svg className="h-4 w-4 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            {successMessage}
          </div>
          <Link
            href="/cart"
            className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            View Cart & Checkout &rarr;
          </Link>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-neutral-700 mb-1">
          Purchase Quantity ({unit})
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={minimumOrderQuantity}
            max={quantityAvailable}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(minimumOrderQuantity, parseInt(e.target.value, 10) || minimumOrderQuantity))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            required
          />
          <span className="text-xs text-neutral-500 whitespace-nowrap">
            (Max: {quantityAvailable})
          </span>
        </div>
        <p className="text-[11px] text-neutral-400 mt-1">
          Minimum Order: {minimumOrderQuantity} {unit}
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50 transition"
      >
        {isPending ? "Adding to Cart..." : "Add to Cart"}
      </button>

      <div className="text-center pt-1">
        <Link
          href="/cart"
          className="text-xs text-neutral-600 hover:text-emerald-700 font-medium transition"
        >
          View Active Shopping Cart
        </Link>
      </div>
    </form>
  );
}
