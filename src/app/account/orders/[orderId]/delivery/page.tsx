import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getOrderById } from "@/features/orders/queries";
import { getOrderDeliveries } from "@/features/logistics/queries";
import { DeliveryTimeline } from "@/features/logistics/components/delivery-timeline";
import { formatNGN } from "@/features/marketplace/constants";

interface OrderDeliveryPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function OrderDeliveryPage({ params }: OrderDeliveryPageProps) {
  const user = await requireAuth();
  const { orderId } = await params;

  const order = await getOrderById(orderId);
  if (!order) {
    notFound();
  }

  // Authorization check
  const isBuyer = order.buyerId === user.id;
  const isAdmin = user.roles.includes("ADMIN");
  const isSeller = order.items.some((i) => i.sellerId === user.id);

  if (!isBuyer && !isAdmin && !isSeller) {
    redirect("/account/orders");
  }

  const deliveries = await getOrderDeliveries(order.id);

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
          <Link href="/account" className="hover:underline">
            Account
          </Link>
          <span>/</span>
          <Link href="/account/orders" className="hover:underline">
            My Orders
          </Link>
          <span>/</span>
          <Link href={`/account/orders/${order.id}`} className="hover:underline">
            {order.orderNumber}
          </Link>
          <span>/</span>
          <span className="text-emerald-950 font-semibold">Delivery Tracking</span>
        </div>

        {/* Header Hero */}
        <div className="bg-emerald-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-800 text-emerald-200 text-xs font-semibold rounded-full mb-2">
                AgroMarket 3PL Logistics Coordination
              </span>
              <h1 className="text-2xl font-bold tracking-tight">Delivery Consignments</h1>
              <p className="text-emerald-200 text-sm mt-1">
                Order Reference: <span className="font-mono font-semibold">{order.orderNumber}</span>
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-emerald-300 block">Destination City</span>
              <span className="text-lg font-bold text-white">
                {order.deliveryLga}, {order.deliveryState} State
              </span>
            </div>
          </div>
        </div>

        {/* If unpaid, show notice */}
        {order.status === "PENDING" && (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-amber-900 text-sm space-y-2">
            <h2 className="font-bold text-amber-950">Payment Required Before Dispatch</h2>
            <p className="text-xs text-amber-800">
              Produce dispatch and carrier routing will initiate automatically once payment is cryptographically verified.
            </p>
            <div>
              <Link
                href={`/account/orders/${order.id}/pay`}
                className="inline-block mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow transition"
              >
                Proceed to Payment ({formatNGN(order.totalAmount)}) &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Deliveries Consignments Section */}
        {deliveries.length === 0 && order.status !== "PENDING" ? (
          <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-emerald-950 text-base">Initializing Consignment Dispatch</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Your order is verified. AgroMarket is currently assigning vetted third-party carriers to coordinate pickup from the farm locations.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Provisional Pricing Disclaimer */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-center gap-2">
              <span className="font-bold text-amber-800 uppercase tracking-wide">Provisional Pricing:</span>
              <span>
                Transit fees and delivery estimates reflect provisional development simulation rates. Real-time carrier-negotiated rates will apply in live production.
              </span>
            </div>

            {deliveries.map((delivery, index) => (
              <div
                key={delivery.id}
                className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden"
              >
                {/* Consignment Top Bar */}
                <div className="bg-emerald-50/50 p-4 sm:p-6 border-b border-emerald-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Consignment #{index + 1}
                      </span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded">
                        {delivery.trackingNumber}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-emerald-950 mt-1">
                      Origin: {delivery.pickupLga}, {delivery.pickupState} State &rarr; Destination: {delivery.deliveryState}
                    </p>
                    {delivery.sellerName && (
                      <p className="text-xs text-stone-500">
                        Seller Farm: <span className="font-medium text-stone-700">{delivery.sellerName}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-stone-500 block">Carrier Provider</span>
                    <span className="text-xs font-bold text-emerald-900 block">
                      {delivery.providerName || "Pending Carrier Assignment"}
                    </span>
                    <div className="text-xs text-stone-500 flex items-center gap-1.5 justify-start sm:justify-end mt-0.5">
                      <span>Fee: <span className="font-semibold text-emerald-800">{formatNGN(delivery.deliveryFee)}</span></span>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded border border-amber-200">
                        Provisional
                      </span>
                    </div>
                  </div>
                </div>

                {/* Consignment Details */}
                <div className="p-6 space-y-6">
                  {/* Item breakdown */}
                  {delivery.items && delivery.items.length > 0 && (
                    <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200">
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                        Produce in this Dispatch
                      </p>
                      <div className="divide-y divide-stone-200 text-xs">
                        {delivery.items.map((it) => (
                          <div key={it.id} className="py-1.5 flex justify-between">
                            <span className="font-medium text-stone-800">
                              {it.productName} &times; {it.quantity} {it.unit}
                            </span>
                            <span className="font-semibold text-stone-900">{formatNGN(it.totalPrice)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Route information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <p className="font-bold text-stone-700 mb-1">📍 Farm Pickup Location</p>
                      <p className="text-stone-600">{delivery.pickupAddress}</p>
                      <p className="text-stone-500">{delivery.pickupLga}, {delivery.pickupState} State</p>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <p className="font-bold text-stone-700 mb-1">🏠 Destination Handover</p>
                      <p className="text-stone-600">{delivery.deliveryAddress}</p>
                      <p className="text-stone-500">{delivery.deliveryLga}, {delivery.deliveryState} State</p>
                      <p className="text-stone-500 mt-1">Recipient: {delivery.recipientName} ({delivery.recipientPhone})</p>
                    </div>
                  </div>

                  {/* Visual Stepper & Event Ledger */}
                  <DeliveryTimeline
                    status={delivery.status}
                    events={delivery.events}
                    estimatedDeliveryDate={delivery.estimatedDeliveryDate}
                    actualDeliveryDate={delivery.actualDeliveryDate}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
