import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set New Password | AgroMarket",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    code?: string;
    error?: string;
    error_description?: string;
  }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedParams = await searchParams;
  let initialError: string | null = null;

  if (resolvedParams.error_description || resolvedParams.error) {
    initialError = resolvedParams.error_description || resolvedParams.error || null;
  } else if (resolvedParams.code) {
    // If authorization code arrived directly, exchange it for session cookies
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      resolvedParams.code
    );
    if (exchangeError) {
      initialError = exchangeError.message;
    }
  }

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
        <ResetPasswordForm initialError={initialError} />
      </div>
    </div>
  );
}
