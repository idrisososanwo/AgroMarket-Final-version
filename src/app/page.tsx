import Link from "next/link";
import { CheckCircle2, Server, Shield, Layers, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header Badge */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800">
            Phase 0.1 Foundation Active
          </span>
          <span className="text-xs text-muted-foreground">Version 0.1.0</span>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            AgroMarket Platform
          </h1>
          <p className="text-base text-muted-foreground md:text-lg">
            Nigeria-first agricultural marketplace and digital ecosystem infrastructure.
            Connect farmers, agribusinesses, and buyers directly.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 transition"
            >
              Browse Produce Marketplace &rarr;
            </Link>
            <Link
              href="/market"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 transition"
            >
              Market Prices & Intelligence
            </Link>
            <Link
              href="/smart-basket"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 transition"
            >
              Smart Basket
            </Link>
            <Link
              href="/shared-purchases"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-600 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 transition"
            >
              Shared Purchases
            </Link>
            <Link
              href="/farmer/listings"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 transition"
            >
              Seller Dashboard & Inventory
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition"
            >
              Account & Profile
            </Link>
          </div>
        </div>

        {/* Foundation Status Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-5 shadow-sm transition hover:shadow">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary-100 text-primary-700">
              <Server className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Next.js App Router</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Server-first architecture, TypeScript strict mode, and Tailwind styling foundation.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm transition hover:shadow">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary-100 text-primary-700">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Server-Side Auth & RBAC</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Multi-role authorization architecture enforcing security boundaries exclusively on the server.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm transition hover:shadow">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary-100 text-primary-700">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Modular Monolith</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              24 domain boundaries partitioned in src/features ready for incremental business implementation.
            </p>
          </div>
        </div>

        {/* Core Architecture Checklist */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Technical Health & Readiness</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center space-x-2 text-xs text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary-600" />
              <span>Next.js 15 App Router & React 19</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary-600" />
              <span>TypeScript Strict Typing & Zod Validation</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary-600" />
              <span>Supabase SSR Client & Server Cookie Handling</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary-600" />
              <span>Vitest Unit Testing Suite & Linting</span>
            </div>
          </div>
          <div className="mt-6 border-t pt-4">
            <Link
              href="/api/health"
              className="inline-flex items-center text-xs font-medium text-primary-700 hover:text-primary-800"
            >
              Verify Health Check API Endpoint <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
