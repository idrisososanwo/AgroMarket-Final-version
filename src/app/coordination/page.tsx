import React from "react";
import { Metadata } from "next";
import { getCoordinationOpportunities } from "@/features/agricultural-coordination";
import { CoordinationListView } from "@/features/agricultural-coordination/components";

export const metadata: Metadata = {
  title: "Multi-Party Agricultural Coordination | AgroMarket",
  description:
    "Asset-light agricultural coordination and supply commitments. Pool multi-producer harvests against verified demand specifications.",
};

export default async function CoordinationPage() {
  const opportunities = await getCoordinationOpportunities({ limit: 50 });

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <CoordinationListView opportunities={opportunities} />
      </div>
    </div>
  );
}
