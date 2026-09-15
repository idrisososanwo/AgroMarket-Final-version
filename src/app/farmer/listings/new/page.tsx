import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { getCanonicalProducts } from "@/features/marketplace/queries";
import { ListingForm } from "@/features/marketplace/components/listing-form";

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
        {/* Navigation Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/farmer/listings" className="hover:text-emerald-700 transition">
            My Listings
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">New Listing</span>
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
