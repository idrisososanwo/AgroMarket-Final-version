import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/server";
import {
  Tractor,
  Wrench,
  Building2,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Service Provider Hub | AgroMarket",
  description: "Unified agricultural service provider and machinery fleet management.",
};

export default async function ServiceProviderHubPage() {
  const user = await requireAnyRole([
    "EQUIPMENT_OWNER",
    "SERVICE_PROVIDER",
    "EXPERT",
    "BUSINESS",
    "ADMIN",
  ]);

  const roles = user.roles || [];
  const isEquipmentOwner = roles.includes("EQUIPMENT_OWNER");
  const isServiceProvider = roles.includes("SERVICE_PROVIDER") || roles.includes("EXPERT");
  const isBusiness = roles.includes("BUSINESS");

  // Single-role direct redirection
  if (isEquipmentOwner && !isServiceProvider && !isBusiness) {
    redirect("/equipment/owner");
  }
  if (isServiceProvider && !isEquipmentOwner && !isBusiness) {
    redirect("/services/provider");
  }
  if (isBusiness && !isEquipmentOwner && !isServiceProvider) {
    redirect("/business");
  }

  // Multi-provider role hub
  return (
    <div className="min-h-screen bg-[#FBF9F4] py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Workspace Mode Switcher Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Active Mode: Service Provider Hub
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                  Verified Enterprise
                </span>
              </div>
              <p className="text-xs text-neutral-600">
                Manage your machinery fleet, service offerings, and agribusiness off-take contracts.
              </p>
            </div>
          </div>

          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 transition shrink-0"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-neutral-500" />
            Switch to Shopping Mode
          </Link>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
            Service Provider Consoles
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-600">
            Welcome, <strong>{user.fullName || user.email}</strong>. Select the management workspace you wish to access:
          </p>
        </div>

        {/* Consoles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Machinery Fleet Console */}
          {isEquipmentOwner && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm hover:border-emerald-600 hover:shadow-md transition flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <Tractor className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Machinery Fleet Console
                </h2>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Manage tractors, combine harvesters, and sprayers. Set daily rental rates, manage availability, and review farmer booking requests.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  href="/equipment/owner"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
                >
                  <span>Open Fleet Console</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Agro Services Console */}
          {isServiceProvider && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm hover:border-emerald-600 hover:shadow-md transition flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
                  <Wrench className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Services & Bookings Console
                </h2>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Publish specialized agricultural service offerings (soil testing, drone spraying, veterinary guidance) and respond to client requests.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  href="/services/provider"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4327] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#165a36] transition"
                >
                  <span>Open Services Console</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Agribusiness Console */}
          {isBusiness && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm hover:border-emerald-600 hover:shadow-md transition flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
                  <Building2 className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-neutral-900">
                  Agribusiness Off-taker Console
                </h2>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Aggregate bulk commodities, coordinate contract farming arrangements, and organize off-take logistics corridors.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  href="/business"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition"
                >
                  <span>Open Business Console</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
