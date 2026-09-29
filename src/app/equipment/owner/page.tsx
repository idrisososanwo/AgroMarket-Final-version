import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { getOwnerEquipment, getOwnerRentals } from "@/features/equipment/queries";
import { OwnerAvailabilityToggle } from "@/features/equipment/components/owner-availability-toggle";
import { RentalStatusBadge } from "@/features/equipment/components/rental-status-badge";
import { formatNGN } from "@/features/marketplace/constants";
import {
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_CONDITION_LABELS,
} from "@/features/equipment/types";
import {
  Tractor,
  PlusCircle,
  Clock,
  Calendar,
  MapPin,
  ArrowRight,
  Settings,
  Eye,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Equipment Owner Console | AgroMarket",
  description: "Manage your farm machinery fleet, review rental requests, and track leasing income.",
};

export default async function EquipmentOwnerDashboardPage() {
  const user = await requireAnyRole(["EQUIPMENT_OWNER", "ADMIN"]);

  const [equipmentList, rentalsList] = await Promise.all([
    getOwnerEquipment(),
    getOwnerRentals(),
  ]);

  const pendingRequests = rentalsList.filter((r) => r.status === "REQUESTED");
  const activeRentals = rentalsList.filter((r) => r.status === "ACTIVE");
  const availableCount = equipmentList.filter((e) => e.isAvailable && e.status === "ACTIVE").length;

  return (
    <div className="min-h-screen bg-neutral-50/70 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
          <Link href="/account" className="hover:text-neutral-900 transition-colors">
            Account
          </Link>
          <span>/</span>
          <Link href="/equipment" className="hover:text-neutral-900 transition-colors">
            Equipment
          </Link>
          <span>/</span>
          <span className="text-emerald-700">Owner Console</span>
        </div>

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <Tractor className="h-4 w-4" />
              <span>Machinery Fleet Management</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Equipment Owner Console
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-600">
              Welcome, <strong>{user.fullName || user.email}</strong>. Manage your machinery listings, confirm farmer bookings, and coordinate equipment dispatches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/equipment"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition min-h-[44px]"
            >
              <Eye className="h-4 w-4 text-neutral-500" />
              <span>Public Catalog</span>
            </Link>
            <Link
              href="/equipment/owner/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition min-h-[44px]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>List New Equipment</span>
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-medium text-neutral-500">Total Machinery</span>
            <div className="mt-2 text-2xl font-bold text-neutral-900">{equipmentList.length}</div>
            <span className="text-[11px] text-neutral-400">In registered fleet</span>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-medium text-neutral-500">Available for Hire</span>
            <div className="mt-2 text-2xl font-bold text-emerald-700">{availableCount}</div>
            <span className="text-[11px] text-emerald-600">Active & ready</span>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-medium text-neutral-500">Pending Requests</span>
            <div className="mt-2 text-2xl font-bold text-amber-700">{pendingRequests.length}</div>
            <span className="text-[11px] text-amber-600">Requires owner action</span>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-medium text-neutral-500">Active Rentals</span>
            <div className="mt-2 text-2xl font-bold text-blue-700">{activeRentals.length}</div>
            <span className="text-[11px] text-blue-600">Currently in the field</span>
          </div>
        </div>

        {/* Pending Rental Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-bold text-amber-950">
                  Pending Rental Requests ({pendingRequests.length})
                </h2>
              </div>
              <span className="text-xs text-amber-800">
                Action required: review and approve or decline farmer bookings
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((rental) => (
                <div
                  key={rental.id}
                  className="rounded-lg border border-amber-200/80 bg-white p-4 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-neutral-400">
                        REF: {rental.id.slice(0, 8)}
                      </span>
                      <RentalStatusBadge status={rental.status} />
                    </div>
                    <h3 className="font-bold text-sm text-neutral-900 mt-1 line-clamp-1">
                      {rental.equipment?.name || "Machinery Rental"}
                    </h3>
                    <div className="mt-1 text-xs text-neutral-600 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{rental.startDate} &rarr; {rental.endDate} ({rental.totalDays} days)</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-emerald-800">
                      Amount: {formatNGN(rental.totalRentalAmount)} (+ {formatNGN(rental.depositAmount)} deposit)
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs text-neutral-500">
                      Renter: {rental.renter?.fullName || "Verified Farmer"}
                    </span>
                    <Link
                      href={`/equipment/owner/rentals/${rental.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                    >
                      <span>Review Request</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Equipment Fleet List */}
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900">
              My Machinery Fleet ({equipmentList.length})
            </h2>
            <Link
              href="/equipment/owner/new"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Add Equipment</span>
            </Link>
          </div>

          {equipmentList.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {equipmentList.map((item) => (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                        {EQUIPMENT_CATEGORY_LABELS[item.category] || item.category}
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                        {EQUIPMENT_CONDITION_LABELS[item.condition] || item.condition}
                      </span>
                      {item.operatorIncluded && (
                        <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          Operator Included
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-neutral-900">
                      {item.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                        {item.locationLga}, {item.locationState} State
                      </span>
                      <span>
                        Daily Rate: <strong className="text-neutral-900">{formatNGN(item.dailyRentalRate)}</strong>
                      </span>
                      <span>
                        Deposit: <strong className="text-neutral-900">{formatNGN(item.cautionDeposit)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:self-center">
                    <OwnerAvailabilityToggle
                      equipmentId={item.id}
                      initialAvailable={item.isAvailable}
                    />

                    <Link
                      href={`/equipment/owner/${item.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition min-h-[36px]"
                    >
                      <Settings className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Manage</span>
                    </Link>

                    <Link
                      href={`/equipment/${item.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition min-h-[36px]"
                      title="View public listing"
                    >
                      <Eye className="h-3.5 w-3.5 text-neutral-500" />
                      <span>View</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                <Tractor className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-neutral-900">
                No machinery listed yet
              </h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                Start earning rental income from your tractors, planters, sprayers, and harvesters.
              </p>
              <div className="mt-5">
                <Link
                  href="/equipment/owner/new"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>List Your First Machine</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* All Rental Activity History */}
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900">
              Rental History & Activity ({rentalsList.length})
            </h2>
          </div>

          {rentalsList.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {rentalsList.map((rental) => (
                <div
                  key={rental.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neutral-400">
                        REF: {rental.id.slice(0, 8)}
                      </span>
                      <RentalStatusBadge status={rental.status} />
                    </div>
                    <div className="font-bold text-neutral-900 text-sm">
                      {rental.equipment?.name || "Equipment Rental"}
                    </div>
                    <div className="text-neutral-500">
                      Renter: <strong>{rental.renter?.fullName || "Farmer"}</strong> • {rental.startDate} to {rental.endDate} ({rental.totalDays} days)
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="font-bold text-neutral-900 text-sm">
                        {formatNGN(rental.totalRentalAmount)}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Deposit: {formatNGN(rental.depositAmount)}
                      </div>
                    </div>

                    <Link
                      href={`/equipment/owner/rentals/${rental.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-semibold text-neutral-700 hover:bg-neutral-50 transition min-h-[36px]"
                    >
                      <span>Manage Agreement</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-neutral-500">
              No rental activity recorded yet. When farmers book your machinery, requests will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
