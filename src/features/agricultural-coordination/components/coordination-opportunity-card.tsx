import React from "react";
import Link from "next/link";
import { CoordinationOpportunity, CoordinationCoverageSummary } from "../types";
import { CoordinationStatusBadge } from "./coordination-status-badge";
import { CoverageProgressBar } from "./coverage-progress-bar";
import { calculateCoordinationCoverage } from "../calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, ArrowRight, Layers, ShieldCheck } from "lucide-react";

export interface CoordinationOpportunityCardProps {
  opportunity: CoordinationOpportunity;
}

export function CoordinationOpportunityCard({
  opportunity,
}: CoordinationOpportunityCardProps) {
  const coverage: CoordinationCoverageSummary = calculateCoordinationCoverage({
    opportunityId: opportunity.id,
    requiredQuantityKg: opportunity.canonicalQuantityKg,
    acceptedCommitments: [
      {
        canonicalQuantityKg: opportunity.acceptedQuantity,
        status: "ACCEPTED",
      },
    ],
    fulfilledQuantityKg: opportunity.fulfilledQuantity,
  });

  return (
    <Card className="border-[#E5E0D5] bg-white hover:border-[#0F4327]/30 hover:shadow-xs transition-all">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <CoordinationStatusBadge status={opportunity.status} size="sm" />
            {opportunity.processingRequired && (
              <span className="text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                Processing Required
              </span>
            )}
            {opportunity.logisticsRequired && (
              <span className="text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                Logistics Planned
              </span>
            )}
          </div>
          <span className="text-xs font-mono font-medium text-neutral-500">
            {opportunity.commodity}
          </span>
        </div>

        <CardTitle className="text-base font-bold text-neutral-900 line-clamp-1">
          {opportunity.title}
        </CardTitle>

        <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 mt-2">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-neutral-400" />
            <span>
              {opportunity.targetLga}, {opportunity.targetState}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            <span>
              {opportunity.deliveryWindowStart} to {opportunity.deliveryWindowEnd}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-neutral-400" />
            <span>
              Target: {opportunity.requiredQuantity.toLocaleString()} {opportunity.unit}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Coverage progress */}
        <CoverageProgressBar coverage={coverage} />

        <div className="pt-2 border-t border-[#E5E0D5] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>Governed Opportunity</span>
          </div>

          <Link
            href={`/coordination/${opportunity.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F4327] hover:underline"
          >
            <span>View Requirements & Commit</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
