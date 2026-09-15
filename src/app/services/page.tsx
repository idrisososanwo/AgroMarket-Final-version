import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { Wrench, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Agro-Services Hub | AgroMarket",
};

export default async function ServicesWorkspacePage() {
  const user = await requireRole("SERVICE_PROVIDER");

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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Service Provider Console
              </h1>
              <p className="text-xs text-muted-foreground">
                Role authorization verified for: <strong>{user.fullName || user.email}</strong>
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground">
            Welcome to the specialized service directory. Manage your service requests, bookings for soil testing, drone spraying, veterinary support, and agronomic consulting.
          </p>
        </div>
      </div>
    </div>
  );
}
