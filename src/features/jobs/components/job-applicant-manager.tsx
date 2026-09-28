"use client";

import { useState } from "react";
import {
  JobApplication,
  ApplicationStatus,
  VALID_APPLICATION_STATUS_TRANSITIONS,
} from "../types";
import { updateApplicationStatusAction } from "../actions";
import {
  User,
  MapPin,
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface JobApplicantManagerProps {
  jobId: string;
  initialApplications: JobApplication[];
}

const APPLICATION_STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; badgeClasses: string }
> = {
  SUBMITTED: {
    label: "Submitted",
    badgeClasses: "bg-neutral-100 text-neutral-700 border-neutral-200",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    badgeClasses: "bg-blue-50 text-blue-700 border-blue-200",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    badgeClasses: "bg-purple-50 text-purple-700 border-purple-200",
  },
  HIRED: {
    label: "Hired",
    badgeClasses: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  REJECTED: {
    label: "Rejected",
    badgeClasses: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export function JobApplicantManager({
  jobId: _jobId,
  initialApplications,
}: JobApplicantManagerProps) {
  const [applications, setApplications] = useState<JobApplication[]>(initialApplications);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleStatusChange = async (
    applicationId: string,
    targetStatus: ApplicationStatus
  ) => {
    setActionError(null);
    setUpdatingId(applicationId);

    try {
      const response = await updateApplicationStatusAction({
        applicationId,
        status: targetStatus,
      });

      if (!response.success) {
        setActionError(response.error || "Failed to update applicant status.");
      } else {
        setApplications((prev) =>
          prev.map((app) =>
            app.id === applicationId ? { ...app, status: targetStatus } : app
          )
        );
      }
    } catch {
      setActionError("A network error occurred. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!applications || applications.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-3">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-neutral-900">
          No Applications Yet
        </h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
          When job seekers apply for this agricultural placement, their cover notes and credentials will appear here for your review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-100 shadow-sm overflow-hidden">
        {applications.map((app) => {
          const statusConfig =
            APPLICATION_STATUS_CONFIG[app.status] || APPLICATION_STATUS_CONFIG.SUBMITTED;
          const allowedTransitions =
            VALID_APPLICATION_STATUS_TRANSITIONS[app.status] || [];
          const isUpdating = updatingId === app.id;

          const formattedDate = new Date(app.createdAt).toLocaleDateString("en-NG", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <div key={app.id} className="p-5 sm:p-6 space-y-4">
              {/* Applicant Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">
                      {app.applicant?.fullName || "Candidate"}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      {app.applicant?.state && (
                        <span className="flex items-center">
                          <MapPin className="mr-1 h-3 w-3 text-neutral-400" />
                          {app.applicant.lga ? `${app.applicant.lga}, ` : ""}
                          {app.applicant.state}
                        </span>
                      )}
                      <span>•</span>
                      <span>Applied {formattedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig.badgeClasses} self-start sm:self-auto`}
                >
                  {statusConfig.label}
                </span>
              </div>

              {/* Cover Note */}
              {app.coverNote && (
                <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-3.5 text-xs text-neutral-700 leading-relaxed">
                  <div className="text-[11px] font-semibold text-neutral-500 mb-1">
                    Cover Note
                  </div>
                  {app.coverNote}
                </div>
              )}

              {/* Resume Link & Transition Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div>
                  {app.resumeUrl ? (
                    <a
                      href={app.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View CV / Credentials
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-400 italic">
                      No external resume link provided
                    </span>
                  )}
                </div>

                {/* Status Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {allowedTransitions.includes("UNDER_REVIEW") && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(app.id, "UNDER_REVIEW")}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition min-h-[36px]"
                    >
                      <Clock className="h-3 w-3" /> Mark Under Review
                    </button>
                  )}

                  {allowedTransitions.includes("SHORTLISTED") && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(app.id, "SHORTLISTED")}
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition min-h-[36px]"
                    >
                      Shortlist
                    </button>
                  )}

                  {allowedTransitions.includes("HIRED") && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(app.id, "HIRED")}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-600 bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition min-h-[36px]"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Hire Candidate
                    </button>
                  )}

                  {allowedTransitions.includes("REJECTED") && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(app.id, "REJECTED")}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition min-h-[36px]"
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  )}

                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-neutral-400 ml-1" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
