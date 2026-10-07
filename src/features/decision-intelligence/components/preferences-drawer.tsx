"use client";

import React, { useState, useTransition } from "react";
import {
  ActorRole,
  ACTOR_ROLES,
  DIGEST_FREQUENCIES,
  URGENCY_LEVELS,
  UserIntelligencePreferences,
} from "../types";
import { saveUserPreferencesAction } from "../actions";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { XCircle, Sliders, Check, Loader2, AlertCircle } from "lucide-react";

interface PreferencesDrawerProps {
  preferences: UserIntelligencePreferences;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const COMMON_COMMODITIES = [
  "White Maize",
  "Yellow Maize",
  "Paddy Rice",
  "Milled Parboiled Rice",
  "White Yam",
  "Raw Cassava Roots",
  "White Garri",
  "Roma Tomatoes",
  "Habanero Pepper",
  "Dry Red Onions",
  "Brown Beans (Cowpea)",
  "Soybeans",
  "Red Palm Oil",
  "Raw Cashew Nuts",
  "Sorghum",
  "Sesame Seeds",
  "Ginger",
  "Cocoa",
];

export function PreferencesDrawer({
  preferences,
  isOpen,
  onClose,
  onSaved,
}: PreferencesDrawerProps) {
  const [role, setRole] = useState<ActorRole>(preferences.primaryRole);
  const [selectedStates, setSelectedStates] = useState<string[]>(preferences.preferredStates);
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>(
    preferences.monitoredCommodities
  );
  const [urgency, setUrgency] = useState(preferences.urgencyThreshold);
  const [digest, setDigest] = useState(preferences.digestFrequency);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const toggleState = (st: string) => {
    setSelectedStates((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  const toggleCommodity = (comm: string) => {
    setSelectedCommodities((prev) =>
      prev.includes(comm) ? prev.filter((c) => c !== comm) : [...prev, comm]
    );
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveUserPreferencesAction({
        primaryRole: role,
        preferredStates: selectedStates,
        preferredLgas: [],
        monitoredCommodities: selectedCommodities,
        urgencyThreshold: urgency,
        minConfidence: 0.4,
        notificationChannels: ["IN_APP"],
        digestFrequency: digest,
        mutedRecommendationTypes: [],
      });

      if (!res.success) {
        setError(res.error || "Failed to save preferences.");
        return;
      }

      onSaved?.();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl border-l border-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-emerald-700" />
            <h2 className="font-bold text-base text-neutral-900">Intelligence Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Primary Role Perspective
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ActorRole)}
              className="w-full text-xs sm:text-sm rounded-xl border border-neutral-300 p-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {ACTOR_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Monitored Commodities */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Monitored Commodities
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-neutral-50 rounded-xl border border-neutral-200">
              {COMMON_COMMODITIES.map((c) => {
                const isSelected = selectedCommodities.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCommodity(c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred States */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Preferred States ({selectedStates.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 bg-neutral-50 rounded-xl border border-neutral-200">
              {NIGERIAN_STATES.map((st) => {
                const isSelected = selectedStates.includes(st);
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => toggleState(st)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                      isSelected
                        ? "bg-indigo-700 text-white"
                        : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Urgency Threshold */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Alert Urgency Sensitivity
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {URGENCY_LEVELS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    urgency === u
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Digest Frequency */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Notification Frequency
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DIGEST_FREQUENCIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDigest(d)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                    digest === d
                      ? "bg-emerald-50 text-emerald-900 border-emerald-500 font-bold"
                      : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-3 bg-neutral-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
