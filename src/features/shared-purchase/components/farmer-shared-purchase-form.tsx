"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { formatNGN, NIGERIAN_STATES } from "@/features/marketplace/constants";
import { createSharedPurchaseAction } from "../actions";
import { SharedPurchaseType, AnimalPortionModel, AnimalPortionFraction } from "../types";

interface FarmerSharedPurchaseFormProps {
  listings: Array<{
    id: string;
    title: string;
    unit: string;
    pricePerUnit: number;
    quantityAvailable: number;
    state: string;
    lga: string;
    pickupAddress: string;
  }>;
}

export function FarmerSharedPurchaseForm({ listings }: FarmerSharedPurchaseFormProps) {
  const router = useRouter();

  const [selectedListingId, setSelectedListingId] = useState<string>(
    listings.length > 0 ? listings[0].id : ""
  );
  const [purchaseType, setPurchaseType] = useState<SharedPurchaseType>("BULK_CROP");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [totalQuantity, setTotalQuantity] = useState<number>(100);
  const [unit, setUnit] = useState<string>(listings.length > 0 ? listings[0].unit : "kg");
  const [unitPrice, setUnitPrice] = useState<number>(
    listings.length > 0 ? listings[0].pricePerUnit : 1000
  );
  const [targetParticipants, setTargetParticipants] = useState<number>(4);
  const [minShareQuantity, setMinShareQuantity] = useState<number>(10);
  const [maxShareQuantity, setMaxShareQuantity] = useState<number | "">("");
  const portionModel: AnimalPortionModel = "FRACTIONAL";

  // Pre-configured animal portions if ANIMAL_PORTION selected
  const fractions: AnimalPortionFraction[] = [
    { id: "quarter", name: "One Quarter (1/4)", fraction: 0.25, portionPrice: 0 },
    { id: "half", name: "One Half (1/2)", fraction: 0.5, portionPrice: 0 },
  ];

  const [deadline, setDeadline] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  const [hubState, setHubState] = useState<string>(
    listings.length > 0 ? listings[0].state : "Lagos"
  );
  const [hubLga, setHubLga] = useState<string>(
    listings.length > 0 ? listings[0].lga : ""
  );
  const [pickupHubLocation, setPickupHubLocation] = useState<string>(
    listings.length > 0 ? listings[0].pickupAddress : ""
  );

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleListingChange = (listingId: string) => {
    setSelectedListingId(listingId);
    const found = listings.find((l) => l.id === listingId);
    if (found) {
      setUnit(found.unit);
      setUnitPrice(found.pricePerUnit);
      setHubState(found.state);
      setHubLga(found.lga);
      setPickupHubLocation(found.pickupAddress);
      if (!title) {
        setTitle(`Shared Bulk: ${found.title}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      const payload = {
        listingId: selectedListingId,
        title,
        description: description || undefined,
        purchaseType,
        totalQuantity,
        unit,
        unitPrice,
        targetParticipants,
        minShareQuantity,
        maxShareQuantity: maxShareQuantity === "" ? undefined : Number(maxShareQuantity),
        portionModel: purchaseType === "ANIMAL_PORTION" ? portionModel : undefined,
        portionFractions:
          purchaseType === "ANIMAL_PORTION" && portionModel === "FRACTIONAL"
            ? fractions.map((f) => ({ ...f, portionPrice: f.fraction * unitPrice * totalQuantity }))
            : [],
        deadline: new Date(deadline).toISOString(),
        pickupHubLocation,
        hubState,
        hubLga,
      };

      const res = await createSharedPurchaseAction(payload);
      if (!res.success || !res.data) {
        setError(res.error || "Failed to create shared purchase pool.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setSubmitting(false);
        return;
      }

      router.push(`/farmer/shared-purchases/${res.data.id}`);
    } catch (err: unknown) {
      console.error("Form submit error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  const selectedListing = listings.find((l) => l.id === selectedListingId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <Link
          href="/farmer/shared-purchases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Pools
        </Link>
        <h1 className="mt-2 text-2xl font-black text-foreground">Launch New Shared Purchase Pool</h1>
        <p className="text-xs text-muted-foreground">
          Offer bulk farm produce or whole animal shares to multiple pooled consumers.
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h3 className="mt-2 text-sm font-bold text-foreground">No Active Listings Available</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            You need at least one ACTIVE produce listing with inventory stock to create a shared purchase pool.
          </p>
          <Link
            href="/farmer/listings/new"
            className="mt-4 inline-flex items-center rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
          >
            Create Produce Listing
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Select Base Listing */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Select Source Produce Listing</label>
            <select
              value={selectedListingId}
              onChange={(e) => handleListingChange(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} — {formatNGN(l.pricePerUnit)} / {l.unit} ({l.quantityAvailable} {l.unit} available)
                </option>
              ))}
            </select>
            {selectedListing && (
              <p className="text-[11px] text-muted-foreground">
                Current Available Stock: {selectedListing.quantityAvailable} {selectedListing.unit}. Stock will be reserved upon pool launch.
              </p>
            )}
          </div>

          {/* 2. Pool Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Purchase Model</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPurchaseType("BULK_CROP")}
                className={`rounded-xl border p-3 text-left transition ${
                  purchaseType === "BULK_CROP"
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="text-xs font-semibold">Bulk Crop Split</div>
                <div className="text-[11px] text-muted-foreground">
                  Bags of grains, tubers, baskets of vegetables sold by weight/unit.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPurchaseType("ANIMAL_PORTION")}
                className={`rounded-xl border p-3 text-left transition ${
                  purchaseType === "ANIMAL_PORTION"
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border hover:bg-muted"
                }`}
              >
                <div className="text-xs font-semibold">Livestock / Animal Portion</div>
                <div className="text-[11px] text-muted-foreground">
                  Whole cow, ram, or goat shared into defined fractions or cuts.
                </div>
              </button>
            </div>
          </div>

          {/* 3. Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-foreground">Pool Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 500kg White Maize Group Split (Direct from Farm)"
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              {fieldErrors.title && (
                <p className="text-[11px] text-destructive">{fieldErrors.title[0]}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details on grain moisture, harvest date, packaging, or animal breed/weight."
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Target Quantities & Rates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground">Target Quantity</label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(Number(e.target.value))}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
              {fieldErrors.totalQuantity && (
                <p className="text-[11px] text-destructive">{fieldErrors.totalQuantity[0]}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Price per Unit (₦)</label>
              <input
                type="number"
                step="any"
                min="1"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>
          </div>

          {/* Total Value Banner */}
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 text-xs">
            <span className="text-muted-foreground">Total Target Value:</span>
            <span className="text-base font-black text-foreground">
              {formatNGN(totalQuantity * unitPrice)}
            </span>
          </div>

          {/* 5. Participant Constraints */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground">Min Target Buyers</label>
              <input
                type="number"
                min="2"
                value={targetParticipants}
                onChange={(e) => setTargetParticipants(parseInt(e.target.value, 10))}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Min Share per Buyer</label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={minShareQuantity}
                onChange={(e) => setMinShareQuantity(Number(e.target.value))}
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground">Max Share per Buyer (Opt)</label>
              <input
                type="number"
                step="any"
                min={minShareQuantity}
                value={maxShareQuantity}
                onChange={(e) => setMaxShareQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="No limit"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
              />
            </div>
          </div>

          {/* 6. Closing Date */}
          <div>
            <label className="text-xs font-bold text-foreground">Pool Closing Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
            />
          </div>

          {/* 7. Hub & Logistics */}
          <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/10">
            <h3 className="text-xs font-bold text-foreground">Drop-off & Pickup Hub Coordination</h3>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Pickup Hub Address</label>
              <input
                type="text"
                value={pickupHubLocation}
                onChange={(e) => setPickupHubLocation(e.target.value)}
                placeholder="e.g. Mile 12 Agricultural Cooperative Depot, Lagos"
                required
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">State</label>
                <select
                  value={hubState}
                  onChange={(e) => setHubState(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
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
                  value={hubLga}
                  onChange={(e) => setHubLga(e.target.value)}
                  placeholder="LGA"
                  required
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Anti-Pork Trust Notice */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              AgroMarket strictly enforces Halal & non-pork produce standards. Any listings or descriptions containing swine/pork terms will be automatically rejected.
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition shadow"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Reserving Stock & Launching Pool...
              </>
            ) : (
              "Launch Shared Purchase Pool"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
