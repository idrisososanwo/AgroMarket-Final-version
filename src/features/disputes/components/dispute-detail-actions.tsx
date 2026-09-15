"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addDisputeEvidenceAction,
  cancelDisputeAction,
  respondToDisputeAction,
  resolveDisputeAction,
  rejectDisputeAction,
} from "../actions";

interface AddEvidenceProps {
  disputeId: string;
}

export function AddEvidenceModal({ disputeId }: AddEvidenceProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fileUrl, setFileUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState("PHOTO");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await addDisputeEvidenceAction({
        disputeId,
        evidenceType,
        fileUrl,
        description: description.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to upload evidence.");
        return;
      }

      setIsOpen(false);
      setFileUrl("");
      setDescription("");
      router.refresh();
    });
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition"
      >
        + Add Proof / Evidence
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
          Upload Evidence / Documentation
        </h4>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs text-neutral-400 hover:text-neutral-600"
        >
          Cancel
        </button>
      </div>

      {errorMsg && (
        <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
            Evidence Type
          </label>
          <select
            value={evidenceType}
            onChange={(e) => setEvidenceType(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none"
          >
            <option value="PHOTO">Photograph (Produce condition)</option>
            <option value="DELIVERY_PROOF">Waybill / Weighbridge Slip</option>
            <option value="VIDEO">Video Clip</option>
            <option value="DOCUMENT">Inspection Certificate / Lab Test</option>
            <option value="CHAT_REFERENCE">Communication Record</option>
            <option value="OTHER">Other Verification</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
            Document / Image URL
          </label>
          <input
            type="url"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            required
            placeholder="https://storage.agromarket.ng/..."
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
            Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Weighbridge printout showing 120kg deficit"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {isPending ? "Submitting..." : "Submit Proof"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface BuyerCancelDisputeProps {
  disputeId: string;
}

export function BuyerCancelDisputeButton({ disputeId }: BuyerCancelDisputeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await cancelDisputeAction({ disputeId, reason });
      if (!res.success) {
        setErrorMsg(res.error || "Failed to cancel dispute.");
        return;
      }
      setIsConfirming(false);
      router.refresh();
    });
  };

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
      >
        Cancel Dispute
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
      <h4 className="text-xs font-bold text-neutral-900">Cancel Dispute</h4>
      <p className="text-[11px] text-neutral-500">
        Cancelling this dispute will lift any fulfillment hold on the seller&apos;s settlement.
      </p>
      {errorMsg && (
        <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
          {errorMsg}
        </div>
      )}
      <form onSubmit={handleCancel} className="space-y-2">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={5}
          placeholder="Reason for cancellation (e.g. Produce received in good condition)"
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsConfirming(false)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            Keep Open
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {isPending ? "Cancelling..." : "Confirm Cancellation"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface SellerResponseFormProps {
  disputeId: string;
}

export function SellerResponseForm({ disputeId }: SellerResponseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [response, setResponse] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const payload: Record<string, unknown> = {
        disputeId,
        response,
      };
      if (evidenceUrl.trim()) {
        payload.evidenceUrls = [evidenceUrl.trim()];
      }

      const res = await respondToDisputeAction(payload);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to submit response.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
          Your Response to the Buyer&apos;s Claim
        </label>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          required
          rows={4}
          minLength={10}
          maxLength={2000}
          placeholder="Explain the dispatch condition, harvest batch quality, packaging methods, or agree to a partial refund..."
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
          Supporting Photo / Document URL (Optional)
        </label>
        <input
          type="url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="https://storage.agromarket.ng/uploads/dispatch_proof.jpg"
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs text-neutral-900 focus:border-emerald-600 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 shadow-sm"
      >
        {isPending ? "Submitting Response..." : "Submit Formal Response"}
      </button>
    </form>
  );
}

interface AdminResolveFormProps {
  disputeId: string;
  disputedAmount: number;
}

export function AdminResolveForm({ disputeId, disputedAmount }: AdminResolveFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resolutionType, setResolutionType] = useState<string>("BUYER_REFUND");
  const [refundAmount, setRefundAmount] = useState<number>(disputedAmount);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await resolveDisputeAction({
        disputeId,
        resolutionType,
        resolutionNotes,
        refundAmount: Number(refundAmount),
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to resolve dispute.");
        return;
      }
      router.refresh();
    });
  };

  const handleReject = () => {
    if (!confirm("Are you sure you want to reject this dispute without issuing refunds or settlement adjustments?")) {
      return;
    }
    setErrorMsg(null);

    startTransition(async () => {
      const res = await rejectDisputeAction(
        disputeId,
        resolutionNotes || "Dispute claim was rejected by platform administrator."
      );

      if (!res.success) {
        setErrorMsg(res.error || "Failed to reject dispute.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleResolve} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Arbitration Decision
            </label>
            <select
              value={resolutionType}
              onChange={(e) => {
                setResolutionType(e.target.value);
                if (e.target.value === "BUYER_REFUND") {
                  setRefundAmount(disputedAmount);
                } else if (e.target.value === "SELLER_SETTLEMENT" || e.target.value === "NO_ACTION") {
                  setRefundAmount(0);
                }
              }}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none"
            >
              <option value="BUYER_REFUND">Full Buyer Refund (Deducted from Seller)</option>
              <option value="PARTIAL_REFUND">Partial Buyer Refund</option>
              <option value="SELLER_SETTLEMENT">Release Settlement to Seller</option>
              <option value="NO_ACTION">No Financial Adjustment</option>
              <option value="REPLACEMENT">Produce Replacement Arranged</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
              Refund Amount (NGN)
            </label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              min={0}
              max={disputedAmount}
              step={1}
              disabled={resolutionType === "SELLER_SETTLEMENT" || resolutionType === "NO_ACTION"}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none disabled:bg-neutral-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
            Administrative Resolution Rationale
          </label>
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            required
            rows={3}
            minLength={10}
            maxLength={2000}
            placeholder="Explain why this decision was reached based on weighbridge receipts, evidence provided, and AgroMarket standards..."
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={handleReject}
            disabled={isPending}
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition"
          >
            Reject Claim
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition shadow-sm"
          >
            {isPending ? "Executing Resolution..." : "Execute Arbitration Decision"}
          </button>
        </div>
      </form>
    </div>
  );
}
