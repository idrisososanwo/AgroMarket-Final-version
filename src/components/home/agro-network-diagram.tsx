import * as React from "react";
import Link from "next/link";
import { AgroMarketLogo, AgroMarketSymbol } from "@/components/brand";
import {
  Users,
  Building,
  Store,
  Layers,
  Factory,
  Truck,
  TrendingUp,
  Cpu,
  ArrowRight,
} from "lucide-react";

interface NetworkNode {
  id: string;
  label: string;
  role: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  link: string;
  coords: { x: number; y: number }; // For SVG positioning 0-100%
}

const NETWORK_NODES: NetworkNode[] = [
  {
    id: "farmers",
    label: "Producers & Farmers",
    role: "Primary Harvests & Cooperative Supply",
    icon: Users,
    color: "text-[#0F4327]",
    bgColor: "bg-[#F0FDF4]",
    borderColor: "border-[#BBF7D0]",
    link: "/farmer/listings",
    coords: { x: 18, y: 78 },
  },
  {
    id: "aggregation",
    label: "Aggregation Centers",
    role: "LGA Quality Grading & Volume Consolidation",
    icon: Layers,
    color: "text-[#16A34A]",
    bgColor: "bg-[#DCFCE7]",
    borderColor: "border-[#86EFAC]",
    link: "/ecosystem",
    coords: { x: 50, y: 84 },
  },
  {
    id: "buyers",
    label: "Commercial Buyers",
    role: "Supermarkets, Off-Takers & Institutions",
    icon: Store,
    color: "text-[#0F4327]",
    bgColor: "bg-[#F0FDF4]",
    borderColor: "border-[#BBF7D0]",
    link: "/marketplace",
    coords: { x: 82, y: 78 },
  },
  {
    id: "processing",
    label: "Industrial Processing",
    role: "Milling, Packaging & Value Addition",
    icon: Factory,
    color: "text-[#9A3412]",
    bgColor: "bg-[#FBECE5]",
    borderColor: "border-[#F6C6B0]",
    link: "/ecosystem",
    coords: { x: 20, y: 45 },
  },
  {
    id: "logistics",
    label: "Logistics & Haulage",
    role: "Interstate Corridors & Cold-Chain Transit",
    icon: Truck,
    color: "text-[#9A3412]",
    bgColor: "bg-[#FBECE5]",
    borderColor: "border-[#F6C6B0]",
    link: "/logistics-intelligence",
    coords: { x: 80, y: 45 },
  },
  {
    id: "businesses",
    label: "Agribusinesses",
    role: "Contract Sourcing & Input Providers",
    icon: Building,
    color: "text-[#166534]",
    bgColor: "bg-[#DCFCE7]",
    borderColor: "border-[#BBF7D0]",
    link: "/ecosystem",
    coords: { x: 30, y: 18 },
  },
  {
    id: "intelligence",
    label: "Agricultural Intelligence",
    role: "Multi-Agent Forecasting & Decision Support",
    icon: Cpu,
    color: "text-[#92400E]",
    bgColor: "bg-[#FEF3C7]",
    borderColor: "border-[#FDE68A]",
    link: "/intelligence",
    coords: { x: 70, y: 18 },
  },
  {
    id: "markets",
    label: "Wholesale Markets",
    role: "Direct Trading & Real-Time Price Indexing",
    icon: TrendingUp,
    color: "text-[#0F4327]",
    bgColor: "bg-[#F0FDF4]",
    borderColor: "border-[#BBF7D0]",
    link: "/market",
    coords: { x: 50, y: 12 },
  },
];

export function AgroNetworkDiagram() {
  return (
    <section className="py-16 md:py-24 bg-white border-b border-[#E5E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1">
            <AgroMarketSymbol size={16} />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F4327]">
              The Agro Network
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1A231E]">
            A Unified Infrastructure Map for Nigerian Agriculture
          </h2>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            AgroMarket serves as the central coordination hub uniting each essential participant
            in the agricultural lifecycle through transparent data, verifiable transactions, and multi-agent intelligence.
          </p>
        </div>

        {/* Desktop / Tablet: Sophisticated Network Map */}
        <div className="hidden md:block relative w-full max-w-5xl mx-auto aspect-[16/10] bg-[#FBF9F4] rounded-3xl border border-[#E5E0D5] p-8 shadow-inner overflow-hidden">
          {/* Subtle Grid Backdrop */}
          <div
            className="absolute inset-0 bg-[radial-gradient(#E5E0D5_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none"
            aria-hidden="true"
          />

          {/* SVG Vector Pathways Linking to Central Hub */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            {/* Center coordinates: 50, 50 */}
            {NETWORK_NODES.map((node) => (
              <g key={node.id}>
                {/* Conduit line */}
                <line
                  x1="50"
                  y1="50"
                  x2={node.coords.x}
                  y2={node.coords.y}
                  stroke="#0F4327"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                  strokeOpacity="0.4"
                />
              </g>
            ))}

            {/* Inter-node perimeter value chain links */}
            <path
              d="M 18 78 L 50 84 L 82 78"
              stroke="#0F4327"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />
            <path
              d="M 20 45 L 80 45"
              stroke="#C26732"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
            <path
              d="M 30 18 L 50 12 L 70 18"
              stroke="#16A34A"
              strokeWidth="1.2"
              strokeOpacity="0.7"
            />
          </svg>

          {/* Central Hub: AgroMarket */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="p-5 rounded-2xl bg-white border-2 border-[#0F4327] shadow-xl text-center flex flex-col items-center max-w-[200px]">
              <AgroMarketSymbol size={44} />
              <h3 className="mt-2 text-sm font-extrabold text-[#0F4327] tracking-tight">
                AgroMarket
              </h3>
              <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                Coordination Hub
              </p>
            </div>
          </div>

          {/* Surrounding Nodes positioned on SVG coordinates */}
          {NETWORK_NODES.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-transform duration-200 hover:scale-105"
                style={{ left: `${node.coords.x}%`, top: `${node.coords.y}%` }}
              >
                <Link
                  href={node.link}
                  className={`flex items-center gap-2.5 p-3 rounded-xl bg-white border ${node.borderColor} shadow-sm hover:shadow-md transition-shadow group max-w-[210px] text-left`}
                >
                  <span className={`p-2 rounded-lg ${node.bgColor} ${node.color} shrink-0`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A231E] group-hover:text-[#0F4327] transition-colors leading-tight">
                      {node.label}
                    </h4>
                    <p className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                      {node.role}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Mobile: Vertical Structured Value Flow */}
        <div className="md:hidden space-y-3">
          <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-center space-y-1 mb-6">
            <AgroMarketLogo layout="horizontal" size="sm" className="justify-center" />
            <p className="text-xs text-neutral-600 font-medium">
              Central Agricultural Infrastructure & Coordination
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {NETWORK_NODES.map((node) => {
              const Icon = node.icon;
              return (
                <Link
                  key={node.id}
                  href={node.link}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-[#E5E0D5] shadow-xs active:bg-neutral-50"
                >
                  <span className={`p-2 rounded-lg ${node.bgColor} ${node.color} shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-[#1A231E]">{node.label}</h4>
                    <p className="text-[11px] text-neutral-500">{node.role}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-neutral-400" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
