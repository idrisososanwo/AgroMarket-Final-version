import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { getRentalById } from "@/features/equipment/queries";
import { RentalStatusBadge } from "@/features/equipment/components/rental-status-badge";
import { RentalActionControls } from "@/features/equipment/components/rental-action-controls";
import { formatNGN } from "@/features/marketplace/constants";
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface OwnerRentalDetailPageProps {
  params: Promise<{
    rentalId: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: OwnerRentalDetailPageProps) {
  const { rentalId } = await params;
  return {
    title: `Rental Request ${rentalId.slice(0, 8)} | Equipment Owner Console`,
  };
}

export default async function OwnerRentalDetailPage({
  params,
}: OwnerRentalDetailPageProps) {
  const { rentalId } = await params;
  const user = await requireAuth();

  const rental = await getRentalById(rentalId);
  if (!rental) {
    notFound();
  }

  const isOwner = rental.ownerId === user.id;
  const isAdmin = hasRole(user.roles, "ADMIN");

  if (!isOwner && !isAdmin) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-50/70 pb-16 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/equipment/owner"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Owner Console
        </Link>

        {/* Agreement Header */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-neutral-400">
                  RENTAL AGREEMENT #{rental.id.slice(0, 8)}
                </span>
                <RentalStatusBadge status={rental.status} />
              </div>
              <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
                {rental.equipment?.name || "Machinery Rental"}
              </h1>
            </div>

            <div className="text-right">
              <div className="text-xl font-extrabold text-neutral-900">
                {formatNGN(rental.totalRentalAmount + rental.depositAmount)}
              </div>
              <div className="text-xs text-neutral-500">Total Commitment</div>
            </div>
          </div>
        </div>

        {/* Action Controls Card */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm space-y-3">
          <div className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
            Lifecycle & Booking Actions
          </div>
          <p className="text-xs text-emerald-850 text-neutral-600">
            Transition this agreement according to machinery handover, inspection, and return stages.
          </p>
          <RentalActionControls
            rentalId={rental.id}
            currentStatus={rental.status}
            userRole="OWNER"
          />
        </div>

        {/* Schedule & Financial Breakdown */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-700" />
            Rental Schedule & Financial Terms
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-lg bg-neutral-50 p-3">
              <span className="text-neutral-500 font-medium">Rental Period</span>
              <div className="mt-1 font-bold text-neutral-900 text-sm">
                {rental.startDate} &rarr; {rental.endDate}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {rental.totalDays} calendar days
              </div>
            </div>

            <div className="rounded-lg bg-neutral-50 p-3">
              <span className="text-neutral-500 font-medium">Rental Income</span>
              <div className="mt-1 font-bold text-emerald-700 text-sm">
                {formatNGN(rental.totalRentalAmount)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {formatNGN(rental.dailyRate)} / day &times; {rental.totalDays} days
              </div>
            </div>

            <div className="rounded-lg bg-neutral-50 p-3">
              <span className="text-neutral-500 font-medium">Escrow Caution Deposit</span>
              <div className="mt-1 font-bold text-neutral-900 text-sm">
                {formatNGN(rental.depositAmount)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Held in escrow until return inspection
              </div>
            </div>
          </div>
        </div>

        {/* Renter Contact & Field Coordinates (Authorized for active rental coordination) */}
        {rental.renter && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100 flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-700" />
              Renter Coordination Details
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                {rental.renter.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rental.renter.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover ring-1 ring-neutral-200"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    {rental.renter.fullName?.charAt(0) || "R"}
                  </div>
                )}
                <div>
                  <div className="font-bold text-sm text-neutral-900">
                    {rental.renter.fullName || "Registered Farmer / Renter"}
                  </div>
                  {rental.renter.phone && (
                    <div className="text-neutral-600 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-neutral-400" />
                      <span>{rental.renter.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-neutral-500 text-[11px] bg-neutral-50 p-2.5 rounded-lg max-w-sm">
                Renter details are provided exclusively for dispatch, machinery handover, and operating coordination.
              </div>
            </div>
          </div>
        )}

        {/* Handover & Field Notes */}
        {rental.handoverNotes && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-2">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-700" />
              Renter Farm Notes & Dispatch Request
            </h2>
            <p className="text-xs sm:text-sm text-neutral-700 whitespace-pre-line leading-relaxed pl-6">
              {rental.handoverNotes}
            </p>
          </div>
        )}

        {/* Return Inspection Notes */}
        {rental.returnNotes && (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-2">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Machine Return & Inspection Record
            </h2>
            <p className="text-xs sm:text-sm text-neutral-700 whitespace-pre-line leading-relaxed pl-6">
              {rental.returnNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
