import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getOrderDetailsResult } from "@/features/orders/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { getOrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { OrderCancelButton } from "@/features/orders/components/order-cancel-button";

interface OrderDetailPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Order Details | AgroMarket",
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const user = await requireAuth();
  const { orderId } = await params;
  const { order, error } = await getOrderDetailsResult(orderId);

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50/70 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-neutral-900">Unable to load order details</h1>
          <p className="mt-2 text-xs text-neutral-500">
            A temporary system error occurred while retrieving order information: {error}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/account/orders"
              className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
            >
              Back to My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    notFound();
  }

  // Authorization check: buyer or admin or seller of an item in this order
  const isBuyer = order.buyerId === user.id;
  const isAdmin = user.roles.includes("ADMIN");
  const isSeller = order.items.some((item) => item.sellerId === user.id);

  if (!isBuyer && !isAdmin && !isSeller) {
    redirect("/account/orders");
  }

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/account" className="hover:text-emerald-700 transition">
            Account
          </Link>
          <span>/</span>
          <Link href="/account/orders" className="hover:text-emerald-700 transition">
            My Orders
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">{order.orderNumber}</span>
        </div>

        {/* Order Header Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
                  {order.orderNumber}
                </h1>
                {getOrderStatusBadge(order.status)}
              </div>
              <p className="text-xs text-neutral-500">
                Created on {new Date(order.createdAt).toLocaleDateString("en-NG", { dateStyle: "full" })} at{" "}
                {new Date(order.createdAt).toLocaleTimeString("en-NG", { timeStyle: "short" })}
              </p>
            </div>

            {/* Action buttons if still pending */}
            {isBuyer && order.status === "PENDING" && (
              <div className="flex items-center gap-3">
                <OrderCancelButton orderId={order.id} />
                <Link
                  href={`/account/orders/${order.id}/pay`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow transition duration-150 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Pay Now ({formatNGN(order.totalAmount)})
                </Link>
              </div>
            )}

            {/* Phase 0.8: Dispute button if paid / fulfilled / disputed */}
            {isBuyer && order.status !== "PENDING" && order.status !== "CANCELLED" && (
              <div className="flex items-center gap-3">
                <Link
                  href={`/account/orders/${order.id}/dispute/new`}
                  className="border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs px-4 py-2 rounded-xl shadow-sm transition duration-150 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Report Issue / Open Dispute
                </Link>
              </div>
            )}
          </div>

          {/* Phase 0.6 Payment Status Banner */}
          {order.status === "PENDING" && isBuyer && (
            <div className="mt-6 rounded-xl bg-amber-50/80 border border-amber-200 p-4 text-xs text-amber-900 space-y-2">
              <div className="font-semibold text-amber-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                Payment Pending — Inventory Reserved
              </div>
              <p className="text-amber-800 leading-relaxed">
                Produce inventory has been securely reserved. Complete your payment via Paystack or Flutterwave to initiate farm dispatch.
              </p>
              <div>
                <Link
                  href={`/account/orders/${order.id}/pay`}
                  className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 underline"
                >
                  Proceed to Payment Gateway &rarr;
                </Link>
              </div>
            </div>
          )}

          {order.status === "PAID" && (
            <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 space-y-2">
              <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Payment Confirmed — Ready for 3PL Dispatch
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Your payment of {formatNGN(order.totalAmount)} has been cryptographically verified. Third-party logistics carriers are coordinating pickup from farm locations.
              </p>
              <div>
                <Link
                  href={`/account/orders/${order.id}/delivery`}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow transition"
                >
                  🚚 Track Delivery Consignments &rarr;
                </Link>
              </div>
            </div>
          )}

          {order.status === "PROCESSING" && (
            <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900 space-y-2">
              <div className="font-semibold text-blue-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                Order In Processing & Dispatch
              </div>
              <p className="text-blue-800 leading-relaxed">
                Produce consignments are being aggregated and handled by third-party logistics carriers.
              </p>
              <div>
                <Link
                  href={`/account/orders/${order.id}/delivery`}
                  className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow transition"
                >
                  🚚 View Live Transit Timeline &rarr;
                </Link>
              </div>
            </div>
          )}

          {order.status === "COMPLETED" && (
            <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 space-y-2">
              <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Order Delivered & Completed
              </div>
              <p className="text-emerald-800 leading-relaxed">
                All consignments for this order have been successfully delivered to the destination address.
              </p>
              <div>
                <Link
                  href={`/account/orders/${order.id}/delivery`}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow transition"
                >
                  🚚 View Delivery Receipt & Proof &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Delivery Details */}
          <div className="mt-6 pt-6 border-t border-neutral-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              Delivery Destination
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-neutral-50 p-3">
                <span className="text-neutral-400 block mb-0.5">Address</span>
                <span className="font-semibold text-neutral-900">{order.deliveryAddress}</span>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3">
                <span className="text-neutral-400 block mb-0.5">Location</span>
                <span className="font-semibold text-neutral-900">{order.deliveryLga}, {order.deliveryState}</span>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3">
                <span className="text-neutral-400 block mb-0.5">Recipient Phone</span>
                <span className="font-semibold text-neutral-900">{order.contactPhone}</span>
              </div>
              {order.deliveryNotes && (
                <div className="rounded-lg bg-neutral-50 p-3">
                  <span className="text-neutral-400 block mb-0.5">Delivery Notes</span>
                  <span className="font-medium text-neutral-800">{order.deliveryNotes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Immutable Snapshot Line Items */}
          <div className="mt-8 pt-6 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Ordered Produce ({order.itemCount} {order.itemCount === 1 ? "item" : "items"})
              </h2>
              <span className="text-xs text-neutral-500 font-medium">
                {order.sellerCount} {order.sellerCount === 1 ? "Producer" : "Producers"}
              </span>
            </div>

            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                  <div>
                    <div className="font-bold text-neutral-900 text-sm">
                      {item.productName}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      Seller: <strong>{item.sellerName}</strong> {item.sellerState ? `(${item.sellerState})` : ""}
                    </div>
                    <div className="text-xs text-neutral-600 mt-1">
                      {item.quantity} {item.unit} &times; {formatNGN(item.unitPrice)}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="text-sm font-black text-neutral-900">
                      {formatNGN(item.totalPrice)}
                    </div>
                    <span className="inline-block rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                      {item.status}
                    </span>
                    {isBuyer && order.status !== "PENDING" && order.status !== "CANCELLED" && (
                      <Link
                        href={`/account/orders/${order.id}/dispute/new?sellerId=${item.sellerId}&orderItemId=${item.id}`}
                        className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold hover:underline"
                      >
                        Report Issue
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals */}
          <div className="mt-6 pt-6 border-t border-neutral-100 max-w-xs ml-auto space-y-2 text-xs text-neutral-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-neutral-900">{formatNGN(order.subtotalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span className="font-semibold text-emerald-700">₦0.00</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-neutral-200 text-sm font-black text-neutral-900">
              <span>Total:</span>
              <span className="text-lg text-emerald-700">{formatNGN(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            href="/account/orders"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
          >
            &larr; Back to Order History
          </Link>
        </div>
      </div>
    </div>
  );
}
