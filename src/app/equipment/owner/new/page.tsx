import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { OwnerEquipmentForm } from "@/features/equipment/components/owner-equipment-form";
import { Tractor, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "List New Machinery | AgroMarket Equipment",
  description: "Register a tractor, combine harvester, planter, or farm equipment for lease.",
};

export default async function NewEquipmentPage() {
  await requireAnyRole(["EQUIPMENT_OWNER", "ADMIN"]);

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

        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <Tractor className="h-4 w-4" />
            <span>Fleet Expansion</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
            List Machinery for Rental
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-600">
            Add your agricultural equipment to the verified national leasing directory. Set your daily rates, caution deposit, and operator options.
          </p>
        </div>

        {/* Equipment Form */}
        <OwnerEquipmentForm isEditMode={false} />
      </div>
    </div>
  );
}
