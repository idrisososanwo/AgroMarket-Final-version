import * as React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FoodSecuritySection() {
  return (
    <section className="py-16 md:py-24 bg-[#FBF9F4] border-b border-[#E5E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C26732]">
            Resilience & Strategic Reserves
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A231E]">
            Building Resilience into the Agricultural System
          </h2>
          <p className="text-base text-neutral-600 leading-relaxed">
            AgroMarket is engineered not only for everyday trade, but to monitor how localized disruptions
            cascade across the food value chain—enabling proactive coordination before food availability is compromised.
          </p>
        </div>

        {/* Cascade Chains Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Chain 1: Physical Disruption Cascade */}
          <div className="p-6 md:p-8 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-[#F0ECE3] pb-4">
              <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#1A231E]">
                  Transit & Supply Disruption Cascade
                </h3>
                <p className="text-xs text-neutral-500">Route bottlenecks propagating to consumer markets</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#FBF9F4] border border-[#E5E0D5] flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-800">1. Localized Road Closure or Flood Event</span>
                <span className="text-neutral-400 font-mono">Trigger</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FBF9F4] border border-[#E5E0D5] flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700">2. Haulage Corridor Movement Delay (&gt;48 hrs)</span>
                <span className="text-neutral-400 font-mono">Transit</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FBF9F4] border border-[#E5E0D5] flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700">3. Urban Terminal Market Stock Depletion</span>
                <span className="text-neutral-400 font-mono">Supply</span>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-900 font-bold">
                <span>4. Sharp Regional Food Price Inflation Spike</span>
                <span className="font-mono">Impact</span>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-normal">
              AgroMarket logistics intelligence flags corridor disruptions early, allowing aggregators to re-route convoys and tap buffer reserves.
            </p>
          </div>

          {/* Chain 2: Biosecurity Cascade */}
          <div className="p-6 md:p-8 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-[#F0ECE3] pb-4">
              <span className="p-2 rounded-lg bg-rose-50 text-rose-700">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#1A231E]">
                  Crop Disease & Pest Outbreak Cascade
                </h3>
                <p className="text-xs text-neutral-500">Pathology spreading across production basins</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#FBF9F4] border border-[#E5E0D5] flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-800">1. Early Blight or Armyworm Field Signal</span>
                <span className="text-neutral-400 font-mono">Pathology</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FBF9F4] border border-[#E5E0D5] flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700">2. Basin-Level Yield Reduction Expectation</span>
                <span className="text-neutral-400 font-mono">Harvest</span>
              </div>
              <div className="p-3 rounded-lg bg-[#FBF9F4] border border-[#E5E0D5] flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700">3. Secondary Movement Restrictions & Quarantines</span>
                <span className="text-neutral-400 font-mono">Containment</span>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-900 font-bold">
                <span>4. Supply Deficit Across Downstream Food Processors</span>
                <span className="font-mono">Impact</span>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-normal">
              Disease intelligence alerts extension teams and agronomists to isolate clusters before disease vectors compromise broader production.
            </p>
          </div>
        </div>

        {/* CTA & Disclaimer */}
        <div className="p-6 rounded-2xl bg-white border border-[#E5E0D5] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-[#1A231E]">
              Track National Agricultural Resilience
            </h4>
            <p className="text-xs text-neutral-500 max-w-xl">
              Decision support infrastructure to assist agricultural planners, cooperatives, and off-takers in anticipating structural constraints.
            </p>
          </div>

          <Link href="/food-security">
            <Button variant="outline" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Explore Food Security Engine
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
