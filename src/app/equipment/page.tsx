import Link from "next/link";
import { getEquipment } from "@/features/equipment/queries";
import { EquipmentCard } from "@/features/equipment/components/equipment-card";
import { EquipmentFilterBar } from "@/features/equipment/components/equipment-filter-bar";
import { EquipmentCategory, EquipmentCondition } from "@/features/equipment/types";
import { Tractor, ChevronLeft, ChevronRight, PlusCircle, AlertCircle } from "lucide-react";

interface EquipmentPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    state?: string;
    lga?: string;
    condition?: string;
    availability?: string;
    sortBy?: "newest" | "rate_asc" | "rate_desc";
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Farm Equipment Rental & Machinery Leasing | AgroMarket",
  description:
    "Hire verified tractors, combine harvesters, boom sprayers, planters, and heavy farm machinery across Nigeria with escrow protection.",
};

export default async function EquipmentPage({ searchParams }: EquipmentPageProps) {
  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const isAvailable =
    resolvedParams.availability === "available"
      ? true
      : resolvedParams.availability === "unavailable"
      ? false
      : undefined;

  const { equipment, totalCount, totalPages, error } = await getEquipment({
    search: resolvedParams.search,
    category:
      resolvedParams.category && resolvedParams.category !== "all"
        ? (resolvedParams.category as EquipmentCategory)
        : undefined,
    state:
      resolvedParams.state && resolvedParams.state !== "all"
        ? resolvedParams.state
        : undefined,
    condition:
      resolvedParams.condition && resolvedParams.condition !== "all"
        ? (resolvedParams.condition as EquipmentCondition)
        : undefined,
    isAvailable,
    sortBy: resolvedParams.sortBy,
    page,
    limit: 12,
  });

  const hasActiveFilters = Boolean(
    resolvedParams.search ||
      (resolvedParams.category && resolvedParams.category !== "all") ||
      (resolvedParams.state && resolvedParams.state !== "all") ||
      (resolvedParams.condition && resolvedParams.condition !== "all") ||
      (resolvedParams.availability && resolvedParams.availability !== "all")
  );

  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (resolvedParams.search) params.set("search", resolvedParams.search);
    if (resolvedParams.category && resolvedParams.category !== "all") {
      params.set("category", resolvedParams.category);
    }
    if (resolvedParams.state && resolvedParams.state !== "all") {
      params.set("state", resolvedParams.state);
    }
    if (resolvedParams.condition && resolvedParams.condition !== "all") {
      params.set("condition", resolvedParams.condition);
    }
    if (resolvedParams.availability && resolvedParams.availability !== "all") {
      params.set("availability", resolvedParams.availability);
    }
    if (resolvedParams.sortBy && resolvedParams.sortBy !== "newest") {
      params.set("sortBy", resolvedParams.sortBy);
    }
    params.set("page", newPage.toString());
    return `/equipment?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50/70 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb / Quick Nav */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200/80 pb-4">
          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link
              href="/"
              className="text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Home
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-emerald-700">Equipment Rental</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/marketplace"
              className="inline-flex items-center text-xs font-medium text-neutral-600 hover:text-neutral-900 transition"
            >
              Produce Marketplace
            </Link>
            <span className="text-neutral-300">|</span>
            <Link
              href="/services"
              className="inline-flex items-center text-xs font-medium text-neutral-600 hover:text-neutral-900 transition"
            >
              Agro Services
            </Link>
            <span className="text-neutral-300">|</span>
            <Link
              href="/jobs"
              className="inline-flex items-center text-xs font-medium text-neutral-600 hover:text-neutral-900 transition"
            >
              Jobs & Labor
            </Link>
            <span className="text-neutral-300">|</span>
            <Link
              href="/account/equipment-rentals"
              className="inline-flex items-center text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition"
            >
              My Rentals
            </Link>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                <Tractor className="h-3.5 w-3.5 text-emerald-700" />
                Heavy Machinery & Farm Mechanization
              </span>
              <span className="text-xs text-neutral-500">
                Nigeria-Wide Verified Equipment
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
              Agricultural Equipment Rental
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-neutral-600 max-w-2xl leading-relaxed">
              Rent certified tractors, combine harvesters, seeders, boom sprayers, and power tillers
              directly from verified Nigerian equipment owners with escrow deposit protection.
            </p>
          </div>

          {/* Quick CTA to Owner Console */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/equipment/owner"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 transition min-h-[44px]"
            >
              <span>Owner Workspace</span>
            </Link>
            <Link
              href="/equipment/owner/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition min-h-[44px]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>List Your Equipment</span>
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <EquipmentFilterBar />

        {/* Results Metadata */}
        <div className="mb-6 flex items-center justify-between text-xs text-neutral-600">
          <span>
            Showing <strong className="text-neutral-900">{equipment.length}</strong> of{" "}
            <strong className="text-neutral-900">{totalCount}</strong> available machinery listings
          </span>
          {totalPages > 1 && (
            <span>
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        {/* Equipment Cards Grid or Error / Empty State */}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-rose-900">Unable to load equipment listings</h3>
            <p className="mt-1 text-sm text-rose-700 max-w-md mx-auto">
              We encountered a temporary database connectivity issue while retrieving equipment ({error}). Please refresh the page or try again in a few moments.
            </p>
            <div className="mt-6">
              <Link
                href="/equipment"
                className="inline-flex items-center rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition shadow-sm min-h-[44px]"
              >
                Retry
              </Link>
            </div>
          </div>
        ) : equipment.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {equipment.map((item) => (
              <EquipmentCard key={item.id} equipment={item} />
            ))}
          </div>
        ) : hasActiveFilters ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Tractor className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900">
              No equipment found
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              We couldn&apos;t find any machinery listings matching your selected category, location, or availability filters.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/equipment"
                className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-sm min-h-[44px]"
              >
                Reset All Filters
              </Link>
              <Link
                href="/equipment/owner/new"
                className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition shadow-sm min-h-[44px]"
              >
                List Equipment in this Area
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <Tractor className="h-7 w-7" />
            </div>
            <h3 className="mt-2 text-base font-bold text-neutral-900">
              No farm equipment currently listed for rent
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              Tractor owners, machinery operators, and commercial mechanization hubs can list tractors, combine harvesters, planters, and sprayers for hire with deposit escrow protection.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/equipment/owner/new"
                className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-sm min-h-[44px]"
              >
                + List Farm Equipment for Rent
              </Link>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav
            aria-label="Equipment pagination"
            className="mt-12 flex items-center justify-between border-t border-neutral-200 pt-6"
          >
            <div>
              {page > 1 ? (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition shadow-sm min-h-[44px]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-400 cursor-not-allowed min-h-[44px]">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </span>
              )}
            </div>

            <span className="text-xs font-medium text-neutral-600">
              Page {page} of {totalPages}
            </span>

            <div>
              {page < totalPages ? (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition shadow-sm min-h-[44px]"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-400 cursor-not-allowed min-h-[44px]">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
