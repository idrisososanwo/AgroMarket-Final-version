"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User } from "lucide-react";
import { AgroMarketLogo } from "@/components/brand";
import { Button } from "./button";

export interface NavItem {
  label: string;
  href: string;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Intelligence", href: "/my-intelligence" },
  { label: "Shared Purchases", href: "/shared-purchases" },
  { label: "Equipment", href: "/equipment" },
  { label: "Services", href: "/services" },
  { label: "Learn", href: "/learn" },
];

export interface GlobalHeaderProps {
  className?: string;
}

export function GlobalHeader({ className = "" }: GlobalHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-[#E5E0D5] bg-white/95 backdrop-blur-sm shadow-xs ${className}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo Lockup */}
        <div className="flex items-center">
          <AgroMarketLogo
            size="md"
            layout="horizontal"
            href="/"
            className="hover:opacity-90"
          />
        </div>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center space-x-1 lg:space-x-2"
          aria-label="Main Navigation"
        >
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-colors ${
                  isActive
                    ? "bg-[#F0FDF4] text-[#0F4327] font-bold"
                    : "text-[#1A231E]/80 hover:text-[#0F4327] hover:bg-[#FBF9F4]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Header Right Actions */}
        <div className="hidden sm:flex items-center space-x-3">
          <Link href="/account">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<User className="h-4 w-4 text-[#0F4327]" />}
            >
              Account
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="primary" size="sm">
              Trade Produce
            </Button>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-neutral-600 hover:text-[#0F4327] hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E5E0D5] bg-[#FBF9F4] px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-1">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                    isActive
                      ? "bg-white text-[#0F4327] shadow-xs"
                      : "text-[#1A231E] hover:bg-neutral-200/50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[#E5E0D5] flex flex-col gap-2">
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <Button
                variant="outline"
                size="md"
                className="w-full justify-center"
                leftIcon={<User className="h-4 w-4" />}
              >
                Account Profile
              </Button>
            </Link>
            <Link
              href="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <Button variant="primary" size="md" className="w-full justify-center">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
