"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDisputeAction } from "../actions";

interface OrderItem {
  id: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  quantity: number;
  unit: string;
  totalPrice: number;
}

interface CreateDisputeFormProps {
  orderId: string;
  orderNumber: string;
  items: OrderItem[];
  defaultSellerId?: string;
  defaultOrderItemId?: string;
}

export function CreateDisputeForm({
  orderId,
  orderNumber: _orderNumber,
  items,
  defaultSellerId,
  defaultOrderItemId,
}: CreateDisputeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Group unique sellers
  const sellersMap = new Map<string, string>();
  items.forEach((item) => sellersMap.set(item.sellerId, item.sellerName));
  const sellers = Array.from(sellersMap.entries()).map(([id, name]) => ({ id, name }));

  const [selectedSellerId, setSelectedSellerId] = useState<string>(
    defaultSellerId || sellers[0]?.id || ""
  );
  const [selectedItemId, setSelectedItemId] = useState<string>(
    defaultOrderItemId || ""
  );
  const [disputeType, setDisputeType] = useState<string>("DAMAGED_ITEM");
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");

  const sellerItems = items.filter((item) => item.sellerId === selectedSellerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedSellerId) {
      setErrorMsg("Please select the farmer or seller involved.");
      return;
    }

    startTransition(async () => {
      const payload: Record<string, unknown> = {
        orderId,
        sellerId: selectedSellerId,
        disputeType,
        reason,
        description,
      };

      if (selectedItemId) {
        payload.orderItemId = selectedItemId;
      }

      if (evidenceUrl.trim()) {
        payload.evidenceUrls = [evidenceUrl.trim()];
      }

      const res = await createDisputeAction(payload);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to submit dispute.");
        return;
      }

      router.push(`/account/disputes/${res.data?.id}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* Target Seller */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
          Farmer / Producer
        </label>
        <select
          value={selectedSellerId}
          onChange={(e) => {
            setSelectedSellerId(e.target.value);
            setSelectedItemId("");
          }}
          required
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none"
        >
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-neutral-500">
          Each dispute is isolated to the specific seller responsible for the consignment.
        </p>
      </div>

      {/* Specific Line Item (Optional) */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
          Affected Item (Optional)
        </label>
        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none"
        >
          <option value="">Entire seller consignment (all items)</option>
          {sellerItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.productName} ({item.quantity} {item.unit}) — ₦{item.totalPrice.toLocaleString()}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-neutral-500">
          Select a specific produce item, or leave blank to dispute the entire seller batch.
        </p>
      </div>

      {/* Dispute Reason / Type */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
          Dispute Category
        </label>
        <select
          value={disputeType}
          onChange={(e) => setDisputeType(e.target.value)}
          required
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none"
        >
          <option value="DAMAGED_ITEM">Produce Damaged / Spoiled in Transit</option>
          <option value="QUALITY_ISSUE">Grade / Quality Below Description</option>
          <option value="MISSING_QUANTITY">Quantity / Weight Shortage</option>
          <option value="WRONG_ITEM">Incorrect Produce Delivered</option>
          <option value="ITEM_NOT_RECEIVED">Item Never Received / Missing</option>
          <option value="DELIVERY_FAILURE">Carrier Delivery Failure</option>
          <option value="OTHER">Other Fulfillment Issue</option>
        </select>
      </div>

      {/* Short Summary / Headline */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
          Issue Summary
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="e.g. 5 bags of tomatoes arrived crushed and leaking"
          minLength={5}
          maxLength={150}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none placeholder:text-neutral-400"
        />
      </div>

      {/* Detailed Description */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
          Detailed Explanation
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          placeholder="Provide specific details about what went wrong upon delivery inspection, weighbridge measurements, or produce condition..."
          minLength={15}
          maxLength={2000}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none placeholder:text-neutral-400"
        />
      </div>

      {/* Evidence URL */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
          Evidence URL / Photo Proof (Optional)
        </label>
        <input
          type="url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="https://storage.agromarket.ng/uploads/..."
          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 focus:border-emerald-600 focus:outline-none placeholder:text-neutral-400"
        />
        <p className="mt-1 text-[11px] text-neutral-500">
          Paste a link to photos of damaged produce, delivery receipt, or weighbridge slip.
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition"
        >
          {isPending ? "Submitting Dispute..." : "Submit Dispute to Seller"}
        </button>
      </div>
    </form>
  );
}
