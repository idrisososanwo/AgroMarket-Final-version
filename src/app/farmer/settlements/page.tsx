import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { getSellerSettlements } from "@/features/settlements/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { SettlementStatus } from "@/features/settlements/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settlements & Payouts | Farmer Workspace | AgroMarket",
};

export function getSettlementStatusBadge(status: SettlementStatus) {
  switch (status) {
    case "PENDING":
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
          Hold (Fulfillment / Dispute Window)
        </span>
      );
    case "ELIGIBLE":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
          Eligible for Payout
        </span>
      );
    case "PROCESSING":
      return (
        <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
          Disbursement Processing
        </span>
      );
    case "SETTLED":
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          Settled / Paid
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
          Disbursement Failed
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

export default async function FarmerSettlementsPage() {
  await requireRole("FARMER");
  const settlements = await getSellerSettlements();

  const totalGross = settlements.reduce((acc, s) => acc + s.grossAmount, 0);
  const totalNet = settlements.reduce((acc, s) => acc + s.netAmount, 0);
  const totalSettled = settlements
    .filter((s) => s.status === "SETTLED")
    .reduce((acc, s) => acc + s.netAmount, 0);
  const totalHeld = settlements
    .filter((s) => s.status === "PENDING" || s.status === "ELIGIBLE")
    .reduce((acc, s) => acc + s.netAmount, 0);

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/farmer" className="hover:text-emerald-700 transition">
            Farmer Workspace
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Settlements & Payouts</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Settlement Accounting & Payouts
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Transparent, per-order accounting of your produce proceeds, delivery deductions, and fulfillment holds.
            </p>
          </div>
          <Link
            href="/farmer/disputes"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition self-start sm:self-auto"
          >
            View Active Disputes
          </Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Total Gross Sales</span>
            <span className="text-xl font-black text-neutral-900 mt-1 block">
              {formatNGN(totalGross)}
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Settled to Bank</span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">
              {formatNGN(totalSettled)}
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Held in Fulfillment</span>
            <span className="text-xl font-black text-amber-600 mt-1 block">
              {formatNGN(totalHeld)}
            </span>
            <span className="text-[10px] text-neutral-400 mt-0.5 block">
              Awaiting transit or dispute window
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Net Earnings</span>
            <span className="text-xl font-black text-neutral-900 mt-1 block">
              {formatNGN(totalNet)}
            </span>
          </div>
        </div>

        {/* Informational Banner */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-xs text-neutral-600 flex items-start gap-3 shadow-sm">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-neutral-900">Fulfillment Hold Policy</div>
            <p className="text-neutral-500 mt-0.5 leading-relaxed">
              To protect market integrity, produce sales are held until buyer delivery is completed and the 7-day quality inspection window expires without open claims. Once eligible, settlements are disbursed directly to your registered Nigerian bank account.
            </p>
          </div>
        </div>

        {/* Settlements Table / Cards */}
        {settlements.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-neutral-50 text-neutral-400 flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-neutral-900">No Settlements Yet</h2>
            <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
              When buyers purchase and pay for your produce, your settlement records and fulfillment schedules will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {settlements.map((settlement) => (
              <div
                key={settlement.id}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:border-neutral-300 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-neutral-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Order #{settlement.orderNumber || settlement.orderId.slice(0, 8)}
                      </span>
                      {getSettlementStatusBadge(settlement.status)}
                    </div>
                    <div className="text-xs text-neutral-400">
                      Created:{" "}
                      {new Date(settlement.createdAt).toLocaleDateString("en-NG", {
                        dateStyle: "medium",
                      })}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-neutral-500">Net Payout</div>
                    <div className="text-lg font-black text-emerald-700">
                      {formatNGN(settlement.netAmount)}
                    </div>
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Gross Sales</span>
                    <span className="font-bold text-neutral-800">
                      {formatNGN(settlement.grossAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Platform Fee</span>
                    <span className="font-medium text-neutral-700">
                      -{formatNGN(settlement.platformFee)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Logistics Adj</span>
                    <span className="font-medium text-neutral-700">
                      -{formatNGN(settlement.logisticsAdjustment)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Refunds Issued</span>
                    <span className="font-medium text-rose-600">
                      -{formatNGN(settlement.refundDeduction)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[11px]">Dispute Adj</span>
                    <span className="font-medium text-rose-600">
                      -{formatNGN(settlement.disputeAdjustment)}
                    </span>
                  </div>
                </div>

                {/* Status & Hold Explanations */}
                <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-neutral-500">
                  <div>
                    {settlement.holdReason ? (
                      <span className="text-amber-700 font-medium">
                        Hold: {settlement.holdReason}
                      </span>
                    ) : settlement.status === "SETTLED" ? (
                      <span className="text-emerald-700 font-medium">
                        Disbursed on{" "}
                        {settlement.settledAt
                          ? new Date(settlement.settledAt).toLocaleDateString("en-NG", {
                              dateStyle: "medium",
                            })
                          : "Completed"}
                      </span>
                    ) : (
                      <span>Awaiting scheduled release</span>
                    )}
                  </div>

                  {settlement.payoutReference && (
                    <div className="text-[11px] text-neutral-400">
                      Ref: <span className="font-mono">{settlement.payoutReference}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
