import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { OnboardingForm } from "@/features/auth/components/onboarding-form";

export const metadata = {
  title: "Profile Onboarding | AgroMarket",
  description: "Complete your profile and select your participation roles in AgroMarket.",
};

interface OnboardingPageProps {
  searchParams: Promise<{
    manage?: string;
  }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const user = await requireAuth();
  const resolvedParams = await searchParams;

  // If the user is already onboarded and not explicitly managing roles, redirect directly to account dashboard
  if (user.isOnboarded && resolvedParams.manage !== "true") {
    redirect("/account");
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800">
            Account Setup
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome to AgroMarket
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Set up your profile and configure how you participate across Nigeria&apos;s agricultural ecosystem.
          </p>
        </div>

        <OnboardingForm
          initialEmail={user.email}
          initialPhone={user.phone}
          initialFullName={user.fullName}
        />
      </div>
    </div>
  );
}
