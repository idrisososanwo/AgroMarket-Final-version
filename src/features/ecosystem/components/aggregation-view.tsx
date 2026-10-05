"use client";

import { AggregationPool } from "../types";
import { Layers, MapPin, Calendar } from "lucide-react";

interface AggregationViewProps {
  pools: AggregationPool[];
}

export function AggregationView({ pools }: AggregationViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">
          Supply Aggregation Pools
        </h2>
        <p className="text-xs text-neutral-500">
          Consolidating dispersed producer outputs into structured, reliable supply pools for bulk buyers and industrial processors.
        </p>
      </div>

      {pools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-neutral-900">
            No Active Aggregation Pools
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
            Aggregators and farmer cooperatives open pooled supply batches here. Once registered, smallholders can pledge their harvest outputs to meet large volume orders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => {
            const percent = Math.min(
              Math.round((pool.currentQuantity / pool.targetQuantity) * 100),
              100
            );

            return (
              <div
                key={pool.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs transition hover:border-emerald-200 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                      {pool.status}
                    </span>
                    <span className="text-xs font-semibold text-neutral-500">
                      {pool.commodity}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-bold text-neutral-900">
                    {pool.title}
                  </h3>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Pooled Progress</span>
                      <span className="font-bold text-neutral-800">{percent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-0.5">
                      <span>{pool.currentQuantity.toLocaleString()} {pool.unit}</span>
                      <span>Target: {pool.targetQuantity.toLocaleString()} {pool.unit}</span>
                    </div>
                  </div>

                  {pool.collectionCenterName && (
                    <p className="mt-3 text-xs text-neutral-600">
                      <span className="font-medium text-neutral-700">Collection Point:</span>{" "}
                      {pool.collectionCenterName}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                    {pool.lga}, {pool.state}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                    Due {pool.expectedAvailabilityDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
