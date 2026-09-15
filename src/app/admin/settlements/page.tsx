import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { getAdminSettlements } from "@/features/settlements/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { getSettlementStatusBadge } from "@/app/farmer/settlements/page";
import { AdminSettlementRowActions } from "@/features/settlements/components/admin-settlement-actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform Settlement Accounting | Admin Console | AgroMarket",
};

export default async function AdminSettlementsPage() {
  await requireRole("ADMIN");
  const settlements = await getAdminSettlements();

  const totalGross = settlements.reduce((acc, s) => acc + s.grossAmount, 0);
  const totalPlatformFees = settlements.reduce((acc, s) => acc + s.platformFee, 0);
  const totalSettled = settlements
    .filter((s) => s.status === "SETTLED")
    .reduce((acc, s) => acc + s.netAmount, 0);
  const totalHeld = settlements
    .filter((s) => s.status === "PENDING" || s.status === "ELIGIBLE")
    .reduce((acc, s) => acc + s.netAmount, 0);

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/admin" className="hover:text-purple-700 transition">
            Admin Console
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">Settlement Accounting</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
              Platform Settlement Accounting & Holds
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Multi-seller ledger partitioning, fulfillment hold evaluations, and merchant disbursement control.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/disputes"
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition"
            >
              Disputes Arbitration &rarr;
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Total Gross Invoiced</span>
            <span className="text-xl font-black text-neutral-900 mt-1 block">
              {formatNGN(totalGross)}
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Held in Fulfillment</span>
            <span className="text-xl font-black text-amber-600 mt-1 block">
              {formatNGN(totalHeld)}
            </span>
            <span className="text-[10px] text-neutral-400 mt-0.5 block">
              Protected by delivery & dispute window
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Disbursed to Farmers</span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">
              {formatNGN(totalSettled)}
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold text-neutral-500 block">Platform Fees Earned</span>
            <span className="text-xl font-black text-purple-700 mt-1 block">
              {formatNGN(totalPlatformFees)}
            </span>
          </div>
        </div>

        {/* Settlements Table */}
        {settlements.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
            <h2 className="text-base font-bold text-neutral-900">Zero settlement records</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Settlements are automatically initialized when orders are confirmed and paid.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-100 text-xs text-left">
                <thead className="bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="py-3.5 px-4">Order / ID</th>
                    <th className="py-3.5 px-4">Seller / Producer</th>
                    <th className="py-3.5 px-4">Gross</th>
                    <th className="py-3.5 px-4">Deductions</th>
                    <th className="py-3.5 px-4">Net Payout</th>
                    <th className="py-3.5 px-4">Status & Hold</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {settlements.map((s) => {
                    const totalDeductions =
                      s.platformFee +
                      s.logisticsAdjustment +
                      s.refundDeduction +
                      s.disputeAdjustment;

                    return (
                      <tr key={s.id} className="hover:bg-neutral-50/50 transition">
                        <td className="py-4 px-4 font-mono font-medium text-neutral-900">
                          {s.orderNumber || s.orderId.slice(0, 8)}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-neutral-800 block">
                            {s.sellerName || "Farmer"}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {s.sellerId.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-neutral-900">
                          {formatNGN(s.grossAmount)}
                        </td>
                        <td className="py-4 px-4 text-neutral-600">
                          {totalDeductions > 0 ? (
                            <span className="text-rose-600 font-semibold">
                              -{formatNGN(totalDeductions)}
                            </span>
                          ) : (
                            <span className="text-neutral-400">₦0.00</span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-black text-emerald-700">
                          {formatNGN(s.netAmount)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {getSettlementStatusBadge(s.status)}
                            {s.holdReason && (
                              <p className="text-[10px] text-amber-700 max-w-xs">
                                {s.holdReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <AdminSettlementRowActions
                            settlementId={s.id}
                            orderId={s.orderId}
                            status={s.status}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
