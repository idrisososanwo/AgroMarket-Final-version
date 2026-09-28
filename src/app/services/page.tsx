import Link from "next/link";
import { getServices } from "@/features/services/queries";
import { ServiceCard } from "@/features/services/components/service-card";
import { ServiceFilterBar } from "@/features/services/components/service-filter-bar";
import { ServiceCategory, PricingModel } from "@/features/services/types";
import { Wrench, ChevronLeft, ChevronRight } from "lucide-react";

interface ServicesPageProps {
  searchParams: Promise<{
    search?: string;
    serviceCategory?: string;
    category?: string;
    coverageState?: string;
    pricingModel?: string;
    sortBy?: "newest" | "rate_asc" | "rate_desc";
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agricultural Services & Machinery Directory | AgroMarket",
  description:
    "Hire verified tractor operators, drone spraying pilots, veterinary specialists, soil testing labs, and agricultural consultants across Nigeria.",
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const rawCategory = resolvedParams.serviceCategory || resolvedParams.category;
  const category = rawCategory && rawCategory !== "all" ? (rawCategory as ServiceCategory) : undefined;

  const { services, totalCount, totalPages } = await getServices({
    search: resolvedParams.search,
    serviceCategory: category,
    coverageState: resolvedParams.coverageState,
    pricingModel: (resolvedParams.pricingModel as PricingModel) || undefined,
    sortBy: resolvedParams.sortBy,
    page,
    limit: 12,
  });

  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (resolvedParams.search) params.set("search", resolvedParams.search);
    if (category) {
      params.set("serviceCategory", category);
    }
    if (resolvedParams.coverageState && resolvedParams.coverageState !== "all") {
      params.set("coverageState", resolvedParams.coverageState);
    }
    if (resolvedParams.pricingModel && resolvedParams.pricingModel !== "all") {
      params.set("pricingModel", resolvedParams.pricingModel);
    }
    if (resolvedParams.sortBy && resolvedParams.sortBy !== "newest") {
      params.set("sortBy", resolvedParams.sortBy);
    }
    params.set("page", newPage.toString());
    return `/services?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <Wrench className="h-4 w-4" />
            <span>Farm Support & Operations</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Agricultural Services Directory
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-neutral-600 max-w-2xl leading-relaxed">
            Find and book certified agricultural service providers across Nigeria. Hire tractor operators,
            drone spraying crews, soil testing laboratories, irrigation specialists, and veterinary experts.
          </p>
        </div>

        {/* Filter Bar */}
        <ServiceFilterBar />

        {/* Results Count Summary */}
        <div className="mb-4 flex items-center justify-between text-xs text-neutral-500 font-medium">
          <span>
            Showing <strong className="text-neutral-900">{services.length}</strong> of{" "}
            <strong className="text-neutral-900">{totalCount}</strong> available service offerings
          </span>
          {page > 1 && <span>Page {page} of {totalPages}</span>}
        </div>

        {/* Services Grid or Empty State */}
        {services.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} showAvailabilityBadge={true} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Wrench className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900">No services available</h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              We couldn&apos;t find any active service offerings matching your selected criteria.
              Try expanding your coverage state search or resetting filters.
            </p>
            <div className="mt-6">
              <Link
                href="/services"
                className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px]"
              >
                Reset All Filters
              </Link>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav
            aria-label="Services pagination"
            className="mt-12 flex items-center justify-between border-t border-neutral-200 pt-6"
          >
            <div>
              {page > 1 ? (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm min-h-[44px]"
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

            <span className="text-xs text-neutral-500 font-medium">
              Page <strong className="text-neutral-900">{page}</strong> of{" "}
              <strong className="text-neutral-900">{totalPages}</strong>
            </span>

            <div>
              {page < totalPages ? (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm min-h-[44px]"
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
