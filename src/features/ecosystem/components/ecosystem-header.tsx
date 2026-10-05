import { Network, Shield, Cpu, RefreshCw, CheckCircle } from "lucide-react";

export function EcosystemHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-neutral-900 p-8 text-white shadow-md">
      <div className="relative z-10 max-w-4xl space-y-4">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/30">
          <Network className="h-3.5 w-3.5" />
          <span>Phase 2.0 • Agricultural Ecosystem & Coordination Layer</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white">
          Coordinating Nigerian Agriculture From Soil & Seed to Final Offtake
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-emerald-100 max-w-2xl leading-relaxed">
          AgroMarket is a digital coordination layer connecting existing Nigerian farmers, aggregators,
          processors, cold-chain transporters, institutional buyers, and retail consumers into unified,
          traceable value chains.
        </p>

        {/* Value Chain Pipeline Flow Strip */}
        <div className="pt-2">
          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-emerald-100 border border-white/10">
            <span>Production</span>
            <span className="text-emerald-400">&rarr;</span>
            <span>Aggregation</span>
            <span className="text-emerald-400">&rarr;</span>
            <span>Processing</span>
            <span className="text-emerald-400">&rarr;</span>
            <span>Packaging</span>
            <span className="text-emerald-400">&rarr;</span>
            <span>Logistics</span>
            <span className="text-emerald-400">&rarr;</span>
            <span className="font-semibold text-white">Markets & Offtake</span>
          </div>
        </div>

        {/* Core Principles Highlights */}
        <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-4 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5 border border-white/10">
            <Cpu className="h-4 w-4 text-emerald-300 shrink-0" />
            <div>
              <p className="font-semibold text-white">Asset-Light</p>
              <p className="text-[11px] text-emerald-200/80">Zero owned farms or plants</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5 border border-white/10">
            <Shield className="h-4 w-4 text-emerald-300 shrink-0" />
            <div>
              <p className="font-semibold text-white">Strict Anti-Pork</p>
              <p className="text-[11px] text-emerald-200/80">Platform-wide ban</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5 border border-white/10">
            <RefreshCw className="h-4 w-4 text-emerald-300 shrink-0" />
            <div>
              <p className="font-semibold text-white">Multi-Capability</p>
              <p className="text-[11px] text-emerald-200/80">1 entity, multiple roles</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2.5 border border-white/10">
            <CheckCircle className="h-4 w-4 text-emerald-300 shrink-0" />
            <div>
              <p className="font-semibold text-white">NGN Primary</p>
              <p className="text-[11px] text-emerald-200/80">Direct fiat settlement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
