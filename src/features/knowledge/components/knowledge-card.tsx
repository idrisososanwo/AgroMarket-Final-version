import Link from "next/link";
import { KnowledgeArticle } from "../types";
import { ContentTypeBadge } from "./content-type-badge";
import { Calendar, MapPin, Building2, ArrowRight } from "lucide-react";

interface KnowledgeCardProps {
  article: KnowledgeArticle;
}

export function KnowledgeCard({ article }: KnowledgeCardProps) {
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <article className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-emerald-500 hover:shadow-md">
      <div className="space-y-3">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ContentTypeBadge type={article.contentType} />
          {article.state && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
              <MapPin className="h-3 w-3 text-neutral-400" />
              <span>
                {article.lga ? `${article.lga}, ` : ""}
                {article.state}
              </span>
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-neutral-900 group-hover:text-emerald-700 transition line-clamp-2 leading-snug">
          <Link href={`/learn/${article.slug}`}>
            {article.title}
          </Link>
        </h2>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">
            {article.excerpt}
          </p>
        )}

        {/* Topic Tag */}
        {article.topic && (
          <div className="text-[11px] font-medium text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded inline-block">
            {article.topic}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
        <div className="space-y-0.5">
          {article.sourceName && (
            <div className="font-medium text-neutral-700 flex items-center gap-1 text-[11px]">
              <Building2 className="h-3 w-3 text-neutral-400" />
              <span className="truncate max-w-[170px]">{article.sourceName}</span>
            </div>
          )}
          {publishedDate && (
            <div className="flex items-center gap-1 text-[11px] text-neutral-400">
              <Calendar className="h-3 w-3" />
              <span>{publishedDate}</span>
            </div>
          )}
        </div>

        <Link
          href={`/learn/${article.slug}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition py-1"
        >
          <span>Read</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </article>
  );
}
