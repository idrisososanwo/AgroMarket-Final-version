"use client";

import { useState } from "react";
import {
  EcosystemActor,
  ProductionUnit,
  ProductionOutput,
  AggregationPool,
  ProcessingFacility,
  ProcessingEvent,
  B2BDemand,
  ValueChainTemplate,
} from "../types";
import { EcosystemHeader } from "./ecosystem-header";
import { ValueChainVisualizer } from "./value-chain-visualizer";
import { ActorDirectory } from "./actor-directory";
import { ProductionView } from "./production-view";
import { AggregationView } from "./aggregation-view";
import { ProcessingView } from "./processing-view";
import { B2BDemandView } from "./b2b-demand-view";
import {
  Network,
  Users,
  Tractor,
  Layers,
  Factory,
  ShoppingBag,
} from "lucide-react";

interface EcosystemViewProps {
  actors: EcosystemActor[];
  productionUnits: ProductionUnit[];
  productionOutputs: ProductionOutput[];
  aggregationPools: AggregationPool[];
  processingFacilities: ProcessingFacility[];
  processingEvents: ProcessingEvent[];
  b2bDemands: B2BDemand[];
  templates: ValueChainTemplate[];
}

export function EcosystemView({
  actors,
  productionUnits,
  productionOutputs,
  aggregationPools,
  processingFacilities,
  processingEvents,
  b2bDemands,
  templates,
}: EcosystemViewProps) {
  const [activeSection, setActiveSection] = useState<
    "CHAINS" | "ACTORS" | "PRODUCTION" | "AGGREGATION" | "PROCESSING" | "DEMAND"
  >("CHAINS");

  return (
    <div className="space-y-8">
      {/* Ecosystem Hero Header */}
      <EcosystemHeader />

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-neutral-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection("CHAINS")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
            activeSection === "CHAINS"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
          }`}
        >
          <Network className="h-4 w-4" />
          Value Chains
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("ACTORS")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
            activeSection === "ACTORS"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
          }`}
        >
          <Users className="h-4 w-4" />
          Actors & Capabilities ({actors.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("PRODUCTION")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
            activeSection === "PRODUCTION"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
          }`}
        >
          <Tractor className="h-4 w-4" />
          Production ({productionOutputs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("AGGREGATION")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
            activeSection === "AGGREGATION"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          Aggregation Pools ({aggregationPools.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("PROCESSING")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
            activeSection === "PROCESSING"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
          }`}
        >
          <Factory className="h-4 w-4" />
          Processing ({processingFacilities.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("DEMAND")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
            activeSection === "DEMAND"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          B2B Demand ({b2bDemands.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeSection === "CHAINS" && (
        <div className="space-y-6">
          <ValueChainVisualizer initialTemplates={templates} />
        </div>
      )}

      {activeSection === "ACTORS" && (
        <ActorDirectory initialActors={actors} />
      )}

      {activeSection === "PRODUCTION" && (
        <ProductionView
          productionUnits={productionUnits}
          productionOutputs={productionOutputs}
        />
      )}

      {activeSection === "AGGREGATION" && (
        <AggregationView pools={aggregationPools} />
      )}

      {activeSection === "PROCESSING" && (
        <ProcessingView
          facilities={processingFacilities}
          events={processingEvents}
        />
      )}

      {activeSection === "DEMAND" && (
        <B2BDemandView demands={b2bDemands} />
      )}
    </div>
  );
}
