import * as React from "react";
import { GlobalHeader } from "@/components/ui/global-header";
import {
  HeroSection,
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
      {/* 1. Global Navigation Header */}
      <GlobalHeader />

      <main className="flex-1 flex flex-col">
        {/* 2. Hero Section: "Agricultural infrastructure / network" */}
        <HeroSection />

        {/* 3. Capability / Trust Strip */}
        <CapabilityStrip />

        {/* 4. The Coordination Problem: Fragmented Agricultural Systems */}
        <ProblemSection />

        {/* 5. The Agro Network: Signature Ecosystem Map */}
        <AgroNetworkDiagram />

        {/* 6. Agricultural Value Chain Pipeline & Commodity Sectors */}
        <ValueChainSection />

        {/* 7. What People Can Do: Core Platform Capabilities */}
        <CapabilitiesSection />

        {/* 8. Agricultural Intelligence & Decision Support */}
        <IntelligenceSection />

        {/* 9. Food Security & Strategic Resilience */}
        <FoodSecuritySection />

        {/* 10. Nigeria-First Agricultural Realities */}
        <NigeriaFirstSection />

        {/* 11. Audience Segments: Farmers & Businesses */}
        <AudienceSections />

        {/* 12. Final Call-To-Action: "Move Agriculture Forward" */}
        <FinalCtaSection />
      </main>

      {/* 13. Professional Global Footer */}
      <Footer />
    </div>
  );
}
