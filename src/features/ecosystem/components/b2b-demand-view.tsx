"use client";

import { useState } from "react";
import { B2BDemand, ValueChainMatchResult } from "../types";
import { evaluateCoordinatedMatchAction } from "../actions";
import {
  ShoppingBag,
  MapPin,
  Calendar,
  Sparkles,
  Truck,
  Factory,
  Package,
} from "lucide-react";
import { formatNGN } from "@/features/marketplace/constants";

interface B2BDemandViewProps {
  demands: B2BDemand[];
}

export function B2BDemandView({ demands }: B2BDemandViewProps) {
  const [inspectingDemandId, setInspectingDemandId] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<ValueChainMatchResult | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState<boolean>(false);

  const handleInspectMatch = async (demand: B2BDemand) => {
    setInspectingDemandId(demand.id);
    setIsLoadingMatch(true);
    try {
      const res = await evaluateCoordinatedMatchAction(demand.id);
      if (res.success && res.data) {
        setMatchResult(res.data);
      }
    } catch (err) {
      console.error("Match inspection error:", err);
    } finally {
      setIsLoadingMatch(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">
          Structured B2B Offtake Demand
        </h2>
        <p className="text-xs text-neutral-500">
          Recurring and spot purchase requests from restaurants, hotels, food processors, and institutional buyers.
        </p>
      </div>

      {demands.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-700">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-neutral-900">
            No B2B Demands Currently Open
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
            Commercial and institutional buyers specify bulk requirements here (e.g. 500kg processed chicken weekly in Lagos). AgroMarket&apos;s matching engine evaluates supply, abattoir dressing capacity, and cold logistics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {demands.map((demand) => (
            <div
              key={demand.id}
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs transition hover:border-emerald-200 hover:shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                    {demand.frequency} DEMAND
                  </span>
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">
                    {demand.status}
                  </span>
                </div>

                <h3 className="mt-2 text-base font-bold text-neutral-900">
                  {demand.title}
                </h3>
                <p className="text-xs font-semibold text-emerald-800">
                  {demand.commodityOrProduct}
                </p>

                <div className="mt-3 flex items-baseline gap-1.5 text-neutral-900 font-extrabold text-xl">
                  <span>{demand.quantity.toLocaleString()}</span>
                  <span className="text-xs font-normal text-neutral-500">{demand.unit}</span>
                </div>

                {demand.targetPricePerUnit && (
                  <p className="mt-1 text-xs text-neutral-600">
                    Target Budget: <strong>{formatNGN(demand.targetPricePerUnit)}</strong> / {demand.unit}
                  </p>
                )}

                {demand.notes && (
                  <p className="mt-2 text-xs text-neutral-500 line-clamp-2">
                    {demand.notes}
                  </p>
                )}
              </div>

              <div className="mt-4 space-y-3 border-t border-neutral-100 pt-3">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                    {demand.lga}, {demand.state}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                    Needed by {demand.desiredDeliveryDate}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleInspectMatch(demand)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition border border-emerald-200"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  Evaluate Coordinated Match
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Match Results Inspection Modal / Panel */}
      {inspectingDemandId && (
        <div className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Deterministic Coordination Engine
                </span>
                <span className="text-xs text-neutral-500">Core Domain 9</span>
              </div>
              <h3 className="mt-1 text-base font-bold text-neutral-900">
                Supply ↔ Processing ↔ Logistics Match Evaluation
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setInspectingDemandId(null);
                setMatchResult(null);
              }}
              className="text-xs text-neutral-400 hover:text-neutral-700"
            >
              Close Panel ✕
            </button>
          </div>

          {isLoadingMatch ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              Evaluating candidate producer outputs, processing facilities, and regional transport carriers...
            </div>
          ) : matchResult ? (
            <div className="space-y-4 pt-2">
              {/* Score Banner */}
              <div className="flex flex-col gap-3 rounded-lg bg-emerald-50 p-4 border border-emerald-100 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-medium text-emerald-800">Ecosystem Alignment Score</span>
                  <div className="text-2xl font-extrabold text-emerald-950">
                    {matchResult.totalMatchScore} <span className="text-sm font-normal text-emerald-700">/ 100</span>
                  </div>
                </div>
                <p className="text-xs text-emerald-900/80 max-w-lg leading-relaxed">
                  {matchResult.matchSummary}
                </p>
              </div>

              {/* Three-Column Subsystem Matches */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* 1. Supply Match */}
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                    <Package className="h-4 w-4 text-emerald-700" />
                    <span>Candidate Supply Pools</span>
                  </div>
                  {matchResult.supplyMatches.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic">
                      No direct supplier batches found matching this commodity.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {matchResult.supplyMatches.slice(0, 3).map((sm, i) => (
                        <div key={i} className="rounded-md bg-white p-2.5 border border-neutral-200 text-xs shadow-2xs">
                          <div className="flex items-center justify-between font-semibold text-neutral-800">
                            <span>{sm.supply.producerOrAggregatorName}</span>
                            <span className="text-emerald-700">{sm.score}%</span>
                          </div>
                          <p className="text-[11px] text-neutral-500">
                            {sm.supply.availableQuantity} {sm.supply.unit} • {sm.supply.state} ({sm.corridorProximity})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Processing Facility Match */}
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                    <Factory className="h-4 w-4 text-amber-700" />
                    <span>Processing Facilities</span>
                  </div>
                  {matchResult.processingFacilityMatches.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic">
                      No specialized processors found supporting this commodity.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {matchResult.processingFacilityMatches.slice(0, 3).map((fm, i) => (
                        <div key={i} className="rounded-md bg-white p-2.5 border border-neutral-200 text-xs shadow-2xs">
                          <div className="flex items-center justify-between font-semibold text-neutral-800">
                            <span>{fm.facility.name}</span>
                            <span className="text-amber-700">{fm.score}%</span>
                          </div>
                          <p className="text-[11px] text-neutral-500">
                            {fm.facility.facilityType.replace(/_/g, " ")} • {fm.facility.state}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Logistics Match */}
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                    <Truck className="h-4 w-4 text-indigo-700" />
                    <span>Logistics Carriers</span>
                  </div>
                  {matchResult.logisticsMatches.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic">
                      No active freight or cold-chain carriers registered on this corridor.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {matchResult.logisticsMatches.slice(0, 3).map((lm, i) => (
                        <div key={i} className="rounded-md bg-white p-2.5 border border-neutral-200 text-xs shadow-2xs">
                          <div className="flex items-center justify-between font-semibold text-neutral-800">
                            <span>{lm.logistics.companyName}</span>
                            <span className="text-indigo-700">{lm.score}%</span>
                          </div>
                          <p className="text-[11px] text-neutral-500">
                            {lm.logistics.hasRefrigeration ? "Cold-Chain Reefer" : "Standard Freight"} • {lm.routeFeasibility}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
