import { notFound } from "next/navigation";
import Link from "next/link";
import { getSecurityIncidentBySlug } from "@/features/agricultural-security/queries";
import { SeverityBadge } from "@/features/agricultural-security/components/severity-badge";
import { VerificationBadge } from "@/features/agricultural-security/components/verification-badge";
import { SecurityDisclaimerBanner } from "@/features/agricultural-security/components/security-disclaimer-banner";
import {
  INCIDENT_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  LOCATION_SCOPE_LABELS,
} from "@/features/agricultural-security/constants";
import {
  MapPin,
  Calendar,
  ExternalLink,
  Truck,
  Apple,
  ArrowLeft,
  FileCheck,
} from "lucide-react";

interface SecurityDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: SecurityDetailPageProps) {
  const { slug } = await params;
  const incident = await getSecurityIncidentBySlug(slug);

  if (!incident) {
    return {
      title: "Security Notice Not Found | AgroMarket",
    };
  }

  return {
    title: `${incident.title} | AgroMarket Security Advisory`,
    description: incident.description.slice(0, 160),
  };
}

export default async function SecurityDetailPage({ params }: SecurityDetailPageProps) {
  const { slug } = await params;
  const incident = await getSecurityIncidentBySlug(slug);

  if (!incident) {
    notFound();
  }

  const typeLabel = INCIDENT_TYPE_LABELS[incident.incidentType] || incident.incidentType;
  const sourceLabel = SOURCE_TYPE_LABELS[incident.sourceType] || incident.sourceType;
  const locationScopeLabel = LOCATION_SCOPE_LABELS[incident.locationScope] || incident.locationScope;

  const formattedOccurred = incident.occurredAt
    ? new Date(incident.occurredAt).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const formattedReported = new Date(incident.reportedAt).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const formattedPublished = incident.publishedAt
    ? new Date(incident.publishedAt).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <article className="min-h-screen bg-gray-50/70 pb-16 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-gray-500 flex items-center gap-1.5">
          <Link href="/learn" className="hover:text-emerald-700 transition">
            Knowledge Hub
          </Link>
          <span>/</span>
          <Link href="/learn/security" className="hover:text-emerald-700 transition">
            Agricultural Security
          </Link>
          <span>/</span>
          <span className="font-semibold text-gray-800 line-clamp-1">{incident.title}</span>
        </nav>

        {/* Back Link */}
        <div>
          <Link
            href="/learn/security"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Security Notices
          </Link>
        </div>

        {/* Top Disclaimer */}
        <SecurityDisclaimerBanner />

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header Metadata */}
          <div className="space-y-3 border-b border-gray-100 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                {typeLabel}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={incident.severity} />
                <VerificationBadge status={incident.verificationStatus} />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
              {incident.title}
            </h1>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-500 pt-1">
              <span className="inline-flex items-center font-medium text-gray-700">
                <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                {incident.state}
                {incident.lga ? `, ${incident.lga}` : ""} ({locationScopeLabel})
              </span>
              <span className="inline-flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                Reported: {formattedReported}
              </span>
              {formattedOccurred && (
                <span className="inline-flex items-center text-gray-600">
                  Occurred: {formattedOccurred}
                </span>
              )}
            </div>
          </div>

          {/* Narrative Body */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Incident Narrative & Context
            </h2>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
              {incident.description}
            </div>
          </div>

          {/* Logistics Corridor Advisory Section (if available) */}
          {incident.movementImpact && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                <Truck className="w-4 h-4 text-amber-700" />
                Logistics & Transport Corridor Movement Impact
              </div>
              <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
                {incident.movementImpact}
              </p>
            </div>
          )}

          {/* Food Security Impact Section (if available) */}
          {incident.foodSecurityImpact && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-950">
                <Apple className="w-4 h-4 text-emerald-700" />
                Agricultural Food Security & Supply Implications
              </div>
              <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                {incident.foodSecurityImpact}
              </p>
            </div>
          )}

          {/* Affected Commodities */}
          {incident.affectedCommodities.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Reported Affected Commodities
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {incident.affectedCommodities.map((comm) => (
                  <span
                    key={comm}
                    className="px-3 py-1 bg-gray-100 border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg"
                  >
                    {comm}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source Attribution Box */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700">
              <FileCheck className="w-4 h-4 text-emerald-700" />
              Source Context & Verification Metadata
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block">Attributing Body:</span>
                <span className="font-bold text-gray-900">{incident.sourceName}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Source Classification:</span>
                <span className="font-semibold text-gray-800">{sourceLabel}</span>
              </div>
              {incident.sourcePublicationDate && (
                <div>
                  <span className="text-gray-500 block">Source Publication Date:</span>
                  <span className="font-medium text-gray-800">
                    {new Date(incident.sourcePublicationDate).toLocaleDateString("en-NG", {
                      dateStyle: "medium",
                    })}
                  </span>
                </div>
              )}
              {formattedPublished && (
                <div>
                  <span className="text-gray-500 block">AgroMarket Published At:</span>
                  <span className="font-medium text-gray-800">{formattedPublished}</span>
                </div>
              )}
            </div>

            {incident.sourceUrl && (
              <div className="pt-2 border-t border-gray-200/80">
                <a
                  href={incident.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                >
                  View Primary Reference Document / Report
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
