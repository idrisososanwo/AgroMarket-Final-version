import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { signOutAction } from "@/features/auth/actions";
import { EditProfileForm } from "@/features/auth/components/edit-profile-form";
import { createClient } from "@/lib/supabase/server";
import {
  User,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Sparkles,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "Account Overview | AgroMarket",
  description: "View and manage your AgroMarket account details, roles, and profile settings.",
};

export default async function AccountPage() {
  const user = await requireAuth();

  // If user hasn't completed onboarding, direct them to complete it
  if (!user.isOnboarded) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-6 shadow-sm gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {user.fullName || "User Profile"}
                </h1>
                {user.isVerified ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Unverified
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {user.email && (
                  <span className="flex items-center">
                    <Mail className="mr-1 h-3 w-3" /> {user.email}
                  </span>
                )}
                {user.phone && (
                  <span className="flex items-center">
                    <Phone className="mr-1 h-3 w-3" /> {user.phone}
                  </span>
                )}
                {user.state && (
                  <span className="flex items-center">
                    <MapPin className="mr-1 h-3 w-3" /> {user.lga}, {user.state}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Sign Out
            </button>
          </form>
        </div>

        {/* Marketplace Orders, Services & Equipment Rentals Quick Navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/account/orders"
            className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm hover:border-emerald-500 hover:bg-emerald-50/20 transition"
          >
            <div>
              <div className="text-sm font-bold text-foreground">My Produce Orders</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review your agricultural purchases and reserved stock.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />
          </Link>

          <Link
            href="/account/equipment-rentals"
            className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm hover:border-emerald-500 hover:bg-emerald-50/20 transition"
          >
            <div>
              <div className="text-sm font-bold text-foreground">My Equipment Rentals</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track machinery bookings and coordinate handovers.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />
          </Link>

          <Link
            href="/cart"
            className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm hover:border-emerald-500 hover:bg-emerald-50/20 transition"
          >
            <div>
              <div className="text-sm font-bold text-foreground">Active Shopping Cart</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                View items ready for checkout from farm sellers.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0 ml-2" />
          </Link>
        </div>

        {/* Assigned Roles Section */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary-600" />
            <h2 className="text-sm font-semibold text-foreground">
              Your Active Ecosystem Roles
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Roles are enforced server-side from PostgreSQL. Each role unlocks access to specific workspace areas.
          </p>

          <div className="flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center rounded-md bg-primary-50 border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-800"
              >
                {role}
              </span>
            ))}
          </div>

          {/* Quick Access to Authorized Role Areas */}
          <div className="mt-6 border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Accessible Role Workspaces
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {user.roles.includes("FARMER") && (
                <Link
                  href="/farmer"
                  className="flex items-center justify-between rounded-lg border p-3 text-xs font-medium text-foreground hover:border-primary-500 hover:bg-primary-50/20"
                >
                  <span>Farmer Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              )}
              {user.roles.includes("BUSINESS") && (
                <Link
                  href="/business"
                  className="flex items-center justify-between rounded-lg border p-3 text-xs font-medium text-foreground hover:border-primary-500 hover:bg-primary-50/20"
                >
                  <span>Agribusiness Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              )}
              {user.roles.includes("JOB_SEEKER") && (
                <Link
                  href="/jobs"
                  className="flex items-center justify-between rounded-lg border p-3 text-xs font-medium text-foreground hover:border-primary-500 hover:bg-primary-50/20"
                >
                  <span>Jobs & Placements</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              )}
              {user.roles.includes("SERVICE_PROVIDER") && (
                <Link
                  href="/services"
                  className="flex items-center justify-between rounded-lg border p-3 text-xs font-medium text-foreground hover:border-primary-500 hover:bg-primary-50/20"
                >
                  <span>Services Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              )}
              {user.roles.includes("EQUIPMENT_OWNER") && (
                <Link
                  href="/equipment/owner"
                  className="flex items-center justify-between rounded-lg border p-3 text-xs font-medium text-foreground hover:border-primary-500 hover:bg-primary-50/20"
                >
                  <span>Equipment Owner Console</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              )}
              {user.roles.includes("ADMIN") && (
                <Link
                  href="/admin"
                  className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/40 p-3 text-xs font-medium text-purple-900 hover:border-purple-400"
                >
                  <span>Admin Control Console</span>
                  <ArrowRight className="h-3.5 w-3.5 text-purple-700" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Profile Settings Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-1">
            Edit Profile Information
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            Keep your contact details up to date. (Roles and verification credentials cannot be edited here).
          </p>

          <EditProfileForm
            initialFullName={user.fullName || ""}
            initialPhone={user.phone || ""}
            initialState={user.state || ""}
            initialLga={user.lga || ""}
            initialLocationAddress={fullProfile?.location_address}
            initialBio={fullProfile?.bio}
          />
        </div>
      </div>
    </div>
  );
}
