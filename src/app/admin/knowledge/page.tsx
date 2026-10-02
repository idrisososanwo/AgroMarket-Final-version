import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { getAdminArticles } from "@/features/knowledge/queries";
import { AdminKnowledgeTable } from "@/features/knowledge/components/admin-knowledge-table";
import { KnowledgeContentStatus, KnowledgeContentType } from "@/features/knowledge/types";
import {
  BookOpen,
  PlusCircle,
  ArrowLeft,
} from "lucide-react";

interface AdminKnowledgePageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Knowledge & Editorial Console | AgroMarket Admin",
  description: "Curate agricultural guides, publish news bulletins, and manage extension advisories.",
};

export default async function AdminKnowledgePage({
  searchParams,
}: AdminKnowledgePageProps) {
  const user = await requireAnyRole(["ADMIN", "EXPERT"]);
  const isAdmin = hasRole(user.roles, "ADMIN");

  const resolved = await searchParams;
  const page = resolved.page ? parseInt(resolved.page, 10) : 1;

  const { articles, totalCount } = await getAdminArticles({
    search: resolved.search,
    status:
      resolved.status && resolved.status !== "all"
        ? (resolved.status as KnowledgeContentStatus)
        : undefined,
    contentType:
      resolved.type && resolved.type !== "all"
        ? (resolved.type as KnowledgeContentType)
        : undefined,
    page,
    limit: 25,
  });

  const publishedCount = articles.filter((a) => a.status === "PUBLISHED").length;
  const draftCount = articles.filter((a) => a.status === "DRAFT").length;
  const archivedCount = articles.filter((a) => a.status === "ARCHIVED").length;

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/admin"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Admin Console
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <BookOpen className="h-4 w-4" />
              <span>Editorial Governance & Knowledge Hub</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
              Knowledge & Information Management
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              Author and moderate agricultural news, expert advisories, government programmes, events, and nutrition standards.
            </p>
          </div>

          <Link
            href="/admin/knowledge/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition min-h-[44px] shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create New Article</span>
          </Link>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-medium text-neutral-500">Total Managed</span>
            <div className="mt-1 text-2xl font-bold text-neutral-900">{totalCount}</div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
            <span className="text-xs font-medium text-emerald-800">Published Active</span>
            <div className="mt-1 text-2xl font-bold text-emerald-700">{publishedCount}</div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <span className="text-xs font-medium text-amber-800">Drafts (In Review)</span>
            <div className="mt-1 text-2xl font-bold text-amber-700">{draftCount}</div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
            <span className="text-xs font-medium text-neutral-600">Archived Records</span>
            <div className="mt-1 text-2xl font-bold text-neutral-700">{archivedCount}</div>
          </div>
        </div>

        {/* Articles Table */}
        <div className="space-y-4">
          <AdminKnowledgeTable articles={articles} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}
