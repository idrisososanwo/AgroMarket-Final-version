"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, ShoppingCart, LogIn, UserPlus, Tractor, ShoppingBag, PlusCircle, ArrowLeftRight } from "lucide-react";
import { AgroMarketLogo } from "@/components/brand";
import { Button } from "./button";
import { AuthUser } from "@/types/auth";
import { createClient } from "@/lib/supabase/client";

export interface NavItem {
  label: string;
  href: string;
}

const PRIMARY_BUYER_NAV_ITEMS: NavItem[] = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Ecosystem", href: "/ecosystem" },
  { label: "Intelligence", href: "/my-intelligence" },
  { label: "Shared Purchases", href: "/shared-purchases" },
  { label: "Equipment", href: "/equipment" },
  { label: "Services", href: "/services" },
  { label: "Learn", href: "/learn" },
];

const FARMER_NAV_ITEMS: NavItem[] = [
  { label: "Farm Overview", href: "/farmer" },
  { label: "Produce & Stock", href: "/farmer/listings" },
  { label: "Incoming Orders", href: "/farmer/orders" },
  { label: "Settlements", href: "/farmer/settlements" },
  { label: "Disputes", href: "/farmer/disputes" },
  { label: "Market Insights", href: "/farmer/market-intelligence" },
];

export interface GlobalHeaderProps {
  className?: string;
  user?: AuthUser | null;
}

export function GlobalHeader({ className = "", user }: GlobalHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null | undefined>(user);

  React.useEffect(() => {
    if (user !== undefined) {
      setCurrentUser(user);
      return;
    }

    // If user prop was not explicitly provided, safely check browser auth session
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          supabase
            .from("user_roles")
            .select("role_code")
            .eq("user_id", data.user.id)
            .then(({ data: rolesData }) => {
              const roles = (rolesData?.map((r) => r.role_code) || ["BUYER"]) as AuthUser["roles"];
              setCurrentUser({
                id: data.user.id,
                email: data.user.email ?? null,
                phone: null,
                fullName: (data.user.user_metadata?.full_name as string) ?? null,
                state: null,
                lga: null,
                roles,
                isEmailVerified: Boolean(data.user.email_confirmed_at),
                isPhoneVerified: false,
                isVerified: false,
                isOnboarded: true,
                createdAt: data.user.created_at,
              });
            });
        } else {
          setCurrentUser(null);
        }
      });
    } catch {
      setCurrentUser(null);
    }
  }, [user]);

  const roles = currentUser?.roles || [];
  const isFarmer = roles.includes("FARMER");
  const isEquipmentOwner = roles.includes("EQUIPMENT_OWNER");
  const isBusiness = roles.includes("BUSINESS");

  // Determine if active view is in farmer workspace
  const isInsideFarmerWorkspace = pathname?.startsWith("/farmer");

  // Determine active primary navigation
  const activeNavItems = isInsideFarmerWorkspace ? FARMER_NAV_ITEMS : PRIMARY_BUYER_NAV_ITEMS;

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-[#E5E0D5] bg-white/95 backdrop-blur-sm shadow-xs ${className}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo Lockup */}
        <div className="flex items-center gap-3">
          <AgroMarketLogo
            size="md"
            layout="horizontal"
            href={isInsideFarmerWorkspace ? "/farmer" : "/"}
            className="hover:opacity-90"
          />
          {isInsideFarmerWorkspace && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Farmer Console
            </span>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center space-x-1 lg:space-x-2"
          aria-label="Main Navigation"
        >
          {activeNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && item.href !== "/farmer" && pathname?.startsWith(item.href));

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
        <div className="hidden sm:flex items-center space-x-2.5">
          {currentUser ? (
            /* Logged-In User Actions (Role-Aware & Workspace-Aware) */
            <>
              {isInsideFarmerWorkspace ? (
                /* Inside Farmer Workspace: Show Add Produce + Switch to Shopping */
                <>
                  <Link href="/farmer/listings/new">
                    <Button variant="primary" size="sm" leftIcon={<PlusCircle className="h-3.5 w-3.5" />}>
                      Add Produce
                    </Button>
                  </Link>
                  <Link href="/marketplace">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<ShoppingBag className="h-3.5 w-3.5 text-neutral-600" />}
                    >
                      Shopping Mode
                    </Button>
                  </Link>
                  <Link href="/cart">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs px-2"
                      title="View Shopping Cart"
                    >
                      <ShoppingCart className="h-4 w-4 text-[#0F4327]" />
                    </Button>
                  </Link>
                  <Link href="/account">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<User className="h-3.5 w-3.5 text-[#0F4327]" />}
                    >
                      Account
                    </Button>
                  </Link>
                </>
              ) : (
                /* Customer Shopping / Public Mode */
                <>
                  {/* If user is also a farmer, show prominent link to Farmer Workspace */}
                  {isFarmer && (
                    <Link href="/farmer">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Tractor className="h-3.5 w-3.5 text-emerald-700" />}
                        className="border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                      >
                        Farmer Workspace
                      </Button>
                    </Link>
                  )}
                  {isEquipmentOwner && !isFarmer && (
                    <Link href="/equipment/owner">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Tractor className="h-3.5 w-3.5 text-[#0F4327]" />}
                      >
                        Owner Console
                      </Button>
                    </Link>
                  )}
                  {isBusiness && !isFarmer && (
                    <Link href="/business">
                      <Button variant="outline" size="sm">
                        Agribusiness
                      </Button>
                    </Link>
                  )}
                  <Link href="/cart">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<ShoppingCart className="h-3.5 w-3.5 text-[#0F4327]" />}
                    >
                      Cart
                    </Button>
                  </Link>
                  <Link href="/account?role=BUYER">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<User className="h-3.5 w-3.5" />}
                    >
                      My Orders & Account
                    </Button>
                  </Link>
                </>
              )}
            </>
          ) : (
            /* Logged-Out Visitor Actions (Clear SignIn / Register / Browse) */
            <>
              <Link href="/marketplace">
                <Button variant="ghost" size="sm" className="text-xs">
                  Browse Produce
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<LogIn className="h-3.5 w-3.5" />}
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                >
                  Register
                </Button>
              </Link>
            </>
          )}
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
            {activeNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && item.href !== "/farmer" && pathname?.startsWith(item.href));

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
            {currentUser ? (
              <>
                {isFarmer && (
                  <Link
                    href={isInsideFarmerWorkspace ? "/marketplace" : "/farmer"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button variant="outline" size="md" className="w-full justify-center">
                      <ArrowLeftRight className="mr-2 h-4 w-4" />
                      {isInsideFarmerWorkspace ? "Switch to Shopping Mode" : "Switch to Farmer Workspace"}
                    </Button>
                  </Link>
                )}
                {isInsideFarmerWorkspace && (
                  <Link
                    href="/farmer/listings/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button variant="primary" size="md" className="w-full justify-center">
                      + Add Produce
                    </Button>
                  </Link>
                )}
                <Link
                  href="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="outline" size="md" className="w-full justify-center">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Shopping Cart
                  </Button>
                </Link>
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
                    My Account ({currentUser.roles[0] || "User"})
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full justify-center"
                    leftIcon={<LogIn className="h-4 w-4" />}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="primary" size="md" className="w-full justify-center">
                    Register New Account
                  </Button>
                </Link>
                <Link
                  href="/marketplace"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="ghost" size="md" className="w-full justify-center">
                    Browse Produce
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
