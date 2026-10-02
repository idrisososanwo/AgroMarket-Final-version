"use client";

import { useTransition } from "react";
import Link from "next/link";
import { KnowledgeArticle, KnowledgeContentStatus } from "../types";
import { ContentTypeBadge } from "./content-type-badge";
import { changeArticleStatusAction, deleteKnowledgeArticleAction } from "../actions";
import {
  Edit3,
  Archive,
  CheckCircle,
  Trash2,
  ExternalLink,
  Clock,
} from "lucide-react";

interface AdminKnowledgeTableProps {
  articles: KnowledgeArticle[];
  isAdmin: boolean;
}

export function AdminKnowledgeTable({
  articles,
  isAdmin,
}: AdminKnowledgeTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (id: string, status: KnowledgeContentStatus) => {
    startTransition(async () => {
      await changeArticleStatusAction({ id, status });
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this article? This action cannot be undone.")) {
      return;
    }
    startTransition(async () => {
      await deleteKnowledgeArticleAction(id);
    });
  };

  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
        <Clock className="mx-auto h-8 w-8 text-neutral-400" />
        <h3 className="mt-3 text-sm font-bold text-neutral-900">
          No Knowledge Articles Found
        </h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
          No articles match your current filter parameters. Create your first agronomic guide, news bulletin, or government notice.
        </p>
        <div className="mt-5">
          <Link
            href="/admin/knowledge/new"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition min-h-[40px]"
          >
            Create New Article
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: KnowledgeContentStatus) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            Published
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-200 text-neutral-700">
            Archived
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs text-neutral-600">
        <thead className="bg-neutral-50/80 border-b border-neutral-200 font-semibold text-neutral-900 uppercase tracking-wider text-[11px]">
          <tr>
            <th className="py-3 px-4">Article</th>
            <th className="py-3 px-4">Category</th>
            <th className="py-3 px-4">Topic / Region</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Date</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 font-medium">
          {articles.map((article) => (
            <tr key={article.id} className="hover:bg-neutral-50/50 transition">
              <td className="py-3 px-4 max-w-xs">
                <div className="font-bold text-neutral-900 line-clamp-1">
                  {article.title}
                </div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  /learn/{article.slug}
                </div>
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                <ContentTypeBadge type={article.contentType} size="sm" />
              </td>
              <td className="py-3 px-4">
                <div className="text-neutral-800">{article.topic || "General"}</div>
                {article.state && (
                  <div className="text-[11px] text-neutral-400">
                    {article.lga ? `${article.lga}, ` : ""}
                    {article.state}
                  </div>
                )}
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                {getStatusBadge(article.status)}
              </td>
              <td className="py-3 px-4 whitespace-nowrap text-[11px] text-neutral-500">
                {new Date(article.createdAt).toLocaleDateString("en-NG", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 px-4 text-right whitespace-nowrap">
                <div className="inline-flex items-center gap-1.5">
                  <Link
                    href={`/admin/knowledge/${article.id}`}
                    title="Edit article"
                    className="p-1.5 text-neutral-500 hover:text-emerald-700 hover:bg-neutral-100 rounded-md transition"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Link>

                  {article.status === "PUBLISHED" ? (
                    <>
                      <Link
                        href={`/learn/${article.slug}`}
                        target="_blank"
                        title="View public article"
                        className="p-1.5 text-neutral-500 hover:text-blue-600 hover:bg-neutral-100 rounded-md transition"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleStatusChange(article.id, "ARCHIVED")}
                        title="Archive article"
                        className="p-1.5 text-neutral-500 hover:text-amber-700 hover:bg-neutral-100 rounded-md transition disabled:opacity-50"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleStatusChange(article.id, "PUBLISHED")}
                      title="Publish article"
                      className="p-1.5 text-neutral-500 hover:text-emerald-700 hover:bg-neutral-100 rounded-md transition disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </button>
                  )}

                  {(isAdmin || article.status === "DRAFT") && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(article.id)}
                      title="Delete article"
                      className="p-1.5 text-neutral-500 hover:text-red-700 hover:bg-neutral-100 rounded-md transition disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
