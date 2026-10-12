import { LoginForm } from "@/features/auth/components/login-form";
import { AgroMarketLogo } from "@/components/brand";
import { BackButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign In | AgroMarket",
  description: "Access your agricultural marketplace and services dashboard.",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    registered?: string;
    verify?: string;
    email?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center bg-[#FBF9F4] px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <AgroMarketLogo size="lg" layout="horizontal" href="/" />
        </div>
        <div className="flex items-center justify-center mb-2">
          <BackButton fallbackHref="/" label="Back to Marketplace" variant="ghost" />
        </div>
        <h2 className="text-center text-xl font-black tracking-tight text-[#1A231E] sm:text-2xl">
          Sign in to your account
        </h2>
        <p className="mt-1 text-center text-xs text-neutral-600 sm:text-sm">
          Access your agricultural marketplace and workspace dashboard
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <LoginForm
          urlError={resolvedParams.error}
          registered={resolvedParams.registered === "true"}
          verify={resolvedParams.verify === "true"}
          initialEmail={resolvedParams.email}
        />
      </div>
    </div>
  );
}
