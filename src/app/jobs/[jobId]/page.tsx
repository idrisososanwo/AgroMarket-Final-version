import { notFound } from "next/navigation";
import Link from "next/link";
import { getJobById } from "@/features/jobs/queries";
import { getCurrentUser } from "@/lib/auth/server";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { JobApplicationForm } from "@/features/jobs/components/job-application-form";
import {
  JOB_CATEGORY_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  COMPENSATION_TYPE_LABELS,
} from "@/features/jobs/types";
import { formatNGN } from "@/features/marketplace/constants";
import {
  MapPin,
  Calendar,
  ShieldCheck,
  Briefcase,
  ArrowLeft,
  Clock,
  Banknote,
  FileCheck2,
  Lock,
} from "lucide-react";

interface JobDetailPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: JobDetailPageProps) {
  const { jobId } = await params;
  const job = await getJobById(jobId);

  if (!job) {
    return {
      title: "Job Listing Not Found | AgroMarket",
    };
  }

  const categoryLabel = JOB_CATEGORY_LABELS[job.category] || job.category;
  return {
    title: `${job.title} (${categoryLabel}) | AgroMarket Jobs`,
    description: `Agricultural job vacancy in ${job.lga}, ${job.state}: ${job.title}. Apply now on AgroMarket.`,
  };
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { jobId } = await params;
  const [job, currentUser] = await Promise.all([
    getJobById(jobId),
    getCurrentUser(),
  ]);

  if (!job) {
    notFound();
  }

  const categoryLabel = JOB_CATEGORY_LABELS[job.category] || job.category;
  const employmentLabel = EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType;
  const compensationLabel = COMPENSATION_TYPE_LABELS[job.compensationType] || job.compensationType;

  const isOwner = currentUser?.id === job.employerId;
  const isJobActive = job.status === "ACTIVE";

  const formattedDeadline = job.deadline
    ? new Date(job.deadline).toLocaleDateString("en-NG", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/jobs"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to All Jobs
        </Link>

        {/* Main Job Information Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
          {/* Header row: category, status, type */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                <Briefcase className="h-3.5 w-3.5 text-emerald-700" />
                {categoryLabel}
              </span>
              <span className="inline-flex items-center text-xs font-medium text-neutral-600 bg-neutral-100 rounded-md px-2.5 py-1">
                {employmentLabel}
              </span>
            </div>
            <JobStatusBadge status={job.status} />
          </div>

          {/* Title & Employer Metadata */}
          <div className="mt-5">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              {job.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-600">
              <span className="flex items-center">
                <MapPin className="mr-1.5 h-4 w-4 text-neutral-400 shrink-0" />
                {job.lga}, {job.state}
              </span>

              {job.employer && (
                <span className="flex items-center font-medium text-neutral-800">
                  <span>{job.employer.fullName || "Verified Farm Employer"}</span>
                  {job.employer.isVerified && (
                    <ShieldCheck
                      className="ml-1.5 h-4 w-4 text-emerald-600 shrink-0"
                      aria-label="Verified Employer"
                    />
                  )}
                </span>
              )}

              <span className="flex items-center text-neutral-500">
                <Clock className="mr-1.5 h-3.5 w-3.5 text-neutral-400 shrink-0" />
                Posted {new Date(job.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Key Facts Summary Box */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl bg-neutral-50 p-4 border border-neutral-100">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                <Banknote className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                  Compensation
                </span>
                <span className="text-sm font-bold text-neutral-900">
                  {formatNGN(job.compensationAmount)}{" "}
                  <span className="text-xs font-normal text-neutral-500">
                    / {compensationLabel.toLowerCase()}
                  </span>
                </span>
              </div>
            </div>

            {formattedDeadline && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800 shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">
                    Application Deadline
                  </span>
                  <span className="text-sm font-bold text-neutral-900">
                    {formattedDeadline}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="mt-8 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Job Description
            </h2>
            <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
              {job.description}
            </div>
          </div>

          {/* Requirements Section */}
          {job.requirements && (
            <div className="mt-8 space-y-3 border-t border-neutral-100 pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-emerald-700" />
                Key Requirements & Qualifications
              </h2>
              <div className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line bg-neutral-50/60 p-4 rounded-xl border border-neutral-100">
                {job.requirements}
              </div>
            </div>
          )}
        </div>

        {/* Application Interaction Section */}
        <section aria-labelledby="application-heading" className="pt-2">
          {!isJobActive ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-sm font-bold text-neutral-800">
                Applications Closed
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                This job posting is currently {job.status.toLowerCase()} and is no longer accepting new applications.
              </p>
            </div>
          ) : isOwner ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  You are the employer for this job
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Manage incoming applicant submissions and review candidate credentials in your workspace.
                </p>
              </div>
              <Link
                href={`/farmer/jobs/${job.id}`}
                className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px] shrink-0"
              >
                Manage Job Applicants
              </Link>
            </div>
          ) : !currentUser ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Sign In to Apply
                </h3>
                <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                  To submit your profile and application for this position, please sign in to your AgroMarket account or register.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href={`/login?redirect=/jobs/${job.id}`}
                  className="rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px] flex items-center justify-center"
                >
                  Log In to Apply
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px] flex items-center justify-center"
                >
                  Create Account
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
              <h2 id="application-heading" className="text-lg font-bold text-neutral-900 mb-1">
                Apply for this Position
              </h2>
              <p className="text-xs text-neutral-500 mb-6">
                Your application will be sent directly to the employer.
              </p>
              <JobApplicationForm
                jobId={job.id}
                jobTitle={job.title}
                isJobActive={isJobActive}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
