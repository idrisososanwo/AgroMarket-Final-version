import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign In | AgroMarket",
  description: "Access your agricultural marketplace and services dashboard.",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <span className="text-2xl font-bold tracking-tight text-primary-700">
            AgroMarket
          </span>
        </Link>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-xs text-muted-foreground sm:text-sm">
          Access your agricultural marketplace and services dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <LoginForm urlError={resolvedParams.error} />
      </div>
    </div>
  );
}
