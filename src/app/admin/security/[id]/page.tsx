import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { getSecurityIncidentByIdForAdmin } from "@/features/agricultural-security/queries";
import { AdminSecurityForm } from "@/features/agricultural-security/components/admin-security-form";
import { ArrowLeft } from "lucide-react";

interface EditSecurityIncidentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Security Incident | AgroMarket Admin",
  description: "Update verification status, source context, or security impact notes.",
};

export default async function EditSecurityIncidentPage({
  params,
}: EditSecurityIncidentPageProps) {
  const user = await requireAnyRole(["ADMIN", "EXPERT"]);
  const isAdmin = hasRole(user.roles, "ADMIN");
  const { id } = await params;

  const incident = await getSecurityIncidentByIdForAdmin(id);

  if (!incident) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50/70 pb-16 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <nav aria-label="Breadcrumb" className="text-xs text-gray-500 flex items-center gap-1.5">
            <Link href="/admin" className="hover:text-emerald-700 transition">
              Admin Overview
            </Link>
            <span>/</span>
            <Link href="/admin/security" className="hover:text-emerald-700 transition">
              Agricultural Security
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-800 line-clamp-1">{incident.title}</span>
          </nav>

          <Link
            href="/admin/security"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to List
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Edit Security Incident Record
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Updating incident ID: <span className="font-mono text-gray-700">{incident.id}</span>
            </p>
          </div>

          {incident.status === "PUBLISHED" && (
            <Link
              href={`/learn/security/${incident.slug}`}
              target="_blank"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0"
            >
              View Live Notice →
            </Link>
          )}
        </div>

        {/* Editor Form */}
        <AdminSecurityForm initialData={incident} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
