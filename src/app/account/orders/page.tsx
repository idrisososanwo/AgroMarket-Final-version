import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getBuyerOrdersResult } from "@/features/orders/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { getOrderStatusBadge } from "@/features/orders/components/order-status-badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Orders | AgroMarket",
};

export default async function BuyerOrdersPage() {
  const user = await requireAuth();
  const { orders, error } = await getBuyerOrdersResult(user.id);

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Navigation Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/account" className="hover:text-emerald-700 transition">
            Account
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">My Orders</span>
        </div>

        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
              Produce Orders
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Track and review all agricultural produce purchases placed on AgroMarket.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            Browse Marketplace
          </Link>
        </div>

        {/* Database Error Banner */}
        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-800 flex items-start gap-3">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-rose-900">Unable to load orders</p>
              <p className="mt-0.5 text-rose-700">A temporary service error occurred while retrieving order history.</p>
            </div>
          </div>
        )}

        {/* Orders List */}
        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:border-neutral-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-neutral-900 text-base">
                      {order.orderNumber}
                    </span>
                    {getOrderStatusBadge(order.status)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                    </span>
                    <span>•</span>
                    <span>{order.itemCount} {order.itemCount === 1 ? "produce item" : "produce items"}</span>
                    <span>•</span>
                    <span>{order.sellerCount} {order.sellerCount === 1 ? "producer" : "producers"}</span>
                  </div>
                  <div className="mt-2 text-xs text-neutral-600">
                    Delivery to: <strong>{order.deliveryLga}, {order.deliveryState}</strong>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                  <div className="text-right">
                    <div className="text-xs text-neutral-400">Total Amount</div>
                    <div className="text-base font-black text-neutral-900">
                      {formatNGN(order.totalAmount)}
                    </div>
                  </div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    View Receipt &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-neutral-900">No orders found</h2>
            <p className="mt-1 text-sm text-neutral-500 max-w-sm mx-auto">
              You have not placed any produce orders on AgroMarket yet.
            </p>
            <div className="mt-6">
              <Link
                href="/marketplace"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                Browse Produce Marketplace
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
