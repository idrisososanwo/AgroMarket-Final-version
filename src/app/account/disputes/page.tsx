import Link from "next/link";
import { requireAuth } from "@/lib/auth/server";
import { getBuyerDisputes } from "@/features/disputes/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { DisputeStatus } from "@/features/disputes/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Disputes & Claims | AgroMarket",
};

export function getDisputeStatusBadge(status: DisputeStatus) {
  switch (status) {
    case "OPEN":
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
          Awaiting Seller Response
        </span>
      );
    case "UNDER_REVIEW":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
          Admin Under Review
        </span>
      );
    case "RESOLVED":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          Resolved
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
          Rejected
        </span>
      );
    case "CLOSED":
      return (
        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 ring-1 ring-inset ring-neutral-500/20">
          Closed / Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
          {status}
        </span>
      );
  }
}

export default async function BuyerDisputesPage() {
  await requireAuth();
  const disputes = await getBuyerDisputes();

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/account" className="hover:text-emerald-700 transition">
            Account
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Disputes & Claims</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Disputes & Claims
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Track issues raised on produce quality, damaged goods, or delivery shortages.
            </p>
          </div>

          <Link
            href="/account/orders"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition self-start sm:self-auto"
          >
            View Orders to Report Issue
          </Link>
        </div>

        {/* Dispute List */}
        {disputes.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-neutral-900">No active disputes</h2>
            <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
              All your agricultural consignments are currently in good standing. If you experience an issue upon delivery, report it from your orders page.
            </p>
            <div className="mt-6">
              <Link
                href="/account/orders"
                className="inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition"
              >
                Go to My Orders
              </Link>
            </div>
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
                    <span className="text-neutral-400 block text-[11px]">Related Order</span>
                    <Link
                      href={`/account/orders/${dispute.orderId}`}
                      className="font-semibold text-emerald-700 hover:underline"
                    >
                      {dispute.orderNumber || "View Order"}
                    </Link>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Producer / Seller</span>
                    <span className="font-semibold text-neutral-800">
                      {dispute.sellerName || "Farmer Consignment"}
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

                {dispute.refundAmount > 0 && (
                  <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center justify-between">
                    <span>Refund Awarded:</span>
                    <span className="font-bold text-emerald-900">
                      {formatNGN(dispute.refundAmount)}
                    </span>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    Category: <strong>{dispute.disputeType.replace(/_/g, " ")}</strong>
                  </span>
                  <Link
                    href={`/account/disputes/${dispute.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    View Details & Evidence &rarr;
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
