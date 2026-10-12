"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAction } from "@/features/auth/actions";
import {
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  Building2,
  Tractor,
  ShoppingBag,
  Wrench,
  Cog,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { AgroMarketLogo } from "@/components/brand";
import { NIGERIAN_STATES } from "@/features/marketplace/constants";
import { BackButton } from "@/components/ui/back-button";

type AccountRoleType = "BUYER" | "FARMER" | "SERVICE_PROVIDER";
type ProviderSubtype = "EQUIPMENT_OWNER" | "SERVICE_PROVIDER" | "BUSINESS";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);
  const [selectedRole, setSelectedRole] = useState<AccountRoleType | null>(null);
  const [providerSubtype, setProviderSubtype] = useState<ProviderSubtype>("EQUIPMENT_OWNER");

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center bg-[#FBF9F4] px-4 py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <div className="flex justify-center mb-3">
          <AgroMarketLogo size="lg" layout="horizontal" href="/" />
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[#1A231E]">
          Join AgroMarket Nigeria
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
          The verified agricultural exchange connecting food producers, buyers, and service providers nationwide.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="rounded-3xl border border-[#E5E0D5] bg-white p-6 shadow-sm sm:p-10">
          {/* STEP 1: Account Type Selection Cards */}
          {selectedRole === null ? (
            <div className="space-y-6">
              {/* Back to Sign In Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <BackButton fallbackHref="/auth/login" label="Back to Sign In" variant="ghost" />
                <Link
                  href="/"
                  className="text-xs font-semibold text-neutral-500 hover:text-emerald-700 transition"
                >
                  Marketplace Home &rarr;
                </Link>
              </div>

              <div className="text-center sm:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                  Step 1 of 2
                </span>
                <h2 className="mt-2 text-xl font-extrabold text-[#1A231E]">
                  Choose your account type
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  Select the option that best describes how you will primarily participate on AgroMarket.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* 1. Customer / Buyer Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("BUYER")}
                  className="group relative flex flex-col items-start justify-between rounded-2xl border-2 border-neutral-200 bg-[#FBF9F4] p-5 text-left transition hover:border-[#0F4327] hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-[#0F4327] mb-3 group-hover:scale-105 transition-transform">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-base text-[#1A231E] group-hover:text-[#0F4327]">
                      Customer / Buyer
                    </h3>
                    <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
                      Discover fresh agricultural produce, grains, and tubers at farm-gate prices with tracked delivery.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-[#0F4327]">
                    <span>Continue as Buyer</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 2. Farmer / Producer Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("FARMER")}
                  className="group relative flex flex-col items-start justify-between rounded-2xl border-2 border-neutral-200 bg-[#FBF9F4] p-5 text-left transition hover:border-[#0F4327] hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-900 mb-3 group-hover:scale-105 transition-transform">
                      <Tractor className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-base text-[#1A231E] group-hover:text-[#0F4327]">
                        Farmer / Producer
                      </h3>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
                      List seasonal harvests, manage farm inventory, and receive guaranteed escrow payouts from verified buyers.
                    </p>
                  </div>
                  <div className="mt-3">
                    <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                      🌾 Includes Buyer Access
                    </span>
                    <div className="mt-2 flex items-center gap-1 text-xs font-bold text-[#0F4327]">
                      <span>Continue as Farmer</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* 3. Service Provider Card */}
                <button
                  type="button"
                  onClick={() => setSelectedRole("SERVICE_PROVIDER")}
                  className="group relative flex flex-col items-start justify-between rounded-2xl border-2 border-neutral-200 bg-[#FBF9F4] p-5 text-left transition hover:border-[#0F4327] hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0F4327]"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-900 mb-3 group-hover:scale-105 transition-transform">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-base text-[#1A231E] group-hover:text-[#0F4327]">
                      Service Provider
                    </h3>
                    <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
                      Offer farm machinery rentals, veterinary or spraying services, or operate a commercial agribusiness off-take firm.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-[#0F4327]">
                    <span>Continue as Provider</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Multi-Role Friendly Guarantee Banner */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-900">
                    Grow produce and buy from other farmers?
                  </p>
                  <p className="text-emerald-800 leading-relaxed text-[11px] sm:text-xs">
                    You only need one AgroMarket account. Farmers and service providers automatically receive buyer capabilities to shop produce with zero friction and seamless mode switching.
                  </p>
                </div>
              </div>

              {/* Already Have An Account Link */}
              <div className="pt-2 text-center text-xs text-neutral-600">
                Already registered on AgroMarket?{" "}
                <Link
                  href="/auth/login"
                  className="font-bold text-[#0F4327] hover:underline"
                >
                  Sign in to your account &rarr;
                </Link>
              </div>
            </div>
          ) : (
            /* STEP 2: Dedicated, Tailored Registration Form */
            <div className="space-y-6">
              {/* Back to Selection + Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0F4327] hover:text-[#165a36] transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Change Account Type</span>
                </button>

                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold text-neutral-700">
                  {selectedRole === "BUYER" && "🛒 Buyer Registration"}
                  {selectedRole === "FARMER" && "🌾 Farmer Registration"}
                  {selectedRole === "SERVICE_PROVIDER" && "🔧 Provider Registration"}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#1A231E]">
                  {selectedRole === "BUYER" && "Create your Customer Account"}
                  {selectedRole === "FARMER" && "Register your Farm Business"}
                  {selectedRole === "SERVICE_PROVIDER" && "Register as a Service Provider"}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selectedRole === "BUYER" && "Start purchasing fresh farm harvests from verified producers across Nigeria."}
                  {selectedRole === "FARMER" && "Access wholesale buyers, list fresh produce, and receive secure escrow payments."}
                  {selectedRole === "SERVICE_PROVIDER" && "Connect with agricultural operations in need of your equipment and services."}
                </p>
              </div>

              {/* Error Message */}
              {state?.message && !state?.success && (
                <div className="flex items-start space-x-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{state.message}</span>
                </div>
              )}

              <form action={formAction} className="space-y-5">
                {/* Hidden input for chosen role */}
                <input type="hidden" name="roleType" value={selectedRole} />

                {/* Subtype selector for Service Providers */}
                {selectedRole === "SERVICE_PROVIDER" && (
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Select Provider Category *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setProviderSubtype("EQUIPMENT_OWNER")}
                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                          providerSubtype === "EQUIPMENT_OWNER"
                            ? "border-[#0F4327] bg-[#F0FDF4] ring-2 ring-[#0F4327]/20"
                            : "border-neutral-200 bg-white hover:bg-neutral-50"
                        }`}
                      >
                        <Cog className={`h-4 w-4 mb-1 ${providerSubtype === "EQUIPMENT_OWNER" ? "text-[#0F4327]" : "text-neutral-500"}`} />
                        <span className="text-xs font-bold text-neutral-900">Machinery Owner</span>
                        <span className="text-[10px] text-neutral-500">Tractors & harvesters</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProviderSubtype("SERVICE_PROVIDER")}
                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                          providerSubtype === "SERVICE_PROVIDER"
                            ? "border-[#0F4327] bg-[#F0FDF4] ring-2 ring-[#0F4327]/20"
                            : "border-neutral-200 bg-white hover:bg-neutral-50"
                        }`}
                      >
                        <Wrench className={`h-4 w-4 mb-1 ${providerSubtype === "SERVICE_PROVIDER" ? "text-[#0F4327]" : "text-neutral-500"}`} />
                        <span className="text-xs font-bold text-neutral-900">Agro Specialist</span>
                        <span className="text-[10px] text-neutral-500">Spraying, vet, labor</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setProviderSubtype("BUSINESS")}
                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition ${
                          providerSubtype === "BUSINESS"
                            ? "border-[#0F4327] bg-[#F0FDF4] ring-2 ring-[#0F4327]/20"
                            : "border-neutral-200 bg-white hover:bg-neutral-50"
                        }`}
                      >
                        <Building2 className={`h-4 w-4 mb-1 ${providerSubtype === "BUSINESS" ? "text-[#0F4327]" : "text-neutral-500"}`} />
                        <span className="text-xs font-bold text-neutral-900">Agribusiness</span>
                        <span className="text-[10px] text-neutral-500">Commercial off-taker</span>
                      </button>
                    </div>
                    <input type="hidden" name="providerSubtype" value={providerSubtype} />
                  </div>
                )}

                {/* Common Section: Name, Phone, Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label htmlFor="fullName" className="block text-xs font-bold text-neutral-700">
                      {selectedRole === "SERVICE_PROVIDER" ? "Contact Person / Full Name *" : "Full Name *"}
                    </label>
                    <div className="relative mt-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        placeholder="e.g. Alaba Johnson"
                        className="block w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#0F4327] focus:outline-none focus:ring-1 focus:ring-[#0F4327] sm:text-sm"
                      />
                    </div>
                    {state?.errors?.fullName && (
                      <p className="mt-1 text-xs text-rose-600">{state.errors.fullName[0]}</p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-neutral-700">
                      Email Address *
                    </label>
                    <div className="relative mt-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="name@example.com"
                        className="block w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#0F4327] focus:outline-none focus:ring-1 focus:ring-[#0F4327] sm:text-sm"
                      />
                    </div>
                    {state?.errors?.email && (
                      <p className="mt-1 text-xs text-rose-600">{state.errors.email[0]}</p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold text-neutral-700">
                      Phone Number *
                    </label>
                    <div className="relative mt-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        placeholder="08012345678"
                        className="block w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#0F4327] focus:outline-none focus:ring-1 focus:ring-[#0F4327] sm:text-sm"
                      />
                    </div>
                    {state?.errors?.phone && (
                      <p className="mt-1 text-xs text-rose-600">{state.errors.phone[0]}</p>
                    )}
                  </div>
                </div>

                {/* Role-Specific Fields */}
                {selectedRole === "FARMER" && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                      Farm Operation Details
                    </span>

                    <div>
                      <label htmlFor="farmName" className="block text-xs font-semibold text-neutral-700">
                        Farm or Cooperative Name
                      </label>
                      <input
                        id="farmName"
                        name="farmName"
                        type="text"
                        placeholder="e.g. Green Acres Integrated Farms"
                        className="mt-1 block w-full rounded-xl border border-neutral-300 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-[#0F4327] focus:outline-none sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="produceTypes" className="block text-xs font-semibold text-neutral-700">
                        Produce Grown or Sold (e.g. White Maize, Cassava, Broilers, Tomatoes)
                      </label>
                      <input
                        id="produceTypes"
                        name="produceTypes"
                        type="text"
                        placeholder="e.g. Grains, Tubers, Poultry"
                        className="mt-1 block w-full rounded-xl border border-neutral-300 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-[#0F4327] focus:outline-none sm:text-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedRole === "SERVICE_PROVIDER" && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block">
                      Business & Equipment Details
                    </span>

                    <div>
                      <label htmlFor="businessName" className="block text-xs font-semibold text-neutral-700">
                        Registered Business or Enterprise Name *
                      </label>
                      <input
                        id="businessName"
                        name="businessName"
                        type="text"
                        required
                        placeholder="e.g. Apex Agri-Services Ltd"
                        className="mt-1 block w-full rounded-xl border border-neutral-300 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-[#0F4327] focus:outline-none sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="servicesOffered" className="block text-xs font-semibold text-neutral-700">
                        Machinery or Services Offered
                      </label>
                      <input
                        id="servicesOffered"
                        name="servicesOffered"
                        type="text"
                        placeholder="e.g. John Deere 75HP Tractors, Boom Sprayers, Harvesters"
                        className="mt-1 block w-full rounded-xl border border-neutral-300 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-[#0F4327] focus:outline-none sm:text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Location Fields: State & LGA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="state" className="block text-xs font-bold text-neutral-700">
                      {selectedRole === "FARMER" ? "Farm State *" : "State *"}
                    </label>
                    <div className="relative mt-1">
                      <select
                        id="state"
                        name="state"
                        required
                        defaultValue=""
                        className="block w-full rounded-xl border border-neutral-300 bg-white py-2.5 px-3 text-xs text-neutral-900 focus:border-[#0F4327] focus:outline-none sm:text-sm"
                      >
                        <option value="" disabled>Select State</option>
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lga" className="block text-xs font-bold text-neutral-700">
                      Local Government Area (LGA) *
                    </label>
                    <div className="relative mt-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <input
                        id="lga"
                        name="lga"
                        type="text"
                        required
                        placeholder="e.g. Ikeja, Gboko, Zaria"
                        className="block w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#0F4327] focus:outline-none sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                  <div>
                    <label htmlFor="password" className="block text-xs font-bold text-neutral-700">
                      Password (min. 8 characters) *
                    </label>
                    <div className="relative mt-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        placeholder="••••••••"
                        className="block w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#0F4327] focus:outline-none sm:text-sm"
                      />
                    </div>
                    {state?.errors?.password && (
                      <p className="mt-1 text-xs text-rose-600">{state.errors.password[0]}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-bold text-neutral-700">
                      Confirm Password *
                    </label>
                    <div className="relative mt-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        placeholder="••••••••"
                        className="block w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#0F4327] focus:outline-none sm:text-sm"
                      />
                    </div>
                    {state?.errors?.confirmPassword && (
                      <p className="mt-1 text-xs text-rose-600">{state.errors.confirmPassword[0]}</p>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full items-center justify-center rounded-xl bg-[#0F4327] px-4 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#165a36] focus:outline-none focus:ring-2 focus:ring-[#0F4327] disabled:opacity-50"
                  >
                    {isPending ? "Creating your account..." : "Complete Registration & Proceed to Login"}
                  </button>
                </div>
              </form>

              <div className="border-t border-neutral-100 pt-3 text-center text-xs text-neutral-600">
                Already registered?{" "}
                <Link
                  href="/auth/login"
                  className="font-bold text-[#0F4327] hover:underline"
                >
                  Sign in here
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
