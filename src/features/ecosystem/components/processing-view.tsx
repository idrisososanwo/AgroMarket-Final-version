"use client";

import { useState } from "react";
import { ProcessingFacility, ProcessingEvent } from "../types";
import { Factory, ArrowRight, MapPin, CheckCircle, RefreshCw } from "lucide-react";

interface ProcessingViewProps {
  facilities: ProcessingFacility[];
  events: ProcessingEvent[];
}

export function ProcessingView({ facilities, events }: ProcessingViewProps) {
  const [activeTab, setActiveTab] = useState<"FACILITIES" | "TRANSFORMATIONS">("FACILITIES");

  return (
    <div className="space-y-4">
      {/* Header and Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">
            Processing & Transformation Facilities
          </h2>
          <p className="text-xs text-neutral-500">
            Certified third-party abattoirs, poultry dressing lines, cassava mills, and fish drying centers.
          </p>
        </div>

        <div className="flex rounded-lg border border-neutral-200 bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("FACILITIES")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "FACILITIES"
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Processing Facilities ({facilities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TRANSFORMATIONS")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "TRANSFORMATIONS"
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Transformations ({events.length})
          </button>
        </div>
      </div>

      {/* Facilities Tab */}
      {activeTab === "FACILITIES" && (
        <div>
          {facilities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <Factory className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-neutral-900">
                No Processing Facilities Registered Yet
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
                Third-party abattoirs, grain mills, feed plants, and dairy packing centers register here to offer toll processing, portioning, and dressing services to the agricultural ecosystem.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {facilities.map((fac) => (
                <div
                  key={fac.id}
                  className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs transition hover:border-emerald-200 hover:shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        {fac.facilityType.replace(/_/g, " ")}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    </div>

                    <h3 className="mt-2 text-base font-bold text-neutral-900">
                      {fac.name}
                    </h3>

                    {fac.processingCapacityValue && (
                      <p className="mt-1 text-xs text-neutral-600">
                        Capacity: <strong>{fac.processingCapacityValue.toLocaleString()} {fac.processingCapacityUnit || "units/day"}</strong>
                      </p>
                    )}

                    {/* Services Offered */}
                    {fac.servicesOffered && fac.servicesOffered.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[11px] font-semibold text-neutral-600">Services:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {fac.servicesOffered.map((srv, i) => (
                            <span
                              key={i}
                              className="rounded-sm bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700"
                            >
                              {srv}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Supported Commodities */}
                    {fac.supportedCommodities && fac.supportedCommodities.length > 0 && (
                      <div className="mt-2">
                        <span className="text-[11px] font-semibold text-neutral-600">Commodities:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {fac.supportedCommodities.map((comm, idx) => (
                            <span
                              key={idx}
                              className="rounded-sm bg-amber-50/70 border border-amber-200/60 px-2 py-0.5 text-[10px] font-medium text-amber-900"
                            >
                              {comm}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                      {fac.lga}, {fac.state}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {fac.generalLocation || "Verified Facility"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transformations Tab */}
      {activeTab === "TRANSFORMATIONS" && (
        <div>
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-700">
                <RefreshCw className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-neutral-900">
                No Processing Transformation Events Recorded
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
                Transformation records (e.g. live broilers dressed into frozen cuts, raw milk pasteurized into yoghurt, cassava tubers grated into garri) will be appended here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-800">
                        {ev.processType.replace(/_/g, " ")}
                      </span>
                      {ev.batchReference && (
                        <span className="text-xs font-mono text-neutral-400">
                          Ref: #{ev.batchReference}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400">{ev.startedAt}</span>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 rounded-lg bg-neutral-50 p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
                    <div>
                      <span className="text-neutral-500">INPUT:</span>{" "}
                      <strong className="text-neutral-800">
                        {ev.inputQuantity} {ev.inputUnit}
                      </strong>{" "}
                      ({ev.inputDescription})
                    </div>
                    <ArrowRight className="h-4 w-4 text-neutral-400 hidden sm:block" />
                    <div>
                      <span className="text-neutral-500">OUTPUT:</span>{" "}
                      <strong className="text-emerald-700">
                        {ev.outputQuantity} {ev.outputUnit}
                      </strong>{" "}
                      ({ev.outputDescription})
                    </div>
                  </div>

                  {ev.yieldPercentage !== null && ev.yieldPercentage !== undefined && (
                    <div className="mt-2 text-[11px] text-neutral-500">
                      Calculated Processing Yield: <strong>{ev.yieldPercentage}%</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
