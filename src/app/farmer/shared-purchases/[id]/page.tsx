import { notFound, redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/server";
import {
  getSharedPurchaseById,
  getSharedPurchaseParticipants,
} from "@/features/shared-purchase/queries";
import { FarmerSharedPurchaseManage } from "@/features/shared-purchase/components/farmer-shared-purchase-manage";

interface FarmerSharedPurchaseManagePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Manage Shared Pool | AgroMarket Farmer Dashboard",
};

export default async function FarmerSharedPurchaseManagePage({
  params,
}: FarmerSharedPurchaseManagePageProps) {
  const user = await requireAnyRole(["FARMER", "ADMIN"]);
  const { id } = await params;

  const pool = await getSharedPurchaseById(id);
  if (!pool) {
    notFound();
  }

  // Authorization: must be pool creator or admin
  if (pool.createdBy !== user.id && !user.roles.includes("ADMIN")) {
    redirect("/farmer/shared-purchases");
  }

  const participants = await getSharedPurchaseParticipants(id);

  return (
    <div className="container mx-auto px-4 py-8">
      <FarmerSharedPurchaseManage pool={pool} participants={participants} />
    </div>
  );
}
