import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { getCanonicalProducts, getMarketplaceListingById } from "@/features/marketplace/queries";
import { ListingForm } from "@/features/marketplace/components/listing-form";
import { DeleteListingDialog } from "@/features/marketplace/components/delete-listing-dialog";

interface EditListingPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit Produce Listing | AgroMarket",
};

export default async function EditListingPage({ params }: EditListingPageProps) {
  const user = await requireAnyRole(["FARMER", "BUSINESS"]);
  const { listingId } = await params;

  const [listing, canonicalProducts] = await Promise.all([
    getMarketplaceListingById(listingId),
    getCanonicalProducts(),
  ]);

  if (!listing) {
    notFound();
  }

  // Strict ownership enforcement
  if (listing.sellerId !== user.id) {
    redirect("/farmer/listings");
  }

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Navigation Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/farmer/listings" className="hover:text-emerald-700 transition">
            My Listings
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold truncate max-w-[200px]">
            {listing.title}
          </span>
          <span>/</span>
          <span className="text-neutral-800">Edit</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Edit Produce Listing
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Update pricing, minimum order quantities, and pickup location for this listing.
            </p>
          </div>
          <Link
            href={`/marketplace/${listing.id}`}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            target="_blank"
          >
            Preview Listing
          </Link>
        </div>

        {/* Listing Form */}
        <ListingForm
          canonicalProducts={canonicalProducts}
          initialData={listing}
          mode="edit"
        />

        {/* Danger Zone: Listing Removal */}
        <div className="mt-8 rounded-xl border border-rose-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-rose-950">Remove Produce Listing</h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-lg">
                Delist this produce item from the marketplace. If customers have already placed orders,
                historical order records and payment invoices will remain fully protected.
              </p>
            </div>
            <DeleteListingDialog
              listingId={listing.id}
              listingTitle={listing.title}
              variant="danger-card"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
