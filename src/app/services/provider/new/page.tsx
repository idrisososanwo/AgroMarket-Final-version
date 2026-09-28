import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { ProviderServiceForm } from "@/features/services/components/provider-service-form";
import { ArrowLeft } from "lucide-react";

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
        <Link
          href="/services/provider"
          className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Provider Console
        </Link>

        <ProviderServiceForm
          mode="create"
          onSuccessRedirect="/services/provider"
        />
      </div>
    </div>
  );
}
