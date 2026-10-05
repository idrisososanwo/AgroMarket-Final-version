"use client";

import { IntelligenceSignal } from "../types";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PackageX,
  PackageCheck,
  Factory,
  Truck,
  ShieldAlert,
  Calendar,
  Layers,
} from "lucide-react";

interface SignalsFeedProps {
  signals: IntelligenceSignal[];
}

export function SignalsFeed({ signals }: SignalsFeedProps) {
  const getSignalIcon = (type: IntelligenceSignal["signalType"]) => {
    switch (type) {
      case "PRICE_INCREASE":
        return <TrendingUp className="h-4 w-4 text-rose-600" />;
      case "PRICE_DECREASE":
        return <TrendingDown className="h-4 w-4 text-emerald-600" />;
      case "DEMAND_INCREASE":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case "DEMAND_DECREASE":
        return <TrendingDown className="h-4 w-4 text-amber-600" />;
      case "SUPPLY_SHORTAGE":
        return <PackageX className="h-4 w-4 text-red-600" />;
      case "SUPPLY_SURPLUS":
        return <PackageCheck className="h-4 w-4 text-emerald-600" />;
      case "PROCESSING_BOTTLENECK":
        return <Factory className="h-4 w-4 text-purple-600" />;
      case "LOGISTICS_DISRUPTION":
        return <Truck className="h-4 w-4 text-amber-600" />;
      case "SECURITY_DISRUPTION":
        return <ShieldAlert className="h-4 w-4 text-red-700" />;
      case "DISEASE_RISK":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "SEASONAL_DEMAND":
        return <Calendar className="h-4 w-4 text-indigo-600" />;
      default:
        return <Layers className="h-4 w-4 text-neutral-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900">
            Active Deterministic Signals Feed
          </h2>
          <p className="text-xs text-neutral-500">
            Signals generated strictly from mathematical thresholds, real orders, and verified records.
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
          {signals.length} Signals
        </span>
      </div>

      {signals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
          <p className="text-xs text-neutral-500">
            No active signals currently detected. Signals are emitted deterministically when price swings, supply deficits, or verified security incidents occur.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((sig) => (
            <div
              key={sig.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100">
                    {getSignalIcon(sig.signalType)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs font-bold text-neutral-900">
                        {sig.signalType.replace(/_/g, " ")}
                      </h3>
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                        {sig.commodity}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      {sig.state} {sig.lga ? `• ${sig.lga}` : ""} {sig.corridor ? `• Corridor: ${sig.corridor}` : ""}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-neutral-900">
                    {sig.magnitude > 0 ? `+${sig.magnitude}%` : `${sig.magnitude}%`}
                  </span>
                  <div className="text-[10px] text-neutral-400">
                    Confidence: {Math.round(sig.confidence * 100)}%
                  </div>
                </div>
              </div>

              {sig.evidence.length > 0 && (
                <div className="mt-3 rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-700">
                  <div className="text-[10px] font-semibold uppercase text-neutral-400">
                    Evidence ({sig.evidence[0].sourceType})
                  </div>
                  <p className="mt-0.5 text-xs">{sig.evidence[0].description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
