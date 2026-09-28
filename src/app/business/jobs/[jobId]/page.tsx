import { notFound } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { getJobById, getJobApplications } from "@/features/jobs/queries";
import { EmployerJobDetailView } from "@/features/jobs/components/employer-job-detail-view";
import { ForbiddenError } from "@/lib/errors/app-error";

interface BusinessJobDetailPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: BusinessJobDetailPageProps) {
  const { jobId } = await params;
  const job = await getJobById(jobId);

  return {
    title: job ? `Manage: ${job.title} | Business Console` : "Job Management | AgroMarket",
  };
}

export default async function BusinessJobDetailPage({ params }: BusinessJobDetailPageProps) {
  const { jobId } = await params;
  const user = await requireAnyRole(["BUSINESS", "ADMIN"]);

  const job = await getJobById(jobId);
  if (!job) {
    notFound();
  }

  const isOwner = job.employerId === user.id;
  const isAdmin = hasRole(user.roles, "ADMIN");

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("Unauthorized. You can only manage your own commercial job openings.");
  }

  const applications = await getJobApplications(jobId);

  return (
    <EmployerJobDetailView
      job={job}
      applications={applications}
      portalType="business"
    />
  );
}
