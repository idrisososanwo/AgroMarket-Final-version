import Link from "next/link";
import { Plus, Users, Search, Sparkles, Layers } from "lucide-react";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { getSharedPurchases } from "@/features/shared-purchase/queries";
import { SharedPurchaseCard } from "@/features/shared-purchase/components/shared-purchase-card";
import { SharedPurchaseType } from "@/features/shared-purchase/types";

interface SharedPurchasesPageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    state?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function SharedPurchasesPage({
  searchParams,
}: SharedPurchasesPageProps) {
  const resolvedParams = await searchParams;

  const validTypes: SharedPurchaseType[] = ["BULK_CROP", "ANIMAL_PORTION"];
  const typeFilter = validTypes.includes(resolvedParams.type as SharedPurchaseType)
    ? (resolvedParams.type as SharedPurchaseType)
    : undefined;

  const pools = await getSharedPurchases({
    search: resolvedParams.search,
    type: typeFilter,
    state: resolvedParams.state,
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* Hero Banner */}
      <div className="rounded-3xl border border-border bg-gradient-to-br from-emerald-50 via-teal-50/30 to-background p-8 dark:from-emerald-950/20 dark:via-background dark:to-background">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Users className="h-3.5 w-3.5" />
            Collective Farm Sourcing
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Pool Demand. Split Wholesale Harvests.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Collaborate with other households, businesses, and restaurants across Nigeria to split bulk crop harvests and whole livestock at farm-gate wholesale prices.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/farmer/shared-purchases/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow"
            >
              <Plus className="h-4 w-4" />
              Farmer? Launch a Shared Pool
            </Link>
            <Link
              href="/smart-basket"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Smart Basket Recommendation
            </Link>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/shared-purchases"
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              !resolvedParams.type
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All Pools
          </Link>
          <Link
            href={`/shared-purchases?type=BULK_CROP${resolvedParams.state ? `&state=${resolvedParams.state}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              resolvedParams.type === "BULK_CROP"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Bulk Crops (Grains, Tubers)
          </Link>
          <Link
            href={`/shared-purchases?type=ANIMAL_PORTION${resolvedParams.state ? `&state=${resolvedParams.state}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              resolvedParams.type === "ANIMAL_PORTION"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Livestock Portions (Ram, Cow, Goat)
          </Link>
        </div>

        {/* Search & State Filter Form */}
        <form method="GET" className="flex items-center gap-2">
          {resolvedParams.type && (
            <input type="hidden" name="type" value={resolvedParams.type} />
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={resolvedParams.search}
              placeholder="Search pools..."
              className="rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none w-36 sm:w-48"
            />
          </div>

          <select
            name="state"
            defaultValue={resolvedParams.state || ""}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">All States</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Pools Grid */}
      {pools.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-3 text-base font-bold text-foreground">
            No Active Shared Purchases Matching Criteria
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query, state filter, or check back soon as farmers launch new seasonal harvest pools.
          </p>
          <Link
            href="/shared-purchases"
            className="mt-4 inline-flex items-center rounded-xl bg-muted px-4 py-2 text-xs font-bold text-foreground hover:bg-muted/80 transition"
          >
            Clear Filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pools.map((pool) => (
            <SharedPurchaseCard key={pool.id} pool={pool} />
          ))}
        </div>
      )}
    </div>
  );
}
