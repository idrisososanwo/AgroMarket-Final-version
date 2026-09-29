import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { getEquipmentById } from "@/features/equipment/queries";
import { OwnerEquipmentForm } from "@/features/equipment/components/owner-equipment-form";
import { OwnerAvailabilityToggle } from "@/features/equipment/components/owner-availability-toggle";
import { Tractor, ArrowLeft, Eye } from "lucide-react";

interface ManageEquipmentPageProps {
  params: Promise<{
    equipmentId: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ManageEquipmentPageProps) {
  const { equipmentId } = await params;
  const equipment = await getEquipmentById(equipmentId);

  return {
    title: equipment
      ? `Manage ${equipment.name} | Equipment Owner Console`
      : "Equipment Not Found | AgroMarket",
  };
}

export default async function ManageEquipmentPage({
  params,
}: ManageEquipmentPageProps) {
  const { equipmentId } = await params;
  const user = await requireAuth();

  const equipment = await getEquipmentById(equipmentId);
  if (!equipment) {
    notFound();
  }

  const isOwner = equipment.ownerId === user.id;
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

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <Tractor className="h-4 w-4" />
              <span>Machinery Configuration</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
              Manage {equipment.name}
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              Update machine specifications, adjust daily rental rates, or change availability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <OwnerAvailabilityToggle
              equipmentId={equipment.id}
              initialAvailable={equipment.isAvailable}
            />

            <Link
              href={`/equipment/${equipment.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition shadow-sm"
              title="View public listing as seen by renters"
            >
              <Eye className="h-3.5 w-3.5 text-neutral-500" />
              <span>Public Page</span>
            </Link>
          </div>
        </div>

        {/* Edit Equipment Form */}
        <OwnerEquipmentForm initialData={equipment} isEditMode={true} />
      </div>
    </div>
  );
}
