import * as React from "react";
import {
  Sprout,
  Building2,
  Factory,
  Truck,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

interface CapabilityItem {
  label: string;
  sublabel: string;
  icon: React.ElementType;
}

const CAPABILITIES: CapabilityItem[] = [
  {
    label: "Production",
    sublabel: "Farm-gate crop profiling & cooperative listings",
    icon: Sprout,
  },
  {
    label: "Aggregation",
    sublabel: "State & LGA produce consolidation centers",
    icon: Building2,
  },
  {
    label: "Processing",
    sublabel: "Value addition, industrial milling & off-taking",
    icon: Factory,
  },
  {
    label: "Logistics",
    sublabel: "Interstate haulage corridors & transit tracking",
    icon: Truck,
  },
  {
    label: "Markets",
    sublabel: "Transparent trading & tiered escrow settlements",
    icon: ShieldCheck,
  },
  {
    label: "Intelligence",
    sublabel: "Multi-agent forecasting & biosecurity alerts",
    icon: TrendingUp,
  },
];

export function CapabilityStrip() {
  return (
    <section className="bg-white border-b border-[#E5E0D5] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-[#F0ECE3]">
          {CAPABILITIES.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className={`pt-4 md:pt-0 ${
                  index > 0 ? "md:pl-4" : ""
                } flex flex-col items-start space-y-1.5`}
              >
                <div className="p-2 rounded-lg bg-[#FBF9F4] text-[#0F4327] border border-[#E5E0D5]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h4 className="text-sm font-bold text-[#1A231E]">
                  {item.label}
                </h4>
                <p className="text-xs text-neutral-500 leading-normal">
                  {item.sublabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
