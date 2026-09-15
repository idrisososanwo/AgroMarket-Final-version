import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { Briefcase, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Agricultural Jobs & Labor | AgroMarket",
};

export default async function JobsWorkspacePage() {
  const user = await requireAnyRole(["JOB_SEEKER", "ADMIN"]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/account"
          className="inline-flex items-center text-xs font-medium text-primary-700 hover:text-primary-800"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Account
        </Link>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Agricultural Jobs & Placements
              </h1>
              <p className="text-xs text-muted-foreground">
                Role authorization verified for: <strong>{user.fullName || user.email}</strong>
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground">
            Welcome to the farm labor and agronomist placement portal. Here you can discover vacancies for farm hands, harvest crews, tractor operators, and technical managers.
          </p>
        </div>
      </div>
    </div>
  );
}
