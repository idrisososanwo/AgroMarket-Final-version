import { requireAnyRole } from "@/lib/auth/server";
import { EmployerJobForm } from "@/features/jobs/components/employer-job-form";
import { BackButton, Breadcrumbs } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Post New Farm Job Opening | Farmer Console | AgroMarket",
  description: "Create and publish a new farm labor, crew, or agronomy opening.",
};

export default async function FarmerNewJobPage() {
  await requireAnyRole(["FARMER", "ADMIN"]);

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="space-y-3">
          <BackButton fallbackHref="/farmer/jobs" fallbackLabel="Back to Farm Labor & Jobs" />
          <Breadcrumbs
            items={[
              { label: "Farmer Workspace", href: "/farmer" },
              { label: "Farm Labor & Jobs", href: "/farmer/jobs" },
              { label: "Post New Job" },
            ]}
          />
        </div>

        <EmployerJobForm
          mode="create"
          onSuccessRedirect="/farmer/jobs"
        />
      </div>
    </div>
  );
}
