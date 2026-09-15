import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { getAdminDisputes } from "@/features/disputes/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { getDisputeStatusBadge } from "@/app/account/disputes/page";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform Disputes & Arbitration | Admin Console | AgroMarket",
};

export default async function AdminDisputesPage() {
  await requireRole("ADMIN");
  const disputes = await getAdminDisputes();

  const totalDisputed = disputes.reduce((acc, d) => acc + d.disputedAmount, 0);
  const openCases = disputes.filter(
    (d) => d.status === "OPEN" || d.status === "UNDER_REVIEW"
  ).length;

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/admin" className="hover:text-purple-700 transition">
            Admin Console
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Disputes Arbitration</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Dispute Arbitration & Resolution
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Arbitrate buyer produce claims, enforce fulfillment holds, and issue authoritative gateway refunds.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/settlements"
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition"
            >
              Settlement Accounting &rarr;
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Total Disputes</span>
            <span className="text-xl font-black text-neutral-900 mt-1 block">
              {disputes.length}
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Pending Resolution</span>
            <span className="text-xl font-black text-amber-600 mt-1 block">
              {openCases}
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Total Claims Value</span>
            <span className="text-xl font-black text-rose-600 mt-1 block">
              {formatNGN(totalDisputed)}
            </span>
          </div>
        </div>

        {/* Dispute List */}
        {disputes.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <h2 className="text-base font-bold text-neutral-900">No disputes on file</h2>
            <p className="mt-1 text-xs text-neutral-500">
              There are currently zero dispute cases recorded in the AgroMarket system.
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

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-neutral-600">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Buyer</span>
                    <span className="font-semibold text-neutral-800">
                      {dispute.buyerName || dispute.openedBy.slice(0, 8)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Seller / Farmer</span>
                    <span className="font-semibold text-neutral-800">
                      {dispute.sellerName || dispute.sellerId.slice(0, 8)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Order #</span>
                    <span className="font-semibold text-neutral-800">
                      {dispute.orderNumber || dispute.orderId.slice(0, 8)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Date Opened</span>
                    <span>
                      {new Date(dispute.createdAt).toLocaleDateString("en-NG", {
                        dateStyle: "medium",
                      })}
                    </span>
                  </div>
                </div>

                {dispute.resolutionType && (
                  <div className="mt-4 rounded-xl bg-neutral-50 p-3 border border-neutral-200 text-xs flex items-center justify-between">
                    <span>
                      Outcome: <strong>{dispute.resolutionType}</strong>
                    </span>
                    {dispute.refundAmount > 0 && (
                      <span className="font-bold text-rose-600">
                        Refund: {formatNGN(dispute.refundAmount)}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    Category: <strong>{dispute.disputeType.replace(/_/g, " ")}</strong>
                  </span>
                  <Link
                    href={`/admin/disputes/${dispute.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-800 transition"
                  >
                    Arbitrate / View Evidence &rarr;
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
