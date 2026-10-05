"use client";

import { useState } from "react";
import { EcosystemActor, ECOSYSTEM_ACTOR_TYPES } from "../types";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { Users, CheckCircle2, MapPin, Briefcase, Filter } from "lucide-react";

interface ActorDirectoryProps {
  initialActors: EcosystemActor[];
}

export function ActorDirectory({ initialActors }: ActorDirectoryProps) {
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedState, setSelectedState] = useState<string>("ALL");

  const filteredActors = initialActors.filter((actor) => {
    if (selectedType !== "ALL" && actor.actorType !== selectedType) return false;
    if (selectedState !== "ALL" && actor.state !== selectedState) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-emerald-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
            Filter Ecosystem Actors
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 focus:border-emerald-600 focus:outline-hidden"
          >
            <option value="ALL">All Actor Roles ({initialActors.length})</option>
            {ECOSYSTEM_ACTOR_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 focus:border-emerald-600 focus:outline-hidden"
          >
            <option value="ALL">All Nigerian States</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Actors or Empty State */}
      {filteredActors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-neutral-900">
            No Ecosystem Actors Found
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
            {initialActors.length === 0
              ? "No registered ecosystem actors exist yet. As farmers, processors, aggregators, cold-chain transporters, and buyers register their organizational capabilities, they will be listed here."
              : "No ecosystem actors match the selected role or state filters. Try broadening your filter selection."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredActors.map((actor) => (
            <div
              key={actor.id}
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs transition hover:border-emerald-200 hover:shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    {actor.actorType.replace(/_/g, " ")}
                  </span>
                  {actor.verificationStatus === "VERIFIED" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>

                <h3 className="mt-2 text-base font-bold text-neutral-900 line-clamp-1">
                  {actor.displayName}
                </h3>

                {actor.description && (
                  <p className="mt-1 text-xs text-neutral-600 line-clamp-2">
                    {actor.description}
                  </p>
                )}

                {/* Capabilities tags */}
                {actor.capabilities && actor.capabilities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {actor.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="rounded-sm bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                  {actor.lga}, {actor.state}
                </span>
                <span className="inline-flex items-center gap-1 text-neutral-400">
                  <Briefcase className="h-3.5 w-3.5" /> Capability
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
