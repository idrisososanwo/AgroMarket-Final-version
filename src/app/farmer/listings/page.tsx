import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { getSellerListings } from "@/features/marketplace/queries";
import { SellerInventoryControls } from "@/features/marketplace/components/seller-inventory-controls";
import { formatNGN } from "@/features/marketplace/constants";
import { ListingStatus } from "@/features/marketplace/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Produce Listings & Inventory | AgroMarket",
};

function getStatusBadge(status: ListingStatus) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          Active
        </span>
      );
    case "PAUSED":
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
          Paused
        </span>
      );
    case "OUT_OF_STOCK":
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
          Out of Stock
        </span>
      );
    case "DRAFT":
      return (
        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 ring-1 ring-inset ring-neutral-500/20">
          Draft
        </span>
      );
    case "ARCHIVED":
      return (
        <span className="inline-flex items-center rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-500 ring-1 ring-inset ring-neutral-400/20">
          Archived
        </span>
      );
  }
}

export default async function FarmerListingsPage() {
  const user = await requireAnyRole(["FARMER", "BUSINESS"]);
  const listings = await getSellerListings(user.id);

  // Metrics summary
  const totalListings = listings.length;
  const activeCount = listings.filter((l) => l.status === "ACTIVE").length;
  const totalAvailableStock = listings.reduce((acc, l) => acc + l.quantityAvailable, 0);
  const totalReservedStock = listings.reduce((acc, l) => acc + l.quantityReserved, 0);

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Navigation Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/farmer" className="hover:text-emerald-700 transition">
            Farmer Workspace
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Listings & Inventory</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Seller Produce Listings & Inventory
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Manage your agricultural product offerings, update warehouse inventory, and monitor stock availability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/marketplace"
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm transition"
            >
              View Public Marketplace
            </Link>
            <Link
              href="/farmer/listings/new"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <svg className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Listing
            </Link>
          </div>
        </div>

        {/* Inventory Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Total Listings</div>
            <div className="mt-2 text-2xl font-black text-neutral-900">{totalListings}</div>
            <div className="mt-1 text-[11px] text-neutral-400">Created offerings</div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Active in Marketplace</div>
            <div className="mt-2 text-2xl font-black text-emerald-600">{activeCount}</div>
            <div className="mt-1 text-[11px] text-neutral-400">Discoverable by buyers</div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Available Stock Units</div>
            <div className="mt-2 text-2xl font-black text-neutral-900">{totalAvailableStock}</div>
            <div className="mt-1 text-[11px] text-neutral-400">Physical unreserved produce</div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Reserved for Orders</div>
            <div className="mt-2 text-2xl font-black text-amber-600">{totalReservedStock}</div>
            <div className="mt-1 text-[11px] text-neutral-400">Locked in pending dispatch</div>
          </div>
        </div>

        {/* Listings Table / Container */}
        {listings.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                <thead className="bg-neutral-50 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3.5 pl-6 pr-3">Produce & Title</th>
                    <th scope="col" className="px-3 py-3.5">Price & MOQ</th>
                    <th scope="col" className="px-3 py-3.5">Stock Breakdown</th>
                    <th scope="col" className="px-3 py-3.5">Location</th>
                    <th scope="col" className="px-3 py-3.5">Status</th>
                    <th scope="col" className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {listings.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/50 transition">
                      {/* Produce & Title */}
                      <td className="py-4 pl-6 pr-3">
                        <div className="font-bold text-neutral-900 leading-snug">
                          {item.title}
                        </div>
                        <div className="text-xs text-emerald-700 font-medium mt-0.5">
                          {item.productName} • {item.categoryName}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-1">
                          Created {new Date(item.createdAt).toLocaleDateString("en-NG")}
                        </div>
                      </td>

                      {/* Price & MOQ */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="font-bold text-neutral-900">
                          {formatNGN(item.pricePerUnit)}
                        </div>
                        <div className="text-xs text-neutral-500">
                          per {item.unit}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-1 font-medium">
                          MOQ: {item.minimumOrderQuantity} {item.unit}
                        </div>
                      </td>

                      {/* Stock Breakdown */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="text-xs">
                          <span className="font-semibold text-neutral-900">
                            {item.quantityAvailable} {item.unit}
                          </span>{" "}
                          <span className="text-emerald-700 font-medium">available</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          On Hand: {item.quantityOnHand} | Reserved: {item.quantityReserved}
                        </div>
                        {/* Inline stock adjustment */}
                        <div className="mt-2">
                          <SellerInventoryControls listing={item} />
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-neutral-600">
                        <div className="font-medium text-neutral-900">{item.state}</div>
                        <div>{item.lga}</div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap space-x-3 text-xs">
                        <Link
                          href={`/farmer/listings/${item.id}/edit`}
                          className="font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/marketplace/${item.id}`}
                          className="font-medium text-neutral-500 hover:text-neutral-800"
                          target="_blank"
                        >
                          View Public
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-neutral-900">You have no produce listings yet</h3>
            <p className="mt-1 text-sm text-neutral-500 max-w-sm mx-auto">
              Start publishing your harvest or livestock produce to connect with buyers across Nigeria.
            </p>
            <div className="mt-6">
              <Link
                href="/farmer/listings/new"
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Create Your First Listing
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
