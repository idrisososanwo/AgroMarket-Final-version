import { requireAuth } from "@/lib/auth/server";
import { getUserParticipations } from "@/features/shared-purchase/queries";
import { UserSharedPurchaseList } from "@/features/shared-purchase/components/user-shared-purchase-list";

import { BackButton, Breadcrumbs } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Shared Purchases | AgroMarket Account",
};

export default async function AccountSharedPurchasesPage() {
  const user = await requireAuth();
  const participations = await getUserParticipations(user.id);

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation Bar: BackButton & Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton
            fallbackHref="/account"
            label="Back to Account"
          />
          <Breadcrumbs
            homeHref="/"
            items={[
              { label: "Account", href: "/account" },
              { label: "My Shared Purchases" },
            ]}
          />
        </div>

        <UserSharedPurchaseList participations={participations} />
      </div>
    </div>
  );
}
