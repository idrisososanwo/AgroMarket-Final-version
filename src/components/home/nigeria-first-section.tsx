import * as React from "react";
import { MapPin, Coins, Truck, Calendar, Smartphone, ShieldCheck } from "lucide-react";

const NIGERIAN_REALITIES = [
  {
    title: "States & Local Government Corridors",
    desc: "Directory and search structure organized by LGA aggregation centers rather than generic zip codes.",
    icon: MapPin,
  },
  {
    title: "Nigerian Naira (₦) Escrow Settlements",
    desc: "Direct integration with authorized payment rails (Paystack, Flutterwave) supporting automated sub-account splits.",
    icon: Coins,
  },
  {
    title: "Realistic Farm-to-City Logistics",
    desc: "Engineered around Nigerian transport corridors—such as Kano-to-Lagos and the Middle Belt grain belt.",
    icon: Truck,
  },
  {
    title: "Ecological Seasons & Rainfall Cycles",
    desc: "Production planning responsive to Sahel, Guinea Savannah, and Rainforest seasonal variations.",
    icon: Calendar,
  },
  {
    title: "Low-Bandwidth Mobile Optimization",
    desc: "Lightweight interfaces designed to load reliably on entry-level Android devices and 3G rural networks.",
    icon: Smartphone,
  },
  {
    title: "Dispute & Inspection Safeguards",
    desc: "Structured quality dispute resolution protocol accounting for physical produce spoilage and weight discrepancies.",
    icon: ShieldCheck,
  },
];

export function NigeriaFirstSection() {
  return (
    <section className="py-16 md:py-24 bg-white border-b border-[#E5E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F4327]">
            Context-Driven Architecture
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A231E]">
            Built for the Realities of Nigerian Agriculture
          </h2>
          <p className="text-base text-neutral-600 leading-relaxed">
            Software built for western agriculture assumes refrigerated motorways, massive monocultures, and formal credit bureaus.
            AgroMarket is engineered specifically for the ground realities of Nigerian farming and commerce.
          </p>
        </div>

        {/* Realities Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {NIGERIAN_REALITIES.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#FBF9F4] border border-[#E5E0D5] space-y-3 hover:border-[#16A34A] transition-colors"
              >
                <span className="p-2.5 rounded-xl bg-white text-[#0F4327] border border-[#E5E0D5] inline-block shadow-xs">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-bold text-[#1A231E]">
                  {item.title}
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
