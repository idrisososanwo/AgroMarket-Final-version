import * as React from "react";
import { GlobalHeader } from "@/components/ui/global-header";
import { getCurrentUser } from "@/lib/auth/server";
import { getMarketplaceListings } from "@/features/marketplace/queries";
import {
  HeroSection,
  CategoryDiscovery,
  MarketplaceShowcase,
  Footer,
} from "@/components/home";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AgroMarket | Fresh Farm Produce & Agricultural Marketplace Nigeria",
  description:
    "Buy fresh agricultural produce directly from verified Nigerian farmers at transparent farm-gate prices with escrow protection and nationwide delivery.",
};

export default async function HomePage() {
  const [user, { listings }] = await Promise.all([
    getCurrentUser(),
    getMarketplaceListings({
      limit: 8,
      sortBy: "newest",
    }),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F4] text-[#1A231E]">
      {/* 1. Global Navigation Header (Role-Aware & Workspace-Aware) */}
      <GlobalHeader user={user} />

      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section: Fresh produce search & shopping CTAs */}
        <HeroSection />

        {/* 3. Category Discovery: Agricultural sectors & produce categories */}
        <CategoryDiscovery />

        {/* 4. Marketplace Showcase: Live farm-gate listings & How buying works */}
        <MarketplaceShowcase listings={listings} />
      </main>

      {/* 5. Professional Consumer Marketplace Footer */}
      <Footer />
    </div>
  );
}
