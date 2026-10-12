import { requireAnyRole } from "@/lib/auth/server";
import { getCanonicalProducts } from "@/features/marketplace/queries";
import { ListingForm } from "@/features/marketplace/components/listing-form";

import { BackButton, Breadcrumbs } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create Produce Listing | AgroMarket",
};

export default async function NewListingPage() {
  await requireAnyRole(["FARMER", "BUSINESS"]);
  const canonicalProducts = await getCanonicalProducts();

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Navigation Bar: BackButton & Breadcrumbs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <BackButton
            fallbackHref="/farmer/listings"
            label="Back to My Produce"
          />
          <Breadcrumbs
            homeHref="/farmer"
            items={[
              { label: "Farmer Workspace", href: "/farmer" },
              { label: "My Produce", href: "/farmer/listings" },
              { label: "New Listing" },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            Create Produce Listing
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Publish your agricultural produce to the AgroMarket live marketplace catalog.
          </p>
        </div>

        {/* Listing Form */}
        <ListingForm canonicalProducts={canonicalProducts} mode="create" />
      </div>
    </div>
  );
}
