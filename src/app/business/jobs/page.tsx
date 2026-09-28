import { requireAnyRole } from "@/lib/auth/server";
import { getEmployerJobs } from "@/features/jobs/queries";
import { EmployerJobsListView } from "@/features/jobs/components/employer-jobs-list-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agribusiness Jobs & Openings | Business Console | AgroMarket",
  description: "Manage commercial agricultural recruitment, field operations staff, and candidate applications.",
};

export default async function BusinessJobsPage() {
  const user = await requireAnyRole(["BUSINESS", "ADMIN"]);
  const jobs = await getEmployerJobs(user.id);

  return (
    <EmployerJobsListView
      jobs={jobs}
      portalType="business"
      userName={user.fullName}
    />
  );
}
