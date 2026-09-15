import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getAssignedDeliveriesForProvider } from "@/features/logistics/queries";
import { formatNGN } from "@/features/marketplace/constants";

export default async function LogisticsDeliveriesPage() {
  const user = await requireAuth();
  const isAdmin = user.roles.includes("ADMIN");
  const isServiceProvider = user.roles.includes("SERVICE_PROVIDER");

  const deliveries = await getAssignedDeliveriesForProvider();

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm">
          <div>
            <span className="inline-block px-3 py-1 bg-emerald-800 text-emerald-200 text-xs font-semibold rounded-full mb-2">
              Logistics Dispatch Management
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Active Consignments</h1>
            <p className="text-emerald-200 text-xs mt-1">
              Third-party carrier dispatch dashboard for Nigerian produce routes.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-emerald-300 block">Total Active Dispatches</span>
            <span className="text-2xl font-extrabold text-white">{deliveries.length}</span>
          </div>
        </div>

        {/* Deliveries Table / Cards */}
        {deliveries.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-3">
            <div className="w-12 h-12 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="font-bold text-stone-900 text-base">No Assigned Deliveries</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {isAdmin
                ? "No delivery consignments exist yet in the system."
                : isServiceProvider
                ? "Your carrier profile currently has no dispatches assigned."
                : "You do not have carrier dispatch permissions."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="divide-y divide-stone-200">
              {deliveries.map((d) => (
                <div key={d.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-stone-50/70 transition">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {d.trackingNumber}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800">
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-emerald-950">
                      {d.pickupState} ({d.pickupLga}) &rarr; {d.deliveryState} ({d.deliveryLga})
                    </p>
                    <p className="text-xs text-stone-500">
                      Seller: <span className="text-stone-700 font-medium">{d.sellerName || "Farm Hub"}</span> &bull; Recipient: <span className="text-stone-700 font-medium">{d.recipientName}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <span className="text-xs text-stone-400 block">Delivery Fee</span>
                      <span className="text-sm font-bold text-emerald-900">{formatNGN(d.deliveryFee)}</span>
                    </div>
                    <Link
                      href={`/logistics/deliveries/${d.id}`}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow transition"
                    >
                      Manage Dispatch &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
