import Link from "next/link";
import { requireAnyRole } from "@/lib/auth/server";
import { getSellerOrders } from "@/features/orders/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { getOrderStatusBadge } from "@/features/orders/components/order-status-badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Incoming Produce Orders | AgroMarket",
};

export default async function FarmerOrdersPage() {
  const user = await requireAnyRole(["FARMER", "BUSINESS"]);
  const items = await getSellerOrders(user.id);

  const totalValue = items.reduce((acc, item) => acc + item.totalPrice, 0);

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Navigation Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/farmer" className="hover:text-emerald-700 transition">
            Farmer Workspace
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Incoming Orders</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Incoming Produce Orders
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Orders placed by buyers containing produce from your farm or agribusiness.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/farmer/listings"
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-sm transition"
            >
              Manage Listings & Inventory
            </Link>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Total Ordered Items</div>
            <div className="mt-2 text-2xl font-black text-neutral-900">{items.length}</div>
            <div className="mt-1 text-[11px] text-neutral-400">Produce lines booked</div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Pending Preparation</div>
            <div className="mt-2 text-2xl font-black text-amber-600">
              {items.filter((i) => i.orderStatus === "PENDING").length}
            </div>
            <div className="mt-1 text-[11px] text-neutral-400">Awaiting payment & dispatch</div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium text-neutral-500">Total Gross Value</div>
            <div className="mt-2 text-2xl font-black text-emerald-600">
              {formatNGN(totalValue)}
            </div>
            <div className="mt-1 text-[11px] text-neutral-400">From ordered produce</div>
          </div>
        </div>

        {/* Orders Table */}
        {items.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                <thead className="bg-neutral-50 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="py-3.5 pl-6 pr-3">Order # & Date</th>
                    <th scope="col" className="px-3 py-3.5">Produce Item</th>
                    <th scope="col" className="px-3 py-3.5">Quantity</th>
                    <th scope="col" className="px-3 py-3.5">Value (₦)</th>
                    <th scope="col" className="px-3 py-3.5">Delivery Destination</th>
                    <th scope="col" className="py-3.5 pl-3 pr-6 text-right">Order Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/50 transition">
                      {/* Order Number & Date */}
                      <td className="py-4 pl-6 pr-3 whitespace-nowrap">
                        <div className="font-bold text-neutral-900">{item.orderNumber}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                        </div>
                      </td>

                      {/* Produce Item */}
                      <td className="px-3 py-4">
                        <div className="font-semibold text-neutral-900 line-clamp-1">
                          {item.productName}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          Buyer: {item.buyerName}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="px-3 py-4 whitespace-nowrap text-xs font-medium text-neutral-800">
                        {item.quantity} {item.unit}
                      </td>

                      {/* Value */}
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="font-bold text-neutral-900">
                          {formatNGN(item.totalPrice)}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {formatNGN(item.unitPrice)} / {item.unit}
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="px-3 py-4 text-xs text-neutral-600 whitespace-nowrap">
                        <div className="font-medium text-neutral-900">{item.deliveryState}</div>
                        <div>{item.deliveryLga}</div>
                      </td>

                      {/* Status */}
                      <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                        {getOrderStatusBadge(item.orderStatus)}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-neutral-900">No incoming orders yet</h2>
            <p className="mt-1 text-sm text-neutral-500 max-w-sm mx-auto">
              When buyers purchase your listed produce, their orders will appear here for preparation and fulfillment.
            </p>
            <div className="mt-6">
              <Link
                href="/farmer/listings"
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                View Your Active Listings
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
