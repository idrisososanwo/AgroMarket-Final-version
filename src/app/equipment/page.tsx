import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { Cog, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Equipment Leasing Console | AgroMarket",
};

export default async function EquipmentWorkspacePage() {
  const user = await requireRole("EQUIPMENT_OWNER");

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/account"
          className="inline-flex items-center text-xs font-medium text-primary-700 hover:text-primary-800"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Account
        </Link>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
              <Cog className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Equipment Owner Console
              </h1>
              <p className="text-xs text-muted-foreground">
                Role authorization verified for: <strong>{user.fullName || user.email}</strong>
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground">
            Welcome to the equipment rental management portal. List your tractors, planters, combine harvesters, and boom sprayers for lease to verified farmers.
          </p>
        </div>
      </div>
    </div>
  );
}
