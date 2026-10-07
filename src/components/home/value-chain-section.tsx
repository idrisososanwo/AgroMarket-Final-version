import * as React from "react";
import {
  Wheat,
  Beef,
  Egg,
  Fish,
  Milk,
  PackageCheck,
  ArrowRight,
} from "lucide-react";

interface CommodityCategory {
  title: string;
  examples: string;
  icon: React.ElementType;
  tag: string;
}

const CATEGORIES: CommodityCategory[] = [
  {
    title: "Crops & Grains",
    examples: "Maize, Paddy Rice, Sorghum, Millet, Wheat",
    icon: Wheat,
    tag: "Essential Staples",
  },
  {
    title: "Roots & Tubers",
    examples: "White Yam, Cassava Tubers, Sweet Potatoes",
    icon: PackageCheck,
    tag: "Industrial & Food",
  },
  {
    title: "Livestock & Cattle",
    examples: "Bovine, Small Ruminants (Goats, Sheep)",
    icon: Beef,
    tag: "Protein Value Chain",
  },
  {
    title: "Poultry & Layers",
    examples: "Broilers, Day-Old Chicks, Fresh Eggs, Turkey",
    icon: Egg,
    tag: "Commercial Feeds & Birds",
  },
  {
    title: "Aquaculture & Fish",
    examples: "Catfish, Tilapia, Fingerlings, Smoked Fish",
    icon: Fish,
    tag: "Freshwater Production",
  },
  {
    title: "Dairy & Processed",
    examples: "Raw Milk, Cassava Flour (HQCF), Edible Oils",
    icon: Milk,
    tag: "Value Addition",
  },
];

const LIFECYCLE_STEPS = [
  { step: "01", name: "Farm Production", desc: "Smallholder & commercial crop yields recorded at planting." },
  { step: "02", name: "LGA Aggregation", desc: "Local consolidation hubs grade moisture and package bulk batches." },
  { step: "03", name: "Processing", desc: "Industrial mills and packaging plants convert raw harvest into finished goods." },
  { step: "04", name: "Interstate Transit", desc: "Verified hauliers transport goods along monitored corridor routes." },
  { step: "05", name: "Wholesale & Markets", desc: "Direct matching with supermarkets, corporate off-takers, and consumers." },
];

export function ValueChainSection() {
  return (
    <section className="py-16 md:py-24 bg-[#FBF9F4] border-b border-[#E5E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F4327]">
            End-To-End Coordination
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A231E]">
            Supporting the Entire Agricultural Journey
          </h2>
          <p className="text-base text-neutral-600 leading-relaxed">
            AgroMarket provides structured data tracking and transaction verification across every
            milestone of Nigeria&apos;s agricultural value chain.
          </p>
        </div>

        {/* 5-Stage Value Chain Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {LIFECYCLE_STEPS.map((step, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-[#E5E0D5] space-y-2 shadow-xs hover:border-[#16A34A] transition-colors relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded">
                  {step.step}
                </span>
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <ArrowRight className="hidden md:block h-3.5 w-3.5 text-neutral-300 absolute -right-2.5 top-7 z-10" />
                )}
              </div>
              <h4 className="text-sm font-bold text-[#1A231E]">{step.name}</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Supported Agricultural Domains */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E5E0D5] pb-4">
            <h3 className="text-xl font-bold text-[#1A231E]">
              Supported Commodity Sectors
            </h3>
            <span className="text-xs text-neutral-500">
              Broad agricultural taxonomy covering staple foods, livestock, and raw materials.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-white border border-[#E5E0D5] hover:shadow-md transition-shadow flex items-start space-x-4"
                >
                  <span className="p-3 rounded-lg bg-[#F0FDF4] text-[#0F4327] border border-[#BBF7D0] shrink-0">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#1A231E]">{cat.title}</h4>
                    </div>
                    <span className="inline-block text-[10px] font-semibold text-[#16A34A] uppercase tracking-wider">
                      {cat.tag}
                    </span>
                    <p className="text-xs text-neutral-500 leading-normal">{cat.examples}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
