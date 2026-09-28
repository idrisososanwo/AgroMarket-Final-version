import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getMyApplications } from "@/features/jobs/queries";
import { ApplicationStatus, APPLICATION_STATUS_LABELS } from "@/features/jobs/types";
import { Briefcase, ArrowLeft, ArrowRight, Calendar, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Job Applications | AgroMarket",
  description: "View and track your submitted agricultural job applications and candidate status.",
};

function getApplicationStatusBadge(status: ApplicationStatus) {
  switch (status) {
    case "SUBMITTED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
          <Clock className="h-3 w-3" />
          {APPLICATION_STATUS_LABELS.SUBMITTED}
        </span>
      );
    case "UNDER_REVIEW":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3" />
          {APPLICATION_STATUS_LABELS.UNDER_REVIEW}
        </span>
      );
    case "SHORTLISTED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
          <CheckCircle2 className="h-3 w-3" />
          {APPLICATION_STATUS_LABELS.SHORTLISTED}
        </span>
      );
    case "HIRED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          {APPLICATION_STATUS_LABELS.HIRED}
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 border border-neutral-200">
          <XCircle className="h-3 w-3" />
          {APPLICATION_STATUS_LABELS.REJECTED}
        </span>
      );
  }
}

export default async function AccountApplicationsPage() {
  await requireAuth();
  const applications = await getMyApplications();

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/account"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Account
        </Link>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <Briefcase className="h-4 w-4" />
              <span>Career & Farm Placements</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">
              My Job Applications
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              Track the status of your applications to farm employers and agricultural organizations.
            </p>
          </div>

          <Link
            href="/jobs"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px] shrink-0"
          >
            Browse Open Jobs
          </Link>
        </div>

        {/* Applications List or Empty State */}
        {applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm space-y-4"
              >
                {/* Header row: Job Title and Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">
                      {app.job?.title || "Agricultural Vacancy"}
                    </h2>
                    {app.job?.state && (
                      <span className="text-xs text-neutral-500">
                        {app.job.lga ? `${app.job.lga}, ${app.job.state}` : app.job.state}
                      </span>
                    )}
                  </div>
                  {getApplicationStatusBadge(app.status)}
                </div>

                {/* Cover Note Snippet */}
                {app.coverNote && (
                  <div className="rounded-xl bg-neutral-50 p-3.5 border border-neutral-100">
                    <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                      Submitted Cover Note
                    </span>
                    <p className="text-xs text-neutral-700 leading-relaxed line-clamp-3">
                      {app.coverNote}
                    </p>
                  </div>
                )}

                {/* Footer Row: Dates & Links */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-neutral-500">
                  <span className="flex items-center">
                    <Calendar className="mr-1.5 h-3.5 w-3.5 text-neutral-400" />
                    Applied {new Date(app.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                  </span>

                  <div className="flex items-center gap-3">
                    {app.resumeUrl && (
                      <a
                        href={app.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                      >
                        <FileText className="mr-1 h-3.5 w-3.5 text-neutral-400" />
                        Attached Resume
                      </a>
                    )}
                    <Link
                      href={`/jobs/${app.jobId}`}
                      className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                    >
                      View Job Details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </div>
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
              No applications yet
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
              You haven&apos;t applied to any agricultural jobs yet. Explore current openings to find farm and agronomy positions.
            </p>
            <div className="mt-6">
              <Link
                href="/jobs"
                className="inline-flex items-center rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-sm min-h-[44px]"
              >
                Browse Open Vacancies
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
