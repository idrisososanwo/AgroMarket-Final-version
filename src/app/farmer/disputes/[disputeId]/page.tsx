import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { getDisputeById } from "@/features/disputes/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { getDisputeStatusBadge } from "@/app/account/disputes/page";
import {
  SellerResponseForm,
  AddEvidenceModal,
} from "@/features/disputes/components/dispute-detail-actions";

interface FarmerDisputeDetailPageProps {
  params: Promise<{
    disputeId: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dispute Case | Farmer Workspace | AgroMarket",
};

export default async function FarmerDisputeDetailPage({
  params,
}: FarmerDisputeDetailPageProps) {
  const user = await requireRole("FARMER");
  const { disputeId } = await params;
  const dispute = await getDisputeById(disputeId);

  if (!dispute) {
    notFound();
  }

  // Strictly enforce seller isolation: must be the seller targeted by this dispute
  if (dispute.sellerId !== user.id) {
    redirect("/farmer/disputes");
  }

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/farmer" className="hover:text-emerald-700 transition">
            Farmer Workspace
          </Link>
          <span>/</span>
          <Link href="/farmer/disputes" className="hover:text-emerald-700 transition">
            Disputes
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">
            Case #{dispute.id.slice(0, 8)}
          </span>
        </div>

        {/* Dispute Detail Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
                  Case #{dispute.id.slice(0, 8)}
                </h1>
                {getDisputeStatusBadge(dispute.status)}
              </div>
              <p className="text-xs text-neutral-500">
                Filed on{" "}
                {new Date(dispute.createdAt).toLocaleDateString("en-NG", {
                  dateStyle: "full",
                })}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-neutral-500 block">Fulfillment Hold</span>
              <span className="text-lg font-black text-rose-600">
                {formatNGN(dispute.disputedAmount)}
              </span>
            </div>
          </div>

          {/* Quick Context */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-b border-neutral-100 text-xs">
            <div>
              <span className="text-neutral-400 block text-[11px]">Customer / Buyer</span>
              <span className="font-bold text-neutral-800">
                {dispute.buyerName || "Registered Buyer"}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Order Reference</span>
              <span className="font-bold text-neutral-800">
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

          {/* Customer's Complaint */}
          <div className="py-6 border-b border-neutral-100 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Customer Claim & Description
            </h2>
            <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100 space-y-2">
              <div className="text-sm font-bold text-neutral-900">
                {dispute.reason}
              </div>
              <div className="text-xs text-neutral-500">
                Category: <strong>{dispute.disputeType.replace(/_/g, " ")}</strong>
              </div>
              <p className="text-xs text-neutral-700 whitespace-pre-line leading-relaxed">
                {dispute.description}
              </p>
            </div>
          </div>

          {/* Seller Response Section */}
          <div className="py-6 border-b border-neutral-100 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Your Formal Response
            </h2>
            {dispute.sellerResponse ? (
              <div className="rounded-xl bg-emerald-50/40 border border-emerald-200/60 p-4 space-y-2">
                <p className="text-xs text-neutral-800 whitespace-pre-line leading-relaxed">
                  {dispute.sellerResponse}
                </p>
                {dispute.sellerRespondedAt && (
                  <p className="text-[11px] text-neutral-400 pt-1">
                    Submitted on{" "}
                    {new Date(dispute.sellerRespondedAt).toLocaleDateString("en-NG", {
                      dateStyle: "medium",
                    })}
                  </p>
                )}
              </div>
            ) : dispute.status === "OPEN" ? (
              <SellerResponseForm disputeId={dispute.id} />
            ) : (
              <p className="text-xs text-neutral-400 italic">
                No statement submitted before dispute review concluded.
              </p>
            )}
          </div>

          {/* Arbitration Decision (if resolved) */}
          {dispute.resolutionType && (
            <div className="py-6 border-b border-neutral-100 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Platform Arbitration Outcome
              </h2>
              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">
                    Resolution: {dispute.resolutionType.replace(/_/g, " ")}
                  </span>
                  {dispute.refundAmount > 0 && (
                    <span className="text-xs font-bold text-rose-600">
                      Settlement Deduction: -{formatNGN(dispute.refundAmount)}
                    </span>
                  )}
                </div>
                {dispute.resolutionNotes && (
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {dispute.resolutionNotes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Evidence Files */}
          <div className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Evidence & Documentation ({dispute.evidence.length})
              </h2>
              {dispute.status !== "CLOSED" && dispute.status !== "RESOLVED" && (
                <AddEvidenceModal disputeId={dispute.id} />
              )}
            </div>

            {dispute.evidence.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">
                No photos, weighbridge slips, or documents attached.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dispute.evidence.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-neutral-200 p-3 bg-neutral-50/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-700">
                        {item.evidenceType.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {new Date(item.createdAt).toLocaleDateString("en-NG")}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-neutral-600">{item.description}</p>
                    )}
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      View File / Media &rarr;
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            href="/farmer/disputes"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
          >
            &larr; Back to Farmer Disputes
          </Link>
        </div>
      </div>
    </div>
  );
}
