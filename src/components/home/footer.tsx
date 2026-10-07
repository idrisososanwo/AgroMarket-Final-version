import * as React from "react";
import Link from "next/link";
import { AgroMarketLogo } from "@/components/brand";

const PLATFORM_LINKS = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Ecosystem Directory", href: "/ecosystem" },
  { label: "Intelligence Command", href: "/intelligence" },
  { label: "My Intelligence", href: "/my-intelligence" },
  { label: "Shared Purchases", href: "/shared-purchases" },
  { label: "Smart Basket", href: "/smart-basket" },
];

const SERVICES_LINKS = [
  { label: "Equipment Rental", href: "/equipment" },
  { label: "Agricultural Services", href: "/services" },
  { label: "Jobs & Labor", href: "/jobs" },
  { label: "Knowledge & News", href: "/learn" },
  { label: "Market Prices", href: "/market" },
];

const INTELLIGENCE_LINKS = [
  { label: "Market Intelligence", href: "/market-intelligence" },
  { label: "Demand Forecasting", href: "/demand-intelligence" },
  { label: "Procurement Hub", href: "/procurement-intelligence" },
  { label: "Logistics Intelligence", href: "/logistics-intelligence" },
  { label: "Food Security Engine", href: "/food-security" },
  { label: "Disease & Biosecurity", href: "/disease-intelligence" },
];

const PORTAL_LINKS = [
  { label: "Farmer Inventory Portal", href: "/farmer/listings" },
  { label: "Account Profile", href: "/account" },
  { label: "Design System Showcase", href: "/design-system" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E5E0D5] text-neutral-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 space-y-12">
        {/* Top Brand Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Info & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <AgroMarketLogo size="md" layout="horizontal" href="/" />
            <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
              AgroMarket is a Nigerian-first digital agricultural ecosystem connecting the people,
              products, infrastructure, and intelligence that move agriculture forward.
            </p>
            <div className="p-3 rounded-lg bg-[#FBF9F4] border border-[#E5E0D5] text-[11px] text-neutral-500 max-w-sm">
              <span className="font-semibold text-[#0F4327]">Asset-Light Infrastructure: </span>
              Coordinating farm-gate production, rural aggregation, interstate haulage, and wholesale demand.
            </div>
          </div>

          {/* Links 1: Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A231E]">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              {PLATFORM_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-[#0F4327] hover:underline transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links 2: Services */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A231E]">
              Services & Assets
            </h4>
            <ul className="space-y-2 text-xs">
              {SERVICES_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-[#0F4327] hover:underline transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links 3: Intelligence Domains */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A231E]">
              Intelligence
            </h4>
            <ul className="space-y-2 text-xs">
              {INTELLIGENCE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-[#0F4327] hover:underline transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links 4: Portals & Specs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A231E]">
              Portals & System
            </h4>
            <ul className="space-y-2 text-xs">
              {PORTAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-[#0F4327] hover:underline transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="pt-8 border-t border-[#F0ECE3] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {currentYear} AgroMarket. All rights reserved. Nigerian Agricultural Network.</p>
          <div className="flex items-center space-x-4">
            <Link href="/learn/security" className="hover:text-[#0F4327] transition-colors">
              Agricultural Security Notices
            </Link>
            <Link href="/design-system" className="hover:text-[#0F4327] transition-colors">
              Design System Spec
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
