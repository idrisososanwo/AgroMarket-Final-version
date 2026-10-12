import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { getSellerListings } from "@/features/marketplace/queries";
import { SellerInventoryControls } from "@/features/marketplace/components/seller-inventory-controls";
import { formatNGN } from "@/features/marketplace/constants";
import { ListingStatus } from "@/features/marketplace/types";
import { DeleteListingDialog } from "@/features/marketplace/components/delete-listing-dialog";
import { PlusCircle, Eye, Edit3 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Produce Listings & Inventory | AgroMarket",
};

function getStatusBadge(status: ListingStatus) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          Active in Market
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
        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 ring-1 ring-inset ring-neutral-300">
          Archived (Delisted)
        </span>
      );
  }
}

import { BackButton, Breadcrumbs, ProductImage } from "@/components/ui";

interface FarmerListingsPageProps {
  searchParams?: Promise<{
    status?: string;
    search?: string;
  }>;
}

export default async function FarmerListingsPage({ searchParams }: FarmerListingsPageProps) {
  const user = await requireAnyRole(["FARMER", "BUSINESS"]);
  const resolvedParams = searchParams ? await searchParams : {};
  const activeTab = (resolvedParams.status || "ALL").toUpperCase();
  const searchFilter = (resolvedParams.search || "").toLowerCase().trim();

  // Fetch all seller listings
  const allListings = await getSellerListings(user.id);

  // Metrics summary
  const totalListings = allListings.length;
  const activeCount = allListings.filter((l) => l.status === "ACTIVE").length;
  const archivedCount = allListings.filter((l) => l.status === "ARCHIVED").length;
  const totalAvailableStock = allListings
    .filter((l) => l.status === "ACTIVE")
    .reduce((acc, l) => acc + l.quantityAvailable, 0);
  const totalReservedStock = allListings.reduce((acc, l) => acc + l.quantityReserved, 0);

  // Filter listings based on active tab and optional search query
  let filteredListings = allListings;
  if (activeTab === "ACTIVE") {
    filteredListings = filteredListings.filter((l) => l.status === "ACTIVE");
  } else if (activeTab === "ARCHIVED") {
    filteredListings = filteredListings.filter((l) => l.status === "ARCHIVED");
  } else if (activeTab === "OUT_OF_STOCK") {
    filteredListings = filteredListings.filter(
      (l) => l.status === "OUT_OF_STOCK" || (l.status === "ACTIVE" && l.quantityAvailable <= 0)
    );
  }

  if (searchFilter) {
    filteredListings = filteredListings.filter(
      (l) =>
        l.title.toLowerCase().includes(searchFilter) ||
        l.productName.toLowerCase().includes(searchFilter) ||
        l.categoryName.toLowerCase().includes(searchFilter)
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F4] py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Navigation Bar: BackButton & Breadcrumbs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <BackButton
            fallbackHref="/farmer"
            label="Back to Farmer Workspace"
          />
          <Breadcrumbs
            homeHref="/farmer"
            items={[
              { label: "Farmer Workspace", href: "/farmer" },
              { label: "My Produce & Inventory" },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Farmer Produce Manager
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              My Produce Listings & Inventory
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Manage your farm offerings, adjust warehouse inventory, and delist or archive produce safely.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/marketplace"
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 shadow-xs transition"
            >
              Public Marketplace
            </Link>
            <Link
              href="/farmer/listings/new"
              className="inline-flex items-center justify-center rounded-lg bg-[#0F4327] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#165a36] transition"
            >
              <PlusCircle className="-ml-0.5 mr-1.5 h-4 w-4" />
              Add Produce
            </Link>
          </div>
        </div>

        {/* Inventory Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium text-neutral-500">Total Produce Offerings</div>
            <div className="mt-2 text-2xl font-black text-neutral-900">{totalListings}</div>
            <div className="mt-1 text-[11px] text-neutral-400">All registered listings</div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium text-neutral-500">Active in Marketplace</div>
            <div className="mt-2 text-2xl font-black text-emerald-700">{activeCount}</div>
            <div className="mt-1 text-[11px] text-neutral-400">Discoverable by buyers</div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium text-neutral-500">Available Stock Units</div>
            <div className="mt-2 text-2xl font-black text-neutral-900">{totalAvailableStock}</div>
            <div className="mt-1 text-[11px] text-neutral-400">Ready for dispatch</div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium text-neutral-500">Reserved for Orders</div>
            <div className="mt-2 text-2xl font-black text-amber-600">{totalReservedStock}</div>
            <div className="mt-1 text-[11px] text-neutral-400">Locked in pending dispatch</div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/farmer/listings"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === "ALL"
                  ? "bg-[#0F4327] text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              All Listings ({totalListings})
            </Link>
            <Link
              href="/farmer/listings?status=ACTIVE"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === "ACTIVE"
                  ? "bg-[#0F4327] text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              Active in Market ({activeCount})
            </Link>
            <Link
              href="/farmer/listings?status=OUT_OF_STOCK"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === "OUT_OF_STOCK"
                  ? "bg-[#0F4327] text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              Out of Stock
            </Link>
            <Link
              href="/farmer/listings?status=ARCHIVED"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === "ARCHIVED"
                  ? "bg-[#0F4327] text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              Archived ({archivedCount})
            </Link>
          </div>

          <div className="text-xs text-neutral-500 font-medium">
            Showing {filteredListings.length} of {totalListings} produce items
          </div>
        </div>

        {/* Listings Content */}
        {filteredListings.length > 0 ? (
          <div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
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
                    {filteredListings.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/50 transition">
                        {/* Produce & Title */}
                        <td className="py-4 pl-6 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 shrink-0">
                              <ProductImage
                                src={item.imageUrl}
                                productSlug={item.productSlug}
                                productName={item.productName}
                                categorySlug={item.categoryId}
                                categoryName={item.categoryName}
                                title={item.title}
                                aspectRatio="square"
                                containerClassName="w-full h-full"
                              />
                            </div>
                            <div>
                              <div className="font-bold text-neutral-900 leading-snug">
                                {item.title}
                              </div>
                              <div className="text-xs text-emerald-700 font-medium mt-0.5">
                                {item.productName} • {item.categoryName}
                              </div>
                              <div className="text-[11px] text-neutral-400 mt-1">
                                Listed {new Date(item.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                              </div>
                            </div>
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
                          {item.status === "ACTIVE" && (
                            <Link
                              href={`/marketplace/${item.id}`}
                              className="font-medium text-neutral-500 hover:text-neutral-800"
                              target="_blank"
                            >
                              View Public
                            </Link>
                          )}
                          <DeleteListingDialog
                            listingId={item.id}
                            listingTitle={item.title}
                            variant="table-action"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-4">
              {filteredListings.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 shrink-0">
                        <ProductImage
                          src={item.imageUrl}
                          productSlug={item.productSlug}
                          productName={item.productName}
                          categorySlug={item.categoryId}
                          categoryName={item.categoryName}
                          title={item.title}
                          aspectRatio="square"
                          containerClassName="w-full h-full"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-neutral-900 text-sm truncate">{item.title}</h3>
                        <div className="text-xs text-emerald-700 font-medium mt-0.5 truncate">
                          {item.productName} • {item.categoryName}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                    <div>
                      <span className="text-neutral-500">Price:</span>{" "}
                      <span className="font-bold text-neutral-900">
                        {formatNGN(item.pricePerUnit)} / {item.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Available:</span>{" "}
                      <span className="font-bold text-neutral-900">
                        {item.quantityAvailable} {item.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">MOQ:</span>{" "}
                      <span className="font-medium text-neutral-800">
                        {item.minimumOrderQuantity} {item.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Location:</span>{" "}
                      <span className="font-medium text-neutral-800">
                        {item.state}, {item.lga}
                      </span>
                    </div>
                  </div>

                  {/* Stock Adjustment Controls */}
                  <div className="pt-1">
                    <SellerInventoryControls listing={item} />
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/farmer/listings/${item.id}/edit`}
                        className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                      >
                        <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
                      </Link>
                      {item.status === "ACTIVE" && (
                        <Link
                          href={`/marketplace/${item.id}`}
                          className="inline-flex items-center text-xs font-medium text-neutral-500 hover:text-neutral-800"
                          target="_blank"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Link>
                      )}
                    </div>
                    <DeleteListingDialog
                      listingId={item.id}
                      listingTitle={item.title}
                      variant="table-action"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <PlusCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              {activeTab === "ARCHIVED"
                ? "No archived listings found"
                : "No produce listings in this view"}
            </h3>
            <p className="mt-1 text-sm text-neutral-500 max-w-sm mx-auto">
              {activeTab === "ARCHIVED"
                ? "Items with prior customer orders will appear here when delisted."
                : "Start listing your harvest or livestock produce to connect with buyers across Nigeria."}
            </p>
            {activeTab !== "ARCHIVED" && (
              <div className="mt-6">
                <Link
                  href="/farmer/listings/new"
                  className="rounded-lg bg-[#0F4327] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#165a36]"
                >
                  Create Your First Listing
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
