import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getMarketplaceListingById,
  getMarketplaceListings,
} from "@/features/marketplace/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { AddToCartForm } from "@/features/marketplace/components/add-to-cart-form";
import { ListingCard } from "@/features/marketplace/components/listing-card";
import { BackButton, Breadcrumbs, ProductImage } from "@/components/ui";

interface ListingDetailPageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { listingId } = await params;
  const listing = await getMarketplaceListingById(listingId, { requireActive: true });

  if (!listing || listing.status !== "ACTIVE") {
    notFound();
  }

  // Fetch related listings in the same category
  const relatedListingsRes = await getMarketplaceListings({
    category: listing.categoryName,
    limit: 4,
  });
  const relatedListings = (relatedListingsRes.listings || [])
    .filter((l) => l.id !== listing.id)
    .slice(0, 3);

  const inStock = listing.quantityAvailable > 0;

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Navigation Bar with Back Button & Breadcrumbs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <BackButton
            fallbackHref="/marketplace"
            label="Back to Marketplace"
          />
          <Breadcrumbs
            homeHref="/"
            items={[
              { label: "Marketplace", href: "/marketplace" },
              {
                label: listing.categoryName,
                href: `/marketplace?category=${encodeURIComponent(listing.categoryName)}`,
              },
              { label: listing.title },
            ]}
          />
        </div>

        {/* Main Listing Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
              {/* Product Photograph Showcase */}
              <div className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 shadow-xs">
                <ProductImage
                  src={listing.imageUrl}
                  productSlug={listing.productSlug}
                  productName={listing.productName}
                  categorySlug={listing.categoryId}
                  categoryName={listing.categoryName}
                  title={listing.title}
                  aspectRatio="16/9"
                  priority={true}
                  showFallbackBadge={true}
                  containerClassName="w-full h-64 sm:h-80 md:h-96"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    {listing.categoryName}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
                    Canonical Produce: {listing.productName}
                  </span>
                </div>
                <span className="text-xs font-medium text-neutral-500">
                  Listed {new Date(listing.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight leading-snug">
                {listing.title}
              </h1>

              {/* Price & Unit Hero Banner */}
              <div className="mt-6 rounded-xl bg-neutral-50 border border-neutral-100 p-5 flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <div className="text-xs text-neutral-500 font-medium">Price per Unit</div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-neutral-900">
                      {formatNGN(listing.pricePerUnit)}
                    </span>
                    <span className="text-sm font-semibold text-neutral-600">
                      / {listing.unit}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-neutral-500 font-medium">Minimum Order Quantity</div>
                  <div className="text-lg font-bold text-neutral-800 mt-1">
                    {listing.minimumOrderQuantity} {listing.unit}
                  </div>
                </div>
              </div>

              {/* Stock Inventory Status */}
              <div className="mt-6 flex items-center justify-between border-y border-neutral-100 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      inStock ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-rose-500 ring-4 ring-rose-100"
                    }`}
                  />
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">
                      {inStock ? "Currently In Stock" : "Currently Out of Stock"}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {inStock
                        ? `${listing.quantityAvailable} ${listing.unit} ready for immediate dispatch`
                        : "No inventory currently available from this seller"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-mono font-medium text-neutral-600">
                    Stock: {listing.quantityAvailable} {listing.unit}
                  </span>
                </div>
              </div>

              {/* Physical Inventory Verification Status */}
              <div className="mt-4">
                {listing.isVerified ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        Verified Physical Farm Stock
                      </h4>
                      <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                        Produce quantity, farm location, and quality have been physically surveyed and confirmed by an AgroMarket agricultural enumerator.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                      ℹ
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">
                        Producer Self-Listed / Staging Inventory
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        This stock is self-reported by the producer. Your transaction remains 100% protected in escrow until produce is delivered, inspected, and accepted.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-2">
                  Produce Description & Harvesting Details
                </h3>
                <div className="prose prose-sm text-neutral-700 whitespace-pre-line leading-relaxed">
                  {listing.description || "No additional description provided by the seller."}
                </div>
              </div>

              {/* Location & Logistics */}
              <div className="mt-8 pt-6 border-t border-neutral-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-3">
                  Pickup & Origin Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <span className="text-xs text-neutral-500 block font-medium">State</span>
                    <span className="font-semibold text-neutral-900">{listing.state}</span>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <span className="text-xs text-neutral-500 block font-medium">Local Government Area (LGA)</span>
                    <span className="font-semibold text-neutral-900">{listing.lga}</span>
                  </div>
                  <div className="sm:col-span-2 rounded-lg bg-neutral-50 p-3">
                    <span className="text-xs text-neutral-500 block font-medium">Pickup / Farm Address</span>
                    <span className="font-medium text-neutral-800">{listing.pickupAddress}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Seller Profile & Order Box (1/3) */}
          <div className="space-y-6">
            {/* Purchase / Order Intent Box */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-neutral-900 mb-4">
                Place Produce Order
              </h3>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Unit Price:</span>
                  <span className="font-semibold text-neutral-900">{formatNGN(listing.pricePerUnit)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Minimum Quantity:</span>
                  <span className="font-semibold text-neutral-900">{listing.minimumOrderQuantity} {listing.unit}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Currency:</span>
                  <span className="font-semibold text-neutral-900">Nigerian Naira (NGN)</span>
                </div>
              </div>

              {/* Add to Cart Form */}
              <div className="pt-2">
                <AddToCartForm
                  listingId={listing.id}
                  unit={listing.unit}
                  minimumOrderQuantity={listing.minimumOrderQuantity}
                  quantityAvailable={listing.quantityAvailable}
                />
              </div>

              {/* Escrow & Dispatch Assurance */}
              <div className="mt-4 pt-3 border-t border-neutral-100 space-y-1.5 text-[11px] text-neutral-500">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <span>🛡️ 100% Escrow Protection</span>
                </div>
                <p className="leading-relaxed">
                  Your payment remains securely in escrow until you inspect and accept your delivery.
                </p>
                <div className="text-[10px] text-neutral-400">
                  Logistics: Corridor haulage via licensed 3PL freight carriers.
                </div>
              </div>
            </div>

            {/* Seller Information Card */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-4">
                Seller Information
              </h3>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg">
                  {listing.sellerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                    <span>{listing.sellerName}</span>
                    {listing.sellerVerified && (
                      <span title="Verified AgroMarket Seller" className="text-emerald-600">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 font-medium">
                    {listing.sellerVerified
                      ? "Verified Producer (Field Inspected)"
                      : "Registered Producer (Pending Field Survey)"}
                  </div>
                </div>
              </div>

              {listing.farmName && (
                <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3 mb-4 text-xs">
                  <span className="text-emerald-800 font-semibold block">Registered Farm:</span>
                  <span className="text-emerald-950 font-medium">{listing.farmName}</span>
                </div>
              )}

              <div className="text-xs text-neutral-500 space-y-1.5 pt-3 border-t border-neutral-100">
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="font-medium text-neutral-800">{listing.lga}, {listing.state}</span>
                </div>
                {listing.sellerPhone && (
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="font-medium text-neutral-800">{listing.sellerPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Back to Catalog Link */}
            <div className="text-center">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to All Produce Listings
              </Link>
            </div>
          </div>
        </div>

        {/* Related Product Recommendations */}
        {relatedListings.length > 0 && (
          <div className="mt-12 pt-8 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Related Produce
                </span>
                <h2 className="text-xl font-bold text-neutral-900 mt-1">
                  More {listing.categoryName} from Nigerian Farms
                </h2>
              </div>
              <Link
                href={`/marketplace?category=${encodeURIComponent(listing.categoryName)}`}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedListings.map((rel) => (
                <ListingCard key={rel.id} listing={rel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
