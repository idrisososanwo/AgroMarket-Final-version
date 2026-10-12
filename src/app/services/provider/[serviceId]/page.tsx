import { notFound } from "next/navigation";
import { requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { getServiceById } from "@/features/services/queries";
import { ProviderServiceForm } from "@/features/services/components/provider-service-form";
import { ForbiddenError } from "@/lib/errors/app-error";
import { BackButton, Breadcrumbs } from "@/components/ui";

interface ProviderEditServicePageProps {
  params: Promise<{
    serviceId: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProviderEditServicePageProps) {
  const { serviceId } = await params;
  const service = await getServiceById(serviceId);

  return {
    title: service ? `Edit: ${service.title} | Provider Console` : "Edit Service | AgroMarket",
  };
}

export default async function ProviderEditServicePage({
  params,
}: ProviderEditServicePageProps) {
  const { serviceId } = await params;
  const user = await requireAnyRole(["SERVICE_PROVIDER", "EXPERT", "ADMIN"]);

  const service = await getServiceById(serviceId);
  if (!service) {
    notFound();
  }

  const isOwner = service.providerId === user.id;
  const isAdmin = hasRole(user.roles, "ADMIN");

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError("Unauthorized. You can only edit your own service offerings.");
  }

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
              { label: service.title, href: `/services/${service.id}` },
              { label: "Edit" },
            ]}
          />
        </div>

        <ProviderServiceForm
          initialData={service}
          mode="edit"
          onSuccessRedirect="/services/provider"
        />
      </div>
    </div>
  );
}
