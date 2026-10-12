"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, ShieldCheck, Tractor, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgroMarketSymbol } from "@/components/brand";

export function HeroSection() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/marketplace?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push("/marketplace");
    }
  };

  const handleQuickChip = (term: string) => {
    router.push(`/marketplace?search=${encodeURIComponent(term)}`);
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-14 md:pt-14 md:pb-20 border-b border-[#E5E0D5]/70 bg-gradient-to-b from-white via-[#FBF9F4] to-[#FBF9F4]">
      {/* Decorative Subtle Background Grids */}
      <div
        className="absolute inset-0 bg-[radial-gradient(#E5E0D5_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Consumer Narrative, Search & Shopping Actions */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] px-3.5 py-1 shadow-xs">
              <AgroMarketSymbol size={16} />
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4327]">
                Nigeria&apos;s Verified Agricultural Marketplace
              </span>
            </div>

            {/* Consumer Shopping Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1A231E] leading-[1.08]">
              Fresh Farm Produce,{" "}
              <span className="text-[#0F4327] underline decoration-[#16A34A]/40 underline-offset-8">
                Straight from the Soil
              </span>
              .
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-neutral-600 max-w-2xl leading-relaxed">
              Discover grains, roots, vegetables, livestock, and fresh harvest directly from verified Nigerian farmers. Enjoy transparent farm-gate pricing, escrow protection, and tracked corridor delivery.
            </p>

            {/* Consumer Search Bar (StackFood-inspired Produce Search) */}
            <form onSubmit={handleSearch} className="max-w-xl">
              <div className="relative flex items-center rounded-2xl border-2 border-emerald-600/30 bg-white p-1.5 shadow-sm focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition">
                <Search className="ml-3 h-5 w-5 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search fresh produce (e.g. Yam, White Maize, Cassava, Soya)..."
                  className="w-full bg-transparent px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-[#0F4327] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#165a36] transition shrink-0"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Quick Search Tags (StackFood style) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 pt-1">
              <span className="font-semibold text-neutral-700">Popular:</span>
              <button
                type="button"
                onClick={() => handleQuickChip("White Maize")}
                className="px-2.5 py-1 rounded-full bg-white border border-[#E5E0D5] hover:border-[#16A34A] hover:text-[#0F4327] transition"
              >
                🌾 White Maize
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip("Yam")}
                className="px-2.5 py-1 rounded-full bg-white border border-[#E5E0D5] hover:border-[#16A34A] hover:text-[#0F4327] transition"
              >
                🥔 Benue Yam
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip("Tomatoes")}
                className="px-2.5 py-1 rounded-full bg-white border border-[#E5E0D5] hover:border-[#16A34A] hover:text-[#0F4327] transition"
              >
                🍅 Round Tomatoes
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip("Soybeans")}
                className="px-2.5 py-1 rounded-full bg-white border border-[#E5E0D5] hover:border-[#16A34A] hover:text-[#0F4327] transition"
              >
                🫘 Soybeans
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip("Catfish")}
                className="px-2.5 py-1 rounded-full bg-white border border-[#E5E0D5] hover:border-[#16A34A] hover:text-[#0F4327] transition"
              >
                🐟 Farm Catfish
              </button>
            </div>

            {/* Shopping Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/marketplace">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Shop Fresh Produce
                </Button>
              </Link>

              <Link href="/auth/register?role=FARMER">
                <Button
                  variant="outline"
                  size="lg"
                  leftIcon={<Tractor className="h-4 w-4 text-emerald-700" />}
                >
                  Sell as a Farmer
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column: Premium Agricultural Showcase Visual */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md rounded-3xl bg-white border border-[#E5E0D5] p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-neutral-800">Fresh Harvest Inflow</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  100% Escrow Protected
                </span>
              </div>

              {/* Produce Showcase Snippets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FBF9F4] border border-neutral-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-amber-50">🌾</span>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">Dry White Maize (Grade A)</h4>
                      <p className="text-[11px] text-neutral-500">Zaria Agricultural Cluster, Kaduna</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-neutral-900 block">₦450/kg</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Ready to ship</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FBF9F4] border border-neutral-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-orange-50">🥔</span>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">Benue Giant Yam Tubers</h4>
                      <p className="text-[11px] text-neutral-500">Gboko Farm Settlement, Benue</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-neutral-900 block">₦2,500/tuber</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Farm-gate rate</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FBF9F4] border border-neutral-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-emerald-50">🍅</span>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">Plum Round Tomatoes</h4>
                      <p className="text-[11px] text-neutral-500">Jos South Plateau Irrigation Cluster</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-neutral-900 block">₦850/kg</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Cold dispatch</span>
                  </div>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="pt-3 border-t border-neutral-100 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-neutral-600">
                <div className="flex flex-col items-center">
                  <ShieldCheck className="h-4 w-4 text-emerald-700 mb-0.5" />
                  <span>Escrow Safe</span>
                </div>
                <div className="flex flex-col items-center">
                  <Tractor className="h-4 w-4 text-emerald-700 mb-0.5" />
                  <span>Direct Farm Gate</span>
                </div>
                <div className="flex flex-col items-center">
                  <TrendingUp className="h-4 w-4 text-emerald-700 mb-0.5" />
                  <span>Live Fair Prices</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
