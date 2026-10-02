import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { AdminKnowledgeForm } from "@/features/knowledge/components/admin-knowledge-form";
import { BookOpen, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Create Knowledge Article | AgroMarket Admin",
  description: "Draft a new agricultural guide, news article, or government bulletin.",
};

export default async function NewKnowledgeArticlePage() {
  await requireAnyRole(["ADMIN", "EXPERT"]);

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/admin/knowledge"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Knowledge Console
        </Link>

        {/* Page Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <BookOpen className="h-4 w-4" />
            <span>Editorial Studio</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
            Create Knowledge Article
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Compose verified agronomy recommendations, news, training opportunities, or food safety protocols.
          </p>
        </div>

        {/* Editor Form */}
        <AdminKnowledgeForm />
      </div>
    </div>
  );
}
