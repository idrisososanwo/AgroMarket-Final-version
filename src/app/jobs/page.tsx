import Link from "next/link";
import { getJobs } from "@/features/jobs/queries";
import { JobCard } from "@/features/jobs/components/job-card";
import { JobFilterBar } from "@/features/jobs/components/job-filter-bar";
import { JobCategory, EmploymentType, CompensationType } from "@/features/jobs/types";
import { Briefcase, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

interface JobsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    state?: string;
    employmentType?: string;
    compensationType?: string;
    sortBy?: "newest" | "compensation_desc" | "compensation_asc";
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agricultural Jobs & Farm Labor Placements | AgroMarket",
  description:
    "Discover verified agricultural vacancies across Nigeria: farm hands, harvest crews, tractor operators, agronomists, and farm managers.",
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const { jobs, totalCount, totalPages, error } = await getJobs({
    search: resolvedParams.search,
    category: (resolvedParams.category as JobCategory) || undefined,
    state: resolvedParams.state,
    employmentType: (resolvedParams.employmentType as EmploymentType) || undefined,
    compensationType: (resolvedParams.compensationType as CompensationType) || undefined,
    sortBy: resolvedParams.sortBy,
    page,
    limit: 12,
  });

  const hasActiveFilters = Boolean(
    resolvedParams.search ||
      (resolvedParams.category && resolvedParams.category !== "all") ||
      (resolvedParams.state && resolvedParams.state !== "all") ||
      (resolvedParams.employmentType && resolvedParams.employmentType !== "all") ||
      (resolvedParams.compensationType && resolvedParams.compensationType !== "all")
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
    if (resolvedParams.employmentType && resolvedParams.employmentType !== "all") {
      params.set("employmentType", resolvedParams.employmentType);
    }
    if (resolvedParams.compensationType && resolvedParams.compensationType !== "all") {
      params.set("compensationType", resolvedParams.compensationType);
    }
    if (resolvedParams.sortBy && resolvedParams.sortBy !== "newest") {
      params.set("sortBy", resolvedParams.sortBy);
    }
    params.set("page", newPage.toString());
    return `/jobs?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <Briefcase className="h-4 w-4" />
            <span>Farm Employment & Placements</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Agricultural Jobs & Labor
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-neutral-600 max-w-2xl leading-relaxed">
            Connect with verified commercial farms, plantations, and agribusinesses seeking farm managers,
            agronomists, equipment operators, and seasonal harvesting teams across Nigeria.
          </p>
        </div>

        {/* Filter Bar */}
        <JobFilterBar />

        {/* Results Count Summary */}
        <div className="mb-4 flex items-center justify-between text-xs text-neutral-500 font-medium">
          <span>
            Showing <strong className="text-neutral-900">{jobs.length}</strong> of{" "}
            <strong className="text-neutral-900">{totalCount}</strong> active job postings
          </span>
          {page > 1 && <span>Page {page} of {totalPages}</span>}
        </div>

        {/* Jobs Grid or Error / Empty State */}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-rose-900">Unable to load agricultural jobs</h3>
            <p className="mt-1 text-sm text-rose-700 max-w-md mx-auto">
              We encountered a temporary database connectivity issue while retrieving jobs ({error}). Please refresh the page or check back shortly.
            </p>
            <div className="mt-6">
              <Link
                href="/jobs"
                className="inline-flex items-center rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition shadow-sm min-h-[44px]"
              >
                Retry
              </Link>
            </div>
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} showStatusBadge={false} />
            ))}
          </div>
        ) : hasActiveFilters ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Briefcase className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900">No jobs found</h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              We couldn&apos;t find any active job postings matching your current criteria.
              Try adjusting your filters or resetting search keywords.
            </p>
            <div className="mt-6">
              <Link
                href="/jobs"
                className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px]"
              >
                Reset All Filters
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <Briefcase className="h-7 w-7" />
            </div>
            <h3 className="mt-2 text-base font-bold text-neutral-900">No agricultural jobs currently posted</h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              Commercial farms, plantations, and agribusinesses across Nigeria can recruit farm managers, equipment operators, agronomists, and seasonal labor here.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/farmer/jobs/new"
                className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-sm min-h-[44px]"
              >
                + Post a Farm Labor or Staff Vacancy
              </Link>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav
            aria-label="Jobs pagination"
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
