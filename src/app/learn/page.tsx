import Link from "next/link";
import { getPublishedArticles } from "@/features/knowledge/queries";
import { KnowledgeCard } from "@/features/knowledge/components/knowledge-card";
import { KnowledgeFilterBar } from "@/features/knowledge/components/knowledge-filter-bar";
import { KnowledgeContentType } from "@/features/knowledge/types";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";

interface LearnPageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    state?: string;
    topic?: string;
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agricultural Knowledge, Farm News & Extension | AgroMarket",
  description:
    "Explore verified Nigerian agricultural news, expert agronomy guidance, official government updates, farmer training, agricultural events, and food safety standards.",
};

export default async function LearnPage({ searchParams }: LearnPageProps) {
  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const contentType =
    resolvedParams.type && resolvedParams.type !== "all"
      ? (resolvedParams.type as KnowledgeContentType)
      : undefined;

  const { articles, totalCount, totalPages } = await getPublishedArticles({
    search: resolvedParams.search,
    contentType,
    state:
      resolvedParams.state && resolvedParams.state !== "all"
        ? resolvedParams.state
        : undefined,
    topic:
      resolvedParams.topic && resolvedParams.topic !== "all"
        ? resolvedParams.topic
        : undefined,
    page,
    limit: 12,
  });

  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (resolvedParams.search) params.set("search", resolvedParams.search);
    if (resolvedParams.type && resolvedParams.type !== "all") {
      params.set("type", resolvedParams.type);
    }
    if (resolvedParams.state && resolvedParams.state !== "all") {
      params.set("state", resolvedParams.state);
    }
    if (resolvedParams.topic && resolvedParams.topic !== "all") {
      params.set("topic", resolvedParams.topic);
    }
    params.set("page", newPage.toString());
    return `/learn?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Hero Section */}
        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 p-6 sm:p-10 text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
              <BookOpen className="h-3.5 w-3.5" />
              <span>AgroMarket Knowledge Hub</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Learn, Stay Informed & Grow
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              AgroMarket connects Nigerian agriculture with structured agronomic insight, verified expert advice, official government programmes, farmer training opportunities, trade events, and evidence-based food safety guidance.
            </p>
          </div>

          {/* Decorative ambient background accent */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Agricultural Security & Corridor Advisory Link Banner */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
              Phase 1.5 Agricultural Security & Resilience Layer
            </div>
            <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
              Check physical security notices, logistics corridor advisories, and movement restrictions across Nigerian states.
            </p>
          </div>
          <Link
            href="/learn/security"
            className="shrink-0 inline-flex items-center justify-center px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            Review Security Notices &rarr;
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <KnowledgeFilterBar
          initialSearch={resolvedParams.search}
          initialType={resolvedParams.type}
          initialState={resolvedParams.state}
          initialTopic={resolvedParams.topic}
        />

        {/* Articles Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <div>
              Showing{" "}
              <strong className="text-neutral-900">{articles.length}</strong> of{" "}
              <strong className="text-neutral-900">{totalCount}</strong> published articles
            </div>
          </div>

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <KnowledgeCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-sm space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">
                No Published Articles in this Category Yet
              </h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                We are curating factual, verified agricultural guides, market reports, and extension updates for this topic. Check back soon or try widening your search parameters.
              </p>
              <div className="pt-2">
                <Link
                  href="/learn"
                  className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
                >
                  View All Knowledge Topics &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              {page > 1 ? (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition min-h-[40px]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-300 cursor-not-allowed min-h-[40px]">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </span>
              )}

              <span className="text-xs font-medium text-neutral-600 px-3">
                Page {page} of {totalPages}
              </span>

              {page < totalPages ? (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition min-h-[40px]"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-300 cursor-not-allowed min-h-[40px]">
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
