import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { getAdminSecurityIncidents } from "@/features/agricultural-security/queries";
import { AdminSecurityTable } from "@/features/agricultural-security/components/admin-security-table";
import {
  SecurityIncidentStatus,
  SecurityIncidentType,
  SecurityIncidentSeverity,
  SecurityVerificationStatus,
} from "@/features/agricultural-security/types";
import { ShieldAlert, Plus, ArrowLeft } from "lucide-react";

interface AdminSecurityPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
    severity?: string;
    verification?: string;
    state?: string;
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agricultural Security Management | AgroMarket Admin",
  description: "Editorial management, verification, and publication of agricultural physical security notices and logistics corridor disruptions.",
};

export default async function AdminSecurityPage({
  searchParams,
}: AdminSecurityPageProps) {
  const user = await requireAnyRole(["ADMIN", "EXPERT"]);
  const _isAdmin = hasRole(user.roles, "ADMIN");
  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const status =
    resolvedParams.status && resolvedParams.status !== "all"
      ? (resolvedParams.status as SecurityIncidentStatus)
      : undefined;

  const incidentType =
    resolvedParams.type && resolvedParams.type !== "all"
      ? (resolvedParams.type as SecurityIncidentType)
      : undefined;

  const severity =
    resolvedParams.severity && resolvedParams.severity !== "all"
      ? (resolvedParams.severity as SecurityIncidentSeverity)
      : undefined;

  const verificationStatus =
    resolvedParams.verification && resolvedParams.verification !== "all"
      ? (resolvedParams.verification as SecurityVerificationStatus)
      : undefined;

  const { incidents, totalCount } = await getAdminSecurityIncidents({
    search: resolvedParams.search,
    status,
    incidentType,
    severity,
    verificationStatus,
    state: resolvedParams.state,
    page,
    limit: 20,
  });

  return (
    <div className="min-h-screen bg-gray-50/70 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <nav aria-label="Breadcrumb" className="text-xs text-gray-500 flex items-center gap-1.5">
            <Link href="/admin" className="hover:text-emerald-700 transition">
              Admin Overview
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-800">Agricultural Security Management</span>
          </nav>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
        </div>

        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold">
              <ShieldAlert className="w-3.5 h-3.5" />
              Phase 1.5 Security & Resilience Layer
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Agricultural Physical Security & Disruption Notices
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
              Record, verify, and publish agricultural security events, movement restrictions, and
              transit corridor advisories. Non-admin experts may submit drafts for editorial review.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/learn/security"
              target="_blank"
              className="px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              Public Notices Page
            </Link>
            <Link
              href="/admin/security/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> New Incident
            </Link>
          </div>
        </div>

        {/* Incidents Table */}
        <AdminSecurityTable incidents={incidents} totalCount={totalCount} />
      </div>
    </div>
  );
}
