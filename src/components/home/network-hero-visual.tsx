import * as React from "react";
import { AgroMarketSymbol } from "@/components/brand";
import { TrendingUp, ShieldCheck, Truck, Store } from "lucide-react";

export function NetworkHeroVisual() {
  return (
    <div className="relative w-full max-w-lg lg:max-w-xl mx-auto flex items-center justify-center select-none">
      {/* Outer Glow Halo */}
      <div
        className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-[#0F4327]/10 via-[#16A34A]/10 to-[#C26732]/10 blur-2xl -z-10"
        aria-hidden="true"
      />

      {/* Main Vector Network Graphic */}
      <div className="relative w-full aspect-square max-h-[480px] rounded-2xl bg-white/80 backdrop-blur-md border border-[#E5E0D5] p-6 shadow-xl flex flex-col justify-between overflow-hidden">
        {/* Subtle Background Circuit Mesh */}
        <svg
          className="absolute inset-0 w-full h-full opacity-35"
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Outer Mesh Lines */}
          <line x1="80" y1="320" x2="110" y2="200" stroke="#0F4327" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="110" y1="200" x2="200" y2="70" stroke="#0F4327" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="200" y1="70" x2="290" y2="200" stroke="#0F4327" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="290" y1="200" x2="320" y2="320" stroke="#0F4327" strokeWidth="2" strokeDasharray="4 4" />

          {/* Central Conduits */}
          <line x1="110" y1="200" x2="290" y2="200" stroke="#C26732" strokeWidth="2.5" />
          <line x1="200" y1="300" x2="200" y2="70" stroke="#16A34A" strokeWidth="2.5" />

          {/* Diagonal Feeds */}
          <line x1="80" y1="320" x2="200" y2="200" stroke="#0F4327" strokeWidth="1.5" strokeOpacity="0.6" />
          <line x1="320" y1="320" x2="200" y2="200" stroke="#0F4327" strokeWidth="1.5" strokeOpacity="0.6" />

          {/* Radial Node Guides */}
          <circle cx="200" cy="200" r="48" stroke="#E59500" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.6" />
          <circle cx="200" cy="200" r="96" stroke="#0F4327" strokeWidth="1" strokeDasharray="4 6" opacity="0.3" />
        </svg>

        {/* Top Node: Apex Intelligence & Infrastructure */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-full shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-xs font-semibold text-[#0F4327]">Agro Intelligence Active</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-white border border-[#E5E0D5] px-2.5 py-1 rounded-md text-[11px] font-mono text-neutral-600 shadow-xs">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span>Kano-Lagos Corridor: 98% Flow</span>
          </div>
        </div>

        {/* Central Core: The Agro Network Mark */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          <div className="relative p-5 rounded-2xl bg-gradient-to-b from-white to-[#FBF9F4] border-2 border-[#0F4327]/20 shadow-md">
            <AgroMarketSymbol size={80} />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#0F4327] text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase whitespace-nowrap shadow-xs">
              Ecosystem Hub
            </div>
          </div>
        </div>

        {/* Bottom Interactive Feed: Node Indicators */}
        <div className="relative z-10 grid grid-cols-2 gap-2 pt-2 border-t border-[#F0ECE3]">
          <div className="flex items-center gap-2 bg-white/90 p-2 rounded-lg border border-[#E5E0D5]">
            <span className="p-1.5 rounded-md bg-[#F0FDF4] text-[#0F4327]">
              <Store className="h-3.5 w-3.5" />
            </span>
            <div className="text-left">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Farm-Gate Supply</p>
              <p className="text-xs font-semibold text-[#1A231E]">Direct Cooperative Pooling</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/90 p-2 rounded-lg border border-[#E5E0D5]">
            <span className="p-1.5 rounded-md bg-[#FBECE5] text-[#9A3412]">
              <Truck className="h-3.5 w-3.5" />
            </span>
            <div className="text-left">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Interstate Logistics</p>
              <p className="text-xs font-semibold text-[#1A231E]">Corridor Monitored</p>
            </div>
          </div>
        </div>

        {/* Floating Verified Escrow Badge */}
        <div className="absolute top-1/2 right-3 -translate-y-1/2 z-20 hidden sm:flex items-center gap-1.5 bg-white border border-[#BBF7D0] px-3 py-1.5 rounded-lg shadow-md">
          <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
          <div className="text-left">
            <p className="text-[10px] font-bold text-[#0F4327]">Verified Settlements</p>
            <p className="text-[9px] text-neutral-500">Tiered Escrow Architecture</p>
          </div>
        </div>
      </div>
    </div>
  );
}
