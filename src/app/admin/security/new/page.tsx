import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { AdminSecurityForm } from "@/features/agricultural-security/components/admin-security-form";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Agricultural Security Incident | AgroMarket Admin",
  description: "Record and attribute a new physical agricultural security incident, corridor alert, or farm-access notice.",
};

export default async function NewSecurityIncidentPage() {
  const user = await requireAnyRole(["ADMIN", "EXPERT"]);
  const isAdmin = hasRole(user.roles, "ADMIN");

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
            <span className="font-semibold text-gray-800">New Incident</span>
          </nav>

          <Link
            href="/admin/security"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to List
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold text-gray-900">
            Record New Agricultural Security Incident
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Provide sourced, structured intelligence regarding farm access disruptions, transit
            corridor incidents, or movement restrictions.
          </p>
        </div>

        {/* Editor Form */}
        <AdminSecurityForm isAdmin={isAdmin} />
      </div>
    </div>
  );
}
