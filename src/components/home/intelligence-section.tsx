import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Sprout,
  Activity,
  Layers,
  ShoppingBag,
  Truck,
  ShieldAlert,
  Bug,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const INTELLIGENCE_CYCLES = [
  { step: "01", title: "Observe", desc: "Telemetry from border posts, market trades, farm reports & weather." },
  { step: "02", title: "Understand", desc: "Cross-domain correlation identifying supply deficits and yield shifts." },
  { step: "03", title: "Recommend", desc: "Evidence-grounded action strategies surfaced with confidence scores." },
  { step: "04", title: "Act", desc: "Human-reviewed execution via pooled procurement or dispatched logistics." },
  { step: "05", title: "Evaluate", desc: "Outcome verification tracking real margin gains and fulfillment rates." },
  { step: "06", title: "Improve", desc: "Continuous feedback loop refining forecasting weights deterministically." },
];

const INTELLIGENCE_DOMAINS = [
  { name: "Market Intelligence", icon: TrendingUp, desc: "State-level commodity price indexing, volatility indices & middleman spreads.", link: "/market-intelligence" },
  { name: "Production Planning", icon: Sprout, desc: "Planting calendars, seasonal harvest forecasts & crop rotation guidance.", link: "/production-intelligence" },
  { name: "Demand Forecasting", icon: Activity, desc: "Urban consumption spikes, religious festival surges & institutional contracts.", link: "/demand-intelligence" },
  { name: "Supply Matching", icon: Layers, desc: "Algorithm-assisted pairing of cooperative harvests with verified buyer specs.", link: "/supply-intelligence" },
  { name: "Procurement Intelligence", icon: ShoppingBag, desc: "Bulk sourcing optimization, price threshold alerts & supplier reliability scoring.", link: "/procurement-intelligence" },
  { name: "Logistics Intelligence", icon: Truck, desc: "Interstate haulage bottlenecks, fuel surcharge monitoring & route delays.", link: "/logistics-intelligence" },
  { name: "Food Security & Resilience", icon: ShieldAlert, desc: "Emergency grain reserve thresholds, vulnerability indices & supply shocks.", link: "/food-security" },
  { name: "Disease & Biosecurity", icon: Bug, desc: "Pest outbreak containment alerts, livestock quarantine zones & crop pathology.", link: "/disease-intelligence" },
];

export function IntelligenceSection() {
  return (
    <section className="py-16 md:py-24 bg-[#0F4327] text-white border-b border-[#14532D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#14532D] pb-8">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14532D] border border-emerald-500/30 text-xs font-bold uppercase tracking-wider text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Evidence-Grounded Decision Support
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Agricultural Intelligence for Complex Systems
            </h2>
            <p className="text-base text-slate-200 leading-relaxed max-w-2xl">
              AgroMarket does not simply move agricultural goods. It continuously interprets the
              underlying ecosystem—providing human-reviewed, multi-agent decision support to stabilize production and supply.
            </p>
          </div>

          <Link href="/intelligence">
            <Button
              variant="secondary"
              size="lg"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Intelligence Command Center
            </Button>
          </Link>
        </div>

        {/* 6-Stage Intelligence Feedback Progression */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-300">
            The Decision Cycle
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {INTELLIGENCE_CYCLES.map((cycle, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#14532D]/70 border border-emerald-600/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-emerald-400">
                    {cycle.step}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{cycle.title}</h4>
                <p className="text-[11px] text-slate-300 leading-normal">{cycle.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* The 8 Specialized Intelligence Domains */}
        <div className="space-y-6">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold text-white">
              8 Specialized Intelligence Domains
            </h3>
            <span className="text-xs text-emerald-300">
              Cross-domain correlation without autonomous risk
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INTELLIGENCE_DOMAINS.map((domain, idx) => {
              const Icon = domain.icon;
              return (
                <Link
                  key={idx}
                  href={domain.link}
                  className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-400/50 transition-all space-y-3 group text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-lg bg-white/10 text-emerald-300 group-hover:bg-emerald-400 group-hover:text-[#0F4327] transition-colors">
                      <Icon className="h-4 w-4" />
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {domain.name}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-normal">
                      {domain.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Regulatory & Safety Notice */}
        <div className="p-4 rounded-xl bg-[#14532D]/40 border border-emerald-500/20 text-xs text-slate-300 flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-white">Human-In-The-Loop Governance: </span>
            AgroMarket AI agents operate strictly as decision-support advisors. All high-impact procurement orders,
            financial settlements, and emergency responses require authorized human confirmation.
          </p>
        </div>
      </div>
    </section>
  );
}
