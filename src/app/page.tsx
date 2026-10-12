import * as React from "react";
import { GlobalHeader } from "@/components/ui/global-header";
import {
  HeroSection,
  CategoryDiscovery,
  MarketplaceShowcase,
  CapabilityStrip,
  ProblemSection,
  AgroNetworkDiagram,
  ValueChainSection,
  CapabilitiesSection,
  IntelligenceSection,
  FoodSecuritySection,
  NigeriaFirstSection,
  AudienceSections,
  FinalCtaSection,
  Footer,
} from "@/components/home";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F4] text-[#1A231E]">
      {/* 1. Global Navigation Header (Role-Aware) */}
      <GlobalHeader />

      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section: Fresh produce search & primary headline */}
        <HeroSection />

        {/* 3. Category Discovery: Agricultural sectors & produce categories */}
        <CategoryDiscovery />

        {/* 4. Marketplace Showcase: Live farm-gate listings & How buying works */}
        <MarketplaceShowcase />

        {/* 5. Capability / Trust Strip */}
        <CapabilityStrip />

        {/* 6. The Coordination Problem: Fragmented Agricultural Systems */}
        <ProblemSection />

        {/* 7. The Agro Network: Signature Ecosystem Map */}
        <AgroNetworkDiagram />

        {/* 8. Agricultural Value Chain Pipeline & Commodity Sectors */}
        <ValueChainSection />

        {/* 9. What People Can Do: Core Platform Capabilities */}
        <CapabilitiesSection />

        {/* 10. Agricultural Intelligence & Decision Support */}
        <IntelligenceSection />

        {/* 11. Food Security & Strategic Resilience */}
        <FoodSecuritySection />

        {/* 12. Nigeria-First Agricultural Realities */}
        <NigeriaFirstSection />

        {/* 13. Audience Segments: Farmers & Businesses */}
        <AudienceSections />

        {/* 14. Final Call-To-Action: "Move Agriculture Forward" */}
        <FinalCtaSection />
      </main>

      {/* 15. Professional Global Footer */}
      <Footer />
    </div>
  );
}
