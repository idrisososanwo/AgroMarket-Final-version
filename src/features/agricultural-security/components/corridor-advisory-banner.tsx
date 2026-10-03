import React from "react";
import Link from "next/link";
import { AlertTriangle, Truck, ShieldAlert } from "lucide-react";
import { LogisticsCorridorAdvisory } from "../types";
import { SeverityBadge } from "./severity-badge";

interface CorridorAdvisoryBannerProps {
  advisories: Record<string, LogisticsCorridorAdvisory>;
  className?: string;
}

export function CorridorAdvisoryBanner({
  advisories,
  className = "",
}: CorridorAdvisoryBannerProps) {
  const activeEntries = Object.values(advisories).filter(
    (adv) => adv.activeDisruptionsCount > 0
  );

  if (activeEntries.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="Agricultural Transit Corridor Advisory"
      className={`rounded-2xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 shadow-sm space-y-3 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
          <Truck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-amber-950">
              Active Agricultural Logistics Corridor Advisories
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-semibold">
              {activeEntries.length} Region{activeEntries.length > 1 ? "s" : ""} Affected
            </span>
          </div>
          <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
            Reported disruptions or movement restrictions have been recorded in corridor states
            relevant to freight transit. Logistics operators and drivers should exercise heightened
            caution, verify road accessibility with local dispatch, and plan daylight travel.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
        {activeEntries.map((adv) => (
          <div
            key={adv.state}
            className="p-3 rounded-xl bg-white/90 border border-amber-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-sm text-gray-900">{adv.state} State</span>
                {adv.highestSeverity && <SeverityBadge severity={adv.highestSeverity} />}
              </div>
              {adv.latestIncidentTitle && (
                <p className="text-xs text-gray-700 font-medium line-clamp-1 mb-1">
                  {adv.latestIncidentTitle}
                </p>
              )}
              {adv.hasMovementRestrictions && (
                <span className="inline-flex items-center text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                  <ShieldAlert className="w-3 h-3 mr-1" />
                  Movement Restriction Active
                </span>
              )}
            </div>

            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">
                {adv.activeDisruptionsCount} active report{adv.activeDisruptionsCount > 1 ? "s" : ""}
              </span>
              <Link
                href={`/learn/security?state=${encodeURIComponent(adv.state)}`}
                className="font-semibold text-emerald-800 hover:text-emerald-900 underline"
              >
                Review State Notices →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-amber-200/70 text-[11px] text-amber-800 flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>
          Contextual advisory only. AgroMarket does not operate armed convoys, escort fleets, or
          guarantee roadway security.
        </span>
      </div>
    </div>
  );
}
