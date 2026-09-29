import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getUserRentals } from "@/features/equipment/queries";
import { RentalStatusBadge } from "@/features/equipment/components/rental-status-badge";
import { RentalActionControls } from "@/features/equipment/components/rental-action-controls";
import { formatNGN } from "@/features/marketplace/constants";
import {
  Tractor,
  ArrowLeft,
  Calendar,
  MapPin,
  ShieldCheck,
  CreditCard,
  FileText,
  Star,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Equipment Rentals | AgroMarket",
  description: "Track your machinery bookings, coordinate field handovers, and manage rental agreements.",
};

export default async function AccountEquipmentRentalsPage() {
  await requireAuth();
  const rentals = await getUserRentals();

  return (
    <div className="min-h-screen bg-neutral-50/70 pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/account"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Account
        </Link>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <Tractor className="h-4 w-4" />
              <span>Farm Mechanization & Rentals</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
              My Equipment Rentals
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              Track your agricultural machinery bookings, monitor approvals, and coordinate machine returns.
            </p>
          </div>

          <Link
            href="/equipment"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px] shrink-0"
          >
            Browse Machinery Catalog
          </Link>
        </div>

        {/* Rentals List or Empty State */}
        {rentals.length > 0 ? (
          <div className="space-y-6">
            {rentals.map((rental) => (
              <div
                key={rental.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm space-y-4"
              >
                {/* Header: Equipment title, status & rental ID */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-neutral-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-400">
                        REF: {rental.id.slice(0, 8)}
                      </span>
                      <RentalStatusBadge status={rental.status} />
                    </div>
                    <Link
                      href={`/equipment/${rental.equipmentId}`}
                      className="text-base sm:text-lg font-bold text-neutral-900 hover:text-emerald-700 transition-colors line-clamp-1"
                    >
                      {rental.equipment?.name || "Machinery Hire Agreement"}
                    </Link>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-neutral-900">
                      {formatNGN(rental.totalRentalAmount + rental.depositAmount)}
                    </div>
                    <div className="text-[11px] text-neutral-500">Total Commitment</div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Dates */}
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <span className="text-neutral-500 font-medium flex items-center gap-1 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                      Rental Schedule
                    </span>
                    <div className="font-semibold text-neutral-900">
                      {rental.startDate} &rarr; {rental.endDate}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {rental.totalDays} {rental.totalDays === 1 ? "day" : "days"} hire duration
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <span className="text-neutral-500 font-medium flex items-center gap-1 mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-neutral-400" />
                      Cost Breakdown
                    </span>
                    <div className="font-semibold text-neutral-900">
                      Rate: {formatNGN(rental.dailyRate)} / day
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Deposit: {formatNGN(rental.depositAmount)} (Refundable)
                    </div>
                  </div>

                  {/* Location & Machine Base */}
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <span className="text-neutral-500 font-medium flex items-center gap-1 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      Machinery Base
                    </span>
                    <div className="font-semibold text-neutral-900">
                      {rental.equipment?.locationLga || "Registered LGA"},{" "}
                      {rental.equipment?.locationState || "Nigeria"}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {rental.equipment?.operatorIncluded
                        ? "Operator Included"
                        : "Self-Operate"}
                    </div>
                  </div>
                </div>

                {/* Handover & Field Notes */}
                {rental.handoverNotes && (
                  <div className="rounded-lg bg-neutral-50/80 border border-neutral-100 p-3 text-xs text-neutral-700 space-y-1">
                    <span className="font-semibold text-neutral-900 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-neutral-500" />
                      Handover / Farm Notes:
                    </span>
                    <p className="whitespace-pre-line pl-4.5">{rental.handoverNotes}</p>
                  </div>
                )}

                {/* Return Notes */}
                {rental.returnNotes && (
                  <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3 text-xs text-emerald-950 space-y-1">
                    <span className="font-semibold flex items-center gap-1 text-emerald-800">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Return Inspection Notes:
                    </span>
                    <p className="whitespace-pre-line pl-4.5 text-emerald-900">
                      {rental.returnNotes}
                    </p>
                  </div>
                )}

                {/* Footer Controls & Review Action */}
                <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-4">
                  {/* Canonical Lifecycle Controls */}
                  <RentalActionControls
                    rentalId={rental.id}
                    currentStatus={rental.status}
                    userRole="RENTER"
                  />

                  {/* Review Button for Returned or Completed Rentals */}
                  {(rental.status === "RETURNED" || rental.status === "COMPLETED") && (
                    <Link
                      href="/account/reviews"
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition shadow-sm"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      <span>Rate & Review Equipment</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Tractor className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900">
              No equipment rentals yet
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              You haven&apos;t placed any machinery bookings. Mechanize your farm operations by renting verified tractors, planters, or harvesters from nearby equipment owners.
            </p>
            <div className="mt-6">
              <Link
                href="/equipment"
                className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-sm min-h-[44px]"
              >
                Explore Available Equipment
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
