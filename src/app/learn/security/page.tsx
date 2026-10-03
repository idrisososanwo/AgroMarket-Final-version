import Link from "next/link";
import { getPublishedSecurityIncidents } from "@/features/agricultural-security/queries";
import { SecurityIncidentCard } from "@/features/agricultural-security/components/security-incident-card";
import { SecurityFilterBar } from "@/features/agricultural-security/components/security-filter-bar";
import { SecurityDisclaimerBanner } from "@/features/agricultural-security/components/security-disclaimer-banner";
import {
  SecurityIncidentType,
  SecurityIncidentSeverity,
  SecurityVerificationStatus,
} from "@/features/agricultural-security/types";
import { SECURITY_EMPTY_STATE_MESSAGE } from "@/features/agricultural-security/constants";
import { ShieldAlert, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

interface SecurityPageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    severity?: string;
    verification?: string;
    state?: string;
    commodity?: string;
    page?: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agricultural Security & Food Resilience | AgroMarket",
  description:
    "Decision-support notices on agricultural corridors, movement disruptions, farm access conditions, and commodity security across Nigerian agricultural regions.",
};

export default async function SecurityPage({ searchParams }: SecurityPageProps) {
  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
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

  const state =
    resolvedParams.state && resolvedParams.state !== "all"
      ? resolvedParams.state
      : undefined;

  const { incidents, totalCount, totalPages } = await getPublishedSecurityIncidents({
    search: resolvedParams.search,
    incidentType,
    severity,
    verificationStatus,
    state,
    commodity: resolvedParams.commodity,
    page,
    limit: 12,
  });

  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (resolvedParams.search) params.set("search", resolvedParams.search);
    if (resolvedParams.type && resolvedParams.type !== "all") params.set("type", resolvedParams.type);
    if (resolvedParams.severity && resolvedParams.severity !== "all") {
      params.set("severity", resolvedParams.severity);
    }
    if (resolvedParams.verification && resolvedParams.verification !== "all") {
      params.set("verification", resolvedParams.verification);
    }
    if (resolvedParams.state && resolvedParams.state !== "all") params.set("state", resolvedParams.state);
    if (resolvedParams.commodity) params.set("commodity", resolvedParams.commodity);
    params.set("page", newPage.toString());
    return `/learn/security?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50/70 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb back to Knowledge Hub */}
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500 flex items-center gap-1.5">
          <Link href="/learn" className="hover:text-emerald-700 transition">
            Knowledge Hub
          </Link>
          <span>/</span>
          <span className="font-semibold text-gray-800">Agricultural Security & Food Resilience</span>
        </nav>

        {/* Hero Section */}
        <div className="rounded-2xl border border-emerald-900/30 bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 p-6 sm:p-10 text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
              <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
              <span>Physical Agricultural Security & Food Resilience</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Agricultural Security & Transit Corridor Notices
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              AgroMarket coordinates structured, decision-support information regarding physical
              agricultural security, transit corridors, movement restrictions, and farm-access
              disruptions. Our platform supports food security through transparency while strictly
              protecting private grower coordinates.
            </p>
          </div>

          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Mandatory Decision Support Disclaimer */}
        <SecurityDisclaimerBanner />

        {/* Filter and Search Bar */}
        <SecurityFilterBar
          initialSearch={resolvedParams.search}
          initialType={resolvedParams.type}
          initialSeverity={resolvedParams.severity}
          initialVerification={resolvedParams.verification}
          initialState={resolvedParams.state}
        />

        {/* Incidents Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-gray-700">
              Showing {incidents.length} of {totalCount} published notices
            </span>
            {page > 1 && <span>Page {page} of {totalPages}</span>}
          </div>

          {incidents.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                {SECURITY_EMPTY_STATE_MESSAGE}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
                AgroMarket strictly publishes verified and attributed agricultural security records.
                If no notices appear for your query, no active disruptions matching those criteria
                have been verified by editorial authorities.
              </p>
              {resolvedParams.search || resolvedParams.state || resolvedParams.type ? (
                <div className="pt-2">
                  <Link
                    href="/learn/security"
                    className="inline-flex items-center px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                  >
                    Reset Search Filters
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {incidents.map((incident) => (
                <SecurityIncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 border-t border-gray-200">
              {page > 1 && (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Link>
              )}

              <span className="text-xs font-medium text-gray-600 px-3">
                Page {page} of {totalPages}
              </span>

              {page < totalPages && (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
