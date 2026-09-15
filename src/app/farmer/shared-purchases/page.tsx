import { requireAnyRole } from "@/lib/auth/server";
import { getFarmerSharedPurchases } from "@/features/shared-purchase/queries";
import { FarmerSharedPurchaseList } from "@/features/shared-purchase/components/farmer-shared-purchase-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Shared Purchases | AgroMarket Farmer Dashboard",
};

export default async function FarmerSharedPurchasesPage() {
  const user = await requireAnyRole(["FARMER", "ADMIN"]);
  const pools = await getFarmerSharedPurchases(user.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <FarmerSharedPurchaseList pools={pools} />
    </div>
  );
}
