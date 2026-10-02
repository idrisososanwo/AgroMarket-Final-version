import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { getArticleByIdForAdmin } from "@/features/knowledge/queries";
import { AdminKnowledgeForm } from "@/features/knowledge/components/admin-knowledge-form";
import { BookOpen, ArrowLeft, ExternalLink } from "lucide-react";

interface EditKnowledgeArticlePageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Knowledge Article | AgroMarket Admin",
  description: "Update article content, manage publication status, and revise sources.",
};

export default async function EditKnowledgeArticlePage({
  params,
}: EditKnowledgeArticlePageProps) {
  await requireAnyRole(["ADMIN", "EXPERT"]);
  const { id } = await params;

  const article = await getArticleByIdForAdmin(id);
  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/knowledge"
            className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Knowledge Console
          </Link>

          {article.status === "PUBLISHED" && (
            <Link
              href={`/learn/${article.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-emerald-700 transition"
            >
              <span>View Public Article</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <BookOpen className="h-4 w-4" />
            <span>Article Revisions</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
            Edit: {article.title}
          </h1>
          <p className="mt-1 text-xs text-neutral-500 font-mono">
            Article ID: {article.id} • Slug: /learn/{article.slug}
          </p>
        </div>

        {/* Form Preloaded with Article Data */}
        <AdminKnowledgeForm initialData={article} />
      </div>
    </div>
  );
}
