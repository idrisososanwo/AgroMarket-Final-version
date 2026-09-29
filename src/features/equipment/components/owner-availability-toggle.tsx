"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleEquipmentAvailabilityAction } from "../actions";
import { CheckCircle2, XCircle } from "lucide-react";

interface OwnerAvailabilityToggleProps {
  equipmentId: string;
  initialAvailable: boolean;
}

export function OwnerAvailabilityToggle({
  equipmentId,
  initialAvailable,
}: OwnerAvailabilityToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAvailable, setIsAvailable] = useState(initialAvailable);

  const handleToggle = () => {
    const nextState = !isAvailable;
    setIsAvailable(nextState);

    startTransition(async () => {
      const res = await toggleEquipmentAvailabilityAction({
        equipmentId,
        isAvailable: nextState,
      });

      if (!res.success) {
        setIsAvailable(!nextState); // Revert on failure
        alert(res.error || "Failed to update availability");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition border ${
        isAvailable
          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
          : "bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200"
      }`}
      title={isAvailable ? "Click to mark as unavailable" : "Click to mark as available"}
    >
      {isAvailable ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Available</span>
        </>
      ) : (
        <>
          <XCircle className="h-3.5 w-3.5 text-neutral-500" />
          <span>Unavailable</span>
        </>
      )}
    </button>
  );
}
