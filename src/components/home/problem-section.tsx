import * as React from "react";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { AgroMarketSymbol } from "@/components/brand";

const FRAGMENTED_AREAS = [
  {
    title: "Isolated Farm-Gate Production",
    desc: "Smallholders harvest without reliable demand visibility or guaranteed off-takers.",
  },
  {
    title: "Opaque Market Pricing",
    desc: "Middleman markups and speculative price arbitrage distort farm-gate returns.",
  },
  {
    title: "Untracked Haulage Corridors",
    desc: "High post-harvest transit losses and uncoordinated interstate truck dispatch.",
  },
  {
    title: "Disconnected Industrial Processing",
    desc: "Mills and food factories run below capacity due to fragmented rural aggregation.",
  },
  {
    title: "Uncoordinated Disease Signals",
    desc: "Crop pests and biosecurity threats spread before regional containment is alerted.",
  },
  {
    title: "Reactive Food Security Reserves",
    desc: "Deficits are recognized only after regional price shocks hit consumer markets.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-16 md:py-24 bg-[#FBF9F4] border-b border-[#E5E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C26732]">
            The Structural Challenge
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A231E]">
            Agriculture is connected in the real world, but disconnected digitally.
          </h2>
          <p className="text-base text-neutral-600 leading-relaxed">
            From the seed in the ground to the bulk buyer in the city, food moves through a complex
            physical chain. Yet across Nigeria, each stage operates in digital isolation—causing price volatility,
            avoidable food waste, and supply uncertainty.
          </p>
        </div>

        {/* Transition Comparison: Fragmented vs AgroMarket Network */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left: Disconnected Systems */}
          <div className="rounded-2xl border border-rose-200/80 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-rose-100 pb-4">
              <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <XCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-rose-950">
                  Fragmented Traditional Value Chains
                </h3>
                <p className="text-xs text-rose-700/80">Information gaps between stakeholders</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FRAGMENTED_AREAS.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-rose-50/40 border border-rose-100 p-3.5 space-y-1"
                >
                  <p className="text-xs font-bold text-rose-900">{item.title}</p>
                  <p className="text-[11px] text-neutral-600 leading-normal">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 font-medium border border-neutral-200">
              Result: Post-harvest spoilage, margin depletion for farmers, and erratic supply for urban buyers.
            </div>
          </div>

          {/* Right: The AgroMarket Unified Network */}
          <div className="rounded-2xl border-2 border-[#16A34A]/30 bg-gradient-to-br from-white via-white to-emerald-50/30 p-6 sm:p-8 space-y-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
                <span className="p-2 rounded-lg bg-emerald-50 text-[#0F4327]">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#0F4327]">
                    The AgroMarket Coordinated Network
                  </h3>
                  <p className="text-xs text-emerald-800">Unified digital infrastructure</p>
                </div>
              </div>

              <p className="text-sm text-neutral-700 leading-relaxed">
                AgroMarket connects disparate producers, aggregation centers, logistics providers,
                and corporate off-takers through verified data conduits and specialized intelligence:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-[#BBF7D0]">
                  <AgroMarketSymbol size={24} className="mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-[#0F4327]">Synchronized Production & Procurement: </span>
                    <span className="text-neutral-600">
                      Cooperative pooling matches verified seller inventory with forward commercial demand contracts.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-[#BBF7D0]">
                  <AgroMarketSymbol size={24} className="mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-[#0F4327]">Monitored Movement & Logistics: </span>
                    <span className="text-neutral-600">
                      Telemetry tracking and corridor status reduce interstate bottlenecks and post-harvest deterioration.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-white border border-[#BBF7D0]">
                  <AgroMarketSymbol size={24} className="mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-[#0F4327]">Proactive Agricultural Intelligence: </span>
                    <span className="text-neutral-600">
                      Multi-agent cross-domain signals forecast price shifts, demand spikes, and biosecurity vulnerabilities.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-semibold text-[#0F4327]">
              <span>Coordinated Agricultural Infrastructure</span>
              <span className="inline-flex items-center gap-1">
                Explore The Agro Network <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
