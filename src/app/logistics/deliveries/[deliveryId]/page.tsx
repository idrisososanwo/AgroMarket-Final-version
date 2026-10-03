import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getDeliveryById } from "@/features/logistics/queries";
import { DeliveryTimeline } from "@/features/logistics/components/delivery-timeline";
import { ProviderActions } from "@/features/logistics/components/provider-actions";
import { getActiveLogisticsCorridorAdvisories } from "@/features/agricultural-security/queries";
import { CorridorAdvisoryBanner } from "@/features/agricultural-security/components/corridor-advisory-banner";
import { formatNGN } from "@/features/marketplace/constants";

interface DeliveryDetailPageProps {
  params: Promise<{
    deliveryId: string;
  }>;
}

export default async function DeliveryDetailPage({ params }: DeliveryDetailPageProps) {
  const user = await requireAuth();
  const { deliveryId } = await params;

  const delivery = await getDeliveryById(deliveryId);
  if (!delivery) {
    notFound();
  }

  // Verify access authorization
  const isAuthorized =
    user.roles.includes("ADMIN") ||
    user.roles.includes("SERVICE_PROVIDER") ||
    delivery.sellerId === user.id;

  if (!isAuthorized) {
    notFound();
  }

  const corridorAdvisories = await getActiveLogisticsCorridorAdvisories(
    [delivery.pickupState, delivery.deliveryState].filter(Boolean)
  );

  // Render view
  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
          <Link href="/logistics/deliveries" className="hover:underline">
            Consignments
          </Link>
          <span>/</span>
          <span className="text-emerald-950 font-semibold">{delivery.trackingNumber}</span>
        </div>

        {/* Agricultural Corridor Security Advisory */}
        <CorridorAdvisoryBanner advisories={corridorAdvisories} />

        {/* Header */}
        <div className="bg-emerald-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-800 text-emerald-200 text-xs font-semibold rounded-full mb-2">
                Consignment Dispatch Control
              </span>
              <h1 className="text-2xl font-bold tracking-tight font-mono">{delivery.trackingNumber}</h1>
              <p className="text-emerald-200 text-xs mt-1">
                Order: <span className="font-semibold">{delivery.orderNumber || delivery.orderId}</span>
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-emerald-300 block">Delivery Fee (Provisional Estimate)</span>
              <span className="text-xl font-extrabold text-white">{formatNGN(delivery.deliveryFee)}</span>
              <span className="block text-[10px] text-emerald-200 mt-0.5">Development Simulation Rate</span>
            </div>
          </div>
        </div>

        {/* Route Card */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-xs mb-2">
              📍 Origin (Farm Pickup Point)
            </h3>
            <p className="font-semibold text-emerald-950">{delivery.sellerName || "Seller Farm"}</p>
            <p className="text-stone-600 mt-1">{delivery.pickupAddress}</p>
            <p className="text-stone-500">{delivery.pickupLga}, {delivery.pickupState} State</p>
            {delivery.sellerPhone && (
              <p className="text-stone-500 mt-1">Contact: {delivery.sellerPhone}</p>
            )}
          </div>

          <div>
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-xs mb-2">
              🏠 Destination (Buyer Handover)
            </h3>
            <p className="font-semibold text-emerald-950">{delivery.recipientName}</p>
            <p className="text-stone-600 mt-1">{delivery.deliveryAddress}</p>
            <p className="text-stone-500">{delivery.deliveryLga}, {delivery.deliveryState} State</p>
            <p className="text-stone-500 mt-1">Phone: {delivery.recipientPhone}</p>
          </div>
        </div>

        {/* Carrier Actions */}
        <ProviderActions
          deliveryId={delivery.id}
          currentStatus={delivery.status}
          pickupState={delivery.pickupState}
          deliveryState={delivery.deliveryState}
        />

        {/* Timeline & Events */}
        <DeliveryTimeline
          status={delivery.status}
          events={delivery.events}
          estimatedDeliveryDate={delivery.estimatedDeliveryDate}
          actualDeliveryDate={delivery.actualDeliveryDate}
        />
      </div>
    </div>
  );
}
