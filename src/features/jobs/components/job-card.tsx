import Link from "next/link";
import {
  JobListing,
  JOB_CATEGORY_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  COMPENSATION_TYPE_LABELS,
} from "../types";
import { JobStatusBadge } from "./job-status-badge";
import { formatNGN } from "@/features/marketplace/constants";
import { MapPin, Calendar, ShieldCheck, ArrowRight } from "lucide-react";

interface JobCardProps {
  job: JobListing;
  showStatusBadge?: boolean;
}

export function JobCard({ job, showStatusBadge = false }: JobCardProps) {
  const categoryLabel = JOB_CATEGORY_LABELS[job.category] || job.category;
  const employmentLabel = EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType;
  const compTypeLabel = COMPENSATION_TYPE_LABELS[job.compensationType] || job.compensationType;

  const formattedDeadline = job.deadline
    ? new Date(job.deadline).toLocaleDateString("en-NG", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="group flex flex-col rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 bg-neutral-50/60 rounded-t-xl">
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
          {categoryLabel}
        </span>
        <div className="flex items-center gap-2">
          {showStatusBadge && <JobStatusBadge status={job.status} />}
          <span className="inline-flex items-center text-xs font-medium text-neutral-600 bg-neutral-100 rounded px-2 py-0.5">
            {employmentLabel}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title Link */}
        <Link
          href={`/jobs/${job.id}`}
          className="font-bold text-base text-neutral-900 transition-colors group-hover:text-emerald-700 line-clamp-2 leading-snug"
        >
          {job.title}
        </Link>

        {/* Location & Safe Employer */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600">
          <span className="flex items-center">
            <MapPin className="mr-1 h-3.5 w-3.5 text-neutral-400 shrink-0" />
            {job.lga}, {job.state}
          </span>

          {job.employer?.fullName && (
            <span className="flex items-center text-neutral-700 font-medium">
              <span>{job.employer.fullName}</span>
              {job.employer.isVerified && (
                <ShieldCheck
                  className="ml-1 h-3.5 w-3.5 text-emerald-600 shrink-0"
                  aria-label="Verified Employer"
                />
              )}
            </span>
          )}
        </div>

        {/* Description snippet */}
        <p className="mt-2.5 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        {/* Compensation & Deadline */}
        <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-600">Compensation</div>
            <div className="text-sm font-bold text-neutral-900">
              {formatNGN(job.compensationAmount)}{" "}
              <span className="text-xs font-normal text-neutral-600">
                / {compTypeLabel.toLowerCase()}
              </span>
            </div>
          </div>

          {formattedDeadline && (
            <div className="text-right">
              <div className="text-xs text-neutral-600">Deadline</div>
              <div className="flex items-center text-xs font-medium text-neutral-700">
                <Calendar className="mr-1 h-3 w-3 text-neutral-400" />
                {formattedDeadline}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Action Link */}
      <div className="border-t border-neutral-100 px-4 py-2.5 bg-neutral-50/40 rounded-b-xl flex items-center justify-between">
        <span className="text-xs text-neutral-600">
          {job.applicationsCount !== undefined
            ? `${job.applicationsCount} ${job.applicationsCount === 1 ? "applicant" : "applicants"}`
            : "View Job Details"}
        </span>
        <Link
          href={`/jobs/${job.id}`}
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          View Details <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
