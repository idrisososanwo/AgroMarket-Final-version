import * as React from "react";
import Link from "next/link";
import {
  Store,
  Users,
  Wrench,
  Briefcase,
  GraduationCap,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface CapabilityCardData {
  title: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  route: string;
  badge: string;
  badgeColor: string;
}

const CAPABILITIES: CapabilityCardData[] = [
  {
    title: "Produce Marketplace",
    tagline: "Direct Farm-to-Buyer Trading",
    description: "Browse verified harvest listings by state, crop variety, and moisture grade. Secure transactions with escrow protection.",
    icon: Store,
    route: "/marketplace",
    badge: "Commerce",
    badgeColor: "bg-[#F0FDF4] text-[#0F4327] border-[#BBF7D0]",
  },
  {
    title: "Shared Purchases",
    tagline: "Pooled Bulk Buying",
    description: "Cooperate with other retail buyers or cooperatives to unlock wholesale bulk farm-gate pricing on grains and staples.",
    icon: Users,
    route: "/shared-purchases",
    badge: "Cost Savings",
    badgeColor: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]",
  },
  {
    title: "Equipment Rental",
    tagline: "Mechanization Access",
    description: "Rent tractors, combine harvesters, planters, and solar irrigation systems from verified equipment owners nearby.",
    icon: Wrench,
    route: "/equipment",
    badge: "Mechanization",
    badgeColor: "bg-[#FBECE5] text-[#9A3412] border-[#F6C6B0]",
  },
  {
    title: "Agricultural Services",
    tagline: "Expert Farm Support",
    description: "Hire agronomists, soil testing specialists, veterinary technicians, and post-harvest consultants by LGA.",
    icon: ShieldCheck,
    route: "/services",
    badge: "Services",
    badgeColor: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
  },
  {
    title: "Jobs & Labor",
    tagline: "Agricultural Talent",
    description: "Find tractor operators, farm supervisors, harvest crews, and agribusiness professionals across Nigerian states.",
    icon: Briefcase,
    route: "/jobs",
    badge: "Workforce",
    badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
  },
  {
    title: "Knowledge & Advisories",
    tagline: "Extension Intelligence",
    description: "Stay ahead with pest warnings, biosecurity protocols, seasonal planting calendars, and agricultural policy updates.",
    icon: GraduationCap,
    route: "/learn",
    badge: "Knowledge",
    badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
  },
  {
    title: "Ecosystem Directory",
    tagline: "Value Chain Coordination",
    description: "Discover regional aggregation centers, industrial processing plants, cold-storage facilities, and certified hauliers.",
    icon: Layers,
    route: "/ecosystem",
    badge: "Infrastructure",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
];

export function CapabilitiesSection() {
  return (
    <section className="py-16 md:py-24 bg-white border-b border-[#E5E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4327]">
              Platform Capabilities
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A231E]">
              What You Can Do on AgroMarket
            </h2>
            <p className="text-base text-neutral-600">
              A comprehensive digital suite connecting commercial trading, asset sharing, technical services, and agricultural intelligence.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="inline-flex items-center text-sm font-semibold text-[#0F4327] hover:underline"
          >
            Explore all capabilities <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.route}
                className="group p-6 rounded-2xl bg-[#FBF9F4] border border-[#E5E0D5] hover:border-[#16A34A] hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="p-3 rounded-xl bg-white text-[#0F4327] border border-[#E5E0D5] shadow-xs group-hover:bg-[#F0FDF4] group-hover:border-[#BBF7D0] transition-colors">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#1A231E] group-hover:text-[#0F4327] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs font-semibold text-[#16A34A] mt-0.5">
                      {item.tagline}
                    </p>
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#F0ECE3] flex items-center justify-between text-xs font-semibold text-[#0F4327]">
                  <span>Access Platform</span>
                  <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
