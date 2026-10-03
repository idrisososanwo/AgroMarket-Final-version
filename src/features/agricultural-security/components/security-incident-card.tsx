import React from "react";
import Link from "next/link";
import { MapPin, Calendar, ExternalLink, Truck } from "lucide-react";
import { SecurityIncident } from "../types";
import { INCIDENT_TYPE_LABELS, SOURCE_TYPE_LABELS } from "../constants";
import { SeverityBadge } from "./severity-badge";
import { VerificationBadge } from "./verification-badge";

interface SecurityIncidentCardProps {
  incident: SecurityIncident;
  className?: string;
}

export function SecurityIncidentCard({
  incident,
  className = "",
}: SecurityIncidentCardProps) {
  const typeLabel = INCIDENT_TYPE_LABELS[incident.incidentType] || incident.incidentType;
  const sourceLabel = SOURCE_TYPE_LABELS[incident.sourceType] || incident.sourceType;

  const formattedDate = incident.occurredAt
    ? new Date(incident.occurredAt).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : incident.publishedAt
    ? new Date(incident.publishedAt).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : new Date(incident.reportedAt).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

  return (
    <article
      className={`bg-white rounded-2xl border border-gray-200/90 hover:border-gray-300 p-5 sm:p-6 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            {typeLabel}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <SeverityBadge severity={incident.severity} />
            <VerificationBadge status={incident.verificationStatus} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2 hover:text-emerald-700 transition">
          <Link href={`/learn/security/${incident.slug}`}>{incident.title}</Link>
        </h3>

        {/* Location & Time info */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 mt-2 mb-3">
          <span className="inline-flex items-center font-medium text-gray-700">
            <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
            {incident.state}
            {incident.lga ? `, ${incident.lga} (General Area)` : ""}
          </span>
          <span className="inline-flex items-center text-gray-500">
            <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
            {formattedDate}
          </span>
        </div>

        {/* Description snippet */}
        <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
          {incident.description}
        </p>

        {/* Corridor / Movement warning snippet */}
        {incident.movementImpact && (
          <div className="mb-4 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <Truck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-950">Transit Corridor Advisory:</span>{" "}
              <span className="line-clamp-2">{incident.movementImpact}</span>
            </div>
          </div>
        )}

        {/* Affected Commodities */}
        {incident.affectedCommodities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <span className="text-xs font-medium text-gray-500 mr-1">Commodities:</span>
            {incident.affectedCommodities.map((item) => (
              <span
                key={item}
                className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-700"
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Source attribution & Read button */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <div className="truncate pr-2">
          <span className="text-gray-400">Attributed to: </span>
          <span className="font-semibold text-gray-700">{incident.sourceName}</span>
          <span className="text-gray-400 ml-1">({sourceLabel})</span>
        </div>
        <Link
          href={`/learn/security/${incident.slug}`}
          className="shrink-0 font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
        >
          View Details
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </article>
  );
}
