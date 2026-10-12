"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { MarketplaceListing } from "@/features/marketplace/types";
import { ListingCard } from "@/features/marketplace/components/listing-card";

interface MarketplaceShowcaseProps {
  listings: MarketplaceListing[];
}

export function MarketplaceShowcase({ listings }: MarketplaceShowcaseProps) {
  return (
    <section id="marketplace-produce" className="py-14 md:py-20 bg-white border-b border-[#E5E0D5]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                Fresh Harvests Catalog
              </span>
              <span className="text-xs text-neutral-500">Real Farm-Gate Listings</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1A231E] tracking-tight">
              Featured Agricultural Produce
            </h2>
            <p className="text-sm text-neutral-600 mt-1 max-w-xl">
              Fresh seasonal crops and livestock listed directly by verified Nigerian smallholders and commercial farms.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-xl bg-[#0F4327] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#165a36] transition"
          >
            Explore Full Marketplace <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>

        {/* Real Product Cards Grid */}
        {listings && listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {listings.slice(0, 8).map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          /* Thoughtful Empty State (StackFood style) */
          <div className="mb-16 rounded-3xl border-2 border-dashed border-neutral-200 bg-[#FBF9F4] p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-[#0F4327] mb-3">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-[#1A231E]">
              Fresh harvest listings updating shortly
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
              Local farmers upload new produce harvests daily. Explore our categories below or register as a grower to list your farm crops today.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/marketplace"
                className="inline-flex items-center rounded-xl bg-[#0F4327] px-4 py-2 text-xs font-bold text-white hover:bg-[#165a36] transition"
              >
                Browse All Marketplace &rarr;
              </Link>
              <Link
                href="/farmer/listings/new"
                className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
              >
                + List Produce as a Farmer
              </Link>
            </div>
          </div>
        )}

        {/* How It Works for Buyers: 4 Clear Steps */}
        <div className="rounded-3xl border border-[#E5E0D5] bg-[#FBF9F4] p-8 md:p-12">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4327]">
              Simple & Transparent
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-[#1A231E] tracking-tight mt-1">
              How Buying Works on AgroMarket
            </h3>
            <p className="text-sm text-neutral-600 mt-2">
              From discovering seasonal farm harvests to doorstep delivery with complete escrow protection.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#0F4327] font-black text-base mb-4">
                1
              </div>
              <h4 className="font-bold text-sm text-[#1A231E]">Discover Produce</h4>
              <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
                Browse grains, tubers, livestock, and vegetables listed directly by verified Nigerian farmers.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#0F4327] font-black text-base mb-4">
                2
              </div>
              <h4 className="font-bold text-sm text-[#1A231E]">Farm-Gate Pricing</h4>
              <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
                Source with clear unit pricing and transparent minimum order quantities without exploitative middlemen.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#0F4327] font-black text-base mb-4">
                3
              </div>
              <h4 className="font-bold text-sm text-[#1A231E]">Escrow Protected</h4>
              <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
                Your payment is held safely in escrow and only released to the farmer after you inspect and accept your delivery.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#0F4327] font-black text-base mb-4">
                4
              </div>
              <h4 className="font-bold text-sm text-[#1A231E]">Tracked Dispatch</h4>
              <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
                Coordinated agricultural logistics corridors move produce securely from rural farm-gates to your location.
              </p>
            </div>
          </div>

          {/* Secondary Seller & Service Provider Callout Banner */}
          <div className="mt-10 rounded-2xl bg-[#0F4327] p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-md">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Are You a Producer or Machinery Owner?
              </span>
              <h4 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                Sell harvest directly or rent equipment
              </h4>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
                Join verified Nigerian farmers receiving guaranteed payments, escrow security, and nationwide commercial off-take contracts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/auth/register?role=FARMER"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-[#0F4327] shadow-sm hover:bg-neutral-100 transition"
              >
                Join as Farmer &rarr;
              </Link>
              <Link
                href="/auth/register?role=SERVICE_PROVIDER"
                className="inline-flex items-center justify-center rounded-xl border border-emerald-400 bg-emerald-800/80 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition"
              >
                Join as Provider
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
