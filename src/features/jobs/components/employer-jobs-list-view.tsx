import Link from "next/link";
import { JobListing } from "../types";
import { JobStatusBadge } from "./job-status-badge";
import { formatNGN } from "@/features/marketplace/constants";
import { Briefcase, Plus, ArrowRight, Users, Calendar, MapPin, ArrowLeft } from "lucide-react";

interface EmployerJobsListViewProps {
  jobs: JobListing[];
  portalType: "farmer" | "business";
  userName?: string | null;
}

export function EmployerJobsListView({
  jobs,
  portalType,
  userName,
}: EmployerJobsListViewProps) {
  const backHref = `/${portalType}`;
  const newJobHref = `/${portalType}/jobs/new`;

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href={backHref}
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Dashboard
        </Link>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <Briefcase className="h-4 w-4" />
              <span>{portalType === "farmer" ? "Farm Labor & Crew" : "Agribusiness Recruitment"}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
              Job Postings & Candidate Management
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              {userName ? `Managing openings for ${userName}. ` : ""}
              Publish vacancies and review applicant qualifications.
            </p>
          </div>

          <Link
            href={newJobHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px] shrink-0"
          >
            <Plus className="h-4 w-4" />
            Post New Job Opening
          </Link>
        </div>

        {/* Jobs List */}
        {jobs.length > 0 ? (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm space-y-4"
              >
                {/* Header row: Title & Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      {job.title}
                    </h2>
                    <span className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-neutral-400" />
                      {job.lga}, {job.state}
                    </span>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>

                {/* Info row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-neutral-50 p-2.5 border border-neutral-100">
                    <span className="text-neutral-500 block text-[11px] font-medium">Compensation</span>
                    <span className="font-bold text-neutral-900">
                      {formatNGN(job.compensationAmount)}
                    </span>
                  </div>

                  <div className="rounded-lg bg-neutral-50 p-2.5 border border-neutral-100">
                    <span className="text-neutral-500 block text-[11px] font-medium">Total Applicants</span>
                    <span className="font-bold text-neutral-900 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-emerald-700" />
                      {job.applicationsCount ?? 0} candidate{(job.applicationsCount ?? 0) === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="rounded-lg bg-neutral-50 p-2.5 border border-neutral-100">
                    <span className="text-neutral-500 block text-[11px] font-medium">Deadline</span>
                    <span className="font-medium text-neutral-800 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                      {job.deadline
                        ? new Date(job.deadline).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })
                        : "Open until filled"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <span className="text-xs text-neutral-400">
                    Posted {new Date(job.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <Link
                    href={`/${portalType}/jobs/${job.id}`}
                    className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                  >
                    Manage Applicants & Job <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Briefcase className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900">
              No job postings yet
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
              Post your open farm vacancies to hire vetted agricultural workers, machine operators, and technical managers.
            </p>
            <div className="mt-6">
              <Link
                href={newJobHref}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                Post Your First Job
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
