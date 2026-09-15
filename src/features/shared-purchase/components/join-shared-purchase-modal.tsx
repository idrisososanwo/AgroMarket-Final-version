"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ShieldCheck,
  CreditCard,
  Phone,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { formatNGN, NIGERIAN_STATES } from "@/features/marketplace/constants";
import { SharedPurchaseDetail } from "../types";
import {
  joinSharedPurchaseAction,
  initializeSharedPurchasePaymentAction,
} from "../actions";

interface JoinSharedPurchaseModalProps {
  pool: SharedPurchaseDetail;
  isOpen: boolean;
  onClose: () => void;
  currentUserPhone?: string;
  currentUserAddress?: string;
}

export function JoinSharedPurchaseModal({
  pool,
  isOpen,
  onClose,
  currentUserPhone,
  currentUserAddress,
}: JoinSharedPurchaseModalProps) {
  const router = useRouter();

  const [quantity, setQuantity] = useState<number>(pool.minShareQuantity || 1);
  const [portionChoice, setPortionChoice] = useState<string>(
    pool.portionFractions.length > 0 ? pool.portionFractions[0].name : ""
  );
  const [usePickupHub, setUsePickupHub] = useState<boolean>(true);
  const [deliveryAddress, setDeliveryAddress] = useState<string>(currentUserAddress || "");
  const [deliveryState, setDeliveryState] = useState<string>(pool.hubState);
  const [deliveryLga, setDeliveryLga] = useState<string>(pool.hubLga);
  const [contactPhone, setContactPhone] = useState<string>(currentUserPhone || "");
  const [deliveryNotes, setDeliveryNotes] = useState<string>("");
  const [portionNotes, setPortionNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successResult, setSuccessResult] = useState<{
    orderNumber: string;
    orderId: string;
    participantId: string;
    amount: number;
  } | null>(null);
  const [initializingPayment, setInitializingPayment] = useState<boolean>(false);

  if (!isOpen) return null;

  const authoritativeTotal = Number((quantity * pool.unitPrice).toFixed(2));

  const handlePortionSelect = (fraction: number, name: string) => {
    setPortionChoice(name);
    setQuantity(fraction);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const payload = {
        sharedPurchaseId: pool.id,
        requestedQuantity: quantity,
        portionChoice: pool.purchaseType === "ANIMAL_PORTION" ? portionChoice : undefined,
        deliveryAddress: usePickupHub ? pool.pickupHubLocation : deliveryAddress,
        deliveryState: usePickupHub ? pool.hubState : deliveryState,
        deliveryLga: usePickupHub ? pool.hubLga : deliveryLga,
        contactPhone,
        deliveryNotes: deliveryNotes || undefined,
        portionNotes: portionNotes || undefined,
      };

      const res = await joinSharedPurchaseAction(payload);
      if (!res.success || !res.data) {
        setError(res.error || "Failed to commit share. Please try again.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setSubmitting(false);
        return;
      }

      setSuccessResult({
        orderNumber: res.data.orderNumber,
        orderId: res.data.orderId,
        participantId: res.data.participantId,
        amount: res.data.shareAmount,
      });
      setSubmitting(false);
    } catch (err: unknown) {
      console.error("Join modal error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!successResult) return;
    setInitializingPayment(true);
    setError(null);

    try {
      const res = await initializeSharedPurchasePaymentAction(successResult.participantId, "PAYSTACK");
      if (!res.success || !res.data) {
        setError(res.error || "Failed to initialize payment gateway.");
        setInitializingPayment(false);
        return;
      }

      // Redirect to provider checkout
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        router.push(`/account/orders/${successResult.orderId}`);
      }
    } catch (err: unknown) {
      console.error("Payment init error:", err);
      setError(err instanceof Error ? err.message : "Failed to open payment gateway.");
      setInitializingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting || initializingPayment}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {successResult ? (
          /* Step 2: Commitment Confirmed, Ready to Pay */
          <div className="space-y-5 text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">Share Pledged Successfully!</h2>
              <p className="text-xs text-muted-foreground">
                Your commitment has been recorded under order <span className="font-semibold text-foreground">{successResult.orderNumber}</span>.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4 text-left space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Committed Quantity:</span>
                <span className="font-semibold text-foreground">{quantity} {pool.unit}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Contribution Amount:</span>
                <span className="font-bold text-foreground text-sm">{formatNGN(successResult.amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pickup/Hub:</span>
                <span className="font-medium text-foreground">{pool.hubState} ({pool.hubLga})</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={initializingPayment}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow"
              >
                {initializingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Initializing Payment Gateway...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay {formatNGN(successResult.amount)} with Paystack / Card
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/account/shared-purchases");
                }}
                className="rounded-xl py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition"
              >
                Pay later from Account Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* Step 1: Join Form */
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                {pool.purchaseType === "ANIMAL_PORTION" ? "Livestock Portion" : "Bulk Crop Split"}
              </span>
              <h2 className="mt-1 text-lg font-bold text-foreground">{pool.title}</h2>
              <p className="text-xs text-muted-foreground">
                Wholesale rate: {formatNGN(pool.unitPrice)} / {pool.unit} • {pool.remainingQuantity} {pool.unit} available
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quantity / Portion Selection */}
            {pool.purchaseType === "ANIMAL_PORTION" && pool.portionFractions.length > 0 ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Select Animal Portion
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {pool.portionFractions.map((fraction) => (
                    <button
                      key={fraction.id}
                      type="button"
                      onClick={() => handlePortionSelect(fraction.fraction, fraction.name)}
                      className={`rounded-lg border p-2.5 text-left text-xs transition ${
                        portionChoice === fraction.name
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="font-medium">{fraction.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {fraction.fraction * 100}% of animal
                      </div>
                      <div className="mt-1 font-bold text-foreground">
                        {formatNGN(fraction.fraction * pool.unitPrice)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label htmlFor="quantityInput" className="font-semibold text-foreground">
                    Quantity to Commit ({pool.unit})
                  </label>
                  <span className="text-muted-foreground">
                    Min: {pool.minShareQuantity} {pool.maxShareQuantity ? `• Max: ${pool.maxShareQuantity}` : ""}
                  </span>
                </div>
                <input
                  id="quantityInput"
                  type="number"
                  step="any"
                  min={pool.minShareQuantity}
                  max={Math.min(pool.remainingQuantity, pool.maxShareQuantity || pool.remainingQuantity)}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {fieldErrors.requestedQuantity && (
                  <p className="text-[11px] text-destructive">{fieldErrors.requestedQuantity[0]}</p>
                )}
              </div>
            )}

            {/* Calculated Amount Bar */}
            <div className="flex items-center justify-between rounded-xl bg-primary/5 p-3.5 border border-primary/20">
              <span className="text-xs text-muted-foreground font-medium">Your Contribution:</span>
              <span className="text-lg font-black text-foreground">
                {formatNGN(authoritativeTotal)}
              </span>
            </div>

            {/* Hub Pickup vs Custom Delivery */}
            <div className="space-y-3 rounded-xl border border-border p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Fulfillment Mode</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUsePickupHub(true)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      usePickupHub ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    Pickup Hub
                  </button>
                  <button
                    type="button"
                    onClick={() => setUsePickupHub(false)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      !usePickupHub ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    Direct Delivery
                  </button>
                </div>
              </div>

              {usePickupHub ? (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">
                    Pickup Location: {pool.pickupHubLocation}
                  </p>
                  <p>{pool.hubState}, {pool.hubLga}</p>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Delivery Address</label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                      required={!usePickupHub}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">State</label>
                      <select
                        value={deliveryState}
                        onChange={(e) => setDeliveryState(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                      >
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground">LGA</label>
                      <input
                        type="text"
                        value={deliveryLga}
                        onChange={(e) => setDeliveryLga(e.target.value)}
                        placeholder="LGA"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Phone */}
              <div className="pt-1">
                <label className="text-[11px] font-medium text-muted-foreground">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="08012345678"
                    required
                    className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                {fieldErrors.contactPhone && (
                  <p className="text-[11px] text-destructive">{fieldErrors.contactPhone[0]}</p>
                )}
              </div>

              {/* Delivery / Handling Notes */}
              <div className="pt-1">
                <label className="text-[11px] font-medium text-muted-foreground">Delivery / Special Instructions (Optional)</label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Call upon arrival, leave with security"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {pool.purchaseType === "ANIMAL_PORTION" && (
                <div className="pt-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Meat Cut / Packaging Preferences (Optional)</label>
                  <input
                    type="text"
                    value={portionNotes}
                    onChange={(e) => setPortionNotes(e.target.value)}
                    placeholder="e.g. Bone-in cuts, double-bagged"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Anti-pork / Trust Notice */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                AgroMarket Escrow Protection: Funds held securely until the pool reaches 100% target and produce is confirmed. Strictly Halal/swine-free produce.
              </span>
            </div>

            {/* Submit Action */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="w-1/3 rounded-xl border border-border py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || quantity <= 0}
                className="flex w-2/3 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Locking Share...
                  </>
                ) : (
                  `Commit Share • ${formatNGN(authoritativeTotal)}`
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
