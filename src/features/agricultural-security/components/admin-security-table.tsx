"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SecurityIncident,
  SecurityIncidentStatus,
  SecurityVerificationStatus,
} from "../types";
import {
  INCIDENT_TYPE_LABELS,
} from "../constants";
import { SeverityBadge } from "./severity-badge";
import { VerificationBadge } from "./verification-badge";
import {
  changeSecurityIncidentStatusAction,
  updateSecurityVerificationAction,
  deleteSecurityIncidentAction,
} from "../actions";
import {
  Edit3,
  Trash2,
  ExternalLink,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react";

interface AdminSecurityTableProps {
  incidents: SecurityIncident[];
  totalCount: number;
}

export function AdminSecurityTable({
  incidents,
  totalCount: _totalCount,
}: AdminSecurityTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(
    null
  );

  const handleStatusChange = async (id: string, status: SecurityIncidentStatus) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await changeSecurityIncidentStatusAction({ id, status });
      if (res.success) {
        setFeedback({ message: `Status updated to ${status}` });
        router.refresh();
      } else {
        setFeedback({ message: res.error || "Failed to update status", isError: true });
      }
    });
  };

  const handleVerificationChange = async (
    id: string,
    verificationStatus: SecurityVerificationStatus
  ) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateSecurityVerificationAction({ id, verificationStatus });
      if (res.success) {
        setFeedback({ message: `Verification status updated to ${verificationStatus}` });
        router.refresh();
      } else {
        setFeedback({
          message: res.error || "Failed to update verification",
          isError: true,
        });
      }
    });
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete: "${title}"?`)) {
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteSecurityIncidentAction(id);
      if (res.success) {
        setFeedback({ message: "Incident deleted successfully" });
        router.refresh();
      } else {
        setFeedback({ message: res.error || "Failed to delete incident", isError: true });
      }
    });
  };

  if (incidents.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-900 mb-1">
          No Security Incidents Recorded
        </h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
          No security records match your current criteria. Create a new physical agricultural
          security notice to provide decision-support intelligence for farmers and transporters.
        </p>
        <Link
          href="/admin/security/new"
          className="inline-flex items-center px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          Create New Incident
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.isError
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}
        >
          {feedback.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Title & Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {incidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-gray-50/50 transition">
                  {/* Title & Type */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900 line-clamp-1 max-w-xs">
                      {incident.title}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium">
                      {INCIDENT_TYPE_LABELS[incident.incidentType] || incident.incidentType}
                    </div>
                  </td>

                  {/* Severity */}
                  <td className="py-3 px-4">
                    <SeverityBadge severity={incident.severity} />
                  </td>

                  {/* Verification */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <VerificationBadge status={incident.verificationStatus} />
                      <select
                        aria-label={`Change verification status for ${incident.title}`}
                        disabled={isPending}
                        value={incident.verificationStatus}
                        onChange={(e) =>
                          handleVerificationChange(
                            incident.id,
                            e.target.value as SecurityVerificationStatus
                          )
                        }
                        className="py-1 px-1.5 bg-gray-50 border border-gray-200 rounded text-[11px] font-medium text-gray-700 focus:outline-none"
                      >
                        <option value="UNVERIFIED">Unverified</option>
                        <option value="REPORTED">Reported</option>
                        <option value="VERIFIED">Verified</option>
                        <option value="OFFICIAL">Official</option>
                        <option value="CORRECTED">Corrected</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  </td>

                  {/* Status Toggle */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          incident.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800"
                            : incident.status === "ARCHIVED"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {incident.status}
                      </span>
                      <select
                        aria-label={`Change publication status for ${incident.title}`}
                        disabled={isPending}
                        value={incident.status}
                        onChange={(e) =>
                          handleStatusChange(
                            incident.id,
                            e.target.value as SecurityIncidentStatus
                          )
                        }
                        className="py-1 px-1.5 bg-gray-50 border border-gray-200 rounded text-[11px] font-medium text-gray-700 focus:outline-none"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-gray-900">{incident.state}</div>
                    {incident.lga && (
                      <div className="text-[11px] text-gray-500">{incident.lga} (LGA)</div>
                    )}
                  </td>

                  {/* Source */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-800 line-clamp-1 max-w-[120px]">
                      {incident.sourceName}
                    </div>
                    <div className="text-[11px] text-gray-400 capitalize">
                      {incident.sourceType.toLowerCase()}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      {incident.status === "PUBLISHED" && (
                        <Link
                          href={`/learn/security/${incident.slug}`}
                          target="_blank"
                          title="View Public Post"
                          className="p-1.5 text-gray-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <Link
                        href={`/admin/security/${incident.id}`}
                        title="Edit Incident"
                        className="p-1.5 text-gray-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        title="Delete Incident"
                        disabled={isPending}
                        onClick={() => handleDelete(incident.id, incident.title)}
                        className="p-1.5 text-gray-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
