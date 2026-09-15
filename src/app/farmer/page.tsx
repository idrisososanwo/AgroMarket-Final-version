import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { Tractor, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Farmer Workspace | AgroMarket",
};

export default async function FarmerWorkspacePage() {
  const user = await requireRole("FARMER");

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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <Tractor className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Farmer Workspace
              </h1>
              <p className="text-xs text-muted-foreground">
                Role authorization verified for: <strong>{user.fullName || user.email}</strong>
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground">
            Welcome to your producer dashboard. Here you manage your registered farms, crop production cycles, and wholesale produce listings.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/farmer/listings"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-emerald-600 hover:bg-emerald-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Listings & Stock</div>
                <p className="text-xs text-neutral-500 mt-1">
                  View and edit your published produce offerings and warehouse stock.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-700">
                Go to Listings &rarr;
              </div>
            </Link>

            <Link
              href="/farmer/orders"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-emerald-600 hover:bg-emerald-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Incoming Orders</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Track buyer bookings, reserved inventory, and dispatch readiness.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-700">
                View Orders &rarr;
              </div>
            </Link>

            <Link
              href="/farmer/settlements"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-emerald-600 hover:bg-emerald-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Settlements & Payouts</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Track escrow releases, fulfillment holds, and net bank payouts.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-700">
                View Settlements &rarr;
              </div>
            </Link>

            <Link
              href="/farmer/disputes"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-emerald-600 hover:bg-emerald-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Disputes & Claims</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Respond to buyer claims regarding damage, shortage, or grade quality.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-700">
                Manage Disputes &rarr;
              </div>
            </Link>

            <Link
              href="/farmer/market-intelligence"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-emerald-600 hover:bg-emerald-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">Market Intelligence & Trends</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Observed wholesale prices across Nigerian states, 30-day trends, and baseline demand signals.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-700">
                View Price Intelligence &rarr;
              </div>
            </Link>

            <Link
              href="/farmer/listings/new"
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition hover:border-emerald-600 hover:bg-emerald-50/20"
            >
              <div>
                <div className="text-sm font-bold text-neutral-900">+ New Listing</div>
                <p className="text-xs text-neutral-500 mt-1">
                  Publish fresh grains, tubers, vegetables, or livestock.
                </p>
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-700">
                New Listing &rarr;
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
