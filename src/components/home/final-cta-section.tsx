import * as React from "react";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgroMarketLogo, AgroMarketSymbol } from "@/components/brand";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28 bg-[#0F4327] text-white">
      {/* Background Subtle Geometric Halo */}
      <div
        className="absolute inset-0 bg-[radial-gradient(#14532D_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#16A34A]/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#C26732]/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="flex justify-center">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 inline-block shadow-lg">
            <AgroMarketSymbol size={56} variant="white" />
          </div>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Move Agriculture Forward.
          </h2>
          <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
            Join the coordinated agricultural network connecting producers, markets,
            infrastructure, and decision intelligence across Nigeria.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/marketplace">
            <Button
              variant="secondary"
              size="lg"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Explore AgroMarket
            </Button>
          </Link>

          <Link href="/ecosystem">
            <Button
              variant="outline"
              size="lg"
              className="bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white"
              rightIcon={<Layers className="h-4 w-4" />}
            >
              Explore the Ecosystem
            </Button>
          </Link>
        </div>

        <div className="pt-6 flex justify-center">
          <AgroMarketLogo
            layout="horizontal"
            variant="white"
            size="sm"
            showTagline
            taglineText="NIGERIAN AGRICULTURAL NETWORK"
          />
        </div>
      </div>
    </section>
  );
}
