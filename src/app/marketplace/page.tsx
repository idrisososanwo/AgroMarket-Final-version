import Link from "next/link";
import { getMarketplaceListings, getCategories } from "@/features/marketplace/queries";
import { ListingCard } from "@/features/marketplace/components/listing-card";
import { MarketplaceFilterBar } from "@/features/marketplace/components/marketplace-filter-bar";
import { IntelligenceContextBanner } from "@/features/action-integration/components/intelligence-context-banner";
import { AlertCircle } from "lucide-react";

interface MarketplacePageProps {
  searchParams: Promise<{
    search?: string;
    commodity?: string;
    intel_ref?: string;
    dec_ref?: string;
    category?: string;
    state?: string;
    minPrice?: string;
    maxPrice?: string;
    sortBy?: "newest" | "price_asc" | "price_desc";
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const minPrice = resolvedParams.minPrice ? parseFloat(resolvedParams.minPrice) : undefined;
  const maxPrice = resolvedParams.maxPrice ? parseFloat(resolvedParams.maxPrice) : undefined;
  const activeSearch = resolvedParams.search || resolvedParams.commodity;

  const [categories, { listings, totalCount, totalPages, error }] = await Promise.all([
    getCategories(),
    getMarketplaceListings({
      search: activeSearch,
      category: resolvedParams.category,
      state: resolvedParams.state,
      minPrice,
      maxPrice,
      sortBy: resolvedParams.sortBy,
      page,
      limit: 12,
    }),
  ]);

  const hasActiveFilters = Boolean(
    activeSearch ||
      (resolvedParams.category && resolvedParams.category !== "all") ||
      (resolvedParams.state && resolvedParams.state !== "all") ||
      minPrice !== undefined ||
      maxPrice !== undefined
  );

  // Build pagination links while preserving other filters
  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (activeSearch) params.set("search", activeSearch);
    if (resolvedParams.category && resolvedParams.category !== "all") {
      params.set("category", resolvedParams.category);
    }
    if (resolvedParams.state && resolvedParams.state !== "all") {
      params.set("state", resolvedParams.state);
    }
    if (resolvedParams.minPrice) params.set("minPrice", resolvedParams.minPrice);
    if (resolvedParams.maxPrice) params.set("maxPrice", resolvedParams.maxPrice);
    if (resolvedParams.sortBy && resolvedParams.sortBy !== "newest") {
      params.set("sortBy", resolvedParams.sortBy);
    }
    if (resolvedParams.intel_ref) params.set("intel_ref", resolvedParams.intel_ref);
    params.set("page", newPage.toString());
    return `/marketplace?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Intelligence Context Banner if navigated from recommendation */}
        {(resolvedParams.intel_ref || resolvedParams.commodity) && (
          <IntelligenceContextBanner
            commodity={resolvedParams.commodity || resolvedParams.search}
            state={resolvedParams.state}
            recommendationId={resolvedParams.intel_ref}
          />
        )}

        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Live Produce Catalog
              </span>
              <span className="text-xs text-neutral-500">
                Nigeria-Wide Agricultural Produce
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              Agricultural Produce Marketplace
            </h1>
            <p className="mt-2 text-sm text-neutral-600 max-w-2xl">
              Source farm-fresh crops, grains, tubers, livestock, and raw produce directly from verified Nigerian farmers and agribusinesses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/shared-purchases"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 transition"
            >
              Shared Purchases &rarr;
            </Link>
            <Link
              href="/smart-basket"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 transition"
            >
              Smart Basket &rarr;
            </Link>
            <Link
              href="/market"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 transition"
            >
              Market Prices & Trends &rarr;
            </Link>
            <Link
              href="/farmer/listings/new"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Sell Your Produce
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <MarketplaceFilterBar categories={categories} />

        {/* Results Metadata */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm font-medium text-neutral-700">
            Showing <span className="font-bold text-neutral-900">{listings.length}</span> of{" "}
            <span className="font-bold text-neutral-900">{totalCount}</span> available listings
          </div>
        </div>

        {/* Listings Grid or Error / Empty State */}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-rose-900">Unable to load produce listings</h3>
            <p className="mt-1 text-sm text-rose-700 max-w-md mx-auto">
              We encountered a temporary database connectivity issue while retrieving listings ({error}). Please refresh the page or try again in a few moments.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/marketplace"
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
              >
                Retry
              </Link>
            </div>
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : hasActiveFilters ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-neutral-900">No matching produce listings found</h3>
            <p className="mt-1 text-sm text-neutral-500 max-w-md mx-auto">
              We couldn&apos;t find any produce matching your current search criteria or state filter. Try adjusting your filters or search keywords.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/marketplace"
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Clear All Filters
              </Link>
              <Link
                href="/farmer/listings/new"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                List Produce in This Category
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-neutral-900">No produce listings currently posted</h3>
            <p className="mt-1 text-sm text-neutral-500 max-w-md mx-auto">
              The marketplace catalog is open for farm-fresh agricultural stock. Verified Nigerian farmers and agribusinesses can list their harvest for buyers nationwide.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/farmer/listings/new"
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
              >
                + Create the First Produce Listing
              </Link>
            </div>
          </div>
        )}

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between border-t border-neutral-200 pt-6">
            <div className="text-sm text-neutral-600">
              Page <span className="font-semibold text-neutral-900">{page}</span> of{" "}
              <span className="font-semibold text-neutral-900">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Previous
                </Link>
              ) : (
                <span className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-400 cursor-not-allowed">
                  Previous
                </span>
              )}

              {page < totalPages ? (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-400 cursor-not-allowed">
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
