"use client";

import Link from "next/link";
import { Plus, ArrowRight, Layers } from "lucide-react";
import { formatNGN } from "@/features/marketplace/constants";
import { SharedPurchaseDetail } from "../types";
import { SharedPurchaseProgressBar } from "./shared-purchase-progress-bar";

interface FarmerSharedPurchaseListProps {
  pools: SharedPurchaseDetail[];
}

export function FarmerSharedPurchaseList({ pools }: FarmerSharedPurchaseListProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">My Shared Purchase Pools</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your wholesale crop-splitting and livestock portion offerings.
          </p>
        </div>

        <Link
          href="/farmer/shared-purchases/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create New Shared Pool
        </Link>
      </div>

      {pools.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Layers className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-bold text-foreground">No Shared Purchase Pools Yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Create a shared purchase to allow multiple consumers or restaurants to split your harvest or livestock.
          </p>
          <Link
            href="/farmer/shared-purchases/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Launch First Pool
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pools.map((pool) => (
            <div
              key={pool.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {pool.purchaseType === "ANIMAL_PORTION" ? "Livestock" : "Bulk Crop"}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
                    {pool.status.replace("_", " ")}
                  </span>
                </div>

                <h3 className="font-bold text-foreground text-sm line-clamp-1">{pool.title}</h3>

                <div className="rounded-lg bg-muted/40 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="font-bold text-foreground">{formatNGN(pool.unitPrice)} / {pool.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Committed:</span>
                    <span className="font-semibold text-foreground">{pool.allocatedQuantity} / {pool.totalQuantity} {pool.unit}</span>
                  </div>
                </div>

                <SharedPurchaseProgressBar
                  allocatedQuantity={pool.allocatedQuantity}
                  totalQuantity={pool.totalQuantity}
                  unit={pool.unit}
                  progressPercent={pool.progressPercent}
                  status={pool.status}
                />
              </div>

              <div className="border-t border-border pt-3">
                <Link
                  href={`/farmer/shared-purchases/${pool.id}`}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-center text-xs font-semibold text-foreground hover:bg-muted transition"
                >
                  Manage Pool & Participants
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
