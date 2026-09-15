"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transitionOrderStatusAction } from "../actions";

interface OrderCancelButtonProps {
  orderId: string;
}

export function OrderCancelButton({ orderId }: OrderCancelButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCancel = () => {
    if (!confirm("Are you sure you want to cancel this order? This will release reserved inventory back to the seller.")) {
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await transitionOrderStatusAction(orderId, "CANCELLED");
      if (!res.success) {
        setErrorMsg(res.error || "Failed to cancel order.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      {errorMsg && (
        <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
          {errorMsg}
        </div>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={handleCancel}
        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition"
      >
        {isPending ? "Cancelling Order..." : "Cancel Order"}
      </button>
    </div>
  );
}
