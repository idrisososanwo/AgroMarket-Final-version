import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug, getRelatedArticles } from "@/features/knowledge/queries";
import { ContentTypeBadge } from "@/features/knowledge/components/content-type-badge";
import { DisclaimerBanner } from "@/features/knowledge/components/disclaimer-banner";
import { SourceAttributionCard } from "@/features/knowledge/components/source-attribution-card";
import { EventDetailsCard } from "@/features/knowledge/components/event-details-card";
import { KnowledgeCard } from "@/features/knowledge/components/knowledge-card";
import { ArrowLeft, Calendar, MapPin, Tag } from "lucide-react";

interface ArticleDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ArticleDetailPageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article Not Found | AgroMarket Knowledge",
    };
  }

  return {
    title: `${article.title} | AgroMarket Knowledge`,
    description:
      article.excerpt ||
      article.body.slice(0, 160) ||
      "Agricultural information and agronomic guidance on AgroMarket.",
  };
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedArticles(
    article.slug,
    article.contentType,
    article.topic,
    3
  );

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/learn"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Knowledge Hub
        </Link>

        {/* Article Header Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ContentTypeBadge type={article.contentType} size="md" />

            {article.state && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                <span>
                  {article.lga ? `${article.lga}, ` : ""}
                  {article.state}
                </span>
              </span>
            )}

            {publishedDate && (
              <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>{publishedDate}</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight leading-tight">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-medium">
              {article.excerpt}
            </p>
          )}

          {article.topic && (
            <div className="pt-1">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                Discipline: {article.topic}
              </span>
            </div>
          )}
        </div>

        {/* Source Attribution Card */}
        <SourceAttributionCard
          sourceName={article.sourceName}
          sourceUrl={article.sourceUrl}
          sourceType={article.sourceType}
          author={article.author}
          publishedAt={article.publishedAt}
        />

        {/* Contextual Disclaimers */}
        <DisclaimerBanner
          type={article.contentType}
          sourceName={article.sourceName}
        />

        {/* Event / Training Logistics if applicable */}
        <EventDetailsCard
          eventStartDate={article.eventStartDate}
          eventEndDate={article.eventEndDate}
          venue={article.venue}
          isOnline={article.isOnline}
          organizer={article.organizer}
          registrationUrl={article.registrationUrl}
        />

        {/* Article Body */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="prose prose-neutral max-w-none text-neutral-800 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-line">
            {article.body}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-neutral-100 flex flex-wrap items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-neutral-400" />
              <span className="text-xs text-neutral-500 font-medium">Tags:</span>
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <div className="pt-6 space-y-4">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Related Agricultural Insights
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedArticles.map((rel) => (
                <KnowledgeCard key={rel.id} article={rel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
