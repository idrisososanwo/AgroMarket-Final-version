import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { getSellerDisputes } from "@/features/disputes/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { getDisputeStatusBadge } from "@/app/account/disputes/page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Disputes & Quality Claims | Farmer Workspace | AgroMarket",
};

export default async function FarmerDisputesPage() {
  await requireRole("FARMER");
  const disputes = await getSellerDisputes();

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/farmer" className="hover:text-emerald-700 transition">
            Farmer Workspace
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Disputes & Claims</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Customer Quality & Delivery Claims
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Claims submitted by buyers regarding goods damaged in transit, grade discrepancies, or weight shortages.
            </p>
          </div>
          <Link
            href="/farmer/settlements"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition self-start sm:self-auto"
          >
            View Settlement Holds &rarr;
          </Link>
        </div>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-neutral-900">Zero Active Disputes</h2>
            <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
              Your farm consignments have zero open buyer claims. All fulfillments are in excellent standing.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:border-neutral-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-neutral-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Case #{dispute.id.slice(0, 8)}
                      </span>
                      {getDisputeStatusBadge(dispute.status)}
                    </div>
                    <div className="text-sm font-bold text-neutral-900">
                      {dispute.reason}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-neutral-500">Disputed Amount</div>
                    <div className="text-sm font-black text-rose-600">
                      {formatNGN(dispute.disputedAmount)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-600">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Buyer</span>
                    <span className="font-semibold text-neutral-800">
                      {dispute.buyerName || "Registered Customer"}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Related Order</span>
                    <span className="font-semibold text-neutral-800">
                      {dispute.orderNumber || dispute.orderId.slice(0, 8)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Produce Item</span>
                    <span className="font-medium text-neutral-800">
                      {dispute.productName || "Consignment Batch"}
                    </span>
                  </div>
                </div>

                {dispute.status === "OPEN" && !dispute.sellerResponse && (
                  <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-center justify-between">
                    <span className="font-semibold">Action Required:</span>
                    <span>Submit your formal statement or agree to a resolution.</span>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    Opened:{" "}
                    <strong>
                      {new Date(dispute.createdAt).toLocaleDateString("en-NG", {
                        dateStyle: "medium",
                      })}
                    </strong>
                  </span>
                  <Link
                    href={`/farmer/disputes/${dispute.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    Respond / View Case &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
