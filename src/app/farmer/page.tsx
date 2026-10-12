import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { getSellerListings } from "@/features/marketplace/queries";
import { getSellerOrdersResult } from "@/features/orders/queries";
import { createClient } from "@/lib/supabase/server";
import { formatNGN } from "@/features/marketplace/constants";
import { DeleteListingDialog } from "@/features/marketplace/components/delete-listing-dialog";
import {
  Tractor,
  PlusCircle,
  Package,
  TrendingUp,
  ShoppingBag,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Farmer Workspace | AgroMarket",
  description: "Farm producer overview, produce listings, stock management, and incoming buyer orders.",
};

export default async function FarmerWorkspacePage() {
  const user = await requireRole("FARMER");
  const supabase = await createClient();

  const [listings, ordersResult, { data: profile }] = await Promise.all([
    getSellerListings(user.id),
    getSellerOrdersResult(user.id),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  const orders = ordersResult.orders || [];

  // Metrics
  const totalListings = listings.length;
  const activeListings = listings.filter((l) => l.status === "ACTIVE");
  const activeCount = activeListings.length;
  const totalAvailableStock = activeListings.reduce((acc, l) => acc + l.quantityAvailable, 0);
  const pendingOrders = orders.filter(
    (o) => o.status === "PENDING" || o.status === "CONFIRMED"
  );
  const completedOrders = orders.filter((o) => o.status === "DELIVERED");
  const totalSettledRevenue = completedOrders.reduce((acc, o) => acc + o.totalPrice, 0);

  const recentListings = listings.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#FBF9F4] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Workspace Mode Switcher Banner (Multi-Role Friendly) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Tractor className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Active Mode: Farmer Workspace
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Seller
                </span>
              </div>
              <p className="text-xs text-neutral-600">
                You are currently in the Farm Business Management Console.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 transition"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-neutral-500" />
              Switch to Shopping Mode
            </Link>
            <Link
              href="/farmer/listings/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F4327] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#165a36] transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Produce
            </Link>
          </div>
        </div>

        {/* Welcome & Farm Profile Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
              Welcome back, {profile?.full_name || user.email?.split("@")[0]}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              {profile?.state ? `${profile.state}, Nigeria` : "Nigeria"} • Farm Business Dashboard
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              Verified Agricultural Producer
            </span>
          </div>
        </div>

        {/* Primary Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Produce */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-xs font-semibold">Active in Marketplace</span>
              <Package className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-3 text-3xl font-black text-neutral-900">{activeCount}</div>
            <div className="mt-1 text-xs text-neutral-500">
              {totalListings} total registered offerings
            </div>
          </div>

          {/* Available Stock Units */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-xs font-semibold">Available Stock</span>
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-3 text-3xl font-black text-emerald-700">{totalAvailableStock}</div>
            <div className="mt-1 text-xs text-neutral-500">Unreserved physical produce</div>
          </div>

          {/* Pending Orders to Dispatch */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-xs font-semibold">Pending Orders</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-3 text-3xl font-black text-amber-600">{pendingOrders.length}</div>
            <div className="mt-1 text-xs text-neutral-500">Awaiting packing or delivery</div>
          </div>

          {/* Total Revenue */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-xs font-semibold">Fulfilled Sales</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-3 text-2xl font-black text-neutral-900">
              {formatNGN(totalSettledRevenue)}
            </div>
            <div className="mt-1 text-xs text-neutral-500">From delivered buyer orders</div>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/farmer/listings"
            className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition hover:border-emerald-600 hover:shadow-sm"
          >
            <div>
              <div className="text-sm font-bold text-neutral-900">Produce & Inventory</div>
              <p className="text-xs text-neutral-500 mt-1">
                Manage harvest stock, edit pricing, and delist or archive produce.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-emerald-700 flex items-center gap-1">
              Manage Listings <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          <Link
            href="/farmer/orders"
            className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition hover:border-emerald-600 hover:shadow-sm"
          >
            <div>
              <div className="text-sm font-bold text-neutral-900">Incoming Orders</div>
              <p className="text-xs text-neutral-500 mt-1">
                View customer orders, verify dispatch readiness, and confirm pickup.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-emerald-700 flex items-center gap-1">
              View Orders ({pendingOrders.length}) <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          <Link
            href="/farmer/settlements"
            className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition hover:border-emerald-600 hover:shadow-sm"
          >
            <div>
              <div className="text-sm font-bold text-neutral-900">Earnings & Payouts</div>
              <p className="text-xs text-neutral-500 mt-1">
                Track escrow payments, delivery releases, and bank transfer payouts.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-emerald-700 flex items-center gap-1">
              View Settlements <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          <Link
            href="/farmer/market-intelligence"
            className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs transition hover:border-emerald-600 hover:shadow-sm"
          >
            <div>
              <div className="text-sm font-bold text-neutral-900">Market Intelligence</div>
              <p className="text-xs text-neutral-500 mt-1">
                Monitor commodity price trends, regional harvest supply, and demand signals.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-emerald-700 flex items-center gap-1">
              View Insights <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        </div>

        {/* Two-Column Section: Recent Listings & Pending Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (7 cols): Recent Listings */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">My Active Produce</h2>
              <Link
                href="/farmer/listings"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                View all ({totalListings}) &rarr;
              </Link>
            </div>

            {recentListings.length > 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs divide-y divide-neutral-100 overflow-hidden">
                {recentListings.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-neutral-50/50 transition">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-neutral-900 text-sm truncate">{item.title}</h3>
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          {item.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {item.productName} • {formatNGN(item.pricePerUnit)} / {item.unit} • Stock: {item.quantityAvailable} {item.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-xs">
                      <Link
                        href={`/farmer/listings/${item.id}/edit`}
                        className="font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1"
                      >
                        Edit
                      </Link>
                      <DeleteListingDialog
                        listingId={item.id}
                        listingTitle={item.title}
                        variant="table-action"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center shadow-xs">
                <p className="text-xs text-neutral-500">You haven&apos;t added any produce yet.</p>
                <Link
                  href="/farmer/listings/new"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0F4327] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#165a36]"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Add Your First Produce
                </Link>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Pending Orders */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">Pending Orders to Dispatch</h2>
              <Link
                href="/farmer/orders"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                View all &rarr;
              </Link>
            </div>

            {pendingOrders.length > 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs divide-y divide-neutral-100 overflow-hidden">
                {pendingOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="p-4 space-y-2 hover:bg-neutral-50/50 transition">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 text-xs font-mono">
                        Order #{order.orderId.slice(0, 8)}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-700">
                      <strong>{order.productName}</strong> • {order.quantity} {order.unit}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Value: {formatNGN(order.totalPrice)}</span>
                      <Link
                        href={`/farmer/orders`}
                        className="font-semibold text-emerald-700 hover:text-emerald-900"
                      >
                        Manage Dispatch &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-xs">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                <h3 className="text-sm font-bold text-neutral-900">All orders dispatched</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  You have no pending orders waiting for fulfillment right now.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Tools Grid */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-neutral-900 mb-4">Additional Agricultural Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/farmer/disputes"
              className="rounded-xl border border-neutral-200 p-4 hover:border-emerald-600 transition"
            >
              <div className="font-bold text-sm text-neutral-900">Disputes & Claims</div>
              <p className="text-xs text-neutral-500 mt-1">
                Resolve buyer claims, inspection holds, or shipping damage reports.
              </p>
            </Link>
            <Link
              href="/farmer/shared-purchases"
              className="rounded-xl border border-neutral-200 p-4 hover:border-emerald-600 transition"
            >
              <div className="font-bold text-sm text-neutral-900">Bulk Shared Purchases</div>
              <p className="text-xs text-neutral-500 mt-1">
                List whole animals or grain tonnage for multi-buyer crowd purchases.
              </p>
            </Link>
            <Link
              href="/equipment"
              className="rounded-xl border border-neutral-200 p-4 hover:border-emerald-600 transition"
            >
              <div className="font-bold text-sm text-neutral-900">Rent Farm Machinery</div>
              <p className="text-xs text-neutral-500 mt-1">
                Find available tractors, combine harvesters, and sprayers nearby.
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
