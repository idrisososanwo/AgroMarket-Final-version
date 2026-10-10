import type { Metadata } from "next";
import {
  getEcosystemActors,
  getProductionUnits,
  getProductionOutputs,
  getAggregationPools,
  getProcessingFacilities,
  getProcessingEvents,
  getB2BDemands,
  getCanonicalValueChainTemplates,
} from "@/features/ecosystem/queries";
import { EcosystemView } from "@/features/ecosystem/components/ecosystem-view";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Agricultural Ecosystem & Value Chains",
  description:
    "Explore Nigeria's digital agricultural coordination layer connecting farmers, aggregators, processors, cold-chain logistics, and B2B offtake markets.",
  keywords: [
    "Agricultural Ecosystem",
    "Value Chain Coordination",
    "Nigeria Agriculture",
    "Farm Aggregation",
    "Agricultural Processing",
    "B2B Agricultural Demand",
    "Asset Light Agribusiness",
  ],
};

export const dynamic = "force-dynamic";

export default async function EcosystemPage() {
  const [
    actors,
    productionUnits,
    productionOutputs,
    aggregationPools,
    processingFacilities,
    processingEvents,
    b2bDemands,
  ] = await Promise.all([
    getEcosystemActors({ limit: 50 }),
    getProductionUnits({ limit: 50 }),
    getProductionOutputs({ limit: 50 }),
    getAggregationPools({ limit: 50 }),
    getProcessingFacilities({ limit: 50 }),
    getProcessingEvents({ limit: 50 }),
    getB2BDemands({ limit: 50 }),
  ]);

  const templates = getCanonicalValueChainTemplates();

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-16">
      {/* Top Breadcrumb Header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/marketplace"
              className="text-neutral-600 hover:text-emerald-700 transition"
            >
              Marketplace
            </Link>
            <span className="text-neutral-300">•</span>
            <Link
              href="/market"
              className="text-neutral-600 hover:text-emerald-700 transition"
            >
              Prices & Intelligence
            </Link>
            <span className="text-neutral-300">•</span>
            <Link
              href="/learn"
              className="text-neutral-600 hover:text-emerald-700 transition"
            >
              Knowledge Base
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <EcosystemView
          actors={actors}
          productionUnits={productionUnits}
          productionOutputs={productionOutputs}
          aggregationPools={aggregationPools}
          processingFacilities={processingFacilities}
          processingEvents={processingEvents}
          b2bDemands={b2bDemands}
          templates={templates}
        />
      </main>
    </div>
  );
}
