import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth/server";
import { getDisputeById } from "@/features/disputes/queries";
import { formatNGN } from "@/features/marketplace/constants";
import { getDisputeStatusBadge } from "@/app/account/disputes/page";
import {
  AdminResolveForm,
  AddEvidenceModal,
} from "@/features/disputes/components/dispute-detail-actions";

interface AdminDisputeDetailPageProps {
  params: Promise<{
    disputeId: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Arbitrate Dispute Case | Admin Console | AgroMarket",
};

export default async function AdminDisputeDetailPage({
  params,
}: AdminDisputeDetailPageProps) {
  await requireRole("ADMIN");
  const { disputeId } = await params;
  const dispute = await getDisputeById(disputeId);

  if (!dispute) {
    notFound();
  }

  const isPendingResolution =
    dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW";

  return (
    <div className="min-h-screen bg-neutral-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          <Link href="/admin" className="hover:text-purple-700 transition">
            Admin Console
          </Link>
          <span>/</span>
          <Link href="/admin/disputes" className="hover:text-purple-700 transition">
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
                  Arbitrate Case #{dispute.id.slice(0, 8)}
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
              <span className="text-xs text-neutral-500 block">Total Claim Value</span>
              <span className="text-lg font-black text-rose-600">
                {formatNGN(dispute.disputedAmount)}
              </span>
            </div>
          </div>

          {/* Participant Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-b border-neutral-100 text-xs">
            <div>
              <span className="text-neutral-400 block text-[11px]">Buyer / Complainant</span>
              <span className="font-bold text-neutral-800">
                {dispute.buyerName || "Customer"}
              </span>
              <span className="text-[11px] text-neutral-500 block">
                ID: {dispute.openedBy.slice(0, 8)}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Seller / Producer</span>
              <span className="font-bold text-neutral-800">
                {dispute.sellerName || "Farmer"}
              </span>
              <span className="text-[11px] text-neutral-500 block">
                ID: {dispute.sellerId.slice(0, 8)}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[11px]">Order Reference</span>
              <Link
                href={`/admin/orders/${dispute.orderId}`}
                className="font-bold text-purple-700 hover:underline"
              >
                {dispute.orderNumber || dispute.orderId.slice(0, 8)}
              </Link>
              <span className="text-[11px] text-neutral-500 block">
                Item: {dispute.productName || "Entire Consignment"}
              </span>
            </div>
          </div>

          {/* Complainant's Claim */}
          <div className="py-6 border-b border-neutral-100 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Buyer Claim & Defect Allegation
            </h2>
            <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100 space-y-1">
              <div className="text-sm font-bold text-neutral-900">
                {dispute.reason}
              </div>
              <div className="text-xs text-neutral-500">
                Category: <strong>{dispute.disputeType.replace(/_/g, " ")}</strong>
              </div>
              <p className="text-xs text-neutral-700 whitespace-pre-line leading-relaxed pt-1">
                {dispute.description}
              </p>
            </div>
          </div>

          {/* Seller's Response */}
          <div className="py-6 border-b border-neutral-100 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Seller Defense & Statement
            </h2>
            {dispute.sellerResponse ? (
              <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100 space-y-1">
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
            ) : (
              <p className="text-xs text-amber-700 italic">
                Seller has not yet responded to this claim.
              </p>
            )}
          </div>

          {/* Evidence Files */}
          <div className="py-6 border-b border-neutral-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Evidence Repository ({dispute.evidence.length})
              </h2>
              <AddEvidenceModal disputeId={dispute.id} />
            </div>

            {dispute.evidence.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">
                No evidentiary documents attached to this case.
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
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-neutral-500">
                        By: {item.uploadedByName || item.uploadedBy.slice(0, 8)}
                      </span>
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-purple-700 hover:underline"
                      >
                        Inspect Proof &rarr;
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Arbitration Panel / Form */}
          <div className="pt-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Arbitration Ruling & Financial Resolution
            </h2>

            {isPendingResolution ? (
              <AdminResolveForm
                disputeId={dispute.id}
                disputedAmount={dispute.disputedAmount}
              />
            ) : (
              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">
                    Decision: {dispute.resolutionType?.replace(/_/g, " ")}
                  </span>
                  {dispute.refundAmount > 0 && (
                    <span className="text-sm font-black text-rose-600">
                      Gateway Refund Issued: {formatNGN(dispute.refundAmount)}
                    </span>
                  )}
                </div>
                {dispute.resolutionNotes && (
                  <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line">
                    {dispute.resolutionNotes}
                  </p>
                )}
                <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-200">
                  Resolved by admin ({dispute.resolvedBy?.slice(0, 8)}) on{" "}
                  {dispute.resolvedAt
                    ? new Date(dispute.resolvedAt).toLocaleDateString("en-NG", {
                        dateStyle: "full",
                      })
                    : "Completed"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            href="/admin/disputes"
            className="text-xs font-semibold text-purple-700 hover:text-purple-800 transition"
          >
            &larr; Back to Platform Disputes
          </Link>
        </div>
      </div>
    </div>
  );
}
