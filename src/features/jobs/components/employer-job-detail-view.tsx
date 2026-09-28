"use client";

import { useState } from "react";
import Link from "next/link";
import { JobListing, JobApplication } from "../types";
import { JobStatusBadge } from "./job-status-badge";
import { EmployerJobForm } from "./employer-job-form";
import { JobApplicantManager } from "./job-applicant-manager";
import { formatNGN } from "@/features/marketplace/constants";
import {
  Users,
  Edit3,
  ArrowLeft,
  MapPin,
  Calendar,
  Banknote,
} from "lucide-react";

interface EmployerJobDetailViewProps {
  job: JobListing;
  applications: JobApplication[];
  portalType: "farmer" | "business";
}

export function EmployerJobDetailView({
  job,
  applications,
  portalType,
}: EmployerJobDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"applicants" | "edit">("applicants");
  const backHref = `/${portalType}/jobs`;

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href={backHref}
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to My Job Postings
        </Link>

        {/* Job Header Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  {job.category}
                </span>
                <span className="text-xs font-medium text-neutral-400">•</span>
                <span className="text-xs font-medium text-neutral-600">
                  {job.employmentType}
                </span>
              </div>
              <h1 className="mt-1 text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                {job.title}
              </h1>
              <span className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                {job.lga}, {job.state}
              </span>
            </div>

            <JobStatusBadge status={job.status} />
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100 flex items-center gap-2.5">
              <Banknote className="h-4 w-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-[11px] text-neutral-500 block">Compensation</span>
                <span className="font-bold text-neutral-900">{formatNGN(job.compensationAmount)}</span>
              </div>
            </div>

            <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100 flex items-center gap-2.5">
              <Users className="h-4 w-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-[11px] text-neutral-500 block">Total Applicants</span>
                <span className="font-bold text-neutral-900">{applications.length} candidates</span>
              </div>
            </div>

            <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100 flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-neutral-400 shrink-0" />
              <div>
                <span className="text-[11px] text-neutral-500 block">Deadline</span>
                <span className="font-bold text-neutral-900">
                  {job.deadline ? new Date(job.deadline).toLocaleDateString("en-NG") : "Open"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-neutral-200 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("applicants")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors min-h-[44px] ${
              activeTab === "applicants"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Users className="h-4 w-4" />
            Applicant Candidates ({applications.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors min-h-[44px] ${
              activeTab === "edit"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Edit3 className="h-4 w-4" />
            Edit Job Details & Status
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "applicants" ? (
          <section aria-label="Job Applicants">
            <JobApplicantManager
              jobId={job.id}
              initialApplications={applications}
            />
          </section>
        ) : (
          <section aria-label="Edit Job Details">
            <EmployerJobForm
              initialData={job}
              mode="edit"
              onSuccessRedirect={`/${portalType}/jobs/${job.id}`}
            />
          </section>
        )}
      </div>
    </div>
  );
}
