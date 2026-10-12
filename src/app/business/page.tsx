import { requireRole } from "@/lib/auth/server";
import { Building2 } from "lucide-react";
import { BackButton, Breadcrumbs } from "@/components/ui";

export const metadata = {
  title: "Agribusiness Workspace | AgroMarket",
};

export default async function BusinessWorkspacePage() {
  const user = await requireRole("BUSINESS");

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Bar: BackButton & Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton
            fallbackHref="/service-provider"
            label="Back to Provider Hub"
          />
          <Breadcrumbs
            homeHref="/"
            items={[
              { label: "Provider Hub", href: "/service-provider" },
              { label: "Agribusiness Console" },
            ]}
          />
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Agribusiness & Off-taker Console
              </h1>
              <p className="text-xs text-muted-foreground">
                Role authorization verified for: <strong>{user.fullName || user.email}</strong>
              </p>
            </div>
          </div>
          <p className="text-sm text-foreground">
            Welcome to the commercial off-taker dashboard. Here you will aggregate bulk commodities, contract farming supply chains, and forward contracts.
          </p>
        </div>
      </div>
    </div>
  );
}
