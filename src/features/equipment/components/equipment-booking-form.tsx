"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EquipmentListing } from "../types";
import { calculateRentalPricing } from "../pricing";
import { createEquipmentRentalAction } from "../actions";
import { formatNGN } from "@/features/marketplace/constants";
import {
  Calendar,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";

interface EquipmentBookingFormProps {
  equipment: EquipmentListing;
  currentUserId?: string | null;
}

export function EquipmentBookingForm({
  equipment,
  currentUserId,
}: EquipmentBookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Default to tomorrow and day after tomorrow
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const defaultEnd = new Date(tomorrow);
  defaultEnd.setDate(defaultEnd.getDate() + 2);
  const defaultEndDate = defaultEnd.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [handoverNotes, setHandoverNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successRentalId, setSuccessRentalId] = useState<string | null>(null);

  const isOwner = Boolean(currentUserId && currentUserId === equipment.ownerId);
  const isAvailable = equipment.isAvailable && equipment.status === "ACTIVE";

  // Calculate financials client-side for live preview
  let pricing = {
    totalDays: 0,
    totalRentalAmount: 0,
    depositAmount: equipment.cautionDeposit,
    currency: equipment.currency || "NGN",
  };

  const datesValid = startDate && endDate && endDate >= startDate;
  if (datesValid) {
    pricing = calculateRentalPricing(
      equipment.dailyRentalRate,
      equipment.cautionDeposit,
      startDate,
      endDate
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) {
      router.push(`/auth/login?redirectTo=/equipment/${equipment.id}`);
      return;
    }

    if (isOwner) {
      setErrorMessage("You cannot rent your own equipment.");
      return;
    }

    if (!datesValid) {
      setErrorMessage("Please select valid start and end dates.");
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const res = await createEquipmentRentalAction({
        equipmentId: equipment.id,
        startDate,
        endDate,
        handoverNotes: handoverNotes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to submit rental request.");
      } else if (res.data?.rentalId) {
        setSuccessRentalId(res.data.rentalId);
      }
    });
  };

  if (successRentalId) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-base font-bold text-emerald-950">
          Rental Request Submitted!
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-emerald-800">
          Your booking request has been sent to the equipment owner for confirmation.
          Rental ID: <strong className="font-mono text-emerald-900">{successRentalId.slice(0, 8)}</strong>
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/account/equipment-rentals"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-emerald-800 transition min-h-[44px]"
          >
            <span>View My Rentals</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
          <Link
            href="/equipment"
            className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition min-h-[44px]"
          >
            Browse Other Machinery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Booking & Rates
          </span>
          <h3 className="text-lg font-bold text-neutral-900">Request Equipment Rental</h3>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-neutral-900">
            {formatNGN(equipment.dailyRentalRate)}
          </div>
          <div className="text-[11px] text-neutral-500">per calendar day</div>
        </div>
      </div>

      {/* Owner Restriction Notice */}
      {isOwner && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Owner Notice:</strong> You own this equipment. You cannot rent your own machinery.
            Manage this listing in the{" "}
            <Link
              href={`/equipment/owner/${equipment.id}`}
              className="font-semibold underline hover:text-amber-900"
            >
              Owner Console &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Availability Status */}
      {!isAvailable && !isOwner && (
        <div className="mt-4 rounded-lg bg-neutral-100 border border-neutral-200 p-3 text-xs text-neutral-700 flex items-start gap-2">
          <Lock className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
          <div>
            This equipment is currently marked unavailable or undergoing maintenance. You can still check specifications or return later.
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Date Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="date"
                min={minDate}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!isAvailable || isOwner || isPending}
                required
                className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-neutral-50 disabled:text-neutral-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="date"
                min={startDate || minDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!isAvailable || isOwner || isPending}
                required
                className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-xs sm:text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-neutral-50 disabled:text-neutral-400"
              />
            </div>
          </div>
        </div>

        {/* Handover & Field Work Notes */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Handover & Farm Work Notes <span className="font-normal text-neutral-400">(Optional)</span>
          </label>
          <textarea
            rows={2}
            value={handoverNotes}
            onChange={(e) => setHandoverNotes(e.target.value)}
            disabled={!isAvailable || isOwner || isPending}
            placeholder="Specify farm location, acreage to be worked, crop type, or required logistics coordination..."
            className="w-full rounded-lg border border-neutral-300 py-2 px-3 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:bg-neutral-50"
          />
        </div>

        {/* Real-time Pricing Breakdown */}
        {datesValid && (
          <div className="rounded-lg bg-neutral-50 p-4 border border-neutral-200 text-xs space-y-2">
            <div className="flex justify-between text-neutral-600">
              <span>Rental Duration</span>
              <span className="font-semibold text-neutral-900">
                {pricing.totalDays} {pricing.totalDays === 1 ? "day" : "days"}
              </span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Daily Rate &times; {pricing.totalDays} days</span>
              <span className="font-semibold text-neutral-900">
                {formatNGN(pricing.totalRentalAmount)}
              </span>
            </div>
            {equipment.cautionDeposit > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Refundable Caution Deposit
                </span>
                <span className="font-semibold text-neutral-900">
                  {formatNGN(pricing.depositAmount)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-bold text-neutral-900">
              <span>Estimated Total Due</span>
              <span className="text-emerald-700">
                {formatNGN(pricing.totalRentalAmount + pricing.depositAmount)}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 pt-1 leading-normal">
              Caution deposit is held securely in escrow and returned to the renter upon satisfactory machine inspection.
            </p>
          </div>
        )}

        {/* Action Button */}
        {!currentUserId ? (
          <Link
            href={`/auth/login?redirectTo=/equipment/${equipment.id}`}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow transition hover:bg-emerald-800 min-h-[44px]"
          >
            <Lock className="h-4 w-4" />
            <span>Sign In to Request Rental</span>
          </Link>
        ) : isOwner ? (
          <button
            type="button"
            disabled
            className="w-full rounded-lg bg-neutral-100 py-3 text-xs sm:text-sm font-semibold text-neutral-400 cursor-not-allowed border border-neutral-200 min-h-[44px]"
          >
            Own Equipment (Self-Rental Blocked)
          </button>
        ) : !isAvailable ? (
          <button
            type="button"
            disabled
            className="w-full rounded-lg bg-neutral-100 py-3 text-xs sm:text-sm font-semibold text-neutral-400 cursor-not-allowed border border-neutral-200 min-h-[44px]"
          >
            Currently Unavailable
          </button>
        ) : (
          <button
            type="submit"
            disabled={isPending || !datesValid}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 disabled:opacity-50 min-h-[44px]"
          >
            <CreditCard className="h-4 w-4" />
            <span>{isPending ? "Submitting Request..." : "Request Equipment Booking"}</span>
          </button>
        )}
      </form>
    </div>
  );
}
