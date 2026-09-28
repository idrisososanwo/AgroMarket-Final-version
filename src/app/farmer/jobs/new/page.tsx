import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { EmployerJobForm } from "@/features/jobs/components/employer-job-form";
import { ArrowLeft } from "lucide-react";

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
        <Link
          href="/farmer/jobs"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to My Job Postings
        </Link>

        <EmployerJobForm
          mode="create"
          onSuccessRedirect="/farmer/jobs"
        />
      </div>
    </div>
  );
}
