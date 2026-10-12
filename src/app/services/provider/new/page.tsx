import { requireAnyRole } from "@/lib/auth/server";
import { ProviderServiceForm } from "@/features/services/components/provider-service-form";
import { BackButton, Breadcrumbs } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add New Service Offering | Provider Console | AgroMarket",
  description: "List a new agricultural machinery, technical consulting, or field service.",
};

export default async function ProviderNewServicePage() {
  await requireAnyRole(["SERVICE_PROVIDER", "EXPERT", "ADMIN"]);

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Bar: BackButton & Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton
            fallbackHref="/services/provider"
            label="Back to Provider Console"
          />
          <Breadcrumbs
            homeHref="/"
            items={[
              { label: "Provider Hub", href: "/service-provider" },
              { label: "Agro-Services", href: "/services/provider" },
              { label: "New Service" },
            ]}
          />
        </div>

        <ProviderServiceForm
          mode="create"
          onSuccessRedirect="/services/provider"
        />
      </div>
    </div>
  );
}
