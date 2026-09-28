import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { hasRole } from "@/lib/auth/roles";
import { getServiceById } from "@/features/services/queries";
import { ProviderServiceForm } from "@/features/services/components/provider-service-form";
import { ForbiddenError } from "@/lib/errors/app-error";
import { ArrowLeft } from "lucide-react";

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
        <Link
          href="/services/provider"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Provider Console
        </Link>

        <ProviderServiceForm
          initialData={service}
          mode="edit"
          onSuccessRedirect="/services/provider"
        />
      </div>
    </div>
  );
}
