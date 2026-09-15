import Link from "next/link";
import { MarketplaceListing } from "../types";
import { formatNGN } from "../constants";

interface ListingCardProps {
  listing: MarketplaceListing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const isAvailable = listing.quantityAvailable > 0;

  return (
    <div className="group flex flex-col rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Header Badges */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 bg-neutral-50/60 rounded-t-xl">
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          {listing.categoryName}
        </span>
        <span className="text-xs text-neutral-500 font-medium">
          {listing.state}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Canonical Produce Tag */}
        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
          {listing.productName}
        </div>

        {/* Listing Title */}
        <Link
          href={`/marketplace/${listing.id}`}
          className="font-semibold text-neutral-900 transition-colors group-hover:text-emerald-700 line-clamp-2 leading-snug"
        >
          {listing.title}
        </Link>

        {/* Price & Unit */}
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-xl font-bold text-neutral-900">
            {formatNGN(listing.pricePerUnit)}
          </span>
          <span className="text-xs text-neutral-500 font-medium">
            / {listing.unit}
          </span>
        </div>

        {/* Minimum Order Quantity */}
        <div className="mt-1 text-xs text-neutral-500">
          MOQ: <span className="font-medium text-neutral-700">{listing.minimumOrderQuantity} {listing.unit}</span>
        </div>

        {/* Inventory Stock Status */}
        <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-neutral-100">
          {isAvailable ? (
            <span className="inline-flex items-center text-emerald-700 font-medium">
              <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500"></span>
              {listing.quantityAvailable} {listing.unit} available
            </span>
          ) : (
            <span className="inline-flex items-center text-rose-600 font-medium">
              <span className="mr-1.5 h-2 w-2 rounded-full bg-rose-500"></span>
              Out of stock
            </span>
          )}

          <span className="text-neutral-400 text-[11px]">
            {listing.lga}, {listing.state}
          </span>
        </div>

        {/* Seller Info */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-600">
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
              {listing.sellerName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate font-medium text-neutral-800">
              {listing.sellerName}
            </span>
            {listing.sellerVerified && (
              <span
                title="Verified Seller"
                className="inline-flex items-center text-emerald-600 shrink-0"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          {listing.farmName && (
            <span className="text-[11px] text-neutral-500 truncate max-w-[100px]" title={listing.farmName}>
              {listing.farmName}
            </span>
          )}
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-4 pt-0">
        <Link
          href={`/marketplace/${listing.id}`}
          className="block w-full text-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
