import { requireAnyRole } from "@/lib/auth/server";
import { EmployerJobForm } from "@/features/jobs/components/employer-job-form";
import { BackButton, Breadcrumbs } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Post New Commercial Vacancy | Business Console | AgroMarket",
  description: "Publish commercial agribusiness vacancies, technician roles, or harvesting logistics operations.",
};

export default async function BusinessNewJobPage() {
  await requireAnyRole(["BUSINESS", "ADMIN"]);

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-3">
          <BackButton fallbackHref="/business/jobs" fallbackLabel="Back to Commercial Job Postings" />
          <Breadcrumbs
            items={[
              { label: "Agribusiness Workspace", href: "/business" },
              { label: "Commercial Job Postings", href: "/business/jobs" },
              { label: "Post New Vacancy" },
            ]}
          />
        </div>

        <EmployerJobForm
          mode="create"
          onSuccessRedirect="/business/jobs"
        />
      </div>
    </div>
  );
}
