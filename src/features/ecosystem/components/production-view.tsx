"use client";

import { useState } from "react";
import { ProductionUnit, ProductionOutput } from "../types";
import { Tractor, Package, MapPin, Calendar, CheckCircle } from "lucide-react";

interface ProductionViewProps {
  productionUnits: ProductionUnit[];
  productionOutputs: ProductionOutput[];
}

export function ProductionView({
  productionUnits,
  productionOutputs,
}: ProductionViewProps) {
  const [activeTab, setActiveTab] = useState<"OUTPUTS" | "UNITS">("OUTPUTS");

  return (
    <div className="space-y-4">
      {/* Header and Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">
            Agricultural Production Layer
          </h2>
          <p className="text-xs text-neutral-500">
            Raw outputs (harvest batches, live animal pools, milk yields) separable from final marketplace listings.
          </p>
        </div>

        <div className="flex rounded-lg border border-neutral-200 bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("OUTPUTS")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "OUTPUTS"
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Production Outputs ({productionOutputs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("UNITS")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "UNITS"
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Production Units ({productionUnits.length})
          </button>
        </div>
      </div>

      {/* Outputs Tab */}
      {activeTab === "OUTPUTS" && (
        <div>
          {productionOutputs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-neutral-900">
                No Raw Production Outputs Registered
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
                Producers register harvest batches, raw milk, and live animal stocks here before aggregation or transformation. Currently no outputs have been registered.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productionOutputs.map((output) => (
                <div
                  key={output.id}
                  className="rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs transition hover:border-emerald-200 hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      {output.outputType.replace(/_/g, " ")}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                      {output.qualityGrade}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-bold text-neutral-900">
                    {output.commodityName}
                  </h3>

                  <div className="mt-3 flex items-baseline gap-1 text-emerald-700 font-extrabold text-xl">
                    <span>{output.quantity.toLocaleString()}</span>
                    <span className="text-xs font-normal text-neutral-500">{output.unit}</span>
                  </div>

                  {output.batchNumber && (
                    <p className="mt-1 text-[11px] font-mono text-neutral-400">
                      Batch #{output.batchNumber}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      {output.lga}, {output.state}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                      {output.harvestDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Units Tab */}
      {activeTab === "UNITS" && (
        <div>
          {productionUnits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Tractor className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-neutral-900">
                No Production Units Registered
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
                Farms, ranches, poultry units, and fish ponds registered by operators will appear here. No sensitive exact GPS coordinates or private addresses are publicly exposed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {productionUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs transition hover:border-emerald-200 hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                      {unit.unitType.replace(/_/g, " ")}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle className="h-3 w-3" /> {unit.status}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-bold text-neutral-900">{unit.name}</h3>

                  {unit.capacityValue && (
                    <p className="mt-1 text-xs text-neutral-600 font-medium">
                      Declared Capacity: {unit.capacityValue} {unit.capacityUnit || ""}
                    </p>
                  )}

                  {unit.commodities && unit.commodities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {unit.commodities.map((comm, idx) => (
                        <span
                          key={idx}
                          className="rounded-sm bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700"
                        >
                          {comm}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      {unit.lga}, {unit.state}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {unit.generalArea || "General Area"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
