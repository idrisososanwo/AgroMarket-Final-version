import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sprout, Building2, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AudienceSections() {
  return (
    <section className="py-16 md:py-24 bg-[#FBF9F4] border-b border-[#E5E0D5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Two-Column Audience Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Column 1: For Farmers & Producers */}
          <div className="p-8 rounded-3xl bg-white border border-[#E5E0D5] flex flex-col justify-between space-y-6 shadow-xs hover:border-[#16A34A] transition-colors">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-[#F0FDF4] text-[#0F4327] border border-[#BBF7D0]">
                  <Sprout className="h-6 w-6" />
                </span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#16A34A]">
                    Producers & Cooperatives
                  </span>
                  <h3 className="text-2xl font-black text-[#1A231E]">
                    For Farmers
                  </h3>
                </div>
              </div>

              <p className="text-sm text-neutral-600 leading-relaxed">
                Connect your harvest with verified commercial off-takers, monitor real-time market prices,
                and rent the machinery you need to increase your seasonal yield.
              </p>

              <ul className="space-y-2.5 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>List produce directly with photo evidence and quality specifications.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Track authoritative daily wholesale prices across Nigerian markets.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Rent nearby tractors and harvesters without costly asset ownership.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A] shrink-0 mt-0.5" />
                  <span>Receive verified payout settlements directly to your bank account via escrow.</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#F0ECE3] flex flex-wrap gap-3">
              <Link href="/farmer/listings">
                <Button variant="primary" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Farmer Portal
                </Button>
              </Link>
              <Link href="/market">
                <Button variant="outline" size="md">
                  Check Market Prices
                </Button>
              </Link>
            </div>
          </div>

          {/* Column 2: For Commercial Buyers & Agribusinesses */}
          <div className="p-8 rounded-3xl bg-white border border-[#E5E0D5] flex flex-col justify-between space-y-6 shadow-xs hover:border-[#16A34A] transition-colors">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-[#FBECE5] text-[#9A3412] border border-[#F6C6B0]">
                  <Building2 className="h-6 w-6" />
                </span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C26732]">
                    Commercial Off-Takers
                  </span>
                  <h3 className="text-2xl font-black text-[#1A231E]">
                    For Businesses & Processors
                  </h3>
                </div>
              </div>

              <p className="text-sm text-neutral-600 leading-relaxed">
                Source reliable agricultural volume at scale, pool procurement contracts,
                and eliminate supply disruption through algorithm-assisted demand matching.
              </p>

              <ul className="space-y-2.5 text-xs text-neutral-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#C26732] shrink-0 mt-0.5" />
                  <span>Broadcast B2B demand signals to regional aggregation centers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#C26732] shrink-0 mt-0.5" />
                  <span>Procure multi-supplier batches under consolidated contract terms.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#C26732] shrink-0 mt-0.5" />
                  <span>Coordinate monitored logistics haulage along interstate routes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#C26732] shrink-0 mt-0.5" />
                  <span>Access supply deficit analytics and forward harvest forecasts.</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#F0ECE3] flex flex-wrap gap-3">
              <Link href="/marketplace">
                <Button variant="primary" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Browse Produce
                </Button>
              </Link>
              <Link href="/procurement-intelligence">
                <Button variant="outline" size="md">
                  Procurement Hub
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Ecosystem Partners Callout */}
        <div className="p-8 rounded-3xl bg-white border border-[#E5E0D5] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-start gap-4 max-w-2xl">
            <span className="p-3 rounded-2xl bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shrink-0">
              <Handshake className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-[#1A231E]">
                An Asset-Light Agricultural Coordination Network
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                AgroMarket partners with independent haulage operators, storage owners, equipment leasing firms,
                extension agents, and research institutions to power a coordinated ecosystem without centralized asset lock-in.
              </p>
            </div>
          </div>

          <Link href="/ecosystem">
            <Button variant="outline" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Explore Ecosystem Directory
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
