import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface HighlightProduce {
  id: string;
  title: string;
  productName: string;
  categoryName: string;
  pricePerUnit: number;
  unit: string;
  minimumOrderQuantity: number;
  state: string;
  lga: string;
  inStock: boolean;
}

const SAMPLE_HIGHLIGHT_PRODUCE: HighlightProduce[] = [
  {
    id: "sample-yam",
    title: "Premium Grade-A Benue Yam Tubers",
    productName: "Yam Tubers",
    categoryName: "Roots & Tubers",
    pricePerUnit: 2500,
    unit: "TUBER",
    minimumOrderQuantity: 50,
    state: "Benue",
    lga: "Gboko",
    inStock: true,
  },
  {
    id: "sample-maize",
    title: "Dry White Grain Maize (Bulk Harvest)",
    productName: "White Maize",
    categoryName: "Grains & Cereals",
    pricePerUnit: 450,
    unit: "KG",
    minimumOrderQuantity: 100,
    state: "Kaduna",
    lga: "Zaria",
    inStock: true,
  },
  {
    id: "sample-tomatoes",
    title: "Farm-Fresh Round Plum Tomatoes (Jos Harvest)",
    productName: "Plum Tomatoes",
    categoryName: "Vegetables & Herbs",
    pricePerUnit: 850,
    unit: "KG",
    minimumOrderQuantity: 25,
    state: "Plateau",
    lga: "Jos South",
    inStock: true,
  },
  {
    id: "sample-soybean",
    title: "Processed Oil-Grade Soybeans",
    productName: "Soybeans",
    categoryName: "Legumes & Pulses",
    pricePerUnit: 620,
    unit: "KG",
    minimumOrderQuantity: 200,
    state: "Kano",
    lga: "Dawanau",
    inStock: true,
  },
];

export function MarketplaceShowcase() {
  return (
    <section className="py-14 md:py-20 bg-white border-b border-[#E5E0D5]/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Fresh Produce Marketplace
              </span>
              <span className="text-xs text-neutral-500">Live Farm Gate Listings</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1A231E] tracking-tight">
              Featured Agricultural Produce
            </h2>
            <p className="text-sm text-neutral-600 mt-1 max-w-xl">
              Fresh harvests and wholesale produce available directly from verified Nigerian smallholders and commercial farms.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-xl bg-[#0F4327] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#165a36] transition"
          >
            Explore Full Marketplace <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </div>

        {/* Product Cards Grid (StackFood-inspired Produce Display) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {SAMPLE_HIGHLIGHT_PRODUCE.map((prod) => (
            <div
              key={prod.id}
              className="group rounded-2xl border border-neutral-200 bg-[#FBF9F4] p-5 shadow-xs transition hover:border-[#0F4327] hover:shadow-md hover:bg-white flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {prod.categoryName}
                  </span>
                  <span className="text-neutral-500 font-medium">
                    {prod.state}, NG
                  </span>
                </div>

                <h3 className="font-bold text-base text-[#1A231E] group-hover:text-[#0F4327] transition line-clamp-2 leading-snug">
                  {prod.title}
                </h3>
                <div className="text-xs text-neutral-500 mt-1">
                  Canonical: {prod.productName}
                </div>

                {/* Price & MOQ Block */}
                <div className="mt-4 rounded-xl bg-white border border-neutral-100 p-3">
                  <div className="text-xs text-neutral-500">Price per Unit</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-neutral-900">
                      ₦{prod.pricePerUnit.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-neutral-600">
                      / {prod.unit}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Min Order: {prod.minimumOrderQuantity} {prod.unit}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200/70 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Ready to Dispatch
                </span>

                <Link
                  href="/marketplace"
                  className="inline-flex items-center text-xs font-bold text-[#0F4327] group-hover:underline"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>

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

          {/* Seller Callout Banner */}
          <div className="mt-10 rounded-2xl bg-[#0F4327] p-6 sm:p-8 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-md">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Are You a Producer or Supplier?
              </span>
              <h4 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                Sell your harvest directly to commercial off-takers
              </h4>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
                Join verified Nigerian farmers receiving guaranteed payments, escrow security, and nationwide market access.
              </p>
            </div>

            <Link
              href="/farmer/listings/new"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-xs sm:text-sm font-bold text-[#0F4327] shadow-sm hover:bg-neutral-100 transition shrink-0"
            >
              Start Selling Produce &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
