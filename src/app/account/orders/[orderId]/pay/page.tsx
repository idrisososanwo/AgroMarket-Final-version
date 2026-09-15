import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getOrderById } from "@/features/orders/queries";
import { CheckoutForm } from "@/features/payments/components/checkout-form";
import { formatNGN } from "@/features/marketplace/constants";

interface OrderPayPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function OrderPayPage({ params }: OrderPayPageProps) {
  const user = await requireAuth();
  const { orderId } = await params;

  const order = await getOrderById(orderId);
  if (!order) {
    notFound();
  }

  // Authorize: Only buyer or admin
  const isBuyer = order.buyerId === user.id;
  const isAdmin = user.roles.includes("ADMIN");
  if (!isBuyer && !isAdmin) {
    notFound();
  }

  // If already paid, redirect to receipt
  if (order.status !== "PENDING") {
    redirect(`/account/orders/${order.id}`);
  }

  return (
    <div className="min-h-screen bg-stone-50 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-emerald-700">
          <Link href="/account/orders" className="hover:underline">
            Orders
          </Link>
          <span>/</span>
          <Link href={`/account/orders/${order.id}`} className="hover:underline">
            {order.orderNumber}
          </Link>
          <span>/</span>
          <span className="text-emerald-950 font-medium">Checkout</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden mb-8">
          {/* Header */}
          <div className="bg-emerald-900 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="inline-block px-3 py-1 bg-emerald-800 text-emerald-200 text-xs font-semibold rounded-full mb-2">
                  Order Payment
                </span>
                <h1 className="text-2xl font-bold tracking-tight">Complete Your Payment</h1>
                <p className="text-emerald-200 text-sm mt-1">
                  Order: <span className="font-mono font-semibold">{order.orderNumber}</span>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-emerald-300 block">Total Payable</span>
                <span className="text-3xl font-extrabold text-white">
                  {formatNGN(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Order Items Snapshot Summary */}
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <h2 className="text-sm font-semibold text-emerald-950 mb-3 flex items-center justify-between">
                <span>Items in this Order ({order.items.length})</span>
                <span className="text-xs text-emerald-700 font-normal">Delivery to {order.deliveryState}</span>
              </h2>
              <div className="divide-y divide-stone-200 text-sm">
                {order.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-emerald-950">{item.productName}</p>
                      <p className="text-xs text-stone-500">
                        {item.quantity} {item.unit} &times; {formatNGN(item.unitPrice)}
                      </p>
                    </div>
                    <span className="font-semibold text-emerald-900">
                      {formatNGN(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Gateway Form */}
            <CheckoutForm
              orderId={order.id}
              orderNumber={order.orderNumber}
              totalAmount={order.totalAmount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
