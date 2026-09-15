import { requireAuth } from "@/lib/auth/server";
import { getUserParticipations } from "@/features/shared-purchase/queries";
import { UserSharedPurchaseList } from "@/features/shared-purchase/components/user-shared-purchase-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Shared Purchases | AgroMarket Account",
};

export default async function AccountSharedPurchasesPage() {
  const user = await requireAuth();
  const participations = await getUserParticipations(user.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <UserSharedPurchaseList participations={participations} />
    </div>
  );
}
