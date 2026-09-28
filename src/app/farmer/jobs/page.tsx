import { requireAnyRole } from "@/lib/auth/server";
import { getEmployerJobs } from "@/features/jobs/queries";
import { EmployerJobsListView } from "@/features/jobs/components/employer-jobs-list-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Farm Labor & Job Postings | Farmer Console | AgroMarket",
  description: "Manage farm labor vacancies, hire field crews, and review worker applications.",
};

export default async function FarmerJobsPage() {
  const user = await requireAnyRole(["FARMER", "ADMIN"]);
  const jobs = await getEmployerJobs(user.id);

  return (
    <EmployerJobsListView
      jobs={jobs}
      portalType="farmer"
      userName={user.fullName}
    />
  );
}
