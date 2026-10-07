import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgroMarketSymbol } from "@/components/brand";
import { NetworkHeroVisual } from "./network-hero-visual";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24 border-b border-[#E5E0D5]/70 bg-gradient-to-b from-white via-[#FBF9F4] to-[#FBF9F4]">
      {/* Decorative Subtle Background Grids */}
      <div
        className="absolute inset-0 bg-[radial-gradient(#E5E0D5_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Narrative & Primary CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] px-3.5 py-1 shadow-xs">
              <AgroMarketSymbol size={16} />
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4327]">
                Agricultural Infrastructure for Nigeria
              </span>
            </div>

            {/* Primary Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1A231E] leading-[1.08]">
              Connecting the systems that move{" "}
              <span className="text-[#0F4327] underline decoration-[#16A34A]/40 underline-offset-8">
                agriculture forward
              </span>
              .
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-neutral-600 max-w-2xl leading-relaxed">
              AgroMarket connects farmers, commercial buyers, processing facilities, logistics
              corridors, and multi-agent intelligence into one coordinated digital ecosystem.
              From rural farm-gates to national food markets.
            </p>

            {/* Main Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/marketplace">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Explore AgroMarket
                </Button>
              </Link>

              <Link href="/ecosystem">
                <Button
                  variant="outline"
                  size="lg"
                  rightIcon={<Layers className="h-4 w-4 text-[#0F4327]" />}
                >
                  Explore Ecosystem
                </Button>
              </Link>
            </div>

            {/* Audience-Oriented Quick Paths */}
            <div className="pt-4 border-t border-[#E5E0D5]/80 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-700">Explore by role:</span>
              <Link
                href="/farmer/listings"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E5E0D5] hover:border-[#16A34A] hover:text-[#0F4327] transition-colors"
              >
                I am a Farmer <ChevronRight className="h-3 w-3" />
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E5E0D5] hover:border-[#16A34A] hover:text-[#0F4327] transition-colors"
              >
                I am a Buyer <ChevronRight className="h-3 w-3" />
              </Link>
              <Link
                href="/ecosystem"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E5E0D5] hover:border-[#16A34A] hover:text-[#0F4327] transition-colors"
              >
                I am a Business <ChevronRight className="h-3 w-3" />
              </Link>
              <Link
                href="/my-intelligence"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] text-[#0F4327] hover:bg-[#DCFCE7] transition-colors font-medium"
              >
                Intelligence Hub <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Right Column: Hero Visual Graphic */}
          <div className="lg:col-span-5 flex justify-center">
            <NetworkHeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
