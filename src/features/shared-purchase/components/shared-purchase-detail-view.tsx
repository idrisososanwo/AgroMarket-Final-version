"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  ShieldCheck,
  TrendingUp,
  Truck,
  Store,
} from "lucide-react";
import { formatNGN } from "@/features/marketplace/constants";
import { SharedPurchaseDetail, SharedPurchaseParticipantDetail } from "../types";
import { SharedPurchaseProgressBar } from "./shared-purchase-progress-bar";
import { JoinSharedPurchaseModal } from "./join-shared-purchase-modal";

interface SharedPurchaseDetailViewProps {
  pool: SharedPurchaseDetail;
  participants: SharedPurchaseParticipantDetail[];
  currentUser?: {
    id: string;
    fullName?: string;
    phone?: string;
  } | null;
}

export function SharedPurchaseDetailView({
  pool,
  participants,
  currentUser,
}: SharedPurchaseDetailViewProps) {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(pool.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Back Link */}
      <div>
        <Link
          href="/shared-purchases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shared Purchases
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Details & Participants */}
        <div className="space-y-6 lg:col-span-2">
          {/* Header Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                  pool.purchaseType === "ANIMAL_PORTION"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                }`}
              >
                {pool.purchaseType === "ANIMAL_PORTION"
                  ? "Livestock Portion Sharing"
                  : "Bulk Crop Wholesale Split"}
              </span>

              <span
                className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                  pool.status === "OPEN"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : pool.status === "TARGET_REACHED" || pool.status === "CONFIRMED"
                    ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Status: {pool.status.replace("_", " ")}
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {pool.title}
              </h1>
              {pool.description && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {pool.description}
                </p>
              )}
            </div>

            {/* Allocation Progress */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-foreground">
                <span>Group Commitment Progress</span>
                <span>{pool.progressPercent}% Target Reached</span>
              </div>
              <SharedPurchaseProgressBar
                allocatedQuantity={pool.allocatedQuantity}
                totalQuantity={pool.totalQuantity}
                unit={pool.unit}
                progressPercent={pool.progressPercent}
                status={pool.status}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Target: {pool.totalQuantity.toLocaleString()} {pool.unit}</span>
                <span>
                  Remaining:{" "}
                  <strong className="text-foreground">
                    {pool.remainingQuantity.toLocaleString()} {pool.unit}
                  </strong>
                </span>
              </div>
            </div>

            {/* Market Intelligence Reference Badge (Phase 0.9 Integration) */}
            <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs">
              <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">
                  Regional Market Intelligence Reference
                </p>
                <p className="text-muted-foreground text-[11px] leading-normal">
                  Aggregated market survey rate for {pool.unit} staples in {pool.hubState} is tracked by AgroMarket regional price feeds. Shared purchase wholesale rates provide direct-from-farm pricing without intermediary markups.
                </p>
              </div>
            </div>
          </div>

          {/* Fulfillment & Hub Information */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Pickup Hub & Logistics Coordination
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1">
                <span className="text-muted-foreground">Designated Pickup Hub:</span>
                <p className="font-semibold text-foreground">{pool.pickupHubLocation}</p>
                <p className="text-muted-foreground">{pool.hubState}, {pool.hubLga}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1">
                <span className="text-muted-foreground">Fulfillment Timing:</span>
                <p className="font-semibold text-foreground">
                  Dispatched once 100% committed & funded
                </p>
                <p className="text-muted-foreground">Closing Deadline: {new Date(pool.deadline).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Active Participants List */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Pool Participants ({participants.length})
              </h2>
              <span className="text-xs text-muted-foreground">
                Target: min {pool.targetParticipants} buyers
              </span>
            </div>

            {participants.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No buyers have pledged to this pool yet. Be the first to commit a share!
              </p>
            ) : (
              <div className="divide-y divide-border">
                {participants.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground text-[11px]">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {p.userName || `Buyer ${idx + 1}`}
                          {p.portionChoice ? ` • ${p.portionChoice}` : ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Pledged on {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {p.sharesCount} {p.unit}
                      </p>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          p.status === "PAID" || p.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : p.status === "PLEDGED" || p.status === "PAYMENT_PENDING"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Pricing & Join CTA */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5 sticky top-20">
            <div>
              <span className="text-xs text-muted-foreground uppercase font-medium">Wholesale Share Rate</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-black text-foreground">
                  {formatNGN(pool.unitPrice)}
                </span>
                <span className="text-sm text-muted-foreground">/ {pool.unit}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Total Pool Value: {formatNGN(pool.totalPrice)}
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum Share:</span>
                <span className="font-semibold text-foreground">{pool.minShareQuantity} {pool.unit}</span>
              </div>
              {pool.maxShareQuantity && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum Share:</span>
                  <span className="font-semibold text-foreground">{pool.maxShareQuantity} {pool.unit}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available to Claim:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {pool.remainingQuantity} {pool.unit}
                </span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="text-muted-foreground">Closing in:</span>
                <span className="font-semibold text-foreground">
                  {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                </span>
              </div>
            </div>

            {/* Join Action CTA */}
            {pool.isJoinable ? (
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(true)}
                className="w-full rounded-xl bg-primary py-3.5 text-center text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition"
              >
                Commit Share in Pool
              </button>
            ) : (
              <div className="rounded-xl bg-muted p-3.5 text-center text-xs font-semibold text-muted-foreground">
                {pool.status === "TARGET_REACHED" || pool.status === "CONFIRMED"
                  ? "This pool is 100% funded and committed!"
                  : pool.isExpired
                  ? "This pool has closed."
                  : `Pool is currently ${pool.status.toLowerCase()}.`}
              </div>
            )}

            {/* Seller info card */}
            {pool.listing && (
              <div className="rounded-xl border border-border p-3.5 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Store className="h-4 w-4 text-primary" />
                  <span>Verified Producer / Seller</span>
                </div>
                <div className="text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground">{pool.listing.sellerName || "AgroMarket Farm Partner"}</p>
                  <p>{pool.listing.state}, Nigeria</p>
                </div>
              </div>
            )}

            {/* Anti-pork Halal Guarantee */}
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Zero-swine guaranteed: All AgroMarket bulk pools are vetted for strict compliance with our non-pork food policy.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Join Modal */}
      <JoinSharedPurchaseModal
        pool={pool}
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        currentUserPhone={currentUser?.phone}
      />
    </div>
  );
}
