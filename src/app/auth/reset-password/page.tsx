"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/features/auth/actions";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, null);

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <span className="text-2xl font-bold tracking-tight text-primary-700">
            AgroMarket
          </span>
        </Link>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Set new password
        </h2>
        <p className="mt-2 text-center text-xs text-muted-foreground sm:text-sm">
          Please enter and confirm your new secure password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          {state?.success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Password updated!
              </h3>
              <p className="text-xs text-muted-foreground">
                {state.message}
              </p>
              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-xs font-medium text-white hover:bg-primary-700"
                >
                  Sign In with New Password
                </Link>
              </div>
            </div>
          ) : (
            <>
              {state?.message && (
                <div className="mb-4 flex items-center space-x-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{state.message}</span>
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-foreground"
                  >
                    New Password
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      placeholder="••••••••"
                      className="block w-full rounded-md border bg-background py-2 pl-10 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
                    />
                  </div>
                  {state?.errors?.password && (
                    <p className="mt-1 text-xs text-destructive">
                      {state.errors.password[0]}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-medium text-foreground"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      placeholder="••••••••"
                      className="block w-full rounded-md border bg-background py-2 pl-10 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
                    />
                  </div>
                  {state?.errors?.confirmPassword && (
                    <p className="mt-1 text-xs text-destructive">
                      {state.errors.confirmPassword[0]}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full justify-center rounded-md bg-primary-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:opacity-50 sm:text-sm"
                  >
                    {isPending ? "Updating password..." : "Update Password"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
