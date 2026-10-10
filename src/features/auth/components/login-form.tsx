"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/features/auth/actions";
import { Lock, Mail, AlertCircle } from "lucide-react";

interface LoginFormProps {
  urlError?: string;
}

export function LoginForm({ urlError }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInAction, null);

  const displayedError = (!state?.success && state?.message) || urlError;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
      {displayedError && (
        <div className="mb-4 flex items-center space-x-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{displayedError}</span>
        </div>
      )}

      <form action={formAction} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-foreground"
          >
            Email Address
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="farmer@example.com"
              className="block w-full rounded-md border bg-background py-2 pl-10 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 sm:text-sm"
            />
          </div>
          {state?.errors?.email && (
            <p className="mt-1 text-xs text-destructive">
              {state.errors.email[0]}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-foreground"
            >
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
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
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full justify-center rounded-md bg-primary-600 px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:opacity-50 sm:text-sm"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>

      <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/register"
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          Register here
        </Link>
      </div>
    </div>
  );
}
