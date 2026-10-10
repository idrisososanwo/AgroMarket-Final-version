import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { signOutAction } from "@/features/auth/actions";
import { EditProfileForm } from "@/features/auth/components/edit-profile-form";
import { createClient } from "@/lib/supabase/server";
import { getSellerListings } from "@/features/marketplace/queries";
import { getSellerOrdersResult, getBuyerOrdersResult } from "@/features/orders/queries";
import { UserRole } from "@/types/auth";
import {
  User,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Sparkles,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  PlusCircle,
  Tractor,
  ShoppingCart,
  Package,
  CreditCard,
  TrendingUp,
  Wrench,
  Building2,
  Layers,
  Search,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account Dashboard & Workspaces | AgroMarket",
  description: "Role-aware agricultural dashboard, workspace switcher, and profile settings.",
};

const ROLE_DISPLAY_NAMES: Record<UserRole, { label: string; icon: string; description: string }> = {
  FARMER: {
    label: "Farmer / Producer",
    icon: "🌱",
    description: "Manage farm harvest listings, inventory, and wholesale buyer orders.",
  },
  BUYER: {
    label: "Buyer / Customer",
    icon: "🛒",
    description: "Source fresh farm produce, track purchases, and manage orders.",
  },
  EQUIPMENT_OWNER: {
    label: "Equipment Owner",
    icon: "🚜",
    description: "Lease machinery fleets, manage availability, and review rentals.",
  },
  BUSINESS: {
    label: "Agribusiness & Off-taker",
    icon: "🏢",
    description: "Commercial off-taking, bulk aggregation, and agricultural jobs.",
  },
  JOB_SEEKER: {
    label: "Agricultural Talent",
    icon: "💼",
    description: "Explore farm work, placement opportunities, and agronomy roles.",
  },
  SERVICE_PROVIDER: {
    label: "Service Provider",
    icon: "🔧",
    description: "Veterinary, extension, spraying, and post-harvest services.",
  },
  EXPERT: {
    label: "Agricultural Expert",
    icon: "🎓",
    description: "Agronomic advisory, crop pathology, and farmer training.",
  },
  ADMIN: {
    label: "Platform Admin",
    icon: "⚡",
    description: "System governance, dispute arbitration, and audit controls.",
  },
};

interface AccountPageProps {
  searchParams?: Promise<{
    role?: string;
  }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const user = await requireAuth();

  // If user hasn't completed onboarding, direct them to complete it
  if (!user.isOnboarded) {
    redirect("/onboarding");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const requestedRole = resolvedParams.role as UserRole | undefined;

  // Determine active role from trusted user.roles
  let activeRole: UserRole = "BUYER";
  if (requestedRole && user.roles.includes(requestedRole)) {
    activeRole = requestedRole;
  } else if (user.roles.includes("FARMER")) {
    activeRole = "FARMER";
  } else if (user.roles.includes("EQUIPMENT_OWNER")) {
    activeRole = "EQUIPMENT_OWNER";
  } else if (user.roles.includes("BUSINESS")) {
    activeRole = "BUSINESS";
  } else if (user.roles.includes("ADMIN")) {
    activeRole = "ADMIN";
  } else if (user.roles.length > 0) {
    activeRole = user.roles[0];
  }

  const supabase = await createClient();
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Contextual data fetching based on active role
  let farmerStats = { totalListings: 0, activeListings: 0, pendingOrders: 0 };
  let buyerStats = { totalOrders: 0, pendingOrders: 0 };

  if (activeRole === "FARMER" || user.roles.includes("FARMER")) {
    const [listings, sellerOrdersRes] = await Promise.all([
      getSellerListings(user.id),
      getSellerOrdersResult(user.id),
    ]);
    const sellerOrders = sellerOrdersRes.orders || [];
    farmerStats = {
      totalListings: listings.length,
      activeListings: listings.filter((l) => l.status === "ACTIVE").length,
      pendingOrders: sellerOrders.filter(
        (o) => o.status === "PENDING" || o.status === "CONFIRMED"
      ).length,
    };
  }

  if (activeRole === "BUYER" || user.roles.includes("BUYER")) {
    const buyerOrdersRes = await getBuyerOrdersResult(user.id);
    const buyerOrders = buyerOrdersRes.orders || [];
    buyerStats = {
      totalOrders: buyerOrders.length,
      pendingOrders: buyerOrders.filter(
        (o) => o.status === "PENDING" || o.status === "PAID" || o.status === "PROCESSING"
      ).length,
    };
  }

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
                  {user.fullName || "User Profile"}
                </h1>
                {user.isVerified ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                    <ShieldAlert className="mr-1 h-3.5 w-3.5 text-amber-600" /> Unverified
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                {user.email && (
                  <span className="flex items-center">
                    <Mail className="mr-1 h-3.5 w-3.5 text-neutral-400" /> {user.email}
                  </span>
                )}
                {user.phone && (
                  <span className="flex items-center">
                    <Phone className="mr-1 h-3.5 w-3.5 text-neutral-400" /> {user.phone}
                  </span>
                )}
                {user.state && (
                  <span className="flex items-center">
                    <MapPin className="mr-1 h-3.5 w-3.5 text-neutral-400" /> {user.lga}, {user.state}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 transition"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5 text-neutral-500" />
              Sign Out
            </button>
          </form>
        </div>

        {/* Multi-Role Switcher (Renders if user has multiple roles) */}
        {user.roles.length > 1 && (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/60 to-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Active Workspace Switcher:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {user.roles.map((role) => {
                  const roleMeta = ROLE_DISPLAY_NAMES[role] || {
                    label: role,
                    icon: "📁",
                  };
                  const isCurrent = activeRole === role;
                  return (
                    <Link
                      key={role}
                      href={`/account?role=${role}`}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                        isCurrent
                          ? "bg-emerald-700 text-white ring-2 ring-emerald-700 ring-offset-1"
                          : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-300"
                      }`}
                    >
                      <span>{roleMeta.icon}</span>
                      <span>{roleMeta.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ROLE-AWARE DASHBOARD WORKSPACE */}

        {/* 1. FARMER WORKSPACE VIEW */}
        {activeRole === "FARMER" && (
          <div className="space-y-6">
            {/* Header & Quick Metrics */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-100 pb-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                    <span>🌱</span> Farmer & Producer Console
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
                    Produce Listings, Inventory & Sales
                  </h2>
                  <p className="mt-1 text-xs text-neutral-600 sm:text-sm">
                    Manage harvest listings, update warehouse physical stock, and process incoming buyer orders.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/farmer/listings/new"
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    + Create New Listing
                  </Link>
                  <Link
                    href="/farmer"
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                  >
                    Farmer Hub &rarr;
                  </Link>
                </div>
              </div>

              {/* Farmer Live Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                  <span className="text-xs text-neutral-500 font-medium">Published Listings</span>
                  <div className="text-2xl font-black text-neutral-900 mt-1">{farmerStats.totalListings}</div>
                  <span className="text-[11px] text-neutral-400">Total catalog offerings</span>
                </div>
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                  <span className="text-xs text-neutral-500 font-medium">Active in Marketplace</span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{farmerStats.activeListings}</div>
                  <span className="text-[11px] text-neutral-400">Discoverable by buyers</span>
                </div>
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                  <span className="text-xs text-neutral-500 font-medium">Pending Sales Orders</span>
                  <div className="text-2xl font-black text-amber-700 mt-1">{farmerStats.pendingOrders}</div>
                  <span className="text-[11px] text-neutral-400">Awaiting dispatch fulfillment</span>
                </div>
              </div>
            </div>

            {/* Farmer Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/farmer/listings/new"
                className="group flex flex-col justify-between rounded-2xl border-2 border-emerald-600/30 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-xs hover:border-emerald-600 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white mb-3 shadow-xs">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    + Add Produce Listing
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Publish freshly harvested grains, tubers, vegetables, or livestock with prices and MOQ.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>Create Listing</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/farmer/listings"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <Layers className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    My Listings & Inventory
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    View active listings, update warehouse stock on-hand, edit pricing, or safely archive listings.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>Manage Listings</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/farmer/orders"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <Package className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Incoming Sales Orders
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Track customer purchases, review reserved warehouse stock, and prepare orders for dispatch.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>View Sales Orders</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/farmer/settlements"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <CreditCard className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Settlements & Payouts
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Monitor escrow payment releases, fulfillment holds, and net bank account disbursements.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>View Settlements</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/farmer/disputes"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <ShieldAlert className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Disputes & Claims
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Respond to customer feedback, damage claims, or delivery shortage resolutions.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>Manage Claims</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/farmer/market-intelligence"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <TrendingUp className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Market Price Intelligence
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Observed wholesale prices across Nigerian states, 30-day trends, and demand forecasts.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>View Price Trends</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* 2. BUYER / CUSTOMER WORKSPACE VIEW */}
        {activeRole === "BUYER" && (
          <div className="space-y-6">
            {/* Header & Quick Metrics */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-100 pb-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                    <span>🛒</span> Buyer & Procurement Hub
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
                    Farm Produce Orders, Tracking & Cart
                  </h2>
                  <p className="mt-1 text-xs text-neutral-600 sm:text-sm">
                    Source verified farm produce directly from Nigerian producers with escrow checkout protection.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/marketplace"
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    <Search className="mr-1.5 h-4 w-4" />
                    Browse Marketplace
                  </Link>
                  <Link
                    href="/cart"
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                  >
                    <ShoppingCart className="mr-1.5 h-4 w-4 text-emerald-700" />
                    View Cart
                  </Link>
                </div>
              </div>

              {/* Buyer Live Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5">
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                  <span className="text-xs text-neutral-500 font-medium">Placed Orders</span>
                  <div className="text-2xl font-black text-neutral-900 mt-1">{buyerStats.totalOrders}</div>
                  <span className="text-[11px] text-neutral-400">Total historical purchases</span>
                </div>
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                  <span className="text-xs text-neutral-500 font-medium">Active / In-Transit Orders</span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{buyerStats.pendingOrders}</div>
                  <span className="text-[11px] text-neutral-400">Being processed or delivered</span>
                </div>
              </div>
            </div>

            {/* Buyer Action Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/marketplace"
                className="group flex flex-col justify-between rounded-2xl border-2 border-emerald-600/30 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-xs hover:border-emerald-600 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white mb-3 shadow-xs">
                    <Search className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Browse Produce Marketplace
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Filter by state, category, and minimum order quantity to source fresh grains, tubers, and livestock.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>Explore Listings</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/account/orders"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <Package className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    My Produce Orders & Receipts
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Review payment status, view invoices, download receipts, and track fulfillment handovers.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>View Orders</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/cart"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <ShoppingCart className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Active Shopping Cart
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Inspect reserved cart lines, verify minimum order quantities, and proceed to checkout.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>Open Cart</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/account/equipment-rentals"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <Tractor className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    My Equipment Rentals
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Track machinery rental reservations, operator coordination, and field handover dates.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>View Rentals</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/shared-purchases"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <Layers className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Shared Cooperative Purchases
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Pool purchasing power with other buyers to access wholesale truckload farm discounts.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>Explore Pools</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/my-intelligence"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <TrendingUp className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Commodity Price Tracking
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Compare commodity prices across Nigerian markets to time your purchases efficiently.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>View Intelligence</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* 3. EQUIPMENT OWNER WORKSPACE VIEW */}
        {activeRole === "EQUIPMENT_OWNER" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                    <span>🚜</span> Equipment Fleet Owner Console
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
                    Machinery Fleet & Rental Contracts
                  </h2>
                  <p className="mt-1 text-xs text-neutral-600 sm:text-sm">
                    Monetize tractors, harvesters, tillers, and irrigation equipment with verified farmers.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/equipment/owner/new"
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    + List New Machine
                  </Link>
                  <Link
                    href="/equipment/owner"
                    className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                  >
                    Fleet Console &rarr;
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/equipment/owner/new"
                className="group flex flex-col justify-between rounded-2xl border-2 border-emerald-600/30 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-xs hover:border-emerald-600 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white mb-3 shadow-xs">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    + Register New Machinery
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Add tractors, combines, plows, or processing machinery with daily leasing rates.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>Register Machine</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/equipment/owner"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <Tractor className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Machinery Fleet Console
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Toggle active availability, update maintenance logs, and adjust rental rates.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>Manage Fleet</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/equipment/owner/rentals"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <Package className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Rental Enquiries & Requests
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Review incoming booking applications, approve lease terms, and coordinate handover.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>Review Requests</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/equipment"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <Wrench className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-emerald-800 transition">
                    Browse Equipment Directory
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Inspect public equipment listings and explore competitive leasing benchmarks.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-emerald-700">
                  <span>View Catalog</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* 4. BUSINESS / AGRIBUSINESS WORKSPACE VIEW */}
        {activeRole === "BUSINESS" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800 ring-1 ring-inset ring-blue-600/20">
                    <span>🏢</span> Agribusiness & Off-taker Console
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
                    Commercial Operations & Bulk Procurement
                  </h2>
                  <p className="mt-1 text-xs text-neutral-600 sm:text-sm">
                    Manage forward contract farming, aggregate bulk commodities, and hire agricultural staff.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/business"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
                  >
                    Off-taker Console &rarr;
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/business"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-blue-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <Building2 className="h-5 w-5 text-blue-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-blue-800 transition">
                    Agribusiness Console
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Commercial off-taker aggregation and supply-chain logistics coordination.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-blue-700">
                  <span>Open Console</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/business/jobs"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-blue-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <PlusCircle className="h-5 w-5 text-blue-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-blue-800 transition">
                    Post Agricultural Job
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Recruit farm supervisors, machine operators, agronomists, and logistics coordinators.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-blue-700">
                  <span>Manage Jobs</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link
                href="/marketplace"
                className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs hover:border-blue-500 hover:shadow-md transition"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 mb-3">
                    <Search className="h-5 w-5 text-blue-700" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 group-hover:text-blue-800 transition">
                    Wholesale Bulk Procurement
                  </h3>
                  <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                    Contract directly with verified producer clusters for grains, tubers, and livestock.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-bold text-blue-700">
                  <span>Source Produce</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* 5. ADMIN QUICK ACCESS (If user has ADMIN role) */}
        {user.roles.includes("ADMIN") && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-purple-950">System Administration Console</h3>
                  <p className="text-xs text-purple-800/80">
                    User verification audits, canonical catalog management, and platform telemetry.
                  </p>
                </div>
              </div>
              <Link
                href="/admin"
                className="rounded-lg bg-purple-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-800 transition"
              >
                Open Admin &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* ASSIGNED ECOSYSTEM ROLES & MANAGEMENT */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-neutral-900">
              Your Active Ecosystem Roles
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            Roles are enforced server-side from PostgreSQL. Each role grants verified access to specialized features.
          </p>

          <div className="flex flex-wrap gap-2">
            {user.roles.map((role) => {
              const meta = ROLE_DISPLAY_NAMES[role] || { label: role, icon: "🏷️" };
              return (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-bold text-emerald-900"
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </span>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-100">
            <Link
              href="/onboarding?manage=true"
              className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-900 transition"
            >
              + Add or Update Ecosystem Roles (Farmer, Equipment Owner, Agribusiness) &rarr;
            </Link>
          </div>
        </div>

        {/* PROFILE SETTINGS CARD */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-neutral-900 mb-1">
            Edit Profile Information
          </h2>
          <p className="text-xs text-neutral-500 mb-6">
            Keep your contact and location details current across the marketplace.
          </p>

          <EditProfileForm
            initialFullName={user.fullName || ""}
            initialPhone={user.phone || ""}
            initialState={user.state || ""}
            initialLga={user.lga || ""}
            initialLocationAddress={fullProfile?.location_address}
            initialBio={fullProfile?.bio}
          />
        </div>
      </div>
    </div>
  );
}
