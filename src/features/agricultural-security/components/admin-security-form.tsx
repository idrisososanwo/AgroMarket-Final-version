"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SecurityIncident,
  INCIDENT_TYPES,
  INCIDENT_SEVERITY_LEVELS,
  INCIDENT_VERIFICATION_STATUSES,
  INCIDENT_SOURCE_TYPES,
  INCIDENT_LOCATION_SCOPES,
  INCIDENT_PUBLICATION_STATUSES,
} from "../types";
import {
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
  VERIFICATION_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
  LOCATION_SCOPE_LABELS,
} from "../constants";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import {
  createSecurityIncidentAction,
  updateSecurityIncidentAction,
} from "../actions";
import {
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";

interface AdminSecurityFormProps {
  initialData?: SecurityIncident | null;
  isAdmin?: boolean;
}

export function AdminSecurityForm({
  initialData,
  isAdmin = true,
}: AdminSecurityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = Boolean(initialData?.id);

  // Controlled/Uncontrolled Form state defaults
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    incidentType: initialData?.incidentType || "LOGISTICS_CORRIDOR_INCIDENT",
    severity: initialData?.severity || "MODERATE",
    status: initialData?.status || "DRAFT",
    verificationStatus: initialData?.verificationStatus || "REPORTED",
    description: initialData?.description || "",
    occurredAt: initialData?.occurredAt ? initialData.occurredAt.slice(0, 16) : "",
    reportedAt: initialData?.reportedAt
      ? initialData.reportedAt.slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    sourceName: initialData?.sourceName || "",
    sourceType: initialData?.sourceType || "OFFICIAL",
    sourceUrl: initialData?.sourceUrl || "",
    sourcePublicationDate: initialData?.sourcePublicationDate
      ? initialData.sourcePublicationDate.slice(0, 10)
      : "",
    state: initialData?.state || "Kaduna",
    lga: initialData?.lga || "",
    locationScope: initialData?.locationScope || "GENERAL_AREA",
    affectedCommodities: initialData?.affectedCommodities?.join(", ") || "",
    affectedCategories: initialData?.affectedCategories?.join(", ") || "",
    movementImpact: initialData?.movementImpact || "",
    foodSecurityImpact: initialData?.foodSecurityImpact || "",
    editorialNotes: initialData?.editorialNotes || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setSuccessMessage(null);

    const payload: Record<string, unknown> = {
      ...formData,
      affectedCommodities: formData.affectedCommodities
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      affectedCategories: formData.affectedCategories
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (isEditing && initialData?.id) {
      payload.id = initialData.id;
    }

    startTransition(async () => {
      const res = isEditing
        ? await updateSecurityIncidentAction(payload)
        : await createSecurityIncidentAction(payload);

      if (res.success) {
        setSuccessMessage(
          isEditing
            ? "Agricultural security record updated successfully."
            : "Agricultural security record created successfully."
        );
        setTimeout(() => {
          router.push("/admin/security");
          router.refresh();
        }, 800);
      } else {
        setErrorMessage(res.error || "Failed to save record.");
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Banner: Guidance and Policy */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950 space-y-1 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-blue-900">
          <Info className="w-4 h-4 text-blue-700" />
          Editorial Standard: Separate Observed Facts from Inferences
        </div>
        <p className="leading-relaxed">
          AgroMarket security intelligence is strictly decision-support. Under no circumstances
          publish exact farm GPS coordinates or private farmstead pinpoints. Always distinguish
          between sourced reports, observed commodity movements, and editorial context. Do not make
          unsupported causal claims.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Form Cards */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          1. Incident Classification & Identity
        </h3>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5">
            Incident Headline / Notice Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Armed Transit Disruption Along Birnin Gwari Freight Corridor"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.title[0]}</p>
          )}
        </div>

        {/* Incident Type & Severity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Incident Type <span className="text-red-500">*</span>
            </label>
            <select
              name="incidentType"
              value={formData.incidentType}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {INCIDENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {INCIDENT_TYPE_LABELS[type] || type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Assigned Severity Level <span className="text-red-500">*</span>
            </label>
            <select
              name="severity"
              value={formData.severity}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {INCIDENT_SEVERITY_LEVELS.map((sev) => (
                <option key={sev} value={sev}>
                  {SEVERITY_LABELS[sev]} Severity
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status & Verification Status (Admin only or read-only for draft) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Publication Status
            </label>
            <select
              name="status"
              disabled={!isAdmin}
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
            >
              {INCIDENT_PUBLICATION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Verification Status
            </label>
            <select
              name="verificationStatus"
              disabled={!isAdmin}
              value={formData.verificationStatus}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
            >
              {INCIDENT_VERIFICATION_STATUSES.map((ver) => (
                <option key={ver} value={ver}>
                  {VERIFICATION_STATUS_LABELS[ver]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Detailed Narrative */}
        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5">
            Incident Description & Context <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            rows={5}
            required
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide verified narrative regarding what occurred, affected freight or farming community, and immediate conditions..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-red-600 font-medium">
              {fieldErrors.description[0]}
            </p>
          )}
        </div>
      </div>

      {/* Location Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          2. Safe Geographic Scope (Non-PII, General Area Only)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Nigerian State <span className="text-red-500">*</span>
            </label>
            <select
              name="state"
              required
              value={formData.state}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Local Government Area (Optional)
            </label>
            <input
              type="text"
              name="lga"
              value={formData.lga}
              onChange={handleChange}
              placeholder="e.g. Igabi, Chikun, Giwa"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Location Scope
            </label>
            <select
              name="locationScope"
              value={formData.locationScope}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {INCIDENT_LOCATION_SCOPES.map((sc) => (
                <option key={sc} value={sc}>
                  {LOCATION_SCOPE_LABELS[sc]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Source Attribution Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          3. Source Attribution & Timestamps
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Source Attributing Body / Agency <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="sourceName"
              required
              value={formData.sourceName}
              onChange={handleChange}
              placeholder="e.g. Kaduna State Police Command, NEMA, Daily Trust"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {fieldErrors.sourceName && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                {fieldErrors.sourceName[0]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Source Type <span className="text-red-500">*</span>
            </label>
            <select
              name="sourceType"
              value={formData.sourceType}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {INCIDENT_SOURCE_TYPES.map((st) => (
                <option key={st} value={st}>
                  {SOURCE_TYPE_LABELS[st]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Source Verification Link / Document URL
            </label>
            <input
              type="url"
              name="sourceUrl"
              value={formData.sourceUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {fieldErrors.sourceUrl && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                {fieldErrors.sourceUrl[0]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Source Publication Date
            </label>
            <input
              type="date"
              name="sourcePublicationDate"
              value={formData.sourcePublicationDate}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Occurred At (Estimated Date & Time)
            </label>
            <input
              type="datetime-local"
              name="occurredAt"
              value={formData.occurredAt}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Reported At Timestamp
            </label>
            <input
              type="datetime-local"
              name="reportedAt"
              value={formData.reportedAt}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Logistics & Food Security Impacts */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          4. Logistics & Food Security Impact Context
        </h3>

        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5">
            Affected Produce / Commodities (Comma-separated)
          </label>
          <input
            type="text"
            name="affectedCommodities"
            value={formData.affectedCommodities}
            onChange={handleChange}
            placeholder="e.g. Maize, Sorghum, Cowpea, Tomato (Anti-pork policy applies)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {fieldErrors.affectedCommodities && (
            <p className="mt-1 text-xs text-red-600 font-medium">
              {fieldErrors.affectedCommodities[0]}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5">
            Logistics Corridor / Transit Movement Disruption Note
          </label>
          <textarea
            name="movementImpact"
            rows={3}
            value={formData.movementImpact}
            onChange={handleChange}
            placeholder="Specify affected highways, transit bypasses, or checkpoint delays (e.g. Heavy commercial trucks taking southern bypass)..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5">
            Food Security & Availability Impact Context
          </label>
          <textarea
            name="foodSecurityImpact"
            rows={3}
            value={formData.foodSecurityImpact}
            onChange={handleChange}
            placeholder="Detail observed rural aggregation delays, market accessibility constraints, or grain reserve impact..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-800 mb-1.5">
            Internal Editorial Notes (Non-Public)
          </label>
          <textarea
            name="editorialNotes"
            rows={2}
            value={formData.editorialNotes}
            onChange={handleChange}
            placeholder="Editorial cross-referencing, verification logs, or reporter contact notes..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/admin/security"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Saving Record..." : isEditing ? "Update Incident" : "Create Incident"}
        </button>
      </div>
    </form>
  );
}
