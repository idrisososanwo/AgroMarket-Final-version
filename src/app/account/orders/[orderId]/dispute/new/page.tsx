import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getOrderById } from "@/features/orders/queries";
import { CreateDisputeForm } from "@/features/disputes/components/create-dispute-form";

interface NewDisputePageProps {
  params: Promise<{
    orderId: string;
  }>;
  searchParams: Promise<{
    sellerId?: string;
    orderItemId?: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Report Issue / Open Dispute | AgroMarket",
};

export default async function NewDisputePage({
  params,
  searchParams,
}: NewDisputePageProps) {
  const user = await requireAuth();
  const { orderId } = await params;
  const { sellerId, orderItemId } = await searchParams;

  const order = await getOrderById(orderId);

  if (!order) {
    notFound();
  }

  // Only the buyer who placed the order can open a dispute
  if (order.buyerId !== user.id) {
    redirect("/account/orders");
  }

  // Orders in PENDING or CANCELLED status cannot be disputed
  if (order.status === "PENDING" || order.status === "CANCELLED") {
    redirect(`/account/orders/${orderId}`);
  }

  const items = order.items.map((i) => ({
    id: i.id,
    sellerId: i.sellerId,
    sellerName: i.sellerName || "Farmer Consignment",
    productName: i.productName,
    quantity: i.quantity,
    unit: i.unit,
    totalPrice: i.totalPrice,
  }));

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
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
          <Link
            href={`/account/orders/${order.id}`}
            className="hover:text-emerald-700 transition"
          >
            {order.orderNumber}
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Open Dispute</span>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 pb-6 border-b border-neutral-100">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 mb-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Produce Protection & Dispute Intake
            </div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Report an Issue with Order {order.orderNumber}
            </h1>
            <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
              If your agricultural produce arrived damaged, spoiled, below agreed grade, or short in quantity,
              submit your claim here. AgroMarket will place a fulfillment hold on the farmer&apos;s settlement
              until the matter is mutually resolved or arbitrated.
            </p>
          </div>

          <CreateDisputeForm
            orderId={order.id}
            orderNumber={order.orderNumber}
            items={items}
            defaultSellerId={sellerId}
            defaultOrderItemId={orderItemId}
          />
        </div>
      </div>
    </div>
  );
}
