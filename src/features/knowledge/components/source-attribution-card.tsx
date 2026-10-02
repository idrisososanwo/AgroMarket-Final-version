import { KnowledgeSourceType, SOURCE_TYPE_LABELS, SafeKnowledgeAuthorProfile } from "../types";
import { ExternalLink, Building2, ShieldCheck, UserCheck } from "lucide-react";

interface SourceAttributionCardProps {
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceType?: KnowledgeSourceType | null;
  author?: SafeKnowledgeAuthorProfile | null;
  publishedAt?: string | null;
}

export function SourceAttributionCard({
  sourceName,
  sourceUrl,
  sourceType,
  author,
  publishedAt,
}: SourceAttributionCardProps) {
  if (!sourceName && !author) {
    return null;
  }

  const sourceTypeLabel =
    sourceType && SOURCE_TYPE_LABELS[sourceType]
      ? SOURCE_TYPE_LABELS[sourceType]
      : "Verified Information Source";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5 text-emerald-700" />
        <span>Source & Authorship Verification</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="space-y-1">
          {sourceName && (
            <div className="font-semibold text-sm text-neutral-900 flex items-center gap-1.5">
              <span>{sourceName}</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
          )}

          <div className="text-xs text-neutral-500 flex flex-wrap items-center gap-2">
            <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
              {sourceTypeLabel}
            </span>
            {publishedAt && (
              <span>
                Published on{" "}
                {new Date(publishedAt).toLocaleDateString("en-NG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {author && (
            <div className="text-xs text-neutral-600 pt-1 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-neutral-400" />
              <span>
                Contributor:{" "}
                <strong className="text-neutral-900">
                  {author.fullName || "Verified Agricultural Contributor"}
                </strong>
                {author.state && ` (${author.state})`}
              </span>
            </div>
          )}
        </div>

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 px-3 py-2 rounded-lg self-start sm:self-auto min-h-[36px]"
          >
            <span>Original Reference</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
