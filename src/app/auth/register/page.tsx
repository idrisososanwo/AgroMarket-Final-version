"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAction } from "@/features/auth/actions";
import { Lock, Mail, AlertCircle, CheckCircle2, ShoppingBag, Tractor, Building2 } from "lucide-react";
import { AgroMarketLogo } from "@/components/brand";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, null);
  const [selectedRole, setSelectedRole] = useState<"BUYER" | "FARMER" | "EQUIPMENT_OWNER">("BUYER");

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center bg-[#FBF9F4] px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="flex justify-center mb-3">
          <AgroMarketLogo size="lg" layout="horizontal" href="/" />
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[#1A231E]">
          Join AgroMarket Nigeria
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-neutral-600">
          The unified digital marketplace connecting farmers, commercial buyers, and agricultural logistics.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          {state?.success ? (
            <div className="space-y-4 text-center py-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">
                Verification Email Sent
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto leading-relaxed">
                {state.message}
              </p>
              <div className="pt-4">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-xl bg-[#0F4327] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#165a36] transition"
                >
                  Proceed to Sign In &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <>
              {state?.message && (
                <div className="mb-6 flex items-start space-x-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{state.message}</span>
                </div>
              )}

              <form action={formAction} className="space-y-5">
                {/* 1. Clear Role Intent Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    1. How do you plan to use AgroMarket?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Buyer Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedRole("BUYER")}
                      className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition ${
                        selectedRole === "BUYER"
                          ? "border-[#0F4327] bg-[#F0FDF4] ring-2 ring-[#0F4327]/20 shadow-xs"
                          : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50"
                      }`}
                    >
                      <ShoppingBag className={`h-5 w-5 mb-1.5 ${selectedRole === "BUYER" ? "text-[#0F4327]" : "text-neutral-500"}`} />
                      <span className="text-xs font-bold text-neutral-900 leading-snug">Buy Produce</span>
                      <span className="text-[10px] text-neutral-500 mt-0.5 leading-tight">Consumer, household or restaurant</span>
                    </button>

                    {/* Farmer Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedRole("FARMER")}
                      className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition ${
                        selectedRole === "FARMER"
                          ? "border-[#0F4327] bg-[#F0FDF4] ring-2 ring-[#0F4327]/20 shadow-xs"
                          : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50"
                      }`}
                    >
                      <Tractor className={`h-5 w-5 mb-1.5 ${selectedRole === "FARMER" ? "text-[#0F4327]" : "text-neutral-500"}`} />
                      <span className="text-xs font-bold text-neutral-900 leading-snug">Sell Harvest</span>
                      <span className="text-[10px] text-neutral-500 mt-0.5 leading-tight">Farmer, producer or livestock grower</span>
                    </button>

                    {/* Equipment / Business Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedRole("EQUIPMENT_OWNER")}
                      className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition ${
                        selectedRole === "EQUIPMENT_OWNER"
                          ? "border-[#0F4327] bg-[#F0FDF4] ring-2 ring-[#0F4327]/20 shadow-xs"
                          : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50"
                      }`}
                    >
                      <Building2 className={`h-5 w-5 mb-1.5 ${selectedRole === "EQUIPMENT_OWNER" ? "text-[#0F4327]" : "text-neutral-500"}`} />
                      <span className="text-xs font-bold text-neutral-900 leading-snug">Machinery & B2B</span>
                      <span className="text-[10px] text-neutral-500 mt-0.5 leading-tight">Equipment owner or agribusiness</span>
                    </button>
                  </div>

                  {/* Hidden input to submit selected role */}
                  <input type="hidden" name="intendedRole" value={selectedRole} />

                  {/* Clarification for Farmers Who Also Buy */}
                  {selectedRole === "FARMER" && (
                    <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-[11px] text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span>
                        <strong>Multi-role support:</strong> As a farmer, you automatically have access to buy produce from other growers with this same account. No separate login needed.
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Account Credentials */}
                <div className="space-y-4 pt-2 border-t border-neutral-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    2. Account Credentials
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Email Address
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
                        placeholder="you@example.com"
                        className="block w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#0F4327] focus:outline-none focus:ring-1 focus:ring-[#0F4327] sm:text-sm"
                      />
                    </div>
                    {state?.errors?.email && (
                      <p className="mt-1 text-xs text-rose-600">
                        {state.errors.email[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Password (min. 8 characters)
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
                        className="block w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#0F4327] focus:outline-none focus:ring-1 focus:ring-[#0F4327] sm:text-sm"
                      />
                    </div>
                    {state?.errors?.password && (
                      <p className="mt-1 text-xs text-rose-600">
                        {state.errors.password[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-medium text-neutral-700"
                    >
                      Confirm Password
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
                        className="block w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#0F4327] focus:outline-none focus:ring-1 focus:ring-[#0F4327] sm:text-sm"
                      />
                    </div>
                    {state?.errors?.confirmPassword && (
                      <p className="mt-1 text-xs text-rose-600">
                        {state.errors.confirmPassword[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full items-center justify-center rounded-xl bg-[#0F4327] px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#165a36] focus:outline-none focus:ring-2 focus:ring-[#0F4327] focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isPending ? "Creating your account..." : "Create Account & Get Started"}
                  </button>
                </div>
              </form>

              <div className="mt-6 border-t border-neutral-100 pt-4 text-center text-xs text-neutral-600">
                Already have an AgroMarket account?{" "}
                <Link
                  href="/auth/login"
                  className="font-bold text-[#0F4327] hover:underline"
                >
                  Sign in here
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
